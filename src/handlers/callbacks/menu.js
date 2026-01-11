/**
 * handlers/callbacks/menu.js
 * Auto-extracted from index.js
 */

// =====================
// CALLBACKS: UNIFIED MENU NAVIGATION
// Lines 12597-13122 from original index.js
// =====================

  const lines = [
    `🚫 <b>Banned users</b> (${entries.length})`,
    "",
  ];

  subset.forEach(([id, u], idx) => {
    const username = u.username ? "@" + escapeHTML(u.username) : "<i>no username</i>";
    const name = u.firstName ? escapeHTML(u.firstName) : "<i>no name</i>";
    const bannedAt = u.bannedAt ? new Date(u.bannedAt).toLocaleString() : "unknown";
    const reasonText = u.banReason ? escapeHTML(u.banReason.slice(0, 80)) : "none";
    lines.push(
      `${idx + 1}. <code>${id}</code> – ${username} (${name})`,
      `   ⏰ ${bannedAt} • Reason: ${reasonText}`,
      ""
    );
  });

  if (entries.length > max) {
    lines.push(
      `... and ${entries.length - max} more. Use /info &lt;userId&gt; for details.`
    );
  }

  await ctx.reply(lines.join("\n"), { parse_mode: "HTML" });
});

bot.command("mutelist", async (ctx) => {
  if (!isOwner(ctx)) return ctx.reply("🚫 Owner only.");

  const entries = Object.entries(usersDb.users || {}).filter(
    ([, u]) => u.mute
  );

  if (entries.length === 0) {
    return ctx.reply("✅ No muted users currently.");
  }

  const max = 50;
  const subset = entries.slice(0, max);
  const lines = [
    `🔇 <b>Muted users</b> (${entries.length})`,
    "",
  ];

  subset.forEach(([id, u], idx) => {
    const m = u.mute;
    const scope = m.scope || "all";
    const until = m.until ? new Date(m.until).toLocaleString() : "unknown";
    const reasonText = m.reason ? escapeHTML(m.reason.slice(0, 80)) : "none";
    const username = u.username ? "@" + escapeHTML(u.username) : "<i>no username</i>";
    const name = u.firstName ? escapeHTML(u.firstName) : "<i>no name</i>";
    lines.push(
      `${idx + 1}. <code>${id}</code> – ${username} (${name})`,
      `   🎯 Scope: ${escapeHTML(scope)} • Until: ${escapeHTML(until)} • Reason: ${reasonText}`,
      ""
    );
  });

  if (entries.length > max) {
    lines.push(
      `... and ${entries.length - max} more. Use /info &lt;userId&gt; for details.`
    );
  }

  await ctx.reply(lines.join("\n"), { parse_mode: "HTML" });
});

bot.command("ownerhelp", async (ctx) => {
  if (!isOwner(ctx)) return ctx.reply("🚫 Owner only.");

  const text = [
    "📘 StarzAI Owner Guide",
    "",
    "👤 User info & status",
    "",
    "• /info <userId> — full user info (tier, bans, mutes, warnings, stats)",
    "• /gstat — global bot stats",
    "",
    "🎫 Tiers & access",
    "",
    "• /grant <userId> <tier>,",
    "• /revoke <userId>",
    "• /allow <userId> <model>,",
    "• /deny <userId> <model>",
    "",
    "🏘 Group authorization",
    "",
    "• /add <chatId> note — authorize a group to use the bot",
    "• /rem <chatId> reason — block a group from using the bot",
    "• /glist — list known groups and their auth status",
    "",
    "🚫 Bans",
    "",
    "• /ban <userId> reason",
    "• /unban <userId> reason",
    "• /sban <userId> reason — 24h total mute",
    "• /banlist — list banned users",
    "",
    "🔇 Mutes",
    "",
    "• /mute <userId> <duration> scope reason",
    "• /unmute <userId> reason",
    "• /mutelist",
    "  scope: all, dm, group, inline, tier",
    "",
    "⚠️ Warnings",
    "",
    "• /warn <userId> reason — auto softban at 3 warnings",
    "• /cw <userId> reason — reset warnings",
    "",
    "💡 Feedback",
    "",
    "• /feedback — user-side command (button in menu)",
    "• /f <feedbackId> <text> — reply to feedback sender",
    "",
    "•Owners cannot be banned, muted, or warned.",
  ]
    .filter(Boolean)
    .join("\n");

  await ctx.reply(text, {
    reply_to_message_id: ctx.message?.message_id,
  });
});

// =====================
// SUPER UTILITIES (27 Features)
// =====================

// Platform emoji mapping for downloads
const PLATFORM_EMOJI = {
  youtube: '📺',
  tiktok: '🎵',
  instagram: '📸',
  twitter: '🐦',
  spotify: '🎧',
  soundcloud: '☁️'
};

