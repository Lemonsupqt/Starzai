/**
 * features/partners.js
 * Auto-extracted from index.js
 */

// =====================
// PARTNER MANAGEMENT
// Lines 2012-2093 from original index.js
// =====================

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

