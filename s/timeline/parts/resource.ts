
export namespace Resource {
	export type Media = {
		kind: "media"
		filename: string
		bytes: Uint8Array
		blob: Blob
		url: string
		duration: number
	}

	export type Any = Media
}

