import { afterEach, expect, test } from 'bun:test'
import { mkdir, mkdtemp, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { extractMemoryLinks, resolveLinkedMemoryPaths } from './memoryLinks.js'

let tempDir: string

afterEach(async () => {
  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true })
  }
})

/** Memory file body with the nested `metadata.type` frontmatter the prompt asks for. */
function memoryFile(name: string, body: string, type = 'project'): string {
  return `---\nname: ${name}\ndescription: desc for ${name}\nmetadata:\n  type: ${type}\n---\n\n${body}\n`
}

test('extractMemoryLinks reads body links in order and ignores frontmatter', () => {
  const content = memoryFile(
    'alpha',
    'See [[beta]], then [[gamma]] and [[beta]] again.',
  )
  expect(extractMemoryLinks(content)).toEqual(['beta', 'gamma'])
})

test('extractMemoryLinks ignores wiki-style links in the description', () => {
  const content = `---\nname: alpha\ndescription: supersedes [[beta]]\nmetadata:\n  type: project\n---\n\nno links here\n`
  expect(extractMemoryLinks(content)).toEqual([])
})

test('extractMemoryLinks rejects path-shaped and aliased links', () => {
  const content = memoryFile(
    'alpha',
    '[[../../etc/passwd]] [[/abs/path]] [[ok-slug|display text]]',
  )
  expect(extractMemoryLinks(content)).toEqual(['ok-slug'])
})

test('resolveLinkedMemoryPaths resolves by filename stem', async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'memoryLinks-'))
  const alpha = memoryFile('alpha', 'related: [[beta]]')
  await writeFile(join(tempDir, 'alpha.md'), alpha)
  await writeFile(join(tempDir, 'beta.md'), memoryFile('beta', 'body'))

  const out = await resolveLinkedMemoryPaths({
    memoryDir: tempDir,
    sources: [{ path: join(tempDir, 'alpha.md'), content: alpha }],
    skip: new Set([join(tempDir, 'alpha.md')]),
    limit: 5,
  })

  expect(out).toEqual([join(tempDir, 'beta.md')])
})

test('resolveLinkedMemoryPaths falls back to the frontmatter name', async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'memoryLinks-'))
  const alpha = memoryFile('alpha', 'related: [[renamed-topic]]')
  await writeFile(join(tempDir, 'alpha.md'), alpha)
  // Stem and `name:` diverge — the link names the slug, not the file.
  await writeFile(
    join(tempDir, 'some-filename.md'),
    memoryFile('renamed-topic', 'body'),
  )

  const out = await resolveLinkedMemoryPaths({
    memoryDir: tempDir,
    sources: [{ path: join(tempDir, 'alpha.md'), content: alpha }],
    skip: new Set(),
    limit: 5,
  })

  expect(out).toEqual([join(tempDir, 'some-filename.md')])
})

test('resolveLinkedMemoryPaths drops unresolved links and respects limit', async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'memoryLinks-'))
  const alpha = memoryFile('alpha', '[[missing]] [[beta]] [[gamma]]')
  await writeFile(join(tempDir, 'alpha.md'), alpha)
  await writeFile(join(tempDir, 'beta.md'), memoryFile('beta', 'body'))
  await writeFile(join(tempDir, 'gamma.md'), memoryFile('gamma', 'body'))

  const out = await resolveLinkedMemoryPaths({
    memoryDir: tempDir,
    sources: [{ path: join(tempDir, 'alpha.md'), content: alpha }],
    skip: new Set(),
    limit: 1,
  })

  expect(out).toEqual([join(tempDir, 'beta.md')])
})

test('resolveLinkedMemoryPaths does not follow links out of the memory dir', async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'memoryLinks-'))
  const sub = join(tempDir, 'team')
  await mkdir(sub, { recursive: true })
  const alpha = memoryFile('alpha', '[[escaped]]')
  await writeFile(join(tempDir, 'alpha.md'), alpha)
  // Only in the subdirectory: a slug there must not satisfy a link from the
  // parent, or a team memory could be pulled into a private surface.
  await writeFile(join(sub, 'escaped.md'), memoryFile('escaped', 'body'))

  const out = await resolveLinkedMemoryPaths({
    memoryDir: tempDir,
    sources: [{ path: join(tempDir, 'alpha.md'), content: alpha }],
    skip: new Set(),
    limit: 5,
  })

  expect(out).toEqual([])
})

test('resolveLinkedMemoryPaths skips already-surfaced files', async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'memoryLinks-'))
  const alpha = memoryFile('alpha', '[[beta]]')
  const betaPath = join(tempDir, 'beta.md')
  await writeFile(join(tempDir, 'alpha.md'), alpha)
  await writeFile(betaPath, memoryFile('beta', 'body'))

  const out = await resolveLinkedMemoryPaths({
    memoryDir: tempDir,
    sources: [{ path: join(tempDir, 'alpha.md'), content: alpha }],
    skip: new Set([betaPath]),
    limit: 5,
  })

  expect(out).toEqual([])
})
