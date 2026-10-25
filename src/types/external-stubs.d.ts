/**
 * Ambient declarations for external modules that scripts/build.ts replaces
 * with no-op stubs at bundle time (native addons, first-party internal
 * packages, and optional cloud SDKs that are never bundled in this build).
 * These declarations mirror the build-time stubs so `tsc --noEmit` sees the
 * same shapes the shipped binary gets.
 */

// — First-party internal packages (not published, stubbed at build) —
declare module '@ant/computer-use-mcp' {
  export const BROWSER_TOOLS: unknown[]
  export const getMcpConfigForManifest: () => unknown
  export const API_RESIZE_PARAMS: unknown
  export function targetImageSize(
    width: number,
    height: number,
    params: unknown,
  ): [number, number]
  export function buildComputerUseTools(...args: unknown[]): any
  export function createComputerUseMcpServer(...args: unknown[]): any
  export function bindSessionContext(...args: unknown[]): any
  export const DEFAULT_GRANT_FLAGS: any
  export type ComputerExecutor = any
  export type ComputerUseSessionContext = any
  export type CuCallToolResult = any
  export type CuPermissionRequest = any
  export type CuPermissionResponse = any
  export type ScreenshotDims = any
  export type ResolvePrepareCaptureResult = any
  export type ScreenshotResult = any
  export type DisplayGeometry = {
    width: number
    height: number
    scaleFactor: number
  }
  export type FrontmostApp = { bundleId: string; displayName: string }
  export type InstalledApp = {
    bundleId: string
    displayName: string
    path?: string
    iconDataUrl?: string
  }
  export type RunningApp = { bundleId: string; displayName?: string }
  const _default: unknown
  export default _default
}
declare module '@ant/computer-use-mcp/types' {
  export type ComputerUseTool = unknown
  export type CoordinateMode = 'pixels' | 'normalized'
  export type CuSubGates = {
    pixelValidation: boolean
    clipboardPasteMultiline: boolean
    mouseAnimation: boolean
    hideBeforeAction: boolean
    autoTargetDisplay: boolean
    clipboardGuard: boolean
  }
  export type ComputerUseHostAdapter = any
  export type Logger = {
    silly(message: string, ...args: unknown[]): void
    debug(message: string, ...args: unknown[]): void
    info(message: string, ...args: unknown[]): void
    warn(message: string, ...args: unknown[]): void
    error(message: string, ...args: unknown[]): void
  }
  export type CuPermissionRequest = any
  export type CuPermissionResponse = any
  export const DEFAULT_GRANT_FLAGS: any
}
declare module '@ant/computer-use-mcp/sentinelApps' {
  export const sentinelApps: unknown[]
  export function getSentinelCategory(...args: unknown[]): any
}
declare module '@ant/computer-use-swift' {
  export type ComputerUseAPI = any
  const _default: unknown
  export default _default
}
declare module '@ant/computer-use-input' {
  export type ComputerUseInputAPI = {
    isSupported: boolean
    keys(keys: string[]): Promise<void>
    key(key: string, action: 'press' | 'release'): Promise<void>
    typeText(text: string): Promise<void>
    mouseButton(
      button: 'left' | 'right' | 'middle',
      action: 'click' | 'press' | 'release',
      count?: number,
    ): Promise<void>
    moveMouse(x: number, y: number, animated: boolean): Promise<void>
    mouseScroll(amount: number, axis: 'vertical' | 'horizontal'): Promise<void>
    mouseLocation(): { x: number; y: number }
    getFrontmostAppInfo(): { bundleId?: string; appName?: string } | null
  }
  export type ComputerUseInput = ComputerUseInputAPI
  const _default: unknown
  export default _default
}
declare module '@ant/claude-for-chrome-mcp' {
  export const createClaudeForChromeMcpServer: () => unknown
}
declare module '@anthropic-ai/mcpb' {
  /** One `manifest.user_config` entry — not installed here, so only the
   *  fields this repo reads are declared. */
  export type McpbUserConfigurationOption = {
    type: 'string' | 'number' | 'boolean' | 'directory' | 'file'
    title: string
    description: string
    required?: boolean
    default?: string | number | boolean | string[]
    multiple?: boolean
    sensitive?: boolean
    min?: number
    max?: number
  }

  export type McpbManifest = {
    name: string
    version: string
    author: { name: string; email?: string; url?: string }
    description?: string
    server?: Record<string, unknown>
    user_config?: Record<string, McpbUserConfigurationOption>
    [key: string]: unknown
  }

  export const McpbManifestSchema: {
    safeParse(data: unknown):
      | { success: true; data: McpbManifest }
      | {
          success: false
          error: {
            flatten(): {
              fieldErrors: Record<string, string[] | undefined>
              formErrors: string[]
            }
          }
        }
  }

  export function getMcpConfigForManifest(options: {
    manifest: McpbManifest
    extensionPath: string
    systemDirs?: unknown
    userConfig?: Record<string, string | number | boolean | string[]>
    pathSeparator?: string
  }): Promise<Record<string, unknown> | null>

  const _default: unknown
  export default _default
}

