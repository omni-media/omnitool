

import {Hex, Map2} from "@benev/slate"
import {Id} from "./basics.js"
import {Resource} from "./resource.js"

export class ResourcePool {
	#map = new Map2<Id, Resource.Any>()

	require(id: Id) {
		return this.#map.require(id)
	}

	async loadMedia(bytes: Uint8Array) {
		const hash = await crypto.subtle.digest("SHA-256", bytes)
		const id = Hex.string(new Uint8Array(hash))
		if (!this.#map.has(id)) {
			const resource: Resource.Media = {kind: "media", bytes}
			this.#map.set(id, resource)
		}
	}
}
