import {O} from "./o.js"
import {Id} from "../parts/basics.js"
import {Item} from "../parts/item.js"

export class TimelineItem {
	public readonly id: Id

	constructor(public item: Item.Any) {
		this.id = item.id
	}

	toJSON() {
		return {
			...this.item
		}
	}
}

abstract class VisualItem extends TimelineItem {
  abstract spatial(spatial: Spatial): TimelineItem
}

export class Stack extends VisualItem {
  constructor(private o: O, public item: Item.Stack) {
  	super(item)
  }

  spatial(spatial: Spatial) {
  	this.item.spatialId = spatial.item.id
    return this
  }

  addChildren(fn: (o: O) => TimelineItem | TimelineItem[]) {
  	const result = fn(this.o)
  	const items = Array.isArray(result) ? result : [result]
    this.item.childrenIds.push(...items.map(c => c.item.id))
    return this
  }
}

export class Spatial extends TimelineItem {
	constructor(public item: Item.Spatial) {super(item)}
}

export class Gap extends TimelineItem {
	constructor(public item: Item.Gap) {super(item)}
}

export class Audio extends TimelineItem {
	constructor(public item: Item.Audio) {super(item)}
}

export class Video extends VisualItem {
  constructor(public item: Item.Video) {
  	super(item)
  }

  spatial(spatial: Spatial) {
  	this.item.spatialId = spatial.item.id
    return this
  }
}

export class Text extends VisualItem {
  constructor(public item: Item.Text) {
  	super(item)
  }

  color(color: string) {
  	this.item.color = color
		return this
  }

  spatial(spatial: Spatial) {
  	this.item.spatialId = spatial.item.id
    return this
  }
}

export class Sequence extends VisualItem {
	constructor(private o: O, public item: Item.Sequence) {
		super(item)
	}

  spatial(spatial: Spatial) {
  	this.item.spatialId = spatial.item.id
    return this
  }

  addChildren(fn: (o: O) => TimelineItem | TimelineItem[]) {
  	const result = fn(this.o)
  	const items = Array.isArray(result) ? result : [result]
    this.item.childrenIds.push(...items.map(c => c.item.id))
    return this
  }
}

export class Transition extends TimelineItem {
	constructor(public item: Item.Transition) {
		super(item)
	}
}
