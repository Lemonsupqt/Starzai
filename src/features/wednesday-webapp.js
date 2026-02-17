/**
 * wednesday-webapp.js
 * 
 * Separate module for the Wednesday Addams / Nevermore Games webapp integration.
 * Adds /wednesday command + callback buttons + inline keyboard with webapp link.
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

const NEVERMORE_URL = "https://wednesday-addams-production.up.railway.app/";

const FEATURE_NAME = "WednesdayWebapp";

// =====================
// HELPERS
// =====================

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
    "Tap the button below to enter the Nevermore Academy!",
  ].join("\n");
}

/**
 * Build the Nevermore inline keyboard
 */
function buildNevermoreKeyboard() {
  return new InlineKeyboard()
    .webApp("🏰 Enter Nevermore", NEVERMORE_URL)
    .row()
    .text("« Back to Menu", "menu_back");
}

/**
 * Build a compact Nevermore button for embedding in other menus
 */
function buildNevermoreCompactKeyboard() {
  return new InlineKeyboard()
    .webApp("🏰 Nevermore Games", NEVERMORE_URL);
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
      reply_markup: buildNevermoreKeyboard(),
    });
  });

  // Alias: /nevermore
  bot.command("nevermore", async (ctx) => {
    if (enforceRateLimit && !(await enforceRateLimit(ctx))) return;

    await ctx.reply(buildNevermoreMessage(), {
      parse_mode: "HTML",
      reply_markup: buildNevermoreKeyboard(),
    });
  });

  // Alias: /games
  bot.command("games", async (ctx) => {
    if (enforceRateLimit && !(await enforceRateLimit(ctx))) return;

    await ctx.reply(buildNevermoreMessage(), {
      parse_mode: "HTML",
      reply_markup: buildNevermoreKeyboard(),
    });
  });

  // ─── Callback: open_nevermore ─────────────────────────
  // Can be triggered from inline buttons in menus
  bot.callbackQuery("open_nevermore", async (ctx) => {
    await ctx.answerCallbackQuery();

    try {
      await ctx.editMessageText(buildNevermoreMessage(), {
        parse_mode: "HTML",
        reply_markup: buildNevermoreKeyboard(),
      });
    } catch (e) {
      // If edit fails (e.g. message unchanged), send new message
      await ctx.reply(buildNevermoreMessage(), {
        parse_mode: "HTML",
        reply_markup: buildNevermoreKeyboard(),
      });
    }
  });

  console.log(`[${FEATURE_NAME}] ✅ Registered: /wednesday, /nevermore, /games + callback`);
}

// =====================
// EXPORTS
// =====================

export {
  NEVERMORE_URL,
  buildNevermoreMessage,
  buildNevermoreKeyboard,
  buildNevermoreCompactKeyboard,
};
