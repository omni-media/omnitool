// Generate skill catalogs from Omnitool's filter and transition registries.

import {mkdir, readFile, rm, writeFile} from "node:fs/promises"

import {filters} from "../x/timeline/parts/filters.js"
import {transitionNames} from "../x/timeline/parts/transitions.js"

const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"))
const directory = new URL("../skills/timeline/assets/", import.meta.url)
const filtersDirectory = new URL("filters/", directory)
const filterDefinitions = Object.values(filters)
const serialize = value => `${JSON.stringify(value, null, 2)}\n`

await rm(filtersDirectory, {recursive: true, force: true})
await mkdir(filtersDirectory, {recursive: true})
await Promise.all([
	writeFile(new URL("transitions.json", directory), serialize({
		omnitoolVersion: packageJson.version,
		transitions: transitionNames,
	})),
	writeFile(new URL("index.json", filtersDirectory), serialize({
		omnitoolVersion: packageJson.version,
		filters: filterDefinitions.map(({type}) => type),
	})),
	...filterDefinitions.map(({type, schema}) =>
		writeFile(new URL(`${type}.json`, filtersDirectory), serialize({type, schema})),
	),
])
