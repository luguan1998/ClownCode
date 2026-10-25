// Global types for Ink renderer intrinsic elements.
import 'react'

type InkIntrinsicElements = {
  'ink-box': Record<string, unknown>
  'ink-text': Record<string, unknown>
  'ink-root': Record<string, unknown>
  'ink-virtual-text': Record<string, unknown>
  'ink-link': Record<string, unknown>
  'ink-raw-ansi': Record<string, unknown>
  'ink-progress': Record<string, unknown>
}

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements extends InkIntrinsicElements {}
  }
}

declare global {
  namespace JSX {
    interface IntrinsicElements extends InkIntrinsicElements {}
  }
}
