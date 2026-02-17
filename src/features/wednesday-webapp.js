/**
 * wednesday-webapp.js
 * 
 * Separate module for the Wednesday Addams / Nevermore Games webapp integration.
 * Adds /wednesday command + callback buttons + inline keyboard with webapp link.
 * 
 * AUTO-LOGIN: Appends ?tg_id=<userId>&tg_name=<firstName> to the Nevermore URL
 * so the Wednesday Addams webapp can auto-login/register users from Telegram.
 * 
 * This module is FULLY SELF-CONTAINED — it does NOT modify any existing handlers.
 * Just import registerWednesdayWebapp(bot) in index.js and call it once.
 * 
 * Webapp URL: https://wednesday-addams-production.up.railway.app/
 */

import { InlineKeyboard } from "grammy";

// =====================
// CONSTANTS
// =====================

const NEVERMORE_BASE_URL = "https://wednesday-addams-production.up.railway.app/";

const FEATURE_NAME = "WednesdayWebapp";

// =====================
// HELPERS
// =====================

/**
 * Build a Nevermore URL with Telegram auto-login params
 * @param {object} user - Telegram user object (ctx.from)
 * @returns {string} URL with tg_id and tg_name query params
 */
function buildNevermoreURL(user) {
  if (!user || !user.id) return NEVERMORE_BASE_URL;

  const params = new URLSearchParams();
  params.set("tg_id", String(user.id));

  // Build display name: first_name + last_name, or username, or fallback
  const displayName = [user.first_name, user.last_name].filter(Boolean).join(" ") 
    || user.username 
    || "Telegram User";
  params.set("tg_name", displayName);

  return `${NEVERMORE_BASE_URL}?${params.toString()}`;
}

/**
 * Build the Nevermore welcome message (HTML formatted)
 */
function buildNevermoreMessage() {
  return [
    "🏰 <b>Upside Down Nevermore Games</b>",
    "",
    "Real-time multiplayer games for long-distance BFFs",
    "— <i>Stranger Things × Wednesday</i> themed",
    "",
    "🎮 <b>What's inside:</b>",
    "• Trivia, Puzzles, Card Games & Battles",
    "• 🤖 Chat with Wednesday AI",
    "• 🏆 Global Leaderboard & Achievements",
    "• 👥 Multiplayer rooms with friends",
    "",
    "🔐 <b>Auto-login:</b> Your Telegram account is linked automatically!",
    "",
    "Tap the button below to enter the Nevermore Academy!",
  ].join("\n");
}

/**
 * Build the Nevermore inline keyboard with auto-login URL
 * @param {object} user - Telegram user object (ctx.from)
 */
function buildNevermoreKeyboard(user) {
  const url = buildNevermoreURL(user);
  return new InlineKeyboard()
    .webApp("🏰 Enter Nevermore", url)
    .row()
    .text("« Back to Menu", "menu_back");
}

/**
 * Build a compact Nevermore button for embedding in other menus
 * @param {object} user - Telegram user object (ctx.from)
 */
function buildNevermoreCompactKeyboard(user) {
  const url = buildNevermoreURL(user);
  return new InlineKeyboard()
    .webApp("🏰 Nevermore Games", url);
}

// =====================
// REGISTRATION
// =====================

/**
 * Register all Wednesday/Nevermore handlers on the bot instance.
 * Call this once from index.js after bot is created.
 * 
 * @param {import("grammy").Bot} bot - The Grammy bot instance
 * @param {object} [options] - Optional config
 * @param {Function} [options.enforceRateLimit] - Rate limit function (pass from index.js)
 */
export function registerWednesdayWebapp(bot, options = {}) {
  const { enforceRateLimit } = options;

  console.log(`[${FEATURE_NAME}] Registering handlers...`);

  // ─── /wednesday command ───────────────────────────────
  bot.command("wednesday", async (ctx) => {
    if (enforceRateLimit && !(await enforceRateLimit(ctx))) return;

    await ctx.reply(buildNevermoreMessage(), {
      parse_mode: "HTML",
      reply_markup: buildNevermoreKeyboard(ctx.from),
    });
  });

  // Alias: /nevermore
  bot.command("nevermore", async (ctx) => {
    if (enforceRateLimit && !(await enforceRateLimit(ctx))) return;

    await ctx.reply(buildNevermoreMessage(), {
      parse_mode: "HTML",
      reply_markup: buildNevermoreKeyboard(ctx.from),
    });
  });

  // Alias: /games
  bot.command("games", async (ctx) => {
    if (enforceRateLimit && !(await enforceRateLimit(ctx))) return;

    await ctx.reply(buildNevermoreMessage(), {
      parse_mode: "HTML",
      reply_markup: buildNevermoreKeyboard(ctx.from),
    });
  });

  // ─── Callback: open_nevermore ─────────────────────────
  // Can be triggered from inline buttons in menus
  bot.callbackQuery("open_nevermore", async (ctx) => {
    await ctx.answerCallbackQuery();

    try {
      await ctx.editMessageText(buildNevermoreMessage(), {
        parse_mode: "HTML",
        reply_markup: buildNevermoreKeyboard(ctx.from),
      });
    } catch (e) {
      // If edit fails (e.g. message unchanged), send new message
      await ctx.reply(buildNevermoreMessage(), {
        parse_mode: "HTML",
        reply_markup: buildNevermoreKeyboard(ctx.from),
      });
    }
  });

  console.log(`[${FEATURE_NAME}] ✅ Registered: /wednesday, /nevermore, /games + callback (with auto-login)`);
}

// =====================
// EXPORTS
// =====================

export {
  NEVERMORE_BASE_URL,
  buildNevermoreURL,
  buildNevermoreMessage,
  buildNevermoreKeyboard,
  buildNevermoreCompactKeyboard,
};
