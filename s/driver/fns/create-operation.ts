type Operation<T> = {
	id: string
	on(fn: (data: T) => void): void
	dispatch(data: T): void
	dispose(): void
}

export function createOperation<T>(
	generateId: () => string,
	register: (id: string, handler: (data: T) => void) => void,
	unregister: (id: string) => void
): Operation<T> {
	const id = generateId()
	let handler: (data: T) => void = () => {}

	register(id, data => handler(data))

	return {
		id,
		on(fn) {
			handler = fn
		},
		dispatch(data) {
			handler(data)
		},
		dispose() {
			unregister(id)
		}
	}
}
