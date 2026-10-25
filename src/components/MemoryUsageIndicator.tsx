import * as React from 'react';

/**
 * Internal-only high-memory banner (it links to /heapdump). The vendor build
 * flag that gated it is off in this build, so the component renders nothing
 * and the 10s heap-polling hook is never set up.
 */
export function MemoryUsageIndicator(): React.ReactNode {
  return null;
}
