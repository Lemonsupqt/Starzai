/**
 * handlers/callbacks/menu.js
 * Auto-extracted from index.js
 */

// =====================
// CALLBACKS: UNIFIED MENU NAVIGATION
// Lines 12597-13122 from original index.js
// =====================

// =====================
// CALLBACKS: UNIFIED MENU NAVIGATION
// =====================

// Back to main menu
bot.callbackQuery("menu_back", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  await ctx.answerCallbackQuery();
  
  try {
    await ctx.editMessageText(buildMainMenuMessage(ctx.from.id), {
      parse_mode: "Markdown",
      reply_markup: mainMenuKeyboard(ctx.from.id)
    });
  } catch (e) {
    // If edit fails (message unchanged), ignore
  }
});

// Features menu
bot.callbackQuery("menu_features", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  await ctx.answerCallbackQuery();
  
  const featuresText = [
    "🌟 *StarzAI Features*",
    "",
    "⚡ *AI Modes (Inline)*",
    "• ⭐ *Quark* (`q:`) - Lightning fast answers",
    "• 🗿🔬 *Blackhole* (`b:`) - Deep research & analysis",
    "• 💻 *Code* (`code:`) - Programming help & snippets",
    "• 🧠 *Explain* (`e:`) - Simple ELI5 explanations",
    "• 🎭 *Character* (`as:`) - Roleplay as any character",
    "• 📝 *Summarize* (`sum:`) - Condense long text",
    "",
    "🤝🏻 *AI Partner*",
    "Create your personalized AI companion!",
    "• Custom name, personality, background",
    "• Persistent chat memory",
    "• Works in DM and inline (`p:`)",
    "",
    "🎭 *Character Mode*",
    "Quick roleplay as existing characters!",
    "• `/char yoda` - Start as Yoda",
    "• `/char save yoda` - Save to favorites",
    "• `/char stop` - End character mode",
    "",
    "🎨 *AI Image Generator*",
    "Create stunning images from text!",
    "• `/img prompt` - Fast turbo model",
    "• `/img2 prompt` - Flux model (alt style)",
    "• `/imagine prompt` - Free alternative",
    "• Or just say: \"generate image of...\" or \"draw...\"",
    "• `/imgset` - Set default ratio & safe mode",
    "",
    "📊 *Stats*",
    "• /stats - Your usage statistics",
    "",
    "📋 *Task Manager*",
    "Advanced to-do list with priorities!",
    "• `/todo` - View your tasks",
    "• `/todo add task` - Quick add",
    "• Categories, due dates, streaks",
  ].join("\n");
  
  const kb = new InlineKeyboard()
    .text("📋 Tasks", "todo_list")
    .text("🎨 Image Settings", "menu_imgset")
    .row()
    .text("💳 Plans & Benefits", "menu_plans")
    .text("« Back to Menu", "menu_back");
  
  try {
    await ctx.editMessageText(featuresText, {
      parse_mode: "Markdown",
      reply_markup: kb
    });
  } catch (e) {
    // If edit fails, ignore
  }
});

// Image Settings menu (from Features)
bot.callbackQuery("menu_imgset", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  await ctx.answerCallbackQuery();
  
  const u = ctx.from;
  if (!u?.id) return;
  
  const user = ensureUser(u.id, u);
  const isOwnerUser = OWNER_IDS.has(String(u.id));
  
  const currentRatio = user.imagePrefs?.defaultRatio || "1:1";
  const currentConfig = IMG_ASPECT_RATIOS[currentRatio];
  const currentSafeMode = shouldEnforceSafeMode(u.id);
  const canToggle = canToggleSafeMode(u.id);
  
  const buttons = [
    [
      { text: `${currentRatio === "1:1" ? "✅ " : ""}⬜ Square`, callback_data: "imgset_ratio:1:1" },
      { text: `${currentRatio === "4:3" ? "✅ " : ""}🖼️ Landscape`, callback_data: "imgset_ratio:4:3" },
      { text: `${currentRatio === "3:4" ? "✅ " : ""}📱 Portrait`, callback_data: "imgset_ratio:3:4" }
    ],
    [
      { text: `${currentRatio === "16:9" ? "✅ " : ""}🎬 Widescreen`, callback_data: "imgset_ratio:16:9" },
      { text: `${currentRatio === "9:16" ? "✅ " : ""}📲 Story`, callback_data: "imgset_ratio:9:16" },
      { text: `${currentRatio === "3:2" ? "✅ " : ""}📷 Photo`, callback_data: "imgset_ratio:3:2" }
    ]
  ];
  
  // Add safe mode toggle button for premium/ultra users
  if (canToggle) {
    buttons.push([
      { 
        text: currentSafeMode ? "🔒 Safe Mode: ON (tap to disable)" : "🔓 Safe Mode: OFF (tap to enable)", 
        callback_data: currentSafeMode ? "imgset_safe:off" : "imgset_safe:on" 
      }
    ]);
  }
  
  // Add back to features button
  buttons.push([
    { text: "« Back to Features", callback_data: "menu_features" }
  ]);
  
  let settingsText = `🎨 *Image Settings*\n\n` +
    `📐 *Default Ratio:* ${currentConfig?.icon || '⬜'} ${currentConfig?.label || 'Square'} (${currentRatio})\n\n` +
    `Select your default aspect ratio for /img:`;
  
  // Show safe mode status
  if (isOwnerUser) {
    settingsText += `\n\n🔓 *Safe Mode:* OFF _(owners unrestricted)_`;
  } else if (user.tier === 'free') {
    settingsText += `\n\n🔒 *Safe Mode:* ON _(always on for free users)_`;
  } else {
    settingsText += `\n\n${currentSafeMode ? '🔒' : '🔓'} *Safe Mode:* ${currentSafeMode ? 'ON' : 'OFF'}`;
  }
  
  // Show steps setting for owners
  if (isOwnerUser) {
    const currentSteps = user.imagePrefs?.steps || 8;
    settingsText += `\n\n🔧 *Steps:* ${currentSteps} _(owner only)_\n` +
      `Use \`/imgset steps [1-50]\` to change`;
  }
  
  settingsText += `\n\n_Tap a ratio to set it as your default._`;
  
  try {
    await ctx.editMessageText(settingsText, {
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: buttons }
    });
  } catch (e) {
    await ctx.reply(settingsText, {
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: buttons }
    });
  }
});

