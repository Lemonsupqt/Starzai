/**
 * Basic Commands Module
 * Handles /start, /help, /info, /whoami, /stats
 */

import { InlineKeyboard } from "grammy";
import { ensureUser, getUserRecord, getUserTier, trackUsage } from "../features/users.js";
import { isOwner } from "../config/index.js";
import { getProviderStats } from "../llm/providers.js";

// =====================
// /start Command
// =====================

export function registerStartCommand(bot) {
  bot.command("start", async (ctx) => {
    const userId = String(ctx.from?.id);
    const user = ensureUser(userId, ctx.from);
    trackUsage(userId, "message");
    
    const firstName = ctx.from?.first_name || "there";
    const tier = getUserTier(userId);
    const tierEmoji = tier === "ultra" ? "👑" : tier === "premium" ? "⭐" : "🆓";
    
    const welcomeText = `
<b>Welcome to StarzAI!</b> ${tierEmoji}

Hey ${firstName}! I'm your AI assistant powered by multiple language models.

<b>Quick Start:</b>
• Just send me a message to chat
• Use /help for all commands
• Try @starztechbot in any chat for inline mode

<b>Your Tier:</b> ${tier.charAt(0).toUpperCase() + tier.slice(1)}

What would you like to do?
    `.trim();
    
    const keyboard = new InlineKeyboard()
      .text("💬 Ask AI", "menu_ask")
      .text("🔍 Web Search", "menu_search")
      .row()
      .text("🎨 Generate Image", "menu_image")
      .text("🤝 AI Partner", "menu_partner")
      .row()
      .text("⚙️ Settings", "menu_settings")
      .text("📊 My Stats", "menu_stats")
      .row()
      .text("💬 Feedback", "menu_feedback");
    
    await ctx.reply(welcomeText, {
      parse_mode: "HTML",
      reply_markup: keyboard
    });
  });
}

// =====================
// /help Command
// =====================

export function registerHelpCommand(bot) {
  bot.command("help", async (ctx) => {
    const userId = String(ctx.from?.id);
    trackUsage(userId, "message");
    
    const helpText = `
<b>📚 StarzAI Help</b>

<b>Chat Commands:</b>
/start - Welcome menu
/help - This help message
/reset - Clear chat memory
/model - Choose AI model

<b>Features:</b>
/search [query] - Web search (raw results)
/websearch [query] - AI-summarized search
/imagine [prompt] - Generate image
/img [prompt] - Quick image generation
/partner - Manage AI partner
/char - Character mode
/persona - Set custom AI personality

<b>Utility:</b>
/todo - Task manager
/stats - Your usage stats
/whoami - Your profile info
/feedback - Send feedback

<b>Inline Mode:</b>
Type @starztechbot in any chat for quick AI access!

<b>Prefixes:</b>
• q: - Quick answer
• b: - Deep research
• code: - Programming help
• e: - Simple explanation
• sum: - Summarize text
• p: - Partner chat
• as [char]: - Character roleplay
    `.trim();
    
    await ctx.reply(helpText, { parse_mode: "HTML" });
  });
}

// =====================
// /whoami Command
// =====================

export function registerWhoamiCommand(bot) {
  bot.command("whoami", async (ctx) => {
    const userId = String(ctx.from?.id);
    const user = ensureUser(userId, ctx.from);
    trackUsage(userId, "message");
    
    const tier = getUserTier(userId);
    const tierEmoji = tier === "ultra" ? "👑" : tier === "premium" ? "⭐" : "🆓";
    const ownerBadge = isOwner(userId) ? " 🔧 Owner" : "";
    
    const profileText = `
<b>👤 Your Profile</b>

<b>User ID:</b> <code>${userId}</code>
<b>Username:</b> @${ctx.from?.username || "none"}
<b>Name:</b> ${ctx.from?.first_name || "Unknown"}${ctx.from?.last_name ? " " + ctx.from.last_name : ""}

<b>Tier:</b> ${tierEmoji} ${tier.charAt(0).toUpperCase() + tier.slice(1)}${ownerBadge}
<b>Model:</b> ${user.model || "default"}
<b>Registered:</b> ${user.registeredAt?.slice(0, 10) || "Unknown"}

<b>Stats:</b>
• Messages: ${user.stats?.totalMessages || 0}
• Inline queries: ${user.stats?.totalInlineQueries || 0}
• Last active: ${user.stats?.lastActive?.slice(0, 10) || "Unknown"}
    `.trim();
    
    await ctx.reply(profileText, { parse_mode: "HTML" });
  });
}

// =====================
// /stats Command
// =====================

export function registerStatsCommand(bot) {
  bot.command("stats", async (ctx) => {
    const userId = String(ctx.from?.id);
    const user = ensureUser(userId, ctx.from);
    trackUsage(userId, "message");
    
    const stats = user.stats || {};
    
    let statsText = `
<b>📊 Your Statistics</b>

<b>Usage:</b>
• Total messages: ${stats.totalMessages || 0}
• Inline queries: ${stats.totalInlineQueries || 0}
• Tokens used: ${stats.totalTokensUsed || 0}

<b>Activity:</b>
• Last active: ${stats.lastActive?.slice(0, 16).replace("T", " ") || "Unknown"}
• Last model: ${stats.lastModel || "Unknown"}
    `.trim();
    
    // Add provider stats for owners
    if (isOwner(userId)) {
      const providerStatsData = getProviderStats();
      statsText += "\n\n<b>🔧 Provider Stats (Owner):</b>";
      
      for (const [key, pStats] of Object.entries(providerStatsData)) {
        const healthEmoji = pStats.health === 'excellent' ? '🟢' : 
                           pStats.health === 'good' ? '🟡' : 
                           pStats.health === 'degraded' ? '🟠' : '🔴';
        statsText += `\n• ${pStats.name}: ${healthEmoji} ${pStats.successRate}% (${pStats.calls} calls)`;
      }
    }
    
    await ctx.reply(statsText, { parse_mode: "HTML" });
  });
}

// =====================
// /info Command
// =====================

export function registerInfoCommand(bot) {
  bot.command("info", async (ctx) => {
    const userId = String(ctx.from?.id);
    trackUsage(userId, "message");
    
    const infoText = `
<b>ℹ️ About StarzAI</b>

StarzAI is a multi-model AI assistant for Telegram, featuring:

• <b>Multiple AI Models</b> - Choose from various LLMs
• <b>Web Search</b> - Real-time information retrieval
• <b>Image Generation</b> - AI-powered image creation
• <b>AI Partner</b> - Personalized AI companion
• <b>Character Mode</b> - Roleplay as any character
• <b>Inline Mode</b> - Quick access from any chat

<b>Powered by:</b>
• GitHub Models
• MegaLLM
• DeAPI (Images)

<b>Version:</b> 2.0.0 (Modular)
    `.trim();
    
    await ctx.reply(infoText, { parse_mode: "HTML" });
  });
}

// =====================
// Register All Basic Commands
// =====================

export function registerBasicCommands(bot) {
  registerStartCommand(bot);
  registerHelpCommand(bot);
  registerWhoamiCommand(bot);
  registerStatsCommand(bot);
  registerInfoCommand(bot);
}
