/**
 * middleware/rate-limit.js
 * Auto-extracted from index.js
 */

// =====================
// RATE LIMIT
// Lines 1160-1281 from original index.js
// =====================

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


