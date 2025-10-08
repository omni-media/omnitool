import {TimelineItem} from "./sugar/builders.js"
import {Id, TimelineFile} from "./parts/basics.js"

export class Timeline {
  constructor(public root: TimelineItem, private items: Map<Id, TimelineItem>) {}

  require<T extends TimelineItem>(id: Id): T {
    const item = this.items.get(id)
    return item as T
  }

  toJSON(): TimelineFile {
    return {
			format: "timeline",
			info: "https://omniclip.app/",
			version: 0,
			rootId: this.root.item.id,
			items: Array.from(this.items.values()).map(item => item.toJSON())
    }
  }
}

