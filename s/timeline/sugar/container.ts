import {ItemBase} from "../parts/item.js"

export type ContainerArgs<T> = T[] | [options: ItemBase, ...children: T[]]

function isContainerOptions(value: unknown): value is ItemBase {
	return typeof value === "object" && value !== null && !("kind" in value)
}

export function parseContainerArgs<T>(
	args: ContainerArgs<T>
): {options: ItemBase, children: T[]} {
	if (isContainerOptions(args[0])) {
		const [options, ...children] = args
		return {options, children: children as T[]}
	}

	return {options: {}, children: args as T[]}
}
