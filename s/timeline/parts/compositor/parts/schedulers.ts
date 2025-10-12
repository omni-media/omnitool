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
  let currentTimeS = 0
  let lastTime = 0
  let accumulator = 0
  let currentTime = 0

  const tick = (now: number) => {
    if (!playing) return

    const deltaTime = now - lastTime
    lastTime = now

    accumulator += deltaTime
    currentTime += deltaTime / 1000
  	onUpdate(currentTime)

    while (accumulator >= frameDuration) {
      onTick(currentTimeS)
      currentTimeS += frameDuration / 1000
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
    seek(t) {
      currentTimeS = Math.max(0, t)
      accumulator = 0
      currentTime = t
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
	const dt = 1 / opts.fps
	const total = Math.ceil(opts.duration * opts.fps)

	for (let i = 0; i < total; i++) {
		if (opts.abort?.aborted) break
		const t = i * dt
		await onFrame(t, i)
	}
}
