/**
 * handlers/inline/mode.js
 * Auto-extracted from index.js
 */

// =====================
// INLINE MODE - INTERACTIVE CHAT
// Lines 15310-18193 from original index.js
// =====================

  // Auto-register
  if (!getUserRecord(u.id)) registerUser(u);
  
  // Check if user has active character in this chat (for GC continuous conversation)
  const activeCharForUser = getActiveCharacter(u.id, chat.id);
  const userHasActiveChar = !!activeCharForUser?.name;
  
  // Check if this is a reply to a legacy Yap message (via @starztechbot)
  // Yap shared chat mode has been removed, so we no longer treat these specially.
  const replyTo = ctx.message?.reply_to_message;
  const isCharacterMessage = replyTo?.text?.startsWith("🎭");
  // (Replies are handled as normal messages below)

  // Check if user has pending todo input
  const pendingTodo = pendingTodoInput.get(String(u.id));
  if (pendingTodo && chat.type === "private") {
    pendingTodoInput.delete(String(u.id));
    
    // Check if not expired (5 min timeout)
    if (Date.now() - pendingTodo.timestamp < 5 * 60 * 1000) {
      if (pendingTodo.action === "add" && text.trim()) {
        const parsed = parseTaskText(text.trim());
        if (parsed.text) {
          const task = createTask(u.id, parsed);
          const userTodos = getUserTodos(u.id);
          
          await ctx.reply(
            `✅ *Task added!*\n\n${formatTaskDisplay(task, userTodos, false)}`,
            {
              parse_mode: "Markdown",
              reply_markup: new InlineKeyboard().text("📋 View Tasks", "todo_list")
            }
          );
          return;
        }
      }
      
      // Handle collab list creation
      if (pendingTodo.action === "collab_create" && text.trim()) {
        const listName = text.trim().slice(0, 50);
        const newList = createCollabList(u.id, listName);
        
        await ctx.reply(
          `✅ *List Created!*\n\n👥 *${listName}*\n\n🔑 Share this code with others:\n\`${newList.joinCode}\`\n\nThey can join with:\n\`/collab join ${newList.joinCode}\``,
          {
            parse_mode: "Markdown",
            reply_markup: new InlineKeyboard()
              .text("📋 View List", `collab_open:${newList.id}`)
              .text("👥 All Lists", "collab_list")
          }
        );
        return;
      }
      
      // Handle collab list join
      if (pendingTodo.action === "collab_join" && text.trim()) {
        const joinCode = text.trim().toUpperCase();
        const result = joinCollabList(u.id, joinCode, ctx.from?.username);
        
        if (result.success) {
          const list = result.list;
          await ctx.reply(
            `✅ *Joined Successfully!*\n\n👥 *${list.name}*\n\n👤 ${list.members.length} members\n📋 ${list.tasks.length} tasks`,
            {
              parse_mode: "Markdown",
              reply_markup: new InlineKeyboard()
                .text("📋 View List", `collab_open:${list.id}`)
                .text("👥 All Lists", "collab_list")
            }
          );
        } else {
          await ctx.reply(
            `⚠️ *${result.error || "Could not join list"}*\n\nCheck the code and try again.`,
            {
              parse_mode: "Markdown",
              reply_markup: new InlineKeyboard().text("🔗 Try Again", "collab_join")
            }
          );
        }
        return;
      }
    }
  }
  
  // Check if user has pending partner field input
  const pendingPartner = pendingPartnerInput.get(String(u.id));
  if (pendingPartner && chat.type === "private") {
    pendingPartnerInput.delete(String(u.id));
    
    // Check if not expired (5 min timeout)
    if (Date.now() - pendingPartner.timestamp < 5 * 60 * 1000) {
      const { field } = pendingPartner;
      const value = text.trim();
      
      if (value) {
        const maxLengths = { name: 50, personality: 200, background: 300, style: 200 };
        setPartner(u.id, { [field]: value.slice(0, maxLengths[field] || 200) });
        
        const partner = getPartner(u.id);
        await ctx.reply(
          `✅ *${field.charAt(0).toUpperCase() + field.slice(1)}* updated!\\n\\n` + buildPartnerSetupMessage(partner),
          { parse_mode: "Markdown", reply_markup: buildPartnerKeyboard(partner) }
        );
        return;
      }
    }
  }
  
  const feedbackHandled = await handleFeedbackIfActive(ctx);
  if (feedbackHandled) return;
  
  const model = ensureChosenModelValid(u.id);
  const botUsername = BOT_USERNAME || "";
  const botId = BOT_ID;

  // Group chat authorization + activation system:
  // - Groups must be explicitly authorized by the owner (/allowgroup &lt;chatId&gt;)
  // - If not authorized, the bot only responds with an authorization hint
  //   when explicitly invoked (mention, wake word, reply, or active character)
  // - When authorized:
  //   • By default, respond only when:
  //       - The message mentions the bot username, or
  //       - The message contains "Starz" or "Ai", or
  //       - The user replies to the bot, or
  //       - The user has an active character in this chat
  //   • If `/talk` has activated forced-active mode, respond to all messages
  //     for a short window.

  if (chat.type !== "private") {
    const lower = text.toLowerCase();
    const hasStarzWake = /\bstarz\b/.test(lower);
    const hasAiWake = /\bai\b/.test(lower);
    const hasWakeWord = hasStarzWake || hasAiWake;

    const isMentioned = botUsername
      ? lower.includes(`@${botUsername}`) || hasWakeWord
      : hasWakeWord;
    const isReplyToBot = botId && ctx.message?.reply_to_message?.from?.id === botId;
    const hasActiveChar = !!getActiveCharacter(u.id, chat.id)?.name;
    const groupForcedActive = isGroupActive(chat.id); // /talk-controlled

    // Track basic group metadata in prefsDb.groups
    ensurePrefsGroups();
    const gid = String(chat.id);
    const currentTitle = chat.title || chat.username || "";
    const existingGroup = prefsDb.groups[gid];
    if (!existingGroup) {
      prefsDb.groups[gid] = {
        id: gid,
        allowed: false,
        title: currentTitle || null,
        addedBy: null,
        updatedAt: new Date().toISOString(),
        note: null,
      };
      savePrefs();
    } else if (currentTitle && existingGroup.title !== currentTitle) {
      existingGroup.title = currentTitle;
      existingGroup.updatedAt = new Date().toISOString();
      savePrefs();
    }

    const groupAllowed = isGroupAuthorized(chat.id);

    if (!groupAllowed) {
      // Only show the authorization hint when the bot is explicitly invoked
      if (isMentioned || isReplyToBot || hasActiveChar) {
        const lines = [
          "🚫 *This group is not authorized to use StarzAI yet.*",
          "",
          `🆔 *Chat ID:* \`${chat.id}\``,
          "",
          "Ask the bot owner to run:",
          `\`/allowgroup ${chat.id}\``,
          "in a private chat with the bot.",
        ];

        let replyMarkup;
        if (FEEDBACK_CHAT_ID && BOT_USERNAME) {
          const kb = new InlineKeyboard();
          kb.url(
            "💡 Feedback",
            `https://t.me/${BOT_USERNAME}?start=group_${chat.id}`
          );
          replyMarkup = kb;
        }

        await ctx.reply(lines.join("\n"), {
          parse_mode: "Markdown",
          reply_markup: replyMarkup,
        });
      }
      return;
    }

    if (!groupForcedActive) {
      // Default anti-spam mode: ignore unless explicitly invoked or character mode is active
      if (!hasActiveChar && !isMentioned && !isReplyToBot) {
        return;
      }
    } else {
      // In forced-active mode (/talk), keep refreshing the timer on any message
      activateGroup(chat.id);
    }
  }
  
  // Smart image generation detection (works in both DM and GC)
  // Patterns: "generate image of X", "create image of X", "make image of X", "draw X", etc.
  // Also handles common typos like "genrate", "genarate"
  const imageGenPatterns = [
    /^(?:gen[ea]?rate|create|make|draw|paint|render)\s+(?:an?\s+)?(?:image|picture|photo|art|artwork|illustration)\s+(?:of\s+)?(.+)/i,
    /^(?:image|picture|photo)\s+(?:of\s+)?(.+)/i,
    /^draw\s+(?:me\s+)?(?:an?\s+)?(.+)/i,  // "draw me a cat", "draw a sunset"
  ];
  
  let imagePromptMatch = null;
  for (const pattern of imageGenPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      imagePromptMatch = match[1].trim();
      break;
    }
  }
  
  // If image generation detected and we have keys configured
  if (imagePromptMatch && deapiKeyManager.hasKeys()) {
    const user = ensureUser(u.id, u);
    
    // Check NSFW content and safe mode
    if (isNsfwPrompt(imagePromptMatch) && shouldEnforceSafeMode(u.id)) {
      const tier = user.tier || 'free';
      let message = "🔒 *Safe Mode Active*\n\n" +
        "Your prompt contains content that isn't allowed in safe mode.\n\n";
      
      if (tier === 'free') {
        message += "_Free users have safe mode enabled by default._\n" +
          "Upgrade to Premium or Ultra to access unrestricted image generation.";
      } else {
        message += "_You can disable safe mode in_ /imgset _to generate this content._";
      }
      
      await ctx.reply(message, { parse_mode: "Markdown", reply_to_message_id: messageId });
      return;
    }
    
    // Check for ratio in the prompt
    const detectedRatio = parseAspectRatioFromText(imagePromptMatch);
    const cleanedPrompt = detectedRatio ? cleanPromptFromRatio(imagePromptMatch) : imagePromptMatch;
    const finalPrompt = cleanedPrompt || imagePromptMatch;
    const aspectRatio = detectedRatio || user.imagePrefs?.defaultRatio || "1:1";
    const config = IMG_ASPECT_RATIOS[aspectRatio];
    
    console.log(`[IMG] Smart detection in ${chat.type}: "${finalPrompt}" in ${aspectRatio}`);
    
    const statusMsg = await ctx.reply(
      "🎨 *Generating your image...*\n\n" +
      `📝 _${finalPrompt.slice(0, 100)}${finalPrompt.length > 100 ? '...' : ''}_\n\n` +
      `📐 ${config.icon} ${config.label}\n\n` +
      "⏳ Please wait 5-15 seconds...",
      { parse_mode: "Markdown", reply_to_message_id: messageId }
    );
    
    pendingImagePrompts.set(u.id, {
      prompt: finalPrompt,
      messageId: statusMsg.message_id,
      chatId: chat.id,
      lastAspectRatio: aspectRatio
    });
    
    try {
      const imageBuffer = await generateDeAPIImage(finalPrompt, aspectRatio, u.id);
      
      const actionButtons = [
        [
          { text: "🔄 Regenerate", callback_data: `img_regen:${aspectRatio}` },
          { text: "📐 Change Ratio", callback_data: "img_change_ar" }
        ],
        [
          { text: "✨ New Image", callback_data: "img_new" }
        ]
      ];
      
      await ctx.api.sendPhoto(
        chat.id,
        new InputFile(imageBuffer, "generated_image.jpg"),
        {
          caption: `🎨 *Generated Image*\n\n` +
                   `📝 _${finalPrompt.slice(0, 200)}${finalPrompt.length > 200 ? '...' : ''}_\n\n` +
                   `📐 ${config.icon} ${config.label}\n` +
                   `⚡ _Powered by ${getRandomTagline(finalPrompt)}_`,
          parse_mode: "Markdown",
          reply_markup: { inline_keyboard: actionButtons },
          reply_to_message_id: messageId
        }
      );
      
      try { await ctx.api.deleteMessage(chat.id, statusMsg.message_id); } catch (e) {}
      console.log(`[IMG] Smart gen success for user ${u.id}: "${finalPrompt.slice(0, 50)}"`);
      return;
      
    } catch (error) {
      console.error("Smart image generation error:", error);
      try {
        await ctx.api.editMessageText(
          chat.id,
          statusMsg.message_id,
          "❌ *Image generation failed*\n\n" +
          `Error: ${error.message?.slice(0, 100) || 'Unknown error'}\n\n` +
          "Try \`/img your prompt\` or /imagine for alternatives.",
          { parse_mode: "Markdown" }
        );
      } catch (e) {}
      return;
    }
  }

  // Check if user is replying to a specific message
  const replyToMsg = ctx.message?.reply_to_message;
  let replyContext = "";
  let replyCharacter = null; // Character from replied message (for GC character continuation)
  
  if (replyToMsg && replyToMsg.text) {
    // Check if the replied message is a character message (contains "🎭 *CharName*" pattern)
    const charMatch = replyToMsg.text.match(/^🎭 \*?([^*\n]+)\*?\n/);
    if (charMatch && replyToMsg.from?.is_bot) {
      // Someone is replying to a character message - continue with that character
      replyCharacter = charMatch[1].trim();
    }
    
    // User is replying to a specific message - include that context
    const replyFrom = replyToMsg.from?.is_bot ? "AI" : "User";
    replyContext = `[Replying to ${replyFrom}'s message: "${replyToMsg.text.slice(0, 200)}"]

`;
  }

  const startTime = Date.now();
  let statusMsg = null;
  let typingInterval = null;
  let responseSent = false;

  try {
    // Send initial processing status - use HTML to avoid Markdown escaping issues
    // Make this a proper reply to the user's message so the final answer appears threaded.
    statusMsg = await ctx.reply(`⏳ Processing with <b>${model}</b>...`, {
      parse_mode: "HTML",
      reply_to_message_id: msg.message_id,
    });

    // Keep typing indicator active
    typingInterval = setInterval(() => {
      if (!responseSent) {
        ctx.replyWithChatAction("typing").catch(() => {});
      }
    }, 4000);
    await ctx.replyWithChatAction("typing");

    // Check if partner mode is active
    const partner = getPartner(u.id);
    const isPartnerMode = partner?.active && partner?.name;
    
    // Check if character mode is active
    // Priority: replyCharacter (from replied message) > activeCharForUser (user's active character)
    const effectiveCharacter = replyCharacter || activeCharForUser?.name;
    const isCharacterMode = !!effectiveCharacter;
    
    let systemPrompt;
    let out;
    let modeLabel = "";
    // For DM/GC web+AI mode: optional sources footer when web search is used
    let webSourcesFooterHtml = "";
    // For DM/GC: context for simple AI continuation ("Continue" button)
    let dmContinueContext = null;
    // Tracks whether the model explicitly signaled that the answer is finished
    let answerFinished = false;
    
    if (isPartnerMode) {
      // Partner mode - use partner's persona and separate chat history
      systemPrompt = buildPartnerSystemPrompt(partner);
      modeLabel = `🤝🏻 *${partner.name}*\n\n`;
      
      // Add user message to partner history
      addPartnerMessage(u.id, "user", text);
      const partnerHistory = getPartnerChatHistory(u.id);
      
      // Build messages array with partner history
      const messages = [
        { role: "system", content: systemPrompt },
        ...partnerHistory.map(m => ({ role: m.role, content: m.content })),
      ];
      
      out = await llmText({
        model,
        messages,
        temperature: 0.8,
        max_tokens: 500,
      });
      
      // Add AI response to partner history
      addPartnerMessage(u.id, "assistant", out);
      
    } else if (isCharacterMode) {
      // Character mode - roleplay as existing character
      // Use effectiveCharacter which could be from reply or active character
      systemPrompt = buildCharacterSystemPrompt(effectiveCharacter);
      modeLabel = `🎭 *${effectiveCharacter}*\n\n`;
      
      // Add user message to character history (only if it's their active character, not a reply)
      if (activeCharForUser?.name) {
        addCharacterMessage(u.id, chat.id, "user", text);
      }
      const charHistory = activeCharForUser?.name ? getCharacterChatHistory(u.id, chat.id) : [];
      
      // Build messages array with character history
      const messages = [
        { role: "system", content: systemPrompt },
        ...charHistory.map(m => ({ role: m.role, content: m.content })),
      ];
      
      out = await llmText({
        model,
        messages,
        temperature: 0.9,
        max_tokens: 500,
      });
      
      // Add AI response to character history (only if it's their active character)
      if (activeCharForUser?.name) {
        addCharacterMessage(u.id, chat.id, "assistant", out);
      }
      
    } else {
      // Normal mode - use persona or default
      const userRecord = getUserRecord(u.id);
      const persona = userRecord?.persona;
      
      // Check if it's a time/date query - handle directly without AI
      if (isTimeQuery(text)) {
        const timeResult = getTimeResponse(text, msg.date);
        await ctx.api.deleteMessage(chat.id, statusMsg.message_id).catch(() => {});
        
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        await ctx.reply(
          `${timeResult.response}\n\n⚡ ${elapsed}s`,
          { parse_mode: "HTML", reply_to_message_id: msg.message_id }
        );
        return;
      }

      // Owner-only smart extraction when replying to messages with links
      let extractContext = "";
      const isOwnerUser = OWNER_IDS.has(String(u.id));
      if (isOwnerUser && replyToMsg && PARALLEL_API_KEY) {
        try {
          const combined =
            (replyToMsg.text || "") + " " + (replyToMsg.caption || "");
          const urlMatches = combined.match(/https?:\/\/\S+/gi) || [];
          const urls = Array.from(
            new Set(
              urlMatches
                .map((uStr) => uStr.replace(/[),.]+$/g, ""))
                .filter(Boolean)
            )
          );

          if (urls.length > 0) {
            const extractResult = await parallelExtractUrls(
              urls.slice(0, 3)
            );
            if (
              extractResult.success &&
              Array.isArray(extractResult.results) &&
              extractResult.results.length > 0
            ) {
              const parts = extractResult.results.slice(0, 3).map((r, idx) => {
                const title = r.title || r.url || `Link ${idx + 1}`;
                const content = (r.content || "").slice(0, 4000);
                return `SOURCE ${idx + 1}: ${title}\\n${content}`;
              });
              extractContext =
                "\\n\\n[Extracted content from linked pages]\\n\\n" +
                parts.join("\\n\\n");
            }
          }
        } catch (extractErr) {
          console.log(
            "Smart extract (reply) failed:",
            extractErr.message || extractErr
          );
        }
      }
      
      // Check if query needs real-time web search
      // Either: user has webSearch toggle ON, or auto-detect triggers
      let searchContext = "";
      let searchResultForCitations = null;
      const wantsSearch = userRecord?.webSearch || needsWebSearch(text);
      if (wantsSearch) {
        const quota = consumeWebsearchQuota(u.id);
        if (quota.allowed) {
          try {
            await ctx.api
              .editMessageText(
                chat.id,
                statusMsg.message_id,
                `🔍 Searching the web for current info...`,
                { parse_mode: "HTML" }
              )
              .catch(() => {});
            
            const searchResult = await webSearch(text, 5);
            if (searchResult.success) {
              searchContext = "\n\n" + formatSearchResultsForAI(searchResult);
              searchResultForCitations = searchResult;
              modeLabel = "🌐 ";
            }
            
            await ctx.api
              .editMessageText(
                chat.id,
                statusMsg.message_id,
                `⏳ Processing with <b>${model}</b>...`,
                { parse_mode: "HTML" }
              )
              .catch(() => {});
          } catch (searchErr) {
            console.log("Auto-search failed:", searchErr.message);
          }
        } else {
          console.log(
            `Websearch quota exhausted for user ${u.id}: used=${quota.used}, limit=${quota.limit}`
          );
        }
      }
      
      const identityBase =
        "You are StarzTechBot, a friendly AI assistant on Telegram. " +
        "Be concise and direct - give short, helpful answers without unnecessary preamble or tips. " +
        "Don't advertise features or suggest commands unless specifically asked. " +
        "NEVER generate fake image URLs or links - you cannot generate images. If asked to create/generate/draw an image, tell the user to use /img or /imagine commands instead.";

      if (persona) {
        systemPrompt =
          identityBase +
          ` Your personality: ${persona}.` +
          (replyContext
            ? " The user is replying to a specific earlier message; pay close attention to that context when answering."
            : "");
      } else {
        systemPrompt =
          identityBase +
          (replyContext
            ? " The user is replying to a specific earlier message; focus your response on that context."
            : "");
      }

      // Add search context instruction and stricter citation rules if we have search results
      if (searchContext) {
        systemPrompt +=
          " You have access to real-time web search results below. Use them to provide accurate, up-to-date information. " +
          "Every non-obvious factual claim should be backed by a source index like [1], [2], etc. " +
          "When you summarize multiple sources, include multiple indices, e.g. [1][3]. " +
          "If you mention a specific number, date, name, or quote, always attach the source index. " +
          "Never invent citations; only use indices that exist in the search results.";
      }

      // Removed excessive help advertising - users already know they're using StarzTechBot
      systemPrompt +=
        " When you have fully answered the user's current request and there are no important points left to add, append the exact token END_OF_ANSWER at the very end of your reply. Omit this token if you believe a follow-up continuation could still be genuinely helpful.";

      const userTextWithContext = replyContext + (extractContext || "") + text + searchContext;

      out = await llmChatReply({
        chatId: chat.id,
        userText: userTextWithContext,
        systemPrompt,
        model,
      });

      // Check if the model explicitly marked the answer as finished
      if (typeof out === "string" && out.includes("END_OF_ANSWER")) {
        answerFinished = true;
        out = out
          .replace(/END_OF_ANSWER\s*$/g, "")
          .replace(/END_OF_ANSWER/g, "")
          .trimEnd();
      }

      // Store context so we can offer a simple "Continue" button later
      dmContinueContext = {
        systemPrompt,
        userTextWithContext,
        model,
        modeLabel,
      };

      // If we used web search, post-process the answer to add clickable [n] citations
      if (searchResultForCitations && typeof out === "string" && out.length > 0) {
        out = linkifyWebsearchCitations(out, searchResultForCitations);
        // Use [1], [2] style clickable indices in DM/GC sources footer, same as inline
        webSourcesFooterHtml = buildWebsearchSourcesInlineHtml(searchResultForCitations, u.id);
        if (dmContinueContext) {
          dmContinueContext.sourcesHtml = webSourcesFooterHtml;
        }
      }
    }

    // Mark response as sent to stop typing
    responseSent = true;
    if (typingInterval) clearInterval(typingInterval);

    // Track usage
    trackUsage(u.id, "message");

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    // Edit status message with response (cleaner than delete+send)
    const rawOutput =
      out && out.trim()
        ? out.slice(0, 3600)
        : "<i>I couldn't generate a response. Try rephrasing or switch models with /model</i>";
    const formattedOutput = convertToTelegramHTML(rawOutput);
    
    // Convert mode label (which still uses Markdown) into HTML
    const htmlModeLabel = modeLabel
      ? modeLabel.replace(/\*([^*]+)\*/g, "<b>$1</b>").replace(/_([^_]+)_/g, "<i>$1</i>")
      : "";

    // Offer a simple "Continue" button only when:
    // 1. The model did NOT explicitly mark the answer as finished (no END_OF_ANSWER marker)
    // 2. The response actually appears incomplete (smart detection)
    let replyMarkup;
    const maxTokensUsed = getMaxTokensForModel(model, 400);
    const looksIncomplete = responseNeedsContinuation(out, maxTokensUsed);
    const canOfferContinue = dmContinueContext && !answerFinished && looksIncomplete;

    if (canOfferContinue) {
      const key = makeId(8);
      dmContinueCache.set(key, {
        userId: u.id,
        chatId: chat.id,
        model: dmContinueContext.model,
        systemPrompt: dmContinueContext.systemPrompt,
        userTextWithContext: dmContinueContext.userTextWithContext,
        modeLabel: dmContinueContext.modeLabel,
        sourcesHtml: dmContinueContext.sourcesHtml || "",
        createdAt: Date.now(),
      });
      replyMarkup = new InlineKeyboard().text("➡️ Continue", `dm_ai_cont:${key}`);
    }

    const response = `${htmlModeLabel}${formattedOutput}${webSourcesFooterHtml}\n\n<i>⚡ ${elapsed}s • ${model}</i>`;
    if (statusMsg) {
      try {
        await ctx.api.editMessageText(chat.id, statusMsg.message_id, response, {
          parse_mode: "HTML",
          reply_markup: replyMarkup,
        });
      } catch (editErr) {
        // Fallback to new message if edit fails
        await ctx.reply(response, {
          parse_mode: "HTML",
          reply_to_message_id: msg.message_id,
          reply_markup: replyMarkup,
        });
      }
    } else {
      await ctx.reply(response, {
        parse_mode: "HTML",
        reply_to_message_id: msg.message_id,
        reply_markup: replyMarkup,
      });
    }
  } catch (e) {
    console.error(e);
    responseSent = true;
    if (typingInterval) clearInterval(typingInterval);
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const isTimeout = e.message?.includes("timed out");
    
    // Edit status message with error (cleaner than delete+send)
    const errMsg = isTimeout 
      ? `⏱️ Model <b>${model}</b> timed out after ${elapsed}s. Try /model to switch, or try again.`
      : `❌ Error after ${elapsed}s. Try again in a moment.`;
    if (statusMsg) {
      try {
        await ctx.api.editMessageText(chat.id, statusMsg.message_id, errMsg, { parse_mode: "HTML" });
      } catch {
        await ctx.reply(errMsg, {
          parse_mode: "HTML",
          reply_to_message_id: msg.message_id,
        });
      }
    } else {
      await ctx.reply(errMsg, {
        parse_mode: "HTML",
        reply_to_message_id: msg.message_id,
      });
    }
  }
});