// /download or /dl - Download media from various platforms
bot.command(["download", "dl"], async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  if (!(await enforceCommandCooldown(ctx))) return;
  ensureUser(ctx.from.id, ctx.from);
  
  const text = ctx.message.text.replace(/^\/(download|dl)\s*/i, '').trim();
  
  if (!text) {
    return ctx.reply(
      '📥 <b>Media Downloader</b>\n\n' +
      'Download videos and audio from:\n' +
      '• YouTube, TikTok, Instagram, Twitter\n' +
      '• Spotify, SoundCloud, Reddit\n' +
      '• And 20+ more platforms!\n\n' +
      '<b>Usage:</b>\n' +
      '<code>/dl https://youtube.com/watch?v=...</code>\n' +
      '<code>/dl https://tiktok.com/@user/video/...</code>\n\n' +
      '<i>Or just paste a link and I\'ll detect it automatically!</i>',
      { parse_mode: 'HTML', reply_to_message_id: ctx.message?.message_id }
    );
  }
  
  const urlMatch = text.match(/https?:\/\/[^\s]+/);
  if (!urlMatch) {
    return ctx.reply('❌ Please provide a valid URL.', {
      reply_to_message_id: ctx.message?.message_id
    });
  }
  
  const url = urlMatch[0];
  const platform = detectPlatform(url);
  const emoji = platform ? PLATFORM_EMOJI[platform] : '📥';
  
  const statusMsg = await ctx.reply(
    `${emoji} <b>Downloading...</b>\n\nThis may take a moment...`,
    { parse_mode: 'HTML', reply_to_message_id: ctx.message?.message_id }
  );
  
  try {
    const result = await downloadMedia(url, false);
    
    if (!result.success) {
      await ctx.api.editMessageText(
        ctx.chat.id, statusMsg.message_id,
        `❌ Download failed: ${escapeHTML(result.error)}`,
        { parse_mode: 'HTML' }
      );
      return;
    }
    
    if (result.picker) {
      const kb = new InlineKeyboard();
      result.options.slice(0, 4).forEach((opt, i) => {
        kb.text(opt.type || `Option ${i + 1}`, `dl_pick:${i}:${encodeURIComponent(url)}`).row();
      });
      
      await ctx.api.editMessageText(
        ctx.chat.id, statusMsg.message_id,
        `${emoji} <b>Multiple options available:</b>\n\nSelect what you want to download:`,
        { parse_mode: 'HTML', reply_markup: kb }
      );
      return;
    }
    
    await ctx.api.editMessageText(
      ctx.chat.id, statusMsg.message_id,
      `${emoji} <b>Uploading to Telegram...</b>`,
      { parse_mode: 'HTML' }
    );
    
    const isAudio = url.includes('soundcloud') || url.includes('spotify');
    
    if (isAudio) {
      await ctx.replyWithAudio(result.url, {
        caption: `${emoji} Downloaded via StarzAI`,
        reply_to_message_id: ctx.message?.message_id
      });
    } else {
      await ctx.replyWithVideo(result.url, {
        caption: `${emoji} Downloaded via StarzAI`,
        reply_to_message_id: ctx.message?.message_id
      });
    }
    
    await ctx.api.deleteMessage(ctx.chat.id, statusMsg.message_id);
    
  } catch (error) {
    await ctx.api.editMessageText(
      ctx.chat.id, statusMsg.message_id,
      `❌ Error: ${escapeHTML(error.message)}`,
      { parse_mode: 'HTML' }
    );
  }
});

// /lyrics - Get song lyrics
bot.command("lyrics", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  if (!(await enforceCommandCooldown(ctx))) return;
  ensureUser(ctx.from.id, ctx.from);
  
  const text = ctx.message.text.replace(/^\/lyrics\s*/i, '').trim();
  
  if (!text) {
    return ctx.reply(
      '🎵 <b>Lyrics Search</b>\n\n' +
      '<b>Usage:</b>\n' +
      '<code>/lyrics Artist - Song Title</code>\n\n' +
      '<b>Example:</b>\n' +
      '<code>/lyrics Ed Sheeran - Shape of You</code>',
      { parse_mode: 'HTML', reply_to_message_id: ctx.message?.message_id }
    );
  }
  
  let artist, title;
  if (text.includes(' - ')) {
    [artist, title] = text.split(' - ').map(s => s.trim());
  } else {
    return ctx.reply(
      '❌ Please use format: <code>/lyrics Artist - Song Title</code>',
      { parse_mode: 'HTML', reply_to_message_id: ctx.message?.message_id }
    );
  }
  
  const statusMsg = await ctx.reply('🎵 Searching for lyrics...', {
    reply_to_message_id: ctx.message?.message_id
  });
  
  const result = await getLyrics(artist, title);
  
  if (!result.success) {
    await ctx.api.editMessageText(
      ctx.chat.id, statusMsg.message_id,
      `❌ Lyrics not found for "${escapeHTML(artist)} - ${escapeHTML(title)}"`,
      { parse_mode: 'HTML' }
    );
    return;
  }
  
  let lyrics = result.lyrics;
  if (lyrics.length > 3500) {
    lyrics = lyrics.slice(0, 3500) + '\n\n... (truncated)';
  }
  
  await ctx.api.editMessageText(
    ctx.chat.id, statusMsg.message_id,
    `🎵 <b>${escapeHTML(artist)} - ${escapeHTML(title)}</b>\n\n${escapeHTML(lyrics)}`,
    { parse_mode: 'HTML' }
  );
});

