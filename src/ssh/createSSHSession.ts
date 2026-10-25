/**
 * SSH session type (remote SSH attach feature, currently disabled).
 * Type-only module retained for screens/REPL.tsx.
 */

export type SSHSession = {
  id: string
  [key: string]: unknown
}
