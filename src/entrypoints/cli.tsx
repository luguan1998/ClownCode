import { validateProviderEnvForStartupOrExit } from '../utils/providerValidation.js'

// OpenClaude: polyfill globalThis.File for Node < 20.
// undici v7 references `File` at module evaluation time (webidl type
// assertions). Node 18 lacks the global, causing a ReferenceError inside
// the bundled __commonJS require chain which deadlocks the process when a
// proxy is configured (configureGlobalAgents → require_undici).
// eslint-disable-next-line custom-rules/no-top-level-side-effects
if (typeof globalThis.File === 'undefined') {
  try {
    // Node 18.13+ exposes File in node:buffer but not as a global.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { File: NodeFile } = require('node:buffer')
    globalThis.File = NodeFile
  } catch {
    // Absolute fallback: stub so `MakeTypeAssertion(File)` doesn't throw.
    // @ts-expect-error -- minimal polyfill
    globalThis.File = class File extends Blob {
      name: string
      lastModified: number
      constructor(parts: BlobPart[], name: string, opts?: FilePropertyBag) {
        super(parts, opts)
        this.name = name
        this.lastModified = opts?.lastModified ?? Date.now()
      }
    }
  }
}

// OpenClaude: disable experimental API betas by default.
// Tool search (defer_loading), global cache scope, and context management
// require internal API support not available to external accounts → 500.
// Users can opt-in with CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS=false.
// eslint-disable-next-line custom-rules/no-top-level-side-effects
process.env.CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS ??= 'true'

// Bugfix for corepack auto-pinning, which adds yarnpkg to peoples' package.jsons
// eslint-disable-next-line custom-rules/no-top-level-side-effects
process.env.COREPACK_ENABLE_AUTO_PIN = '0';

// Set max heap size for child processes in CCR environments (containers have 16GB)
// eslint-disable-next-line custom-rules/no-top-level-side-effects, custom-rules/no-process-env-top-level, custom-rules/safe-env-boolean-check
if (process.env.CLAUDE_CODE_REMOTE === 'true') {
  // eslint-disable-next-line custom-rules/no-top-level-side-effects, custom-rules/no-process-env-top-level
  const existing = process.env.NODE_OPTIONS || '';
  // eslint-disable-next-line custom-rules/no-top-level-side-effects, custom-rules/no-process-env-top-level
  process.env.NODE_OPTIONS = existing ? `${existing} --max-old-space-size=8192` : '--max-old-space-size=8192';
}

// Harness-science L0 ablation baseline. Inlined here (not init.ts) because
// BashTool/AgentTool/PowerShellTool capture DISABLE_BACKGROUND_TASKS into
// module-level consts at import time — init() runs too late. feature() gate
// DCEs this entire block from external builds.
// eslint-disable-next-line custom-rules/no-top-level-side-effects, custom-rules/no-process-env-top-level
if (false && process.env.CLAUDE_CODE_ABLATION_BASELINE) {
  for (const k of ['CLAUDE_CODE_SIMPLE', 'CLAUDE_CODE_DISABLE_THINKING', 'DISABLE_INTERLEAVED_THINKING', 'DISABLE_COMPACT', 'DISABLE_AUTO_COMPACT', 'CLAUDE_CODE_DISABLE_AUTO_MEMORY', 'CLAUDE_CODE_DISABLE_BACKGROUND_TASKS']) {
    // eslint-disable-next-line custom-rules/no-top-level-side-effects, custom-rules/no-process-env-top-level
    process.env[k] ??= '1';
  }
}

