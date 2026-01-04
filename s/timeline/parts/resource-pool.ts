
import {GMap} from "@e280/stz"
import {Hash} from "./basics.js"
import {Media} from "./media.js"
import {Resource} from "./resource.js"
import {Datafile} from "../utils/datafile.js"

export class ResourcePool {
	#map = new GMap<Hash, Resource.Any>

	/** store a media file (avoids duplicates via hash) */
	async store(datafile: Datafile) {
		const media = await Media.analyze(datafile)
		const {hash} = media.datafile.checksum
		const {filename, bytes, url} = media.datafile

		if (this.#map.has(hash)) {
			const alreadyExists = this.#map.require(hash)
			alreadyExists.filename = filename
		}
		else
			this.#map.set(hash, {kind: "media", filename, bytes, url})

		return media
	}

	require(hash: string) {
		return this.#map.require(hash)
	}
}

