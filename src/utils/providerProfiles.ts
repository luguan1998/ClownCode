import type { ModelOption } from './model/modelOptions.js'

/**
 * OpenClaude: provider profiles were removed. Only the in-memory model-option
 * cache remains for the /model picker.
 */

let activeOpenAIModelOptions: ModelOption[] = []

export function getActiveOpenAIModelOptionsCache(): ModelOption[] {
  return activeOpenAIModelOptions
}

export function setActiveOpenAIModelOptionsCache(
  options: ModelOption[],
): void {
  activeOpenAIModelOptions = options
}

export function persistActiveProviderProfileModel(_model: string): void {}
