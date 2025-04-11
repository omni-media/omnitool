
import {AsSchematic} from "@e280/comrade"

export type DriverSchematic = AsSchematic<{

	// happens on the web worker
	work: {
		demux(input: {
			id: number
			bytes: Uint8Array
			start: number
			end: number
		}): Promise<void>

		mux(input: {
			tracks: any[]
			packets: any[]
		}): Promise<Uint8Array>
	}

	// happens on the main thread
	host: {
		deliverDemuxedPacket: {
			video(output: {id: number, bytes: Uint8Array}): Promise<void>
			audio(output: {id: number, bytes: Uint8Array}): Promise<void>
			subtitle(output: {id: number, bytes: Uint8Array}): Promise<void>
		}
	}
}>

