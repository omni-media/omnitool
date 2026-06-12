
export namespace Resource {
	export type Media = {
		kind: "media"
		filename: string
		blob: Blob
		url: string
		duration: number
	}

	export type Any = Media
}

