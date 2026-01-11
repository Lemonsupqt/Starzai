/**
 * handlers/messages.js
 * Auto-extracted from index.js
 */

// =====================
// DM / GROUP TEXT
// Lines 13970-14732 from original index.js
// =====================

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
// PHOTO HANDLER
// Lines 14733-14888 from original index.js
// =====================

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


