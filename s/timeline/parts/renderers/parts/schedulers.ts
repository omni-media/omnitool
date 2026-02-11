import {Fps, fps} from "../../../../units/fps.js"
import {Ms, ms} from "../../../../units/ms.js"

export type RealtimeController = {
	play(): void
	pause(): void
	seek(t: Ms): void
	dispose(): void
	setFPS(v: Fps): void
	isPlaying(): boolean
}

export const realtime = (
	onTick: () => void,
	onUpdate: (currentTime: Ms) => void
): RealtimeController => {

  let playing = false
  let rafId: number | null = null
  let frameRate = fps(60)

  let frameDuration = ms(1000 / frameRate)
  let composeTime = ms(0)
  let lastTime = ms(0)
  let accumulator = ms(0)
  let currentTime = ms(0)

  const tick = (now: number) => {
    if (!playing) return

    const nowMs = ms(now)
    const deltaTime = ms(nowMs - lastTime)
    lastTime = nowMs

    accumulator = ms(accumulator + deltaTime)
    currentTime = ms(currentTime + deltaTime)
  	onUpdate(currentTime)

    while (accumulator >= frameDuration) {
      onTick()
      composeTime = ms(composeTime + frameDuration)
      accumulator = ms(accumulator - frameDuration)
    }

    rafId = requestAnimationFrame(tick)
  }

  return {
    play() {
      if (playing) return
      playing = true
      lastTime = ms(performance.now())
      rafId = requestAnimationFrame(tick)
    },
    pause() {
      if (!playing) return
      playing = false
      if (rafId !== null) cancelAnimationFrame(rafId)
      rafId = null
    },
    seek(time) {
      composeTime = time
      accumulator = ms(0)
      currentTime = time
      onUpdate(time)
    },
    dispose() {
      this.pause()
    },
    isPlaying() {
      return playing
    },
    setFPS(v) {
    	frameRate = v
    	frameDuration = ms(1000 / frameRate)
    }
  }
}

export type FixedStepOptions = {
	fps: Fps
	duration: Ms
	abort?: AbortSignal
}

export const fixedStep = async (
	opts: FixedStepOptions,
	onFrame: (t: Ms, index: number) => Promise<void> | void
) => {
	const dt = ms(1000 / opts.fps)
	const durationInSeconds = opts.duration / 1000
	const total = Math.ceil(durationInSeconds * opts.fps)

	for (let i = 0; i < total; i++) {
		if (opts.abort?.aborted) break
		const t = ms(i * dt)
		await onFrame(t, i)
	}
}
