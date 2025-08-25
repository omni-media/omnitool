import {Item, Kind} from "./item.js"
import {TimelineFile} from "./basics.js"
import {context} from "../../context.js"
import {Composition, Layer, DecoderSource} from "../../driver/fns/schematic.js"

class ClipCursor {
  private reader: ReadableStreamDefaultReader<VideoFrame>
  private prev: VideoFrame | null = null

  constructor(reader: ReadableStreamDefaultReader<VideoFrame>) {
    this.reader = reader
  }

  async atOrNear(targetUs: number): Promise<VideoFrame | undefined> {
    let prev = this.prev

    while (true) {
      const {done, value} = await this.reader.read()
      if (done) {
        if (!prev) return undefined
        const copy = new VideoFrame(prev)
        prev.close()
        this.prev = null
        return copy
      }

      const hit = value
      const hitUs = hit.timestamp ?? 0

      if (hitUs >= targetUs) {
        let chosen = hit
        if (prev) {
          const prevUs = prev.timestamp ?? 0
          const dPrev = Math.abs(prevUs - targetUs)
          const dHit = Math.abs(hitUs - targetUs)
          if (dPrev < dHit) {
            hit.close()
            chosen = prev
          } else {
            prev.close()
          }
        }
        const copy = new VideoFrame(chosen)
        chosen.close()
        this.prev = null
        return copy
      }

      prev?.close()
      prev = hit
      this.prev = prev
    }
  }

  async cancel() {
    try { await this.reader.cancel() } catch {}
    this.prev?.close()
    this.prev = null
  }
}

export class Compositor {
  canvas = document.createElement("canvas")
  ctx = this.canvas.getContext("2d")!
  items: Item.Any[] = []

  private cursors = new Map<number, ClipCursor>()
  private itemsById = new Map<number, Item.Any>()

  constructor(
    private framerate = 30,
    private resolveMedia: (hash: string) => DecoderSource = _hash => "/assets/temp/gl.mp4"
  ) {
    this.canvas.width = 1920
    this.canvas.height = 1080
    document.body.appendChild(this.canvas)
  }

  async render(timeline: TimelineFile) {
    this.items = timeline.items
    this.itemsById = new Map(this.items.map(i => [i.id, i]))

    const frameDurS = 1 / this.framerate
    const videoStream = new TransformStream<VideoFrame, VideoFrame>()
    const audioStream = new TransformStream<AudioData, AudioData>() // silence for now

    const driver = await context.driver
    const encodePromise = driver.encode({
      readables: {video: videoStream.readable, audio: audioStream.readable},
      config: {
        audio: {codec: "opus", bitrate: 128000},
        video: {codec: "vp9", bitrate: 1000000}
      }
    })

    const videoWriter = videoStream.writable.getWriter()
    const audioWriter = audioStream.writable.getWriter()

    let frameCount = 0
    const root = this.#requireItem(timeline.root)

    try {
      for await (const composition of this.#streamFrames(root)) {
        const tsUs = Math.round(frameCount * frameDurS * 1_000_000)
        const durUs = Math.round(frameDurS * 1_000_000)

        const composed = await driver.composite(composition)
        const stamped = new VideoFrame(composed, {timestamp: tsUs, duration: durUs})

        this.ctx.drawImage(stamped, 0, 0) // test drawing
        await videoWriter.write(stamped)

        composed.close()
        // do not close stamped here; it’s transferred to the encoder worker
        frameCount++
      }
    } finally {
      await videoWriter.close()
      await audioWriter.close()
      await this.#cancelAllCursors()
      await encodePromise
    }
  }

  async* #streamFrames(item: Item.Any): AsyncGenerator<Composition> {
    const frameDurS = 1 / this.framerate

    switch (item.kind) {
      case Kind.Clip: {
        const cursor = await this.#cursorForClip(item)
        const total = Math.ceil(item.duration * this.framerate)
        const baseUs = this.#toUs(item.start ?? 0)

        for (let i = 0; i < total; i++) {
          const tUs = baseUs + this.#toUs(i * frameDurS)
          const frame = await cursor.atOrNear(tUs)
          yield frame ? [{kind: "image", frame}] as Composition : []
        }
        break
      }

      case Kind.Sequence: {
        for (const childId of item.children) {
          const child = this.#requireItem(childId)
          if (child.kind === Kind.Transition) continue // hard cut for now
          yield* this.#streamFrames(child)
        }
        break
      }

      case Kind.Stack: {
        const duration = await this.#durationOfStack(item)
        const total = Math.ceil(duration * this.framerate)

        for (let i = 0; i < total; i++) {
          const t = i * frameDurS
          const layers = await this.#layersAt(item, t)
          yield layers
        }
        break
      }
    }
  }

  async #layersAt(node: Item.Any, tSeconds: number): Promise<Layer[]> {
    if (node.kind === Kind.Text)
      return [{kind: "text", content: node.content, color: "white", fontSize: 48}]

    if (node.kind === Kind.Clip) {
      const cursor = await this.#cursorForClip(node)
      const tUs = this.#toUs((node.start ?? 0) + tSeconds)
      const frame = await cursor.atOrNear(tUs)
      return frame ? [{kind: "image", frame}] : []
    }

    if (node.kind === Kind.Stack) {
      const layersPerChild = await Promise.all(
        node.children.map(id => this.#layersAt(this.#requireItem(id), tSeconds))
      )
      return layersPerChild.flat()
    }

    return []
  }

  async #durationOfStack(stack: Item.Stack): Promise<number> {
    const durations = await Promise.all(stack.children.map(async id => {
      const child = this.#requireItem(id)
      if (child.kind === Kind.Clip) return child.duration
      if (child.kind === Kind.Stack) return this.#durationOfStack(child)
      return 0
    }))
    return Math.max(0, ...durations)
  }

  async #cursorForClip(clip: Item.Clip) {
    const existing = this.cursors.get(clip.id)
    if (existing) return existing

    const driver = await context.driver
    const source = this.resolveMedia(clip.mediaHash)
    const {video} = driver.decode({source})
    const cursor = new ClipCursor(video.getReader())
    this.cursors.set(clip.id, cursor)
    return cursor
  }

  async #cancelAllCursors() {
    const tasks: Promise<void>[] = []
    for (const c of this.cursors.values())
      tasks.push(c.cancel())
    this.cursors.clear()
    await Promise.all(tasks)
  }

  #requireItem(id: number) {
    const item = this.itemsById.get(id)
    if (!item) throw new Error(`missing item ${id}`)
    return item
  }

  #toUs(s: number) {
    return Math.round(s * 1_000_000)
  }
}

