
import {Hex, Thumbprint} from "@e280/stz"

export class Checksum {
	constructor(
		public data: Uint8Array,
		public bytes: Uint8Array,
		public hash: string,
		public nickname: string,
	) {}

	static async make(data: Uint8Array) {
		const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", data))
		const hash = Hex.fromBytes(bytes)
		const nickname = Thumbprint.sigil.fromBytes(bytes)
		return new this(data, bytes, hash, nickname)
	}
}

