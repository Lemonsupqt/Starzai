/**
 * commands/basic.js
 * Auto-extracted from index.js
 */

// =====================
// COMMANDS
// Lines 4290-4955 from original index.js
// =====================

  
  kb.text("🆓 Free Models", "setmenu:free").row();
  
  if (tier === "premium" || tier === "ultra") {
    kb.text("⭐ Premium Models", "setmenu:premium").row();
  }
  
  if (tier === "ultra") {
    kb.text("💎 Ultra Models", "setmenu:ultra").row();
  }
  
  kb.text("❌ Close", "setmenu:close");
  
  return kb;
}

// Category submenu - shows models in a category with pagination (4 per page)
function settingsCategoryKeyboard(category, userId, currentModel, page = 0) {
  const kb = new InlineKeyboard();
  const user = getUserRecord(userId);
  const tier = user?.tier || "free";
  
  let models = [];
  if (category === "free") models = [...FREE_MODELS, ...GITHUB_FREE_MODELS];
  else if (category === "premium" && (tier === "premium" || tier === "ultra")) models = [...PREMIUM_MODELS, ...GITHUB_PREMIUM_MODELS];
  else if (category === "ultra" && tier === "ultra") models = [...ULTRA_MODELS, ...GITHUB_ULTRA_MODELS];
  
  const MODELS_PER_PAGE = 4;
  const totalPages = Math.ceil(models.length / MODELS_PER_PAGE);
  const startIdx = page * MODELS_PER_PAGE;
  const pageModels = models.slice(startIdx, startIdx + MODELS_PER_PAGE);
  
  // Show models (4 per page, 1 per row for clean mobile display)
  pageModels.forEach((m) => {
    const mShort = m.split("/").pop();
    const isSelected = m === currentModel;
    const label = isSelected ? `✅ ${mShort}` : mShort;
    kb.text(label, `setmodel:${m}`).row();
  });
  
  // Pagination row
  if (totalPages > 1) {
    const navRow = [];
    if (page > 0) {
      kb.text("◀️", `setpage:${category}:${page - 1}`);
    }
    kb.text(`${page + 1}/${totalPages}`, "noop");
    if (page < totalPages - 1) {
      kb.text("▶️", `setpage:${category}:${page + 1}`);
    }
    kb.row();
  }
  
  kb.text("⬅️ Back", "setmenu:back");
  
  return kb;
}



// Inline settings keyboard - shows model categories
function inlineSettingsCategoryKeyboard(sessionKey, userId) {
  const kb = new InlineKeyboard();
  const user = getUserRecord(userId);
  const tier = user?.tier || "free";
  
  // Show categories based on user tier
  kb.text("🆓 Free Models", `iset_cat:free:${sessionKey}`);
  kb.row();
  
  if (tier === "premium" || tier === "ultra") {
    kb.text("⭐ Premium Models", `iset_cat:premium:${sessionKey}`);
    kb.row();
  }
  
  if (tier === "ultra") {
    kb.text("💎 Ultra Models", `iset_cat:ultra:${sessionKey}`);
    kb.row();
  }
  
  return kb;
}

