// Stub
import type * as React from 'react'
import type { AgentMemoryScope } from '../../tools/AgentTool/agentMemory.js'

type Props = {
  agentType: string
  scope: AgentMemoryScope
  snapshotTimestamp: string
  onComplete: (result: 'merge' | 'keep' | 'replace') => void
  onCancel: () => void
}

export function SnapshotUpdateDialog(_props: Props): React.ReactNode {
  return null
}
