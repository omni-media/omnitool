
import {Barname, Hex, Map2} from "@benev/slate"
import {Id} from "./basics.js"
import {Resource} from "./resource.js"

export class ResourcePool extends Map2<Id, Resource.Any> {

	async loadMedia(bytes: Uint8Array, name?: string) {

		// determine id by hashing the actual bytes
		const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))
		const id = Hex.string(hash)

		// use deterministic barname like `magser_pinryl` as fallback for filename
		// these random barnames just help humans recognize things better than hex hash
		const filename = name ?? Barname.string(hash.slice(0, 4))

		// never store the same file twice

		// if it already exists, update the filename
		if (this.has(id)) {
			const existing = this.require(id)
			existing.filename = filename
		}

		// if it doesn't exist, add it
		else {
			const resource: Resource.Media = {kind: "media", filename, bytes}
			this.set(id, resource)
		}

		return id
	}
}