// Inline settings - model list for a category with pagination (4 per page)
function inlineSettingsModelKeyboard(category, sessionKey, userId, page = 0) {
  const kb = new InlineKeyboard();
  const user = getUserRecord(userId);
  const currentModel = user?.model || "";
  
  let models = [];
  if (category === "free") models = [...FREE_MODELS, ...GITHUB_FREE_MODELS];
  else if (category === "premium") models = [...PREMIUM_MODELS, ...GITHUB_PREMIUM_MODELS];
  else if (category === "ultra") models = [...ULTRA_MODELS, ...GITHUB_ULTRA_MODELS];
  
  const MODELS_PER_PAGE = 4;
  const totalPages = Math.ceil(models.length / MODELS_PER_PAGE);
  const startIdx = page * MODELS_PER_PAGE;
  const pageModels = models.slice(startIdx, startIdx + MODELS_PER_PAGE);
  
  // Show models (4 per page, 1 per row for clean mobile display)
  pageModels.forEach((m) => {
    const mShort = m.split("/").pop();
    const isSelected = m === currentModel;
    const label = isSelected ? `✅ ${mShort}` : mShort;
    kb.text(label, `iset_model:${m}:${sessionKey}`).row();
  });
  
  // Pagination row
  if (totalPages > 1) {
    if (page > 0) {
      kb.text("◀️", `iset_page:${category}:${page - 1}:${sessionKey}`);
    }
    kb.text(`${page + 1}/${totalPages}`, "noop");
    if (page < totalPages - 1) {
      kb.text("▶️", `iset_page:${category}:${page + 1}:${sessionKey}`);
    }
    kb.row();
  }
  
  // Back button
  kb.text("← Back", `iset_back:${sessionKey}`);
  
  return kb;
}

// =====================
// COMMANDS
// =====================
bot.command("start", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  if (!(await enforceCommandCooldown(ctx))) return;
  ensureUser(ctx.from.id, ctx.from);

  const chatType = ctx.chat.type;

  // Deep-link handling in private chat, e.g. /start group_-100123...
  if (chatType === "private") {
    const text = ctx.message.text || "";
    const args = text.split(" ").slice(1);
    const param = args[0];

    if (param && param.startsWith("group_")) {
      const groupId = param.slice("group_".length);
      const u = ctx.from;
      if (u?.id) {
        pendingFeedback.set(String(u.id), {
          createdAt: Date.now(),
          source: "group_unauthed",
          groupId,
        });
      }

      await ctx.reply(
        "💡 *Feedback Mode* (group)\\n\\n" +
          `We detected this group ID: \`${groupId}\`.\\n\\n` +
          "Please send *one message* describing the problem (for example why you want it authorized).\\n" +
          "You can attach *one photo or video* with a caption, or just send text.\\n\\n" +
          "_You have 2 minutes. After that, feedback mode will expire._",
        {
          parse_mode: "Markdown",
          reply_to_message_id: ctx.message?.message_id,
        }
      );
      return;
    }

    // Handle feedback deep link
    if (param === "feedback") {
      if (!FEEDBACK_CHAT_ID) {
        return ctx.reply("⚠️ Feedback is not configured yet. Please try again later.", {
          reply_to_message_id: ctx.message?.message_id,
        });
      }
      
      const u = ctx.from;
      if (!u?.id) return;
      
      pendingFeedback.set(String(u.id), { createdAt: Date.now(), source: "deeplink" });
      return ctx.reply(
        "💡 *Feedback Mode*\\n\\n" +
          "Please send *one message* with your feedback.\\n" +
          "You can attach *one photo or video* with a caption, or just send text.\\n\\n" +
          "_You have 2 minutes. After that, feedback mode will expire._",
        {
          parse_mode: "Markdown",
          reply_to_message_id: ctx.message?.message_id,
        }
      );
    }
  }

  await ctx.reply(buildMainMenuMessage(ctx.from.id), {
    parse_mode: "Markdown",
    reply_markup: mainMenuKeyboard(ctx.from.id),
    reply_to_message_id: ctx.message?.message_id,
  });
});

bot.command("help", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  if (!(await enforceCommandCooldown(ctx))) return;
  ensureUser(ctx.from.id, ctx.from);
  
  await ctx.reply(buildMainMenuMessage(ctx.from.id), {
    parse_mode: "Markdown",
    reply_markup: mainMenuKeyboard(ctx.from.id),
    reply_to_message_id: ctx.message?.message_id,
  });
});