// — Native addons (optional platform binaries, stubbed at build) —
declare module 'image-processor-napi' {
  /** The real addon re-exports a sharp-compatible factory. Both this and the
   *  default export can be undefined at runtime — the build stub is a no-op. */
  export const sharp: unknown
  const _default: unknown
  export default _default
}
declare module 'audio-capture-napi' {
  export function isNativeAudioAvailable(): boolean
  export function isNativeRecordingActive(): boolean
  export function startNativeRecording(
    onData: (data: Buffer) => void,
    onEnd: () => void,
  ): boolean
  export function stopNativeRecording(): void
  const _default: unknown
  export default _default
}
declare module 'audio-capture.node' {
  const _default: unknown
  export default _default
}
declare module 'modifiers-napi' {
  const _default: unknown
  export default _default
}
declare module 'url-handler-napi' {
  /** Blocks up to `timeoutMs` waiting for the OS to deliver a URL; returns
   *  null when none arrives (or when the addon is stubbed out). */
  export function waitForUrlEvent(_timeoutMs: number): string | null
  const _default: unknown
  export default _default
}
declare module 'color-diff-napi' {
  export const ColorDiff: unknown
  export const ColorFile: unknown
  export const getSyntaxTheme: () => unknown
}

// — Optional native tooling libs (stubbed at build) —
declare module 'asciichart' {
  export const plot: (
    series: number[] | number[][],
    options?: {
      height?: number
      colors?: string[]
      format?: (x: number) => string
    },
  ) => string
}
declare module 'plist' {
  export const parse: (s: string) => Record<string, unknown>
  export const build: (o: unknown) => string
}
declare module 'cacache' {
  export const get: (..._args: unknown[]) => Promise<unknown>
  export const put: (..._args: unknown[]) => Promise<void>
  export const ls: {
    stream(_path: string): AsyncIterable<{ key: string; time: number }>
  }
  export const rm: {
    entry(_path: string, _key: string): Promise<void>
  }
}

// — Cloud provider SDKs (never bundled; auth paths are dead in this build) —
declare module '@aws-sdk/client-bedrock' {
  export type BedrockClientConfig = {
    region?: string
    endpoint?: string
    credentials?: {
      accessKeyId: string
      secretAccessKey: string
      sessionToken?: string
    }
    requestHandler?: unknown
    httpAuthSchemes?: unknown[]
    httpAuthSchemeProvider?: () => unknown[]
    [key: string]: unknown
  }
  export class BedrockClient {
    constructor(config: BedrockClientConfig)
    send(_command: unknown): Promise<any>
  }
  export class ListInferenceProfilesCommand {
    constructor(_input: unknown)
  }
  export type InferenceProfileSummary = {
    inferenceProfileId?: string
    name?: string
    description?: string
    modelId?: string
  }
  export class GetInferenceProfileCommand {
    constructor(_input: unknown)
  }
}
declare module '@aws-sdk/client-bedrock-runtime' {
  export type CountTokensCommandInput = {
    modelId: string
    input: {
      invokeModel: { body: Uint8Array }
    }
  }
  export type BedrockRuntimeClientConfig = {
    region?: string
    endpoint?: string
    credentials?: {
      accessKeyId: string
      secretAccessKey: string
      sessionToken?: string
    }
    requestHandler?: unknown
    httpAuthSchemes?: unknown[]
    httpAuthSchemeProvider?: () => unknown[]
    [key: string]: unknown
  }
  export class BedrockRuntimeClient {
    constructor(config: BedrockRuntimeClientConfig)
    send(_command: unknown): Promise<any>
  }
  export class CountTokensCommand {
    constructor(_input: CountTokensCommandInput)
  }
}
declare module '@aws-sdk/client-sts' {
  export class STSClient {
    constructor(..._args: unknown[])
    send(..._args: unknown[]): Promise<unknown>
  }
  export class GetCallerIdentityCommand {
    constructor(_input: unknown)
  }
}
declare module '@aws-sdk/credential-providers' {
  export const fromNodeProviderChain: () => unknown
  export const fromIni: (
    _options?: { ignoreCache?: boolean },
  ) => () => Promise<unknown>
}
declare module '@azure/identity' {
  export class DefaultAzureCredential {
    getToken(): Promise<unknown>
  }
}

// — OpenTelemetry exporters not installed as dependencies (kept external at
//   build; only the base exporters in package.json resolve) —
declare module '@opentelemetry/exporter-trace-otlp-proto' {
  export const OTLPTraceExporter: new (..._args: unknown[]) => any
}
declare module '@opentelemetry/exporter-logs-otlp-proto' {
  export const OTLPLogExporter: new (..._args: unknown[]) => any
}
declare module '@opentelemetry/exporter-logs-otlp-grpc' {
  export const OTLPLogExporter: new (..._args: unknown[]) => any
}
declare module '@opentelemetry/exporter-metrics-otlp-proto' {
  export const OTLPMetricExporter: new (..._args: unknown[]) => any
}
declare module '@opentelemetry/exporter-metrics-otlp-http' {
  export const OTLPMetricExporter: new (..._args: unknown[]) => any
}
declare module '@opentelemetry/exporter-metrics-otlp-grpc' {
  export const OTLPMetricExporter: new (..._args: unknown[]) => any
}
declare module '@opentelemetry/exporter-prometheus' {
  export const PrometheusExporter: new (..._args: unknown[]) => any
}

// — Upstream SDK package referenced by print mode types only —
declare module '@anthropic-ai/claude-agent-sdk' {
  export type PermissionMode = string
}

declare module '@opentelemetry/exporter-trace-otlp-http' {
  export const OTLPTraceExporter: new (..._args: unknown[]) => any
}
