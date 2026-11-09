import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { zstdDecompressSync, constants } from 'node:zlib';

const ZSTD_MAGIC = 0xFD2FB528;

function scanZstdFrames(buffer) {
  const frames = [];
  let offset = 0;
  while (offset < buffer.length) {
    const start = offset;
    if (buffer.length - offset < 4) return { frames, tornStart: start };
    if (buffer.readUInt32LE(offset) !== ZSTD_MAGIC) throw new Error(`invalid frame magic at byte ${offset}`);
    offset += 4;
    if (offset === buffer.length) return { frames, tornStart: start };
    const descriptor = buffer.readUInt8(offset);
    offset += 1;
    if ((descriptor & 0x18) !== 0) throw new Error(`reserved frame-header bit at byte ${offset - 1}`);
    const contentSizeFlag = descriptor >>> 6;
    const singleSegment = (descriptor & 0x20) !== 0;
    const checksum = (descriptor & 0x04) !== 0;
    const dictionaryFlag = descriptor & 0x03;
    const dictionaryBytes = dictionaryFlag === 3 ? 4 : dictionaryFlag;
    const contentSizeBytes = contentSizeFlag === 0 ? (singleSegment ? 1 : 0) : 1 << contentSizeFlag;
    const remainingHeaderBytes = (singleSegment ? 0 : 1) + dictionaryBytes + contentSizeBytes;
    if (buffer.length - offset < remainingHeaderBytes) return { frames, tornStart: start };
    offset += remainingHeaderBytes;
    for (;;) {
      if (buffer.length - offset < 3) return { frames, tornStart: start };
      const blockHeader = buffer.readUIntLE(offset, 3);
      offset += 3;
      const lastBlock = (blockHeader & 1) !== 0;
      const blockType = (blockHeader >>> 1) & 0x03;
      const blockSize = blockHeader >>> 3;
      if (blockType === 0x03) throw new Error(`reserved block type at byte ${offset - 3}`);
      const payloadBytes = blockType === 0x01 ? 1 : blockSize;
      if (buffer.length - offset < payloadBytes) return { frames, tornStart: start };
      offset += payloadBytes;
      if (lastBlock) break;
    }
    if (checksum) {
      if (buffer.length - offset < 4) return { frames, tornStart: start };
      offset += 4;
    }
    frames.push({ start, end: offset });
  }
  return { frames };
}

function readSessionLog(file) {
  const buf = readFileSync(file);
  if (!file.endsWith('.zstd')) return buf.toString('utf8');
  const { frames, tornStart } = scanZstdFrames(buf);
  const parts = frames.map((f) => zstdDecompressSync(buf.subarray(f.start, f.end)));
  if (tornStart !== undefined) {
    try {
      parts.push(zstdDecompressSync(buf.subarray(tornStart), { finishFlush: constants.ZSTD_e_flush }));
    } catch {}
  }
  return Buffer.concat(parts).toString('utf8');
}

function locateSessionDir(args) {
  const home = process.env.DSH_HOME;
  const target = args[2];
  if (target) {
    try {
      if (statSync(target).isDirectory()) return target;
    } catch {}
  }
  const root = join(home, 'sessions');
  const id = target || process.env.DSH_SESSION_ID;
  for (const project of readdirSync(root)) {
    const candidate = join(root, project, id);
    try {
      if (statSync(candidate).isDirectory()) return candidate;
    } catch {}
  }
  throw new Error(`session not found: ${id}`);
}

function textOf(content) {
  if (typeof content === 'string') return content;
  return content.map((part) => (part.type === 'text' ? part.text : `[unsupported part: ${part.type}]`)).join('\n');
}

const sessionDir = locateSessionDir(process.argv);
const logFile = join(sessionDir, 'session.v4.jsonl.zstd');
const events = readSessionLog(logFile).split('\n').filter(Boolean).map((line) => JSON.parse(line));
const outDir = process.argv[3] ?? join(process.cwd(), '.dsh-dump');
mkdirSync(outDir, { recursive: true });

writeFileSync(join(outDir, 'session.v4.jsonl'), events.map((e) => JSON.stringify(e)).join('\n'));
const headerEvent = events.find((e) => e.type === 'request/header');
const header = headerEvent?.data?.header;
const tools = header?.tools ?? [];
writeFileSync(join(outDir, 'request-header.json'), JSON.stringify(headerEvent?.data ?? {}, null, 2));
writeFileSync(join(outDir, 'tools.json'), JSON.stringify(tools, null, 2));
const rows = tools.map((tool) => `| ${tool.name} | ${(tool.description ?? '').split('\n')[0].replaceAll('|', '\\|')} |`);
writeFileSync(join(outDir, 'tools-summary.md'), [
  '# Tool schemas sent with the request',
  '',
  `- provider: \`${header?.config?.provider}\``,
  `- model: \`${header?.config?.model}\``,
  `- reasoningEffort: \`${header?.config?.reasoningEffort}\``,
  `- maxTokens: \`${header?.config?.maxTokens}\``,
  `- tool count: ${tools.length}`,
  '',
  '| tool | description (first line) |',
  '| --- | --- |',
  ...rows,
  '',
].join('\n'));