// /search command - Web search (counts against daily websearch quota)
bot.command("search", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  if (!(await enforceCommandCooldown(ctx))) return;
  ensureUser(ctx.from.id, ctx.from);
  
  const query = ctx.message.text.replace(/^\/search\s*/i, "").trim();
  
  if (!query) {
    return ctx.reply("🔍 <b>Web Search</b>\\n\\nUsage: <code>/search your query here</code>\\n\\nExample: <code>/search latest AI news</code>", {
      parse_mode: "HTML",
      reply_to_message_id: ctx.message?.message_id,
    });
  }
  
  const statusMsg = await ctx.reply(`🔍 Searching for: <i>${escapeHTML(query)}</i>...`, {
    parse_mode: "HTML",
    reply_to_message_id: ctx.message?.message_id,
  });
  
  try {
    const quota = consumeWebsearchQuota(ctx.from.id);
    if (!quota.allowed) {
      const user = getUserRecord(ctx.from.id);
      const tierLabel = (user?.tier || "free").toUpperCase();
      const limit = quota.limit ?? 0;
      const used = quota.used ?? limit;
      const msg =
        `🌐 <b>Daily websearch limit reached</b>\\n\\n` +
        `Tier: <b>${escapeHTML(tierLabel)}</b>\\n` +
        `Today: <b>${used}/${limit}</b> websearches used.\\n\\n` +
        `<i>Try again tomorrow or upgrade your plan for more websearches.</i>`;
      await ctx.api.editMessageText(ctx.chat.id, statusMsg.message_id, msg, {
        parse_mode: "HTML",
      });
      return;
    }

    const searchResult = await webSearch(query, 5);
    
    if (!searchResult.success) {
      return ctx.api.editMessageText(ctx.chat.id, statusMsg.message_id, 
        `❌ Search failed: ${escapeHTML(searchResult.error)}`, 
        { parse_mode: "HTML" });
    }
    
    // Format results for display
    let response = `🔍 <b>Search Results for:</b> <i>${escapeHTML(query)}</i>\\n\\n`;
    
    searchResult.results.forEach((r, i) => {
      response += `<b>${i + 1}. ${escapeHTML(r.title)}</b>\\n`;
      response += `<a href="${r.url}">${escapeHTML(r.url.slice(0, 50))}${r.url.length > 50 ? '...' : ''}</a>\\n`;
      response += `${escapeHTML(r.content.slice(0, 150))}${r.content.length > 150 ? '...' : ''}\\n\\n`;
    });
    
    response += `<i>🌐 via ${searchResult.instance.replace('https://', '')}</i>`;
    
    await ctx.api.editMessageText(ctx.chat.id, statusMsg.message_id, response, { 
      parse_mode: "HTML",
      disable_web_page_preview: true 
    });
    
    trackUsage(ctx.from.id, "message");
    
  } catch (e) {
    console.error("Search error:", e);
    await ctx.api.editMessageText(ctx.chat.id, statusMsg.message_id, 
      `❌ Search error: ${escapeHTML(e.message?.slice(0, 100) || 'Unknown error')}`, 
      { parse_mode: "HTML" });
  }
});

