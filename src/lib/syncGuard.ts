/**
 * Sync Guard Module
 * 
 * Enforces product philosophy at runtime, making it impossible to bypass
 * timing or intent constraints for sync operations.
 * 
 * CORE PHILOSOPHY:
 * - Local device data is always the source of truth
 * - Cloud is additive-only and never overwrites local state
 * - Sync is a convergence operation, not a live mirror
 * - Sync must feel calm, predictable, and boring
 * 
 * ALLOWED TRIGGERS (exhaustive):
 * 1. manual - User explicitly presses "Sync now"
 * 2. daily_auto - App foregrounded, auto-sync enabled, >24h since last sync
 * 
 * FORBIDDEN BEHAVIORS:
 * - Sync on every local CRUD operation
 * - Sync triggered by debounced state changes
 * - Sync loops caused by effects or listeners
 * - Background timers, polling, or scheduled workers
 * - "Helpful" retries that bypass timing constraints
 */

import { getSyncStatus } from './syncStatusManager';

// ============================================================================
// Types
// ============================================================================

export type SyncTrigger = 'manual' | 'daily_auto' | 'recovery_upload' | 'recovery_download';

export interface SyncGuardResult {
  allowed: boolean;
  reason: string;
  trigger: SyncTrigger;
}

export interface SyncAttempt {
  trigger: SyncTrigger;
  timestamp: number;
  allowed: boolean;
  reason: string;
}

// ============================================================================
// Constants
// ============================================================================

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
const RAPID_CALL_THRESHOLD_MS = 500; // Detect effect loops
const IS_DEVELOPMENT = import.meta.env.DEV;

// ============================================================================
// State - In-memory guards for current session
// ============================================================================

let lastSyncAttemptTime: number | null = null;
let syncInProgress = false;
let dailySyncAttemptedThisSession = false;

// Track recent attempts for loop detection
const recentAttempts: SyncAttempt[] = [];
const MAX_RECENT_ATTEMPTS = 10;

// ============================================================================
// Guard Violation Error
// ============================================================================

export class SyncGuardViolation extends Error {
  constructor(
    message: string,
    public trigger: SyncTrigger,
    public reason: string
  ) {
    super(`[SyncGuard Violation] ${message}`);
    this.name = 'SyncGuardViolation';
  }
}

// ============================================================================
// Core Guard Functions
// ============================================================================

/**
 * Records a sync attempt for debugging and loop detection
 */
function recordAttempt(attempt: SyncAttempt): void {
  recentAttempts.push(attempt);
  if (recentAttempts.length > MAX_RECENT_ATTEMPTS) {
    recentAttempts.shift();
  }
}

/**
 * Detects rapid repeated calls that indicate effect loops or bugs
 */
function detectRapidCalls(): boolean {
  if (recentAttempts.length < 3) return false;
  
  const now = Date.now();
  const recentCount = recentAttempts.filter(
    a => now - a.timestamp < 2000 // 3+ calls in 2 seconds
  ).length;
  
  return recentCount >= 3;
}

/**
 * Validates whether a daily auto-sync is allowed based on timing constraints
 */
function validateDailyAutoSync(): SyncGuardResult {
  const status = getSyncStatus();
  
  // First-time sync is always allowed
  if (!status.lastSyncAt) {
    return {
      allowed: true,
      reason: 'First-time sync - no previous sync recorded',
      trigger: 'daily_auto'
    };
  }
  
  const timeSinceLastSync = Date.now() - status.lastSyncAt;
  
  // Enforce 24-hour minimum
  if (timeSinceLastSync < TWENTY_FOUR_HOURS_MS) {
    const hoursRemaining = Math.ceil((TWENTY_FOUR_HOURS_MS - timeSinceLastSync) / (60 * 60 * 1000));
    return {
      allowed: false,
      reason: `Daily sync blocked - last sync was ${Math.floor(timeSinceLastSync / (60 * 60 * 1000))}h ago. Next allowed in ~${hoursRemaining}h`,
      trigger: 'daily_auto'
    };
  }
  
  // Only one daily auto-sync attempt per session
  if (dailySyncAttemptedThisSession) {
    return {
      allowed: false,
      reason: 'Daily auto-sync already attempted this session',
      trigger: 'daily_auto'
    };
  }
  
  return {
    allowed: true,
    reason: `Daily sync allowed - ${Math.floor(timeSinceLastSync / (60 * 60 * 1000))}h since last sync`,
    trigger: 'daily_auto'
  };
}

/**
 * Main guard function - MUST be called before any sync operation
 * 
 * @param trigger - The type of sync being attempted
 * @throws SyncGuardViolation in development if guard is violated
 * @returns SyncGuardResult indicating whether sync should proceed
 */
