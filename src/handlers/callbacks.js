/**
 * Callback Query Handlers
 * Handles button clicks and interactive elements
 */

import { InlineKeyboard } from "grammy";
import { ensureUser, getUserTier, getUserRecord } from "../features/users.js";
import { getPartner, isPartnerActive, getPartnerStatus } from "../features/partners.js";
import { allModelsForTier } from "../config/index.js";

// =====================
// Menu Callbacks
// =====================

export function registerMenuCallbacks(bot) {
  // Main menu - Ask AI
  bot.callbackQuery("menu_ask", async (ctx) => {
    await ctx.answerCallbackQuery();
    
    const text = `
<b>💬 Ask AI</b>

Just send me any message and I'll respond!

<b>Tips:</b>
• Be specific for better answers
• Use /model to change AI model
• Use /reset to clear chat memory

<b>Inline Mode:</b>
Type @starztechbot in any chat for quick access!
    `.trim();
    
    const keyboard = new InlineKeyboard()
      .text("⬅️ Back", "menu_back");
    
    await ctx.editMessageText(text, { parse_mode: "HTML", reply_markup: keyboard });
  });
  
  // Main menu - Web Search
  bot.callbackQuery("menu_search", async (ctx) => {
    await ctx.answerCallbackQuery();
    
    const text = `
<b>🔍 Web Search</b>

Search the web for real-time information!

<b>Commands:</b>
• /search [query] - Raw search results
• /websearch [query] - AI-summarized results

<b>Example:</b>
<code>/websearch latest AI news</code>
    `.trim();
    
    const keyboard = new InlineKeyboard()
      .text("⬅️ Back", "menu_back");
    
    await ctx.editMessageText(text, { parse_mode: "HTML", reply_markup: keyboard });
  });
  
  // Main menu - Image Generation
  bot.callbackQuery("menu_image", async (ctx) => {
    await ctx.answerCallbackQuery();
    
    const userId = String(ctx.from?.id);
    const user = getUserRecord(userId);
    const currentRatio = user?.imagePrefs?.defaultRatio || "1:1";
    
    const text = `
<b>🎨 Image Generation</b>

Generate AI images from text prompts!

<b>Commands:</b>
• /imagine [prompt] - Generate image
• /img [prompt] - Quick generation
• /imgset - Configure settings

<b>Current Settings:</b>
• Ratio: ${currentRatio}
• Safe Mode: ${user?.imagePrefs?.safeMode !== false ? "ON" : "OFF"}

<b>Example:</b>
<code>/img a cute robot in a garden</code>
    `.trim();
    
    const keyboard = new InlineKeyboard()
      .text("⚙️ Image Settings", "imgset_menu")
      .row()
      .text("⬅️ Back", "menu_back");
    
    await ctx.editMessageText(text, { parse_mode: "HTML", reply_markup: keyboard });
  });
  
  // Main menu - AI Partner
  bot.callbackQuery("menu_partner", async (ctx) => {
    await ctx.answerCallbackQuery();
    
    const userId = String(ctx.from?.id);
    const status = getPartnerStatus(userId);
    
    let text = `
<b>🤝 AI Partner</b>

Create your personalized AI companion!
    `.trim();
    
    if (status.configured) {
      text += `\n\n<b>Your Partner:</b> ${status.name}`;
      text += `\n<b>Status:</b> ${status.active ? "🟢 Active" : "⚪ Inactive"}`;
      text += `\n<b>Messages:</b> ${status.messageCount}`;
    } else {
      text += `\n\n<i>No partner configured yet.</i>`;
      text += `\n\nUse /partner to create one!`;
    }
    
    const keyboard = new InlineKeyboard();
    
    if (status.configured) {
      keyboard.text(status.active ? "⏸️ Deactivate" : "▶️ Activate", "partner_toggle");
      keyboard.text("✏️ Edit", "partner_edit");
      keyboard.row();
    }
    
    keyboard.text("➕ Create Partner", "partner_create");
    keyboard.row();
    keyboard.text("⬅️ Back", "menu_back");
    
    await ctx.editMessageText(text, { parse_mode: "HTML", reply_markup: keyboard });
  });
  
  // Main menu - Settings
  bot.callbackQuery("menu_settings", async (ctx) => {
    await ctx.answerCallbackQuery();
    
    const userId = String(ctx.from?.id);
    const user = ensureUser(userId, ctx.from);
    const tier = getUserTier(userId);
    
    const text = `
<b>⚙️ Settings</b>

<b>Current Model:</b> ${user.model || "default"}
<b>Tier:</b> ${tier}
<b>Web Search:</b> ${user.webSearch ? "ON" : "OFF"}

Select an option to configure:
    `.trim();
    
    const keyboard = new InlineKeyboard()
      .text("🤖 Change Model", "settings_model")
      .row()
      .text("🔍 Toggle Web Search", "settings_websearch")
      .row()
      .text("🎨 Image Settings", "imgset_menu")
      .row()
      .text("⬅️ Back", "menu_back");
    
    await ctx.editMessageText(text, { parse_mode: "HTML", reply_markup: keyboard });
  });
  
  // Main menu - Stats
  bot.callbackQuery("menu_stats", async (ctx) => {
    await ctx.answerCallbackQuery();
    
    const userId = String(ctx.from?.id);
    const user = ensureUser(userId, ctx.from);
    const stats = user.stats || {};
    
    const text = `
<b>📊 Your Statistics</b>

<b>Usage:</b>
• Total messages: ${stats.totalMessages || 0}
• Inline queries: ${stats.totalInlineQueries || 0}
• Tokens used: ${stats.totalTokensUsed || 0}

<b>Activity:</b>
• Last active: ${stats.lastActive?.slice(0, 16).replace("T", " ") || "Unknown"}
• Last model: ${stats.lastModel || "Unknown"}
    `.trim();
    
    const keyboard = new InlineKeyboard()
      .text("⬅️ Back", "menu_back");
    
    await ctx.editMessageText(text, { parse_mode: "HTML", reply_markup: keyboard });
  });
  
  // Back to main menu
  bot.callbackQuery("menu_back", async (ctx) => {
    await ctx.answerCallbackQuery();
    
    const userId = String(ctx.from?.id);
    const user = ensureUser(userId, ctx.from);
    const tier = getUserTier(userId);
    const tierEmoji = tier === "ultra" ? "👑" : tier === "premium" ? "⭐" : "🆓";
    
    const firstName = ctx.from?.first_name || "there";
    
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
    
    await ctx.editMessageText(welcomeText, { parse_mode: "HTML", reply_markup: keyboard });
  });
  
  // Feedback
  bot.callbackQuery("menu_feedback", async (ctx) => {
    await ctx.answerCallbackQuery();
    
    const text = `
<b>💬 Feedback</b>

We'd love to hear from you!

Use /feedback followed by your message to send feedback to the developers.

<b>Example:</b>
<code>/feedback I love this bot!</code>
    `.trim();
    
    const keyboard = new InlineKeyboard()
      .text("⬅️ Back", "menu_back");
    
    await ctx.editMessageText(text, { parse_mode: "HTML", reply_markup: keyboard });
  });
}