// /movie - Search movies
bot.command("movie", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  if (!(await enforceCommandCooldown(ctx))) return;
  ensureUser(ctx.from.id, ctx.from);
  
  const text = ctx.message.text.replace(/^\/movie\s*/i, '').trim();
  
  if (!text) {
    return ctx.reply(
      '🎬 <b>Movie Search</b>\n\n' +
      '<b>Usage:</b>\n' +
      '<code>/movie title</code>\n\n' +
      '<b>Example:</b>\n' +
      '<code>/movie Inception</code>',
      { parse_mode: 'HTML', reply_to_message_id: ctx.message?.message_id }
    );
  }
  
  const statusMsg = await ctx.reply(`🔍 Searching for "${escapeHTML(text)}"...`, {
    parse_mode: 'HTML',
    reply_to_message_id: ctx.message?.message_id
  });
  
  const result = await searchMedia(text, 'movie');
  
  if (!result.success) {
    await ctx.api.editMessageText(
      ctx.chat.id, statusMsg.message_id,
      `❌ ${result.error}`,
      { parse_mode: 'HTML' }
    );
    return;
  }
  
  let response = `🎬 <b>Search Results:</b>\n\n`;
  const kb = new InlineKeyboard();
  
  result.results.forEach((item, i) => {
    const title = item.title || item.name;
    const year = (item.release_date || item.first_air_date || '').slice(0, 4);
    const rating = item.vote_average ? `⭐ ${item.vote_average.toFixed(1)}` : '';
    
    response += `${i + 1}. <b>${escapeHTML(title)}</b> ${year ? `(${year})` : ''} ${rating}\n`;
    
    kb.text(`${i + 1}. ${title.slice(0, 20)}`, `media_info:movie:${item.id}`);
    if ((i + 1) % 2 === 0) kb.row();
  });
  
  if (result.results.length % 2 !== 0) kb.row();
  
  await ctx.api.editMessageText(
    ctx.chat.id, statusMsg.message_id,
    response,
    { parse_mode: 'HTML', reply_markup: kb }
  );
});

// /tv - Search TV shows
bot.command("tv", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  if (!(await enforceCommandCooldown(ctx))) return;
  ensureUser(ctx.from.id, ctx.from);
  
  const text = ctx.message.text.replace(/^\/tv\s*/i, '').trim();
  
  if (!text) {
    return ctx.reply(
      '📺 <b>TV Show Search</b>\n\n' +
      '<b>Usage:</b>\n' +
      '<code>/tv title</code>\n\n' +
      '<b>Example:</b>\n' +
      '<code>/tv Breaking Bad</code>',
      { parse_mode: 'HTML', reply_to_message_id: ctx.message?.message_id }
    );
  }
  
  const statusMsg = await ctx.reply(`🔍 Searching for "${escapeHTML(text)}"...`, {
    parse_mode: 'HTML',
    reply_to_message_id: ctx.message?.message_id
  });
  
  const result = await searchMedia(text, 'tv');
  
  if (!result.success) {
    await ctx.api.editMessageText(
      ctx.chat.id, statusMsg.message_id,
      `❌ ${result.error}`,
      { parse_mode: 'HTML' }
    );
    return;
  }
  
  let response = `📺 <b>Search Results:</b>\n\n`;
  const kb = new InlineKeyboard();
  
  result.results.forEach((item, i) => {
    const title = item.title || item.name;
    const year = (item.release_date || item.first_air_date || '').slice(0, 4);
    const rating = item.vote_average ? `⭐ ${item.vote_average.toFixed(1)}` : '';
    
    response += `${i + 1}. <b>${escapeHTML(title)}</b> ${year ? `(${year})` : ''} ${rating}\n`;
    
    kb.text(`${i + 1}. ${title.slice(0, 20)}`, `media_info:tv:${item.id}`);
    if ((i + 1) % 2 === 0) kb.row();
  });
  
  if (result.results.length % 2 !== 0) kb.row();
  
  await ctx.api.editMessageText(
    ctx.chat.id, statusMsg.message_id,
    response,
    { parse_mode: 'HTML', reply_markup: kb }
  );
});

