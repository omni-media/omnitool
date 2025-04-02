
import {Map2} from "@benev/slate"
import {Id} from "./basics.js"
import {Resource} from "./resource.js"
import {hashify} from "../utils/hashify.js"

export class ResourcePool extends Map2<Id, Resource.Any> {

	/** store a media file (avoids duplicates via hash) */
	async storeMedia(bytes: Uint8Array, name?: string) {
		const {id, nickname} = await hashify(bytes)
		const filename = name ?? nickname

		if (this.has(id)) {
			const alreadyExists = this.require(id)
			alreadyExists.filename = filename
		}
		else
			this.set(id, {kind: "media", filename, bytes})

		return id
	}
}

