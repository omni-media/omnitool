
import { Pub, pub } from "@e280/stz"
import {Fps, fps} from "../../../../units/fps.js"
import {Ms, ms} from "../../../../units/ms.js"

export type RealtimeGenerator = {
	play(): void
	pause(): void
	setFPS(v: Fps): void
	isPlaying(): boolean
	ticks(): AsyncGenerator<void>
	onTick: Pub<[]>
}

export const realtime = (): RealtimeGenerator => {

	let playing = false
	let frameRate = fps(60)
	let frameDuration = 1000 / frameRate

	let lastNow = 0
	let lastComposite = 0

	const onTick = pub()
	let resolveTick: (() => void) | null = null

	const loop = (now: number) => {
		requestAnimationFrame(loop)

		if (!playing) return

		lastNow = now

		while (now - lastComposite >= frameDuration) {
			lastComposite += frameDuration

			resolveTick?.()
			resolveTick = null
			onTick()
		}
	}

	async function* ticks(): AsyncGenerator<void> {
		lastNow = performance.now()
		lastComposite = lastNow
		requestAnimationFrame(loop)

		while (true) {
			await new Promise<void>(r => resolveTick = r)
			yield
		}

	}

	return {
		play() {
			if (playing) return
			playing = true
			lastNow = performance.now()
			lastComposite = lastNow
		},
		pause() {
			playing = false
		},
		setFPS(v: Fps) {
			frameRate = v
			frameDuration = 1000 / frameRate
		},
		isPlaying() {
			return playing
		},
		ticks,
		onTick
	}
}

export type FixedStepOptions = {
	fps: Fps
	duration: Ms
}

export const fixedStep = async (
	opts: FixedStepOptions,
	onFrame: (t: Ms, index: number) => Promise<void> | void
) => {
	const dt = ms(1000 / opts.fps)
	const durationInSeconds = opts.duration / 1000
	const total = Math.ceil(durationInSeconds * opts.fps)

	for (let i = 0; i < total; i++) {
		const t = ms(i * dt)
		await onFrame(t, i)
	}
}