// /qr - Generate QR code
bot.command("qr", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  if (!(await enforceCommandCooldown(ctx))) return;
  ensureUser(ctx.from.id, ctx.from);
  
  const text = ctx.message.text.replace(/^\/qr\s*/i, '').trim();
  
  if (!text) {
    return ctx.reply(
      '📱 <b>QR Code Generator</b>\n\n' +
      '<b>Usage:</b>\n' +
      '<code>/qr your text or URL here</code>\n\n' +
      '<b>Examples:</b>\n' +
      '<code>/qr https://example.com</code>\n' +
      '<code>/qr Hello World!</code>',
      { parse_mode: 'HTML', reply_to_message_id: ctx.message?.message_id }
    );
  }
  
  const result = await generateQR(text);
  
  if (!result.success) {
    return ctx.reply(`❌ Failed to generate QR: ${result.error}`, {
      reply_to_message_id: ctx.message?.message_id
    });
  }
  
  await ctx.replyWithPhoto(new InputFile(result.buffer, 'qrcode.png'), {
    caption: `📱 QR Code for:\n<code>${escapeHTML(text.slice(0, 200))}</code>`,
    parse_mode: 'HTML',
    reply_to_message_id: ctx.message?.message_id
  });
});

// /short - URL shortener
bot.command("short", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  if (!(await enforceCommandCooldown(ctx))) return;
  ensureUser(ctx.from.id, ctx.from);
  
  const text = ctx.message.text.replace(/^\/short\s*/i, '').trim();
  
  if (!text) {
    return ctx.reply(
      '🔗 <b>URL Shortener</b>\n\n' +
      '<b>Usage:</b>\n' +
      '<code>/short https://your-long-url.com/path</code>',
      { parse_mode: 'HTML', reply_to_message_id: ctx.message?.message_id }
    );
  }
  
  if (!/^https?:\/\//i.test(text)) {
    return ctx.reply('❌ Please provide a valid URL starting with http:// or https://', {
      reply_to_message_id: ctx.message?.message_id
    });
  }
  
  const result = await shortenURL(text);
  
  if (!result.success) {
    return ctx.reply(`❌ Failed to shorten URL: ${result.error}`, {
      reply_to_message_id: ctx.message?.message_id
    });
  }
  
  await ctx.reply(
    `🔗 <b>Shortened URL:</b>\n\n` +
    `<code>${escapeHTML(result.shortUrl)}</code>\n\n` +
    `<i>Original: ${escapeHTML(text.slice(0, 50))}${text.length > 50 ? '...' : ''}</i>`,
    { parse_mode: 'HTML', reply_to_message_id: ctx.message?.message_id }
  );
});

// /currency - Currency converter
bot.command("currency", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  if (!(await enforceCommandCooldown(ctx))) return;
  ensureUser(ctx.from.id, ctx.from);
  
  const text = ctx.message.text.replace(/^\/currency\s*/i, '').trim();
  
  if (!text) {
    return ctx.reply(
      '💱 <b>Currency Converter</b>\n\n' +
      '<b>Usage:</b>\n' +
      '<code>/currency 100 USD to EUR</code>\n' +
      '<code>/currency 50 GBP EUR</code>\n\n' +
      '<b>Popular codes:</b> USD, EUR, GBP, JPY, INR, AUD, CAD',
      { parse_mode: 'HTML', reply_to_message_id: ctx.message?.message_id }
    );
  }
  
  const match = text.match(/^([\d.]+)\s*([A-Za-z]{3})\s*(?:to\s*)?([A-Za-z]{3})$/i);
  
  if (!match) {
    return ctx.reply(
      '❌ Invalid format. Use: <code>/currency 100 USD to EUR</code>',
      { parse_mode: 'HTML', reply_to_message_id: ctx.message?.message_id }
    );
  }
  
  const [, amount, from, to] = match;
  const result = await convertCurrency(parseFloat(amount), from, to);
  
  if (!result.success) {
    return ctx.reply(`❌ ${result.error}`, {
      reply_to_message_id: ctx.message?.message_id
    });
  }
  
  await ctx.reply(
    `💱 <b>Currency Conversion</b>\n\n` +
    `<code>${result.amount} ${result.from}</code> = <code>${result.converted} ${result.to}</code>\n\n` +
    `<i>Rate: 1 ${result.from} = ${result.rate.toFixed(4)} ${result.to}</i>`,
    { parse_mode: 'HTML', reply_to_message_id: ctx.message?.message_id }
  );
});


