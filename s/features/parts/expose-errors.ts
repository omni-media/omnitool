import {ExposedError} from "@e280/renraku"

export function exposeError(error: unknown) {
	if (error instanceof ExposedError)
		return error

	const exposed = new ExposedError(errorToString(error))

	if (error instanceof Error)
		exposed.stack = error.stack

	return exposed
}

export function exposeErrors<Args extends unknown[], Result>(
	fn: (...args: Args) => Result | Promise<Result>
) {
	return async(...args: Args) => {
		try {
			return await fn(...args)
		}
		catch (error) {
			throw exposeError(error)
		}
	}
}

function errorToString(error: unknown) {
	if (error instanceof Error)
		return error.message

	if (typeof error === "string")
		return error

	try {
		return JSON.stringify(error) ?? String(error)
	}
	catch {
		return String(error)
	}
}
