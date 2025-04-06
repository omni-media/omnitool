
/** driver functions that live on the main thread */
export type DriverDaddyFns = {
	ready(): Promise<void>
	demuxResult(): Promise<void>
}

/** driver functions that live on the web worker */
export type DriverWorkerFns = {
	mux(data: Uint8Array): Promise<void>
	demux(data: Uint8Array): Promise<void>
}

