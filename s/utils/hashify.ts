
import {Barname, Hex} from "@benev/slate"

export async function hashify(bytes: Uint8Array) {
	const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))
	const id = Hex.string(hash)
	const nickname = Barname.string(hash.slice(0, 4))
	return {hash, id, nickname}
}

