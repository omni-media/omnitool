// for later: https://github.com/gpac/mp4box.js/issues/243
export const encoderDefaultConfig: VideoEncoderConfig = {
	codec: "avc1.640034",
	avc: {format: "annexb"},
	width: 1280,
	height: 720,
	bitrate: 9_000_000, // 9 Mbps
	framerate: 60,
	bitrateMode: "variable",
	hardwareAcceleration: "no-preference" // prefer-hardware seems like 2x slower from what i been testing
}
