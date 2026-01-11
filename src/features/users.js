/**
 * features/users.js
 * Auto-extracted from index.js
 */

// =====================
// USER + ACCESS CONTROL
// Lines 1581-1731 from original index.js
// =====================

// =====================
// USER + ACCESS CONTROL
// =====================
function getUserRecord(userId) {
  return usersDb.users[String(userId)] || null;
}

function ensureUser(userId, from = null) {
  const id = String(userId);
  const isOwnerUser = OWNER_IDS.has(id);
  
  if (!usersDb.users[id]) {
    // New user - auto-grant ultra to owners
    const defaultTier = isOwnerUser ? "ultra" : "free";
    const defaultModel = isOwnerUser ? (DEFAULT_ULTRA_MODEL || DEFAULT_PREMIUM_MODEL || DEFAULT_FREE_MODEL) : DEFAULT_FREE_MODEL;
    
    usersDb.users[id] = {
      registeredAt: new Date().toISOString(),
      username: from?.username || null,
      firstName: from?.first_name || null,
      role: defaultTier,
      tier: defaultTier,
      model: defaultModel,
      allowedModels: [],
      banned: false,
      // Usage stats
      stats: {
        totalMessages: 0,
        totalInlineQueries: 0,
        totalTokensUsed: 0,
        lastActive: new Date().toISOString(),
        lastModel: defaultModel,
      },
      // Recent prompts history (DISABLED to prevent database bloat)
      // history: [],
      // Saved characters for quick roleplay (max 10)
      savedCharacters: [],
      // Active character mode for DM/GC
      activeCharacter: null,
      // Web search toggle - when ON, all messages get web search
      webSearch: false,
      // Per-user websearch usage (daily)
      webSearchUsage: {
        date: new Date().toISOString().slice(0, 10),
        used: 0,
      },
      // Warning history (for /warn)
      warnings: [],
      // Image generation preferences
      imagePrefs: {
        defaultRatio: "1:1",  // Default aspect ratio
        steps: 8,              // Generation steps (owner-only adjustment)
        safeMode: true,        // NSFW filter (free=always on, premium/ultra=toggle, owner=off)
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
    // migration: if old users exist without tier
    if (!usersDb.users[id].tier) {
      usersDb.users[id].tier = usersDb.users[id].role || "free";
    }
    if (!usersDb.users[id].model) {
      usersDb.users[id].model = DEFAULT_FREE_MODEL;
    }
    // migration: add stats if missing
    if (!usersDb.users[id].stats) {
      usersDb.users[id].stats = {
        totalMessages: 0,
        totalInlineQueries: 0,
        totalTokensUsed: 0,
        lastActive: usersDb.users[id].registeredAt || new Date().toISOString(),
        lastModel: usersDb.users[id].model,
      };
    }
    // Update username/firstName if provided
    if (from?.username) usersDb.users[id].username = from.username;
    if (from?.first_name) usersDb.users[id].firstName = from.first_name;
    // migration: add savedCharacters if missing
    if (!usersDb.users[id].savedCharacters) {
      usersDb.users[id].savedCharacters = [];
    }
    // migration: add activeCharacter if missing
    if (usersDb.users[id].activeCharacter === undefined) {
      usersDb.users[id].activeCharacter = null;
    }
    // migration: add banned flag if missing
    if (usersDb.users[id].banned === undefined) {
      usersDb.users[id].banned = false;
    }
    // migration: add warnings array if missing
    if (!usersDb.users[id].warnings) {
      usersDb.users[id].warnings = [];
    }
    // migration: add webSearchUsage if missing
    if (!usersDb.users[id].webSearchUsage) {
      usersDb.users[id].webSearchUsage = {
        date: new Date().toISOString().slice(0, 10),
        used: 0,
      };
    }
    // migration: add imagePrefs if missing
    if (!usersDb.users[id].imagePrefs) {
      usersDb.users[id].imagePrefs = {
        defaultRatio: "1:1",
        steps: 8,
        safeMode: true,
      };
    }
    // migration: add safeMode to imagePrefs if missing
    if (usersDb.users[id].imagePrefs && usersDb.users[id].imagePrefs.safeMode === undefined) {
      usersDb.users[id].imagePrefs.safeMode = true;
    }
    saveUsers();
  }
  return usersDb.users[id];
}

// Check if a user is banned
function isUserBanned(userId) {
  const rec = getUserRecord(userId);
  return !!rec?.banned;
}

// Check if a user is trusted (skip spam checks for performance)
function isTrustedUser(userId) {
  // Owners are always trusted
  if (OWNER_IDS.includes(String(userId))) {
    return true;
  }
  
  const rec = getUserRecord(userId);
  if (!rec) return false;
  
  // Trusted if:
  // - No warnings
  // - 100+ messages sent
  // - Not banned or muted
  const hasNoWarnings = !rec.warnings || rec.warnings.length === 0;
  const hasGoodHistory = (rec.messagesCount || 0) >= 100;
  const notBanned = !rec.banned;
  const notMuted = !rec.mute;
  
  return hasNoWarnings && hasGoodHistory && notBanned && notMuted;
}


