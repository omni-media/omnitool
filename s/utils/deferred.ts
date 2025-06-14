type Deferred<T = void> = Promise<T> & {resolve(value: T | PromiseLike<T>): void}

export function deferred<T = void>(): Deferred<T> {
	let resolve: (value: T | PromiseLike<T>) => void
	const promise = new Promise<T>(r => (resolve = r)) as Deferred<T>

	let settled = false
	promise.resolve = v => {
		if (!settled) {
			settled = true
			resolve(v)
		}
	}

	return promise
}