// Plans & benefits menu
bot.callbackQuery("menu_plans", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  await ctx.answerCallbackQuery();

  const user = getUserRecord(ctx.from.id);
  const tierRaw = user?.tier || "free";
  const tier = tierRaw.toUpperCase();
  const tierEmoji = tierRaw === "ultra" ? "💎" : tierRaw === "premium" ? "⭐" : "🆓";

  const msg = [
    "💳 *StarzAI Plans & Benefits*",
    "",
    `Your current plan: ${tierEmoji} *${tier}*`,
    "",
    "🆓 *Free*",
    "• Access to fast free models",
    "• Inline modes: Quark, Explain, Summarize, Code, Blackhole, etc.",
    "• Shorter/Longer: 1 transform total per answer (then Revert only)",
    "• No Ultra Summary button",
    "",
    "⭐ *Premium*",
    "• Everything in Free",
    "• Access to premium models",
    "• Shorter/Longer: up to 2 transforms per answer",
    "• Faster responses and higher quality",
    "",
    "💎 *Ultra*",
    "• Everything in Premium",
    "• Access to all Ultra models",
    "• Shorter: 2x and Longer: 2x per answer, with Revert",
    "• 🧾 Ultra Summary for long Blackhole/Explain/Code answers",
    "",
    "_Upgrades are managed manually for now. Contact the owner or support to get Premium/Ultra access._",
  ].join("\n");

  const kb = new InlineKeyboard()
    .text("🌟 Features", "menu_features")
    .row()
    .text("« Back to Menu", "menu_back");

  try {
    await ctx.editMessageText(msg, { parse_mode: "Markdown", reply_markup: kb });
  } catch (e) {
    await ctx.reply(msg, { parse_mode: "Markdown", reply_markup: kb });
  }
});

// Model menu
bot.callbackQuery("menu_model", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  await ctx.answerCallbackQuery();
  
  const u = ensureUser(ctx.from.id, ctx.from);
  const current = ensureChosenModelValid(ctx.from.id);
  
  try {
    await ctx.editMessageText(
      `⚙️ *Model Selection*\n\n👤 Plan: *${u.tier.toUpperCase()}*\n🤖 Current: \`${current}\`\n\n_Select a category:_`,
      { parse_mode: "Markdown", reply_markup: modelCategoryKeyboard(u.tier) }
    );
  } catch (e) {
    // If edit fails, ignore
  }
});

// Partner menu
bot.callbackQuery("menu_partner", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  await ctx.answerCallbackQuery();
  
  const partner = getPartner(ctx.from.id);
  
  try {
    await ctx.editMessageText(
      buildPartnerSetupMessage(partner),
      { parse_mode: "Markdown", reply_markup: buildPartnerKeyboard(partner) }
    );
  } catch (e) {
    // If edit fails, ignore
  }
});

