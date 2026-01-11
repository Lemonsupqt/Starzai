/**
 * User Management Module
 * Handles user registration, tiers, and access control
 */

import { 
  OWNER_IDS, 
  DEFAULT_FREE_MODEL, 
  DEFAULT_PREMIUM_MODEL, 
  DEFAULT_ULTRA_MODEL,
  allModelsForTier 
} from "../config/index.js";
import { usersDb, saveUsers } from "../database/manager.js";

// =====================
// User Record Management
// =====================

/**
 * Get a user record by ID
 */
export function getUserRecord(userId) {
  return usersDb.users[String(userId)] || null;
}

/**
 * Ensure a user exists and return their record
 */
export function ensureUser(userId, from = null) {
  const id = String(userId);
  const isOwnerUser = OWNER_IDS.has(id);
  
  if (!usersDb.users[id]) {
    // New user - auto-grant ultra to owners
    const defaultTier = isOwnerUser ? "ultra" : "free";
    const defaultModel = isOwnerUser 
      ? (DEFAULT_ULTRA_MODEL || DEFAULT_PREMIUM_MODEL || DEFAULT_FREE_MODEL) 
      : DEFAULT_FREE_MODEL;
    
    usersDb.users[id] = {
      registeredAt: new Date().toISOString(),
      username: from?.username || null,
      firstName: from?.first_name || null,
      role: defaultTier,
      tier: defaultTier,
      model: defaultModel,
      allowedModels: [],
      banned: false,
      stats: {
        totalMessages: 0,
        totalInlineQueries: 0,
        totalTokensUsed: 0,
        lastActive: new Date().toISOString(),
        lastModel: defaultModel,
      },
      savedCharacters: [],
      activeCharacter: null,
      webSearch: false,
      webSearchUsage: {
        date: new Date().toISOString().slice(0, 10),
        used: 0,
      },
      warnings: [],
      imagePrefs: {
        defaultRatio: "1:1",
        steps: 8,
        safeMode: true,
      },
    };
    saveUsers();
  } else {
    // Existing user - upgrade owners to ultra if not already
    if (isOwnerUser && usersDb.users[id].tier !== "ultra") {
      usersDb.users[id].tier = "ultra";
      usersDb.users[id].role = "ultra";
      saveUsers();
    }
    
    // Migrations for existing users
    migrateUserRecord(usersDb.users[id], from);
  }
  
  return usersDb.users[id];
}

/**
 * Migrate user record to latest schema
 */
function migrateUserRecord(user, from = null) {
  let needsSave = false;
  
  if (!user.tier) {
    user.tier = user.role || "free";
    needsSave = true;
  }
  if (!user.model) {
    user.model = DEFAULT_FREE_MODEL;
    needsSave = true;
  }
  if (!user.stats) {
    user.stats = {
      totalMessages: 0,
      totalInlineQueries: 0,
      totalTokensUsed: 0,
      lastActive: user.registeredAt || new Date().toISOString(),
      lastModel: user.model,
    };
    needsSave = true;
  }
  if (from?.username) {
    user.username = from.username;
    needsSave = true;
  }
  if (from?.first_name) {
    user.firstName = from.first_name;
    needsSave = true;
  }
  if (!user.savedCharacters) {
    user.savedCharacters = [];
    needsSave = true;
  }
  if (user.activeCharacter === undefined) {
    user.activeCharacter = null;
    needsSave = true;
  }
  if (user.banned === undefined) {
    user.banned = false;
    needsSave = true;
  }
  if (!user.warnings) {
    user.warnings = [];
    needsSave = true;
  }
  if (!user.webSearchUsage) {
    user.webSearchUsage = {
      date: new Date().toISOString().slice(0, 10),
      used: 0,
    };
    needsSave = true;
  }
  if (!user.imagePrefs) {
    user.imagePrefs = {
      defaultRatio: "1:1",
      steps: 8,
      safeMode: true,
    };
    needsSave = true;
  }
  if (user.imagePrefs && user.imagePrefs.safeMode === undefined) {
    user.imagePrefs.safeMode = true;
    needsSave = true;
  }
  
  if (needsSave) {
    saveUsers();
  }
}

/**
 * Register a new user
 */
export function registerUser(from) {
  if (!from?.id) return null;
  return ensureUser(from.id, from);
}

// =====================
// User Status Checks
// =====================

/**
 * Check if a user is banned
 */
export function isUserBanned(userId) {
  const rec = getUserRecord(userId);
  return !!rec?.banned;
}

/**
 * Check if a user is trusted (skip spam checks)
 */
