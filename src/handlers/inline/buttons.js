/**
 * handlers/inline/buttons.js
 * Auto-extracted from index.js
 */

// =====================
// INLINE BUTTON ACTIONS + CACHE CLEANUP
// Lines 19866-20331 from original index.js
// =====================

// =====================
// INLINE BUTTON ACTIONS (Legacy)
// =====================
async function editInlineMessage(ctx, newText, key) {
  const htmlText = convertToTelegramHTML(newText.slice(0, 3500));
  await ctx.editMessageText(htmlText, {
    parse_mode: "HTML",
    reply_markup: inlineAnswerKeyboard(key),
  });
}

async function doInlineTransform(ctx, mode) {
  if (!(await enforceRateLimit(ctx))) return;

  const data = ctx.callbackQuery.data;
  const key = data.split(":")[1];
  const item = inlineCache.get(key);

  if (!item) {
    return ctx.answerCallbackQuery({
      text: "This inline result expired. Ask again inline.",
      show_alert: true,
    });
  }

  const actor = ctx.from?.id ? String(ctx.from.id) : "";
  if (actor !== item.userId) {
    return ctx.answerCallbackQuery({
      text: "Only the original requester can use these buttons.",
      show_alert: true,
    });
  }

  // Revert: restore original answer (if available) without changing tier counts
  if (mode === "revert") {
    if (!item.originalAnswer) {
      return ctx.answerCallbackQuery({
        text: "Nothing to revert.",
        show_alert: true,
      });
    }

    item.answer = item.originalAnswer;
    if (item.fullAnswer) {
      item.fullAnswer = item.originalAnswer;
    }

    inlineCache.set(key, item);
    await editInlineMessage(ctx, item.answer, key);
    await ctx.answerCallbackQuery({ text: "Reverted.", show_alert: false });
    return;
  }

  // Regen limit check per tier (per answer)
  if (mode === "regen") {
    const userRec = getUserRecord(item.userId);
    const tier = userRec?.tier || "free";
    if (typeof item.regenCount !== "number") item.regenCount = 0;

    let maxRegen = 1;
    if (tier === "ultra") maxRegen = 3;
    else if (tier === "premium") maxRegen = 2;

    if (item.regenCount >= maxRegen) {
      return ctx.answerCallbackQuery({
        text: "Regen limit reached for this answer.",
        show_alert: true,
      });
    }
  }

  await ctx.answerCallbackQuery({ text: "Working..." });

  try {
    let newAnswer = item.answer;

    if (mode === "regen") {
      newAnswer = await llmText({
        model: item.model,
        messages: [
          { role: "system", content: "Answer clearly. Don't mention system messages." },
          { role: "user", content: item.prompt },
        ],
        temperature: 0.9,
        max_tokens: 260,
      });

      // Reset transform metadata on regen
      delete item.originalAnswer;
      item.shortCount = 0;
      item.longCount = 0;
      item.transformsUsed = 0;
      item.shortLongLocked = false;

      item.regenCount = (item.regenCount || 0) + 1;
    }

    if (mode === "short" || mode === "long") {
      const userRec = getUserRecord(item.userId);
      const tier = userRec?.tier || "free";

      // Initialize transform metadata if missing
      if (!item.originalAnswer) item.originalAnswer = item.answer;
      if (typeof item.shortCount !== "number") item.shortCount = 0;
      if (typeof item.longCount !== "number") item.longCount = 0;
      if (typeof item.transformsUsed !== "number") item.transformsUsed = 0;
      if (typeof item.shortLongLocked !== "boolean") item.shortLongLocked = false;

      const isShort = mode === "short";
      let allowed = true;

      if (tier === "ultra") {
        if (isShort && item.shortCount >= 2) allowed = false;
        if (!isShort && item.longCount >= 2) allowed = false;
      } else if (tier === "premium") {
        if (item.transformsUsed >= 2) allowed = false;
      } else {
        // free
        if (item.shortLongLocked || item.transformsUsed >= 1) allowed = false;
      }

      if (!allowed) {
        // Buttons should already be hidden when limits are reached; this is a safeguard.
        return ctx.answerCallbackQuery({
          text: "Shorter/Longer limit reached for this answer.",
          show_alert: true,
        });
      }

      if (isShort) {
        newAnswer = await llmText({
          model: item.model,
          messages: [
            { role: "system", content: "Rewrite the answer to be shorter while keeping key details." },
            { role: "user", content: `PROMPT:\n${item.prompt}\n\nANSWER:\n${item.answer}` },
          ],
          temperature: 0.5,
          max_tokens: 200,
        });
        item.shortCount = (item.shortCount || 0) + 1;
      } else {
        newAnswer = await llmText({
          model: item.model,
          messages: [
            { role: "system", content: "Expand the answer with more detail, structure, and examples if useful." },
            { role: "user", content: `PROMPT:\n${item.prompt}\n\nANSWER:\n${item.answer}` },
          ],
          temperature: 0.7,
          max_tokens: 420,
        });
        item.longCount = (item.longCount || 0) + 1;
      }

      item.transformsUsed = (item.transformsUsed || 0) + 1;
      if (tier === "free") {
        item.shortLongLocked = true;
      }
    }

    if (mode === "cont") {
      const itemMode = item.mode || "default";
      const isBlackhole = itemMode === "blackhole";
      const isCode = itemMode === "code";
      const isExplain = itemMode === "explain";

      // Blackhole uses its own inline-based continuation (bhcont), so we do nothing here.
      if (isBlackhole) {
        await ctx.answerCallbackQuery({ text: "Use the inline Continue button for Blackhole.", show_alert: true });
        return;
      }

      // Quark never shows Continue, but if somehow triggered, just ignore.
      if (itemMode === "quark") {
        await ctx.answerCallbackQuery({ text: "Quark answers are already complete.", show_alert: true });
        return;
      }

      if (isCode) {
        // For Code mode, we don't ask the model to "continue" the answer.
        // Instead, we reveal the remaining part of the original fullAnswer in
        // safe chunks, avoiding cuts inside fenced code blocks.
        const full = item.fullAnswer || item.answer || "";
        if (!full) {
          await ctx.answerCallbackQuery({ text: "No more code to show.", show_alert: true });
          return;
        }

        let cursor = typeof item.cursor === "number" ? item.cursor : item.answer.length;
        if (cursor >= full.length) {
          item.completed = true;
          inlineCache.set(key, item);
          await ctx.answerCallbackQuery({ text: "Full code already shown.", show_alert: true });
          return;
        }

        const remaining = full.slice(cursor);
        if (!remaining.trim()) {
          item.completed = true;
          inlineCache.set(key, item);
          await ctx.answerCallbackQuery({ text: "Full code already shown.", show_alert: true });
          return;
        }

        // Local splitter: same logic as in the initial Code handler but applied
        // to the remaining text only.
        const maxLen = 3500;
        const fence = "```";
        const positions = [];
        let idxPos = 0;
        while (true) {
          const found = remaining.indexOf(fence, idxPos);
          if (found === -1) break;
          positions.push(found);
          idxPos = found + fence.length;
        }

        let cutoff = -1;
        if (positions.length >= 2) {
          for (let i = 0; i + 1 < positions.length; i += 2) {
            const closeIdx = positions[i + 1] + fence.length;
            if (closeIdx <= maxLen) {
              cutoff = closeIdx;
            } else {
              break;
            }
          }
        }

        if (cutoff === -1) {
          const fallback = remaining.lastIndexOf("\n", maxLen);
          cutoff = fallback > 0 ? fallback : Math.min(maxLen, remaining.length);
        }

        const addition = remaining.slice(0, cutoff).trimEnd();
        const leftover = remaining.slice(cutoff).trimStart();

        if (!addition) {
          item.completed = true;
          inlineCache.set(key, item);
          await ctx.answerCallbackQuery({ text: "No further code to show.", show_alert: true });
          return;
        }

        newAnswer = `${item.answer}\n\n${addition}`.trim();
        item.cursor = cursor + cutoff;
        if (!leftover.length || item.cursor >= full.length) {
          item.completed = true;
        }
      } else if (isExplain) {
        // For Explain mode, reveal the rest of the original explanation without
        // asking the model to rewrite it, cutting at sentence/word boundaries.
        const full = item.fullAnswer || item.answer || "";
        if (!full) {
          await ctx.answerCallbackQuery({ text: "No more explanation to show.", show_alert: true });
          return;
        }

        let cursor = typeof item.cursor === "number" ? item.cursor : item.answer.length;
        if (cursor >= full.length) {
          item.completed = true;
          inlineCache.set(key, item);
          await ctx.answerCallbackQuery({ text: "Explanation already complete.", show_alert: true });
          return;
        }

        const remaining = full.slice(cursor);
        if (!remaining.trim()) {
          item.completed = true;
          inlineCache.set(key, item);
          await ctx.answerCallbackQuery({ text: "Explanation already complete.", show_alert: true });
          return;
        }

        const maxLen = 3500;
        let cutoff = Math.min(maxLen, remaining.length);

        if (cutoff < remaining.length) {
          const windowSize = 200;
          const windowStart = Math.max(0, cutoff - windowSize);
          const windowText = remaining.slice(windowStart, cutoff);

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
        }

        const addition = remaining.slice(0, cutoff).trimEnd();
        const leftover = remaining.slice(cutoff).trimStart();

        if (!addition) {
          item.completed = true;
          inlineCache.set(key, item);
          await ctx.answerCallbackQuery({ text: "No further explanation to show.", show_alert: true });
          return;
        }

        newAnswer = `${item.answer}\n\n${addition}`.trim();
        item.cursor = cursor + cutoff;
        if (!leftover.length || item.cursor >= full.length) {
          item.completed = true;
        }

        const finalTextExplain = (newAnswer || "(no output)").trim();
        item.answer = finalTextExplain.slice(0, 3500);
        const part = (item.part || 1) + 1;
        item.part = part;
        inlineCache.set(key, item);

        const formattedExplain = convertToTelegramHTML(item.answer);
        const escapedPromptExplain = escapeHTML(item.prompt || "");
        const shortModelExplain = item.shortModel || (item.model || "").split("/").pop() || "";
        let title;
        if (item.completed && part === 1) {
          title = `Full Explanation: ${escapedPromptExplain}`;
        } else if (item.completed) {
          title = `Explanation (Part ${part} – final): ${escapedPromptExplain}`;
        } else {
          title = `Explanation (Part ${part}): ${escapedPromptExplain}`;
        }

        await ctx.editMessageText(
          `🧠 <b>${title}</b>\n\n${formattedExplain}\n\n<i>via StarzAI • Explain${shortModelExplain ? ` • ${shortModelExplain}` : ""}</i>`,
          {
            parse_mode: "HTML",
            reply_markup: inlineAnswerKeyboard(key),
          }
        );
        return;
      } else {
        // Default (quick, research, summarize, chat, etc.)
        const systemPrompt =
          "Continue the previous answer from where it stopped. Do not repeat large sections; just keep going in the same style and format. If it ended mid-sentence, finish that sentence and continue. When there is nothing important left to add, end your answer with a line containing only END_OF_INLINE.";
        const maxTokens = 450;
        const END_MARK = "END_OF_INLINE";

        const continuation = await llmText({
          model: item.model,
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: `PROMPT:\n${item.prompt}\n\nANSWER SO FAR:\n${item.answer}`,
            },
          ],
          temperature: 0.7,
          max_tokens: maxTokens,
        });

        let contText = (continuation || "").trim();
        let completed = false;
        if (contText.includes(END_MARK)) {
          completed = true;
          contText = contText.replace(END_MARK, "").trim();
          contText += "\n\n---\n_End of answer._";
        }

        newAnswer = `${item.answer}\n\n${contText || ""}`.trim();
        if (completed) {
          item.completed = true;
        }
      }
    }

    const finalText = (newAnswer || "(no output)").trim();
    item.answer = finalText.slice(0, 3500);
    inlineCache.set(key, item);

    await editInlineMessage(ctx, item.answer, key);
  } catch (e) {
    console.error(e);
    await ctx.answerCallbackQuery({ text: "Failed. Try again.", show_alert: true });
  }
}

