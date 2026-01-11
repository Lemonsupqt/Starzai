/**
 * middleware/access-control.js
 * Auto-extracted from index.js
 */

// =====================
// CONCURRENT PROCESSING + BAN/MUTE MIDDLEWARE
// Lines 1732-2011 from original index.js
// =====================

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

