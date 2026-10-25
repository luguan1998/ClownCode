import { Event } from './event.js'

/** Bracketed-paste payload delivered to onPaste handlers. */
export class PasteEvent extends Event {
  readonly text: string

  constructor(text: string) {
    super()
    this.text = text
  }
}