// Stats menu
bot.callbackQuery("menu_stats", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  await ctx.answerCallbackQuery();
  
  const u = ctx.from;
  const user = getUserRecord(u.id);
  
  if (!user) {
    return ctx.answerCallbackQuery({ text: "❌ Not registered yet!", show_alert: true });
  }
  
  const userStats = user.stats || { totalMessages: 0, totalInlineQueries: 0, lastActive: null };
  const shortModel = (user.model || ensureChosenModelValid(u.id)).split("/").pop();
  
  // Calculate days since registration
  const regDate = new Date(user.registeredAt || Date.now());
  const daysSinceReg = Math.floor((Date.now() - regDate.getTime()) / (1000 * 60 * 60 * 24));
  
  // Format last active
  const lastActive = userStats.lastActive ? new Date(userStats.lastActive).toLocaleDateString() : "Never";
  
  const tierEmoji = user.tier === "ultra" ? "💎" : user.tier === "premium" ? "⭐" : "🆓";
  
  const stats = [
    `📊 *Your StarzAI Stats*`,
    ``,
    `👤 *User:* ${user.firstName || "Unknown"} (@${user.username || "no username"})`,
    `${tierEmoji} *Plan:* ${(user.tier || "free").toUpperCase()}`,
    `🤖 *Model:* \`${shortModel}\``,
    ``,
    `💬 *DM Messages:* ${(userStats.totalMessages || 0).toLocaleString()}`,
    `⚡ *Inline Queries:* ${(userStats.totalInlineQueries || 0).toLocaleString()}`,
    `📝 *Total Interactions:* ${((userStats.totalMessages || 0) + (userStats.totalInlineQueries || 0)).toLocaleString()}`,
    ``,
    `📅 *Member for:* ${daysSinceReg} days`,
    `🕒 *Last Active:* ${lastActive}`,
    ``,
    `_Keep chatting to grow your stats!_`,
  ].join("\n");
  
  const keyboard = new InlineKeyboard()
    .text("« Back to Menu", "menu_back");
  
  try {
    await ctx.editMessageText(stats, {
      parse_mode: "Markdown",
      reply_markup: keyboard
    });
  } catch (e) {
    // If edit fails, ignore
  }
});

// History menu (inside stats) - DISABLED
bot.callbackQuery("menu_history", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  await ctx.answerCallbackQuery({ text: "History feature has been disabled to optimize database performance.", show_alert: true });
  
  try {
    await ctx.editMessageText(
      "⚠️ *History feature has been disabled*\n\nThis feature has been removed to optimize database performance and reduce storage costs.\n\n_You can still use inline mode by typing @starztechbot in any chat!_",
      { parse_mode: "Markdown", reply_markup: new InlineKeyboard().text("← Back to Stats", "menu_stats").row().text("« Back to Menu", "menu_back") }
    );
  } catch (e) {}
});

// Character menu
bot.callbackQuery("menu_char", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  await ctx.answerCallbackQuery();
  
  const userId = ctx.from?.id;
  const chatId = ctx.chat?.id;
  
  const activeChar = getActiveCharacter(userId, chatId);
  const savedChars = getSavedCharacters(userId);
  
  const statusText = activeChar 
    ? `🎭 *Active Character:* ${activeChar.name}\n\n`
    : "🎭 *No active character*\n\n";
  
  const savedList = savedChars.length > 0
    ? `💾 *Saved Characters:*\n${savedChars.map((c, i) => `${i + 1}. ${c}`).join("\n")}\n\n`
    : "";
  
  const helpText = [
    statusText,
    savedList,
    "*Commands:*",
    "• `/char yoda` - Start as Yoda",
    "• `/char save yoda` - Save character",
    "• `/char list` - Show saved",
    "• `/char stop` or `/default` - Stop",
    "",
    "_Tap a character button to start!_",
  ].join("\n");
  
  try {
    await ctx.editMessageText(helpText, { 
      parse_mode: "Markdown",
      reply_markup: buildCharacterKeyboard(savedChars, activeChar)
    });
  } catch (e) {
    // If edit fails, ignore
  }
});

