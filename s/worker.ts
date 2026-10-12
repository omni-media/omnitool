export {driverWorker as setupDriverWorker} from "./driver/driver-worker.js"

export async function setupTranscriberWorker() {
	const {setupTranscriberWorker} = await import("./features/speech/transcribe/worker.js")
	await setupTranscriberWorker()
}

export async function setupBgRemoverWorker() {
	const {setupBgRemoverWorker} = await import("./features/bg-remover/worker.js")
	await setupBgRemoverWorker()
}
