/**
 * Generic multi-step wizard types. Type-only module.
 */

import type * as React from 'react'

export interface WizardContextValue<T = any> {
  currentStepIndex: number
  totalSteps: number
  wizardData: T
  setWizardData: React.Dispatch<React.SetStateAction<T>>
  updateWizardData: (updates: Partial<T>) => void
  goNext: () => void
  goBack: () => void
  goToStep: (index: number) => void
  cancel: () => void
  title: string | undefined
  showStepCounter: boolean
}

/** A wizard step: rendered as `<CurrentStepComponent />` with no props. */
export type WizardStepComponent = React.ComponentType

export interface WizardProviderProps<T = any> {
  steps: WizardStepComponent[]
  initialData?: T
  onComplete: (data: T) => void
  onCancel: () => void
  children?: React.ReactNode
  title?: string
  showStepCounter?: boolean
}
