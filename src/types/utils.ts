/**
 * Shared generic utility types. Type-only module.
 */

/** Recursively freezes a type: every nested property becomes readonly. */
export type DeepImmutable<T> = T extends (...args: never[]) => unknown
  ? T
  : T extends object
    ? { readonly [K in keyof T]: DeepImmutable<T[K]> }
    : T

/** All orderings of a string union as tuple types. */
export type Permutations<T extends string> = [T] extends [never]
  ? []
  : _Permutations<T, T>
type _Permutations<T extends string, U extends string> = [T] extends [never]
  ? []
  : [T, ..._Permutations<Exclude<U, T>, Exclude<U, T>>]
