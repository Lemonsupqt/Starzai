/**
 * Rate Limiting Middleware
 * Handles per-user and per-group rate limiting
 */

import { RATE_LIMIT_PER_MINUTE, TIER_COOLDOWNS, GROUP_ACTIVE_DURATION } from "../config/index.js";
import { getUserTier, isUserBanned, isUserMuted, isTrustedUser } from "../features/users.js";
import { isGroupChat, getUserId, getChatId } from "../utils/telegram.js";

// =====================
// Rate Limit State
// =====================

// Per-user rate limiting: userId -> { count, resetAt }
const userRateLimits = new Map();

// Per-user command cooldowns: `${userId}_${command}` -> lastUsedAt
const commandCooldowns = new Map();

// Group activity state: chatId -> { activeUntil, lastActivity }
const groupActivity = new Map();

// Spam detection: userId -> { lastMessage, count, lastWarning }
const spamDetection = new Map();

// =====================
// Rate Limit Functions
// =====================

/**
 * Check if user is rate limited
 */
export function isRateLimited(userId) {
  const id = String(userId);
  const now = Date.now();
  
  let limit = userRateLimits.get(id);
  
  // Reset if window expired
  if (!limit || now > limit.resetAt) {
    limit = { count: 0, resetAt: now + 60000 };
    userRateLimits.set(id, limit);
  }
  
  // Check limit
  if (limit.count >= RATE_LIMIT_PER_MINUTE) {
    return true;
  }
  
  // Increment count
  limit.count++;
  return false;
}

/**
 * Get remaining rate limit
 */
export function getRateLimitRemaining(userId) {
  const id = String(userId);
  const limit = userRateLimits.get(id);
  
  if (!limit || Date.now() > limit.resetAt) {
    return RATE_LIMIT_PER_MINUTE;
  }
  
  return Math.max(0, RATE_LIMIT_PER_MINUTE - limit.count);
}

/**
 * Check command cooldown
 */
export function isOnCooldown(userId, command) {
  const tier = getUserTier(userId);
  const cooldownMs = (TIER_COOLDOWNS[tier] || TIER_COOLDOWNS.free) * 1000;
  
  if (cooldownMs === 0) return false;
  
  const key = `${userId}_${command}`;
  const lastUsed = commandCooldowns.get(key);
  
  if (!lastUsed) return false;
  
  return (Date.now() - lastUsed) < cooldownMs;
}

/**
 * Get remaining cooldown time
 */
export function getCooldownRemaining(userId, command) {
  const tier = getUserTier(userId);
  const cooldownMs = (TIER_COOLDOWNS[tier] || TIER_COOLDOWNS.free) * 1000;
  
  const key = `${userId}_${command}`;
  const lastUsed = commandCooldowns.get(key);
  
  if (!lastUsed) return 0;
  
  const remaining = cooldownMs - (Date.now() - lastUsed);
  return Math.max(0, Math.ceil(remaining / 1000));
}

/**
 * Record command usage for cooldown
 */
export function recordCommandUsage(userId, command) {
  const key = `${userId}_${command}`;
  commandCooldowns.set(key, Date.now());
}

// =====================
// Group Activity
// =====================

/**
 * Check if group is active
 */
export function isGroupActive(chatId) {
  const id = String(chatId);
  const state = groupActivity.get(id);
  
  if (!state) return false;
  return Date.now() < state.activeUntil;
}

/**
 * Activate group
 */
export function activateGroup(chatId) {
  const id = String(chatId);
  groupActivity.set(id, {
    activeUntil: Date.now() + GROUP_ACTIVE_DURATION,
    lastActivity: Date.now()
  });
}

/**
 * Extend group activity (on reply)
 */
export function extendGroupActivity(chatId) {
  const id = String(chatId);
  const state = groupActivity.get(id);
  
  if (state && Date.now() < state.activeUntil) {
    state.activeUntil = Date.now() + GROUP_ACTIVE_DURATION;
    state.lastActivity = Date.now();
  }
}

/**
 * Deactivate group
 */
export function deactivateGroup(chatId) {
  const id = String(chatId);
  groupActivity.delete(id);
}

// =====================
// Spam Detection
// =====================

/**
 * Check for spam behavior
 */
export function checkSpam(userId, message) {
  const id = String(userId);
  
  // Trusted users skip spam check
  if (isTrustedUser(userId)) return { isSpam: false };
  
  const now = Date.now();
  let state = spamDetection.get(id);
  
  if (!state) {
    state = { lastMessage: '', count: 0, lastWarning: 0, windowStart: now };
    spamDetection.set(id, state);
  }
  
  // Reset window after 30 seconds
  if (now - state.windowStart > 30000) {
    state.count = 0;
    state.windowStart = now;
  }
  
  state.count++;
  
  // Check for repeated messages
  const isRepeated = message && state.lastMessage === message;
  state.lastMessage = message || '';
  
  // Spam thresholds
  const isSpam = state.count > 10 || (isRepeated && state.count > 3);
  
  // Rate limit warnings
  const shouldWarn = isSpam && (now - state.lastWarning > 60000);
  if (shouldWarn) {
    state.lastWarning = now;
  }
  
  return { isSpam, shouldWarn };
}

// =====================
// Access Control Middleware
// =====================

/**
 * Create access control middleware
 */
export function accessControlMiddleware() {
  return async (ctx, next) => {
    const userId = getUserId(ctx);
    
    // Check if banned
    if (isUserBanned(userId)) {
      // Silently ignore banned users
      return;
    }
    
    // Check if muted
    if (isUserMuted(userId)) {
      // Silently ignore muted users
      return;
    }
    
    // Check rate limit
    if (isRateLimited(userId)) {
      // Only respond occasionally to avoid spam
      const remaining = getRateLimitRemaining(userId);
      if (remaining === 0) {
        try {
          await ctx.reply("⏳ Rate limited. Please wait a moment.", { 
            reply_to_message_id: ctx.message?.message_id 
          });
        } catch {}
      }
      return;
    }
    
    // Check spam
    const messageText = ctx.message?.text || ctx.message?.caption || '';
    const { isSpam, shouldWarn } = checkSpam(userId, messageText);
    
    if (isSpam) {
      if (shouldWarn) {
        try {
          await ctx.reply("🚫 Please slow down. Excessive messages detected.");
        } catch {}
      }
      return;
    }
    
    await next();
  };
}

/**
 * Create group activity middleware
 */
export function groupActivityMiddleware() {
  return async (ctx, next) => {
    if (!isGroupChat(ctx)) {
      return next();
    }
    
    const chatId = getChatId(ctx);
    
    // Check if this is a reply to the bot
    const isReplyToBot = ctx.message?.reply_to_message?.from?.is_bot;
    if (isReplyToBot) {
      extendGroupActivity(chatId);
    }
    
    // Check if group is active
    if (!isGroupActive(chatId)) {
      // Only respond to commands when inactive
      if (!ctx.message?.text?.startsWith('/')) {
        return;
      }
    }
    
    await next();
  };
}
