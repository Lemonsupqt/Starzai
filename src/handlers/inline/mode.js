/**
 * handlers/inline/mode.js
 * Auto-extracted from index.js
 */

// =====================
// INLINE MODE - INTERACTIVE CHAT
// Lines 15310-18193 from original index.js
// =====================

// =====================
// INLINE MODE - INTERACTIVE CHAT
// =====================

// Helper to safely answer inline queries (handles expired query errors)
async function safeAnswerInline(ctx, results, options = {}) {
  try {
    return await ctx.answerInlineQuery(results, { cache_time: 0, is_personal: true, ...options });
  } catch (e) {
    // Ignore "query is too old" errors - these are normal when AI takes too long
    if (e.description?.includes("query is too old") || e.description?.includes("query ID is invalid")) {
      console.log(`Inline query expired (normal for slow responses): ${e.description}`);
      return; // Silently ignore
    }
    // Re-throw other errors
    throw e;
  }
}

bot.on("inline_query", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;

  const q = (ctx.inlineQuery.query || "").trim();
  const userId = ctx.from?.id;
  
  console.log(`Inline query from ${userId}: "${q}" (length: ${q.length})`);

  if (!userId) return;

  // Auto-register
  if (!getUserRecord(userId)) registerUser(ctx.from);

  const session = getInlineSession(userId);
  const model = session.model || ensureChosenModelValid(userId);
  const sessionKey = makeId(6);

  // Empty query - show main menu with Ask AI, Starz Check, Settings, Help cards
  if (!q || q.length === 0) {
    console.log("Showing main menu (empty query)");
    const shortModel = model.split("/").pop();
    
    // Get user's task counts for Starz Check card
    const userTodos = getUserTodos(userId);
    const personalPending = (userTodos.tasks || []).filter(t => !t.completed).length;
    const userCollabLists = getCollabListsForUser(userId);
    const collabCount = userCollabLists.length;
    
    // Original Ask AI card with mode buttons
    const askAiText = [
      "⚡ *StarzAI - Ask AI Modes*",
      "",
      "⭐ Quark - Quick answers",
      "🗿🔬 Blackhole - Deep research",
      "💻 Code - Programming help",
      "🧠 Explain - Simple explanations",
      "🎭 Character - Fun personas",
      "📝 Summarize - Condense text",
      "🤝🏻 Partner - Chat with your AI companion",
      "🌐 Websearch - Search the web with AI summary (`w:`)",
      "",
      "_Tap a button or type directly!_",
    ].join("\n");
    
    // Starz Check card - show tasks directly!
    const userTasks = userTodos.tasks || [];
    const streak = getCompletionStreak(userId);
    let starzCheckText = `✅ *Starz Check*`;
    if (streak > 0) starzCheckText += ` 🔥${streak}`;
    
    const results = [
      {
        type: "article",
        id: `ask_ai_${sessionKey}`,
        title: "⚡ Ask AI",
        description: "Quick • Deep • Code • Explain • Web • Character • Summarize",
        thumbnail_url: "https://img.icons8.com/fluency/96/lightning-bolt.png",
        input_message_content: { 
          message_text: askAiText,
          parse_mode: "Markdown"
        },
        reply_markup: new InlineKeyboard()
          .switchInlineCurrent("⭐ Quark", "q: ")
          .switchInlineCurrent("🗿🔬 Blackhole", "b: ")
          .row()
          .switchInlineCurrent("💻 Code", "code: ")
          .switchInlineCurrent("🧠 Explain", "e: ")
          .row()
          .switchInlineCurrent("🌐 Websearch", "w: ")
          .switchInlineCurrent("📝 Summarize", "sum: ")
          .row()
          .switchInlineCurrent("🎭 Character", "as ")
          .switchInlineCurrent("🤝🏻 Partner", "p: "),
      },
      {
        type: "article",
        id: `starz_check_${sessionKey}`,
        title: "✅ Starz Check",
        description: `${personalPending} pending • ${collabCount} collab lists${streak > 0 ? ` • 🔥${streak}` : ""}`,
        thumbnail_url: "https://img.icons8.com/fluency/96/todo-list.png",
        input_message_content: { 
          message_text: starzCheckText,
          parse_mode: "Markdown"
        },
        reply_markup: (() => {
          const kb = new InlineKeyboard();
          // Show tasks directly as buttons!
          userTasks.slice(0, 6).forEach((task) => {
            if (!task || !task.text) return; // Skip invalid tasks
            const icon = task.completed ? "✅" : "⬜";
            const text = task.text.slice(0, 25) + (task.text.length > 25 ? ".." : "");
            const catEmoji = getCategoryEmoji(task.category);
            const priInd = task.priority === "high" ? "🔴" : task.priority === "medium" ? "🟡" : "";
            kb.text(`${icon} ${text} ${catEmoji}${priInd}`, `itodo_tap:${task.id}`);
            kb.row();
          });
          if (userTasks.length === 0) {
            kb.text("📋 No tasks yet", "itodo_add").row();
          }
          // Action row
          kb.switchInlineCurrent("➕", "t:add ")
            .text("🔍", "itodo_filter")
            .text("👥", "itodo_collab")
            .row()
            .text("← Back", "inline_main_menu");
          return kb;
        })(),
      },
      {
        type: "article",
        id: `settings_menu_${sessionKey}`,
        title: `⚙️ Settings`,
        description: `Model: ${shortModel} • Tap to change`,
        thumbnail_url: "https://img.icons8.com/fluency/96/settings.png",
        input_message_content: { 
          message_text: `⚙️ *StarzAI Settings*\n\nCurrent model: \`${shortModel}\`\n\nSelect a category:`,
          parse_mode: "Markdown"
        },
        reply_markup: settingsMainKeyboard(userId),
      },
      {
        type: "article",
        id: `help_menu_${sessionKey}`,
        title: "❓ Help",
        description: "Features • How to use • Support",
        thumbnail_url: "https://img.icons8.com/fluency/96/help.png",
        input_message_content: { 
          message_text: buildInlineHelpCard(),
          parse_mode: "Markdown"
        },
        reply_markup: new InlineKeyboard()
          .url("💬 Feedback", "https://t.me/starztechbot?start=feedback")
          .row()
          .switchInlineCurrent("← Back", ""),
      },
    ];

    return safeAnswerInline(ctx, results, { cache_time: 0, is_personal: true });
  }
  
  // Filter modes when user types partial text
  const qLower = q.toLowerCase();
  const shortModel = model.split("/").pop();
  
  // =====================
  // SHORT PREFIX HANDLERS - q, b, code, e, r, s for quick access
  // =====================
  
  // "q:" or "q " - Quark mode (quick, concise answers)
  // Uses deferred response pattern: sends placeholder immediately, then edits with AI response
  if (qLower.startsWith("q:") || qLower.startsWith("q ")) {
    const question = q.slice(2).trim();
    
    if (!question) {
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `q_typing_${sessionKey}`,
          title: "⭐ Quark - Quick Answer",
          description: "Type your question for a fast, concise answer",
          thumbnail_url: "https://img.icons8.com/fluency/96/lightning-bolt.png",
          input_message_content: { message_text: "_" },
          reply_markup: new InlineKeyboard().switchInlineCurrent("← Back to Menu", ""),
        },
      ], { cache_time: 0, is_personal: true });
    }
    
    // Generate a unique key for this request
    const qKey = makeId(6);
    const escapedQuestion = escapeHTML(question);
    
    // Store pending request - will be processed in chosen_inline_result
    inlineCache.set(`q_pending_${qKey}`, {
      prompt: question,
      userId: String(userId),
      model,
      shortModel,
      createdAt: Date.now(),
    });
    setTimeout(() => inlineCache.delete(`q_pending_${qKey}`), 5 * 60 * 1000);
    
    // Return placeholder immediately - AI response will be edited in
    return safeAnswerInline(ctx, [
      {
        type: "article",
        id: `q_start_${qKey}`,
        title: `⭐ Quark: ${question.slice(0, 35)}`,
        description: "Tap to get quick answer",
        thumbnail_url: "https://img.icons8.com/fluency/96/lightning-bolt.png",
        input_message_content: {
          message_text: `⭐ <b>Quark: ${escapedQuestion}</b>\n\n⏳ <i>Getting quick answer...</i>\n\n<i>via StarzAI • Quark • ${shortModel}</i>`,
          parse_mode: "HTML",
        },
        // IMPORTANT: Must include reply_markup to receive inline_message_id
        reply_markup: new InlineKeyboard().text("⏳ Loading...", "noop"),
      },
    ], { cache_time: 0, is_personal: true });
  }
  
  // "b:" or "b " - Blackhole mode (deep research & analysis)
  // Uses deferred response pattern: sends placeholder immediately, then edits with AI response
  if (qLower.startsWith("b:") || qLower.startsWith("b ")) {
    const topic = q.slice(2).trim();
    
    if (!topic) {
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `b_typing_${sessionKey}`,
          title: "🗿🔬 Blackhole - Deep Research",
          description: "Type your topic for in-depth analysis",
          thumbnail_url: "https://img.icons8.com/fluency/96/black-hole.png",
          input_message_content: { message_text: "_" },
          reply_markup: new InlineKeyboard().switchInlineCurrent("← Back to Menu", ""),
        },
      ], { cache_time: 0, is_personal: true });
    }
    
    // Generate a unique key for this request
    const bhKey = makeId(6);
    const escapedTopic = escapeHTML(topic);
    
    // Store pending request - will be processed in chosen_inline_result
    inlineCache.set(`bh_pending_${bhKey}`, {
      type: "blackhole",
      prompt: topic,
      userId: String(userId),
      model,
      shortModel,
      createdAt: Date.now(),
    });
    
    // Send placeholder immediately - this won't timeout!
    // IMPORTANT: Must include reply_markup (inline keyboard) to receive inline_message_id in chosen_inline_result
    return safeAnswerInline(ctx, [
      {
        type: "article",
        id: `bh_start_${bhKey}`,
        title: `🗿🔬 ${topic.slice(0, 40)}`,
        description: "🔄 Tap to start deep analysis...",
        thumbnail_url: "https://img.icons8.com/fluency/96/black-hole.png",
        input_message_content: {
          message_text: `🗿🔬 <b>Blackhole Analysis: ${escapedTopic}</b>\n\n⏳ <i>Analyzing in depth... Please wait...</i>\n\n<i>via StarzAI • Blackhole • ${shortModel}</i>`,
          parse_mode: "HTML",
        },
        // Keyboard is required to get inline_message_id for editing!
        reply_markup: new InlineKeyboard().text("⏳ Loading...", `bh_loading_${bhKey}`),
      },
    ], { cache_time: 0, is_personal: true });
  }

  // "w:" or "w " - Websearch mode (web search + AI summary via Parallel or fallbacks)
  // Uses deferred response pattern similar to Blackhole so inline result can be edited later.
  if (qLower.startsWith("w:") || qLower.startsWith("w ")) {
    const topic = q.slice(2).trim();

    if (!topic) {
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `w_typing_${sessionKey}`,
          title: "🌐 Websearch - AI Web Search",
          description: "Type what you want to search on the web",
          thumbnail_url: "https://img.icons8.com/fluency/96/search.png",
          input_message_content: { message_text: "_" },
          reply_markup: new InlineKeyboard().switchInlineCurrent("← Back to Menu", ""),
        },
      ], { cache_time: 0, is_personal: true });
    }

    const wKey = makeId(6);
    const escapedTopic = escapeHTML(topic);

    inlineCache.set(`w_pending_${wKey}`, {
      type: "websearch",
      prompt: topic,
      userId: String(userId),
      model,
      shortModel,
      createdAt: Date.now(),
    });
    setTimeout(() => inlineCache.delete(`w_pending_${wKey}`), 5 * 60 * 1000);

    return safeAnswerInline(ctx, [
      {
        type: "article",
        id: `w_start_${wKey}`,
        title: `🌐 ${topic.slice(0, 40)}`,
        description: "🔎 Tap to run websearch...",
        thumbnail_url: "https://img.icons8.com/fluency/96/search.png",
        input_message_content: {
          message_text: `🌐 <b>Websearch: ${escapedTopic}</b>\n\n⏳ <i>Searching the web and analyzing...</i>\n\n<i>via StarzAI • Websearch • ${shortModel}</i>`,
          parse_mode: "HTML",
        },
        reply_markup: new InlineKeyboard().text("⏳ Loading...", "w_loading"),
      },
    ], { cache_time: 0, is_personal: true });
  }
  
  // "code:" - Code mode (programming help)
  // Uses deferred response pattern: sends placeholder immediately, then edits with AI response
  if (qLower.startsWith("code:") || qLower.startsWith("code ")) {
    const codeQ = q.slice(5).trim();
    
    if (!codeQ) {
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `code_typing_${sessionKey}`,
          title: "💻 Code - Programming Help",
          description: "Type your coding question",
          thumbnail_url: "https://img.icons8.com/fluency/96/code.png",
          input_message_content: { message_text: "_" },
          reply_markup: new InlineKeyboard().switchInlineCurrent("← Back to Menu", ""),
        },
      ], { cache_time: 0, is_personal: true });
    }
    
    // Generate a unique key for this request
    const codeKey = makeId(6);
    const escapedCodeQ = escapeHTML(codeQ);
    
    // Store pending request - will be processed in chosen_inline_result
    inlineCache.set(`code_pending_${codeKey}`, {
      prompt: codeQ,
      userId: String(userId),
      model,
      shortModel,
      createdAt: Date.now(),
    });
    setTimeout(() => inlineCache.delete(`code_pending_${codeKey}`), 5 * 60 * 1000);
    
    // Return placeholder immediately - AI response will be edited in
    return safeAnswerInline(ctx, [
      {
        type: "article",
        id: `code_start_${codeKey}`,
        title: `💻 Code: ${codeQ.slice(0, 35)}`,
        description: "Tap to get code help",
        thumbnail_url: "https://img.icons8.com/fluency/96/code.png",
        input_message_content: {
          message_text: `💻 <b>Code: ${escapedCodeQ}</b>\n\n⏳ <i>Writing code...</i>\n\n<i>via StarzAI • Code • ${shortModel}</i>`,
          parse_mode: "HTML",
        },
        // IMPORTANT: Must include reply_markup to receive inline_message_id
        reply_markup: new InlineKeyboard().text("⏳ Loading...", "noop"),
      },
    ], { cache_time: 0, is_personal: true });
  }
  
  // "e:" or "e " - Explain mode (ELI5 style)
  // Uses deferred response pattern: sends placeholder immediately, then edits with AI response
  if (qLower.startsWith("e:") || qLower.startsWith("e ")) {
    const concept = q.slice(2).trim();
    
    if (!concept) {
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `e_typing_${sessionKey}`,
          title: "🧠 Explain - Simple Explanations",
          description: "Type a concept to explain simply",
          thumbnail_url: "https://img.icons8.com/fluency/96/brain.png",
          input_message_content: { message_text: "_" },
          reply_markup: new InlineKeyboard().switchInlineCurrent("← Back to Menu", ""),
        },
      ], { cache_time: 0, is_personal: true });
    }
    
    // Generate a unique key for this request
    const expKey = makeId(6);
    const escapedConcept = escapeHTML(concept);
    
    // Store pending request - will be processed in chosen_inline_result
    inlineCache.set(`e_pending_${expKey}`, {
      prompt: concept,
      userId: String(userId),
      model,
      shortModel,
      createdAt: Date.now(),
    });
    setTimeout(() => inlineCache.delete(`e_pending_${expKey}`), 5 * 60 * 1000);
    
    // Return placeholder immediately - AI response will be edited in
    return safeAnswerInline(ctx, [
      {
        type: "article",
        id: `e_start_${expKey}`,
        title: `🧠 Explain: ${concept.slice(0, 35)}`,
        description: "Tap to get simple explanation",
        thumbnail_url: "https://img.icons8.com/fluency/96/brain.png",
        input_message_content: {
          message_text: `🧠 <b>Explain: ${escapedConcept}</b>\n\n⏳ <i>Simplifying...</i>\n\n<i>via StarzAI • Explain • ${shortModel}</i>`,
          parse_mode: "HTML",
        },
        // IMPORTANT: Must include reply_markup to receive inline_message_id
        reply_markup: new InlineKeyboard().text("⏳ Loading...", "noop"),
      },
    ], { cache_time: 0, is_personal: true });
  }
  
  // "as " - Show saved characters when user types just "as " or "as"
  if (qLower === "as" || qLower === "as ") {
    const savedChars = getSavedCharacters(userId);
    
    const results = [];
    
    // Add saved characters as quick options
    if (savedChars.length > 0) {
      savedChars.forEach((char, i) => {
        results.push({
          type: "article",
          id: `as_saved_${i}_${sessionKey}`,
          title: `🎭 ${char}`,
          description: `Tap to chat as ${char}`,
          thumbnail_url: "https://img.icons8.com/fluency/96/theatre-mask.png",
          input_message_content: { message_text: "_" },
          reply_markup: new InlineKeyboard().switchInlineCurrent(`🎭 ${char}`, `as ${char}: `),
        });
      });
    }
    
    // Add typing hint
    results.push({
      type: "article",
      id: `as_typing_hint_${sessionKey}`,
      title: "✍️ Type character name...",
      description: "Example: as yoda: hello there",
      thumbnail_url: "https://img.icons8.com/fluency/96/edit.png",
      input_message_content: { message_text: "_" },
      reply_markup: new InlineKeyboard().switchInlineCurrent("← Back to Menu", ""),
    });
    
    // Add save hint if no saved characters
    if (savedChars.length === 0) {
      results.push({
        type: "article",
        id: `as_save_hint_${sessionKey}`,
        title: "💾 No saved characters",
        description: "Use /char save [name] to save favorites",
        thumbnail_url: "https://img.icons8.com/fluency/96/bookmark.png",
        input_message_content: { message_text: "_" },
      });
    }
    
    return safeAnswerInline(ctx, results, { cache_time: 0, is_personal: true });
  }
  
  // "as:" - Character/Persona mode (as pirate:, as shakespeare:, etc.)
  const asMatch = q.match(/^as\s+([^:]+):\s*(.*)$/i);
  if (asMatch) {
    const character = asMatch[1].trim();
    const question = asMatch[2].trim();
    
    // If no question, generate a character intro message
    if (!question) {
      try {
        // Generate character intro
        const introOut = await llmText({
          model,
          messages: [
            { role: "system", content: `You are ${character}. Introduce yourself in 1-2 sentences in your unique style, personality, and speech patterns. Be creative and stay completely in character. Don't say "I am [name]" directly - show your personality through how you speak.` },
            { role: "user", content: "Introduce yourself briefly." },
          ],
          temperature: 0.9,
          max_tokens: 150,
          timeout: 8000,
          retries: 1,
        });
        
        const intro = (introOut || `*${character} appears*`).slice(0, 500);
        const introKey = makeId(6);
        
        // Cache the intro for replies
        inlineCache.set(introKey, {
          prompt: "[Character Introduction]",
          answer: intro,
          userId: String(userId),
          model,
          character,
          isIntro: true,
          createdAt: Date.now(),
        });
        setTimeout(() => inlineCache.delete(introKey), 30 * 60 * 1000);
        
        const formattedIntro = convertToTelegramHTML(intro);
        const escapedCharacter = escapeHTML(character);
        
        return safeAnswerInline(ctx, [
          {
            type: "article",
            id: `char_intro_${introKey}`,
            title: `🎭 Meet ${character}`,
            description: intro.slice(0, 80),
            thumbnail_url: "https://img.icons8.com/fluency/96/theatre-mask.png",
            input_message_content: {
              message_text: `🎭 <b>${escapedCharacter}</b>\n\n${formattedIntro}\n\n<i>Reply to continue chatting! • via StarzAI</i>`,
              parse_mode: "HTML",
            },
            reply_markup: new InlineKeyboard()
              .text("🔄 New Intro", `char_new_intro:${character}`)
              .switchInlineCurrent(`✉️ Ask ${character.slice(0, 10)}`, `as ${character}: `),
          },
        ], { cache_time: 0, is_personal: true });
      } catch (e) {
        // Fallback if intro generation fails
        return safeAnswerInline(ctx, [
          {
            type: "article",
            id: `as_typing_${sessionKey}`,
            title: `🎭 Chat as ${character}`,
            description: `Type your message after the colon`,
            thumbnail_url: "https://img.icons8.com/fluency/96/theatre-mask.png",
            input_message_content: { message_text: `🎭 <b>${escapeHTML(character)}</b>\n\n<i>*${escapeHTML(character)} is ready to chat*</i>\n\n<i>Reply to start the conversation!</i>`, parse_mode: "HTML" },
            reply_markup: new InlineKeyboard().switchInlineCurrent(`✉️ Ask ${character.slice(0, 10)}`, `as ${character}: `),
          },
        ], { cache_time: 0, is_personal: true });
      }
    }
    
    try {
      const out = await llmText({
        model,
        messages: [
          { role: "system", content: `You are roleplaying as ${character}. Stay completely in character. Respond to everything as ${character} would - use their speech patterns, vocabulary, mannerisms, and personality. Be creative and entertaining while still being helpful.` },
          { role: "user", content: question },
        ],
        temperature: 0.9,
        max_tokens: 400,
        timeout: 10000,
        retries: 1,
      });
      
      const answer = (out || "*stays silent*").slice(0, 1500);
      const asKey = makeId(6);
      
      inlineCache.set(asKey, {
        prompt: question,
        answer,
        userId: String(userId),
        model,
        character,
        mode: "character",
        createdAt: Date.now(),
      });
      setTimeout(() => inlineCache.delete(asKey), 30 * 60 * 1000);
      
      // Track in history
      addToHistory(userId, `as ${character}: ${question}`, "character");
      
      // Convert AI answer to Telegram HTML format
      const formattedAnswer = convertToTelegramHTML(answer);
      const escapedCharacter = escapeHTML(character);
      const escapedQuestion = escapeHTML(question);
      
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `char_${asKey}`,
          title: `🎭 ${character}: ${question.slice(0, 30)}`,
          description: answer.slice(0, 80),
          thumbnail_url: "https://img.icons8.com/fluency/96/theatre-mask.png",
          input_message_content: {
            message_text: `🎭 <b>${escapedCharacter}</b>\n\n❓ <i>${escapedQuestion}</i>\n\n${formattedAnswer}\n\n<i>via StarzAI • Character Mode • ${shortModel}</i>`,
            parse_mode: "HTML",
          },
          reply_markup: inlineAnswerKeyboard(asKey),
        },
      ], { cache_time: 0, is_personal: true });
    } catch (e) {
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `as_err_${sessionKey}`,
          title: "⚠️ Taking too long...",
          description: "Try again",
          thumbnail_url: "https://img.icons8.com/fluency/96/error.png",
          input_message_content: { message_text: "_" },
        },
      ], { cache_time: 0, is_personal: true });
    }
  }
  
  // "sum:" or "s:" (if not settings) - Summarize mode
  // Uses deferred response pattern: sends placeholder immediately, then edits with AI response
  if (qLower.startsWith("sum:") || qLower.startsWith("sum ")) {
    const textToSum = q.slice(4).trim();
    
    if (!textToSum) {
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `sum_typing_${sessionKey}`,
          title: "📝 Summarize",
          description: "Paste text to summarize",
          thumbnail_url: "https://img.icons8.com/fluency/96/summary.png",
          input_message_content: { message_text: "_" },
          reply_markup: new InlineKeyboard().switchInlineCurrent("← Back to Menu", ""),
        },
      ], { cache_time: 0, is_personal: true });
    }
    
    // Generate a unique key for this request
    const sumKey = makeId(6);
    
    // Store pending request - will be processed in chosen_inline_result
    inlineCache.set(`sum_pending_${sumKey}`, {
      prompt: textToSum,
      userId: String(userId),
      model,
      shortModel,
      createdAt: Date.now(),
    });
    setTimeout(() => inlineCache.delete(`sum_pending_${sumKey}`), 5 * 60 * 1000);
    
    // Return placeholder immediately - AI response will be edited in
    return safeAnswerInline(ctx, [
      {
        type: "article",
        id: `sum_start_${sumKey}`,
        title: `📝 Summarize`,
        description: "Tap to summarize text",
        thumbnail_url: "https://img.icons8.com/fluency/96/summary.png",
        input_message_content: {
          message_text: `📝 <b>Summary</b>\n\n⏳ <i>Summarizing...</i>\n\n<i>via StarzAI • Summarize • ${shortModel}</i>`,
          parse_mode: "HTML",
        },
        // IMPORTANT: Must include reply_markup to receive inline_message_id
        reply_markup: new InlineKeyboard().text("⏳ Loading...", "noop"),
      },
    ], { cache_time: 0, is_personal: true });
  }
  
  // "t:" or "t " - Tasks/Todo mode (manage your tasks inline)
  // Uses double-tap pattern: first tap toggles, second tap within 3s opens action menu
  if (qLower.startsWith("t:") || qLower.startsWith("t ")) {
    const subCommand = q.slice(2).trim();
    const userTodos = getUserTodos(userId);
    const filters = getTodoFilters(userId);
    const todos = userTodos.tasks || [];
    
    // t: or t (empty) - show task list
    if (!subCommand) {
      const taskCount = todos.length;
      const doneCount = todos.filter(t => t.completed).length;
      const pendingCount = taskCount - doneCount;
      
      if (taskCount === 0) {
        return safeAnswerInline(ctx, [
          {
            type: "article",
            id: `t_empty_${sessionKey}`,
            title: "📋 No Tasks Yet",
            description: "Type t:add <task> to create your first task",
            thumbnail_url: "https://img.icons8.com/fluency/96/todo-list.png",
            input_message_content: {
              message_text: "📋 <b>My Tasks</b>\n\n<i>No tasks yet!</i>\n\nAdd your first task:\n<code>t:add Buy groceries</code>\n\n<i>via StarzAI • Tasks</i>",
              parse_mode: "HTML",
            },
            reply_markup: new InlineKeyboard()
              .switchInlineCurrent("➕ Add Task", "t:add ")
              .row()
              .switchInlineCurrent("← Back", ""),
          },
        ], { cache_time: 0, is_personal: true });
      }
      
      // Build task list with toggle buttons
      const filteredTodos = filterTodos(todos, filters);
      const sortedTodos = sortTodos(filteredTodos, filters.sortBy || "created");
      const displayTodos = sortedTodos.slice(0, 8); // Show max 8 tasks inline
      
      // Compact title only - tasks are buttons
      const streak = getCompletionStreak(userId);
      let taskListText = `✅ <b>Starz Check</b>`;
      if (streak > 0) taskListText += ` 🔥${streak}`;
      
      // Build keyboard with task toggle buttons
      const keyboard = new InlineKeyboard();
      
      // Each task is its own button row - like tic-tac-toe!
      displayTodos.forEach((task) => {
        if (!task || !task.text) return; // Skip invalid tasks
        const icon = task.completed ? "✅" : "⬜";
        const text = task.text.slice(0, 28) + (task.text.length > 28 ? "..." : "");
        const catEmoji = getCategoryEmoji(task.category);
        const priInd = task.priority === "high" ? "🔴" : task.priority === "medium" ? "🟡" : "";
        const dueInd = task.dueDate && isOverdue(task.dueDate) && !task.completed ? "⚠️" : "";
        keyboard.text(`${icon} ${text} ${catEmoji}${priInd}${dueInd}`, `itodo_tap:${task.id}`);
        keyboard.row();
      });
      
      // Action buttons
      keyboard
        .switchInlineCurrent("➕", "t:add ")
        .text("🔍", "itodo_filter")
        .text("👥", "itodo_collab")
        .row()
        .text("← Back", "inline_main_menu");
      
      // Store session for double-tap detection
      const tKey = makeId(6);
      inlineCache.set(`t_session_${tKey}`, {
        userId: String(userId),
        lastTap: null,
        lastTaskId: null,
        createdAt: Date.now(),
      });
      setTimeout(() => inlineCache.delete(`t_session_${tKey}`), 30 * 60 * 1000);
      
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `t_list_${tKey}`,
          title: `📋 Tasks (${pendingCount} pending)`,
          description: displayTodos.slice(0, 3).map(t => (t.completed ? "✓ " : "○ ") + t.text.slice(0, 20)).join(" • "),
          thumbnail_url: "https://img.icons8.com/fluency/96/todo-list.png",
          input_message_content: {
            message_text: taskListText,
            parse_mode: "HTML",
          },
          reply_markup: keyboard,
        },
      ], { cache_time: 0, is_personal: true });
    }
    
    // t:add <task> - quick add task (deferred - adds on send and updates original message)
    if (subCommand.toLowerCase().startsWith("add ") || subCommand.toLowerCase() === "add") {
      const taskText = subCommand.slice(4).trim();
      
      if (!taskText) {
        return safeAnswerInline(ctx, [
          {
            type: "article",
            id: `t_add_hint_${sessionKey}`,
            title: "➕ Type your task...",
            description: "Example: Buy groceries #shopping !high @tomorrow",
            thumbnail_url: "https://img.icons8.com/fluency/96/plus.png",
            input_message_content: { message_text: "_" },
            reply_markup: new InlineKeyboard().switchInlineCurrent("← Back", "t: "),
          },
        ], { cache_time: 0, is_personal: true });
      }
      
      // Store pending task - will be added when chosen_inline_result fires
      const addKey = makeId(8);
      inlineCache.set(`tadd_pending_${addKey}`, {
        userId: String(userId),
        taskText,
        timestamp: Date.now(),
      });
      setTimeout(() => inlineCache.delete(`tadd_pending_${addKey}`), 5 * 60 * 1000);
      
      const parsed = parseTaskText(taskText);
      const categoryEmoji = getCategoryEmoji(parsed.category || 'personal');
      const priorityText = parsed.priority === "high" ? "🔴" : parsed.priority === "medium" ? "🟡" : "🟢";
      
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `tadd_${addKey}`,
          title: `➕ Add: ${parsed.text.slice(0, 35)}`,
          description: `${categoryEmoji} ${priorityText} Tap to add`,
          thumbnail_url: "https://img.icons8.com/fluency/96/checkmark.png",
          input_message_content: {
            message_text: `✅ Added: ${escapeHTML(parsed.text)}`,
            parse_mode: "HTML",
          },
        },
      ], { cache_time: 0, is_personal: true });
    }
    
    // t:stats - show statistics
    if (subCommand.toLowerCase() === "stats") {
      const stats = getTodoStats(userId);
      
      const statsText = [
        `📊 <b>Task Statistics</b>`,
        ``,
        `📋 Total tasks: ${stats.total}`,
        `✅ Completed: ${stats.completed}`,
        `⬜ Pending: ${stats.pending}`,
        `📈 Completion rate: ${stats.completionRate}%`,
        ``,
        `🔥 Current streak: ${stats.streak} days`,
        `🏆 Best streak: ${stats.bestStreak} days`,
        ``,
        `<i>via StarzAI • Tasks</i>`,
      ].join("\n");
      
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `t_stats_${sessionKey}`,
          title: `📊 Stats: ${stats.completed}/${stats.total} done`,
          description: `${stats.completionRate}% complete • ${stats.streak} day streak`,
          thumbnail_url: "https://img.icons8.com/fluency/96/statistics.png",
          input_message_content: {
            message_text: statsText,
            parse_mode: "HTML",
          },
          reply_markup: new InlineKeyboard()
            .switchInlineCurrent("📋 View Tasks", "t: ")
            .switchInlineCurrent("← Back", ""),
        },
      ], { cache_time: 0, is_personal: true });
    }
    
    // t:done or t:clear - clear completed tasks
    if (subCommand.toLowerCase() === "done" || subCommand.toLowerCase() === "clear") {
      const cleared = clearCompletedTasks(userId);
      
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `t_cleared_${sessionKey}`,
          title: `🗑️ Cleared ${cleared} completed tasks`,
          description: "Completed tasks removed",
          thumbnail_url: "https://img.icons8.com/fluency/96/trash.png",
          input_message_content: {
            message_text: `🗑️ <b>Cleared ${cleared} completed task${cleared !== 1 ? "s" : ""}!</b>\n\n<i>via StarzAI • Tasks</i>`,
            parse_mode: "HTML",
          },
          reply_markup: new InlineKeyboard()
            .switchInlineCurrent("📋 View Tasks", "t: ")
            .switchInlineCurrent("← Back", ""),
        },
      ], { cache_time: 0, is_personal: true });
    }
    
    // t:<number> - toggle specific task by number
    const taskNum = parseInt(subCommand);
    if (!isNaN(taskNum) && taskNum > 0) {
      const sortedTodos = sortTodos(todos, filters.sortBy || "created");
      const task = sortedTodos[taskNum - 1];
      
      if (!task) {
        return safeAnswerInline(ctx, [
          {
            type: "article",
            id: `t_notfound_${sessionKey}`,
            title: `⚠️ Task #${taskNum} not found`,
            description: "Invalid task number",
            thumbnail_url: "https://img.icons8.com/fluency/96/error.png",
            input_message_content: { message_text: "_" },
            reply_markup: new InlineKeyboard().switchInlineCurrent("📋 View Tasks", "t: "),
          },
        ], { cache_time: 0, is_personal: true });
      }
      
      // Show task action menu
      const checkbox = task.completed ? "✅" : "⬜";
      const categoryEmoji = getCategoryEmoji(task.category);
      
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `t_task_${makeId(6)}`,
          title: `${checkbox} ${task.text.slice(0, 35)}`,
          description: "Tap to send task with action buttons",
          thumbnail_url: "https://img.icons8.com/fluency/96/todo-list.png",
          input_message_content: {
            message_text: `${checkbox} <b>Task #${taskNum}</b>\n\n${escapeHTML(task.text)}\n\n${categoryEmoji} ${escapeHTML(task.category || "personal")}\n\n<i>via StarzAI • Tasks</i>`,
            parse_mode: "HTML",
          },
          reply_markup: new InlineKeyboard()
            .text(task.completed ? "⬜ Uncomplete" : "✅ Complete", `itodo_toggle:${task.id}`)
            .text("🗑️ Delete", `itodo_delete:${task.id}`)
            .row()
            .text("✏️ Edit", `itodo_edit:${task.id}`)
            .row()
            .switchInlineCurrent("📋 Back to Tasks", "t: "),
        },
      ], { cache_time: 0, is_personal: true });
    }
    
    // Unknown subcommand - show help
    return safeAnswerInline(ctx, [
      {
        type: "article",
        id: `t_help_${sessionKey}`,
        title: "📋 Tasks Help",
        description: "t: list • t:add <task> • t:stats • t:<#>",
        thumbnail_url: "https://img.icons8.com/fluency/96/help.png",
        input_message_content: {
          message_text: `📋 <b>Tasks Help</b>\n\n<code>t:</code> - View task list\n<code>t:add Buy milk</code> - Add task\n<code>t:add Task #work !high @tomorrow</code> - Quick add with options\n<code>t:1</code> - View/edit task #1\n<code>t:stats</code> - View statistics\n<code>t:clear</code> - Clear completed\n\n<i>via StarzAI • Tasks</i>`,
          parse_mode: "HTML",
        },
        reply_markup: new InlineKeyboard()
          .switchInlineCurrent("📋 View Tasks", "t: ")
          .switchInlineCurrent("← Back", ""),
      },
    ], { cache_time: 0, is_personal: true });
  }
  
  // "sc:" or "sc " - Starz Check Personal mode (alias for t:)
  if (qLower.startsWith("sc:") || qLower.startsWith("sc ")) {
    const subCommand = q.slice(3).trim();
    const todos = getUserTodos(userId);
    const filters = getTodoFilters(userId);
    
    // sc: or sc (empty) - show personal task list
    if (!subCommand) {
      const taskCount = todos.tasks?.length || 0;
      const doneCount = (todos.tasks || []).filter(t => t.completed).length;
      const pendingCount = taskCount - doneCount;
      
      if (taskCount === 0) {
        return safeAnswerInline(ctx, [
          {
            type: "article",
            id: `sc_empty_${sessionKey}`,
            title: "📋 No Personal Tasks Yet",
            description: "Type sc:add <task> to create your first task",
            thumbnail_url: "https://img.icons8.com/fluency/96/todo-list.png",
            input_message_content: {
              message_text: "📋 <b>Starz Check - Personal</b>\n\n<i>No tasks yet!</i>\n\nAdd your first task:\n<code>sc:add Buy groceries</code>\n\n<i>via StarzAI • Starz Check</i>",
              parse_mode: "HTML",
            },
            reply_markup: new InlineKeyboard()
              .switchInlineCurrent("➕ Add Task", "sc:add ")
              .row()
              .switchInlineCurrent("👥 Collab Lists", "ct: ")
              .switchInlineCurrent("← Back", ""),
          },
        ], { cache_time: 0, is_personal: true });
      }
      
      // Build task list with each task as a clickable button row (like tic-tac-toe)
      const filteredTodos = filterTodos(todos.tasks || [], filters);
      const sortedTodos = sortTodos(filteredTodos, filters.sortBy || "created");
      const displayTodos = sortedTodos.slice(0, 6); // Limit to 6 for button space
      
      // Minimal text - just a compact title
      const streak = getCompletionStreak(userId);
      let taskListText = `✅ <b>Starz Check</b>`;
      if (streak > 0) taskListText += ` 🔥${streak}`;
      
      const keyboard = new InlineKeyboard();
      
      // Each task is its own button row - like tic-tac-toe!
      displayTodos.forEach((task) => {
        if (!task || !task.text) return; // Skip invalid tasks
        const icon = task.completed ? "✅" : "⬜";
        const text = task.text.slice(0, 28) + (task.text.length > 28 ? "..." : "");
        const categoryEmoji = getCategoryEmoji(task.category);
        const priorityIndicator = task.priority === "high" ? "🔴" : task.priority === "medium" ? "🟡" : "";
        const dueIndicator = task.dueDate && isOverdue(task.dueDate) && !task.completed ? "⚠️" : "";
        
        keyboard.text(`${icon} ${text} ${categoryEmoji}${priorityIndicator}${dueIndicator}`, `itodo_tap:${task.id}`);
        keyboard.row();
      });
      
      keyboard
        .switchInlineCurrent("➕", "sc:add ")
        .text("🔍", "itodo_filter")
        .text("👥", "itodo_collab")
        .row()
        .text("← Back", "inline_main_menu");
      
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `sc_list_${makeId(6)}`,
          title: `📋 Personal Tasks (${pendingCount} pending)`,
          description: displayTodos.slice(0, 3).map(t => (t.completed ? "✓ " : "○ ") + t.text.slice(0, 20)).join(" • "),
          thumbnail_url: "https://img.icons8.com/fluency/96/todo-list.png",
          input_message_content: {
            message_text: taskListText,
            parse_mode: "HTML",
          },
          reply_markup: keyboard,
        },
      ], { cache_time: 0, is_personal: true });
    }
    
    // sc:add <task> - quick add task (deferred - adds on send and updates original message)
    if (subCommand.toLowerCase().startsWith("add ") || subCommand.toLowerCase() === "add") {
      const taskText = subCommand.slice(4).trim();
      
      if (!taskText) {
        return safeAnswerInline(ctx, [
          {
            type: "article",
            id: `sc_add_help_${sessionKey}`,
            title: "➕ Type your task...",
            description: "Example: Buy groceries #shopping !high @tomorrow",
            thumbnail_url: "https://img.icons8.com/fluency/96/add.png",
            input_message_content: { message_text: "_" },
            reply_markup: new InlineKeyboard().switchInlineCurrent("← Back", "sc: "),
          },
        ], { cache_time: 0, is_personal: true });
      }
      
      // Store pending task - will be added when chosen_inline_result fires
      const addKey = makeId(8);
      inlineCache.set(`tadd_pending_${addKey}`, {
        userId: String(userId),
        taskText,
        timestamp: Date.now(),
      });
      setTimeout(() => inlineCache.delete(`tadd_pending_${addKey}`), 5 * 60 * 1000);
      
      const parsed = parseTaskText(taskText);
      const categoryEmoji = getCategoryEmoji(parsed.category || 'personal');
      const priorityText = parsed.priority === "high" ? "🔴" : parsed.priority === "medium" ? "🟡" : "🟢";
      
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `tadd_${addKey}`,
          title: `➕ Add: ${parsed.text.slice(0, 35)}`,
          description: `${categoryEmoji} ${priorityText} Tap to add`,
          thumbnail_url: "https://img.icons8.com/fluency/96/checkmark.png",
          input_message_content: {
            message_text: `✅ Added: ${escapeHTML(parsed.text)}`,
            parse_mode: "HTML",
          },
        },
      ], { cache_time: 0, is_personal: true });
    }
    
    // sc:edit <taskId> <newText> - edit a task
    if (subCommand.toLowerCase().startsWith("edit ")) {
      const editParts = subCommand.slice(5).trim().split(" ");
      const taskId = editParts[0];
      const newText = editParts.slice(1).join(" ").trim();
      
      if (!taskId) {
        return safeAnswerInline(ctx, [
          {
            type: "article",
            id: `sc_edit_help_${sessionKey}`,
            title: "✏️ Edit Task",
            description: "sc:edit <taskId> New task text",
            thumbnail_url: "https://img.icons8.com/fluency/96/edit.png",
            input_message_content: { message_text: "_" },
            reply_markup: new InlineKeyboard().switchInlineCurrent("← Back", "sc: "),
          },
        ], { cache_time: 0, is_personal: true });
      }
      
      const task = getTaskById(userId, taskId);
      if (!task) {
        return safeAnswerInline(ctx, [
          {
            type: "article",
            id: `sc_edit_notfound_${sessionKey}`,
            title: "⚠️ Task Not Found",
            description: "The task you're trying to edit doesn't exist",
            thumbnail_url: "https://img.icons8.com/fluency/96/error.png",
            input_message_content: {
              message_text: `⚠️ <b>Task Not Found</b>\n\nThe task with ID <code>${escapeHTML(taskId)}</code> doesn't exist.\n\n<i>via StarzAI • Starz Check</i>`,
              parse_mode: "HTML",
            },
            reply_markup: new InlineKeyboard().switchInlineCurrent("📋 View Tasks", "sc: "),
          },
        ], { cache_time: 0, is_personal: true });
      }
      
      if (!newText) {
        // Show current task and prompt for new text
        return safeAnswerInline(ctx, [
          {
            type: "article",
            id: `sc_edit_prompt_${sessionKey}`,
            title: `✏️ Edit: ${task.text.slice(0, 30)}`,
            description: "Type the new text after the task ID",
            thumbnail_url: "https://img.icons8.com/fluency/96/edit.png",
            input_message_content: {
              message_text: `✏️ <b>Editing Task</b>\n\nCurrent: ${escapeHTML(task.text)}\n\nType your new text after the task ID\n\n<i>via StarzAI • Starz Check</i>`,
              parse_mode: "HTML",
            },
            reply_markup: new InlineKeyboard().switchInlineCurrent("← Back", "sc: "),
          },
        ], { cache_time: 0, is_personal: true });
      }
      
      // Store pending edit - will be applied when chosen_inline_result fires
      const editKey = makeId(8);
      inlineCache.set(`tedit_pending_${editKey}`, {
        userId: String(userId),
        taskId,
        newText,
        timestamp: Date.now(),
      });
      setTimeout(() => inlineCache.delete(`tedit_pending_${editKey}`), 5 * 60 * 1000);
      
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `tedit_${editKey}`,
          title: `✅ Update to: ${newText.slice(0, 30)}`,
          description: `Tap to save changes`,
          thumbnail_url: "https://img.icons8.com/fluency/96/checkmark.png",
          input_message_content: {
            message_text: `✅ Updated: ${escapeHTML(newText)}`,
            parse_mode: "HTML",
          },
        },
      ], { cache_time: 0, is_personal: true });
    }
    
    // sc:stats - show statistics
    if (subCommand.toLowerCase() === "stats") {
      const userTodos = getUserTodos(userId);
      const stats = userTodos.stats || { totalCreated: 0, totalCompleted: 0, currentStreak: 0, longestStreak: 0 };
      const tasks = userTodos.tasks || [];
      
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(t => t.completed).length;
      const pendingTasks = totalTasks - completedTasks;
      const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      
      const statsText = [
        "📊 <b>Starz Check - Personal Stats</b>",
        "",
        `📋 Total Tasks: ${totalTasks}`,
        `✅ Completed: ${completedTasks}`,
        `⏳ Pending: ${pendingTasks}`,
        `📈 Completion Rate: ${completionRate}%`,
        "",
        `🔥 Current Streak: ${stats.currentStreak} day${stats.currentStreak !== 1 ? "s" : ""}`,
        `🏆 Longest Streak: ${stats.longestStreak} day${stats.longestStreak !== 1 ? "s" : ""}`,
        `📅 All-time Completed: ${stats.totalCompleted}`,
        "",
        "<i>via StarzAI • Starz Check</i>",
      ].join("\n");
      
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `sc_stats_${sessionKey}`,
          title: "📊 Personal Task Statistics",
          description: `${completedTasks}/${totalTasks} done • 🔥 ${stats.currentStreak} day streak`,
          thumbnail_url: "https://img.icons8.com/fluency/96/statistics.png",
          input_message_content: {
            message_text: statsText,
            parse_mode: "HTML",
          },
          reply_markup: new InlineKeyboard()
            .switchInlineCurrent("📋 View Tasks", "sc: ")
            .switchInlineCurrent("← Back", ""),
        },
      ], { cache_time: 0, is_personal: true });
    }
    
    // Unknown - show help
    return safeAnswerInline(ctx, [
      {
        type: "article",
        id: `sc_help_${sessionKey}`,
        title: "📋 Starz Check - Personal Help",
        description: "sc: list • sc:add <task> • sc:stats",
        thumbnail_url: "https://img.icons8.com/fluency/96/help.png",
        input_message_content: {
          message_text: `📋 <b>Starz Check - Personal Help</b>\n\n<code>sc:</code> - View task list\n<code>sc:add Buy milk</code> - Add task\n<code>sc:add Task #work !high @tomorrow</code> - Quick add with options\n<code>sc:stats</code> - View statistics\n\n<i>via StarzAI • Starz Check</i>`,
          parse_mode: "HTML",
        },
        reply_markup: new InlineKeyboard()
          .switchInlineCurrent("📋 View Tasks", "sc: ")
          .switchInlineCurrent("← Back", ""),
      },
    ], { cache_time: 0, is_personal: true });
  }
  
  // "ct:" or "ct " - Collaborative Todo mode
  if (qLower.startsWith("ct:") || qLower.startsWith("ct ")) {
    const subCommand = q.slice(3).trim();
    const userLists = getCollabListsForUser(userId);
    
    // ct: or ct (empty) - show user's collaborative lists
    if (!subCommand) {
      if (userLists.length === 0) {
        return safeAnswerInline(ctx, [
          {
            type: "article",
            id: `ct_empty_${sessionKey}`,
            title: "👥 No Collaborative Lists Yet",
            description: "Create a new list or join one with a code",
            thumbnail_url: "https://img.icons8.com/fluency/96/conference-call.png",
            input_message_content: {
              message_text: "👥 <b>Starz Check - Collaborative</b>\n\n<i>No shared lists yet!</i>\n\nCreate a new list:\n<code>ct:new Party Planning</code>\n\nOr join with a code:\n<code>ct:join ABC123</code>\n\n<i>via StarzAI • Starz Check</i>",
              parse_mode: "HTML",
            },
            reply_markup: new InlineKeyboard()
              .switchInlineCurrent("➕ Create List", "ct:new ")
              .switchInlineCurrent("🔗 Join List", "ct:join ")
              .row()
              .switchInlineCurrent("📋 Personal", "sc: ")
              .switchInlineCurrent("← Back", ""),
          },
        ], { cache_time: 0, is_personal: true });
      }
      
      // Show list of collaborative lists
      const results = userLists.slice(0, 10).map((list, idx) => {
        const pendingCount = list.tasks.filter(t => !t.completed).length;
        const doneCount = list.tasks.filter(t => t.completed).length;
        const memberCount = list.members.length;
        const isOwner = list.ownerId === String(userId);
        
        let listText = `👥 <b>${escapeHTML(list.name)}</b>${isOwner ? " 👑" : ""}\n\n`;
        listText += `📊 ${pendingCount} pending • ${doneCount} done • ${memberCount} members\n`;
        listText += `🔑 Join code: <code>${list.joinCode}</code>\n\n`;
        
        if (list.tasks.length === 0) {
          listText += `<i>No tasks yet!</i>\n`;
        } else {
          const displayTasks = list.tasks.slice(0, 5);
          displayTasks.forEach((task, i) => {
            const checkbox = task.completed ? "✅" : "⬜";
            const text = task.completed ? `<s>${escapeHTML(task.text)}</s>` : escapeHTML(task.text);
            listText += `${checkbox} ${i + 1}. ${text}\n`;
          });
          if (list.tasks.length > 5) {
            listText += `<i>+${list.tasks.length - 5} more...</i>\n`;
          }
        }
        
        listText += `\n<i>Tap task to toggle • Tap again for options</i>`;
        
        const keyboard = new InlineKeyboard();
        
        const displayTasks = list.tasks.slice(0, 6);
        for (let i = 0; i < displayTasks.length; i += 2) {
          const task1 = displayTasks[i];
          const icon1 = task1.completed ? "✅" : "⬜";
          keyboard.text(`${icon1} ${i + 1}`, `ct_tap:${list.id}:${task1.id}`);
          
          if (displayTasks[i + 1]) {
            const task2 = displayTasks[i + 1];
            const icon2 = task2.completed ? "✅" : "⬜";
            keyboard.text(`${icon2} ${i + 2}`, `ct_tap:${list.id}:${task2.id}`);
          }
          keyboard.row();
        }
        
        keyboard
          .text("➕ Add", `ct_add:${list.id}`)
          .text("🗑️ Clear", `ct_clear:${list.id}`)
          .row()
          .text("👥 Members", `ct_members:${list.id}`)
          .text("🔗 Share", `ct_share:${list.id}`)
          .row()
          .switchInlineCurrent("← My Lists", "ct: ");
        
        return {
          type: "article",
          id: `ct_list_${list.id}_${makeId(4)}`,
          title: `👥 ${list.name}${isOwner ? " 👑" : ""}`,
          description: `${pendingCount} pending • ${memberCount} members • Code: ${list.joinCode}`,
          thumbnail_url: "https://img.icons8.com/fluency/96/conference-call.png",
          input_message_content: {
            message_text: listText,
            parse_mode: "HTML",
          },
          reply_markup: keyboard,
        };
      });
      
      // Add create/join options at the end
      results.push({
        type: "article",
        id: `ct_create_${sessionKey}`,
        title: "➕ Create New List",
        description: "Start a new collaborative checklist",
        thumbnail_url: "https://img.icons8.com/fluency/96/add.png",
        input_message_content: { message_text: "_" },
        reply_markup: new InlineKeyboard().switchInlineCurrent("➕ Create", "ct:new "),
      });
      
      results.push({
        type: "article",
        id: `ct_join_${sessionKey}`,
        title: "🔗 Join Existing List",
        description: "Enter a join code to join a shared list",
        thumbnail_url: "https://img.icons8.com/fluency/96/link.png",
        input_message_content: { message_text: "_" },
        reply_markup: new InlineKeyboard().switchInlineCurrent("🔗 Join", "ct:join "),
      });
      
      return safeAnswerInline(ctx, results, { cache_time: 0, is_personal: true });
    }
    
    // ct:new <name> - create new collaborative list
    if (subCommand.toLowerCase().startsWith("new ") || subCommand.toLowerCase() === "new") {
      const listName = subCommand.slice(4).trim();
      
      if (!listName) {
        return safeAnswerInline(ctx, [
          {
            type: "article",
            id: `ct_new_help_${sessionKey}`,
            title: "➕ Create Collaborative List",
            description: "ct:new Party Planning",
            thumbnail_url: "https://img.icons8.com/fluency/96/add.png",
            input_message_content: { message_text: "_" },
            reply_markup: new InlineKeyboard().switchInlineCurrent("← Back", "ct: "),
          },
        ], { cache_time: 0, is_personal: true });
      }
      
      const newList = createCollabList(userId, listName);
      
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `ct_created_${newList.id}`,
          title: `✅ Created: ${listName}`,
          description: `Share code: ${newList.joinCode}`,
          thumbnail_url: "https://img.icons8.com/fluency/96/checkmark.png",
          input_message_content: {
            message_text: `✅ <b>List Created!</b>\n\n👥 <b>${escapeHTML(listName)}</b>\n\n🔑 Share this code with others:\n<code>${newList.joinCode}</code>\n\nThey can join with:\n<code>ct:join ${newList.joinCode}</code>\n\n<i>via StarzAI • Starz Check</i>`,
            parse_mode: "HTML",
          },
          reply_markup: new InlineKeyboard()
            .switchInlineCurrent("📋 View List", `ct:open ${newList.id}`)
            .text("🔗 Share", `ct_share:${newList.id}`)
            .row()
            .switchInlineCurrent("← My Lists", "ct: "),
        },
      ], { cache_time: 0, is_personal: true });
    }
    
    // ct:join <code> - join a collaborative list
    if (subCommand.toLowerCase().startsWith("join ") || subCommand.toLowerCase() === "join") {
      const joinCode = subCommand.slice(5).trim().toUpperCase();
      
      if (!joinCode) {
        return safeAnswerInline(ctx, [
          {
            type: "article",
            id: `ct_join_help_${sessionKey}`,
            title: "🔗 Join Collaborative List",
            description: "ct:join ABC123",
            thumbnail_url: "https://img.icons8.com/fluency/96/link.png",
            input_message_content: { message_text: "_" },
            reply_markup: new InlineKeyboard().switchInlineCurrent("← Back", "ct: "),
          },
        ], { cache_time: 0, is_personal: true });
      }
      
      const result = joinCollabList(userId, joinCode, ctx.from?.username);
      
      if (!result.success) {
        if (result.error === "Already a member") {
          return safeAnswerInline(ctx, [
            {
              type: "article",
              id: `ct_already_${sessionKey}`,
              title: `📋 Already a member of ${result.list?.name || "this list"}`,
              description: "You're already in this list!",
              thumbnail_url: "https://img.icons8.com/fluency/96/info.png",
              input_message_content: {
                message_text: `ℹ️ <b>Already a Member!</b>\n\nYou're already in <b>${escapeHTML(result.list?.name || "this list")}</b>\n\n<i>via StarzAI • Starz Check</i>`,
                parse_mode: "HTML",
              },
              reply_markup: new InlineKeyboard()
                .switchInlineCurrent("📋 View List", `ct:open ${result.list?.id}`)
                .switchInlineCurrent("← My Lists", "ct: "),
            },
          ], { cache_time: 0, is_personal: true });
        }
        
        return safeAnswerInline(ctx, [
          {
            type: "article",
            id: `ct_notfound_${sessionKey}`,
            title: "⚠️ List Not Found",
            description: "Check the code and try again",
            thumbnail_url: "https://img.icons8.com/fluency/96/error.png",
            input_message_content: {
              message_text: `⚠️ <b>List Not Found</b>\n\nNo list found with code: <code>${escapeHTML(joinCode)}</code>\n\nCheck the code and try again.\n\n<i>via StarzAI • Starz Check</i>`,
              parse_mode: "HTML",
            },
            reply_markup: new InlineKeyboard()
              .switchInlineCurrent("🔗 Try Again", "ct:join ")
              .switchInlineCurrent("← Back", "ct: "),
          },
        ], { cache_time: 0, is_personal: true });
      }
      
      const list = result.list;
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `ct_joined_${list.id}`,
          title: `✅ Joined: ${list.name}`,
          description: `${list.members.length} members • ${list.tasks.length} tasks`,
          thumbnail_url: "https://img.icons8.com/fluency/96/checkmark.png",
          input_message_content: {
            message_text: `✅ <b>Joined Successfully!</b>\n\n👥 <b>${escapeHTML(list.name)}</b>\n\n👤 ${list.members.length} members\n📋 ${list.tasks.length} tasks\n\n<i>via StarzAI • Starz Check</i>`,
            parse_mode: "HTML",
          },
          reply_markup: new InlineKeyboard()
            .switchInlineCurrent("📋 View List", `ct:open ${list.id}`)
            .switchInlineCurrent("← My Lists", "ct: "),
        },
      ], { cache_time: 0, is_personal: true });
    }
    
    // ct:open <listId> - open a specific list
    if (subCommand.toLowerCase().startsWith("open ")) {
      const listId = subCommand.slice(5).trim();
      const list = getCollabList(listId);
      
      if (!list) {
        return safeAnswerInline(ctx, [
          {
            type: "article",
            id: `ct_notfound_${sessionKey}`,
            title: "⚠️ List Not Found",
            description: "This list may have been deleted",
            thumbnail_url: "https://img.icons8.com/fluency/96/error.png",
            input_message_content: { message_text: "_" },
            reply_markup: new InlineKeyboard().switchInlineCurrent("← My Lists", "ct: "),
          },
        ], { cache_time: 0, is_personal: true });
      }
      
      // Check if user is a member
      if (!list.members.some(m => m.userId === String(userId))) {
        return safeAnswerInline(ctx, [
          {
            type: "article",
            id: `ct_notmember_${sessionKey}`,
            title: "⚠️ Not a Member",
            description: "You're not a member of this list",
            thumbnail_url: "https://img.icons8.com/fluency/96/error.png",
            input_message_content: { message_text: "_" },
            reply_markup: new InlineKeyboard()
              .switchInlineCurrent("🔗 Join", `ct:join ${list.joinCode}`)
              .switchInlineCurrent("← Back", "ct: "),
          },
        ], { cache_time: 0, is_personal: true });
      }
      
      const pendingCount = list.tasks.filter(t => !t.completed).length;
      const doneCount = list.tasks.filter(t => t.completed).length;
      const isOwner = list.ownerId === String(userId);
      
      let listText = `👥 <b>${escapeHTML(list.name)}</b>${isOwner ? " 👑" : ""}\n\n`;
      listText += `📊 ${pendingCount} pending • ${doneCount} done • ${list.members.length} members\n`;
      listText += `🔑 Join code: <code>${list.joinCode}</code>\n\n`;
      
      if (list.tasks.length === 0) {
        listText += `<i>No tasks yet! Add one below.</i>\n`;
      } else {
        const displayTasks = list.tasks.slice(0, 8);
        displayTasks.forEach((task, i) => {
          const checkbox = task.completed ? "✅" : "⬜";
          const text = task.completed ? `<s>${escapeHTML(task.text)}</s>` : escapeHTML(task.text);
          const priorityIndicator = task.priority === "high" ? " 🔴" : task.priority === "medium" ? " 🟡" : "";
          
          let completedByText = "";
          if (task.completed && task.completedBy && list.settings.showCompletedBy) {
            const completer = task.completedBy.username || `User ${task.completedBy.userId.slice(-4)}`;
            completedByText = ` <i>by ${escapeHTML(completer)}</i>`;
          }
          
          listText += `${checkbox} ${i + 1}. ${text}${priorityIndicator}${completedByText}\n`;
        });
        
        if (list.tasks.length > 8) {
          listText += `\n<i>+${list.tasks.length - 8} more tasks...</i>\n`;
        }
      }
      
      listText += `\n<i>Tap task to toggle • Tap again for options</i>`;
      
      const keyboard = new InlineKeyboard();
      
      const displayTasks = list.tasks.slice(0, 6);
      for (let i = 0; i < displayTasks.length; i += 2) {
        const task1 = displayTasks[i];
        const icon1 = task1.completed ? "✅" : "⬜";
        keyboard.text(`${icon1} ${i + 1}`, `ct_tap:${list.id}:${task1.id}`);
        
        if (displayTasks[i + 1]) {
          const task2 = displayTasks[i + 1];
          const icon2 = task2.completed ? "✅" : "⬜";
          keyboard.text(`${icon2} ${i + 2}`, `ct_tap:${list.id}:${task2.id}`);
        }
        keyboard.row();
      }
      
      keyboard
        .text("➕ Add", `ct_add:${list.id}`)
        .text("🗑️ Clear", `ct_clear:${list.id}`)
        .row()
        .text("👥 Members", `ct_members:${list.id}`)
        .text("🔗 Share", `ct_share:${list.id}`)
        .row()
        .switchInlineCurrent("🔄 Refresh", `ct:open ${list.id}`)
        .switchInlineCurrent("← My Lists", "ct: ");
      
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `ct_view_${list.id}_${makeId(4)}`,
          title: `👥 ${list.name}${isOwner ? " 👑" : ""}`,
          description: `${pendingCount} pending • ${list.members.length} members`,
          thumbnail_url: "https://img.icons8.com/fluency/96/conference-call.png",
          input_message_content: {
            message_text: listText,
            parse_mode: "HTML",
          },
          reply_markup: keyboard,
        },
      ], { cache_time: 0, is_personal: true });
    }
    
    // ct:add <listId> <task> - add task to collaborative list
    if (subCommand.toLowerCase().startsWith("add:")) {
      const parts = subCommand.slice(4).split(" ");
      const listId = parts[0];
      const taskText = parts.slice(1).join(" ").trim();
      
      const list = getCollabList(listId);
      if (!list) {
        return safeAnswerInline(ctx, [
          {
            type: "article",
            id: `ct_notfound_${sessionKey}`,
            title: "⚠️ List Not Found",
            description: "This list may have been deleted",
            thumbnail_url: "https://img.icons8.com/fluency/96/error.png",
            input_message_content: { message_text: "_" },
            reply_markup: new InlineKeyboard().switchInlineCurrent("← My Lists", "ct: "),
          },
        ], { cache_time: 0, is_personal: true });
      }
      
      if (!taskText) {
        return safeAnswerInline(ctx, [
          {
            type: "article",
            id: `ct_addhelp_${sessionKey}`,
            title: `➕ Add Task to ${list.name}`,
            description: "Type your task after the list ID",
            thumbnail_url: "https://img.icons8.com/fluency/96/add.png",
            input_message_content: { message_text: "_" },
            reply_markup: new InlineKeyboard().switchInlineCurrent("← Back", `ct:open ${listId}`),
          },
        ], { cache_time: 0, is_personal: true });
      }
      
      const parsed = parseTaskText(taskText);
      const newTask = addCollabTask(userId, listId, parsed, ctx.from?.username);
      
      if (!newTask) {
        return safeAnswerInline(ctx, [
          {
            type: "article",
            id: `ct_addfail_${sessionKey}`,
            title: "⚠️ Could not add task",
            description: "You may not be a member of this list",
            thumbnail_url: "https://img.icons8.com/fluency/96/error.png",
            input_message_content: { message_text: "_" },
            reply_markup: new InlineKeyboard().switchInlineCurrent("← My Lists", "ct: "),
          },
        ], { cache_time: 0, is_personal: true });
      }
      
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `ct_added_${newTask.id}`,
          title: `✅ Task Added to ${list.name}`,
          description: parsed.text.slice(0, 40),
          thumbnail_url: "https://img.icons8.com/fluency/96/checkmark.png",
          input_message_content: {
            message_text: `✅ <b>Task Added!</b>\n\n👥 <b>${escapeHTML(list.name)}</b>\n\n⬜ ${escapeHTML(parsed.text)}\n\n<i>via StarzAI • Starz Check</i>`,
            parse_mode: "HTML",
          },
          reply_markup: new InlineKeyboard()
            .switchInlineCurrent("📋 View List", `ct:open ${listId}`)
            .switchInlineCurrent("← My Lists", "ct: "),
        },
      ], { cache_time: 0, is_personal: true });
    }
    
    // Unknown - show help
    return safeAnswerInline(ctx, [
      {
        type: "article",
        id: `ct_help_${sessionKey}`,
        title: "👥 Starz Check - Collab Help",
        description: "ct: lists • ct:new <name> • ct:join <code>",
        thumbnail_url: "https://img.icons8.com/fluency/96/help.png",
        input_message_content: {
          message_text: `👥 <b>Starz Check - Collab Help</b>\n\n<code>ct:</code> - View your shared lists\n<code>ct:new Party Planning</code> - Create new list\n<code>ct:join ABC123</code> - Join with code\n<code>ct:open [id]</code> - Open specific list\n\n<i>via StarzAI • Starz Check</i>`,
          parse_mode: "HTML",
        },
        reply_markup: new InlineKeyboard()
          .switchInlineCurrent("👥 My Lists", "ct: ")
          .switchInlineCurrent("← Back", ""),
      },
    ], { cache_time: 0, is_personal: true });
  }
  
  // "p:" or "p " - Partner mode (chat with your AI partner)
  // Uses deferred response pattern: sends placeholder immediately, then edits with AI response
  if (qLower.startsWith("p:") || qLower.startsWith("p ")) {
    const message = q.slice(2).trim();
    const partner = getPartner(userId);
    
    if (!partner?.name) {
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `p_nopartner_${sessionKey}`,
          title: "🤝🏻 No Partner Set Up",
          description: "Use /partner in bot DM to create your AI companion",
          thumbnail_url: "https://img.icons8.com/fluency/96/heart.png",
          input_message_content: { 
            message_text: "🤝🏻 *Set up your Partner first!*\n\nGo to @starztechbot DM and use:\n\n\`/partner name [name]\`\n\`/partner personality [traits]\`\n\`/partner background [story]\`\n\`/partner style [how they talk]\`\n\nThen come back and chat!",
            parse_mode: "Markdown"
          },
        },
      ], { cache_time: 0, is_personal: true });
    }
    
    if (!message) {
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `p_typing_${sessionKey}`,
          title: `🤝🏻 Chat with ${partner.name}`,
          description: "Type your message to your partner",
          thumbnail_url: "https://img.icons8.com/fluency/96/heart.png",
          input_message_content: { message_text: "_" },
          reply_markup: new InlineKeyboard().switchInlineCurrent("← Back to Menu", ""),
        },
      ], { cache_time: 0, is_personal: true });
    }
    
    // Generate a unique key for this request
    const pKey = makeId(6);
    const escapedPartnerName = escapeHTML(partner.name);
    
    // Store pending request - will be processed in chosen_inline_result
    inlineCache.set(`p_pending_${pKey}`, {
      prompt: message,
      userId: String(userId),
      model,
      shortModel,
      partner,
      createdAt: Date.now(),
    });
    setTimeout(() => inlineCache.delete(`p_pending_${pKey}`), 5 * 60 * 1000);
    
    // Return placeholder immediately - AI response will be edited in
    return safeAnswerInline(ctx, [
      {
        type: "article",
        id: `p_start_${pKey}`,
        title: `🤝🏻 ${partner.name}: ${message.slice(0, 30)}`,
        description: "Tap to chat with your partner",
        thumbnail_url: "https://img.icons8.com/fluency/96/heart.png",
        input_message_content: {
          message_text: `🤝🏻 <b>${escapedPartnerName}</b>\n\n⏳ <i>${partner.name} is thinking...</i>\n\n<i>via StarzAI • Partner • ${shortModel}</i>`,
          parse_mode: "HTML",
        },
        // IMPORTANT: Must include reply_markup to receive inline_message_id
        reply_markup: new InlineKeyboard().text("⏳ Loading...", "noop"),
      },
    ], { cache_time: 0, is_personal: true });
  }
  
  // "r " or "r:" - Research shortcut
  // Uses deferred response pattern: sends placeholder immediately, then edits with AI response
  if (qLower.startsWith("r ") || qLower.startsWith("r:")) {
    const topic = q.slice(2).trim();
    
    if (!topic) {
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `r_typing_${sessionKey}`,
          title: "🔍 Research",
          description: "Type your research topic...",
          thumbnail_url: "https://img.icons8.com/fluency/96/search.png",
          input_message_content: { message_text: "_" },
          reply_markup: new InlineKeyboard().switchInlineCurrent("← Back to Menu", ""),
        },
      ], { cache_time: 0, is_personal: true });
    }
    
    // Generate a unique key for this request
    const rKey = makeId(6);
    const escapedTopic = escapeHTML(topic);
    
    // Store pending request - will be processed in chosen_inline_result
    inlineCache.set(`r_pending_${rKey}`, {
      type: "research",
      prompt: topic,
      userId: String(userId),
      model,
      shortModel,
      createdAt: Date.now(),
    });
    
    // Send placeholder immediately - this won't timeout!
    // IMPORTANT: Must include reply_markup (inline keyboard) to receive inline_message_id in chosen_inline_result
    return safeAnswerInline(ctx, [
      {
        type: "article",
        id: `r_start_${rKey}`,
        title: `🔍 ${topic.slice(0, 40)}`,
        description: "🔄 Tap to start research...",
        thumbnail_url: "https://img.icons8.com/fluency/96/search.png",
        input_message_content: {
          message_text: `🔍 <b>Research: ${escapedTopic}</b>\n\n⏳ <i>Researching... Please wait...</i>\n\n<i>via StarzAI • ${shortModel}</i>`,
          parse_mode: "HTML",
        },
        // Keyboard is required to get inline_message_id for editing!
        reply_markup: new InlineKeyboard().text("⏳ Loading...", `r_loading_${rKey}`),
      },
    ], { cache_time: 0, is_personal: true });
  }
  
  
  // "s" or "s " - Settings shortcut - show model categories with navigation buttons
  if (qLower === "s" || qLower === "s ") {
    const user = getUserRecord(userId);
    const tier = user?.tier || "free";
    
    const results = [
      {
        type: "article",
        id: `s_free_${sessionKey}`,
        title: `🆓 Free Models (${FREE_MODELS.length})`,
        description: "➡️ Tap button to view",
        thumbnail_url: "https://img.icons8.com/fluency/96/free.png",
        input_message_content: { message_text: "_" },
        reply_markup: new InlineKeyboard().switchInlineCurrent("🆓 View Free Models", "s:free "),
      },
    ];
    
    if (tier === "premium" || tier === "ultra") {
      results.push({
        type: "article",
        id: `s_premium_${sessionKey}`,
        title: `⭐ Premium Models (${PREMIUM_MODELS.length})`,
        description: "➡️ Tap button to view",
        thumbnail_url: "https://img.icons8.com/fluency/96/star.png",
        input_message_content: { message_text: "_" },
        reply_markup: new InlineKeyboard().switchInlineCurrent("⭐ View Premium Models", "s:premium "),
      });
    }
    
    if (tier === "ultra") {
      results.push({
        type: "article",
        id: `s_ultra_${sessionKey}`,
        title: `💎 Ultra Models (${ULTRA_MODELS.length})`,
        description: "➡️ Tap button to view",
        thumbnail_url: "https://img.icons8.com/fluency/96/diamond.png",
        input_message_content: { message_text: "_" },
        reply_markup: new InlineKeyboard().switchInlineCurrent("💎 View Ultra Models", "s:ultra "),
      });
    }
    
    results.push({
      type: "article",
      id: `s_current_${sessionKey}`,
      title: `✅ Current: ${shortModel}`,
      description: "Your selected model",
      thumbnail_url: "https://img.icons8.com/fluency/96/checkmark.png",
      input_message_content: { message_text: "_" },
    });
    
    return safeAnswerInline(ctx, results, { cache_time: 0, is_personal: true });
  }
  
  // "s:free", "s:premium", "s:ultra" - Show models in category
  if (qLower.startsWith("s:") && qLower.length > 2) {
    const category = qLower.slice(2).trim();
    const user = getUserRecord(userId);
    const tier = user?.tier || "free";
    
    let models = [];
    if (category === "free" || category.startsWith("free")) models = FREE_MODELS;
    else if ((category === "premium" || category.startsWith("premium")) && (tier === "premium" || tier === "ultra")) models = PREMIUM_MODELS;
    else if ((category === "ultra" || category.startsWith("ultra")) && tier === "ultra") models = ULTRA_MODELS;
    
    if (models.length === 0) {
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `s_noaccess_${sessionKey}`,
          title: "🚫 No access to this tier",
          description: "Upgrade to access more models",
          thumbnail_url: "https://img.icons8.com/fluency/96/lock.png",
          input_message_content: { message_text: "_" },
        },
      ], { cache_time: 0, is_personal: true });
    }
    
    const results = models.map((m, i) => {
      const mShort = m.split("/").pop();
      const isSelected = m === model;
      return {
        type: "article",
        id: `s_model_${i}_${sessionKey}`,
        title: `${isSelected ? "✅ " : ""}${mShort}`,
        description: isSelected ? "Currently selected" : "➡️ Tap button to select",
        thumbnail_url: isSelected 
          ? "https://img.icons8.com/fluency/96/checkmark.png"
          : "https://img.icons8.com/fluency/96/robot.png",
        input_message_content: { message_text: "_" },
        reply_markup: isSelected 
          ? new InlineKeyboard().switchInlineCurrent("← Back to Settings", "s ")
          : new InlineKeyboard().switchInlineCurrent(`Select ${mShort}`, `set:${m} `),
      };
    });
    
    // Add back button
    results.push({
      type: "article",
      id: `s_back_${sessionKey}`,
      title: "← Back to Categories",
      description: "Return to settings",
      thumbnail_url: "https://img.icons8.com/fluency/96/back.png",
      input_message_content: { message_text: "_" },
      reply_markup: new InlineKeyboard().switchInlineCurrent("← Back", "s "),
    });
    
    return safeAnswerInline(ctx, results, { cache_time: 0, is_personal: true });
  }
  
  // "set:modelname" - Actually set the model
  if (qLower.startsWith("set:")) {
    const newModel = q.slice(4).trim();
    const user = getUserRecord(userId);
    const tier = user?.tier || "free";
    const allowedModels = allModelsForTier(tier);
    
    if (allowedModels.includes(newModel)) {
      // Set the model
      setUserModel(userId, newModel);
      const inlineSess = getInlineSession(userId);
      inlineSess.model = newModel;
      
      const newShortModel = newModel.split("/").pop();
      
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `set_done_${sessionKey}`,
          title: `✅ Model set to ${newShortModel}`,
          description: "➡️ Tap button to go back",
          thumbnail_url: "https://img.icons8.com/fluency/96/checkmark.png",
          input_message_content: { message_text: "_" },
          reply_markup: new InlineKeyboard().switchInlineCurrent("← Back to Menu", ""),
        },
      ], { cache_time: 0, is_personal: true });
    } else {
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `set_err_${sessionKey}`,
          title: "❌ Model not available",
          description: "You don't have access to this model",
          thumbnail_url: "https://img.icons8.com/fluency/96/cancel.png",
          input_message_content: { message_text: "_" },
          reply_markup: new InlineKeyboard().switchInlineCurrent("← Back", "s "),
        },
      ], { cache_time: 0, is_personal: true });
    }
  }
  
  // =====================
  // ORIGINAL HANDLERS
  // =====================
  
  // "yap" filter - legacy shared chat mode (now removed)
  if (qLower === "yap" || (qLower.startsWith("yap ") && !qLower.includes(":"))) {
    return safeAnswerInline(ctx, [
      {
        type: "article",
        id: `yap_disabled_${sessionKey}`,
        title: "Yap mode has been removed",
        description: "Use other inline modes instead (q:, b:, code:, e:, sum:, p:).",
        thumbnail_url: "https://img.icons8.com/fluency/96/conference-call.png",
        input_message_content: {
          message_text: "👥 Yap (shared group chat) mode has been removed.\n\nUse other inline modes instead:\n\n• q:  – Quark (quick answers)\n• b:  – Blackhole (deep research)\n• code: – Programming help\n• e:  – Explain (ELI5)\n• sum: – Summarize\n• p:  – Partner chat",
          parse_mode: "Markdown",
        },
      },
    ], { cache_time: 0, is_personal: true });
  }
  
  // c:key: message - Continue conversation (Reply button)
  // Match c:XXXXXX: or c:XXXXXX (with or without trailing colon/space)
  const cMatch = q.match(/^c:([a-zA-Z0-9]+):?\s*(.*)$/i);
  if (cMatch) {
    const cacheKey = cMatch[1];
    const userMessage = (cMatch[2] || "").trim();
    
    const cached = inlineCache.get(cacheKey);
    
    if (!cached) {
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `c_expired_${sessionKey}`,
          title: "⚠️ Session Expired",
          description: "Start a new conversation",
          thumbnail_url: "https://img.icons8.com/fluency/96/error.png",
          input_message_content: { message_text: "_" },
          reply_markup: new InlineKeyboard().switchInlineCurrent("← Back to Menu", ""),
        },
      ], { cache_time: 0, is_personal: true });
    }
    
    if (!userMessage) {
      // Show typing hint with context
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `c_typing_${sessionKey}`,
          title: "✍️ Type your follow-up...",
          description: `Previous: ${(cached.prompt || "").slice(0, 50)}...`,
          thumbnail_url: "https://img.icons8.com/fluency/96/chat.png",
          input_message_content: { message_text: "_" },
          reply_markup: new InlineKeyboard().switchInlineCurrent("← Back to Menu", ""),
        },
      ], { cache_time: 0, is_personal: true });
    }
    
    // Deferred reply: send placeholder immediately, compute answer after user sends
    const replyKey = makeId(6);
    const replyShortModel = model.split("/").pop();
    
    // Store pending payload for chosen_inline_result handler
    inlineCache.set(`pending_${replyKey}`, {
      cacheKey,
      userMessage,
      model,
      cached,
      userId: String(userId),
      createdAt: Date.now(),
    });
    setTimeout(() => inlineCache.delete(`pending_${replyKey}`), 30 * 60 * 1000);
    
    const preview = (cached.answer || "").replace(/\s+/g, " ").slice(0, 80);
    
    return safeAnswerInline(ctx, [
      {
        type: "article",
        id: `c_reply_${replyKey}`,
        title: `✉️ ${userMessage.slice(0, 40)}`,
        description: preview || "Send follow-up reply",
        thumbnail_url: "https://img.icons8.com/fluency/96/send.png",
        input_message_content: {
          message_text: `❓ *${userMessage}*\n\n⏳ _Thinking..._\n\n_via StarzAI • ${replyShortModel}_`,
          parse_mode: "Markdown",
        },
        reply_markup: new InlineKeyboard().text("⏳ Loading...", "reply_loading"),
      },
    ], { cache_time: 0, is_personal: true });
  }
  
  // yap:chatKey: message - legacy Yap mode (removed)
  if (qLower.startsWith("yap:") && q.includes(": ")) {
    return safeAnswerInline(ctx, [
      {
        type: "article",
        id: `yap_legacy_${sessionKey}`,
        title: "Yap mode has been removed",
        description: "Shared Yap chats are no longer supported.",
        thumbnail_url: "https://img.icons8.com/fluency/96/conference-call.png",
        input_message_content: {
          message_text: "👥 Yap (shared group chat) mode has been removed.\n\nUse other inline modes instead:\n\n• q:  – Quark (quick answers)\n• b:  – Blackhole (deep research)\n• code: – Programming help\n• e:  – Explain (ELI5)\n• sum: – Summarize\n• p:  – Partner chat",
          parse_mode: "Markdown",
        },
      },
    ], { cache_time: 0, is_personal: true });
  }
  
  // =====================
  // SETTINGS - All in popup, no messages sent!
  // =====================
  
  // "settings" - show model categories
  if (qLower === "settings" || qLower === "settings ") {
    const user = getUserRecord(userId);
    const tier = user?.tier || "free";
    const shortModel = model.split("/").pop();
    
    const results = [
      {
        type: "article",
        id: `set_cat_free_${sessionKey}`,
        title: "🆓 Free Models",
        description: `${FREE_MODELS.length} models available`,
        thumbnail_url: "https://img.icons8.com/fluency/96/free.png",
        input_message_content: { message_text: "_" },
        reply_markup: new InlineKeyboard().switchInlineCurrent("🆓 View Free Models", "settings:free "),
      },
    ];
    
    if (tier === "premium" || tier === "ultra") {
      results.push({
        type: "article",
        id: `set_cat_premium_${sessionKey}`,
        title: "⭐ Premium Models",
        description: `${PREMIUM_MODELS.length} models available`,
        thumbnail_url: "https://img.icons8.com/fluency/96/star.png",
        input_message_content: { message_text: "_" },
        reply_markup: new InlineKeyboard().switchInlineCurrent("⭐ View Premium Models", "settings:premium "),
      });
    }
    
    if (tier === "ultra") {
      results.push({
        type: "article",
        id: `set_cat_ultra_${sessionKey}`,
        title: "💎 Ultra Models",
        description: `${ULTRA_MODELS.length} models available`,
        thumbnail_url: "https://img.icons8.com/fluency/96/diamond.png",
        input_message_content: { message_text: "_" },
        reply_markup: new InlineKeyboard().switchInlineCurrent("💎 View Ultra Models", "settings:ultra "),
      });
    }
    
    // Back to main menu
    results.push({
      type: "article",
      id: `set_back_${sessionKey}`,
      title: `← Back (Current: ${shortModel})`,
      description: "Return to main menu",
      thumbnail_url: "https://img.icons8.com/fluency/96/back.png",
      input_message_content: { message_text: "_" },
      reply_markup: new InlineKeyboard().switchInlineCurrent("← Back", ""),
    });
    
    return safeAnswerInline(ctx, results, { cache_time: 0, is_personal: true });
  }
  
  // "settings:category" - show models in category
  if (qLower.startsWith("settings:")) {
    const category = qLower.split(":")[1]?.trim()?.split(" ")[0];
    const user = getUserRecord(userId);
    const tier = user?.tier || "free";
    const shortModel = model.split("/").pop();
    
    let models = [];
    let categoryTitle = "";
    let categoryEmoji = "";
    
    if (category === "free") {
      models = FREE_MODELS;
      categoryTitle = "Free";
      categoryEmoji = "🆓";
    } else if (category === "premium" && (tier === "premium" || tier === "ultra")) {
      models = PREMIUM_MODELS;
      categoryTitle = "Premium";
      categoryEmoji = "⭐";
    } else if (category === "ultra" && tier === "ultra") {
      models = ULTRA_MODELS;
      categoryTitle = "Ultra";
      categoryEmoji = "💎";
    }
    
    if (models.length === 0) {
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `set_noaccess_${sessionKey}`,
          title: "🚫 No Access",
          description: "Upgrade your tier to access these models",
          input_message_content: { message_text: "_" },
          reply_markup: new InlineKeyboard().switchInlineCurrent("← Back", "settings "),
        },
      ], { cache_time: 0, is_personal: true });
    }
    
    const results = models.map((m, i) => {
      const mShort = m.split("/").pop();
      const isSelected = m === model;
      return {
        type: "article",
        id: `set_model_${i}_${sessionKey}`,
        title: `${isSelected ? "✅ " : ""}${mShort}`,
        description: isSelected ? "Currently selected" : "Tap to select",
        thumbnail_url: isSelected 
          ? "https://img.icons8.com/fluency/96/checkmark.png"
          : "https://img.icons8.com/fluency/96/robot.png",
        input_message_content: { message_text: "_" },
        reply_markup: new InlineKeyboard().switchInlineCurrent(
          isSelected ? `✅ ${mShort}` : `Select ${mShort}`,
          `set:${m} `
        ),
      };
    });
    
    // Back button
    results.push({
      type: "article",
      id: `set_back_cat_${sessionKey}`,
      title: "← Back to Categories",
      description: "Return to category selection",
      thumbnail_url: "https://img.icons8.com/fluency/96/back.png",
      input_message_content: { message_text: "_" },
      reply_markup: new InlineKeyboard().switchInlineCurrent("← Back", "settings "),
    });
    
    return safeAnswerInline(ctx, results, { cache_time: 0, is_personal: true });
  }
  
  // "set:modelname" - select model (no message sent!)
  if (qLower.startsWith("set:")) {
    const newModel = q.slice(4).trim();
    const user = getUserRecord(userId);
    const tier = user?.tier || "free";
    const allowedModels = allModelsForTier(tier);
    
    if (allowedModels.includes(newModel)) {
      // Set the model
      setUserModel(userId, newModel);
      const inlineSess = getInlineSession(userId);
      inlineSess.model = newModel;
      
      const shortModel = newModel.split("/").pop();
      
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `set_done_${sessionKey}`,
          title: `✅ Model set to ${shortModel}`,
          description: "Tap to return to main menu",
          thumbnail_url: "https://img.icons8.com/fluency/96/checkmark.png",
          input_message_content: { message_text: "_" },
          reply_markup: new InlineKeyboard().switchInlineCurrent("← Back to Menu", ""),
        },
      ], { cache_time: 0, is_personal: true });
    } else {
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `set_err_${sessionKey}`,
          title: "❌ Model not available",
          description: "You don't have access to this model",
          thumbnail_url: "https://img.icons8.com/fluency/96/cancel.png",
          input_message_content: { message_text: "_" },
          reply_markup: new InlineKeyboard().switchInlineCurrent("← Back", "settings "),
        },
      ], { cache_time: 0, is_personal: true });
    }
  }
  
  // =====================
  // RESEARCH MODE
  // =====================
  
  // "research:" prefix - detailed research answer
  if (qLower.startsWith("research:") || qLower.startsWith("research ")) {
    const topic = q.replace(/^research[:\s]+/i, "").trim();
    
    if (!topic) {
      // Show typing hint - stays in popup
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `research_typing_${sessionKey}`,
          title: "✍️ Type your research topic...",
          description: "Example: quantum computing, climate change, AI",
          thumbnail_url: "https://img.icons8.com/fluency/96/search.png",
          input_message_content: { message_text: "_" },
          reply_markup: new InlineKeyboard().switchInlineCurrent("← Back", ""),
        },
      ], { cache_time: 0, is_personal: true });
    }
    
    try {
      const out = await llmText({
        model,
        messages: [
          { role: "system", content: "You are a research assistant. Provide detailed, well-structured, informative answers. Use bullet points and sections where appropriate. Be thorough but clear." },
          { role: "user", content: `Research and explain in detail: ${topic}` },
        ],
        temperature: 0.7,
        max_tokens: 800,
        timeout: 15000,
        retries: 1,
      });
      
      const answer = (out || "No results").slice(0, 3500);
      const shortModel = model.split("/").pop();
      
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `research_${makeId(6)}`,
          title: `✉️ Send: ${topic.slice(0, 35)}`,
          description: `🔍 ${answer.slice(0, 80)}...`,
          thumbnail_url: "https://img.icons8.com/fluency/96/send.png",
          input_message_content: {
            message_text: `🔍 *Research: ${topic}*\n\n${answer}\n\n_via StarzAI • ${shortModel}_`,
            parse_mode: "Markdown",
          },
        },
        {
          type: "article",
          id: `research_back_${sessionKey}`,
          title: "← Back to Menu",
          description: "Cancel and return",
          thumbnail_url: "https://img.icons8.com/fluency/96/back.png",
          input_message_content: { message_text: "_" },
          reply_markup: new InlineKeyboard().switchInlineCurrent("← Back", ""),
        },
      ], { cache_time: 0, is_personal: true });
    } catch (e) {
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `research_err_${sessionKey}`,
          title: "⚠️ Taking too long...",
          description: "Try a simpler topic",
          thumbnail_url: "https://img.icons8.com/fluency/96/error.png",
          input_message_content: { message_text: "_" },
          reply_markup: new InlineKeyboard().switchInlineCurrent("🔄 Try Again", `research: ${topic}`),
        },
        {
          type: "article",
          id: `research_back_err_${sessionKey}`,
          title: "← Back to Menu",
          description: "Cancel and return",
          thumbnail_url: "https://img.icons8.com/fluency/96/back.png",
          input_message_content: { message_text: "_" },
          reply_markup: new InlineKeyboard().switchInlineCurrent("← Back", ""),
        },
      ], { cache_time: 0, is_personal: true });
    }
  }
  
  // "translate" prefix - translation mode
  if (qLower.startsWith("translate")) {
    const match = q.match(/^translate\s+to\s+([\w]+)[:\s]+(.+)$/i);
    
    if (!match) {
      // Show language options or typing hint
      const partialMatch = q.match(/^translate\s+to\s+([\w]*)$/i);
      if (partialMatch) {
        // User is typing language, show common options
        const languages = ["English", "Spanish", "French", "German", "Chinese", "Japanese", "Korean", "Arabic", "Hindi", "Portuguese"];
        const typed = partialMatch[1]?.toLowerCase() || "";
        const filtered = languages.filter(l => l.toLowerCase().startsWith(typed));
        
        const results = filtered.slice(0, 8).map((lang, i) => ({
          type: "article",
          id: `translate_lang_${i}_${sessionKey}`,
          title: `🌐 Translate to ${lang}`,
          description: "Tap to select this language",
          thumbnail_url: "https://img.icons8.com/fluency/96/google-translate.png",
          input_message_content: { message_text: "_" },
          reply_markup: new InlineKeyboard().switchInlineCurrent(`🌐 ${lang}`, `translate to ${lang}: `),
        }));
        
        results.push({
          type: "article",
          id: `translate_back_${sessionKey}`,
          title: "← Back to Menu",
          description: "Cancel and return",
          thumbnail_url: "https://img.icons8.com/fluency/96/back.png",
          input_message_content: { message_text: "_" },
          reply_markup: new InlineKeyboard().switchInlineCurrent("← Back", ""),
        });
        
        return safeAnswerInline(ctx, results, { cache_time: 0, is_personal: true });
      }
      
      // Show typing hint
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `translate_typing_${sessionKey}`,
          title: "✍️ Type: translate to [language]: text",
          description: "Example: translate to Spanish: Hello",
          thumbnail_url: "https://img.icons8.com/fluency/96/google-translate.png",
          input_message_content: { message_text: "_" },
          reply_markup: new InlineKeyboard().switchInlineCurrent("← Back", ""),
        },
      ], { cache_time: 0, is_personal: true });
    }
    
    const targetLang = match[1];
    const textToTranslate = match[2].trim();
    
    try {
      const out = await llmText({
        model,
        messages: [
          { role: "system", content: `You are a translator. Translate the given text to ${targetLang}. Only output the translation, nothing else.` },
          { role: "user", content: textToTranslate },
        ],
        temperature: 0.3,
        max_tokens: 500,
        timeout: 10000,
        retries: 1,
      });
      
      const translation = (out || "Translation failed").trim();
      const shortModel = model.split("/").pop();
      
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `translate_${makeId(6)}`,
          title: `✉️ Send: ${translation.slice(0, 35)}`,
          description: `🌐 ${targetLang} translation`,
          thumbnail_url: "https://img.icons8.com/fluency/96/send.png",
          input_message_content: {
            message_text: `🌐 *Translation to ${targetLang}*\n\n📝 Original: ${textToTranslate}\n\n✅ ${targetLang}: ${translation}\n\n_via StarzAI • ${shortModel}_`,
            parse_mode: "Markdown",
          },
        },
        {
          type: "article",
          id: `translate_back_${sessionKey}`,
          title: "← Back to Menu",
          description: "Cancel and return",
          thumbnail_url: "https://img.icons8.com/fluency/96/back.png",
          input_message_content: { message_text: "_" },
          reply_markup: new InlineKeyboard().switchInlineCurrent("← Back", ""),
        },
      ], { cache_time: 0, is_personal: true });
    } catch (e) {
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `translate_err_${sessionKey}`,
          title: "⚠️ Translation failed",
          description: "Try again",
          thumbnail_url: "https://img.icons8.com/fluency/96/error.png",
          input_message_content: { message_text: "_" },
          reply_markup: new InlineKeyboard().switchInlineCurrent("🔄 Try Again", `translate to ${targetLang}: ${textToTranslate}`),
        },
        {
          type: "article",
          id: `translate_back_err_${sessionKey}`,
          title: "← Back to Menu",
          description: "Cancel and return",
          thumbnail_url: "https://img.icons8.com/fluency/96/back.png",
          input_message_content: { message_text: "_" },
          reply_markup: new InlineKeyboard().switchInlineCurrent("← Back", ""),
        },
      ], { cache_time: 0, is_personal: true });
    }
  }

  // "bhcont KEY" - Blackhole continuation via inline mode
  if (qLower.startsWith("bhcont")) {
    const parts = q.split(/\s+/);
    const contKey = (parts[1] || "").trim();

    if (!contKey) {
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `bhcont_hint_${sessionKey}`,
          title: "🗿🔬 Continue Blackhole",
          description: "Tap Continue under a Blackhole answer to use this.",
          thumbnail_url: "https://img.icons8.com/fluency/96/black-hole.png",
          input_message_content: { message_text: "_" },
          reply_markup: new InlineKeyboard().switchInlineCurrent("← Back", ""),
        },
      ], { cache_time: 0, is_personal: true });
    }

    const baseItem = inlineCache.get(contKey);
    if (!baseItem || baseItem.mode !== "blackhole") {
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `bhcont_expired_${sessionKey}`,
          title: "⚠️ Session expired",
          description: "Start a new Blackhole analysis.",
          thumbnail_url: "https://img.icons8.com/fluency/96/error.png",
          input_message_content: { message_text: "_" },
        },
      ], { cache_time: 0, is_personal: true });
    }

    if (String(userId) !== String(baseItem.userId)) {
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `bhcont_denied_${sessionKey}`,
          title: "🚫 Not your session",
          description: "Only the original requester can continue.",
          thumbnail_url: "https://img.icons8.com/fluency/96/lock.png",
          input_message_content: { message_text: "_" },
        },
      ], { cache_time: 0, is_personal: true });
    }

    const model = baseItem.model || ensureChosenModelValid(userId);
    const shortModel = model.split("/").pop();
    const prompt = baseItem.prompt || "";

    const pendingKey = makeId(6);
    inlineCache.set(`bh_cont_pending_${pendingKey}`, {
      baseKey: contKey,
      userId: String(userId),
      model,
      shortModel,
      createdAt: Date.now(),
    });
    setTimeout(() => inlineCache.delete(`bh_cont_pending_${pendingKey}`), 5 * 60 * 1000);

    const escapedPrompt = escapeHTML(prompt);

    return safeAnswerInline(ctx, [
      {
        type: "article",
        id: `bh_cont_start_${pendingKey}`,
        title: `🗿🔬 Continue Blackhole`,
        description: `Continue: ${prompt.slice(0, 40)}${prompt.length > 40 ? "..." : ""}`,
        thumbnail_url: "https://img.icons8.com/fluency/96/black-hole.png",
        input_message_content: {
          message_text: `🗿🔬 <b>Blackhole Analysis (cont.): ${escapedPrompt}</b>\n\n⏳ <i>Continuing in depth... Please wait...</i>\n\n<i>via StarzAI • Blackhole • ${shortModel}</i>`,
          parse_mode: "HTML",
        },
        reply_markup: new InlineKeyboard().text("⏳ Loading...", "bh_loading"),
      },
    ], { cache_time: 0, is_personal: true });
  }

  // "ultrasum KEY" - Ultra Summary for Blackhole / Explain / Code as a new inline message
  if (qLower.startsWith("ultrasum")) {
    const parts = q.split(/\s+/);
    const baseKey = (parts[1] || "").trim();

    const userRec = getUserRecord(userId);
    const tier = userRec?.tier || "free";
    if (tier !== "ultra") {
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `ultrasum_locked_${sessionKey}`,
          title: "🧾 Ultra Summary (Ultra only)",
          description: "Upgrade to Ultra to unlock Ultra Summary.",
          thumbnail_url: "https://img.icons8.com/fluency/96/diamond.png",
          input_message_content: {
            message_text:
              "💎 *Ultra Summary is an Ultra feature.*\n\n" +
              "Upgrade to Ultra to unlock:\n" +
              "• Ultra Summary for long answers\n" +
              "• Extra Shorter/Longer usage\n" +
              "• Access to all Ultra models\n\n" +
              "_Use the Plans button in the menu or /model for details._",
            parse_mode: "Markdown",
          },
        },
      ], { cache_time: 0, is_personal: true });
    }

    if (!baseKey) {
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `ultrasum_hint_${sessionKey}`,
          title: "🧾 Ultra Summary",
          description: "Tap Ultra Summary under a completed answer to use this.",
          thumbnail_url: "https://img.icons8.com/fluency/96/survey.png",
          input_message_content: { message_text: "_" },
          reply_markup: new InlineKeyboard().switchInlineCurrent("← Back", ""),
        },
      ], { cache_time: 0, is_personal: true });
    }

    const baseItem = inlineCache.get(baseKey);
    if (!baseItem) {
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `ultrasum_expired_${sessionKey}`,
          title: "⚠️ Session expired",
          description: "The original answer is no longer available.",
          thumbnail_url: "https://img.icons8.com/fluency/96/error.png",
          input_message_content: { message_text: "_" },
        },
      ], { cache_time: 0, is_personal: true });
    }

    if (String(userId) !== String(baseItem.userId)) {
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `ultrasum_denied_${sessionKey}`,
          title: "🚫 Not your session",
          description: "Only the original requester can summarize.",
          thumbnail_url: "https://img.icons8.com/fluency/96/lock.png",
          input_message_content: { message_text: "_" },
        },
      ], { cache_time: 0, is_personal: true });
    }

    const mode = baseItem.mode || "default";
    const supported = mode === "blackhole" || mode === "explain" || mode === "code";
    if (!supported || !baseItem.completed) {
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `ultrasum_incomplete_${sessionKey}`,
          title: "🧾 Ultra Summary",
          description: "Finish the answer first, then summarize.",
          thumbnail_url: "https://img.icons8.com/fluency/96/survey.png",
          input_message_content: { message_text: "_" },
        },
      ], { cache_time: 0, is_personal: true });
    }

    const modelForSum = baseItem.model || ensureChosenModelValid(userId);
    const shortModel = modelForSum.split("/").pop();
    const prompt = baseItem.prompt || "";

    const pendingKey = makeId(6);
    inlineCache.set(`ultrasum_pending_${pendingKey}`, {
      baseKey,
      userId: String(userId),
      mode,
      model: modelForSum,
      shortModel,
      createdAt: Date.now(),
    });
    setTimeout(() => inlineCache.delete(`ultrasum_pending_${pendingKey}`), 5 * 60 * 1000);

    const escapedPrompt = escapeHTML(prompt);
    let headerTitle = "Ultra Summary";
    if (mode === "blackhole") {
      const partsCount = baseItem.part || 1;
      headerTitle = `Ultra Summary of Blackhole (${partsCount} part${partsCount > 1 ? "s" : ""})`;
    } else if (mode === "code") {
      headerTitle = "Ultra Summary of Code Answer";
    } else if (mode === "explain") {
      headerTitle = "Ultra Summary of Explanation";
    }

    const icon =
      mode === "blackhole" ? "🗿🔬" : mode === "code" ? "💻" : mode === "explain" ? "🧠" : "🧾";
    const thumb =
      mode === "blackhole"
        ? "https://img.icons8.com/fluency/96/black-hole.png"
        : mode === "code"
        ? "https://img.icons8.com/fluency/96/source-code.png"
        : mode === "explain"
        ? "https://img.icons8.com/fluency/96/brain.png"
        : "https://img.icons8.com/fluency/96/survey.png";

    return safeAnswerInline(ctx, [
      {
        type: "article",
        id: `ultrasum_start_${pendingKey}`,
        title: "🧾 Ultra Summary",
        description: `Summarize: ${prompt.slice(0, 40)}${prompt.length > 40 ? "..." : ""}`,
        thumbnail_url: thumb,
        input_message_content: {
          message_text: `${icon} <b>${headerTitle}: ${escapedPrompt}</b>\n\n⏳ <i>Summarizing all parts... Please wait...</i>\n\n<i>via StarzAI • Ultra Summary • ${shortModel}</i>`,
          parse_mode: "HTML",
        },
        reply_markup: new InlineKeyboard().text("⏳ Loading...", "ultrasum_loading"),
      },
    ], { cache_time: 0, is_personal: true });
  }

  // "chat:" prefix - interactive chat mode
  if (q.startsWith("chat:")) {
    const userMessage = q.slice(5).trim();
    
    if (!userMessage) {
      // Just show current chat state
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `chatview_${sessionKey}`,
          title: "💬 View Chat",
          description: "See your conversation",
          input_message_content: {
            message_text: formatInlineChatDisplay(session, userId),
            parse_mode: "Markdown",
          },
          reply_markup: inlineChatKeyboard(sessionKey, session.history.length > 0),
        },
      ], { cache_time: 0, is_personal: true });
    }

    // User typed a message - process it
    try {
      const answer = await llmInlineChatReply({ userId, userText: userMessage, model });
      const updatedSession = getInlineSession(userId);
      
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `chatreply_${sessionKey}`,
          title: "💬 Send & View Chat",
          description: answer.slice(0, 80),
          input_message_content: {
            message_text: formatInlineChatDisplay(updatedSession, userId),
            parse_mode: "Markdown",
          },
          reply_markup: inlineChatKeyboard(sessionKey, true),
        },
      ], { cache_time: 0, is_personal: true });
    } catch (e) {
      console.error("Inline chat error:", e);
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `chaterr_${sessionKey}`,
          title: "⚠️ Error",
          description: "Model is slow. Try again.",
          input_message_content: {
            message_text: "⚠️ Model is slow right now. Please try again.",
          },
        },
      ], { cache_time: 0, is_personal: true });
    }
  }

  // "new:" prefix - clear and start new chat
  if (q.startsWith("new:")) {
    clearInlineSession(userId);
    const userMessage = q.slice(4).trim();
    
    if (!userMessage) {
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `newchat_${sessionKey}`,
          title: "🆕 New Chat Ready",
          description: "Type your first message",
          input_message_content: {
            message_text: formatInlineChatDisplay(getInlineSession(userId), userId),
            parse_mode: "Markdown",
          },
          reply_markup: inlineChatKeyboard(sessionKey, false),
        },
      ], { cache_time: 0, is_personal: true });
    }

    // Process first message
    try {
      const answer = await llmInlineChatReply({ userId, userText: userMessage, model });
      const updatedSession = getInlineSession(userId);
      
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `newreply_${sessionKey}`,
          title: "💬 New Chat",
          description: answer.slice(0, 80),
          input_message_content: {
            message_text: formatInlineChatDisplay(updatedSession, userId),
            parse_mode: "Markdown",
          },
          reply_markup: inlineChatKeyboard(sessionKey, true),
        },
      ], { cache_time: 0, is_personal: true });
    } catch (e) {
      console.error("New chat error:", e);
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `newerr_${sessionKey}`,
          title: "⚠️ Error",
          description: "Model is slow. Try again.",
          input_message_content: {
            message_text: "⚠️ Model is slow right now. Please try again.",
          },
        },
      ], { cache_time: 0, is_personal: true });
    }
  }

  // Regular query - quick one-shot answer
  // If web mode is enabled (or the query looks time-sensitive), try websearch + AI summary first.
  // Otherwise, fall back to offline quick answer.
  const quickKey = makeId(6);
  const quickShortModel = model.split("/").pop();
  const userRecord = getUserRecord(userId);
  const wantsWebsearch = userRecord?.webSearch || needsWebSearch(q);
  
  try {
    // Attempt websearch-backed answer if desired and quota allows
    if (wantsWebsearch) {
      const quota = consumeWebsearchQuota(userId);
      if (quota.allowed) {
        try {
          const searchResult = await webSearch(q, 5);
          if (searchResult.success && Array.isArray(searchResult.results) && searchResult.results.length > 0) {
            const searchContext = formatSearchResultsForAI(searchResult);
            const startTime = Date.now();
  
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
                    `User's question: ${q}\n\n` +
                    "The numbered search results above are your ONLY sources of truth. " +
                    "Write an answer that:\n" +
                    "1) Directly answers the user's question, and\n" +
                    "2) Explicitly cites sources using [1], [2], etc next to the claims.\n" +
                    "Do not cite sources that are not provided."
                }
              ],
              temperature: 0.6,
              max_tokens: 800,
              timeout: 15000,
              retries: 1,
            });
  
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  
            let aiText = aiResponse || "No answer generated.";
            aiText = linkifyWebsearchCitations(aiText, searchResult);
  
            // Store the full AI text (with citations) for regen / transforms
            inlineCache.set(quickKey, {
              prompt: q,
              answer: aiText,
              userId: String(userId),
              model,
              mode: "websearch",
              createdAt: Date.now(),
            });
            setTimeout(() => inlineCache.delete(quickKey), 30 * 60 * 1000);
  
            // Track in history
            addToHistory(userId, q, "websearch");
  
            const formattedAnswer = convertToTelegramHTML(aiText.slice(0, 3500));
            const escapedQ = escapeHTML(q);
            const sourcesHtml = buildWebsearchSourcesInlineHtml(searchResult, userId);
  
            await safeAnswerInline(ctx, [
              {
                type: "article",
                id: `answer_${quickKey}`,
                title: `🌐 ${q.slice(0, 40)}`,
                description: aiText.replace(/\s+/g, " ").slice(0, 80),
                thumbnail_url: "https://img.icons8.com/fluency/96/search.png",
                input_message_content: {
                  message_text:
                    `🌐 <b>Websearch</b>\n\n` +
                    `<b>Query:</b> <i>${escapedQ}</i>\n\n` +
                    `${formattedAnswer}${sourcesHtml}\n\n` +
                    `<i>🌐 ${searchResult.results.length} sources • ${elapsed}s • ${quickShortModel}</i>`,
                  parse_mode: "HTML",
                },
                reply_markup: inlineAnswerKeyboard(quickKey),
              },
            ], { cache_time: 0, is_personal: true });
  
            trackUsage(userId, "inline");
            return;
          }
        } catch (searchErr) {
          console.log("Inline quick websearch failed:", searchErr.message || searchErr);
          // Fall through to offline answer
        }
      } else {
        console.log(
          `Inline quick websearch quota exhausted for user ${userId}: used=${quota.used}, limit=${quota.limit}`
        );
      }
    }
  
    // Fallback: offline quick answer (no websearch or websearch unavailable)
    const out = await llmText({
      model,
      messages: [
        { role: "system", content: "Answer compactly and clearly. Prefer <= 900 characters." },
        { role: "user", content: q },
      ],
      temperature: 0.7,
      max_tokens: 240,
      timeout: 12000,
      retries: 1,
    });
  
    const answer = (out || "I couldn't generate a response.").slice(0, 2000);
  
    // Store for Reply/Regen/Shorter/Longer/Continue buttons
    inlineCache.set(quickKey, {
      prompt: q,
      answer,
      userId: String(userId),
      model,
      mode: "quick",
      createdAt: Date.now(),
    });
  
    // Schedule cleanup
    setTimeout(() => inlineCache.delete(quickKey), 30 * 60 * 1000);
  
    // Track in history
    addToHistory(userId, q, "default");
  
    // Convert AI answer to Telegram HTML format
    const formattedAnswer = convertToTelegramHTML(answer);
    const escapedQ = escapeHTML(q);
  
    await safeAnswerInline(ctx, [
      {
        type: "article",
        id: `answer_${quickKey}`,
        title: `⚡ ${q.slice(0, 40)}`,
        description: answer.slice(0, 80),
        thumbnail_url: "https://img.icons8.com/fluency/96/lightning-bolt.png",
        input_message_content: {
          message_text: `❓ <b>${escapedQ}</b>\n\n${formattedAnswer}\n\n<i>via StarzAI • ${quickShortModel}</i>`,
          parse_mode: "HTML",
        },
        reply_markup: inlineAnswerKeyboard(quickKey),
      },
    ], { cache_time: 0, is_personal: true });
  
  } catch (e) {
    console.error("Quick answer error:", e.message);
    const escapedQ = escapeHTML(q);
    await safeAnswerInline(ctx, [
      {
        type: "article",
        id: `error_${quickKey}`,
        title: `⚡ ${q.slice(0, 40)}`,
        description: "⚠️ Model is slow. Try again.",
        thumbnail_url: "https://img.icons8.com/fluency/96/error.png",
        input_message_content: {
          message_text: `❓ <b>${escapedQ}</b>\n\n⚠️ <i>Model is slow right now. Please try again.</i>\n\n<i>via StarzAI</i>`,
          parse_mode: "HTML",
        },
      },
    ], { cache_time: 0, is_personal: true });
  }
  
  trackUsage(userId, "inline");
});


