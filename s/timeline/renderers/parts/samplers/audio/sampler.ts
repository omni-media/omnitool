
import {AudioSample} from "mediabunny"

import {itemsFrom} from "../../handy.js"
import {initStreams} from "./parts/init.js"
import {AudioSinkPool} from "./parts/sink.js"
import {Ms} from "../../../../../units/ms.js"
import {findEarliestStream} from "./parts/find.js"
import {TimelineFile} from "../../../../parts/basics.js"
import {DecoderSource} from "../../../../../driver/fns/schematic.js"

export function createAudioSampler(resolveMedia: (hash: string) => DecoderSource) {
	const sinkPool = new AudioSinkPool(resolveMedia)

	return {
		async *sampleAudio(timeline: TimelineFile, from: Ms) {
			const items = itemsFrom({timeline, from})
			const streams = await initStreams(sinkPool, items, from)

			while (streams.length > 0) {
				const {stream, index} = findEarliestStream(streams)

				yield stream.output()

				const advancing = await stream.advance()

				if (!advancing) {
					streams.splice(index, 1)
				}
			}

		}
	}
}

