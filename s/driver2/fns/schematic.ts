
import {AsSchematic} from "@e280/comrade"

export type DriverSchematic = AsSchematic<{

	// happens on the web worker
	work: {
		demux(input: {
			id: number
			buffer: ArrayBuffer
			start: number
			end: number
		}): Promise<void>

		mux(input: {
			tracks: any[]
			packets: any[]
		}): Promise<ArrayBuffer>
	}

	// happens on the main thread
	host: {
		deliverDemuxedPacket: {
			video(output: {id: number, buffer: ArrayBuffer}): Promise<void>
			audio(output: {id: number, buffer: ArrayBuffer}): Promise<void>
			subtitle(output: {id: number, buffer: ArrayBuffer}): Promise<void>
		}
	}
}>

