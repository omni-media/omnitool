type BatcherOptions<T> = {
	size: number
	onBatch: (batch: T[]) => Promise<void>
	clone?: (item: T) => T
}

export class Batcher<T> {
	#buffer: T[] = []
	#pending: Promise<void> = Promise.resolve()
	readonly size: number
	readonly onBatch: (batch: T[]) => Promise<void>

	constructor({size, onBatch}: BatcherOptions<T>) {
		this.size = size
		this.onBatch = onBatch
	}

	push(item: T) {
		this.#buffer.push(item)

		if (this.#buffer.length >= this.size)
			this.#drain()
	}

	async flush() {
		if (this.#buffer.length > 0)
			await this.#drain()
	}

	async #drain() {
		const batch = this.#buffer
		this.#buffer = []

		this.#pending = this.#pending.then(() => this.onBatch(batch))
		await this.#pending
	}
}
