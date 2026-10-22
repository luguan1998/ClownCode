/**
 * inc-5046: fetch the official marketplace from a GCS mirror instead of
 * git-cloning GitHub on every startup.
 *
 * Backend (anthropic#317037) publishes a marketplace-only zip alongside the
 * titanium squashfs, keyed by base repo SHA. This module fetches the `latest`
 * pointer, compares against a local sentinel, and downloads+extracts the zip
 * when there's a new SHA. Callers decide fallback behavior on failure.
 */

import axios from 'axios'
import { chmod, mkdir, readFile, rename, rm, writeFile } from 'fs/promises'
import { dirname, join, resolve, sep } from 'path'
import { waitForScrollIdle } from '../../bootstrap/state.js'
import type { AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from '../../services/analytics/index.js'
import { logEvent } from '../../services/analytics/index.js'
import { logForDebugging } from '../debug.js'
import { parseZipModes, unzipFile } from '../dxt/zip.js'
import { errorMessage, getErrnoCode } from '../errors.js'

type SafeString = AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS

// CDN-fronted domain for the public GCS bucket (same bucket the native
// binary ships from — nativeInstaller/download.ts:24 uses the raw GCS URL).
// `{sha}.zip` is content-addressed so CDN can cache it indefinitely;
// `latest` has Cache-Control: max-age=300 so CDN staleness is bounded.
// Backend (anthropic#317037) populates this prefix.
const GCS_BASE =
  ''

// Zip arc paths are seed-dir-relative (marketplaces/claude-plugins-official/…)
// so the titanium seed machinery can use the same zip. Strip this prefix when
// extracting for a laptop install.
const ARC_PREFIX = 'marketplaces/claude-plugins-official/'

/**
 * Fetch the official marketplace from GCS and extract to installLocation.
 * Idempotent — checks a `.gcs-sha` sentinel before downloading the ~3.5MB zip.
 *
 * @param installLocation where to extract (must be inside marketplacesCacheDir)
 * @param marketplacesCacheDir the plugins marketplace cache root — passed in
 *   by callers (rather than imported from pluginDirectories) to break a
 *   circular-dep edge through marketplaceManager
 * @returns the fetched SHA on success (including no-op), null on any failure
 *   (network, 404, zip parse). Caller decides whether to fall through to git.
 */
export async function fetchOfficialMarketplaceFromGcs(
  _installLocation: string,
  _marketplacesCacheDir: string,
): Promise<string | null> {
  // OpenClaude: the official hosted marketplace was removed.
  return null
}

export function classifyGcsError(e: unknown): string {
  if (axios.isAxiosError(e)) {
    if (e.code === 'ECONNABORTED') return 'timeout'
    if (e.response) return `http_${e.response.status}`
    return 'network'
  }
  const code = getErrnoCode(e)
  // Node fs errno codes are E<UPPERCASE> (ENOSPC, EACCES). Axios also sets
  // .code (ERR_NETWORK, ERR_BAD_OPTION, EPROTO) — don't bucket those as fs.
  if (code && /^E[A-Z]+$/.test(code) && !code.startsWith('ERR_')) {
    return KNOWN_FS_CODES.has(code) ? `fs_${code}` : 'fs_other'
  }
  // fflate sets numeric .code (0-14) on inflate/unzip errors — catches
  // deflate-level corruption ("unexpected EOF", "invalid block type") that
  // the message regex misses.
  if (typeof (e as { code?: unknown })?.code === 'number') return 'zip_parse'
  const msg = errorMessage(e)
  if (/unzip|invalid zip|central directory/i.test(msg)) return 'zip_parse'
  if (/empty body/.test(msg)) return 'empty_latest'
  return 'other'
}
