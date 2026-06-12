
import {Checksum} from "./checksum.js"

export class Datafile {
	constructor(
		public url: string,
		public blob: Blob,
		public filename: string,
		public checksum: Checksum,
	) {}

	static async make(file: Blob, name?: string) {
		const checksum = await Checksum.make(file)
		const filename = name ?? checksum.nickname
		const url = URL.createObjectURL(file)
		return new this(url, file, filename, checksum)
	}

	static async load(path: string) {
	}
}

