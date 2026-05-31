
import {Ms} from "../../../../../../units/ms.js"
import {Hash} from "../../../../../parts/basics.js"
import {DecoderSource} from "../../../../../../driver/fns/schematic.js"

type CachedImage = {
	bitmap: ImageBitmap
}

export class ImageSink {
	readonly #images = new Map<Hash, CachedImage>()

	constructor(
		private resolveMedia: (hash: string) => DecoderSource,
	) {}

	async getFrame(hash: Hash, time: Ms) {
		const image = await this.#getImage(hash)
		return new VideoFrame(image.bitmap, {
			timestamp: Math.round(time * 1000),
		})
	}

	async #getImage(hash: Hash) {
		const existing = this.#images.get(hash)
		if (existing)
			return existing

		const source = this.resolveMedia(hash)
		const blob = source instanceof Blob
			? source
			: await fetch(source).then(response => response.blob())
		const image = {bitmap: await createImageBitmap(blob)}

		this.#images.set(hash, image)
		return image
	}

	disposeAll() {
		for (const image of this.#images.values())
			image.bitmap.close()
		this.#images.clear()
	}

	dispose(hash: Hash) {
		const image = this.#images.get(hash)
		image?.bitmap.close()
		this.#images.delete(hash)
	}
}

