import { expect, test } from 'bun:test'
import {
  isOfficialMcpUrl,
  prefetchOfficialMcpUrls,
} from './officialRegistry.js'

test('does not fetch the official registry', async () => {
  // OpenClaude removed the first-party registry; this must be a no-op.
  await prefetchOfficialMcpUrls()
  expect(isOfficialMcpUrl('https://example.com/mcp')).toBe(false)
})
