
import {Science, test, expect} from "@e280/science"

import {Item, Kind} from "../item.js"
import {itemsAt} from "./parts/handy.js"
import {TimelineFile} from "../basics.js"
import {Mat6} from "../../utils/matrix.js"
import {Ms, ms} from "../../../units/ms.js"
import {Sampler} from "./parts/sampler.js"
import {Layer} from "../../../driver/fns/schematic.js"

export default Science.suite({
	"Sampling Logic (Time Mapping)": {
		"Video: Samples correctly within bounds": test(async () => {

			const sampler = new Sampler(
				async (item: Item.Any, time: Ms, matrix: Mat6): Promise<Layer[]> => {
					const image = new ImageBitmap()
					return [{ kind: 'image', id: 0, frame: new VideoFrame(image) }]
				}
			)

			const text: Item.Text = {
				id: 1,
				kind: Kind.Text,
				content: 'test',
				duration: 10000
			}

			const timeline: TimelineFile = {
				format: "timeline",
				version: 0,
				info: "https://omniclip.app/",
				rootId: 0,
				items: [
					{
						id: 0,
						kind: Kind.Sequence,
						childrenIds: [text.id]
					},
					text
				]
			}

			const at = itemsAt({ timeline, timecode: ms(1000) })
			expect(at.length).is(1)

			const entry = at[0]
			expect(entry.item.kind).is(Kind.Text)
			const sample = await sampler.sample(
				timeline,
				entry.localTime
			)

			expect(sample.length).is(1)
		}),

		"Video: Returns empty when out of bounds": test(async () => {
			// Behavior: Video (Duration 10s). sampleAt(11s) or sampleAt(-1s).
			// Verification: Returns [] (empty array).
		}),

		"Stack (Composition): Samples all children at the same absolute time": test(async () => {
			// Behavior: Stack has Child A and Child B. Request sampleAt(5s).
			// Verification: Child A is sampled at 5s. Child B is sampled at 5s.
			// Result: Returns [...layersA, ...layersB] (Combined list).
		}),

		"Sequence (Offset): Maps global time to local child time": test(async () => {
			// Setup: Sequence = [Clip A (2s), Clip B (5s)].
			// Behavior: Request sampleAt(3s) (This falls 1s into Clip B).
			// Verification:
			// 1. Clip A is NOT sampled.
			// 2. Clip B IS sampled at 1s (Global 3s - Clip A 2s = Local 1s).
		}),

		"Sequence (Transition): Samples both clips during overlap": test(async () => {
			// Setup: Clip A (5s) -> Transition (1s overlap) -> Clip B (5s).
			// Behavior: Request sampleAt(4.5s) (Right in the middle of transition).
			// Verification:
			// 1. Clip A sampled at 4.5s.
			// 2. Clip B sampled at 0.5s (Time inside the overlap).
			// 3. Result includes a special "Transition Layer" combining them.
		}),

		"Gap: Returns empty layers but occupies time": test(async () => {
			// Behavior: Sequence = [Video (1s), Gap (2s), Video (1s)].
			// Request sampleAt(2s) (Inside the gap).
			// Verification: Returns [] (empty), but validates that we are technically "inside" the timeline.
		}),
	},

	"Structural Logic (Time)": {
		"Stack Duration: Equals the duration of the longest child": test(async () => {
			// Behavior: Stack([1s, 5s, 2s]) -> Duration 5s.
		}),

		"Sequence Duration: Equals the sum of all children durations": test(async () => {
			// Behavior: Sequence([1s, 5s, 2s]) -> Duration 8s.
		}),

		"Sequence Transitions: Duration is reduced by the transition overlap": test(async () => {
			// Behavior: Clip A (10s) -> Transition (1s overlap) -> Clip B (10s).
			// Calculation: 10 + 10 - 1 = 19s Total Duration.
		}),
	},

	"Visual Logic (Space)": {
		"Matrix Inheritance: Children inherit parent's transformation": test(async () => {
			// Behavior: If Parent Stack is moved x:100, and Child Video is x:50.
			// Verification: Child's final matrix must correspond to x:150.
		}),

		"Spatial Item: Updates the world matrix before passing to children": test(async () => {
			// Behavior: A 'Spatial' item in the tree should modify the matrix passed to its inner content.
		}),
	},

})