export function isTrustedUser(userId) {
  if (OWNER_IDS.has(String(userId))) {
    return true;
  }
  
  const rec = getUserRecord(userId);
  if (!rec) return false;
  
  const hasNoWarnings = !rec.warnings || rec.warnings.length === 0;
  const hasGoodHistory = (rec.messagesCount || 0) >= 100;
  const notBanned = !rec.banned;
  const notMuted = !rec.mute;
  
  return hasNoWarnings && hasGoodHistory && notBanned && notMuted;
}

/**
 * Check if a user is muted
 */
export function isUserMuted(userId, scope = 'all') {
  const rec = getUserRecord(userId);
  if (!rec?.mute) return false;
  
  const now = Date.now();
  if (rec.mute.until && now > rec.mute.until) {
    // Mute expired
    delete rec.mute;
    saveUsers();
    return false;
  }
  
  if (scope === 'all') return true;
  return rec.mute.scope === 'all' || rec.mute.scope === scope;
}

// =====================
// Tier Management
// =====================

/**
 * Get user's tier
 */
export function getUserTier(userId) {
  const rec = getUserRecord(userId);
  return rec?.tier || "free";
}

/**
 * Set user's tier
 */
export function setUserTier(userId, tier) {
  const user = ensureUser(userId);
  user.tier = tier;
  user.role = tier;
  saveUsers();
  return user;
}

/**
 * Grant a tier to a user
 */
export function grantTier(userId, tier) {
  return setUserTier(userId, tier);
}

/**
 * Revoke tier (set to free)
 */
export function revokeTier(userId) {
  return setUserTier(userId, "free");
}

// =====================
// Model Management
// =====================

/**
 * Ensure user's chosen model is valid for their tier
 */
export function ensureChosenModelValid(userId) {
  const u = ensureUser(userId);
  const allowed = allModelsForTier(u.tier);

  if (!allowed.length) {
    u.model = "";
    saveUsers();
    return "";
  }

  if (!allowed.includes(u.model)) {
    if (u.tier === "ultra") u.model = DEFAULT_ULTRA_MODEL;
    else if (u.tier === "premium") u.model = DEFAULT_PREMIUM_MODEL;
    else u.model = DEFAULT_FREE_MODEL;

    if (!allowed.includes(u.model)) u.model = allowed[0];

    saveUsers();
  }
  return u.model;
}

/**
 * Set user's model
 */
export function setUserModel(userId, model) {
  const user = ensureUser(userId);
  user.model = model;
  saveUsers();
  return user;
}

// =====================
// Usage Tracking
// =====================

/**
 * Track user usage
 */
export function trackUsage(userId, type = "message") {
  const user = ensureUser(userId);
  
  user.stats.lastActive = new Date().toISOString();
  
  if (type === "message") {
    user.stats.totalMessages = (user.stats.totalMessages || 0) + 1;
  } else if (type === "inline") {
    user.stats.totalInlineQueries = (user.stats.totalInlineQueries || 0) + 1;
  }
  
  saveUsers('low');
}

/**
 * Get user statistics
 */
export function getUserStats(userId) {
  const user = getUserRecord(userId);
  return user?.stats || null;
}

// =====================
// Ban/Warn Management
// =====================

/**
 * Ban a user
 */
export function banUser(userId, reason = null) {
  const user = ensureUser(userId);
  user.banned = true;
  user.banReason = reason;
  user.bannedAt = new Date().toISOString();
  saveUsers();
  return user;
}

/**
 * Unban a user
 */
export function unbanUser(userId) {
  const user = ensureUser(userId);
  user.banned = false;
  delete user.banReason;
  delete user.bannedAt;
  saveUsers();
  return user;
}

/**
 * Add a warning to a user
 */
export function warnUser(userId, reason = null) {
  const user = ensureUser(userId);
  if (!user.warnings) user.warnings = [];
  
  user.warnings.push({
    reason,
    at: new Date().toISOString()
  });
  
  saveUsers();
  return user.warnings.length;
}

/**
 * Clear user warnings
 */
export function clearWarnings(userId) {
  const user = ensureUser(userId);
  user.warnings = [];
  saveUsers();
}

/**
 * Mute a user
 */
export function muteUser(userId, durationMs, scope = 'all', reason = null) {
  const user = ensureUser(userId);
  user.mute = {
    until: Date.now() + durationMs,
    scope,
    reason,
    at: new Date().toISOString()
  };
  saveUsers();
  return user;
}

/**
 * Unmute a user
 */
export function unmuteUser(userId) {
  const user = ensureUser(userId);
  delete user.mute;
  saveUsers();
  return user;
}
