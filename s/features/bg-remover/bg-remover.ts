import {queue} from "@e280/stz"
import {Comrade, LoggerTap} from "@e280/comrade"

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
		remove: queue(async(info: RemoverOptions) => await thread.work.remove(info.frame)),
		dispose: () => thread.terminate()
	}
}

