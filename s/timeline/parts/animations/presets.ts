
import type {AnimationPresetDefinition} from "./types.js"

export const animationPresets = {
	slideIn: {
		type: "motion",
		label: "Slide in",
		defaults: {
			duration: 700,
			from: [-400, 0],
			to: [0, 0],
			terp: "easeOut",
		},
		transform: {
			from: {position: [-400, 0]},
			to: {position: [0, 0]},
		},
	},
	slideOut: {
		type: "motion",
		label: "Slide out",
		defaults: {
			duration: 700,
			from: [0, 0],
			to: [400, 0],
			terp: "easeIn",
		},
		transform: {
			from: {position: [0, 0]},
			to: {position: [400, 0]},
		},
	},
	spinIn: {
		type: "motion",
		label: "Spin in",
		defaults: {
			duration: 700,
			from: [0, 0],
			to: [0, 0],
			terp: "easeOut",
		},
		transform: {
			from: {scale: [0, 0], rotation: -Math.PI},
			to: {scale: [1, 1], rotation: 0},
		},
	},
	spinOut: {
		type: "motion",
		label: "Spin out",
		defaults: {
			duration: 700,
			from: [0, 0],
			to: [0, 0],
			terp: "easeIn",
		},
		transform: {
			from: {scale: [1, 1], rotation: 0},
			to: {scale: [0, 0], rotation: Math.PI},
		},
	},
	zoomIn: {
		type: "motion",
		label: "Zoom in",
		defaults: {
			duration: 700,
			from: [0, 0],
			to: [0, 0],
			terp: "easeOut",
		},
		transform: {
			from: {scale: [0, 0]},
			to: {scale: [1, 1]},
		},
	},
	zoomOut: {
		type: "motion",
		label: "Zoom out",
		defaults: {
			duration: 700,
			from: [0, 0],
			to: [0, 0],
			terp: "easeIn",
		},
		transform: {
			from: {scale: [1, 1]},
			to: {scale: [0, 0]},
		},
	},
	bounceIn: {
		type: "motion",
		label: "Bounce in",
		defaults: {
			duration: 700,
			from: [0, 0],
			to: [0, 0],
			terp: "bounce",
		},
		transform: {
			from: {scale: [0, 0]},
			to: {scale: [1, 1]},
		},
	},
	bounceOut: {
		type: "motion",
		label: "Bounce out",
		defaults: {
			duration: 700,
			from: [0, 0],
			to: [0, 0],
			terp: "bounce",
		},
		transform: {
			from: {scale: [1, 1]},
			to: {scale: [0, 0]},
		},
	},
	fadeIn: {
		type: "scalar",
		label: "Fade in",
		defaults: {
			duration: 700,
			from: 0,
			to: 1,
			terp: "easeIn",
		},
	},
	fadeOut: {
		type: "scalar",
		label: "Fade out",
		defaults: {
			duration: 700,
			from: 1,
			to: 0,
			terp: "easeOut",
		},
	},
} as const satisfies Record<string, AnimationPresetDefinition>

