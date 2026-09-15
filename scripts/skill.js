// Bundle the timeline skill into an importable string for downstream assistants,
// useful for local models running through e.g., Transformers.js.

import {glob, readFile, writeFile} from "node:fs/promises"

const skillDirectory = new URL("../skills/timeline/", import.meta.url)

// Present the entrypoint first, then references, then catalogs.
function filePriority(path) {
	if (path === "SKILL.md") return 0
	if (path.startsWith("references/")) return 1
	return 2
}

const paths = await Array.fromAsync(
	glob("**/*.{md,json}", {cwd: skillDirectory}),
)

paths.sort((a, b) => {
	const priorityDifference = filePriority(a) - filePriority(b)
	return priorityDifference || a.localeCompare(b)
})

const sections = [
	"The complete Omnitool timeline skill is embedded below. " +
	"Linked paths refer to the embedded files with matching paths.",
]

for (const path of paths) {
	const file = new URL(path, skillDirectory)
	let text = (await readFile(file, "utf8")).trim()

	// Remove catalog whitespace to reduce model context usage.
	if (path.endsWith(".json")) {
		text = JSON.stringify(JSON.parse(text))
	}

	sections.push([
		`<skill-file path=${JSON.stringify(path)}>`,
		text,
		"</skill-file>",
	].join("\n"))
}

const content = sections.join("\n\n")
const moduleSource = `export const timelineSkill = ${JSON.stringify(content)}\n`
const declaration = "export declare const timelineSkill: string\n"

await Promise.all([
	writeFile(new URL("../x/skill.js", import.meta.url), moduleSource),
	writeFile(new URL("../x/skill.d.ts", import.meta.url), declaration),
])
