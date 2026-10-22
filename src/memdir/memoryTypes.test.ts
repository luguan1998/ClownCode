import { expect, test } from 'bun:test'
import {
  MEMORY_FRONTMATTER_EXAMPLE,
  MEMORY_LINK_CONVENTION,
  MEMORY_TYPE_GLOSSES,
  memoryFileCapLine,
  memoryIndexPointerLine,
  typesSection,
} from './memoryTypes.js'

test('frontmatter example nests the type under metadata', () => {
  const example = MEMORY_FRONTMATTER_EXAMPLE.join('\n')
  expect(example).toContain('metadata:')
  expect(example).toContain('  type: user | feedback | project | reference')
  // The flat shape must not survive: scanMemoryFiles reads metadata.type first,
  // and a prompt teaching the old shape would write files it cannot classify.
  expect(example).not.toContain('\ntype: user')
})

test('link convention allows forward references', () => {
  expect(MEMORY_LINK_CONVENTION).toContain('[[name]]')
  expect(MEMORY_LINK_CONVENTION).toContain("doesn't match an existing memory yet")
})

test('glosses name all four types', () => {
  for (const type of ['user', 'feedback', 'project', 'reference']) {
    expect(MEMORY_TYPE_GLOSSES).toContain(`\`${type}\``)
  }
})

test('index pointer names the entrypoint, cap line names the size', () => {
  const pointer = memoryIndexPointerLine({ entrypointName: 'MEMORY.md' })
  expect(pointer).toContain('`MEMORY.md`')
  expect(pointer).toContain('- [Title](file.md)')
  expect(pointer).not.toContain('team/')
  expect(
    memoryIndexPointerLine({
      entrypointName: 'MEMORY.md',
      teamPrefixes: ['team/'],
    }),
  ).toContain('`team/`')
  expect(memoryFileCapLine()).toContain('4KB')
})

test('types section points at the skill instead of the full taxonomy', () => {
  const individual = typesSection(false).join('\n')
  expect(individual).toContain('`memory-types`')
  expect(individual).not.toContain('<types>')
  expect(individual).not.toContain('Memory scope')

  const combined = typesSection(true).join('\n')
  expect(combined).toContain('always private')
})
