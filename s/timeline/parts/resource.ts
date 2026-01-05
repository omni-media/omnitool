
export namespace Resource {
	export type Media = {
		kind: "media"
		filename: string
		bytes: Uint8Array
		blob: Blob
		url: string
	}

	export type Any = Media
}

