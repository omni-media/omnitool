type BatcherOptions<T, C> = {
	size: number
	onBatch: (batch: T[], batchNumber: number) => Promise<void>
	onChunk?: (chunk: C) => void
}

export class Batcher<T, C> {
	#buffer: {item: T, resolve: () => void}[] = []
	#pending = Promise.resolve()

	size: number
	batchNumber = 0
	onBatch: (batch: T[], batchNumber: number) => Promise<void>
	onChunk?: (chunk: C) => void

	constructor({size, onBatch, onChunk}: BatcherOptions<T, C>) {
		this.size = size
		this.onBatch = onBatch
		this.onChunk = onChunk
	}

	push(item: T): Promise<void> {
		return new Promise(resolve => {
			this.#buffer.push({item, resolve})

			if (this.#buffer.length >= this.size)
				this.#drain()
		})
	}

	async flush(): Promise<void> {
		if (this.#buffer.length > 0)
			await this.#drain()
	}

	async #drain() {
		const batch = this.#buffer
		this.#buffer = []

		const items = batch.map(entry => entry.item)
		const resolvers = batch.map(entry => entry.resolve)

		this.#pending = this.#pending.then(() => this.onBatch(items, this.batchNumber++))
		await this.#pending

		for (const resolve of resolvers)
			resolve()
	}
}
