/** Data accumulated across the new-agent creation wizard steps. */

import type { SettingSource } from '../../../utils/settings/constants.js'

export interface AgentWizardData {
  agentType?: string
  description?: string
  /** Parsed agent definition produced by the generate step. */
  finalAgent?: any
  generationPrompt?: string
  isGenerating?: boolean
  location?: SettingSource
  method?: 'manual' | 'generate'
  selectedColor?: string
  selectedMemory?: string
  selectedModel?: string
  selectedTools?: string[]
  systemPrompt?: string
  wasGenerated?: boolean
  whenToUse?: string
}
