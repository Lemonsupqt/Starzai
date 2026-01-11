/**
 * handlers/callbacks/inline-chat.js
 * Auto-extracted from index.js
 */

// =====================
// INLINE CHAT CALLBACKS
// Lines 13332-13511 from original index.js
// =====================

      reply_to_message_id: ctx.message?.message_id
    });
  }
  
  let response = `📖 <b>${escapeHTML(result.word)}</b>`;
  if (result.phonetic) {
    response += ` <i>${escapeHTML(result.phonetic)}</i>`;
  }
  response += '\n\n';
  
  result.meanings.forEach(meaning => {
    response += `<b>${escapeHTML(meaning.partOfSpeech)}</b>\n`;
    meaning.definitions.slice(0, 3).forEach((def, i) => {
      response += `${i + 1}. ${escapeHTML(def.definition)}\n`;
      if (def.example) {
        response += `   <i>"${escapeHTML(def.example)}"</i>\n`;
      }
    });
    response += '\n';
  });
  
  await ctx.reply(response, {
    parse_mode: 'HTML',
    reply_to_message_id: ctx.message?.message_id
  });
});

// /fact - Random fact
bot.command("fact", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  if (!(await enforceCommandCooldown(ctx))) return;
  ensureUser(ctx.from.id, ctx.from);
  
  const result = await getRandomFact();
  
  if (!result.success) {
    return ctx.reply(`❌ ${result.error}`, {
      reply_to_message_id: ctx.message?.message_id
    });
  }
  
  await ctx.reply(
    `💡 <b>Random Fact</b>\n\n${escapeHTML(result.fact)}`,
    { parse_mode: 'HTML', reply_to_message_id: ctx.message?.message_id }
  );
});

// /today - This day in history
bot.command("today", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  if (!(await enforceCommandCooldown(ctx))) return;
  ensureUser(ctx.from.id, ctx.from);
  
  const result = await getThisDayInHistory();
  
  if (!result.success) {
    return ctx.reply(`❌ ${result.error}`, {
      reply_to_message_id: ctx.message?.message_id
    });
  }
  
  let response = `📅 <b>This Day in History (${result.date})</b>\n\n`;
  
  result.events.forEach(event => {
    response += `<b>${event.year}</b>: ${escapeHTML(event.text)}\n\n`;
  });
  
  await ctx.reply(response, {
    parse_mode: 'HTML',
    reply_to_message_id: ctx.message?.message_id
  });
});

// /quote - Random quote
bot.command("quote", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  if (!(await enforceCommandCooldown(ctx))) return;
  ensureUser(ctx.from.id, ctx.from);
  
  const result = await getRandomQuote();
  
  if (!result.success) {
    return ctx.reply(`❌ ${result.error}`, {
      reply_to_message_id: ctx.message?.message_id
    });
  }
  
  await ctx.reply(
    `💬 <i>"${escapeHTML(result.quote)}"</i>\n\n— <b>${escapeHTML(result.author)}</b>`,
    { parse_mode: 'HTML', reply_to_message_id: ctx.message?.message_id }
  );
});

// /quotify - Generate Discord-style quote image
bot.command("quotify", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  if (!(await enforceCommandCooldown(ctx))) return;
  ensureUser(ctx.from.id, ctx.from);
  
  const replied = ctx.message.reply_to_message;
  
  if (!replied || !replied.text) {
    return ctx.reply(
      '🖼️ <b>Quote Image Generator</b>\n\n' +
      'Reply to a message with <code>/quotify</code> to turn it into a quote image!',
      { parse_mode: 'HTML', reply_to_message_id: ctx.message?.message_id }
    );
  }
  
  const statusMsg = await ctx.reply('🎨 Generating quote image...', {
    reply_to_message_id: ctx.message?.message_id
  });
  
  const user = replied.from;
  const username = user?.first_name || 'Anonymous';
  
  let avatarUrl = null;
  try {
    const photos = await ctx.api.getUserProfilePhotos(user.id, { limit: 1 });
    if (photos.total_count > 0) {
      const fileId = photos.photos[0][0].file_id;
      const file = await ctx.api.getFile(fileId);
      avatarUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;
    }
  } catch (e) {
    // Ignore avatar errors
  }
  
  const result = await generateQuoteImage(replied.text, username, avatarUrl);
  
  if (!result.success) {
    await ctx.api.editMessageText(
      ctx.chat.id, statusMsg.message_id,
      `❌ Failed to generate image: ${result.error}`,
      { parse_mode: 'HTML' }
    );
    return;
  }
  
  await ctx.replyWithPhoto(new InputFile(result.buffer, 'quote.png'), {
    reply_to_message_id: ctx.message?.message_id
  });
  
  await ctx.api.deleteMessage(ctx.chat.id, statusMsg.message_id);
});

// /truth - Truth question
bot.command("truth", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  if (!(await enforceCommandCooldown(ctx))) return;
  ensureUser(ctx.from.id, ctx.from);
  
  const question = getTruthOrDare('truth');
  await ctx.reply(
    `🤔 <b>Truth</b>\n\n${escapeHTML(question)}`,
    { parse_mode: 'HTML', reply_to_message_id: ctx.message?.message_id }
  );
});

// /dare - Dare challenge
bot.command("dare", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  if (!(await enforceCommandCooldown(ctx))) return;
  ensureUser(ctx.from.id, ctx.from);
  
  const dare = getTruthOrDare('dare');
  await ctx.reply(
    `😈 <b>Dare</b>\n\n${escapeHTML(dare)}`,
    { parse_mode: 'HTML', reply_to_message_id: ctx.message?.message_id }
  );
});

// /wyr - Would You Rather
bot.command("wyr", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  if (!(await enforceCommandCooldown(ctx))) return;
  ensureUser(ctx.from.id, ctx.from);
  
  const { option1, option2 } = getWouldYouRather();
  

