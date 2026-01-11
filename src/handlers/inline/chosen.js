/**
 * handlers/inline/chosen.js
 * Auto-extracted from index.js
 */

// =====================
// CHOSEN INLINE RESULT
// Lines 18194-19865 from original index.js
// =====================

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
          `🗿🔬 <b>Blackhole Analysis (cont.)</b>\n\n⚠️ <i>Session expired. Start a new Blackhole analysis.</i>`,
          { parse_mode: "HTML" }
        );
      } catch {}
      return;
    }

    if (String(ctx.from?.id || "") !== String(ownerId)) {
      console.log(`Blackhole continuation denied: not owner`);
      try {
        await bot.api.editMessageTextInline(
          inlineMessageId,
          `🗿🔬 <b>Blackhole Analysis (cont.)</b>\n\n⚠️ <i>Only the original requester can continue this analysis.</i>`,
          { parse_mode: "HTML" }
        );
      } catch {}
      return;
    }

    const prompt = baseItem.prompt || "";
    console.log(`Processing Blackhole continuation for prompt: ${prompt}`);

    try {
      const MAX_DISPLAY = 3500;
      const CONTEXT_LEN = 900;

      let fullAnswer = baseItem.fullAnswer || baseItem.answer || "";
      fullAnswer = trimIncompleteTail(fullAnswer);
      const context = fullAnswer.slice(-CONTEXT_LEN);

      const out = await llmText({
        model,
        messages: [
          {
            role: "system",
            content:
              "You are a research expert continuing a long, structured deep-dive (Blackhole mode). The text below may end mid-sentence; rewrite the ending smoothly and then continue the analysis. Keep the same structure and style as earlier sections: use headings, bullet points, and occasional quote blocks (lines starting with '>') for key takeaways. Do not reprint earlier sections verbatim; only extend from the end. When there is nothing important left to add, end your answer with a line containing only END_OF_BLACKHOLE.",
          },
          {
            role: "user",
            content: `TEXT SO FAR:\n${context}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 700,
      });

      const END_MARK = "END_OF_BLACKHOLE";
      let continuation = (out || "").trim();
      let completed = false;

      if (continuation.includes(END_MARK)) {
        completed = true;
        continuation = continuation.replace(END_MARK, "").trim();
        // Nicely formatted closing marker for Telegram (horizontal rule + bold text)
        continuation += "\n\n---\n**End of Blackhole analysis.**";
      }

      // Clean tail of continuation to avoid ending mid-word/mid-sentence when possible.
      continuation = trimIncompleteTail(continuation);

      const newFull = (fullAnswer + (continuation ? "\n\n" + continuation : "")).trim();

      const newKey = makeId(6);
      const part = (baseItem.part || 1) + 1;

      inlineCache.set(newKey, {
        prompt,
        answer: continuation.slice(0, MAX_DISPLAY),
        fullAnswer: newFull,
        userId: ownerId,
        model,
        mode: "blackhole",
        completed,
        part,
        // Carry forward any searchResult from the base item so final part can show sources
        searchResult: baseItem.searchResult || null,
        createdAt: Date.now(),
      });
      setTimeout(() => inlineCache.delete(newKey), 30 * 60 * 1000);

      // Update base item as well so future continues from any chunk share history
      baseItem.fullAnswer = newFull;
      baseItem.part = part;
      if (completed) baseItem.completed = true;
      inlineCache.set(baseKey, baseItem);

      const formattedAnswer = convertToTelegramHTML(continuation.slice(0, MAX_DISPLAY));
      const escapedPrompt = escapeHTML(prompt);
      const partLabel = completed ? `Part ${part} – final` : `Part ${part}`;
      const sourcesHtml =
        completed && baseItem.searchResult
          ? buildWebsearchSourcesInlineHtml(baseItem.searchResult, ownerId)
          : "";

      await bot.api.editMessageTextInline(
        inlineMessageId,
        `🗿🔬 <b>Blackhole Analysis (${partLabel}): ${escapedPrompt}</b>\n\n${formattedAnswer}${sourcesHtml}\n\n<i>via StarzAI • Blackhole • ${shortModel}</i>`,
        { 
          parse_mode: "HTML",
          reply_markup: inlineAnswerKeyboard(newKey),
        }
      );
      console.log(`Blackhole continuation updated with AI response`);
    } catch (e) {
      console.error("Failed to get Blackhole continuation response:", e.message);
      try {
        await bot.api.editMessageTextInline(
          inlineMessageId,
          `🗿🔬 <b>Blackhole Analysis (cont.)</b>\n\n⚠️ <i>Error getting continuation. Try again!</i>\n\n<i>via StarzAI</i>`,
          { parse_mode: "HTML" }
        );
      } catch {}
    }

    inlineCache.delete(`bh_cont_pending_${contId}`);
    return;
  }

  // Handle Ultra Summary deferred response - ultrasum_start_KEY
  if (resultId.startsWith("ultrasum_start_")) {
    const sumId = resultId.replace("ultrasum_start_", "");
    const pending = inlineCache.get(`ultrasum_pending_${sumId}`);

    if (!pending || !inlineMessageId) {
      console.log(`Ultra Summary pending not found or no inlineMessageId: sumId=${sumId}`);
      return;
    }

    const { baseKey, mode, model, shortModel, userId: ownerId } = pending;
    const ownerRec = getUserRecord(ownerId);
    if (ownerRec?.tier !== "ultra") {
      console.log("Ultra Summary denied: user not Ultra");
      try {
        await bot.api.editMessageTextInline(
          inlineMessageId,
          `🧾 <b>Ultra Summary</b>\n\n⚠️ <i>This feature is only available for Ultra users.</i>`,
          { parse_mode: "HTML" }
        );
      } catch {}
      inlineCache.delete(`ultrasum_pending_${sumId}`);
      return;
    }

    const baseItem = inlineCache.get(baseKey);
    if (!baseItem) {
      console.log(`Base item missing for Ultra Summary: baseKey=${baseKey}`);
      try {
        await bot.api.editMessageTextInline(
          inlineMessageId,
          `🧾 <b>Ultra Summary</b>\n\n⚠️ <i>Session expired. Run the answer again.</i>`,
          { parse_mode: "HTML" }
        );
      } catch {}
      return;
    }

    if (String(ctx.from?.id || "") !== String(ownerId)) {
      console.log(`Ultra Summary denied: not owner`);
      try {
        await bot.api.editMessageTextInline(
          inlineMessageId,
          `🧾 <b>Ultra Summary</b>\n\n⚠️ <i>Only the original requester can summarize this answer.</i>`,
          { parse_mode: "HTML" }
        );
      } catch {}
      return;
    }

    const full = (baseItem.fullAnswer || baseItem.answer || "").trim();
    if (!full || full.length < 50) {
      try {
        await bot.api.editMessageTextInline(
          inlineMessageId,
          `🧾 <b>Ultra Summary</b>\n\n⚠️ <i>Answer is too short to summarize.</i>`,
          { parse_mode: "HTML" }
        );
      } catch {}
      inlineCache.delete(`ultrasum_pending_${sumId}`);
      return;
    }

    const summaryInput = full.slice(0, 12000);
    let systemPrompt =
      "Summarize the content below into a brief, well-structured overview. Use short bullet points and 1–3 very short paragraphs at most. Keep the whole summary compact (no more than a few hundred words).";
    let titlePrefix = "Ultra Summary";
    let icon = "🧾 ";
    if (mode === "blackhole") {
      const parts = baseItem.part || 1;
      systemPrompt =
        `You are summarizing a multi-part deep-dive answer (Parts 1–${parts}). ` +
        "Provide 5–9 very short bullet points that capture the main arguments, key evidence, and final conclusions. " +
        "Avoid long paragraphs, quotes, or code. Keep it tight and scan-friendly.";
      titlePrefix = `Ultra Summary of Blackhole (${parts} part${parts > 1 ? "s" : ""})`;
      icon = "🗿🔬 ";
    } else if (mode === "code") {
      systemPrompt =
        "Summarize the programming answer in 4–7 concise bullet points. Describe the purpose of the code, the main steps, and how to run/use it. Mention languages and key functions or modules, but do not repeat long code snippets. Keep it short.";
      titlePrefix = "Ultra Summary of Code Answer";
      icon = "💻 ";
    } else if (mode === "explain") {
      systemPrompt =
        "Summarize the explanation in 3–6 very short bullet points so it's easy to scan. Each bullet should be 1 short sentence. Focus only on the core ideas.";
      titlePrefix = "Ultra Summary of Explanation";
      icon = "🧠 ";
    }

    try {
      const summaryOut = await llmText({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `TEXT TO SUMMARIZE:\n\n${summaryInput}` },
        ],
        temperature: 0.4,
        max_tokens: 260,
      });

      // Base truncation limit
      let summary = (summaryOut || "No summary available.").slice(0, 1200);

      // Clean up incomplete tail (mid-word / mid-sentence)
      summary = trimIncompleteTail(summary, 220);

      // Drop any dangling heading/bullet line at the very end (like "• Recent Discoveries:")
      const lines = summary.split("\n");
      while (lines.length > 0) {
        const last = lines[lines.length - 1].trim();
        if (!last) {
          // Drop empty trailing lines
          lines.pop();
          continue;
        }
        const isHeaderOnly =
          // Ends with ":" and has no period/question/exclamation afterwards
          (/[:：]\s*$/.test(last) && !/[.!?]\s*$/.test(last)) ||
          // Bullet with very short content
          (/^[•\-*]\s+.+$/.test(last) && last.length < 40);
        if (isHeaderOnly) {
          lines.pop();
          continue;
        }
        break;
      }
      summary = lines.join("\n").trim();

      const newKey = makeId(6);

      inlineCache.set(newKey, {
        prompt: baseItem.prompt || "",
        answer: summary,
        fullAnswer: summary,
        userId: ownerId,
        model,
        mode: "summarize",
        completed: true,
        createdAt: Date.now(),
      });
      setTimeout(() => inlineCache.delete(newKey), 30 * 60 * 1000);

      const formatted = convertToTelegramHTML(summary);
      const escapedPrompt = escapeHTML(baseItem.prompt || "");
      const title =
        mode === "blackhole"
          ? `${titlePrefix}: ${escapedPrompt}`
          : escapedPrompt
          ? `${titlePrefix}: ${escapedPrompt}`
          : titlePrefix;

      await bot.api.editMessageTextInline(
        inlineMessageId,
        `${icon} <b>${title}</b>\n\n${formatted}\n\n<i>via StarzAI • Ultra Summary • ${shortModel}</i>`,
        {
          parse_mode: "HTML",
          reply_markup: inlineAnswerKeyboard(newKey),
        }
      );
      console.log("Ultra Summary updated with AI response");
    } catch (e) {
      console.error("Failed to get Ultra Summary response:", e.message);
      try {
        await bot.api.editMessageTextInline(
          inlineMessageId,
          `🧾 <b>Ultra Summary</b>\n\n⚠️ <i>Error summarizing. Try again!</i>\n\n<i>via StarzAI</i>`,
          { parse_mode: "HTML" }
        );
      } catch {}
    }

    inlineCache.delete(`ultrasum_pending_${sumId}`);
    return;
  }
  
  // Handle Character intro - char_intro_KEY
  if (resultId.startsWith("char_intro_")) {
    const charKey = resultId.replace("char_intro_", "");
    const cached = inlineCache.get(charKey);
    
    if (cached && cached.character && inlineMessageId) {
      // Store the inline message ID so we can handle replies
      inlineCache.set(`char_msg_${charKey}`, {
        ...cached,
        inlineMessageId,
      });
      console.log(`Stored character intro inlineMessageId for key=${charKey}, character=${cached.character}`);
    }
    return;
  }
  
  // Handle Research deferred response - r_start_KEY
  if (resultId.startsWith("r_start_")) {
    const rKey = resultId.replace("r_start_", "");
    const pending = inlineCache.get(`r_pending_${rKey}`);
    
    if (!pending || !inlineMessageId) {
      console.log(`Research pending not found or no inlineMessageId: rKey=${rKey}`);
      return;
    }
    
    const { prompt, model, shortModel } = pending;
    console.log(`Processing Research: ${prompt}`);
    
    try {
      const out = await llmText({
        model,
        messages: [
          {
            role: "system",
            content:
              "You are a research assistant. Give a concise but informative answer in 2-3 paragraphs. Be direct, but use Markdown headings, bullet points, and occasional quote blocks (lines starting with '>') for key takeaways so the answer is easy to scan.",
          },
          { role: "user", content: `Briefly explain: ${prompt}` },
        ],
        temperature: 0.7,
        max_tokens: 400,
      });
      
      const answer = (out || "No results").slice(0, 2000);
      const newKey = makeId(6);
      
      // Store for Regen/Shorter/Longer/Continue buttons
      inlineCache.set(newKey, {
        prompt,
        answer,
        userId: pending.userId,
        model,
        mode: "research",
        createdAt: Date.now(),
      });
      setTimeout(() => inlineCache.delete(newKey), 30 * 60 * 1000);
      
      // Track in history
      addToHistory(pending.userId, prompt, "research");
      
      // Convert and update
      const formattedAnswer = convertToTelegramHTML(answer);
      const escapedPrompt = escapeHTML(prompt);
      
      await bot.api.editMessageTextInline(
        inlineMessageId,
        `🔍 <b>Research: ${escapedPrompt}</b>\\n\\n${formattedAnswer}\\n\\n<i>via StarzAI • ${shortModel}</i>`,
        { 
          parse_mode: "HTML",
          reply_markup: inlineAnswerKeyboard(newKey),
        }
      );
      console.log("Research updated with AI response");
    } catch (e) {
      console.error("Failed to get Research response:", e.message);
      try {
        await bot.api.editMessageTextInline(
          inlineMessageId,
          `🔍 <b>Research</b>\\n\\n⚠️ <i>Error getting response. Try again!</i>\\n\\n<i>via StarzAI</i>`,
          { parse_mode: "HTML" }
        );
      } catch {}
    }
    
    inlineCache.delete(`r_pending_${rKey}`);
    return;
  }

  // Handle Websearch deferred response - w_start_KEY
  if (resultId.startsWith("w_start_")) {
    const wKey = resultId.replace("w_start_", "");
    const pending = inlineCache.get(`w_pending_${wKey}`);
    
    if (!pending || !inlineMessageId) {
      console.log(`Websearch pending not found or no inlineMessageId: wKey=${wKey}`);
      return;
    }
    
    const { prompt, model, shortModel, userId: ownerId } = pending;
    console.log(`Processing Websearch: ${prompt}`);
    
    try {
      const quota = consumeWebsearchQuota(ownerId);
      const startTime = Date.now();
      let answerRaw = "";
      let footerHtml = "";
      let sourcesHtml = "";
      let formattedAnswer = "";

      if (!quota.allowed) {
        // Quota exhausted: answer without live websearch
        console.log(
          `Websearch quota exhausted for user ${ownerId} in inline mode: used=${quota.used}, limit=${quota.limit}`
        );

        const offline = await llmText({
          model,
          messages: [
            {
              role: "system",
              content:
                "You are a helpful assistant. You currently do NOT have access to live web search for this request. " +
                "Answer based on your existing knowledge only. If you are unsure or information may be outdated, say so clearly.",
            },
            {
              role: "user",
              content: `Question (no live websearch available): ${prompt}`,
            },
          ],
          temperature: 0.7,
          max_tokens: 800,
        });

        answerRaw = offline || "No answer generated.";
        const escapedPrompt = escapeHTML(prompt);
        formattedAnswer = convertToTelegramHTML(answerRaw.slice(0, 3500));
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        footerHtml = `\\n\\n<i>⚠️ Daily websearch limit reached — answered without live web results • ${elapsed}s • ${shortModel}</i>`;
        
        const newKey = makeId(6);
        inlineCache.set(newKey, {
          prompt,
          answer: answerRaw,
          userId: String(ownerId),
          model,
          mode: "websearch",
          createdAt: Date.now(),
        });
        setTimeout(() => inlineCache.delete(newKey), 30 * 60 * 1000);

        await bot.api.editMessageTextInline(
          inlineMessageId,
          `🌐 <b>Websearch</b>\\n\\n<b>Query:</b> <i>${escapedPrompt}</i>\\n\\n${formattedAnswer}${footerHtml}`,
          {
            parse_mode: "HTML",
            reply_markup: inlineAnswerKeyboard(newKey),
          }
        );
        console.log("Websearch (offline) updated with AI response");
      } else {
        // Quota available: run live web search
        const searchResult = await webSearch(prompt, 5);
        
        if (!searchResult.success) {
          const errMsg = `❌ Websearch failed: ${escapeHTML(searchResult.error || "Unknown error")}`;
          await bot.api.editMessageTextInline(
            inlineMessageId,
            errMsg,
            { parse_mode: "HTML" }
          );
          inlineCache.delete(`w_pending_${wKey}`);
          return;
        }
        
        const searchContext = formatSearchResultsForAI(searchResult);
        
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
                "• If the search results don't contain relevant information, say so explicitly.",
            },
            {
              role: "user",
              content:
                `${searchContext}\\n\\n` +
                `User's question: ${prompt}\\n\\n` +
                "The numbered search results above are your ONLY sources of truth. " +
                "Write an answer that:\n" +
                "1) Directly answers the user's question, and\n" +
                "2) Explicitly cites sources using [1], [2], etc next to the claims.\n" +
                "Do not cite sources that are not provided.",
            },
          ],
          temperature: 0.6,
          max_tokens: 800,
        });
        
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

        answerRaw = aiResponse || "No answer generated.";
        answerRaw = linkifyWebsearchCitations(answerRaw, searchResult);

        const escapedPrompt = escapeHTML(prompt);
        sourcesHtml = buildWebsearchSourcesInlineHtml(searchResult, ownerId);
        formattedAnswer = convertToTelegramHTML(answerRaw.slice(0, 3500));
        footerHtml = `\\n\\n<i>🌐 ${searchResult.results.length} sources • ${elapsed}s • ${shortModel}</i>`;
        
        const newKey = makeId(6);
        inlineCache.set(newKey, {
          prompt,
          answer: answerRaw,
          userId: String(ownerId),
          model,
          mode: "websearch",
          createdAt: Date.now(),
        });
        setTimeout(() => inlineCache.delete(newKey), 30 * 60 * 1000);
        
        await bot.api.editMessageTextInline(
          inlineMessageId,
          `🌐 <b>Websearch</b>\\n\\n<b>Query:</b> <i>${escapedPrompt}</i>\\n\\n${formattedAnswer}${sourcesHtml}${footerHtml}`,
          { 
            parse_mode: "HTML",
            reply_markup: inlineAnswerKeyboard(newKey),
          }
        );
        console.log("Websearch updated with AI response");
      }
    } catch (e) {
      console.error("Failed to get Websearch response:", e.message);
      try {
        await bot.api.editMessageTextInline(
          inlineMessageId,
          `🌐 <b>Websearch</b>\\n\\n⚠️ <i>Error getting response. Try again!</i>`,
          { parse_mode: "HTML" }
        );
      } catch {}
    }
    
    inlineCache.delete(`w_pending_${wKey}`);
    return;
  }
  
  // Handle Quark deferred response - q_start_KEY
  // Now optionally uses web search when Web mode is ON or the question looks time-sensitive.
  if (resultId.startsWith("q_start_")) {
    const qKey = resultId.replace("q_start_", "");
    const pending = inlineCache.get(`q_pending_${qKey}`);
    
    if (!pending || !inlineMessageId) {
      console.log(`Quark pending not found or no inlineMessageId: qKey=${qKey}`);
      return;
    }
    
    const { prompt, model, shortModel, userId: ownerId } = pending;
    const ownerStr = String(ownerId || pending.userId || "");
    console.log(`Processing Quark: ${prompt}`);
    
    try {
      const userRec = ownerStr ? getUserRecord(ownerStr) : null;
      const wantsWebsearch = (userRec?.webSearch || needsWebSearch(prompt));
      
      // Try websearch-backed Quark answer first if desired and quota available
      if (wantsWebsearch && ownerStr) {
        const quota = consumeWebsearchQuota(ownerId || ownerStr);
        if (quota.allowed) {
          try {
            const searchResult = await webSearch(prompt, 5);
            if (searchResult.success && Array.isArray(searchResult.results) && searchResult.results.length > 0) {
              const searchContext = formatSearchResultsForAI(searchResult);
  
              const aiResponse = await llmText({
                model,
                messages: [
                  {
                    role: "system",
                    content:
                      "You are a helpful assistant with access to real-time web search results.\n" +
                      "Answer in at most 2 short sentences while staying accurate.\n" +
                      "\n" +
                      "CRITICAL CITATION INSTRUCTIONS:\n" +
                      "• Every non-obvious factual claim should be backed by a source index like [1], [2], etc.\n" +
                      "• If you summarize multiple sources, include multiple indices, e.g. [1][3].\n" +
                      "• For concrete numbers, dates, or names, always attach the source index.\n" +
                      "• Never invent citations; only use indices that exist in the search results."
                  },
                  {
                    role: "user",
                    content:
                      `${searchContext}\n\n` +
                      `User's question: ${prompt}\n\n` +
                      "Write a direct, compact answer (1–2 sentences maximum) based ONLY on the search results above, and attach [n] citations to the key factual claims."
                  }
                ],
                temperature: 0.5,
                max_tokens: 220,
              });
  
              let answer = aiResponse || "No answer";
              answer = linkifyWebsearchCitations(answer, searchResult).slice(0, 600);
  
              const newKey = makeId(6);
  
              inlineCache.set(newKey, {
                prompt,
                answer,
                userId: ownerStr,
                model,
                mode: "quark",
                createdAt: Date.now(),
              });
              setTimeout(() => inlineCache.delete(newKey), 30 * 60 * 1000);
  
              addToHistory(ownerStr, prompt, "quark");
  
              const formattedAnswer = convertToTelegramHTML(answer);
              const escapedPrompt = escapeHTML(prompt);
              const sourcesHtml = buildWebsearchSourcesInlineHtml(searchResult, ownerStr);
  
              await bot.api.editMessageTextInline(
                inlineMessageId,
                `⭐ <b>${escapedPrompt}</b>\n\n${formattedAnswer}${sourcesHtml}\n\n<i>via StarzAI • Quark • ${shortModel}</i>`,
                { 
                  parse_mode: "HTML",
                  // Quark intentionally has no Continue button
                  reply_markup: inlineAnswerKeyboard(newKey)
                }
              );
              console.log("Quark (websearch) updated with AI response");
              inlineCache.delete(`q_pending_${qKey}`);
              return;
            }
          } catch (webErr) {
            console.log("Quark websearch failed:", webErr.message || webErr);
            // Fall through to offline Quark
          }
        } else {
          console.log(
            `Quark websearch quota exhausted for user ${ownerStr}: used=${quota.used}, limit=${quota.limit}`
          );
        }
      }
    
      // Offline Quark answer (fallback)
      const out = await llmText({
        model,
        messages: [
          { role: "system", content: "Give extremely concise answers. 1-2 sentences max. Be direct and to the point. No fluff." },
          { role: "user", content: prompt },
        ],
        temperature: 0.5,
        max_tokens: 100,
      });
      
      const answer = (out || "No answer").slice(0, 500);
      const newKey = makeId(6);
      
      inlineCache.set(newKey, {
        prompt,
        answer,
        userId: pending.userId,
        model,
        mode: "quark",
        createdAt: Date.now(),
      });
      setTimeout(() => inlineCache.delete(newKey), 30 * 60 * 1000);
      
      addToHistory(pending.userId, prompt, "quark");
      
      const formattedAnswer = convertToTelegramHTML(answer);
      const escapedPrompt = escapeHTML(prompt);
      
      await bot.api.editMessageTextInline(
        inlineMessageId,
        `⭐ <b>${escapedPrompt}</b>\n\n${formattedAnswer}\n\n<i>via StarzAI • Quark • ${shortModel}</i>`,
        { 
          parse_mode: "HTML",
          // Quark intentionally has no Continue button
          reply_markup: inlineAnswerKeyboard(newKey)
        }
      );
      console.log(`Quark updated with AI response`);
      
    } catch (e) {
      console.error("Failed to get Quark response:", e.message);
      const escapedPrompt = escapeHTML(prompt);
      try {
        await bot.api.editMessageTextInline(
          inlineMessageId,
          `⭐ <b>${escapedPrompt}</b>\n\n⚠️ <i>Error getting response. Try again!</i>\n\n<i>via StarzAI</i>`,
          { parse_mode: "HTML" }
        );
      } catch {}
    }
    
    inlineCache.delete(`q_pending_${qKey}`);
    return;
  }
  
  // Helper to avoid cutting code blocks in the middle for Code mode answers.
  // We try to cut AFTER the last complete fenced block (``` ... ```) that fits
  // within maxLen. If none, we fall back to cutting at a newline near maxLen.
  // Returns the visible chunk, remaining text, whether we're done, and the
  // index in `full` where we cut.
  function splitCodeAnswerForDisplay(full, maxLen = 3500) {
    if (!full) return { visible: "", remaining: "", completed: true, cutIndex: 0 };
    if (full.length <= maxLen) {
      return { visible: full, remaining: "", completed: true, cutIndex: full.length };
    }

    const fence = "```";
    const positions = [];
    let idx = 0;
    while (true) {
      const found = full.indexOf(fence, idx);
      if (found === -1) break;
      positions.push(found);
      idx = found + fence.length;
    }

    let cutoff = -1;

    if (positions.length >= 2) {
      // Pair fences as open/close in order and find the last complete block
      // whose closing fence is within maxLen.
      for (let i = 0; i + 1 < positions.length; i += 2) {
        const openIdx = positions[i];
        const closeIdx = positions[i + 1] + fence.length; // include closing fence
        if (closeIdx <= maxLen) {
          cutoff = closeIdx;
        } else {
          break;
        }
      }
    }

    // If we didn't find any complete fenced block within maxLen, fall back to
    // cutting at a newline near maxLen so we don't split mid-line.
    if (cutoff === -1) {
      const fallback = full.lastIndexOf("\n", maxLen);
      cutoff = fallback > 0 ? fallback : maxLen;
    }

    const visible = full.slice(0, cutoff).trimEnd();
    const remaining = full.slice(cutoff).trimStart();
    return { visible, remaining, completed: remaining.length === 0, cutIndex: cutoff };
  }

  // Handle Code deferred response - code_start_KEY
  if (resultId.startsWith("code_start_")) {
    const codeKey = resultId.replace("code_start_", "");
    const pending = inlineCache.get(`code_pending_${codeKey}`);
    
    if (!pending || !inlineMessageId) {
      console.log(`Code pending not found or no inlineMessageId: codeKey=${codeKey}`);
      return;
    }
    
    const { prompt, model, shortModel } = pending;
    console.log(`Processing Code: ${prompt}`);
    
    try {
      const out = await llmText({
        model,
        messages: [
          {
            role: "system",
            content:
              "You are an expert programmer. Provide clear, working code with brief explanations. Always format code using fenced code blocks with language tags, like ```python ... ```. Focus on best practices and clean, idiomatic code. If the user is asking for multiple sizeable code snippets (e.g., in two different languages), prioritize the first main implementation and be willing to let additional full implementations be shown in a continuation.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 700,
      });
      
      const raw = out || "No code";
      const { visible, remaining, completed, cutIndex } = splitCodeAnswerForDisplay(raw, 3500);
      const answer = visible;
      const newKey = makeId(6);
      
      inlineCache.set(newKey, {
        prompt,
        answer,
        fullAnswer: raw,
        cursor: cutIndex,
        userId: pending.userId,
        model,
        mode: "code",
        completed,
        createdAt: Date.now(),
      });
      setTimeout(() => inlineCache.delete(newKey), 30 * 60 * 1000);
      
      addToHistory(pending.userId, prompt, "code");
      
      const formattedAnswer = convertToTelegramHTML(answer);
      const escapedPrompt = escapeHTML(prompt);
      
      await bot.api.editMessageTextInline(
        inlineMessageId,
        `💻 <b>Code: ${escapedPrompt}</b>\n\n${formattedAnswer}\n\n<i>via StarzAI • Code • ${shortModel}</i>`,
        { 
          parse_mode: "HTML",
          reply_markup: inlineAnswerKeyboard(newKey)
        }
      );
      console.log(`Code updated with AI response`);
      
    } catch (e) {
      console.error("Failed to get Code response:", e.message);
      const escapedPrompt = escapeHTML(prompt);
      try {
        await bot.api.editMessageTextInline(
          inlineMessageId,
          `💻 <b>Code: ${escapedPrompt}</b>\n\n⚠️ <i>Error getting response. Try again!</i>\n\n<i>via StarzAI</i>`,
          { parse_mode: "HTML" }
        );
      } catch {}
    }
    
    inlineCache.delete(`code_pending_${codeKey}`);
    return;
  }
  
  // Handle Explain deferred response - e_start_KEY
  if (resultId.startsWith("e_start_")) {
    const eKey = resultId.replace("e_start_", "");
    const pending = inlineCache.get(`e_pending_${eKey}`);
    
    if (!pending || !inlineMessageId) {
      console.log(`Explain pending not found or no inlineMessageId: eKey=${eKey}`);
      return;
    }
    
    const { prompt, model, shortModel } = pending;
    console.log(`Processing Explain: ${prompt}`);
    
    try {
      const out = await llmText({
        model,
        messages: [
          { role: "system", content: "Explain concepts in the simplest possible way, like explaining to a 5-year-old (ELI5). Use analogies, simple words, and relatable examples. Avoid jargon. Make it fun and easy to understand." },
          { role: "user", content: `Explain simply: ${prompt}` },
        ],
        temperature: 0.7,
        max_tokens: 400,
      });
      
      const raw = out || "No explanation";
      const maxLen = 1500;
      let visible = raw;
      let cursor = raw.length;
      let completed = true;

      if (raw.length > maxLen) {
        // Prefer to cut at a sentence or word boundary near the limit
        const slice = raw.slice(0, maxLen);
        let cutoff = slice.length;

        const windowSize = 200;
        const windowStart = Math.max(0, cutoff - windowSize);
        const windowText = slice.slice(windowStart, cutoff);

        let rel = Math.max(
          windowText.lastIndexOf(". "),
          windowText.lastIndexOf("! "),
          windowText.lastIndexOf("? ")
        );
        if (rel !== -1) {
          cutoff = windowStart + rel + 2; // include punctuation + space
        } else {
          const spaceRel = windowText.lastIndexOf(" ");
          if (spaceRel !== -1) {
            cutoff = windowStart + spaceRel;
          }
        }

        visible = slice.slice(0, cutoff).trimEnd();
        cursor = visible.length;
        completed = cursor >= raw.length;
      }

      const answer = visible;
      const newKey = makeId(6);
      const part = 1;
      
      inlineCache.set(newKey, {
        prompt,
        answer,
        fullAnswer: raw,
        cursor,
        userId: pending.userId,
        model,
        shortModel,
        mode: "explain",
        part,
        completed,
        createdAt: Date.now(),
      });
      setTimeout(() => inlineCache.delete(newKey), 30 * 60 * 1000);
      
      addToHistory(pending.userId, prompt, "explain");
      
      const formattedAnswer = convertToTelegramHTML(answer);
      const escapedPrompt = escapeHTML(prompt);
      const headerLabel = completed ? "Full Explanation" : "Explanation (Part 1)";
      
      await bot.api.editMessageTextInline(
        inlineMessageId,
        `🧠 <b>${headerLabel}: ${escapedPrompt}</b>\n\n${formattedAnswer}\n\n<i>via StarzAI • Explain • ${shortModel}</i>`,
        { 
          parse_mode: "HTML",
          reply_markup: inlineAnswerKeyboard(newKey)
        }
      );
      console.log(`Explain updated with AI response`);
      
    } catch (e) {
      console.error("Failed to get Explain response:", e.message);
      const escapedPrompt = escapeHTML(prompt);
      try {
        await bot.api.editMessageTextInline(
          inlineMessageId,
          `🧠 <b>Explain: ${escapedPrompt}</b>\n\n⚠️ <i>Error getting response. Try again!</i>\n\n<i>via StarzAI</i>`,
          { parse_mode: "HTML" }
        );
      } catch {}
    }
    
    inlineCache.delete(`e_pending_${eKey}`);
    return;
  }
  
  // Handle Summarize deferred response - sum_start_KEY
  if (resultId.startsWith("sum_start_")) {
    const sumKey = resultId.replace("sum_start_", "");
    const pending = inlineCache.get(`sum_pending_${sumKey}`);
    
    if (!pending || !inlineMessageId) {
      console.log(`Summarize pending not found or no inlineMessageId: sumKey=${sumKey}`);
      return;
    }
    
    const { prompt, model, shortModel } = pending;
    console.log(`Processing Summarize`);
    
    try {
      const out = await llmText({
        model,
        messages: [
          { role: "system", content: "Summarize the given text concisely. Extract key points and main ideas. Use bullet points if helpful. Keep it brief but comprehensive." },
          { role: "user", content: `Summarize this:\n\n${prompt}` },
        ],
        temperature: 0.3,
        max_tokens: 400,
      });
      
      const answer = (out || "Could not summarize").slice(0, 1500);
      const newKey = makeId(6);
      
      inlineCache.set(newKey, {
        prompt: prompt.slice(0, 200) + "...",
        answer,
        userId: pending.userId,
        model,
        mode: "summarize",
        createdAt: Date.now(),
      });
      setTimeout(() => inlineCache.delete(newKey), 30 * 60 * 1000);
      
      addToHistory(pending.userId, prompt.slice(0, 50), "summarize");
      
      const formattedAnswer = convertToTelegramHTML(answer);
      
      await bot.api.editMessageTextInline(
        inlineMessageId,
        `📝 <b>Summary</b>\n\n${formattedAnswer}\n\n<i>via StarzAI • Summarize • ${shortModel}</i>`,
        { 
          parse_mode: "HTML",
          reply_markup: inlineAnswerKeyboard(newKey)
        }
      );
      console.log(`Summarize updated with AI response`);
      
    } catch (e) {
      console.error("Failed to get Summarize response:", e.message);
      try {
        await bot.api.editMessageTextInline(
          inlineMessageId,
          `📝 <b>Summary</b>\n\n⚠️ <i>Error summarizing. Try again!</i>\n\n<i>via StarzAI</i>`,
          { parse_mode: "HTML" }
        );
      } catch {}
    }
    
    inlineCache.delete(`sum_pending_${sumKey}`);
    return;
  }
  
  // Handle Partner deferred response - p_start_KEY
  if (resultId.startsWith("p_start_")) {
    const pKey = resultId.replace("p_start_", "");
    const pending = inlineCache.get(`p_pending_${pKey}`);
    
    if (!pending || !inlineMessageId) {
      console.log(`Partner pending not found or no inlineMessageId: pKey=${pKey}`);
      return;
    }
    
    const { prompt, model, shortModel, partner } = pending;
    console.log(`Processing Partner: ${prompt}`);
    
    try {
      const systemPrompt = buildPartnerSystemPrompt(partner);
      const partnerHistory = getPartnerChatHistory(pending.userId);
      
      const messages = [
        { role: "system", content: systemPrompt },
        ...partnerHistory.slice(-6).map(m => ({ role: m.role, content: m.content })),
        { role: "user", content: prompt },
      ];
      
      const out = await llmText({
        model,
        messages,
        temperature: 0.85,
        max_tokens: 400,
      });
      
      const answer = (out || "*stays silent*").slice(0, 1500);
      const newKey = makeId(6);
      
      inlineCache.set(newKey, {
        prompt,
        answer,
        userId: pending.userId,
        model,
        isPartner: true,
        partnerName: partner.name,
        createdAt: Date.now(),
      });
      setTimeout(() => inlineCache.delete(newKey), 30 * 60 * 1000);
      
      addPartnerMessage(pending.userId, "user", prompt);
      addPartnerMessage(pending.userId, "assistant", answer);
      
      const formattedAnswer = convertToTelegramHTML(answer);
      const escapedPartnerName = escapeHTML(partner.name);
      
      await bot.api.editMessageTextInline(
        inlineMessageId,
        `🤝🏻 <b>${escapedPartnerName}</b>\n\n${formattedAnswer}\n\n<i>via StarzAI • Partner • ${shortModel}</i>`,
        { 
          parse_mode: "HTML",
          reply_markup: new InlineKeyboard()
            .switchInlineCurrent("💬 Reply", `p: `)
            .text("🔁 Regen", `inl_regen:${newKey}`)
        }
      );
      console.log(`Partner updated with AI response`);
      
    } catch (e) {
      console.error("Failed to get Partner response:", e.message);
      const escapedPartnerName = escapeHTML(partner.name);
      try {
        await bot.api.editMessageTextInline(
          inlineMessageId,
          `🤝🏻 <b>${escapedPartnerName}</b>\n\n⚠️ <i>Error getting response. Try again!</i>\n\n<i>via StarzAI</i>`,
          { parse_mode: "HTML" }
        );
      } catch {}
    }
    
    inlineCache.delete(`p_pending_${pKey}`);
    return;
  }
  
  // Handle Starz Check - store the inline_message_id for later updates
  if (resultId.startsWith("starz_check_")) {
    const checkKey = resultId.replace("starz_check_", "");
    const userId = String(ctx.from?.id || "");
    
    if (inlineMessageId && userId) {
      // Store the inline message ID so we can update it when tasks change
      inlineCache.set(`sc_msg_${userId}`, {
        inlineMessageId,
        timestamp: Date.now(),
      });
      console.log(`Stored Starz Check inlineMessageId for user ${userId}`);
    }
    return;
  }
  
  // Handle t:add - add task, delete new message, update original
  if (resultId.startsWith("tadd_")) {
    const addKey = resultId.replace("tadd_", "");
    const pending = inlineCache.get(`tadd_pending_${addKey}`);
    
    if (!pending) {
      console.log(`Task add pending not found: addKey=${addKey}`);
      return;
    }
    
    const { userId, taskText, chatId } = pending;
    console.log(`Processing task add: ${taskText} for user ${userId}`);
    
    // Parse and add the task
    const parsed = parseTaskText(taskText);
    const userTodos = getUserTodos(userId);
    const newTask = {
      id: makeId(8),
      text: parsed.text || taskText,
      completed: false,
      priority: parsed.priority || 'low',
      category: parsed.category || 'personal',
      dueDate: parsed.dueDate || null,
      createdAt: new Date().toISOString(),
      completedAt: null,
    };
    userTodos.tasks.push(newTask);
    saveTodos();
    
    // Try to delete the "Task Added" message we just sent
    if (inlineMessageId) {
      try {
        // We can't delete inline messages, but we can edit them to be minimal
        await bot.api.editMessageTextInline(
          inlineMessageId,
          `✅ Added: ${parsed.text || taskText}`,
          { parse_mode: "HTML" }
        );
      } catch (e) {
        console.log("Could not edit task added message:", e.message);
      }
    }
    
    // Try to update the original Starz Check message
    const scMsg = inlineCache.get(`sc_msg_${userId}`);
    if (scMsg && scMsg.inlineMessageId) {
      try {
        const tasks = userTodos.tasks || [];
        const streak = getCompletionStreak(userId);
        
        // Build compact task list
        let text = `✅ Starz Check`;
        if (streak > 0) text += ` 🔥${streak}`;
        
        const keyboard = new InlineKeyboard();
        
        // Add task buttons (max 8 to fit)
        const displayTasks = tasks.slice(0, 8);
        displayTasks.forEach((task, idx) => {
          if (!task || !task.text) return; // Skip invalid tasks
          const check = task.completed ? '✅' : '⬜';
          const cat = getCategoryEmoji(task.category);
          const pri = task.priority === 'high' ? '🔴' : task.priority === 'medium' ? '🟡' : '';
          const overdue = !task.completed && isOverdue(task.dueDate) ? '⚠️' : '';
          const label = `${check} ${task.text.slice(0, 20)}${task.text.length > 20 ? '...' : ''} ${cat}${pri}${overdue}`.trim();
          keyboard.text(label, `itodo_tap:${task.id}`).row();
        });
        
        if (tasks.length > 8) {
          keyboard.text(`... +${tasks.length - 8} more`, "itodo_back").row();
        }
        
        // Action buttons
        keyboard
          .switchInlineCurrent("➕", "t:add ")
          .text("🔍", "itodo_filter")
          .text("👥", "itodo_collab")
          .row()
          .text("← Back", "inline_main_menu");
        
        await bot.api.editMessageTextInline(
          scMsg.inlineMessageId,
          text,
          {
            parse_mode: "HTML",
            reply_markup: keyboard,
          }
        );
        console.log(`Updated original Starz Check message for user ${userId}`);
      } catch (e) {
        console.log("Could not update original Starz Check message:", e.message);
      }
    }
    
    inlineCache.delete(`tadd_pending_${addKey}`);
    return;
  }
  
  // Handle tedit - edit task, update original message
  if (resultId.startsWith("tedit_")) {
    const editKey = resultId.replace("tedit_", "");
    const pending = inlineCache.get(`tedit_pending_${editKey}`);
    
    if (!pending) {
      console.log(`Task edit pending not found: editKey=${editKey}`);
      return;
    }
    
    const { userId, taskId, newText } = pending;
    console.log(`Processing task edit: ${taskId} -> ${newText} for user ${userId}`);
    
    // Apply the edit
    const userTodos = getUserTodos(userId);
    const taskIndex = userTodos.tasks.findIndex(t => t.id === taskId);
    if (taskIndex !== -1) {
      userTodos.tasks[taskIndex].text = newText;
      userTodos.tasks[taskIndex].updatedAt = new Date().toISOString();
      saveTodos();
    }
    
    // Try to update the original Starz Check message
    const scMsg = inlineCache.get(`sc_msg_${userId}`);
    if (scMsg && scMsg.inlineMessageId) {
      try {
        const tasks = userTodos.tasks || [];
        const streak = getCompletionStreak(userId);
        
        // Build compact task list
        let text = `\u2705 Starz Check`;
        if (streak > 0) text += ` \ud83d\udd25${streak}`;
        
        const keyboard = new InlineKeyboard();
        
        // Add task buttons (max 8 to fit)
        const displayTasks = tasks.slice(0, 8);
        displayTasks.forEach((task, idx) => {
          if (!task || !task.text) return;
          const check = task.completed ? '\u2705' : '\u2b1c';
          const cat = getCategoryEmoji(task.category);
          const pri = task.priority === 'high' ? '\ud83d\udd34' : task.priority === 'medium' ? '\ud83d\udfe1' : '';
          const overdue = !task.completed && isOverdue(task.dueDate) ? '\u26a0\ufe0f' : '';
          const label = `${check} ${task.text.slice(0, 20)}${task.text.length > 20 ? '...' : ''} ${cat}${pri}${overdue}`.trim();
          keyboard.text(label, `itodo_tap:${task.id}`).row();
        });
        
        if (tasks.length > 8) {
          keyboard.text(`... +${tasks.length - 8} more`, "itodo_back").row();
        }
        
        // Action buttons
        keyboard
          .switchInlineCurrent("\u2795", "t:add ")
          .text("\ud83d\udd0d", "itodo_filter")
          .text("\ud83d\udc65", "itodo_collab")
          .row()
          .text("\u2190 Back", "inline_main_menu");
        
        await bot.api.editMessageTextInline(
          scMsg.inlineMessageId,
          text,
          {
            parse_mode: "HTML",
            reply_markup: keyboard,
          }
        );
        console.log(`Updated original Starz Check message after edit for user ${userId}`);
      } catch (e) {
        console.log("Could not update original Starz Check message:", e.message);
      }
    }
    
    inlineCache.delete(`tedit_pending_${editKey}`);
    return;
  }
  
});


