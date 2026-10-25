/**
 * File suggestion command input: the JSON payload piped to a
 * user-configured fileSuggestion command.
 */

export interface FileSuggestionCommandInput {
  session_id: string
  transcript_path: string
  cwd: string
  query: string
  [key: string]: unknown
}
