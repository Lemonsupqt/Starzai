/**
 * features/video.js
 * Auto-extracted from index.js
 */

// =====================
// VIDEO SUMMARIZATION
// Lines 14889-15309 from original index.js
// =====================

  await ctx.answerCallbackQuery();
  
  const categoryNames = { free: "🆓 Free", premium: "⭐ Premium", ultra: "💎 Ultra" };
  
  try {
    await ctx.editMessageText(
      `⚙️ *${categoryNames[category]} Models*\n\nCurrent: \`${shortModel}\`\n\nSelect a model:`,
      { 
        parse_mode: "Markdown",
        reply_markup: settingsCategoryKeyboard(category, userId, currentModel, page)
      }
    );
  } catch (e) {
    console.error("Edit settings error:", e.message);
  }
});

// Noop handler for page indicator button
bot.callbackQuery(/^noop$/, async (ctx) => {
  await ctx.answerCallbackQuery();
});

// =====================
// SHARED CHAT CALLBACKS (Multi-user inline chat)
// Now uses switch_inline_query_current_chat - no DM needed!
// =====================

// Page navigation (legacy Yap shared chat - now disabled)
bot.callbackQuery(/^schat_page:(.+):(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery({
    text: "Yap (shared chat) mode has been removed. Use inline modes like q:, b:, code:, e:, sum:, or p: instead.",
    show_alert: true,
  });
});

// Noop for page indicator button (doesn't count towards rate limit)
bot.callbackQuery(/^schat_noop$/, async (ctx) => {
  await ctx.answerCallbackQuery();
});

// Ask AI - legacy Yap input (now disabled)
bot.callbackQuery(/^schat_ask:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery({
    text: "Yap (shared chat) mode has been removed. Use inline modes like q:, b:, code:, e:, sum:, or p: instead.",
    show_alert: true,
  });
});

// Refresh shared chat display (legacy Yap - now disabled)
bot.callbackQuery(/^schat_refresh:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery({
    text: "Yap (shared chat) mode has been removed.",
    show_alert: true,
  });
});

// Clear shared chat (legacy Yap - now disabled)
bot.callbackQuery(/^schat_clear:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery({
    text: "Yap (shared chat) mode has been removed.",
    show_alert: true,
  });
});

// =====================
// INLINE SETTINGS CALLBACKS
// =====================

// Category selection - show models for that category
bot.callbackQuery(/^iset_cat:(.+):(.+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const userId = ctx.from?.id;
  if (!userId) return ctx.answerCallbackQuery({ text: "Error", show_alert: true });
  
  const parts = ctx.callbackQuery.data.split(":");
  const category = parts[1];
  const sessionKey = parts[2];
  
  const user = getUserRecord(userId);
  const tier = user?.tier || "free";
  
  // Check if user has access to this category
  if (category === "premium" && tier === "free") {
    return ctx.answerCallbackQuery({ text: "🔒 Premium required!", show_alert: true });
  }
  if (category === "ultra" && tier !== "ultra") {
    return ctx.answerCallbackQuery({ text: "🔒 Ultra required!", show_alert: true });
  }
  
  const categoryEmoji = category === "free" ? "🆓" : category === "premium" ? "⭐" : "💎";
  const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
  
  await ctx.answerCallbackQuery({ text: `${categoryEmoji} ${categoryName} Models` });
  
  try {
    await ctx.editMessageText(
      `⚙️ *${categoryEmoji} ${categoryName} Models*\n\n🤖 Current: \`${user?.model || "none"}\`\n\nSelect a model:`,
      { 
        parse_mode: "Markdown",
        reply_markup: inlineSettingsModelKeyboard(category, sessionKey, userId)
      }
    );
  } catch (e) {
    console.error("Edit message error:", e.message);
  }
});

// Model selection - set the model
bot.callbackQuery(/^iset_model:(.+):(.+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const userId = ctx.from?.id;
  if (!userId) return ctx.answerCallbackQuery({ text: "Error", show_alert: true });
  
  const data = ctx.callbackQuery.data;
  // Parse: iset_model:model_name:sessionKey
  const firstColon = data.indexOf(":");
  const lastColon = data.lastIndexOf(":");
  const model = data.slice(firstColon + 1, lastColon);
  const sessionKey = data.slice(lastColon + 1);
  
  const user = getUserRecord(userId);
  if (!user) {
    return ctx.answerCallbackQuery({ text: "User not found. Use /start first!", show_alert: true });
  }
  
  // Check if user can use this model
  const allowed = allModelsForTier(user.tier);
  if (!allowed.includes(model)) {
    return ctx.answerCallbackQuery({ text: "🔒 You don't have access to this model!", show_alert: true });
  }
  
  // Set the model
  user.model = model;
  saveUsers();
  
  // Also update inline session
  updateInlineSession(userId, { model });
  
  const shortName = model.split("/").pop();
  await ctx.answerCallbackQuery({ text: `✅ Switched to ${shortName}!` });
  
  try {
    await ctx.editMessageText(
      `✅ *Model Changed!*\n\n🤖 Now using: \`${model}\`\n\n_Your new model is ready to use!_`,
      { 
        parse_mode: "Markdown",
        reply_markup: new InlineKeyboard().text("← Back to Categories", `iset_back:${sessionKey}`)
      }
    );
  } catch (e) {
    console.error("Edit message error:", e.message);
  }
});

