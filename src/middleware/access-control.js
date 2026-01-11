/**
 * middleware/access-control.js
 * Auto-extracted from index.js
 */

// =====================
// CONCURRENT PROCESSING + BAN/MUTE MIDDLEWARE
// Lines 1732-2011 from original index.js
// =====================

// =====================
// CONCURRENT PROCESSING MIDDLEWARE
// Enable parallel request handling for multiple users
// =====================
bot.use(async (ctx, next) => {
  // Process requests concurrently instead of sequentially
  // This allows multiple users to be served simultaneously
  next().catch(err => {
    console.error("❌ Handler error:", err);
    // Try to notify user of error
    try {
      ctx.reply("❌ An error occurred processing your request. Please try again.").catch(() => {});
    } catch (e) {
      // Ignore if we can't send error message
    }
  });
});

// Global ban middleware - blocks banned users from using the bot
// but still allows feedback (/feedback + Feedback button) so banned
// users can send an appeal or report an issue.
bot.use(async (ctx, next) => {
  const fromId = ctx.from?.id;
  if (!fromId) return next();

  const idStr = String(fromId);

  // Owners are never blocked by ban middleware
  if (OWNER_IDS.has(idStr)) {
    return next();
  }

  const user = getUserRecord(idStr);
  if (user && user.banned) {
    // Allow feedback flows even when banned (DM only)
    const chatType = ctx.chat?.type;
    const isPrivate = chatType === "private";
    const text = ctx.message?.text || "";

    const isFeedbackCommand = isPrivate && /^\/feedback\b/i.test(text);
    const isFeedbackButton =
      ctx.callbackQuery?.data === "menu_feedback";
    const isFeedbackActive =
      isPrivate && pendingFeedback.has(String(idStr));

    if (isFeedbackCommand || isFeedbackButton || isFeedbackActive) {
      return next();
    }

    try {
      if (ctx.callbackQuery) {
        await ctx.answerCallbackQuery({
          text: "🚫 You are banned from using this bot.",
          show_alert: true,
        });
        return;
      }

      if (ctx.inlineQuery) {
        await ctx.answerInlineQuery([], { cache_time: 1, is_personal: true });
        return;
      }

      if (ctx.message) {
        if (ctx.chat?.type === "private") {
          const replyMarkup =
            FEEDBACK_CHAT_ID
              ? new InlineKeyboard().text("💡 Feedback", "menu_feedback")
              : undefined;
          await ctx.reply("🚫 You are banned from using this bot.", {
            reply_markup: replyMarkup,
          });
        }
        return;
      }
    } catch {
      // Ignore errors from notifying banned users
      return;
    }
    return;
  }

  return next();
});

// Global mute middleware - temporary or scoped mutes
bot.use(async (ctx, next) => {
  const fromId = ctx.from?.id;
  if (!fromId) return next();

  const idStr = String(fromId);

  // Owners are never blocked by mute middleware
  if (OWNER_IDS.has(idStr)) {
    return next();
  }

  const user = getUserRecord(idStr);
  if (!user || !user.mute) {
    return next();
  }

  const m = user.mute;
  const now = Date.now();

  // Expired mute: clear and optionally restore tier, then continue
  if (m.until && now > m.until) {
    if (m.scope === "tier" && m.previousTier && user.tier === "free") {
      user.tier = m.previousTier;
      user.role = m.previousTier;
    }
    delete user.mute;
    saveUsers();
    return next();
  }

  const scope = m.scope || "all";

  // Tier-only mute is handled via tier change, not by blocking requests
  if (scope === "tier") {
    return next();
  }

  const chatType = ctx.chat?.type;
  const isInline = !!ctx.inlineQuery;
  const isPrivate = chatType === "private";
  const isGroup = chatType === "group" || chatType === "supergroup";

  let shouldBlock = false;

  if (scope === "all") {
    shouldBlock = true;
  } else if (scope === "dm" && isPrivate && ctx.message) {
    shouldBlock = true;
  } else if (scope === "group" && isGroup && ctx.message) {
    shouldBlock = true;
  } else if (scope === "inline" && isInline) {
    shouldBlock = true;
  }

  if (!shouldBlock) {
    return next();
  }

  const untilStr = m.until ? new Date(m.until).toLocaleString() : null;
  const reasonLine = m.reason ? `\n\n*Reason:* ${escapeMarkdown(m.reason)}` : "";
  const untilLine = untilStr ? `\n\n_Mute ends at: ${escapeMarkdown(untilStr)}_` : "";

  try {
    if (ctx.inlineQuery) {
      await ctx.answerInlineQuery([], { cache_time: 1, is_personal: true });
      return;
    }

    if (ctx.callbackQuery) {
      await ctx.answerCallbackQuery({
        text: "🔇 You are muted on this bot.",
        show_alert: true,
      });
      return;
    }

    if (ctx.message && isPrivate) {
      const text = `🔇 *You are muted on StarzAI.*${reasonLine}${untilLine}`;
      await ctx.reply(text, { parse_mode: "Markdown" });
      return;
    }

    // In groups, stay silent to avoid spam
    if (ctx.message && isGroup) {
      return;
    }
  } catch {
    return;
  }

  return;
});

