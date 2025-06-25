export function calculateDynamicDelay(queueSize: number) {
	const queueLimit = 500
	const maxDelay = 100
	const minDelay = 0
	const delay = (queueSize / queueLimit) * maxDelay
	return Math.min(maxDelay, Math.max(minDelay, delay))
}