// Back to categories
bot.callbackQuery(/^iset_back:(.+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const userId = ctx.from?.id;
  if (!userId) return ctx.answerCallbackQuery({ text: "Error", show_alert: true });
  
  const sessionKey = ctx.callbackQuery.data.split(":")[1];
  const user = getUserRecord(userId);
  const model = user?.model || "gpt-4o-mini";
  
  await ctx.answerCallbackQuery();
  
  try {
    await ctx.editMessageText(
      `⚙️ *Model Settings*\n\n🤖 Current: \`${model}\`\n\nSelect a category to change model:`,
      { 
        parse_mode: "Markdown",
        reply_markup: inlineSettingsCategoryKeyboard(sessionKey, userId)
      }
    );
  } catch (e) {
    console.error("Edit message error:", e.message);
  }
});

// Handle pagination for inline model selection
bot.callbackQuery(/^iset_page:(.+):(\d+):(.+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const userId = ctx.from?.id;
  if (!userId) return ctx.answerCallbackQuery({ text: "Error", show_alert: true });
  
  const [, category, pageStr, sessionKey] = ctx.callbackQuery.data.match(/^iset_page:(.+):(\d+):(.+)$/);
  const page = parseInt(pageStr, 10);
  const user = getUserRecord(userId);
  
  const categoryEmoji = category === "free" ? "🆓" : category === "premium" ? "⭐" : "💎";
  const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
  
  await ctx.answerCallbackQuery();
  
  try {
    await ctx.editMessageText(
      `⚙️ *${categoryEmoji} ${categoryName} Models*\n\n🤖 Current: \`${user?.model || "none"}\`\n\nSelect a model:`,
      { 
        parse_mode: "Markdown",
        reply_markup: inlineSettingsModelKeyboard(category, sessionKey, userId, page)
      }
    );
  } catch (e) {
    console.error("Edit message error:", e.message);
  }
});

// =====================
// WEBAPP DATA HANDLER
// =====================
bot.on("message:web_app_data", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  try {
    const data = JSON.parse(ctx.message.web_app_data.data);
    const { mode, modeName, query, fullQuery } = data;
    
    console.log(`WebApp data from ${userId}: mode=${mode}, query=${query}`);
    
    if (!mode || !query) {
      return ctx.reply("⚠️ Invalid data from WebApp");
    }
    
    // Get user's model
    const model = ensureChosenModelValid(userId);
    const shortModel = model.split("/").pop();
    
    // Send processing message
    const processingMsg = await ctx.reply(`⏳ Processing ${modeName} request...`);
    
    // Handle different modes
    let systemPrompt = "You are a helpful AI assistant.";
    let maxTokens = 500;
    let temperature = 0.7;
    
    switch (mode) {
      case "q:":
        systemPrompt = "Give extremely concise answers. 1-2 sentences max. Be direct and to the point.";
        maxTokens = 150;
        temperature = 0.5;
        break;
      case "b:":
        systemPrompt = "You are a research expert. Provide comprehensive, well-structured analysis with multiple perspectives. Include key facts, implications, and nuances.";
        maxTokens = 800;
        break;
      case "code:":
        systemPrompt = "You are a programming expert. Provide clear, working code with explanations. Use proper formatting.";
        maxTokens = 600;
        break;
      case "e:":
        systemPrompt = "Explain concepts simply, like teaching a beginner. Use analogies and examples.";
        maxTokens = 400;
        break;
      case "sum:":
        systemPrompt = "Summarize the following text concisely, keeping the key points.";
        maxTokens = 300;
        break;
      case "r:":
        systemPrompt = "You are a research assistant. Give a concise but informative answer in 2-3 paragraphs.";
        maxTokens = 400;
        break;
    }
    
    // Handle character mode specially
    if (mode === "as ") {
      systemPrompt = `You are roleplaying as ${query}. Stay completely in character throughout. Respond as ${query} would - use their speech patterns, vocabulary, mannerisms, and personality.`;
      
      const response = await llmText({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Hello! Introduce yourself briefly." },
        ],
        temperature: 0.8,
        max_tokens: 300,
      });
      
      const formattedResponse = convertToTelegramHTML(response || "*stays in character*");
      
      await ctx.api.editMessageText(
        ctx.chat.id,
        processingMsg.message_id,
        `🎭 <b>Character: ${escapeHTML(query)}</b>\n\n${formattedResponse}\n\n<i>via StarzAI • ${shortModel}</i>`,
        { parse_mode: "HTML" }
      );
      return;
    }
    
    // Handle partner mode
    if (mode === "p:") {
      const partner = getPartner(userId);
      if (!partner) {
        await ctx.api.editMessageText(
          ctx.chat.id,
          processingMsg.message_id,
          "⚠️ You don't have a partner set up yet! Use /partner in DM to create one."
        );
        return;
      }
      systemPrompt = buildPartnerSystemPrompt(partner);
    }
    
    // Get AI response
    const response = await llmText({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: query },
      ],
      temperature,
      max_tokens: maxTokens,
    });
    
    const formattedResponse = convertToTelegramHTML(response || "No response generated.");
    const modeEmoji = {
      "q:": "⭐", "b:": "🗿🔬", "code:": "💻", "e:": "🧠",
      "sum:": "📝", "r:": "🔍", "p:": "🤝🏻"
    };
    
    await ctx.api.editMessageText(
      ctx.chat.id,
      processingMsg.message_id,
      `${modeEmoji[mode] || "✨"} <b>${modeName}: ${escapeHTML(query.slice(0, 50))}${query.length > 50 ? "..." : ""}</b>\n\n${formattedResponse}\n\n<i>via StarzAI • ${shortModel}</i>`,
      { parse_mode: "HTML" }
    );
    
  } catch (e) {
    console.error("WebApp data error:", e);
    await ctx.reply(`⚠️ Error processing request: ${e.message}`);
  }
});

