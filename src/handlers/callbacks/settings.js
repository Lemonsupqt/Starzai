/**
 * handlers/callbacks/settings.js
 * Auto-extracted from index.js
 */

// =====================
// SETTINGS MENU + SHARED CHAT CALLBACKS
// Lines 13512-13694 from original index.js
// =====================

  const kb = new InlineKeyboard()
    .text(`🅰️ Option A`, 'wyr_a')
    .text(`🅱️ Option B`, 'wyr_b');
  
  await ctx.reply(
    `🤷 <b>Would You Rather...</b>\n\n` +
    `🅰️ ${escapeHTML(option1)}\n\n` +
    `<b>OR</b>\n\n` +
    `🅱️ ${escapeHTML(option2)}`,
    { parse_mode: 'HTML', reply_markup: kb, reply_to_message_id: ctx.message?.message_id }
  );
});

// /run - Code runner
bot.command("run", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  if (!(await enforceCommandCooldown(ctx))) return;
  ensureUser(ctx.from.id, ctx.from);
  
  const text = ctx.message.text.replace(/^\/run\s*/i, '').trim();
  
  if (!text) {
    const popular = ['python', 'javascript', 'java', 'c', 'cpp', 'go', 'rust', 'ruby', 'php'];
    
    return ctx.reply(
      '💻 <b>Code Runner</b>\n\n' +
      '<b>Usage:</b>\n' +
      '<code>/run language\nyour code here</code>\n\n' +
      '<b>Example:</b>\n' +
      '<code>/run python\nprint("Hello World!")</code>\n\n' +
      `<b>Popular languages:</b> ${popular.join(', ')}\n\n` +
      `<i>50+ languages supported!</i>`,
      { parse_mode: 'HTML', reply_to_message_id: ctx.message?.message_id }
    );
  }
  
  const lines = text.split('\n');
  const language = lines[0].trim().toLowerCase();
  const code = lines.slice(1).join('\n');
  
  if (!code) {
    return ctx.reply(
      '❌ Please provide code to run.\n\n' +
      '<b>Format:</b>\n' +
      '<code>/run language\nyour code here</code>',
      { parse_mode: 'HTML', reply_to_message_id: ctx.message?.message_id }
    );
  }
  
  const statusMsg = await ctx.reply(`💻 Running ${language} code...`, {
    reply_to_message_id: ctx.message?.message_id
  });
  
  const result = await runCode(language, code);
  
  if (!result.success) {
    await ctx.api.editMessageText(
      ctx.chat.id, statusMsg.message_id,
      `❌ ${escapeHTML(result.error)}`,
      { parse_mode: 'HTML' }
    );
    return;
  }
  
  let response = `💻 <b>${escapeHTML(result.language)} ${escapeHTML(result.version)}</b>\n\n`;
  
  if (result.output) {
    response += `<b>Output:</b>\n<code>${escapeHTML(result.output.slice(0, 2000))}</code>\n`;
  }
  
  if (result.stderr) {
    response += `\n<b>Errors:</b>\n<code>${escapeHTML(result.stderr.slice(0, 500))}</code>\n`;
  }
  
  response += `\n<i>Exit code: ${result.exitCode}</i>`;
  
  await ctx.api.editMessageText(
    ctx.chat.id, statusMsg.message_id,
    response,
    { parse_mode: 'HTML' }
  );
});

// /wallpaper - Search wallpapers
bot.command("wallpaper", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  if (!(await enforceCommandCooldown(ctx))) return;
  ensureUser(ctx.from.id, ctx.from);
  
  const text = ctx.message.text.replace(/^\/wallpaper\s*/i, '').trim();
  
  if (!text) {
    return ctx.reply(
      '🖼️ <b>Wallpaper Search</b>\n\n' +
      '<b>Usage:</b>\n' +
      '<code>/wallpaper search term</code>\n\n' +
      '<b>Examples:</b>\n' +
      '<code>/wallpaper nature</code>\n' +
      '<code>/wallpaper cyberpunk city</code>',
      { parse_mode: 'HTML', reply_to_message_id: ctx.message?.message_id }
    );
  }
  
  const statusMsg = await ctx.reply('🔍 Searching wallpapers...', {
    reply_to_message_id: ctx.message?.message_id
  });
  
  const result = await searchWallpapers(text);
  
  if (!result.success) {
    await ctx.api.editMessageText(
      ctx.chat.id, statusMsg.message_id,
      `❌ ${result.error}`,
      { parse_mode: 'HTML' }
    );
    return;
  }
  
  const wallpaper = result.wallpapers[0];
  
  const kb = new InlineKeyboard();
  if (result.wallpapers.length > 1) {
    kb.text('Next →', `wp_next:${encodeURIComponent(text)}:1`);
  }
  kb.row().url('🔗 Full Resolution', wallpaper.url);
  
  await ctx.api.deleteMessage(ctx.chat.id, statusMsg.message_id);
  
  await ctx.replyWithPhoto(wallpaper.thumbnail, {
    caption: `🖼️ <b>Wallpaper</b> (1/${result.wallpapers.length})\n\nResolution: ${wallpaper.resolution}`,
    parse_mode: 'HTML',
    reply_markup: kb,
    reply_to_message_id: ctx.message?.message_id
  });
});

// /roast - AI roast generator
bot.command("roast", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  if (!(await enforceCommandCooldown(ctx))) return;
  ensureUser(ctx.from.id, ctx.from);
  
  const target = ctx.message.reply_to_message?.from?.first_name || ctx.from.first_name;
  
  const roasts = [
    `${target}, you're not stupid; you just have bad luck thinking.`,
    `${target}, I'd agree with you but then we'd both be wrong.`,
    `${target}, you're like a cloud. When you disappear, it's a beautiful day.`,
    `${target}, I'm not saying I hate you, but I would unplug your life support to charge my phone.`,
    `${target}, you bring everyone so much joy... when you leave.`,
    `${target}, if I had a face like yours, I'd sue my parents.`,
    `${target}, you're the reason the gene pool needs a lifeguard.`,
    `${target}, I'd explain it to you but I left my crayons at home.`,
    `${target}, you're not completely useless. You can always serve as a bad example.`,
    `${target}, somewhere out there is a tree producing oxygen for you. You owe it an apology.`
  ];
  
  const roast = roasts[Math.floor(Math.random() * roasts.length)];
  
  await ctx.reply(
    `🔥 <b>Roast</b>\n\n${escapeHTML(roast)}`,
    { parse_mode: 'HTML', reply_to_message_id: ctx.message?.message_id }
  );
});

// /pickup - Pickup lines
bot.command("pickup", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  if (!(await enforceCommandCooldown(ctx))) return;
  ensureUser(ctx.from.id, ctx.from);
  
  const lines = [
    "Are you a magician? Because whenever I look at you, everyone else disappears.",
    "Do you have a map? Because I just got lost in your eyes.",
    "Is your name Google? Because you have everything I've been searching for.",
    "Are you a parking ticket? Because you've got 'fine' written all over you.",
    "Do you believe in love at first sight, or should I walk by again?",
    "Is your dad a boxer? Because you're a knockout!",
    "Are you a campfire? Because you're hot and I want s'more.",
    "Do you have a Band-Aid? Because I just scraped my knee falling for you.",
    "Is there an airport nearby, or is that just my heart taking off?",
    "Are you a time traveler? Because I see you in my future."
  ];

