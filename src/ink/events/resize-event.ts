import { Event } from './event.js'

/** Terminal resize event delivered to onResize handlers. */
export class ResizeEvent extends Event {
  readonly columns: number
  readonly rows: number

  constructor(columns: number, rows: number) {
    super()
    this.columns = columns
    this.rows = rows
  }
}