// =====================
// DM / GROUP TEXT
// =====================

// Track processing messages to prevent duplicates
const processingMessages = new Map(); // chatId:messageId -> timestamp

bot.on("message:text", async (ctx) => {
  const chat = ctx.chat;
  const u = ctx.from;
  const msg = ctx.message;
  const text = (msg?.text || "").trim();
  const messageId = msg?.message_id;
  
  // Debug logging
  console.log(`[MSG] User ${u?.id} in ${chat?.type} (${chat?.id}): "${text?.slice(0, 50)}"`);
  
  if (!(await enforceRateLimit(ctx))) {
    console.log(`[MSG] Rate limited: ${u?.id}`);
    return;
  }

  if (!text || !u?.id) {
    console.log(`[MSG] Empty text or no user ID`);
    return;
  }
  
  // Anti-spam check
  if (!(await checkAntiSpam(ctx, text))) {
    console.log(`[MSG] Spam detected: ${u?.id}`);
    return;
  }

  // Ignore commands
  if (text.startsWith("/")) {
    console.log(`[MSG] Ignoring command: ${text}`);
    return;
  }

  // Auto-detect media links (YouTube, TikTok, Instagram, Twitter, Spotify)
  const detectedPlatform = detectPlatform(text);
  if (detectedPlatform && chat.type === "private") {
    console.log(`[MSG] Auto-detected ${detectedPlatform} link`);
    
    const urlMatch = text.match(/https?:\/\/[^\s]+/);
    if (urlMatch) {
      const url = urlMatch[0];
      const emoji = PLATFORM_EMOJI[detectedPlatform] || '📥';
      
      const kb = new InlineKeyboard()
        .text(`${emoji} Download Video`, `auto_dl:video:${encodeURIComponent(url)}`)
        .text(`🎵 Audio Only`, `auto_dl:audio:${encodeURIComponent(url)}`);
      
      await ctx.reply(
        `${emoji} <b>${detectedPlatform.charAt(0).toUpperCase() + detectedPlatform.slice(1)} link detected!</b>\n\nWhat would you like to download?`,
        { parse_mode: 'HTML', reply_markup: kb, reply_to_message_id: messageId }
      );
      return;
    }
  }

  // Ignore messages that are inline results sent via this bot (via_bot == this bot)
  // This prevents GC wake words like "Ai" inside inline answers from triggering the bot again.
  if (msg?.via_bot?.id && BOT_ID && msg.via_bot.id === BOT_ID) {
    console.log(`[MSG] Ignoring via_bot message from this bot in chat ${chat.id}`);
    return;
  }
  
  // Deduplicate - prevent processing same message twice
  const dedupeKey = `${chat.id}:${messageId}`;
  if (processingMessages.has(dedupeKey)) {
    console.log(`Skipping duplicate message: ${dedupeKey}`);
    return;
  }
  processingMessages.set(dedupeKey, Date.now());
  
  // Clean up old entries (older than 5 minutes)
  const fiveMinAgo = Date.now() - 5 * 60 * 1000;
  for (const [key, time] of processingMessages) {
    if (time < fiveMinAgo) processingMessages.delete(key);
  }


