
export namespace Resource {
	export type Media = {
		kind: "media"
		filename: string
		bytes: Uint8Array
	}

	export type Any = Media
}

