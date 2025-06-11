type BatcherOptions<T> = {
	size: number
	onBatch: (batch: T[], batchNumber: number) => Promise<void>
	clone?: (item: T) => T
}

export class Batcher<T> {
	#buffer: {item: T, resolve: () => void}[] = []
	#pending = Promise.resolve()
	size: number // batch size for hardware decoding must be max 16 otherwise decoder will stall
	onBatch: (batch: T[], batchNumber: number) => Promise<void>
	batchNumber = 0

	constructor({size, onBatch}: BatcherOptions<T>) {
		this.size = size
		this.onBatch = onBatch
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

