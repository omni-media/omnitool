
import {Hex, Thumbprint} from "@e280/stz"

import {Hash} from "../parts/basics.js"

export class Checksum {
	constructor(
		public data: Uint8Array,
		public bytes: Uint8Array,
		public hash: Hash,
		public nickname: string,
	) {}

	static async make(data: Uint8Array) {
		const data2 = new Uint8Array(data)
		const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", data2))
		const hash = Hex.fromBytes(bytes)
		const nickname = Thumbprint.sigil.fromBytes(bytes)
		return new this(data, bytes, hash, nickname)
	}
}

