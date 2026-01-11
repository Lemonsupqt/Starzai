/**
 * handlers/inline/buttons.js
 * Auto-extracted from index.js
 */

// =====================
// INLINE BUTTON ACTIONS + CACHE CLEANUP
// Lines 19866-20331 from original index.js
// =====================

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