// =====================
// Settings Callbacks
// =====================

export function registerSettingsCallbacks(bot) {
  // Model selection
  bot.callbackQuery("settings_model", async (ctx) => {
    await ctx.answerCallbackQuery();
    
    const userId = String(ctx.from?.id);
    const user = ensureUser(userId, ctx.from);
    const tier = getUserTier(userId);
    const models = allModelsForTier(tier);
    
    const text = `
<b>🤖 Select AI Model</b>

Current: <code>${user.model || "default"}</code>
Tier: ${tier}

Available models for your tier:
    `.trim();
    
    const keyboard = new InlineKeyboard();
    
    // Add model buttons (max 8)
    const displayModels = models.slice(0, 8);
    for (let i = 0; i < displayModels.length; i += 2) {
      const row = [];
      row.push({ text: displayModels[i] === user.model ? `✅ ${displayModels[i]}` : displayModels[i], callback_data: `model_select_${i}` });
      if (displayModels[i + 1]) {
        row.push({ text: displayModels[i + 1] === user.model ? `✅ ${displayModels[i + 1]}` : displayModels[i + 1], callback_data: `model_select_${i + 1}` });
      }
      keyboard.row(...row.map(r => keyboard.text(r.text, r.callback_data)));
    }
    
    keyboard.row().text("⬅️ Back", "menu_settings");
    
    await ctx.editMessageText(text, { parse_mode: "HTML", reply_markup: keyboard });
  });
  
  // Web search toggle
  bot.callbackQuery("settings_websearch", async (ctx) => {
    const userId = String(ctx.from?.id);
    const user = ensureUser(userId, ctx.from);
    
    user.webSearch = !user.webSearch;
    
    await ctx.answerCallbackQuery({ 
      text: `Web search ${user.webSearch ? "enabled" : "disabled"}!` 
    });
    
    // Refresh settings menu
    const tier = getUserTier(userId);
    
    const text = `
<b>⚙️ Settings</b>

<b>Current Model:</b> ${user.model || "default"}
<b>Tier:</b> ${tier}
<b>Web Search:</b> ${user.webSearch ? "ON" : "OFF"}

Select an option to configure:
    `.trim();
    
    const keyboard = new InlineKeyboard()
      .text("🤖 Change Model", "settings_model")
      .row()
      .text("🔍 Toggle Web Search", "settings_websearch")
      .row()
      .text("🎨 Image Settings", "imgset_menu")
      .row()
      .text("⬅️ Back", "menu_back");
    
    await ctx.editMessageText(text, { parse_mode: "HTML", reply_markup: keyboard });
  });
}

