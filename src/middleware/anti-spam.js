/**
 * middleware/anti-spam.js
 * Auto-extracted from index.js
 */

// =====================
// ANTI-SPAM SYSTEM
// Lines 1282-1545 from original index.js
// =====================

// =====================
// ANTI-SPAM SYSTEM
// =====================
const spamTracking = new Map(); // userId -> { messages: [], lastWarning: timestamp }

const SPAM_CONFIG = {
  // Message frequency limits
  MAX_MESSAGES_PER_10_SEC: 5,
  MAX_MESSAGES_PER_MINUTE: 15,
  
  // Content-based detection
  MAX_REPEATED_MESSAGES: 3,
  MIN_MESSAGE_INTERVAL_MS: 500, // Minimum time between messages
  
  // Similarity detection
  SIMILARITY_THRESHOLD: 0.8, // 80% similar = spam
  
  // Penalties
  WARNING_COOLDOWN_MS: 60_000, // 1 minute between warnings
  AUTO_MUTE_DURATION_MINUTES: 10,
  AUTO_MUTE_THRESHOLD: 3, // Mute after 3 spam detections
};

function getSpamRecord(userId) {
  const key = String(userId);
  if (!spamTracking.has(key)) {
    spamTracking.set(key, {
      messages: [],
      spamCount: 0,
      lastWarning: 0,
    });
  }
  return spamTracking.get(key);
}

function cleanOldMessages(record, nowMs) {
  // Keep only messages from last minute
  record.messages = record.messages.filter(m => nowMs - m.timestamp < 60_000);
}

function calculateSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 1;
  
  // Simple character-based similarity
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  
  if (longer.length === 0) return 1;
  
  let matches = 0;
  for (let i = 0; i < shorter.length; i++) {
    if (longer.includes(shorter[i])) matches++;
  }
  
  return matches / longer.length;
}

function detectSpam(userId, messageText) {
  // Skip spam check for trusted users (performance optimization)
  if (isTrustedUser(userId)) {
    return { isSpam: false, reason: "trusted_user", severity: "none" };
  }
  
  const record = getSpamRecord(userId);
  const nowMs = Date.now();
  
  cleanOldMessages(record, nowMs);
  
  const recentMessages = record.messages;
  const last10Sec = recentMessages.filter(m => nowMs - m.timestamp < 10_000);
  const lastMinute = recentMessages.filter(m => nowMs - m.timestamp < 60_000);
  
  // Check 1: Too many messages in 10 seconds
  if (last10Sec.length >= SPAM_CONFIG.MAX_MESSAGES_PER_10_SEC) {
    return {
      isSpam: true,
      reason: "Too many messages in 10 seconds",
      severity: "high"
    };
  }
  
  // Check 2: Too many messages per minute
  if (lastMinute.length >= SPAM_CONFIG.MAX_MESSAGES_PER_MINUTE) {
    return {
      isSpam: true,
      reason: "Too many messages per minute",
      severity: "medium"
    };
  }
  
  // Check 3: Messages sent too quickly
  if (recentMessages.length > 0) {
    const lastMsg = recentMessages[recentMessages.length - 1];
    if (nowMs - lastMsg.timestamp < SPAM_CONFIG.MIN_MESSAGE_INTERVAL_MS) {
      return {
        isSpam: true,
        reason: "Messages sent too quickly",
        severity: "medium"
      };
    }
  }
  
  // Check 4: Repeated identical or similar messages
  if (messageText && messageText.length > 5) {
    let identicalCount = 0;
    let similarCount = 0;
    
    for (const msg of recentMessages) {
      if (msg.text === messageText) {
        identicalCount++;
      } else {
        const similarity = calculateSimilarity(msg.text, messageText);
        if (similarity >= SPAM_CONFIG.SIMILARITY_THRESHOLD) {
          similarCount++;
        }
      }
    }
    
    if (identicalCount >= SPAM_CONFIG.MAX_REPEATED_MESSAGES) {
      return {
        isSpam: true,
        reason: "Repeated identical messages",
        severity: "high"
      };
    }
    
    if (similarCount >= SPAM_CONFIG.MAX_REPEATED_MESSAGES) {
      return {
        isSpam: true,
        reason: "Repeated similar messages",
        severity: "medium"
      };
    }
  }
  
  // Check 5: Suspicious patterns (URLs, mentions, etc.)
  if (messageText) {
    const urlCount = (messageText.match(/https?:\/\//gi) || []).length;
    const mentionCount = (messageText.match(/@\w+/g) || []).length;
    
    if (urlCount > 3 || mentionCount > 5) {
      return {
        isSpam: true,
        reason: "Suspicious content pattern",
        severity: "low"
      };
    }
  }
  
  return { isSpam: false };
}

function trackMessage(userId, messageText) {
  const record = getSpamRecord(userId);
  const nowMs = Date.now();
  
  record.messages.push({
    text: messageText || "",
    timestamp: nowMs
  });
  
  cleanOldMessages(record, nowMs);
}

async function handleSpamDetection(ctx, spamResult, userId) {
  const record = getSpamRecord(userId);
  const nowMs = Date.now();
  
  record.spamCount = (record.spamCount || 0) + 1;
  
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