// /websearch command - Search and get AI summary (uses daily websearch quota)
bot.command("websearch", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  if (!(await enforceCommandCooldown(ctx))) return;
  ensureUser(ctx.from.id, ctx.from);
  
  const query = ctx.message.text.replace(/^\/websearch\s*/i, "").trim();
  
  if (!query) {
    return ctx.reply(
      "🔍 <b>AI Web Search</b>\\n\\nUsage: <code>/websearch your question</code>\\n\\nSearches the web and gives you an AI-summarized answer.\\n\\nExample: <code>/websearch What's the latest news about Tesla?</code>",
      {
        parse_mode: "HTML",
        reply_to_message_id: ctx.message?.message_id,
      }
    );
  }
  
  const statusMsg = await ctx.reply(
    `🔍 Searching and analyzing: <i>${escapeHTML(query)}</i>...`,
    {
      parse_mode: "HTML",
      reply_to_message_id: ctx.message?.message_id,
    }
  );
  
  try {
    const model = ensureChosenModelValid(ctx.from.id);
    const quota = consumeWebsearchQuota(ctx.from.id);
    const startTime = Date.now();

    // If quota is exhausted, fall back to an offline-style answer without live web results
    if (!quota.allowed) {
      const offlineResponse = await llmText({
        model,
        messages: [
          {
            role: "system",
            content:
              "You are a helpful assistant. You do NOT have access to live web search for this request. " +
              "Answer based on your existing knowledge only. If you are unsure or information may be outdated, say so clearly."
          },
          {
            role: "user",
            content: `Question (no live websearch available): ${query}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 800,
      });

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const aiText = offlineResponse || "";

      let response = `🔍 <b>AI Web Search</b>\n\n`;
      response += `<b>Query:</b> <i>${escapeHTML(query)}</i>\n\n`;
      response += convertToTelegramHTML(aiText.slice(0, 3500));
      response += `\n\n<i>⚠️ Daily websearch limit reached — answered without live web results • ${elapsed}s • ${escapeHTML(model)}</i>`;

      await ctx.api.editMessageText(ctx.chat.id, statusMsg.message_id, response, {
        parse_mode: "HTML",
        disable_web_page_preview: true,
      });

      trackUsage(ctx.from.id, "message");
      return;
    }

    // Search the web (quota available)
    const searchResult = await webSearch(query, 5);
    
    if (!searchResult.success) {
      return ctx.api.editMessageText(
        ctx.chat.id,
        statusMsg.message_id, 
        `❌ Search failed: ${escapeHTML(searchResult.error)}`, 
        { parse_mode: "HTML" }
      );
    }
    
    await ctx.api.editMessageText(
      ctx.chat.id,
      statusMsg.message_id, 
      `🔍 Found ${searchResult.results.length} results, analyzing with AI...`, 
      { parse_mode: "HTML" }
    );
    
    // Format search results for AI
    const searchContext = formatSearchResultsForAI(searchResult);
    
    // Get AI to summarize
    const aiResponse = await llmText({
      model,
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant with access to real-time web search results.\n" +
            "\n" +
            "CRITICAL CITATION INSTRUCTIONS:\n" +
            "• Every non-obvious factual claim should be backed by a source index like [1], [2], etc.\n" +
            "• When you summarize multiple sources, include multiple indices, e.g. [1][3].\n" +
            "• If you mention a specific number, date, name, or quote, always attach the source index.\n" +
            "• Never invent citations; only use indices that exist in the search results.\n" +
            "\n" +
            "GENERAL STYLE:\n" +
            "• Use short paragraphs and bullet points so the answer is easy to scan.\n" +
            "• Make it clear which parts come from which sources via [index] references.\n" +
            "• For short verbatim excerpts (1–2 sentences), use quote blocks (lines starting with '>').\n" +
            "• If the search results don't contain relevant information, say so explicitly."
        },
        {
          role: "user",
          content:
            `${searchContext}\n\n` +
            `User's question: ${query}\n\n` +
            "The numbered search results above are your ONLY sources of truth. " +
            "Write an answer that:\n" +
            "1) Directly answers the user's question, and\n" +
            "2) Explicitly cites sources using [1], [2], etc next to the claims.\n" +
            "Do not cite sources that are not provided."
        }
      ],
      temperature: 0.6,
      max_tokens: 800
    });
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    
    let aiText = aiResponse || "";
    aiText = linkifyWebsearchCitations(aiText, searchResult);
    
    let response = `🔍 <b>AI Web Search</b>\n\n`;
    response += `<b>Query:</b> <i>${escapeHTML(query)}</i>\n\n`;
    response += convertToTelegramHTML(aiText.slice(0, 3500));
    response += buildWebsearchSourcesHtml(searchResult, ctx.from.id);
    response += `\n\n<i>🌐 ${searchResult.results.length} sources • ${elapsed}s • ${escapeHTML(model)}</i>`;
    
    await ctx.api.editMessageText(ctx.chat.id, statusMsg.message_id, response, { 
      parse_mode: "HTML",
      disable_web_page_preview: true 
    });
    
    trackUsage(ctx.from.id, "message");
    
  } catch (e) {
    console.error("Websearch error:", e);
    await ctx.api.editMessageText(
      ctx.chat.id,
      statusMsg.message_id, 
      `❌ Error: ${escapeHTML(e.message?.slice(0, 100) || "Unknown error")}`, 
      { parse_mode: "HTML" }
    );
  }
});