/**
 * Bootstrap entrypoint - checks for special flags before loading the full CLI.
 * All imports are dynamic to minimize module evaluation for fast paths.
 * Fast-path for --version has zero imports beyond this file.
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // Fast-path for --version/-v: zero module loading needed
  if (args.length === 1 && (args[0] === '--version' || args[0] === '-v' || args[0] === '-V')) {
    // MACRO.VERSION is inlined at build time
    // biome-ignore lint/suspicious/noConsole:: intentional console output
    console.log(`${MACRO.DISPLAY_VERSION ?? MACRO.VERSION} (OpenClaude)`);
    return;
  }

  // Enable configs first so we can read settings
  {
    const { enableConfigs } = await import('../utils/config.js')
    enableConfigs()
  }

  // Apply settings.env. OpenClaude is configured exclusively through
  // settings.json env (ANTHROPIC_BASE_URL / OPENAI_BASE_URL, API keys, model).
  {
    const { applySafeConfigEnvironmentVariables } = await import('../utils/managedEnv.js')
    applySafeConfigEnvironmentVariables()
  }

  await validateProviderEnvForStartupOrExit()

  // Parse --model early so the startup screen can display the override
  const { eagerParseCliFlag } = await import('../utils/cliArgs.js')
  const earlyModelFlag = eagerParseCliFlag('--model')

  // Print the gradient startup screen before the Ink UI loads
  const { printStartupScreen } = await import('../components/StartupScreen.js')
  printStartupScreen(earlyModelFlag)

  // For all other paths, load the startup profiler
  const {
    profileCheckpoint
  } = await import('../utils/startupProfiler.js');
  profileCheckpoint('cli_entry');

  // Fast-path for --dump-system-prompt: output the rendered system prompt and exit.
  // Used by prompt sensitivity evals to extract the system prompt at a specific commit.
  // Ant-only: eliminated from external builds via feature flag.
  if (true && args[0] === '--dump-system-prompt') {
    profileCheckpoint('cli_dump_system_prompt_path');
    const {
      enableConfigs
    } = await import('../utils/config.js');
    enableConfigs();
    const {
      getMainLoopModel
    } = await import('../utils/model/model.js');
    const modelIdx = args.indexOf('--model');
    const model = modelIdx !== -1 && args[modelIdx + 1] || getMainLoopModel();
    const {
      getSystemPrompt
    } = await import('../constants/prompts.js');
    const prompt = await getSystemPrompt([], model);
    // biome-ignore lint/suspicious/noConsole:: intentional console output
    console.log(prompt.join('\n'));
    return;
  }

  // Fast-path for `--daemon-worker=<kind>` (internal — supervisor spawns this).
  // Must come before the daemon subcommand check: spawned per-worker, so
  // perf-sensitive. No enableConfigs(), no analytics sinks at this layer —
  // workers are lean. If a worker kind needs configs/auth (assistant will),
  // it calls them inside its run() fn.

  // Fast-path for `claude remote-control` (also accepts legacy `claude remote` / `claude sync` / `claude bridge`):
  // serve local machine as bridge environment.
  // feature() must stay inline for build-time dead code elimination;
  // isBridgeEnabled() checks the runtime GrowthBook gate.

  // Fast-path for `claude daemon [subcommand]`: long-running supervisor.

  // Fast-path for `claude ps|logs|attach|kill` and `--bg`/`--background`.
  // Session management against the ~/.claude/sessions/ registry. Flag
  // literals are inlined so bg.js only loads when actually dispatching.

  // Fast-path for template job commands.

  // Fast-path for `claude environment-runner`: headless BYOC runner.
  // feature() must stay inline for build-time dead code elimination.

  // Fast-path for `claude self-hosted-runner`: headless self-hosted-runner
  // targeting the SelfHostedRunnerWorkerService API (register + poll; poll IS
  // heartbeat). feature() must stay inline for build-time dead code elimination.

  // Fast-path for --worktree --tmux: exec into tmux before loading full CLI
  const hasTmuxFlag = args.includes('--tmux') || args.includes('--tmux=classic');
  if (hasTmuxFlag && (args.includes('-w') || args.includes('--worktree') || args.some(a => a.startsWith('--worktree=')))) {
    profileCheckpoint('cli_tmux_worktree_fast_path');
    const {
      enableConfigs
    } = await import('../utils/config.js');
    enableConfigs();
    const {
      isWorktreeModeEnabled
    } = await import('../utils/worktreeModeEnabled.js');
    if (isWorktreeModeEnabled()) {
      const {
        execIntoTmuxWorktree
      } = await import('../utils/worktree.js');
      const result = await execIntoTmuxWorktree(args);
      if (result.handled) {
        return;
      }
      // If not handled (e.g., error), fall through to normal CLI
      if (result.error) {
        const {
          exitWithError
        } = await import('../utils/process.js');
        exitWithError(result.error);
      }
    }
  }

  // Redirect common update flag mistakes to the update subcommand
  if (args.length === 1 && (args[0] === '--update' || args[0] === '--upgrade')) {
    process.argv = [process.argv[0]!, process.argv[1]!, 'update'];
  }

  // --bare: set SIMPLE early so gates fire during module eval / commander
  // option building (not just inside the action handler).
  if (args.includes('--bare')) {
    process.env.CLAUDE_CODE_SIMPLE = '1';
  }

  // No special flags detected, load and run the full CLI
  if (process.env.OPENCLAUDE_DISABLE_EARLY_INPUT !== '1') {
    const {
      startCapturingEarlyInput
    } = await import('../utils/earlyInput.js');
    startCapturingEarlyInput();
  }
  profileCheckpoint('cli_before_main_import');
  const {
    main: cliMain
  } = await import('../main.js');
  profileCheckpoint('cli_after_main_import');
  await cliMain();
  profileCheckpoint('cli_after_main_complete');
}

// eslint-disable-next-line custom-rules/no-top-level-side-effects
void main();