// =====================
// PHOTO (DM and Groups with character support)
// =====================
bot.on("message:photo", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const chat = ctx.chat;
  const u = ctx.from;
  if (!u?.id) return;
  
  // Anti-spam check
  const caption = ctx.message?.caption || "";
  if (!(await checkAntiSpam(ctx, caption))) return;

  const feedbackHandled = await handleFeedbackIfActive(ctx, { caption });
  if (feedbackHandled) return;

  if (!getUserRecord(u.id)) registerUser(u);

  const model = ensureChosenModelValid(u.id);
  const startTime = Date.now();
  let statusMsg = null;
  
  // Check if user has active character
  const activeCharForUser = getActiveCharacter(u.id, chat.id);
  
  // Check if replying to a character message (like text handler does)
  let replyCharacter = null;
  const replyToMsg = ctx.message?.reply_to_message;
  if (replyToMsg?.from?.id === BOT_ID && replyToMsg?.text) {
    // Check if the replied message starts with a character label
    const charMatch = replyToMsg.text.match(/^🎭\s*(.+?)\n/);
    if (charMatch) {
      replyCharacter = charMatch[1].trim();
    }
  }
  
  // Priority: replyCharacter > activeCharForUser
  const effectiveCharacter = replyCharacter || activeCharForUser?.name;
  const isCharacterMode = !!effectiveCharacter;
  
  // In groups without character mode, only respond if mentioned in caption
  if (chat.type !== "private" && !isCharacterMode) {
    // Skip group photos unless character is active
    return;
  }

  try {
    // Send initial processing status for images
    const statusText = isCharacterMode 
      ? `🎭 <b>${escapeHTML(effectiveCharacter)}</b> is looking at the image...`
      : `🖼️ Analyzing image with <b>${escapeHTML(model)}</b>...`;
    statusMsg = await ctx.reply(statusText, { parse_mode: "HTML" });

    // Keep typing indicator active
    const typingInterval = setInterval(() => {
      ctx.replyWithChatAction("typing").catch(() => {});
    }, 4000);
    await ctx.replyWithChatAction("typing");

    const photos = ctx.message.photo;
    const best = photos[photos.length - 1];
    const file = await ctx.api.getFile(best.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;
    const b64 = await telegramFileToBase64(fileUrl);

    let out;
    let modeLabel = "";
    
    if (isCharacterMode) {
      // Character mode - respond to image as the character
      const characterPrompt = buildCharacterSystemPrompt(effectiveCharacter);
      const userPrompt = caption || "What do you see in this image? React to it.";
      
      // Add to character history only if it's their active character (not a reply to different char)
      if (activeCharForUser?.name && !replyCharacter) {
        addCharacterMessage(u.id, chat.id, "user", `[Sent an image] ${userPrompt}`);
      }
      const charHistory = (activeCharForUser?.name && !replyCharacter) ? getCharacterChatHistory(u.id, chat.id) : [];
      
      // Build messages with vision
      const messages = [
        { role: "system", content: characterPrompt + " The user is showing you an image. React to it in character." },
        ...charHistory.slice(0, -1).map(m => ({ role: m.role, content: m.content })),
        {
          role: "user",
          content: [
            { type: "text", text: userPrompt },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${b64}` } }
          ]
        }
      ];
      
      out = await llmText({
        model,
        messages,
        temperature: 0.9,
        max_tokens: 500,
      });
      
      // Add AI response to character history only if it's their active character
      if (activeCharForUser?.name && !replyCharacter) {
        addCharacterMessage(u.id, chat.id, "assistant", out);
      }
      modeLabel = `🎭 <b>${escapeHTML(effectiveCharacter)}</b>\n\n`;
      
    } else {
      // Normal vision mode
      out = await llmVisionReply({
        chatId: chat.id,
        userText: caption || "What's in this image? Describe it clearly.",
        imageBase64: b64,
        mime: "image/jpeg",
        model,
      });
    }

    clearInterval(typingInterval);

    // Track usage
    trackUsage(u.id, "message");

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    // Edit status message with response
    const formattedOutput = convertToTelegramHTML(out.slice(0, 3700));
    const response = `${modeLabel}${formattedOutput}\n\n<i>👁️ ${elapsed}s • ${escapeHTML(model)}</i>`;
    if (statusMsg) {
      try {
        await ctx.api.editMessageText(chat.id, statusMsg.message_id, response, { parse_mode: "HTML" });
      } catch {
        await ctx.reply(response, { parse_mode: "HTML" });
      }
    } else {
      await ctx.reply(response, { parse_mode: "HTML" });
    }
  } catch (e) {
    console.error("Vision error:", e.message);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    
    const isTimeout = e.message?.includes("timed out");
    const errMsg = isTimeout
      ? `⏱️ Vision timed out after ${elapsed}s. Try /model to switch.`
      : `❌ Couldn't process image after ${elapsed}s. Try again.`;
    if (statusMsg) {
      try {
        await ctx.api.editMessageText(chat.id, statusMsg.message_id, errMsg, { parse_mode: "HTML" });
      } catch {
        await ctx.reply(errMsg, { parse_mode: "HTML" });
      }
    } else {
      await ctx.reply(errMsg, { parse_mode: "HTML" });
    }
  }
});

// =====================
// VIDEO SUMMARIZATION
// =====================
bot.on("message:video", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const chat = ctx.chat;
  const u = ctx.from;
  if (!u?.id) return;
  
  // Anti-spam check
  const caption = ctx.message?.caption || "";
  if (!(await checkAntiSpam(ctx, caption))) return;
  
  // Feedback handling for video + caption (DM only)
  const feedbackHandled = await handleFeedbackIfActive(ctx, { caption });
  if (feedbackHandled) return;

  // In groups: only process if replying to bot or group is active
  if (chat.type !== "private") {
    const isReplyToBot = BOT_ID && ctx.message?.reply_to_message?.from?.id === BOT_ID;
    const groupActive = isGroupActive(chat.id);
    
    if (!isReplyToBot && !groupActive) {
      return; // Ignore videos in groups unless replying to bot or group is active
    }
    
    // Activate group on interaction
    if (isReplyToBot) {
      activateGroup(chat.id);
    }
  }

  if (!getUserRecord(u.id)) registerUser(u);

  const model = ensureChosenModelValid(u.id);
  const startTime = Date.now();
  let statusMsg = null;
  let tempDir = null;

  try {
    // Check video size (limit to 20MB)
    const video = ctx.message.video;
    if (video.file_size > 20 * 1024 * 1024) {
      return ctx.reply("⚠️ Video too large! Please send videos under 20MB.");
    }

    statusMsg = await ctx.reply(`🎬 <b>Processing video...</b>\n\n⏳ Downloading...`, { parse_mode: "HTML" });

    // Keep typing indicator active
    const typingInterval = setInterval(() => {
      ctx.replyWithChatAction("typing").catch(() => {});
    }, 4000);
    await ctx.replyWithChatAction("typing");

    // Download video
    const file = await ctx.api.getFile(video.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;
    const { tempDir: td, videoPath } = await downloadTelegramVideo(fileUrl);
    tempDir = td;

    // Update status
    await ctx.api.editMessageText(chat.id, statusMsg.message_id, 
      `🎬 <b>Processing video...</b>\n\n✅ Downloaded\n⏳ Extracting frames...`, 
      { parse_mode: "HTML" }
    ).catch(() => {});

    // Extract frames - more frames for better context
    const videoDuration = video.duration || 10;
    const frameCount = Math.min(Math.max(Math.ceil(videoDuration / 2), 5), 15); // 1 frame per 2 seconds, min 5, max 15
    let { frames, duration, error: frameError } = await extractVideoFrames(videoPath, tempDir, frameCount);
    
    // Fallback: use Telegram's video thumbnail if ffmpeg failed
    if (frames.length === 0 && video.thumb) {
      console.log("[VIDEO] Using Telegram thumbnail as fallback");
      try {
        const thumbFile = await ctx.api.getFile(video.thumb.file_id);
        const thumbUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${thumbFile.file_path}`;
        const thumbB64 = await telegramFileToBase64(thumbUrl);
        frames = [{ timestamp: "0.0", base64: thumbB64 }];
        duration = video.duration || 0;
      } catch (thumbErr) {
        console.error("[VIDEO] Thumbnail fallback failed:", thumbErr.message);
      }
    }

    // Update status
    await ctx.api.editMessageText(chat.id, statusMsg.message_id, 
      `🎬 <b>Processing video...</b>\n\n✅ Downloaded\n✅ ${frames.length > 0 ? `Got ${frames.length} frame(s)` : "No frames (using thumbnail)"}\n⏳ Transcribing audio...`, 
      { parse_mode: "HTML" }
    ).catch(() => {});

    // Extract and transcribe audio (skip if ffmpeg not available)
    let transcript = null;
    let hasAudio = false;
    if (!frameError || !frameError.includes("ffmpeg not installed")) {
      const audioResult = await extractAndTranscribeAudio(videoPath, tempDir);
      transcript = audioResult.transcript;
      hasAudio = audioResult.hasAudio;
    }

    // Update status
    await ctx.api.editMessageText(chat.id, statusMsg.message_id, 
      `🎬 <b>Processing video...</b>\n\n✅ Downloaded\n✅ Extracted ${frames.length} frames\n✅ Audio ${hasAudio ? (transcript ? "transcribed" : "detected (no speech)") : "not found"}\n⏳ Analyzing with AI...`, 
      { parse_mode: "HTML" }
    ).catch(() => {});

    // Build prompt for AI
    const caption = (ctx.message.caption || "").trim();
    const hasQuestion = caption && (caption.includes("?") || /^(who|what|where|when|why|how|is|are|can|does|did|explain|tell|describe|identify)/i.test(caption));
    
    let userPrompt = caption || "What's happening in this video? Describe the content.";
    
    // Add transcript context if available
    if (transcript) {
      userPrompt += `\n\n[Audio transcript]: ${transcript.slice(0, 1500)}`;
    }

    // Build messages with multiple frames
    const imageContents = frames.map((f, i) => ({
      type: "image_url",
      image_url: { url: `data:image/jpeg;base64,${f.base64}` }
    }));

    // Context-aware system prompt - emphasize accuracy over speculation
    let systemPrompt = `You are analyzing a ${duration.toFixed(1)}s video through ${frames.length} sequential frame(s) taken at regular intervals. `;
    
    // Core instruction: be accurate, don't hallucinate
    systemPrompt += `\n\nIMPORTANT RULES:
- ONLY describe what you can actually SEE in the frames
- DO NOT make up or guess things that aren't visible
- If you're unsure about something, say "appears to be" or "possibly"
- If you can't identify something, say so honestly
- Focus on observable facts: people, objects, actions, text, setting\n\n`;
    
    if (transcript) {
      systemPrompt += "Audio transcript is provided - use it to understand context, identify speech, music, or sounds. ";
    }
    if (hasQuestion) {
      systemPrompt += "Answer the user's specific question based ONLY on what you can see/hear. If you can't answer from the video, say so.";
    } else if (caption) {
      systemPrompt += "Respond to the user's message based on what you observe in the video.";
    } else {
      systemPrompt += "Describe what's happening: the setting, people/characters, actions, any visible text, and notable details. Be specific and factual.";
    }

    const messages = [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          { type: "text", text: userPrompt },
          ...imageContents
        ]
      }
    ];

    const out = await llmText({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 800,
    });

    clearInterval(typingInterval);

    // Track usage
    trackUsage(u.id, "message");

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    // Build response - cleaner format
    let response = convertToTelegramHTML(out.slice(0, 3500));
    response += `\n\n<i>🎬 ${elapsed}s • ${escapeHTML(model)}</i>`;

    await ctx.api.editMessageText(chat.id, statusMsg.message_id, response, { parse_mode: "HTML" });

  } catch (e) {
    console.error("Video processing error:", e.message);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    
    const errMsg = `❌ Couldn't process video after ${elapsed}s.\n\nError: ${escapeHTML(e.message?.slice(0, 100) || "Unknown error")}`;
    if (statusMsg) {
      try {
        await ctx.api.editMessageText(chat.id, statusMsg.message_id, errMsg, { parse_mode: "HTML" });
      } catch {
        await ctx.reply(errMsg, { parse_mode: "HTML" });
      }
    } else {
      await ctx.reply(errMsg, { parse_mode: "HTML" });
    }
  } finally {
    // Clean up temp files
    if (tempDir) {
      cleanupTempDir(tempDir);
    }
  }
});

// Video notes (round videos) - treat as photos using thumbnail
bot.on("message:video_note", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const chat = ctx.chat;
  const u = ctx.from;
  if (!u?.id) return;
  
  // Anti-spam check
  if (!(await checkAntiSpam(ctx, "video_note"))) return;
  
  // In groups: only process if replying to bot or group is active
  if (chat.type !== "private") {
    const isReplyToBot = BOT_ID && ctx.message?.reply_to_message?.from?.id === BOT_ID;
    const groupActive = isGroupActive(chat.id);
    const hasActiveChar = !!getActiveCharacter(u.id, chat.id)?.name;
    
    if (!isReplyToBot && !groupActive && !hasActiveChar) {
      return;
    }
  }
  
  // Use the video note thumbnail as an image
  const videoNote = ctx.message.video_note;
  if (videoNote.thumb) {
    try {
      const thumbFile = await ctx.api.getFile(videoNote.thumb.file_id);
      const thumbUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${thumbFile.file_path}`;
      const b64 = await telegramFileToBase64(thumbUrl);
      
      const model = ensureChosenModelValid(u.id);
      const caption = "What's in this video note?";
      
      const statusMsg = await ctx.reply(`📹 Analyzing video note...`, { parse_mode: "HTML" });
      
      const out = await llmVision({
        chatId: chat.id,
        userText: caption,
        imageBase64: b64,
        mime: "image/jpeg",
        model,
      });
      
      const response = `📹 <b>Video Note</b>\n\n${convertToTelegramHTML(out.slice(0, 3500))}`;
      await ctx.api.editMessageText(chat.id, statusMsg.message_id, response, { parse_mode: "HTML" });
    } catch (e) {
      console.error("Video note error:", e.message);
      await ctx.reply("❌ Couldn't process video note.");
    }
  }
});

// Animations/GIFs
bot.on("message:animation", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const chat = ctx.chat;
  const u = ctx.from;
  if (!u?.id) return;
  
  // Anti-spam check
  const caption = ctx.message?.caption || "";
  if (!(await checkAntiSpam(ctx, caption))) return;
  
  // In groups: only process if replying to bot or group is active or has character
  if (chat.type !== "private") {
    const isReplyToBot = BOT_ID && ctx.message?.reply_to_message?.from?.id === BOT_ID;
    const groupActive = isGroupActive(chat.id);
    const hasActiveChar = !!getActiveCharacter(u.id, chat.id)?.name;
    
    if (!isReplyToBot && !groupActive && !hasActiveChar) {
      return;
    }
    
    if (isReplyToBot) {
      activateGroup(chat.id);
    }
  }
  
  if (!getUserRecord(u.id)) registerUser(u);
  
  const animation = ctx.message.animation;
  const model = ensureChosenModelValid(u.id);
  const startTime = Date.now();
  
  // Check for character mode
  const activeChar = getActiveCharacter(u.id, chat.id);
  const replyToMsg = ctx.message?.reply_to_message;
  let replyCharacter = null;
  
  if (replyToMsg?.text) {
    const charMatch = replyToMsg.text.match(/^🎭 \*?([^*\n]+)\*?\n/);
    if (charMatch && replyToMsg.from?.is_bot) {
      replyCharacter = charMatch[1].trim();
    }
  }
  
  const effectiveCharacter = replyCharacter || activeChar?.name;
  const isCharacterMode = !!effectiveCharacter;
  
  let statusMsg = null;
  let tempDir = null;
  
  try {
    let modeLabel = "";
    let statusText = `🎬 Analyzing GIF...`;
    
    if (isCharacterMode) {
      modeLabel = `🎭 <b>${escapeHTML(effectiveCharacter)}</b>\n\n`;
      statusText = `🎭 ${escapeHTML(effectiveCharacter)} is looking at the GIF...`;
    }
    
    statusMsg = await ctx.reply(statusText, { parse_mode: "HTML" });
    
    // Download the actual GIF file
    const file = await ctx.api.getFile(animation.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;
    
    // Try to extract frames using ffmpeg
    let frames = [];
    let duration = animation.duration || 3;
    
    try {
      const { tempDir: td, videoPath } = await downloadTelegramVideo(fileUrl);
      tempDir = td;
      const result = await extractVideoFrames(videoPath, tempDir, 4);
      frames = result.frames;
      if (result.duration > 0) duration = result.duration;
    } catch (dlErr) {
      console.log("[GIF] Frame extraction failed, trying thumbnail:", dlErr.message);
    }
    
    // Fallback to thumbnail if frame extraction failed
    if (frames.length === 0 && animation.thumb) {
      try {
        const thumbFile = await ctx.api.getFile(animation.thumb.file_id);
        const thumbUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${thumbFile.file_path}`;
        const thumbB64 = await telegramFileToBase64(thumbUrl);
        frames = [{ timestamp: "0.0", base64: thumbB64 }];
      } catch (thumbErr) {
        console.error("[GIF] Thumbnail fallback failed:", thumbErr.message);
      }
    }
    
    if (frames.length === 0) {
      return ctx.api.editMessageText(chat.id, statusMsg.message_id, "⚠️ Couldn't extract frames from GIF.", { parse_mode: "HTML" });
    }
    
    // Build image contents for AI
    const imageContents = frames.map(f => ({
      type: "image_url",
      image_url: { url: `data:image/jpeg;base64,${f.base64}` }
    }));
    
    // Context-aware prompt
    const hasQuestion = caption && (caption.includes("?") || /^(who|what|where|when|why|how|is|are|can|does|did|explain|tell|describe|identify)/i.test(caption));
    let userPrompt = caption || "What's in this GIF? Describe what's happening.";
    
    let out;
    if (isCharacterMode) {
      const systemPrompt = buildCharacterSystemPrompt(effectiveCharacter);
      out = await llmText({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: caption || "React to this GIF" },
              ...imageContents
            ]
          }
        ],
        temperature: 0.85,
        max_tokens: 500,
      });
    } else {
      let gifSystemPrompt = `You are analyzing a ${duration}s GIF/animation through ${frames.length} sequential frame(s).\n\nIMPORTANT: Only describe what you can actually SEE. Don't guess or make things up. If it's a meme, describe the visual elements and any text. If you recognize a person/character, name them. If unsure, say so.\n\n`;
      if (hasQuestion) {
        gifSystemPrompt += "Answer the user's specific question based on what you see.";
      } else if (caption) {
        gifSystemPrompt += "Respond to the user's message based on what you observe.";
      } else {
        gifSystemPrompt += "Describe: the scene, any people/characters, actions, visible text, and if it's a meme/joke, explain it.";
      }
      
      out = await llmText({
        model,
        messages: [
          { role: "system", content: gifSystemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: userPrompt },
              ...imageContents
            ]
          }
        ],
        temperature: 0.7,
        max_tokens: 500,
      });
    }
    
    trackUsage(u.id, "message");
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    
    const response = `${modeLabel}${convertToTelegramHTML(out.slice(0, 3500))}\n\n<i>🎬 ${elapsed}s • ${escapeHTML(model)}</i>`;
    await ctx.api.editMessageText(chat.id, statusMsg.message_id, response, { parse_mode: "HTML" });
    
  } catch (e) {
    console.error("Animation error:", e.message);
    const errMsg = `❌ Couldn't process GIF: ${escapeHTML(e.message?.slice(0, 50) || "Unknown error")}`;
    if (statusMsg) {
      await ctx.api.editMessageText(chat.id, statusMsg.message_id, errMsg, { parse_mode: "HTML" }).catch(() => {});
    } else {
      await ctx.reply(errMsg, { parse_mode: "HTML" });
    }
  } finally {
    if (tempDir) cleanupTempDir(tempDir);
  }
});

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

