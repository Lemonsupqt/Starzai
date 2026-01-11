/**
 * utils/model-helpers.js
 * Auto-extracted from index.js
 */

// =====================
// MODEL CATEGORY HELPERS
// Lines 11092-11233 from original index.js
// =====================

  await ctx.reply("🎭 *Enter personality traits:*\n\n_Example: cheerful, witty, caring, playful_", { parse_mode: "Markdown" });
});

bot.callbackQuery("partner_set_background", async (ctx) => {
  await ctx.answerCallbackQuery();
  pendingPartnerInput.set(String(ctx.from.id), { field: "background", timestamp: Date.now() });
  await ctx.reply("📖 *Enter background/backstory:*\n\n_Example: A mysterious traveler from another dimension who loves stargazing_", { parse_mode: "Markdown" });
});

bot.callbackQuery("partner_set_style", async (ctx) => {
  await ctx.answerCallbackQuery();
  pendingPartnerInput.set(String(ctx.from.id), { field: "style", timestamp: Date.now() });
  await ctx.reply("💬 *Enter speaking style:*\n\n_Example: speaks softly with poetic phrases, uses lots of emojis_", { parse_mode: "Markdown" });
});

bot.callbackQuery("open_partner", async (ctx) => {
  await ctx.answerCallbackQuery();
  const partner = getPartner(ctx.from.id);
  try {
    await ctx.editMessageText(
      buildPartnerSetupMessage(partner),
      { parse_mode: "Markdown", reply_markup: buildPartnerKeyboard(partner) }
    );
  } catch (e) {
    await ctx.reply(
      buildPartnerSetupMessage(partner),
      { parse_mode: "Markdown", reply_markup: buildPartnerKeyboard(partner) }
    );
  }
});

bot.callbackQuery("do_stats", async (ctx) => {
  await ctx.answerCallbackQuery();
  const u = ctx.from;
  const userRecord = getUserRecord(u.id);
  
  if (!userRecord) {
    return ctx.answerCallbackQuery({ text: "❌ Not registered yet!", show_alert: true });
  }
  
  const model = ensureChosenModelValid(u.id);
  const memberSince = userRecord.createdAt ? new Date(userRecord.createdAt).toLocaleDateString() : "Unknown";
  const messages = userRecord.messageCount || 0;
  const queries = userRecord.inlineQueryCount || 0;
  
  const stats = [
    `📊 *Your Stats*`,
    ``,
    `👤 *User ID:* \`${u.id}\``,
    `🌟 *Tier:* ${userRecord.tier?.toUpperCase() || "FREE"}`,
    `🤖 *Model:* ${model.split("/").pop()}`,
    ``,
    `💬 *Messages:* ${messages}`,
    `⌨️ *Inline queries:* ${queries}`,
    `📅 *Member since:* ${memberSince}`,
  ].join("\n");
  
  try {
    await ctx.editMessageText(stats, { parse_mode: "Markdown", reply_markup: backToMainKeyboard() });
  } catch (e) {
    await ctx.reply(stats, { parse_mode: "Markdown", reply_markup: backToMainKeyboard() });
  }
});

bot.callbackQuery("partner_chat", async (ctx) => {
  await ctx.answerCallbackQuery();
  const u = ctx.from;
  const partner = getPartner(u.id);
  
  if (!partner?.name) {
    return ctx.reply("❌ Please set a name first!", { parse_mode: "Markdown" });
  }
  
  setPartner(u.id, { active: true });
  const updatedPartner = getPartner(u.id);
  await ctx.editMessageText(
    buildPartnerSetupMessage(updatedPartner),
    { parse_mode: "Markdown", reply_markup: buildPartnerKeyboard(updatedPartner) }
  );
  await ctx.reply(`🤝🏻 *${partner.name} is ready!*\n\nJust send messages and they'll respond in character.`, { parse_mode: "Markdown" });
});

bot.callbackQuery("partner_stop", async (ctx) => {
  await ctx.answerCallbackQuery();
  const u = ctx.from;
  setPartner(u.id, { active: false });
  const partner = getPartner(u.id);
  
  await ctx.editMessageText(
    buildPartnerSetupMessage(partner),
    { parse_mode: "Markdown", reply_markup: buildPartnerKeyboard(partner) }
  );
});

bot.callbackQuery("partner_clearchat", async (ctx) => {
  await ctx.answerCallbackQuery({ text: "Chat history cleared!" });
  clearPartnerChat(ctx.from.id);
  const partner = getPartner(ctx.from.id);
  await ctx.editMessageText(
    buildPartnerSetupMessage(partner),
    { parse_mode: "Markdown", reply_markup: buildPartnerKeyboard(partner) }
  );
});

bot.callbackQuery("partner_delete", async (ctx) => {
  await ctx.answerCallbackQuery({ text: "Partner deleted" });
  clearPartner(ctx.from.id);
  await ctx.editMessageText(
    buildPartnerSetupMessage(null),
    { parse_mode: "Markdown", reply_markup: buildPartnerKeyboard(null) }
  );
});

// Helper for time ago
function getTimeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// =====================
// MODEL CATEGORY HELPERS
// =====================

// Build category selection keyboard (main menu)
function modelCategoryKeyboard(userTier) {
  const rows = [];
  
  // Always show FREE
  rows.push([{ text: "🆓 Free Models", callback_data: "model_cat:free" }]);
  
  // Show PREMIUM if user has access
  if (userTier === "premium" || userTier === "ultra") {
    rows.push([{ text: "⭐ Premium Models", callback_data: "model_cat:premium" }]);
  }
  
  // Show ULTRA if user has access