// Track user activity
function trackUsage(userId, type = "message", tokens = 0) {
  const u = ensureUser(userId);
  if (!u.stats) {
    u.stats = {
      totalMessages: 0,
      totalInlineQueries: 0,
      totalTokensUsed: 0,
      lastActive: new Date().toISOString(),
      lastModel: u.model,
    };
  }
  
  if (type === "message") u.stats.totalMessages++;
  if (type === "inline") u.stats.totalInlineQueries++;
  u.stats.totalTokensUsed += tokens;
  u.stats.lastActive = new Date().toISOString();
  u.stats.lastModel = u.model;
  saveUsers();
}

// Websearch quota helpers

function getTodayDateKey() {
  return new Date().toISOString().slice(0, 10);
}

function getWebsearchDailyLimitForTier(tier) {
  if (tier === "ultra") return 18;
  if (tier === "premium") return 6;
  // free and unknown
  return 2;
}

function getWebsearchDailyLimitForUser(userId) {
  const idStr = String(userId);
  if (OWNER_IDS.has(idStr)) {
    // Owners: effectively unlimited
    return Infinity;
  }
  const user = getUserRecord(idStr);
  const tier = user?.tier || "free";
  return getWebsearchDailyLimitForTier(tier);
}

function getWebsearchUsage(user) {
  const today = getTodayDateKey();
  if (!user.webSearchUsage || user.webSearchUsage.date !== today) {
    user.webSearchUsage = { date: today, used: 0 };
  }
  return user.webSearchUsage;
}

// Consume one websearch from the user's daily quota.
// Returns { allowed, limit, used, remaining }.
function consumeWebsearchQuota(userId) {
  const u = ensureUser(userId);
  const limit = getWebsearchDailyLimitForUser(userId);

  // Owners: no quota enforcement
  if (!Number.isFinite(limit)) {
    return { allowed: true, limit, used: 0, remaining: Infinity };
  }

  const usage = getWebsearchUsage(u);
  if (usage.used >= limit) {
    return { allowed: false, limit, used: usage.used, remaining: 0 };
  }

  usage.used += 1;
  saveUsers();

  const remaining = Math.max(0, limit - usage.used);
  return { allowed: true, limit, used: usage.used, remaining };
}

// Read-only view of current quota status.
function getWebsearchQuotaStatus(userId) {
  const u = ensureUser(userId);
  const limit = getWebsearchDailyLimitForUser(userId);

  if (!Number.isFinite(limit)) {
    return { limit, used: 0, remaining: Infinity };
  }

  const usage = getWebsearchUsage(u);
  const remaining = Math.max(0, limit - usage.used);
  return { limit, used: usage.used, remaining };
}

// Add prompt to user's history (max 10 recent)
// DISABLED: History tracking removed to prevent database bloat
function addToHistory(userId, prompt, mode = "default") {
  // History tracking disabled
  return;
}

function registerUser(from) {
  return ensureUser(from.id, from);
}


