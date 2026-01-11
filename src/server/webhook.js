/**
 * server/webhook.js
 * Auto-extracted from index.js
 */

// =====================
// WEBHOOK SERVER
// Lines 20332-20462 from original index.js
// =====================

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

