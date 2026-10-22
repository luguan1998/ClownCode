/** OpenClaude: Anthropic extra-usage billing was removed. */
export function isBilledAsExtraUsage(
  _model: string,
  _fastModeToggledOn: boolean,
  _opus1mMergeEnabled: boolean,
): boolean {
  return false
}