// /extract command - Extract content from a specific URL using an external Extract API
bot.command("extract", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  if (!(await enforceCommandCooldown(ctx))) return;
  ensureUser(ctx.from.id, ctx.from);

  const full = ctx.message.text.replace(/^\/extract\s*/i, "").trim();

  if (!full) {
    const help = [
      "🧲 <b>Extract content from a URL</b>",
      "",
      "Usage:",
      "<code>/extract https://example.com/article</code>",
      "<code>/extract https://example.com/article What are the main points?</code>",
      "",
      "The bot fetches the page via an Extract API, pulls the important content,",
      "and (optionally) answers your question about it."
    ].join("\\n");
    return ctx.reply(help, {
      parse_mode: "HTML",
      reply_to_message_id: ctx.message?.message_id,
    });
  }

  if (!PARALLEL_API_KEY) {
    return ctx.reply(
      "⚠️ Extract API is not configured yet. Set the appropriate API key in env to enable it.",
      {
        parse_mode: "HTML",
        reply_to_message_id: ctx.message?.message_id,
      }
    );
  }

  // Split into URL + optional question
  const parts = full.split(/\s+/);
  const url = parts.shift();
  const question = parts.join(" ").trim();

  if (!url || !/^https?:\/\//i.test(url)) {
    return ctx.reply(
      "❌ Please provide a valid URL.\\nExample: <code>/extract https://example.com/article</code>",
      {
        parse_mode: "HTML",
        reply_to_message_id: ctx.message?.message_id,
      }
    );
  }

  const statusMsg = await ctx.reply(
    `🧲 Extracting content from: <a href="${escapeHTML(url)}">${escapeHTML(url.slice(0, 60))}${url.length > 60 ? "..." : ""}</a>`,
    {
      parse_mode: "HTML",
      disable_web_page_preview: true,
      reply_to_message_id: ctx.message?.message_id,
    }
  );

  try {
    // Extract full content for this URL
    const extractResult = await parallelExtractUrls(url);

    if (!extractResult.success || !extractResult.results || extractResult.results.length === 0) {
      const msg = extractResult.error
        ? `❌ Extract failed: ${escapeHTML(extractResult.error)}`
        : "❌ Extract failed: no content returned.";
      await ctx.api.editMessageText(ctx.chat.id, statusMsg.message_id, msg, {
        parse_mode: "HTML",
      });
      return;
    }

    const first = extractResult.results[0];
    const pageTitle = first.title || url;
    const pageContent = first.content || "";

    // If user didn't ask a question, just summarize the page
    const userQuestion = question || "Summarize the main points of this page.";

    const model = ensureChosenModelValid(ctx.from.id);
    const startTime = Date.now();

    const prompt = [
      `You are a helpful assistant. You are given content extracted from a single web page.`,
      `Answer the user's request using ONLY this content. If something is not in the content, say you don't know.`,
      ``,
      `Page URL: ${url}`,
      `Page title: ${pageTitle}`,
      ``,
      `--- START OF EXTRACTED CONTENT ---`,
      pageContent.slice(0, 8000),
      `--- END OF EXTRACTED CONTENT ---`,
      ``,
      `User request: ${userQuestion}`,
    ].join("\n");

    const answer = await llmText({
      model,
      messages: [
        { role: "system", content: "You answer questions based only on the provided page content." },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 800,
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const safeTitle = escapeHTML(pageTitle);

    let response = `🧲 <b>Extracted from:</b> <a href="${escapeHTML(url)}">${safeTitle}</a>\n\n`;
    response += convertToTelegramHTML((answer || "").slice(0, 3500));
    response += `\n\n<i>🔗 Extract • ${elapsed}s • ${escapeHTML(model)}</i>`;

    await ctx.api.editMessageText(ctx.chat.id, statusMsg.message_id, response, {
      parse_mode: "HTML",
      disable_web_page_preview: false,
    });

    trackUsage(ctx.from.id, "message");
  } catch (e) {
    console.error("Extract command error:", e);
    await ctx.api.editMessageText(
      ctx.chat.id,
      statusMsg.message_id,
      `❌ Error while extracting: ${escapeHTML(e.message?.slice(0, 120) || "Unknown error")}`,
      { parse_mode: "HTML" }
    );
  }
});

bot.command("register", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  if (!(await enforceCommandCooldown(ctx))) return;

  const u = ctx.from;
  if (!u?.id) {
    return ctx.reply("Could not get your user info.", {
      reply_to_message_id: ctx.message?.message_id,
    });
  }

  if (getUserRecord(u.id)) {
    return ctx.reply("✅ You're already registered.", {
      reply_markup: helpKeyboard(),
      reply_to_message_id: ctx.message?.message_id,
    });
  }

  registerUser(u);
  await ctx.reply("✅ Registered! Use /model to choose models.", {
    reply_markup: helpKeyboard(),
    reply_to_message_id: ctx.message?.message_id,
  });
});

bot.command("reset", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  if (!(await enforceCommandCooldown(ctx))) return;
  chatHistory.delete(ctx.chat.id);
  await ctx.reply("Done. Memory cleared for this chat.", {
    reply_to_message_id: ctx.message?.message_id,
  });
});