export function validateSyncAttempt(trigger: SyncTrigger): SyncGuardResult {
  const now = Date.now();
  
  // ─────────────────────────────────────────────────────────────────────────
  // Guard 1: Prevent concurrent syncs
  // ─────────────────────────────────────────────────────────────────────────
  if (syncInProgress) {
    const result: SyncGuardResult = {
      allowed: false,
      reason: 'Sync already in progress - concurrent execution blocked',
      trigger
    };
    recordAttempt({ ...result, timestamp: now });
    handleViolation(result);
    return result;
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // Guard 2: Detect rapid calls (effect loops, bugs)
  // ─────────────────────────────────────────────────────────────────────────
  if (lastSyncAttemptTime && (now - lastSyncAttemptTime) < RAPID_CALL_THRESHOLD_MS) {
    // Allow rapid manual presses (user hammering button is okay)
    if (trigger !== 'manual') {
      const result: SyncGuardResult = {
        allowed: false,
        reason: `Rapid sync calls detected (${now - lastSyncAttemptTime}ms since last) - possible effect loop`,
        trigger
      };
      recordAttempt({ ...result, timestamp: now });
      handleViolation(result);
      return result;
    }
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // Guard 3: Detect sync loops
  // ─────────────────────────────────────────────────────────────────────────
  if (detectRapidCalls() && trigger !== 'manual') {
    const result: SyncGuardResult = {
      allowed: false,
      reason: 'Sync loop detected - 3+ non-manual calls in 2 seconds',
      trigger
    };
    recordAttempt({ ...result, timestamp: now });
    handleViolation(result);
    return result;
  }
  
  lastSyncAttemptTime = now;
  
  // ─────────────────────────────────────────────────────────────────────────
  // Guard 4: Trigger-specific validation
  // ─────────────────────────────────────────────────────────────────────────
  let result: SyncGuardResult;
  
  switch (trigger) {
    case 'manual':
      // Manual sync is always allowed
      result = {
        allowed: true,
        reason: 'Manual sync - user explicitly requested',
        trigger
      };
      break;
      
    case 'daily_auto':
      result = validateDailyAutoSync();
      break;
      
    case 'recovery_upload':
    case 'recovery_download':
      // Recovery tools are always allowed (user explicitly opened hidden menu)
      result = {
        allowed: true,
        reason: `Recovery action - ${trigger} explicitly invoked`,
        trigger
      };
      break;
      
    default:
      // Unknown trigger - this should never happen
      result = {
        allowed: false,
        reason: `Unknown sync trigger: ${trigger}`,
        trigger
      };
      handleViolation(result);
  }
  
  recordAttempt({ ...result, timestamp: now });
  
  if (!result.allowed) {
    handleViolation(result);
  }
  
  return result;
}

/**
 * Handle guard violations - throws in dev, logs in prod
 */
function handleViolation(result: SyncGuardResult): void {
  const message = `Sync blocked [${result.trigger}]: ${result.reason}`;
  
  if (IS_DEVELOPMENT) {
    // In development: throw to make violations impossible to ignore
    throw new SyncGuardViolation(message, result.trigger, result.reason);
  } else {
    // In production: log warning but never crash
    console.warn(`[SyncGuard] ${message}`);
  }
}

// ============================================================================
// Lifecycle Markers - Called by sync functions to track state
// ============================================================================

/**
 * Mark sync as started - must be called at sync function entry
 */
export function markSyncStarted(trigger: SyncTrigger): void {
  syncInProgress = true;
  
  if (trigger === 'daily_auto') {
    dailySyncAttemptedThisSession = true;
  }
  
  console.log(`[SyncGuard] Sync started [${trigger}]`);
}

/**
 * Mark sync as completed - must be called at sync function exit (success or failure)
 */
export function markSyncCompleted(trigger: SyncTrigger, success: boolean): void {
  syncInProgress = false;
  console.log(`[SyncGuard] Sync completed [${trigger}] - ${success ? 'success' : 'failed'}`);
}

/**
 * Reset session state - for testing or when user signs out
 */
export function resetSyncGuardState(): void {
  lastSyncAttemptTime = null;
  syncInProgress = false;
  dailySyncAttemptedThisSession = false;
  recentAttempts.length = 0;
  console.log('[SyncGuard] State reset');
}

// ============================================================================
// Debugging Utilities
// ============================================================================

/**
 * Get recent sync attempts for debugging
 */
export function getRecentSyncAttempts(): readonly SyncAttempt[] {
  return [...recentAttempts];
}

/**
 * Get current guard state for debugging
 */
export function getSyncGuardState(): {
  syncInProgress: boolean;
  dailySyncAttemptedThisSession: boolean;
  lastSyncAttemptTime: number | null;
  recentAttemptsCount: number;
} {
  return {
    syncInProgress,
    dailySyncAttemptedThisSession,
    lastSyncAttemptTime,
    recentAttemptsCount: recentAttempts.length
  };
}
