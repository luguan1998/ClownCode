/** Spinner display types. */

/** Numeric RGB triple used for shimmer interpolation. */
export type RGBColor = {
  r: number
  g: number
  b: number
}

export type SpinnerMode = 'requesting' | 'tool-use' | 'thinking' | 'responding' | 'tool-input'