// Group activation commands
bot.command("stop", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  if (!(await enforceCommandCooldown(ctx))) return;

  if (ctx.chat.type === "private") {
    return ctx.reply("ℹ️ This command is for group chats. In DMs, I'm always listening!", {
      reply_to_message_id: ctx.message?.message_id,
    });
  }
  
  deactivateGroup(ctx.chat.id);
  await ctx.reply("🚫 Bot is now dormant. Mention me or reply to wake me up!", {
    parse_mode: "HTML",
    reply_to_message_id: ctx.message?.message_id,
  });
});

bot.command("talk", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  if (!(await enforceCommandCooldown(ctx))) return;

  if (ctx.chat.type === "private") {
    return ctx.reply("ℹ️ This command is for group chats. In DMs, I'm always listening!", {
      reply_to_message_id: ctx.message?.message_id,
    });
  }
  
  activateGroup(ctx.chat.id);
  const remaining = getGroupActiveRemaining(ctx.chat.id);
  await ctx.reply(
    `✅ Bot is now active! I'll respond to all messages for ${Math.ceil(remaining / 60)} minutes.\n\nUse /stop to make me dormant again.`,
    {
      parse_mode: "HTML",
      reply_to_message_id: ctx.message?.message_id,
    }
  );
});

// /feedback - entrypoint for feedback flow (DM only)
bot.command("feedback", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  if (!(await enforceCommandCooldown(ctx))) return;

  if (!FEEDBACK_CHAT_ID) {
    return ctx.reply("⚠️ Feedback is not configured yet. Please try again later.", {
      reply_to_message_id: ctx.message?.message_id,
    });
  }
  if (ctx.chat.type !== "private") {
    return ctx.reply("💡 Please send feedback in a private chat with me.", {
      reply_to_message_id: ctx.message?.message_id,
    });
  }

  const u = ctx.from;
  if (!u?.id) return;

  pendingFeedback.set(String(u.id), { createdAt: Date.now(), source: "command" });
  await ctx.reply(
    "💡 *Feedback Mode*\\n\\n" +
      "Please send *one message* with your feedback.\\n" +
      "You can attach *one photo or video* with a caption, or just send text.\\n\\n" +

