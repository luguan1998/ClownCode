/**
 * Keybinding system types. Shared by the parser, resolver, React context
 * and consumer components. Type-only module.
 */

/** A single keystroke with modifier state, normalized by `parseKeystroke`. */
export interface ParsedKeystroke {
  key: string
  ctrl: boolean
  alt: boolean
  shift: boolean
  meta: boolean
  super: boolean
}

/** A chord: one or more keystrokes pressed in sequence. */
export type Chord = ParsedKeystroke[]

/** UI area a binding applies to; 'Global' applies everywhere. */
export type KeybindingContextName =
  | 'Global'
  | 'Attachments'
  | 'Autocomplete'
  | 'Chat'
  | 'Confirmation'
  | 'DiffDialog'
  | 'Footer'
  | 'Help'
  | 'HistorySearch'
  | 'MessageActions'
  | 'MessageSelector'
  | 'ModelPicker'
  | 'Plugin'
  | 'Scroll'
  | 'Select'
  | 'Settings'
  | 'Tabs'
  | 'Task'
  | 'ThemePicker'
  | 'Transcript'

/** Fully-qualified action name, e.g. 'app:interrupt' or 'chat:submit'. */
export type KeybindingAction =
  | 'app:exit'
  | 'app:globalSearch'
  | 'app:interrupt'
  | 'app:quickOpen'
  | 'app:redraw'
  | 'app:toggleBrief'
  | 'app:toggleTeammatePreview'
  | 'app:toggleTerminal'
  | 'app:toggleTodos'
  | 'app:toggleTranscript'
  | 'attachments:exit'
  | 'attachments:next'
  | 'attachments:previous'
  | 'attachments:remove'
  | 'autocomplete:accept'
  | 'autocomplete:dismiss'
  | 'autocomplete:next'
  | 'autocomplete:previous'
  | 'chat:cancel'
  | 'chat:cycleMode'
  | 'chat:externalEditor'
  | 'chat:fastMode'
  | 'chat:imagePaste'
  | 'chat:killAgents'
  | 'chat:messageActions'
  | 'chat:modelPicker'
  | 'chat:stash'
  | 'chat:submit'
  | 'chat:thinkingToggle'
  | 'chat:undo'
  | 'confirm:cycleMode'
  | 'confirm:next'
  | 'confirm:nextField'
  | 'confirm:no'
  | 'confirm:previous'
  | 'confirm:toggle'
  | 'confirm:toggleExplanation'
  | 'confirm:yes'
  | 'diff:dismiss'
  | 'footer:down'
  | 'footer:next'
  | 'footer:previous'
  | 'footer:up'
  | 'help:dismiss'
  | 'history:next'
  | 'history:previous'
  | 'history:search'
  | 'permission:toggleDebug'
  | 'plugin:install'
  | 'plugin:toggle'
  | 'scroll:bottom'
  | 'scroll:lineDown'
  | 'scroll:lineUp'
  | 'scroll:pageDown'
  | 'scroll:pageUp'
  | 'scroll:top'
  | 'select:accept'
  | 'select:cancel'
  | 'select:next'
  | 'select:previous'
  | 'selection:copy'
  | 'settings:close'
  | 'settings:retry'
  | 'settings:search'
  | 'tabs:next'
  | 'tabs:previous'
  | 'task:background'
  | 'theme:toggleSyntaxHighlighting'
  | 'transcript:exit'
  | 'transcript:toggleShowAll'
  | 'voice:pushToTalk'
  // User-defined actions from custom bindings are plain strings.
  | (string & {})

/** A keybinding config block from defaultBindings or user JSON. */
export interface KeybindingBlock {
  context: KeybindingContextName
  bindings: Record<string, KeybindingAction>
}

/** A single parsed binding. */
export interface ParsedBinding {
  chord: Chord
  action: string
  context: KeybindingContextName
}
