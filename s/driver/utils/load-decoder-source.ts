import {BlobSource, UrlSource} from "mediabunny"
import {DecoderSource} from "../fns/schematic.js"

// only streamable sources
export async function loadDecoderSource(source: DecoderSource) {
	if(source instanceof FileSystemFileHandle) {
		const file = await source.getFile()
		return new BlobSource(file)
	} else {
		return new UrlSource(source)
	}
}