const systemEvents = events.filter((e) => e.type === 'system/message');
const systemText = systemEvents.length ? textOf(systemEvents[0].data.message.content) : '';
systemEvents.forEach((event, index) => {
  writeFileSync(join(outDir, `system-prompt${index === 0 ? '' : `-${index + 1}`}.txt`), textOf(event.data.message.content));
});

const sourceKindOrder = ['agent-instructions', 'runtime-context', 'skill-catalog', 'time-context', 'user-approval'];
const sectionLabel = {
  'agent-instructions': 'Workspace instructions (CLAUDE.md / AGENTS.md)',
  'runtime-context': 'Runtime context snapshot',
  'skill-catalog': 'Available skills catalog',
  'time-context': 'Time context',
  'user-approval': 'User approval-policy notice',
};
const contextDir = join(outDir, 'context');
mkdirSync(contextDir, { recursive: true });
const contextMessages = events.filter((e) => e.type === 'user/message' && sourceKindOrder.includes(e.data?.source?.kind));
const counts = new Map();
contextMessages.forEach((event) => {
  const kind = event.data.source.kind;
  const n = (counts.get(kind) ?? 0) + 1;
  counts.set(kind, n);
  const base = `${kind}-${n}`;
  writeFileSync(join(contextDir, `${base}.txt`), textOf(event.data.content));
  writeFileSync(join(contextDir, `${base}.meta.json`), JSON.stringify({ seq: event.seq, time: event.time, source: event.data.source }, null, 2));
});

const turnOneEnd = events.find((e) => e.type === 'turn/end')?.seq ?? Number.POSITIVE_INFINITY;
const turnOne = events.filter((e) => e.seq < turnOneEnd && ['user/message', 'system/message'].includes(e.type));
const combined = [`# Model input — turn 1, step 1 (reconstructed from the session log)`, ''];
combined.push('## 1. System prompt (system/message event, seq 7)', '', '```text', systemText, '```', '');
combined.push('## 2. User-role messages injected for turn 1 (in stored seq order)', '');
for (const event of turnOne.filter((e) => e.type === 'user/message').sort((a, b) => a.seq - b.seq)) {
  const kind = event.data?.source?.kind ?? 'user';
  const label = sectionLabel[kind] ?? (kind === 'user' ? 'User message' : kind);
  const text = textOf(event.data.content);
  combined.push(`### seq ${event.seq} — ${label} (source.kind: \`${kind}\`)`, '', '```text', text, '```', '');
}
combined.push('## 3. Tool schemas', '', `The ${tools.length} tool definitions travel in the API \`tools\` field, not in the prompt text: see \`tools.json\` and \`tools-summary.md\`.`, '');
writeFileSync(join(outDir, 'model-input-turn-1.md'), combined.join('\n'));

const sessionEvent = events.find((e) => e.type === 'session') ?? {};
const session = {
  id: sessionEvent.id,
  cwd: sessionEvent.cwd,
  agentPreset: sessionEvent.agentPreset,
  createdAt: sessionEvent.createdAt,
  formatVersion: sessionEvent.version,
};
const manifest = {
  generatedAt: new Date().toISOString(),
  session: {
    id: session.id,
    cwd: session.cwd,
    agentPreset: session.agentPreset,
    createdAt: session.createdAt,
    sourceFile: logFile,
  },
  request: {
    provider: header?.config?.provider,
    model: header?.config?.model,
    reasoningEffort: header?.config?.reasoningEffort,
    maxTokens: header?.config?.maxTokens,
    contextWindow: events.find((e) => e.type === 'request/context')?.data?.contextWindow,
    toolCount: tools.length,
  },
  counts: {
    events: events.length,
    systemMessages: systemEvents.length,
    contextInjections: Object.fromEntries(counts),
  },
  files: [
    ...readdirSync(outDir).map((name) => {
      const path = join(outDir, name);
      const stat = statSync(path);
      return stat.isFile()
        ? { name, bytes: stat.size, sha256: createHash('sha256').update(readFileSync(path)).digest('hex') }
        : { name, directory: true };
    }),
    ...readdirSync(contextDir).map((name) => {
      const path = join(contextDir, name);
      return { name: `context/${name}`, bytes: statSync(path).size, sha256: createHash('sha256').update(readFileSync(path)).digest('hex') };
    }),
  ],
};
writeFileSync(join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

console.log('session dir :', sessionDir);
console.log('log file    :', logFile);
console.log('events      :', events.length);
console.log('system      :', systemEvents.length);
console.log('tools       :', tools.length);
console.log('context     :', [...counts.entries()].map(([k, v]) => `${k} x${v}`).join(', '));
console.log('output      :', outDir);
