import {BlobSource, UrlSource} from "mediabunny"
import {DecoderSource} from "../fns/schematic.js"

// only streamable sources
export async function loadDecoderSource(source: DecoderSource): Promise<UrlSource | BlobSource> {
	if(source instanceof Blob) {
		return new BlobSource(source)
	} else {
		return new UrlSource(source)
	}
}

