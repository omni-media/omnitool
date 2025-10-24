export type RealtimeController = {
	play(): void
	pause(): void
	seek(t: number): void
	dispose(): void
	setFPS(v: number): void
	isPlaying(): boolean
}

export const realtime = (
	onTick: (tickTime: number) => void,
	onUpdate: (currentTime: number) => void
): RealtimeController => {

  let playing = false
  let rafId: number | null = null
  let fps = 60

  let frameDuration = 1000 / fps
  let composeTime = 0
  let lastTime = 0
  let accumulator = 0
  let currentTime = 0

  const tick = (now: number) => {
    if (!playing) return

    const deltaTime = now - lastTime
    lastTime = now

    accumulator += deltaTime
    currentTime += deltaTime
  	onUpdate(currentTime)

    while (accumulator >= frameDuration) {
      onTick(composeTime)
      composeTime += frameDuration
      accumulator -= frameDuration
    }

    rafId = requestAnimationFrame(tick)
  }

  return {
    play() {
      if (playing) return
      playing = true
      lastTime = performance.now()
      rafId = requestAnimationFrame(tick)
    },
    pause() {
      if (!playing) return
      playing = false
      if (rafId !== null) cancelAnimationFrame(rafId)
      rafId = null
    },
    seek(ms) {
      composeTime = ms
      accumulator = 0
      currentTime = ms
      onUpdate(ms)
    },
    dispose() {
      this.pause()
    },
    isPlaying() {
      return playing
    },
    setFPS(v) {
    	fps = v
    	frameDuration = 1000 / fps
    }
  }
}

export type FixedStepOptions = {
	fps: number
	duration: number
	abort?: AbortSignal
}

export const fixedStep = async (
	opts: FixedStepOptions,
	onFrame: (t: number, index: number) => Promise<void> | void
) => {
	const dt = 1000 / opts.fps
	const durationInSeconds = opts.duration / 1000
	const total = Math.ceil(durationInSeconds * opts.fps)

	for (let i = 0; i < total; i++) {
		if (opts.abort?.aborted) break
		const t = i * dt
		await onFrame(t, i)
	}
}
