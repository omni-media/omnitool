/**
 * A stateful, forward-only frame cursor for a single clip instance.
 * It efficiently reads a video stream to find the frame nearest to a target timestamp.
 */

export class VideoCursor {
  constructor(private reader: ReadableStreamDefaultReader<VideoFrame>) {}

  async atOrNear(targetUs: number): Promise<VideoFrame | undefined> {
    let prev: VideoFrame | null = null
    while (true) {
      const {done, value: hit} = await this.reader.read()

      if (done) {
        const out = prev ? new VideoFrame(prev) : undefined
        prev?.close()
        return out
      }

      const hitUs = hit.timestamp ?? 0
      if (hitUs >= targetUs) {
        const prevUs = prev?.timestamp ?? Number.NEGATIVE_INFINITY
        const usePrev = !!prev && Math.abs(prevUs - targetUs) < Math.abs(hitUs - targetUs)

        const chosen = usePrev ? prev! : hit
        const other = usePrev ? hit : prev

        const copy = new VideoFrame(chosen)
        chosen.close()
        other?.close()
        return copy
      }

      prev?.close()
      prev = hit
    }
  }

  cancel = async () => await this.reader.cancel()
}
