/**
 * utils/model-helpers.js
 * Auto-extracted from index.js
 */

// =====================
// MODEL CATEGORY HELPERS
// Lines 11092-11233 from original index.js
// =====================

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
  if (userTier === "ultra") {
    rows.push([{ text: "💎 Ultra Models", callback_data: "model_cat:ultra" }]);
  }
  
  // Add back to main menu button
  rows.push([{ text: "« Back to Menu", callback_data: "menu_back" }]);
  
  return { inline_keyboard: rows };
}

// Build model list keyboard for a specific category
function modelListKeyboard(category, currentModel, userTier, page = 0) {
  const rows = [];
  let models = [];
  
  // Combine MegaLLM and GitHub Models for each category
  if (category === "free") {
    models = [...FREE_MODELS, ...GITHUB_FREE_MODELS];
  } else if (category === "premium" && (userTier === "premium" || userTier === "ultra")) {
    models = [...PREMIUM_MODELS, ...GITHUB_PREMIUM_MODELS];
  } else if (category === "ultra" && userTier === "ultra") {
    models = [...ULTRA_MODELS, ...GITHUB_ULTRA_MODELS];
  }
  
  const MODELS_PER_PAGE = 4;
  const totalPages = Math.ceil(models.length / MODELS_PER_PAGE);
  const startIdx = page * MODELS_PER_PAGE;
  const pageModels = models.slice(startIdx, startIdx + MODELS_PER_PAGE);
  
  // Add model buttons (1 per row for clean mobile display)
  pageModels.forEach((m) => {
    const short = m.split("/").pop();
    rows.push([{
      text: `${m === currentModel ? "✅ " : ""}${short}`,
      callback_data: `setmodel:${m}`,
    }]);
  });
  
  // Pagination row
  if (totalPages > 1) {
    const navRow = [];
    if (page > 0) {
      navRow.push({ text: "◀️", callback_data: `model_page:${category}:${page - 1}` });
    }
    navRow.push({ text: `${page + 1}/${totalPages}`, callback_data: "noop" });
    if (page < totalPages - 1) {
      navRow.push({ text: "▶️", callback_data: `model_page:${category}:${page + 1}` });
    }
    rows.push(navRow);
  }
  
  // Add back button
  rows.push([{ text: "← Back", callback_data: "model_back" }]);
  
  return { inline_keyboard: rows };
}

// Category emoji/title helper
function categoryTitle(category) {
  if (category === "free") return "🆓 FREE";
  if (category === "premium") return "⭐ PREMIUM";
  if (category === "ultra") return "💎 ULTRA";
  return category.toUpperCase();
}

bot.command("model", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  if (!(await enforceCommandCooldown(ctx))) return;

  const u = ensureUser(ctx.from.id, ctx.from);
  const current = ensureChosenModelValid(ctx.from.id);

  await ctx.reply(
    `👤 Plan: *${u.tier.toUpperCase()}*\n🤖 Current: \`${current}\`\n\nSelect a category:`,
    {
      parse_mode: "Markdown",
      reply_markup: modelCategoryKeyboard(u.tier),
      reply_to_message_id: ctx.message?.message_id,
    }
  );
});

bot.command("whoami", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  if (!(await enforceCommandCooldown(ctx))) return;

  const u = ensureUser(ctx.from.id, ctx.from);
  const model = ensureChosenModelValid(ctx.from.id);
  const stats = u.stats || {};

  const safeUsername = u.username ? escapeMarkdown("@" + u.username) : "_not set_";
  const safeName = u.firstName ? escapeMarkdown(u.firstName) : "_not set_";
  const shortModel = model.split("/").pop();
  // Show model as-is inside code block to avoid ugly backslashes like grok\-4\.1
  const safeModel = shortModel;

  const isOwnerUser = OWNER_IDS.has(String(ctx.from.id));
  const tierLabel = isOwnerUser
    ? `${u.tier.toUpperCase()} (OWNER)`
    : (u.tier || "free").toUpperCase();

  const lines = [
    `👤 *Your Profile*`,
    ``,
    `🆔 User ID: \`${ctx.from.id}\``,
    `📛 Username: ${safeUsername}`,
    `👋 Name: ${safeName}`,
    ``,
    `🎫 *Tier:* ${tierLabel}`,
    `🤖 *Model:* \`${safeModel}\``,
    ``,
    `📊 *Usage Stats*`,
    `• Messages: ${stats.totalMessages || 0}`,
    `• Inline queries: ${stats.totalInlineQueries || 0}`,
    `• Last active: ${stats.lastActive ? new Date(stats.lastActive).toLocaleString() : "_unknown_"}`,
    ``,
    `📅 Registered: ${u.registeredAt ? new Date(u.registeredAt).toLocaleDateString() : "_unknown_"}`,
  ];

  await ctx.reply(lines.join("\n"), {
    parse_mode: "Markdown",
    reply_to_message_id: ctx.message?.message_id,
  });
});


