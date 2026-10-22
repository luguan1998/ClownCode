import { afterEach, beforeEach, expect, mock, test } from 'bun:test'
import axios from 'axios'

import { checkDomainBlocklist } from './utils.js'

const originalEnv = { ...process.env }

beforeEach(() => {
  process.env = { ...originalEnv }
})

afterEach(() => {
  process.env = { ...originalEnv }
  mock.restore()
})

test('returns allowed without any external domain-policy call', async () => {
  const getSpy = mock(() =>
    Promise.resolve({ status: 200, data: { can_fetch: true } }),
  )
  axios.get = getSpy as typeof axios.get

  const result = await checkDomainBlocklist('example.com')

  expect(result.status).toBe('allowed')
  expect(getSpy).not.toHaveBeenCalled()
})
