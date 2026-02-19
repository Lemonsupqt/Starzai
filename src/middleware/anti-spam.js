/**
 * middleware/anti-spam.js
 * Auto-extracted from index.js
 */

// =====================
// ANTI-SPAM SYSTEM
// Lines 1282-1545 from original index.js
// =====================

  return value * multipliers[unit];
}

// =====================
// RATE LIMIT
// =====================
function rateKey(ctx) {
  return ctx.from?.id ? String(ctx.from.id) : "anon";
}
function checkRateLimit(ctx) {
  const key = rateKey(ctx);
  const t = nowMs();
  const windowMs = 60_000;

  const entry = rate.get(key) || { windowStartMs: t, count: 0 };

  if (t - entry.windowStartMs >= windowMs) {
    entry.windowStartMs = t;
    entry.count = 0;
  }

  entry.count += 1;
  rate.set(key, entry);

  if (entry.count > RATE_LIMIT_PER_MINUTE) {
    const waitSec = Math.ceil((windowMs - (t - entry.windowStartMs)) / 1000);
    return { ok: false, waitSec };
  }
  return { ok: true, waitSec: 0 };
}

async function enforceRateLimit(ctx) {
  const fromId = ctx.from?.id;
  if (fromId && OWNER_IDS.has(String(fromId))) {
    // Owners are not rate-limited
    return true;
  }

  const r = checkRateLimit(ctx);
  if (r.ok) return true;

  const msg = `Rate limit hit. Try again in ~${r.waitSec}s.`;

  if (ctx.inlineQuery) {
    await safeAnswerInline(
      ctx,
      [
        {
          type: "article",
          id: "rate",
          title: "Slow down 😅",
          description: msg,
          input_message_content: { message_text: msg },
        },
      ],
      { cache_time: 1, is_personal: true }
    );
  } else if (ctx.callbackQuery) {
    await ctx.answerCallbackQuery({ text: msg, show_alert: true });
  } else {
    await ctx.reply(msg);
  }
  return false;
}

// Per-tier command cooldowns (slash commands only)
const commandCooldown = new Map(); // userId -> last command timestamp (ms)

function getTierForCooldown(user, userId) {
  const idStr = String(userId);
  if (OWNER_IDS.has(idStr)) return "owner";
  const t = user?.tier || "free";
  if (t === "premium" || t === "ultra" || t === "free") return t;
  return "free";
}

function getCommandCooldownSecondsForTier(tier) {
  if (tier === "owner") return 0;
  if (tier === "ultra") return 10;
  if (tier === "premium") return 30;
  // free and unknown default
  return 60;
}

async function enforceCommandCooldown(ctx) {
  const from = ctx.from;
  const userId = from?.id ? String(from.id) : null;
  if (!userId) return true;

  // Owners: no command cooldown
  if (OWNER_IDS.has(userId)) {
    return true;
  }

  const user = getUserRecord(userId) || ensureUser(userId, from);
  const tier = getTierForCooldown(user, userId);
  const cooldownSec = getCommandCooldownSecondsForTier(tier);
  if (cooldownSec <= 0) {
    return true;
  }

  const cooldownMs = cooldownSec * 1000;
  const now = nowMs();
  const last = commandCooldown.get(userId) || 0;
  const elapsed = now - last;

  if (last && elapsed < cooldownMs) {
    const remainingSec = Math.ceil((cooldownMs - elapsed) / 1000);
    const msg = `⏱️ Command cooldown: wait ~${remainingSec}s before using another command.`;
    try {
      if (ctx.callbackQuery) {
        await ctx.answerCallbackQuery({ text: msg, show_alert: true });
      } else {
        await ctx.reply(msg);
      }
    } catch {
      // Ignore notification errors
    }
    return false;
  }

  commandCooldown.set(userId, now);
  return true;
}

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
  
  const len1 = s1.length;
  const len2 = s2.length;
  
  if (len1 === 0 || len2 === 0) return 0;

  // Levenshtein distance
  const dp = Array.from({ length: len1 + 1 }, (_, i) => i);
  for (let j = 1; j <= len2; j++) {
    let prev = dp[0];
    dp[0] = j;
    for (let i = 1; i <= len1; i++) {
      const temp = dp[i];
      dp[i] = s1[i - 1] === s2[j - 1]
        ? prev
        : 1 + Math.min(prev, dp[i], dp[i - 1]);
      prev = temp;
    }
  }

  const distance = dp[len1];
  return 1 - distance / Math.max(len1, len2);
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

