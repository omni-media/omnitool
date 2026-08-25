
import {Checksum} from "./checksum.js"
import {Hash} from "../parts/basics.js"

export type DatafileOptions = {
	filename?: string
	/** Trusted resource identity. The blob is not read to verify it. */
	hash?: Hash
}

export class Datafile {
	constructor(
		public url: string,
		public blob: Blob,
		public filename: string,
		public checksum: Checksum,
	) {}

	static async make(file: Blob, options: DatafileOptions = {}) {
		const checksum = options.hash === undefined
			? await Checksum.make(file)
			: Checksum.fromHash(options.hash)
		const filename = options.filename ?? checksum.nickname
		const url = URL.createObjectURL(file)
		return new this(url, file, filename, checksum)
	}

	static async load(path: string) {
	}
}

