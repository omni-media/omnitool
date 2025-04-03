
import {Barname, Hex} from "@benev/slate"

export class Checksum {
	constructor(
		public data: Uint8Array,
		public bytes: Uint8Array,
		public hash: string,
		public nickname: string,
	) {}

	static async make(data: Uint8Array) {
		const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", data))
		const hash = Hex.string(bytes)
		const nickname = Barname.string(bytes.slice(0, 4))
		return new this(data, bytes, hash, nickname)
	}
}

