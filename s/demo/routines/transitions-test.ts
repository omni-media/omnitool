import {Application, Sprite} from "pixi.js"

import {Driver} from "../../driver/driver.js"
import {DecoderSource} from "../../driver/fns/schematic.js"
import {makeTransition} from "../../features/transition/transition.js"

export async function setupTransitionsTest(driver: Driver, source: DecoderSource) {
	const app = new Application()
	await app.init({width: 300, height: 300, preference: "webgl"})
	const sprite = new Sprite({width: 300, height: 300})

	app.stage.addChild(sprite)

	document.body.appendChild(app.canvas)
	const transition = makeTransition({name: "circle", renderer: app.renderer})

	async function run() {
		const video = driver.decodeVideo({
			source,
			async onFrame(frame) {
				const texture = transition.render({
					from: frame,
					to: frame,
					progress: 0.7,
					width: app.canvas.width,
					height: app.canvas.height
				})
				sprite.texture = texture
				return frame
			}
		})

		await driver.encode({
			video,
			config: {
				audio: {codec: "opus", bitrate: 128000},
				video: {codec: "vp9", bitrate: 1000000}
			}
		})
	}

	return {run}
}
