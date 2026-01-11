/**
 * features/users.js
 * Auto-extracted from index.js
 */

// =====================
// USER + ACCESS CONTROL
// Lines 1581-1731 from original index.js
// =====================

  
  // Log spam detection
  console.log(`[SPAM] User ${userId}: ${spamResult.reason} (severity: ${spamResult.severity}, count: ${record.spamCount})`);
  
  // Auto-mute after threshold
  if (record.spamCount >= SPAM_CONFIG.AUTO_MUTE_THRESHOLD) {
    const durationMs = SPAM_CONFIG.AUTO_MUTE_DURATION_MINUTES * 60 * 1000;
    const autoReason = `${spamResult.reason} (automatic spam detection)`;
    
    // Apply a regular mute using the global mute system
    const { until } = applyMuteToUser(
      String(userId),
      durationMs,
      "all",
      autoReason,
      "system"
    );
    
    // Reset spam count
    record.spamCount = 0;
    
    // Notify user
    try {
      const untilDate = until ? new Date(until).toLocaleString() : "unknown";
      await ctx.reply(
        `🚫 *Auto-Muted for Spam*\\n\\n` +
        `You have been automatically muted for ${SPAM_CONFIG.AUTO_MUTE_DURATION_MINUTES} minutes due to spam behavior.\\n\\n` +
        `Reason: ${spamResult.reason}\\n` +
        `Mute expires: ${untilDate}\\n\\n` +
        `_Please avoid spamming to use the bot._`,
        { parse_mode: "Markdown" }
      );
    } catch (e) {
      console.error("Failed to notify muted user:", e);
    }
    
    return true; // Muted
  }
  
  // Send warning (with cooldown)
  if (nowMs - record.lastWarning > SPAM_CONFIG.WARNING_COOLDOWN_MS) {
    record.lastWarning = nowMs;
    
    try {
      await ctx.reply(
        `⚠️ *Spam Warning*\\n\\n` +
        `${spamResult.reason}\\n\\n` +
        `Please slow down or you will be automatically muted.\\n` +
        `(Warning ${record.spamCount}/${SPAM_CONFIG.AUTO_MUTE_THRESHOLD})`,
        { parse_mode: "Markdown" }
      );
    } catch (e) {
      console.error("Failed to send spam warning:", e);
    }
  }
  
  return false; // Not muted yet
}

async function checkAntiSpam(ctx, messageText) {
  const userId = ctx.from?.id;
  if (!userId) return true; // Allow if no user ID
  
  // Skip spam check for owners
  if (OWNER_IDS.has(String(userId))) return true;
  
  // Detect spam
  const spamResult = detectSpam(userId, messageText);
  
  if (spamResult.isSpam) {
    const wasMuted = await handleSpamDetection(ctx, spamResult, userId);
    if (wasMuted) {
      return false; // Block message
    }
    
    // For high severity, block immediately
    if (spamResult.severity === "high") {
      return false;
    }
  }
  
  // Track this message
  trackMessage(userId, messageText);
  
  return true; // Allow message
}

// =====================
// ANTI-SPAM SYSTEM
// =====================
// =====================
// GROUP ACTIVATION SYSTEM
// =====================
// Bot is dormant by default in groups. Activates for 2 minutes after command/mention.
// During active window, responds to all messages. Goes dormant after inactivity.

function activateGroup(chatId) {
  const id = String(chatId);
  groupActiveUntil.set(id, Date.now() + GROUP_ACTIVE_DURATION);
}

function deactivateGroup(chatId) {
  const id = String(chatId);
  groupActiveUntil.delete(id);
}

function isGroupActive(chatId) {
  const id = String(chatId);
  const until = groupActiveUntil.get(id);
  if (!until) return false;
  if (Date.now() > until) {
    groupActiveUntil.delete(id); // Clean up expired
    return false;
  }
  return true;
}

function getGroupActiveRemaining(chatId) {
  const id = String(chatId);
  const until = groupActiveUntil.get(id);
  if (!until) return 0;
  const remaining = until - Date.now();
  return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
}

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

