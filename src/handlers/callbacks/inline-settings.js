/**
 * handlers/callbacks/inline-settings.js
 * Auto-extracted from index.js
 */

// =====================
// INLINE SETTINGS CALLBACKS
// Lines 13695-13841 from original index.js
// =====================

  
  const line = lines[Math.floor(Math.random() * lines.length)];
  
  await ctx.reply(
    `💕 <b>Pickup Line</b>\n\n<i>${escapeHTML(line)}</i>`,
    { parse_mode: 'HTML', reply_to_message_id: ctx.message?.message_id }
  );
});

// Callback for media info
bot.callbackQuery(/^media_info:/, async (ctx) => {
  const [, type, id] = ctx.callbackQuery.data.split(':');
  
  await ctx.answerCallbackQuery({ text: 'Loading details...' });
  
  const result = await getMediaDetails(id, type);
  
  if (!result.success) {
    await ctx.answerCallbackQuery({ text: result.error, show_alert: true });
    return;
  }
  
  const d = result.details;
  const title = d.title || d.name;
  const year = (d.release_date || d.first_air_date || '').slice(0, 4);
  const rating = d.vote_average ? `⭐ ${d.vote_average.toFixed(1)}/10` : '';
  const runtime = d.runtime ? `${d.runtime} min` : d.episode_run_time?.[0] ? `${d.episode_run_time[0]} min/ep` : '';
  const genres = d.genres?.map(g => g.name).join(', ') || '';
  
  let response = `🎬 <b>${escapeHTML(title)}</b> ${year ? `(${year})` : ''}\n\n`;
  response += `${rating} ${runtime ? `• ${runtime}` : ''}\n`;
  if (genres) response += `📎 ${escapeHTML(genres)}\n`;
  response += `\n${escapeHTML(d.overview?.slice(0, 500) || 'No description available.')}\n`;
  
  if (result.recommendations && result.recommendations.length > 0) {
    response += `\n<b>Similar:</b> `;
    response += result.recommendations.slice(0, 3).map(r => escapeHTML(r.title || r.name)).join(', ');
  }
  
  const kb = new InlineKeyboard();
  
  const trailers = await getTrailers(id, type);
  if (trailers.success && trailers.trailers.length > 0) {
    const trailer = trailers.trailers[0];
    kb.url('🎬 Watch Trailer', `https://youtube.com/watch?v=${trailer.key}`);
  }
  
  kb.url('📖 More Info', `https://themoviedb.org/${type}/${id}`);
  
  if (d.poster_path) {
    try {
      await ctx.editMessageMedia({
        type: 'photo',
        media: `https://image.tmdb.org/t/p/w500${d.poster_path}`,
        caption: response.slice(0, 1024),
        parse_mode: 'HTML'
      }, { reply_markup: kb });
    } catch (e) {
      await ctx.editMessageText(response, {
        parse_mode: 'HTML',
        reply_markup: kb
      });
    }
  } else {
    await ctx.editMessageText(response, {
      parse_mode: 'HTML',
      reply_markup: kb
    });
  }
});

// Callback for wallpaper navigation
bot.callbackQuery(/^wp_next:/, async (ctx) => {
  const [, query, indexStr] = ctx.callbackQuery.data.split(':');
  const index = parseInt(indexStr);
  
  await ctx.answerCallbackQuery();
  
  const result = await searchWallpapers(decodeURIComponent(query));
  
  if (!result.success || index >= result.wallpapers.length) {
    await ctx.answerCallbackQuery({ text: 'No more wallpapers', show_alert: true });
    return;
  }
  
  const wallpaper = result.wallpapers[index];
  
  const kb = new InlineKeyboard();
  if (index > 0) {
    kb.text('← Prev', `wp_next:${query}:${index - 1}`);
  }
  if (index < result.wallpapers.length - 1) {
    kb.text('Next →', `wp_next:${query}:${index + 1}`);
  }
  kb.row().url('🔗 Full Resolution', wallpaper.url);
  
  try {
    await ctx.editMessageMedia({
      type: 'photo',
      media: wallpaper.thumbnail,
      caption: `🖼️ <b>Wallpaper</b> (${index + 1}/${result.wallpapers.length})\n\nResolution: ${wallpaper.resolution}`,
      parse_mode: 'HTML'
    }, { reply_markup: kb });
  } catch (e) {
    // Ignore edit errors
  }
});

// Callback for auto-detected media download
bot.callbackQuery(/^auto_dl:/, async (ctx) => {
  const [, mode, encodedUrl] = ctx.callbackQuery.data.split(':');
  const url = decodeURIComponent(encodedUrl);
  const audioOnly = mode === 'audio';
  
  await ctx.answerCallbackQuery({ text: 'Starting download...' });
  
  const platform = detectPlatform(url);
  const emoji = platform ? PLATFORM_EMOJI[platform] : '📥';
  
  try {
    await ctx.editMessageText(
      `${emoji} <b>Downloading ${audioOnly ? 'audio' : 'video'}...</b>\n\nThis may take a moment...`,
      { parse_mode: 'HTML' }
    );
    
    const result = await downloadMedia(url, audioOnly);
    
    if (!result.success) {
      await ctx.editMessageText(
        `❌ Download failed: ${escapeHTML(result.error)}`,
        { parse_mode: 'HTML' }
      );
      return;
    }
    
    await ctx.editMessageText(
      `${emoji} <b>Uploading to Telegram...</b>`,
      { parse_mode: 'HTML' }
    );
    
    if (audioOnly) {
      await ctx.replyWithAudio(result.url, {
        caption: `${emoji} Downloaded via StarzAI`
      });
    } else {
      await ctx.replyWithVideo(result.url, {
        caption: `${emoji} Downloaded via StarzAI`

