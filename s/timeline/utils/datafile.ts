
import {Checksum} from "./checksum.js"

export class Datafile {
	constructor(
		public bytes: Uint8Array,
		public filename: string,
		public checksum: Checksum,
	) {}

	static async make(bytes: Uint8Array, name?: string) {
		const checksum = await Checksum.make(bytes)
		const filename = name ?? checksum.nickname
		return new this(bytes, filename, checksum)
	}

	static async load(_path: string): Promise<Datafile> {
		throw new Error("TODO implement")
	}
}

