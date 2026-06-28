
import {hex, thumbprint} from "@e280/stz"
import {blake3} from "@awasm/noble"

import {Hash} from "../parts/basics.js"

export class Checksum {
	constructor(
		public hash: Hash,
		public nickname: string,
	) {}

	static async make(file: Blob) {
		const hasher = blake3.create()

		for await (const chunk of file.stream())
			hasher.update(chunk)

		const digest = hasher.digest()
		const hash = hex.fromBytes(digest)
		const nickname = thumbprint.sigil.fromBytes(digest)
		return new this(hash, nickname)
	}
}