// DM/GC AI-Continue button: ask the model to extend its previous answer
bot.callbackQuery(/^dm_ai_cont:(.+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  const data = ctx.callbackQuery.data || "";
  const match = data.match(/^dm_ai_cont:(.+)$/);
  if (!match) {
    return ctx.answerCallbackQuery();
  }

  const key = match[1];
  const entry = dmContinueCache.get(key);
  if (!entry) {
    return ctx.answerCallbackQuery({ text: "Session expired. Please ask again.", show_alert: true });
  }

  const callerId = String(ctx.from?.id || "");
  if (callerId !== String(entry.userId)) {
    return ctx.answerCallbackQuery({ text: "Only the original requester can continue this answer.", show_alert: true });
  }

  // Stop the spinner immediately and show a small toast
  await ctx.answerCallbackQuery({ text: "Continuing...", show_alert: false });

  // Remove the old Continue button to avoid spam clicks
  try {
    // Calling without arguments clears the inline keyboard in the current message
    await ctx.editMessageReplyMarkup();
  } catch {
    // ignore if we can't edit the old markup
  }

  dmContinueCache.delete(key);

  const { chatId, model, systemPrompt, userTextWithContext, modeLabel, sourcesHtml } = entry;

  // Send a temporary status message that we'll edit with the continuation
  const statusMsg = await ctx.reply("⏳ <i>Continuing...</i>", {
    parse_mode: "HTML",
    reply_to_message_id: ctx.callbackQuery.message?.message_id,
  });

  const startTime = Date.now();

  try {
    const continuedSystemPrompt =
      systemPrompt +
      " You are continuing your previous answer for the same request. Do not repeat what you've already said; just continue from where you left off." +
      " When you have fully covered all essential points and there is nothing important left to add, append the exact token END_OF_ANSWER at the very end of your final continuation. Do not use this token on partial continuations.";

    const continuedUserText =
      `${userTextWithContext}\n\nContinue the answer from where you left off. ` +
      "Add further important details or sections that you didn't reach yet.";

    let more = await llmChatReply({
      chatId,
      userText: continuedUserText,
      systemPrompt: continuedSystemPrompt,
      model,
    });

    let finished = false;
    if (typeof more === "string" && more.includes("END_OF_ANSWER")) {
      finished = true;
      // Strip the marker from the visible text
      more = more.replace(/END_OF_ANSWER\s*$/g, "").replace(/END_OF_ANSWER/g, "").trimEnd();
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const rawOutput =
      more && more.trim()
        ? more.slice(0, 3600)
        : "_No further details were generated._";
    const formatted = convertToTelegramHTML(rawOutput);
    const htmlModeLabel = modeLabel
      ? modeLabel.replace(/\*([^*]+)\*/g, "<b>$1</b>").replace(/_([^_]+)_/g, "<i>$1</i>")
      : "";

    // Offer another Continue button only if the model did NOT signal completion.
    // We rely on the END_OF_ANSWER marker instead of length heuristics.
    let replyMarkup;
    if (!finished) {
      const newKey = makeId(8);
      dmContinueCache.set(newKey, {
        userId: entry.userId,
        chatId,
        model,
        systemPrompt,
        userTextWithContext,
        modeLabel,
        sourcesHtml,
        createdAt: Date.now(),
      });
      replyMarkup = new InlineKeyboard().text("➡️ Continue", `dm_ai_cont:${newKey}`);
    }

    const replyText =
      `${htmlModeLabel}${formatted}` +
      (sourcesHtml || "") +
      `\n\n<i>⚡ ${elapsed}s • ${model}${finished ? " • end" : ""}</i>`;

    await ctx.api.editMessageText(chatId, statusMsg.message_id, replyText, {
      parse_mode: "HTML",
      reply_markup: replyMarkup,
    });
  } catch (e) {
    console.error("DM AI-continue error:", e);
    try {
      await ctx.api.editMessageText(
        chatId,
        statusMsg.message_id,
        "❌ <i>Error while continuing. Try again.</i>",
        { parse_mode: "HTML" }
      );
    } catch {
      // ignore
    }
  }
});

// Original menu_register handler
bot.callbackQuery("menu_register", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const u = ctx.from;
  if (!u?.id) return ctx.answerCallbackQuery({ text: "No user id.", show_alert: true });
  
  const existing = getUserRecord(u.id);
  if (!existing) registerUser(u);
  
  await ctx.answerCallbackQuery({ text: existing ? "✅ Already registered!" : "✅ Registered!" });
  
  // Update the main menu to show new status
  try {
    await ctx.editMessageText(buildMainMenuMessage(ctx.from.id), {
      parse_mode: "Markdown",
      reply_markup: mainMenuKeyboard(ctx.from.id)
    });
  } catch (e) {
    // If edit fails, ignore
  }
});

// Toggle web search setting
bot.callbackQuery("toggle_websearch", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const userId = ctx.from.id;
  const user = getUserRecord(userId);
  
  if (!user) {
    return ctx.answerCallbackQuery({ text: "Please register first!", show_alert: true });
  }
  
  // Toggle the setting
  const newValue = !user.webSearch;
  usersDb.users[String(userId)].webSearch = newValue;
  saveUsers();
  
  await ctx.answerCallbackQuery({ 
    text: newValue ? "🌐 Web Search ON - All messages will include web results!" : "🔍 Web Search OFF - Auto-detect mode",
    show_alert: false
  });
  
  // Update the menu to show new toggle state
  try {
    await ctx.editMessageText(buildMainMenuMessage(userId), {
      parse_mode: "Markdown",
      reply_markup: mainMenuKeyboard(userId)
    });
  } catch (e) {
    // If edit fails, ignore
  }
});


