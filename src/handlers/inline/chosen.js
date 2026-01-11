/**
 * handlers/inline/chosen.js
 * Auto-extracted from index.js
 */

// =====================
// CHOSEN INLINE RESULT
// Lines 18194-19865 from original index.js
// =====================

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

// =====================
// CHOSEN INLINE RESULT - Store inlineMessageId when Yap is first sent
// =====================
bot.on("chosen_inline_result", async (ctx) => {
  const resultId = ctx.chosenInlineResult.result_id;
  const inlineMessageId = ctx.chosenInlineResult.inline_message_id;
  const userId = ctx.from?.id;
  const userName = ctx.from?.first_name || "User";
  
  console.log(`chosen_inline_result: resultId=${resultId}, inlineMessageId=${inlineMessageId}`);
  
  // Store inlineMessageId for yap_start results (legacy Yap mode - now disabled)
  if (resultId.startsWith("yap_start_")) {
    if (inlineMessageId) {
      try {
        await bot.api.editMessageTextInline(
          inlineMessageId,
          "👥 *Yap shared chat mode has been removed.*\n\nUse other inline modes instead:\n\n• `q:`  – Quark (quick answers)\n• `b:`  – Blackhole (deep research)\n• `code:` – Programming help\n• `e:`  – Explain (ELI5)\n• `sum:` – Summarize\n• `p:`  – Partner chat",
          { parse_mode: "Markdown" }
        );
      } catch {}
    }
    return;
  }
  
  // Handle yap_send - legacy Yap mode (now disabled)
  if (resultId.startsWith("yap_send_")) {
    if (inlineMessageId) {
      try {
        await bot.api.editMessageTextInline(
          inlineMessageId,
          "👥 *Yap shared chat mode has been removed.*",
          { parse_mode: "Markdown" }
        );
      } catch {}
    }
    return;
  }
  
  // Handle c_reply - user sent a reply to continue conversation
  if (resultId.startsWith("c_reply_")) {
    const replyKey = resultId.replace("c_reply_", "");
    const pending = inlineCache.get(`pending_${replyKey}`);
    
    if (!pending) {
      console.log(`Pending reply not found for key=${replyKey}`);
      return;
    }
    
    const { cacheKey, userMessage, model, cached } = pending;
    
    console.log(`Processing reply: ${userMessage}`);
    
    // Get AI response
    try {
      const messages = [
        { role: "system", content: "You are a helpful AI assistant. Continue the conversation naturally. Keep responses concise." },
      ];
      
      // Prefer rich history when available
      if (cached.history && cached.history.length > 0) {
        for (const msg of cached.history.slice(-6)) {
          messages.push({ role: msg.role, content: msg.content });
        }
      } else {
        // Fallback to single-turn prompt/answer
        if (cached.prompt) messages.push({ role: "user", content: cached.prompt });
        if (cached.answer) messages.push({ role: "assistant", content: cached.answer });
      }
      
      // Add new user message
      messages.push({ role: "user", content: userMessage });
      
      const out = await llmText({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 500,
      });
      
      const answer = (out || "I couldn't generate a response.").slice(0, 2000);
      const newKey = makeId(6);
      const shortModel = model.split("/").pop();
      
      // Build updated history (keep last 10 messages)
      const baseHistory =
        (cached.history && cached.history.length > 0)
          ? cached.history
          : [
              ...(cached.prompt ? [{ role: "user", content: cached.prompt }] : []),
              ...(cached.answer ? [{ role: "assistant", content: cached.answer }] : []),
            ];
      
      const newHistory = [
        ...baseHistory,
        { role: "user", content: userMessage },
        { role: "assistant", content: answer },
      ].slice(-10);
      
      // Store new conversation state for future replies
      inlineCache.set(newKey, {
        prompt: userMessage,
        answer,
        userId: pending.userId,
        model,
        mode: "chat",
        history: newHistory,
        timestamp: Date.now(),
      });
      
      // Schedule cleanup
      setTimeout(() => inlineCache.delete(newKey), 30 * 60 * 1000);
      
      // Update the inline message with the AI response
      if (inlineMessageId) {
        await bot.api.editMessageTextInline(
          inlineMessageId,
          `❓ *${userMessage}*\n\n${answer}\n\n_via StarzAI • ${shortModel}_`,
          { 
            parse_mode: "Markdown",
            reply_markup: inlineAnswerKeyboard(newKey)
          }
        );
        console.log(`Reply updated with AI response`);
      }
      
    } catch (e) {
      console.error("Failed to get AI response for reply:", e.message);
      
      // Update message to show error
      if (inlineMessageId) {
        try {
          await bot.api.editMessageTextInline(
            inlineMessageId,
            `❓ *${userMessage}*\n\n⚠️ _Error getting response. Try again!_\n\n_via StarzAI_`,
            { parse_mode: "Markdown" }
          );
        } catch {}
      }
    }
    
    // Clean up pending
    inlineCache.delete(`pending_${replyKey}`);
    return;
  }
  
  // Handle quick answer - user sent a quick question
  if (resultId.startsWith("quick_")) {
    const quickKey = resultId.replace("quick_", "");
    const pending = inlineCache.get(`quick_${quickKey}`);
    
    if (!pending) {
      console.log(`Pending quick answer not found for key=${quickKey}`);
      return;
    }
    
    const { prompt, model } = pending;
    const quickShortModel = model.split("/").pop();
    
    console.log(`Processing quick answer: ${prompt}`);
    
    // Get AI response
    try {
      const out = await llmText({
        model,
        messages: [
          { role: "system", content: "Answer compactly and clearly. Prefer <= 900 characters." },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 240,
      });
      
      const answer = (out || "I couldn't generate a response.").slice(0, 2000);
      const newKey = makeId(6);
      
      // Store for Reply/Regen/Shorter/Longer/Continue buttons
      inlineCache.set(newKey, {
        prompt,
        answer,
        userId: pending.userId,
        model,
        mode: "quick",
        createdAt: Date.now(),
      });
      
      // Schedule cleanup
      setTimeout(() => inlineCache.delete(newKey), 30 * 60 * 1000);
      
      // Update the inline message with the AI response
      if (inlineMessageId) {
        await bot.api.editMessageTextInline(
          inlineMessageId,
          `❓ *${prompt}*\n\n${answer}\n\n_via StarzAI • ${quickShortModel}_`,
          { 
            parse_mode: "Markdown",
            reply_markup: inlineAnswerKeyboard(newKey)
          }
        );
        console.log(`Quick answer updated with AI response`);
      }
      
    } catch (e) {
      console.error("Failed to get AI response for quick answer:", e.message);
      
      // Update message to show error
      if (inlineMessageId) {
        try {
          await bot.api.editMessageTextInline(
            inlineMessageId,
            `❓ *${prompt}*\n\n⚠️ _Error getting response. Try again!_\n\n_via StarzAI_`,
            { parse_mode: "Markdown" }
          );
        } catch {}
      }
    }
    
    // Clean up pending
    inlineCache.delete(`quick_${quickKey}`);
    return;
  }
  
  // Handle Blackhole deferred response - bh_start_KEY
  // Now optionally uses web search when Web mode is ON or the topic looks time-sensitive.
  if (resultId.startsWith("bh_start_")) {
    const bhKey = resultId.replace("bh_start_", "");
    const pending = inlineCache.get(`bh_pending_${bhKey}`);
    
    if (!pending || !inlineMessageId) {
      console.log(`Blackhole pending not found or no inlineMessageId: bhKey=${bhKey}`);
      return;
    }
    
    const { prompt, model, shortModel, userId: ownerId } = pending;
    const ownerStr = String(ownerId || pending.userId || "");
    console.log(`Processing Blackhole: ${prompt}`);
    
    try {
      let searchResult = null;
      const userRec = ownerStr ? getUserRecord(ownerStr) : null;
      const wantsWebsearch = (userRec?.webSearch || needsWebSearch(prompt));
      
      // Try to fetch web search context if desired and quota allows
      if (wantsWebsearch && ownerStr) {
        const quota = consumeWebsearchQuota(ownerId || ownerStr);
        if (quota.allowed) {
          try {
            const result = await webSearch(prompt, 5);
            if (result.success && Array.isArray(result.results) && result.results.length > 0) {
              searchResult = result;
            }
          } catch (err) {
            console.log("Blackhole websearch failed:", err.message || err);
          }
        } else {
          console.log(
            `Blackhole websearch quota exhausted for user ${ownerStr}: used=${quota.used}, limit=${quota.limit}`
          );
        }
      }

      let systemContent;
      let userContent;

      if (searchResult) {
        const searchContext = formatSearchResultsForAI(searchResult);
        systemContent =
          "You are a research expert with access to real-time web search results. " +
          "Provide comprehensive, well-structured analysis with multiple perspectives. " +
          "Use headings, bullet points, and quote blocks (lines starting with '>') for key takeaways. " +
          "Base your answer ONLY on the search results provided. " +
          "Every non-obvious factual claim must be backed by a source index like [1], [2], etc. " +
          "When you summarize multiple sources, include multiple indices, e.g. [1][3]. " +
          "For specific numbers, dates, or names, always attach the source index. " +
          "Never invent citations or sources. " +
          "When you have fully covered the topic and there is nothing essential left to add, end your answer with a line containing only END_OF_BLACKHOLE.";
        userContent =
          `${searchContext}\n\n` +
          `User's topic for deep analysis: ${prompt}\n\n` +
          "Write a detailed analysis based ONLY on the search results above, with clear [n] citations tied to the numbered sources.";
      } else {
        systemContent =
          "You are a research expert. Provide comprehensive, well-structured analysis with multiple perspectives. " +
          "Include key facts, implications, and nuances. Use headings, bullet points, and quote blocks (lines starting with '>') for key takeaways. " +
          "Format your answer in clean Markdown. When you have fully covered the topic and there is nothing essential left to add, end your answer with a line containing only END_OF_BLACKHOLE.";
        userContent = `Provide deep analysis on: ${prompt}`;
      }

      const out = await llmText({
        model,
        messages: [
          { role: "system", content: systemContent },
          { role: "user", content: userContent },
        ],
        temperature: 0.7,
        max_tokens: 800,
      });

      const END_MARK = "END_OF_BLACKHOLE";
      let raw = out || "No results";
      if (searchResult) {
        raw = linkifyWebsearchCitations(raw, searchResult);
      }
      let completed = false;

      if (raw.includes(END_MARK)) {
        completed = true;
        raw = raw.replace(END_MARK, "").trim();
        // Nicely formatted closing marker for Telegram (horizontal rule + bold text)
        raw += "\n\n---\n**End of Blackhole analysis.**";
      }

      // Telegram messages are limited to ~4096 characters; keep Blackhole answers near that.
      let answer = raw.slice(0, 3500);
      // Avoid ending the first chunk mid-word or mid-sentence when possible.
      answer = trimIncompleteTail(answer);
      const newKey = makeId(6);
      
      // Store for Regen/Shorter/Longer/Continue buttons
      inlineCache.set(newKey, {
        prompt,
        answer,
        fullAnswer: raw,
        userId: pending.userId,
        model,
        mode: "blackhole",
        completed,
        part: 1,
        // Persist searchResult so future parts can reuse the same sources list
        searchResult: searchResult || null,
        createdAt: Date.now(),
      });
      setTimeout(() => inlineCache.delete(newKey), 30 * 60 * 1000);
      
      // Track in history
      addToHistory(pending.userId, prompt, "blackhole");
      
      // Convert and update
      const formattedAnswer = convertToTelegramHTML(answer);
      const escapedPrompt = escapeHTML(prompt);
      const partLabel = completed ? "Part 1 – final" : "Part 1";

      // Only show sources inline when the analysis is complete
      const sourcesHtml =
        completed && searchResult
          ? buildWebsearchSourcesInlineHtml(searchResult, ownerStr || pending.userId)
          : "";

      await bot.api.editMessageTextInline(
        inlineMessageId,
        `🗿🔬 <b>Blackhole Analysis (${partLabel}): ${escapedPrompt}</b>\n\n${formattedAnswer}${sourcesHtml}\n\n<i>via StarzAI • Blackhole • ${shortModel}</i>`,
        { 
          parse_mode: "HTML",
          reply_markup: inlineAnswerKeyboard(newKey)
        }
      );
      console.log(`Blackhole updated with AI response`);
      
    } catch (e) {
      console.error("Failed to get Blackhole response:", e.message);
      const escapedPrompt = escapeHTML(prompt);
      try {
        await bot.api.editMessageTextInline(
          inlineMessageId,
          `🗿🔬 <b>Blackhole Analysis: ${escapedPrompt}</b>\n\n⚠️ <i>Error getting response. Try again!</i>\n\n<i>via StarzAI</i>`,
          { parse_mode: "HTML" }
        );
      } catch {}
    }
    
    // Clean up pending
    inlineCache.delete(`bh_pending_${bhKey}`);
    return;
  }

  // Handle Blackhole continuation deferred response - bh_cont_start_KEY
  if (resultId.startsWith("bh_cont_start_")) {
    const contId = resultId.replace("bh_cont_start_", "");
    const pending = inlineCache.get(`bh_cont_pending_${contId}`);
    
    if (!pending || !inlineMessageId) {
      console.log(`Blackhole continuation pending not found or no inlineMessageId: contId=${contId}`);
      return;
    }

    const { baseKey, model, shortModel, userId: ownerId } = pending;
    const baseItem = inlineCache.get(baseKey);
    if (!baseItem || baseItem.mode !== "blackhole") {
      console.log(`Base Blackhole item missing for continuation: baseKey=${baseKey}`);
      try {
        await bot.api.editMessageTextInline(
          inlineMessageId,

