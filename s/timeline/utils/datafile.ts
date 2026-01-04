
import {Checksum} from "./checksum.js"

export class Datafile {
	constructor(
		public url: string,
		public bytes: Uint8Array,
		public filename: string,
		public checksum: Checksum,
	) {}

	static async make(file: File, name?: string) {
		const buffer = await file.arrayBuffer()
		const bytes = new Uint8Array(buffer)
		const checksum = await Checksum.make(bytes)
		const filename = name ?? checksum.nickname
		const url = URL.createObjectURL(file)
		return new this(url, bytes, filename, checksum)
	}

	static async load(path: string) {
		// const file = await fetch(path)
		// const buffer = await file.arrayBuffer()
		// const bytes = new Uint8Array(buffer)
		// const filename =  file?.headers.get('Content-Disposition')?.split('filename=')[1] ?? "file"
		// console.log(filename)
		// const checksum = await Checksum.make(bytes)
		// return new this(path, bytes, filename, checksum)
	}
}

