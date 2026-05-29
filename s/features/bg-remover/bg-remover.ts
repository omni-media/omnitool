import {queue} from "@e280/stz"
import {Comrade, LoggerTap, tune} from "@e280/comrade"

import {BgRemoverOptions, BgRemoverSchematic, RemoverOptions} from "./types.js"


export async function makeBgRemover({spec, workerUrl, onLoading}: BgRemoverOptions) {
	const thread = await Comrade.thread<BgRemoverSchematic>({
		label: "OmnitoolBgRemover",
		workerUrl,
		tap: new LoggerTap(),
		setupHost: () => ({
			loading: async loading => onLoading(loading),
		}),
	})

	await thread.work.prepare(spec)

	return {
		remove: queue(async(input: RemoverOptions) =>
			await thread.work.remove[tune]({transfer: [input.frame]})(input.frame)
		),
		dispose: () => thread.terminate()
	}
}