// =====================
// Image Settings Callbacks
// =====================

export function registerImageCallbacks(bot) {
  // Image settings menu
  bot.callbackQuery("imgset_menu", async (ctx) => {
    await ctx.answerCallbackQuery();
    
    const userId = String(ctx.from?.id);
    const user = getUserRecord(userId);
    const prefs = user?.imagePrefs || { defaultRatio: "1:1", safeMode: true };
    
    const text = `
<b>🎨 Image Settings</b>

<b>Current Settings:</b>
• Default Ratio: ${prefs.defaultRatio}
• Safe Mode: ${prefs.safeMode !== false ? "ON 🔒" : "OFF 🔓"}

Select an option to change:
    `.trim();
    
    const keyboard = new InlineKeyboard()
      .text("📐 Change Ratio", "imgset_ratio")
      .row()
      .text(`🔒 Safe Mode: ${prefs.safeMode !== false ? "ON" : "OFF"}`, "imgset_safemode")
      .row()
      .text("⬅️ Back", "menu_settings");
    
    await ctx.editMessageText(text, { parse_mode: "HTML", reply_markup: keyboard });
  });
  
  // Ratio selection
  bot.callbackQuery("imgset_ratio", async (ctx) => {
    await ctx.answerCallbackQuery();
    
    const userId = String(ctx.from?.id);
    const user = getUserRecord(userId);
    const currentRatio = user?.imagePrefs?.defaultRatio || "1:1";
    
    const ratios = ["1:1", "4:3", "3:4", "16:9", "9:16", "3:2"];
    
    const text = `
<b>📐 Select Default Ratio</b>

Current: ${currentRatio}
    `.trim();
    
    const keyboard = new InlineKeyboard();
    
    for (let i = 0; i < ratios.length; i += 3) {
      const row = ratios.slice(i, i + 3).map(r => ({
        text: r === currentRatio ? `✅ ${r}` : r,
        callback_data: `imgset_ratio_${r.replace(":", "x")}`
      }));
      keyboard.row(...row.map(r => keyboard.text(r.text, r.callback_data)));
    }
    
    keyboard.row().text("⬅️ Back", "imgset_menu");
    
    await ctx.editMessageText(text, { parse_mode: "HTML", reply_markup: keyboard });
  });
}

// =====================
// Register All Callbacks
// =====================

export function registerAllCallbacks(bot) {
  registerMenuCallbacks(bot);
  registerSettingsCallbacks(bot);
  registerImageCallbacks(bot);
}
