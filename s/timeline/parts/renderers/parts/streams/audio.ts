
export class AudioStream {
	constructor(private reader: ReadableStreamDefaultReader<AudioData>) { }

	async *stream(): AsyncGenerator<AudioData> {
		while (true) {
			const { done, value: hit } = await this.reader.read()
			if (done) {
				break
			}
			yield hit
		}
	}

	cancel = async () => await this.reader.cancel()
}
