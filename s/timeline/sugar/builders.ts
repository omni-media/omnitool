import {Item} from "../parts/item.js"

export class TimelineItem {
	constructor(public item: Item.Any) {}

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
  constructor(public item: Item.Stack) {
  	super(item)
  }

  spatial(spatial: Spatial) {
    return new Stack({...this.item, spatialId: spatial.item.id})
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
    return new Video({...this.item, spatialId: spatial.item.id})
  }
}

export class Text extends VisualItem {
  constructor(public item: Item.Text) {
  	super(item)
  }

  color(color: string) {
		return new Text({...this.item, color})
  }

  spatial(spatial: Spatial) {
    return new Text({...this.item, spatialId: spatial.item.id})
  }
}

export class Sequence extends VisualItem {
	constructor(public item: Item.Sequence) {
		super(item)
	}

  spatial(spatial: Spatial) {
    return new Sequence({...this.item, spatialId: spatial.item.id})
  }
}

export class Transition extends TimelineItem {
	constructor(public item: Item.Transition) {
		super(item)
	}
}