bot.callbackQuery(/^inl_regen:/, async (ctx) => doInlineTransform(ctx, "regen"));
bot.callbackQuery(/^inl_short:/, async (ctx) => doInlineTransform(ctx, "short"));
bot.callbackQuery(/^inl_long:/, async (ctx) => doInlineTransform(ctx, "long"));
bot.callbackQuery(/^inl_cont:/, async (ctx) => doInlineTransform(ctx, "cont"));
bot.callbackQuery(/^inl_revert:/, async (ctx) => doInlineTransform(ctx, "revert"));

// Character new intro button
bot.callbackQuery(/^char_new_intro:(.+)$/, async (ctx) => {
  const character = ctx.match[1];
  const userId = ctx.from?.id;
  const model = ensureChosenModelValid(userId);
  const shortModel = model.split("/").pop();
  
  await ctx.answerCallbackQuery({ text: `Generating new ${character} intro...` });
  
  try {
    const introOut = await llmText({
      model,
      messages: [
        { role: "system", content: `You are ${character}. Introduce yourself in 1-2 sentences in your unique style, personality, and speech patterns. Be creative and stay completely in character. Don't say "I am [name]" directly - show your personality through how you speak. Make this introduction different from previous ones.` },
        { role: "user", content: "Introduce yourself briefly." },
      ],
      temperature: 1.0,
      max_tokens: 150,
    });
    
    const intro = (introOut || `*${character} appears*`).slice(0, 500);
    const newKey = makeId(6);
    
    // Cache the new intro
    inlineCache.set(newKey, {
      prompt: "[Character Introduction]",
      answer: intro,
      userId: String(userId),
      model,
      character,
      isIntro: true,
      createdAt: Date.now(),
    });
    setTimeout(() => inlineCache.delete(newKey), 30 * 60 * 1000);
    
    const formattedIntro = convertToTelegramHTML(intro);
    const escapedCharacter = escapeHTML(character);
    
    await ctx.editMessageText(
      `🎭 <b>${escapedCharacter}</b>\n\n${formattedIntro}\n\n<i>Reply to continue chatting! • via StarzAI</i>`,
      {
        parse_mode: "HTML",
        reply_markup: new InlineKeyboard()
          .text("🔄 New Intro", `char_new_intro:${character}`)
          .switchInlineCurrent(`✉️ Ask ${character.slice(0, 10)}`, `as ${character}: `),
      }
    );
  } catch (e) {
    console.error("Failed to generate new intro:", e);
    await ctx.answerCallbackQuery({ text: "Failed to generate intro. Try again!", show_alert: true });
  }
});

// =====================
// INLINE CACHE TTL CLEANUP
// =====================
setInterval(() => {
  const t = nowMs();
  const ttl = 30 * 60_000; // 30 min
  for (const [k, v] of inlineCache.entries()) {
    if (t - v.createdAt > ttl) inlineCache.delete(k);
  }
}, 5 * 60_000);

// Cleanup old inline sessions (older than 7 days)
setInterval(() => {
  const t = nowMs();
  const ttl = 7 * 24 * 60 * 60_000; // 7 days
  for (const [userId, session] of Object.entries(inlineSessionsDb.sessions)) {
    if (t - session.lastActive > ttl) {
      delete inlineSessionsDb.sessions[userId];
    }
  }
  saveInlineSessions();
}, 60 * 60_000); // Check every hour


