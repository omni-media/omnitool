export type RealtimeController = {
	play(): void
	pause(): void
	seek(t: number): void
	dispose(): void
	isPlaying(): boolean
}

export const realtime = (onTick: (t: number) => void): RealtimeController => {
	let playing = false
	let rafId: number | null = null
	let playbackStartMs = 0
	let seekBaseS = 0

	const tick = () => {
		if (!playing) return
		const now = performance.now()
		const t = Math.max(0, (now - playbackStartMs) / 1000)
		onTick(t)
		rafId = requestAnimationFrame(tick)
	}

	return {
		play() {
			if (playing) return
			playing = true
			playbackStartMs = performance.now() - seekBaseS * 1000
			tick()
		},
		pause() {
			if (!playing) return
			playing = false
			if (rafId !== null) cancelAnimationFrame(rafId)
			rafId = null
		},
		seek(t) {
			seekBaseS = Math.max(0, t)
			if (playing) playbackStartMs = performance.now() - seekBaseS * 1000
		},
		dispose() {
			this.pause()
		},
		isPlaying() {
			return playing
		},
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
