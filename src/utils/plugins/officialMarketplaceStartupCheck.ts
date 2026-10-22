/**
 * Auto-install logic for the official Anthropic marketplace.
 *
 * This module handles automatically installing the official marketplace
 * on startup for new users, with appropriate checks for:
 * - Enterprise policy restrictions
 * - Git availability
 * - Previous installation attempts
 */

import { join } from 'path'
import { getFeatureValue_CACHED_MAY_BE_STALE } from '../../services/analytics/growthbook.js'
import { logEvent } from '../../services/analytics/index.js'
import { getGlobalConfig, saveGlobalConfig } from '../config.js'
import { logForDebugging } from '../debug.js'
import { isEnvTruthy } from '../envUtils.js'
import { toError } from '../errors.js'
import { logError } from '../log.js'
import { checkGitAvailable, markGitUnavailable } from './gitAvailability.js'
import { isSourceAllowedByPolicy } from './marketplaceHelpers.js'
import {
  addMarketplaceSource,
  getMarketplacesCacheDir,
  loadKnownMarketplacesConfig,
  saveKnownMarketplacesConfig,
} from './marketplaceManager.js'
import {
  OFFICIAL_MARKETPLACE_NAME,
  OFFICIAL_MARKETPLACE_SOURCE,
} from './officialMarketplace.js'
import { fetchOfficialMarketplaceFromGcs } from './officialMarketplaceGcs.js'

/**
 * Reason why the official marketplace was not installed
 */
export type OfficialMarketplaceSkipReason =
  | 'already_attempted'
  | 'already_installed'
  | 'policy_blocked'
  | 'git_unavailable'
  | 'gcs_unavailable'
  | 'unknown'

/**
 * Check if official marketplace auto-install is disabled via environment variable.
 */
export function isOfficialMarketplaceAutoInstallDisabled(): boolean {
  return isEnvTruthy(
    process.env.CLAUDE_CODE_DISABLE_OFFICIAL_MARKETPLACE_AUTOINSTALL,
  )
}

/**
 * Configuration for retry logic
 */
export const RETRY_CONFIG = {
  MAX_ATTEMPTS: 10,
  INITIAL_DELAY_MS: 60 * 60 * 1000, // 1 hour
  BACKOFF_MULTIPLIER: 2,
  MAX_DELAY_MS: 7 * 24 * 60 * 60 * 1000, // 1 week
}

/**
 * Calculate next retry delay using exponential backoff
 */
function calculateNextRetryDelay(retryCount: number): number {
  const delay =
    RETRY_CONFIG.INITIAL_DELAY_MS *
    Math.pow(RETRY_CONFIG.BACKOFF_MULTIPLIER, retryCount)
  return Math.min(delay, RETRY_CONFIG.MAX_DELAY_MS)
}

/**
 * Determine if installation should be retried based on failure reason and retry state
 */
function shouldRetryInstallation(
  config: ReturnType<typeof getGlobalConfig>,
): boolean {
  // If never attempted, should try
  if (!config.officialMarketplaceAutoInstallAttempted) {
    return true
  }

  // If already installed successfully, don't retry
  if (config.officialMarketplaceAutoInstalled) {
    return false
  }

  const failReason = config.officialMarketplaceAutoInstallFailReason
  const retryCount = config.officialMarketplaceAutoInstallRetryCount || 0
  const nextRetryTime = config.officialMarketplaceAutoInstallNextRetryTime
  const now = Date.now()

  // Check if we've exceeded max attempts
  if (retryCount >= RETRY_CONFIG.MAX_ATTEMPTS) {
    return false
  }

  // Permanent failures - don't retry
  if (failReason === 'policy_blocked') {
    return false
  }

  // Check if enough time has passed for next retry
  if (nextRetryTime && now < nextRetryTime) {
    return false
  }

  // Retry for temporary failures (unknown), semi-permanent (git_unavailable),
  // and legacy state (undefined failReason from before retry logic existed)
  return (
    failReason === 'unknown' ||
    failReason === 'git_unavailable' ||
    failReason === 'gcs_unavailable' ||
    failReason === undefined
  )
}

/**
 * Result of the auto-install check
 */
export type OfficialMarketplaceCheckResult = {
  /** Whether the marketplace was successfully installed */
  installed: boolean
  /** Whether the installation was skipped (and why) */
  skipped: boolean
  /** Reason for skipping, if applicable */
  reason?: OfficialMarketplaceSkipReason
  /** Whether saving retry metadata to config failed */
  configSaveFailed?: boolean
}

/**
 * Check and install the official marketplace on startup.
 *
 * This function is designed to be called as a fire-and-forget operation
 * during startup. It will:
 * 1. Check if installation was already attempted
 * 2. Check if marketplace is already installed
 * 3. Check enterprise policy restrictions
 * 4. Check git availability
 * 5. Attempt installation
 * 6. Record the result in GlobalConfig
 *
 * @returns Result indicating whether installation succeeded or was skipped
 */
export async function checkAndInstallOfficialMarketplace(): Promise<OfficialMarketplaceCheckResult> {
  // OpenClaude: the official GitHub marketplace is not auto-installed.
  return { installed: false, skipped: true, reason: 'policy_blocked' }
}
