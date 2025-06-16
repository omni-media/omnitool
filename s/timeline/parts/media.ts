
import {Datafile} from "../utils/datafile.js"

export class Media {
	duration = 0
	constructor(public datafile: Datafile) {}

	static async analyze(datafile: Datafile) {
		const media = new this(datafile)
		media.duration = 10
		return media
	}
}

