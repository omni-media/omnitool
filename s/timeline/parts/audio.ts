
/** Timeline-wide audio output settings. */
export type AudioSettings = {
	/** Linear gain. Defaults to 1. */
	gain?: number
	/** Whether timeline audio is enabled. Defaults to true. */
	enabled?: boolean
}

export const resolveAudioGain = (audio?: AudioSettings) =>
	audio?.enabled === false ? 0 : audio?.gain ?? 1

