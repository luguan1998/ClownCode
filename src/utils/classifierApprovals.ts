/**
 * Tracks which tool uses were auto-approved by the auto-mode classifier.
 * Populated from useCanUseTool.ts, read from UserToolSuccessMessage.tsx.
 */

import { createSignal } from './signal.js'

const CLASSIFIER_APPROVALS = new Map<string, string>()
const CLASSIFIER_CHECKING = new Set<string>()
const classifierChecking = createSignal()

export function setYoloClassifierApproval(
  toolUseID: string,
  reason: string,
): void {
  CLASSIFIER_APPROVALS.set(toolUseID, reason)
}

export function getYoloClassifierApproval(
  toolUseID: string,
): string | undefined {
  return CLASSIFIER_APPROVALS.get(toolUseID)
}

export function setClassifierChecking(toolUseID: string): void {
  CLASSIFIER_CHECKING.add(toolUseID)
  classifierChecking.emit()
}

export function clearClassifierChecking(toolUseID: string): void {
  CLASSIFIER_CHECKING.delete(toolUseID)
  classifierChecking.emit()
}

export const subscribeClassifierChecking = classifierChecking.subscribe

export function isClassifierChecking(toolUseID: string): boolean {
  return CLASSIFIER_CHECKING.has(toolUseID)
}

export function deleteClassifierApproval(toolUseID: string): void {
  CLASSIFIER_APPROVALS.delete(toolUseID)
}

export function clearClassifierApprovals(): void {
  CLASSIFIER_APPROVALS.clear()
  CLASSIFIER_CHECKING.clear()
  classifierChecking.emit()
}
