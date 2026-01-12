/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                    STARZAI SUPER UTILITIES - COMMAND HANDLERS                 ║
 * ║              Integration layer for all 27 utility features                    ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 * 
 * This file contains the Telegram bot command handlers and auto-detection logic
 * for all super utility features. Import and register these with your bot instance.
 */

import { InlineKeyboard, InputFile } from "grammy";
import fetch from 'node-fetch';
import {
  downloadMedia,
  detectPlatform,
  URL_PATTERNS,
  getLyrics,
  searchMedia,
  getMediaDetails,
  getTrailers,
  generateQR,
  shortenURL,
  convertCurrency,
  getWeather,
  translateText,
  convertUnit,
  getWikipedia,
  getDefinition,
  getRandomFact,
  getThisDayInHistory,
  getRandomQuote,
  generateQuoteImage,
  getTruthOrDare,
  getWouldYouRather,
  runCode,
  getSupportedLanguages,
  searchWallpapers
} from './super-utilities.js';

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function escapeHTML(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Platform emoji mapping
const PLATFORM_EMOJI = {
  youtube: '📺',
  tiktok: '🎵',
  instagram: '📸',
  twitter: '🐦',
  spotify: '🎧',
  soundcloud: '☁️',
  facebook: '📘'
};

// ═══════════════════════════════════════════════════════════════════════════════
// AUTO-DETECTION HANDLER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if a message contains a downloadable link and offer to download
 * Returns true if handled, false otherwise
 */
export async function handleAutoDetection(ctx, text) {
  const platform = detectPlatform(text);
  if (!platform) return false;
  
  // Extract the URL from the text
  const urlMatch = text.match(/https?:\/\/[^\s]+/);
  if (!urlMatch) return false;
  
  const url = urlMatch[0];
  const emoji = PLATFORM_EMOJI[platform] || '📥';
  
  // Create inline keyboard with download options
  const kb = new InlineKeyboard()
    .text(`${emoji} Download Video`, `dl_video:${encodeURIComponent(url)}`)
    .text('🎵 Audio Only', `dl_audio:${encodeURIComponent(url)}`);
  
  await ctx.reply(
    `${emoji} <b>${platform.charAt(0).toUpperCase() + platform.slice(1)} link detected!</b>\n\nWould you like to download this?`,
    {
      parse_mode: 'HTML',
      reply_markup: kb,
      reply_to_message_id: ctx.message?.message_id
    }
  );
  
  return true;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DOWNLOAD COMMANDS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * /download or /dl command - Download video/audio from URL
 */
export async function handleDownloadCommand(ctx) {
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
    
    // Check if we have multiple format options
    if (result.formats && result.formats.length > 1) {
      const kb = new InlineKeyboard();
      result.formats.slice(0, 4).forEach((fmt, i) => {
        const label = fmt.format_id || fmt.ext || `Option ${i + 1}`;
        kb.text(`📹 ${label}`, `dl_fmt:${i}:${encodeURIComponent(url)}`).row();
      });
      
      await ctx.api.editMessageText(
        ctx.chat.id, statusMsg.message_id,
        `${emoji} <b>Multiple formats available:</b>\n\n` +
        `<b>Title:</b> ${escapeHTML(result.title || 'Video')}\n\n` +
        `Select quality:`,
        { parse_mode: 'HTML', reply_markup: kb }
      );
      return;
    }
    
    // Send the file directly using URL
    await ctx.api.editMessageText(
      ctx.chat.id, statusMsg.message_id,
      `${emoji} <b>Sending to Telegram...</b>\n\n<b>Title:</b> ${escapeHTML(result.title || 'Video')}`,
      { parse_mode: 'HTML' }
    );
    
    // Determine if it's video or audio based on platform/URL
    const isAudio = platform === 'soundcloud' || platform === 'spotify' || result.type === 'audio';
    const isTikTokSlideshow = result.type === 'slideshow' && result.images;
    
    // Build caption
    let caption = `${emoji} <b>${escapeHTML(result.title || 'Downloaded')}</b>`;
    if (result.author) caption += `\n👤 ${escapeHTML(result.author)}`;
    caption += `\n\n<i>Downloaded via StarzAI</i>`;
    
    if (isTikTokSlideshow) {
      // Send images as media group for TikTok slideshows
      const mediaGroup = result.images.slice(0, 10).map((img, i) => ({
        type: 'photo',
        media: img,
        caption: i === 0 ? caption : undefined,
        parse_mode: i === 0 ? 'HTML' : undefined
      }));
      
      await ctx.replyWithMediaGroup(mediaGroup, {
        reply_to_message_id: ctx.message?.message_id
      });
      
      // Also send audio if available
      if (result.music) {
        await ctx.replyWithAudio(result.music, {
          caption: '🎵 Audio from slideshow',
          reply_to_message_id: ctx.message?.message_id
        });
      }
    } else if (isAudio) {
      await ctx.replyWithAudio(result.url, {
        caption: caption,
        parse_mode: 'HTML',
        reply_to_message_id: ctx.message?.message_id
      });
    } else {
      await ctx.replyWithVideo(result.url, {
        caption: caption,
        parse_mode: 'HTML',
        reply_to_message_id: ctx.message?.message_id,
        supports_streaming: true
      });
    }
    
    await ctx.api.deleteMessage(ctx.chat.id, statusMsg.message_id);
    
  } catch (error) {
    console.error('Download error:', error);
    await ctx.api.editMessageText(
      ctx.chat.id, statusMsg.message_id,
      `❌ Error: ${escapeHTML(error.message)}\n\n<i>Try again or use a different link.</i>`,
      { parse_mode: 'HTML' }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MUSIC COMMANDS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * /lyrics command - Get song lyrics
 */
export async function handleLyricsCommand(ctx) {
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
  
  // Parse artist and title
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
  
  // Truncate if too long
  let lyrics = result.lyrics;
  if (lyrics.length > 3500) {
    lyrics = lyrics.slice(0, 3500) + '\n\n... (truncated)';
  }
  
  await ctx.api.editMessageText(
    ctx.chat.id, statusMsg.message_id,
    `🎵 <b>${escapeHTML(artist)} - ${escapeHTML(title)}</b>\n\n${escapeHTML(lyrics)}`,
    { parse_mode: 'HTML' }
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOVIE/TV COMMANDS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * /movie or /tv command - Search for movies/TV shows
 */
export async function handleMovieCommand(ctx, type = 'movie') {
  const cmdName = type === 'movie' ? 'movie' : 'tv';
  const text = ctx.message.text.replace(new RegExp(`^\\/${cmdName}\\s*`, 'i'), '').trim();
  
  if (!text) {
    const emoji = type === 'movie' ? '🎬' : '📺';
    return ctx.reply(
      `${emoji} <b>${type === 'movie' ? 'Movie' : 'TV Show'} Search</b>\n\n` +
      `<b>Usage:</b>\n` +
      `<code>/${cmdName} title</code>\n\n` +
      `<b>Example:</b>\n` +
      `<code>/${cmdName} ${type === 'movie' ? 'Inception' : 'Breaking Bad'}</code>`,
      { parse_mode: 'HTML', reply_to_message_id: ctx.message?.message_id }
    );
  }
  
  const statusMsg = await ctx.reply(`🔍 Searching for "${escapeHTML(text)}"...`, {
    parse_mode: 'HTML',
    reply_to_message_id: ctx.message?.message_id
  });
  
  const result = await searchMedia(text, type);
  
  if (!result.success) {
    await ctx.api.editMessageText(
      ctx.chat.id, statusMsg.message_id,
      `❌ ${result.error}`,
      { parse_mode: 'HTML' }
    );
    return;
  }
  
  // Build response with results
  const emoji = type === 'movie' ? '🎬' : '📺';
  let response = `${emoji} <b>Search Results:</b>\n\n`;
  
  const kb = new InlineKeyboard();
  
  result.results.forEach((item, i) => {
    const title = item.title || item.name;
    const year = (item.release_date || item.first_air_date || '').slice(0, 4);
    const rating = item.vote_average ? `⭐ ${item.vote_average.toFixed(1)}` : '';
    
    response += `${i + 1}. <b>${escapeHTML(title)}</b> ${year ? `(${year})` : ''} ${rating}\n`;
    
    kb.text(`${i + 1}. ${title.slice(0, 20)}`, `media_info:${type}:${item.id}`);
    if ((i + 1) % 2 === 0) kb.row();
  });
  
  if (result.results.length % 2 !== 0) kb.row();
  
  await ctx.api.editMessageText(
    ctx.chat.id, statusMsg.message_id,
    response,
    { parse_mode: 'HTML', reply_markup: kb }
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY COMMANDS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * /qr command - Generate QR code
 */
export async function handleQRCommand(ctx) {
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
}

/**
 * /short command - Shorten URL
 */
export async function handleShortCommand(ctx) {
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
}

/**
 * /currency command - Convert currency
 */
export async function handleCurrencyCommand(ctx) {
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
  
  // Parse: "100 USD to EUR" or "100 USD EUR"
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
}

/**
 * /weather command - Get weather
 */
export async function handleWeatherCommand(ctx) {
  const text = ctx.message.text.replace(/^\/weather\s*/i, '').trim();
  
  if (!text) {
    return ctx.reply(
      '🌤️ <b>Weather</b>\n\n' +
      '<b>Usage:</b>\n' +
      '<code>/weather city name</code>\n\n' +
      '<b>Examples:</b>\n' +
      '<code>/weather Tokyo</code>\n' +
      '<code>/weather New York</code>',
      { parse_mode: 'HTML', reply_to_message_id: ctx.message?.message_id }
    );
  }
  
  const result = await getWeather(text);
  
  if (!result.success) {
    return ctx.reply(`❌ ${result.error}`, {
      reply_to_message_id: ctx.message?.message_id
    });
  }
  
  await ctx.reply(
    `🌤️ <b>Weather in ${escapeHTML(result.location)}${result.country ? `, ${escapeHTML(result.country)}` : ''}</b>\n\n` +
    `🌡️ Temperature: <b>${result.temp_c}°C</b> (${result.temp_f}°F)\n` +
    `🤔 Feels like: ${result.feels_like_c}°C\n` +
    `☁️ Condition: ${escapeHTML(result.condition)}\n` +
    `💧 Humidity: ${result.humidity}%\n` +
    `💨 Wind: ${result.wind_kph} km/h ${result.wind_dir}`,
    { parse_mode: 'HTML', reply_to_message_id: ctx.message?.message_id }
  );
}

/**
 * /translate command - Translate text
 */
export async function handleTranslateCommand(ctx) {
  const text = ctx.message.text.replace(/^\/translate\s*/i, '').trim();
  
  if (!text) {
    return ctx.reply(
      '🌐 <b>Translate</b>\n\n' +
      '<b>Usage:</b>\n' +
      '<code>/translate [to:lang] text</code>\n\n' +
      '<b>Examples:</b>\n' +
      '<code>/translate Hello world</code> (auto-detect → English)\n' +
      '<code>/translate to:es Hello world</code> (→ Spanish)\n' +
      '<code>/translate to:ja Good morning</code> (→ Japanese)\n\n' +
      '<b>Language codes:</b> en, es, fr, de, ja, ko, zh, ru, ar, hi',
      { parse_mode: 'HTML', reply_to_message_id: ctx.message?.message_id }
    );
  }
  
  // Parse target language if specified
  let targetLang = 'en';
  let textToTranslate = text;
  
  const langMatch = text.match(/^to:([a-z]{2})\s+/i);
  if (langMatch) {
    targetLang = langMatch[1].toLowerCase();
    textToTranslate = text.slice(langMatch[0].length);
  }
  
  const result = await translateText(textToTranslate, 'auto', targetLang);
  
  if (!result.success) {
    return ctx.reply(`❌ ${result.error}`, {
      reply_to_message_id: ctx.message?.message_id
    });
  }
  
  await ctx.reply(
    `🌐 <b>Translation</b>\n\n` +
    `<b>Original:</b>\n${escapeHTML(result.original)}\n\n` +
    `<b>Translated (${result.to}):</b>\n${escapeHTML(result.translated)}`,
    { parse_mode: 'HTML', reply_to_message_id: ctx.message?.message_id }
  );
}

/**
 * /convert command - Unit conversion
 */
export async function handleConvertCommand(ctx) {
  const text = ctx.message.text.replace(/^\/convert\s*/i, '').trim();
  
  if (!text) {
    return ctx.reply(
      '📐 <b>Unit Converter</b>\n\n' +
      '<b>Usage:</b>\n' +
      '<code>/convert value from to</code>\n\n' +
      '<b>Examples:</b>\n' +
      '<code>/convert 100 km mi</code>\n' +
      '<code>/convert 70 kg lb</code>\n' +
      '<code>/convert 30 c f</code>\n\n' +
      '<b>Supported:</b>\n' +
      '• Length: km↔mi, m↔ft, cm↔in\n' +
      '• Weight: kg↔lb, g↔oz\n' +
      '• Temp: c↔f\n' +
      '• Volume: l↔gal, ml↔floz',
      { parse_mode: 'HTML', reply_to_message_id: ctx.message?.message_id }
    );
  }
  
  const match = text.match(/^([\d.]+)\s*([a-z]+)\s+([a-z]+)$/i);
  
  if (!match) {
    return ctx.reply(
      '❌ Invalid format. Use: <code>/convert 100 km mi</code>',
      { parse_mode: 'HTML', reply_to_message_id: ctx.message?.message_id }
    );
  }
  
  const [, value, from, to] = match;
  const result = convertUnit(parseFloat(value), from, to);
  
  if (!result.success) {
    return ctx.reply(`❌ ${result.error}`, {
      reply_to_message_id: ctx.message?.message_id
    });
  }
  
  await ctx.reply(
    `📐 <b>Unit Conversion</b>\n\n` +
    `<code>${result.value} ${result.fromUnit}</code> = <code>${result.result} ${result.toUnit}</code>`,
    { parse_mode: 'HTML', reply_to_message_id: ctx.message?.message_id }
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// KNOWLEDGE COMMANDS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * /wiki command - Wikipedia search
 */
export async function handleWikiCommand(ctx) {
  const text = ctx.message.text.replace(/^\/wiki\s*/i, '').trim();
  
  if (!text) {
    return ctx.reply(
      '📚 <b>Wikipedia</b>\n\n' +
      '<b>Usage:</b>\n' +
      '<code>/wiki search term</code>\n\n' +
      '<b>Example:</b>\n' +
      '<code>/wiki Artificial Intelligence</code>',
      { parse_mode: 'HTML', reply_to_message_id: ctx.message?.message_id }
    );
  }
  
  const result = await getWikipedia(text);
  
  if (!result.success) {
    return ctx.reply(`❌ ${result.error}`, {
      reply_to_message_id: ctx.message?.message_id
    });
  }
  
  let response = `📚 <b>${escapeHTML(result.title)}</b>\n\n`;
  response += escapeHTML(result.extract);
  
  if (result.url) {
    response += `\n\n<a href="${result.url}">Read more on Wikipedia →</a>`;
  }
  
  // Send with thumbnail if available
  if (result.thumbnail) {
    await ctx.replyWithPhoto(result.thumbnail, {
      caption: response.slice(0, 1024),
      parse_mode: 'HTML',
      reply_to_message_id: ctx.message?.message_id
    });
  } else {
    await ctx.reply(response, {
      parse_mode: 'HTML',
      disable_web_page_preview: false,
      reply_to_message_id: ctx.message?.message_id
    });
  }
}

/**
 * /define command - Dictionary definition
 */
export async function handleDefineCommand(ctx) {
  const text = ctx.message.text.replace(/^\/define\s*/i, '').trim();
  
  if (!text) {
    return ctx.reply(
      '📖 <b>Dictionary</b>\n\n' +
      '<b>Usage:</b>\n' +
      '<code>/define word</code>\n\n' +
      '<b>Example:</b>\n' +
      '<code>/define serendipity</code>',
      { parse_mode: 'HTML', reply_to_message_id: ctx.message?.message_id }
    );
  }
  
  const result = await getDefinition(text);
  
  if (!result.success) {
    return ctx.reply(`❌ ${result.error}`, {
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
    meaning.definitions.forEach((def, i) => {
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
}

/**
 * /fact command - Random fact
 */
export async function handleFactCommand(ctx) {
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
}

/**
 * /today command - This day in history
 */
export async function handleTodayCommand(ctx) {
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
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUN COMMANDS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * /quote command - Random quote
 */
export async function handleQuoteCommand(ctx) {
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
}

/**
 * /quotify command - Generate Discord-style quote image from replied message
 */
export async function handleQuotifyCommand(ctx) {
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
  
  // Get user info
  const user = replied.from;
  const username = user?.first_name || 'Anonymous';
  
  // Try to get avatar
  let avatarUrl = null;
  try {
    const photos = await ctx.api.getUserProfilePhotos(user.id, { limit: 1 });
    if (photos.total_count > 0) {
      const fileId = photos.photos[0][0].file_id;
      const file = await ctx.api.getFile(fileId);
      avatarUrl = `https://api.telegram.org/file/bot${ctx.api.token}/${file.file_path}`;
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
}

/**
 * /truth and /dare commands
 */
export async function handleTruthCommand(ctx) {
  const question = getTruthOrDare('truth');
  await ctx.reply(
    `🤔 <b>Truth</b>\n\n${escapeHTML(question)}`,
    { parse_mode: 'HTML', reply_to_message_id: ctx.message?.message_id }
  );
}

export async function handleDareCommand(ctx) {
  const dare = getTruthOrDare('dare');
  await ctx.reply(
    `😈 <b>Dare</b>\n\n${escapeHTML(dare)}`,
    { parse_mode: 'HTML', reply_to_message_id: ctx.message?.message_id }
  );
}

/**
 * /wyr command - Would You Rather
 */
export async function handleWYRCommand(ctx) {
  const { option1, option2 } = getWouldYouRather();
  
  const kb = new InlineKeyboard()
    .text(`🅰️ ${option1}`, 'wyr_a')
    .text(`🅱️ ${option2}`, 'wyr_b');
  
  await ctx.reply(
    `🤷 <b>Would You Rather...</b>\n\n` +
    `🅰️ ${escapeHTML(option1)}\n\n` +
    `<b>OR</b>\n\n` +
    `🅱️ ${escapeHTML(option2)}`,
    { parse_mode: 'HTML', reply_markup: kb, reply_to_message_id: ctx.message?.message_id }
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEV TOOLS COMMANDS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * /run command - Execute code
 */
export async function handleRunCommand(ctx) {
  const text = ctx.message.text.replace(/^\/run\s*/i, '').trim();
  
  if (!text) {
    const langs = await getSupportedLanguages();
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
  
  // Parse language and code
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
  
  if (result.error) {
    response += `\n<b>Errors:</b>\n<code>${escapeHTML(result.error.slice(0, 500))}</code>\n`;
  }
  
  response += `\n<i>Exit code: ${result.exitCode}</i>`;
  
  await ctx.api.editMessageText(
    ctx.chat.id, statusMsg.message_id,
    response,
    { parse_mode: 'HTML' }
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MEDIA COMMANDS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * /wallpaper command - Search wallpapers
 */
export async function handleWallpaperCommand(ctx) {
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
  
  // Send first wallpaper with navigation
  const wallpaper = result.wallpapers[0];
  
  const kb = new InlineKeyboard();
  if (result.wallpapers.length > 1) {
    kb.text('Next →', `wp_next:${encodeURIComponent(text)}:1`);
  }
  kb.row().text('🔗 Full Resolution', `wp_full:${wallpaper.id}`);
  
  await ctx.api.deleteMessage(ctx.chat.id, statusMsg.message_id);
  
  await ctx.replyWithPhoto(wallpaper.thumbnail, {
    caption: `🖼️ <b>Wallpaper</b> (1/${result.wallpapers.length})\n\nResolution: ${wallpaper.resolution}`,
    parse_mode: 'HTML',
    reply_markup: kb,
    reply_to_message_id: ctx.message?.message_id
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// CALLBACK HANDLERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Handle download callbacks
 */
export async function handleDownloadCallback(ctx, data) {
  const [action, ...rest] = data.split(':');
  
  if (action === 'dl_video' || action === 'dl_audio') {
    const url = decodeURIComponent(rest.join(':'));
    const audioOnly = action === 'dl_audio';
    
    await ctx.answerCallbackQuery({ text: 'Downloading...' });
    
    await ctx.editMessageText(
      `📥 <b>${audioOnly ? 'Extracting audio' : 'Downloading video'}...</b>\n\nThis may take a moment...`,
      { parse_mode: 'HTML' }
    );
    
    try {
      const result = await downloadMedia(url, audioOnly);
      
      if (!result.success) {
        await ctx.editMessageText(`❌ Download failed: ${escapeHTML(result.error)}`, {
          parse_mode: 'HTML'
        });
        return;
      }
      
      await ctx.editMessageText(`📤 <b>Uploading to Telegram...</b>`, {
        parse_mode: 'HTML'
      });
      
      if (audioOnly) {
        await ctx.replyWithAudio(result.url, {
          caption: '🎵 Downloaded via StarzAI'
        });
      } else {
        await ctx.replyWithVideo(result.url, {
          caption: '📥 Downloaded via StarzAI'
        });
      }
      
      await ctx.deleteMessage();
      
    } catch (error) {
      await ctx.editMessageText(`❌ Error: ${escapeHTML(error.message)}`, {
        parse_mode: 'HTML'
      });
    }
  }
}

/**
 * Handle media info callbacks
 */
export async function handleMediaInfoCallback(ctx, data) {
  const [, type, id] = data.split(':');
  
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
  
  // Add recommendations
  if (result.recommendations.length > 0) {
    response += `\n<b>Similar:</b> `;
    response += result.recommendations.slice(0, 3).map(r => escapeHTML(r.title || r.name)).join(', ');
  }
  
  const kb = new InlineKeyboard();
  
  // Add trailer button
  const trailers = await getTrailers(id, type);
  if (trailers.success && trailers.trailers.length > 0) {
    const trailer = trailers.trailers[0];
    kb.url('🎬 Watch Trailer', `https://youtube.com/watch?v=${trailer.key}`);
  }
  
  // Add TMDB link
  kb.url('📖 More Info', `https://themoviedb.org/${type}/${id}`);
  
  // Send with poster if available
  if (d.poster_path) {
    await ctx.editMessageMedia({
      type: 'photo',
      media: `https://image.tmdb.org/t/p/w500${d.poster_path}`,
      caption: response.slice(0, 1024),
      parse_mode: 'HTML'
    }, { reply_markup: kb });
  } else {
    await ctx.editMessageText(response, {
      parse_mode: 'HTML',
      reply_markup: kb
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMMAND REGISTRATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Register all super utility commands with a bot instance
 */
export function registerSuperUtilityCommands(bot, enforceRateLimit, enforceCommandCooldown, ensureUser) {
  // Download commands
  bot.command(['download', 'dl'], async (ctx) => {
    if (enforceRateLimit && !(await enforceRateLimit(ctx))) return;
    if (enforceCommandCooldown && !(await enforceCommandCooldown(ctx))) return;
    if (ensureUser) ensureUser(ctx.from.id, ctx.from);
    await handleDownloadCommand(ctx);
  });
  
  // Music commands
  bot.command('lyrics', async (ctx) => {
    if (enforceRateLimit && !(await enforceRateLimit(ctx))) return;
    if (enforceCommandCooldown && !(await enforceCommandCooldown(ctx))) return;
    if (ensureUser) ensureUser(ctx.from.id, ctx.from);
    await handleLyricsCommand(ctx);
  });
  
  // Movie/TV commands
  bot.command('movie', async (ctx) => {
    if (enforceRateLimit && !(await enforceRateLimit(ctx))) return;
    if (enforceCommandCooldown && !(await enforceCommandCooldown(ctx))) return;
    if (ensureUser) ensureUser(ctx.from.id, ctx.from);
    await handleMovieCommand(ctx, 'movie');
  });
  
  bot.command('tv', async (ctx) => {
    if (enforceRateLimit && !(await enforceRateLimit(ctx))) return;
    if (enforceCommandCooldown && !(await enforceCommandCooldown(ctx))) return;
    if (ensureUser) ensureUser(ctx.from.id, ctx.from);
    await handleMovieCommand(ctx, 'tv');
  });
  
  // Utility commands
  bot.command('qr', async (ctx) => {
    if (enforceRateLimit && !(await enforceRateLimit(ctx))) return;
    if (enforceCommandCooldown && !(await enforceCommandCooldown(ctx))) return;
    if (ensureUser) ensureUser(ctx.from.id, ctx.from);
    await handleQRCommand(ctx);
  });
  
  bot.command('short', async (ctx) => {
    if (enforceRateLimit && !(await enforceRateLimit(ctx))) return;
    if (enforceCommandCooldown && !(await enforceCommandCooldown(ctx))) return;
    if (ensureUser) ensureUser(ctx.from.id, ctx.from);
    await handleShortCommand(ctx);
  });
  
  bot.command('currency', async (ctx) => {
    if (enforceRateLimit && !(await enforceRateLimit(ctx))) return;
    if (enforceCommandCooldown && !(await enforceCommandCooldown(ctx))) return;
    if (ensureUser) ensureUser(ctx.from.id, ctx.from);
    await handleCurrencyCommand(ctx);
  });
  
  bot.command('weather', async (ctx) => {
    if (enforceRateLimit && !(await enforceRateLimit(ctx))) return;
    if (enforceCommandCooldown && !(await enforceCommandCooldown(ctx))) return;
    if (ensureUser) ensureUser(ctx.from.id, ctx.from);
    await handleWeatherCommand(ctx);
  });
  
  bot.command('translate', async (ctx) => {
    if (enforceRateLimit && !(await enforceRateLimit(ctx))) return;
    if (enforceCommandCooldown && !(await enforceCommandCooldown(ctx))) return;
    if (ensureUser) ensureUser(ctx.from.id, ctx.from);
    await handleTranslateCommand(ctx);
  });
  
  bot.command('convert', async (ctx) => {
    if (enforceRateLimit && !(await enforceRateLimit(ctx))) return;
    if (enforceCommandCooldown && !(await enforceCommandCooldown(ctx))) return;
    if (ensureUser) ensureUser(ctx.from.id, ctx.from);
    await handleConvertCommand(ctx);
  });
  
  // Knowledge commands
  bot.command('wiki', async (ctx) => {
    if (enforceRateLimit && !(await enforceRateLimit(ctx))) return;
    if (enforceCommandCooldown && !(await enforceCommandCooldown(ctx))) return;
    if (ensureUser) ensureUser(ctx.from.id, ctx.from);
    await handleWikiCommand(ctx);
  });
  
  bot.command('define', async (ctx) => {
    if (enforceRateLimit && !(await enforceRateLimit(ctx))) return;
    if (enforceCommandCooldown && !(await enforceCommandCooldown(ctx))) return;
    if (ensureUser) ensureUser(ctx.from.id, ctx.from);
    await handleDefineCommand(ctx);
  });
  
  bot.command('fact', async (ctx) => {
    if (enforceRateLimit && !(await enforceRateLimit(ctx))) return;
    if (enforceCommandCooldown && !(await enforceCommandCooldown(ctx))) return;
    if (ensureUser) ensureUser(ctx.from.id, ctx.from);
    await handleFactCommand(ctx);
  });
  
  bot.command('today', async (ctx) => {
    if (enforceRateLimit && !(await enforceRateLimit(ctx))) return;
    if (enforceCommandCooldown && !(await enforceCommandCooldown(ctx))) return;
    if (ensureUser) ensureUser(ctx.from.id, ctx.from);
    await handleTodayCommand(ctx);
  });
  
  // Fun commands
  bot.command('quote', async (ctx) => {
    if (enforceRateLimit && !(await enforceRateLimit(ctx))) return;
    if (enforceCommandCooldown && !(await enforceCommandCooldown(ctx))) return;
    if (ensureUser) ensureUser(ctx.from.id, ctx.from);
    await handleQuoteCommand(ctx);
  });
  
  bot.command('quotify', async (ctx) => {
    if (enforceRateLimit && !(await enforceRateLimit(ctx))) return;
    if (enforceCommandCooldown && !(await enforceCommandCooldown(ctx))) return;
    if (ensureUser) ensureUser(ctx.from.id, ctx.from);
    await handleQuotifyCommand(ctx);
  });
  
  bot.command('truth', async (ctx) => {
    if (enforceRateLimit && !(await enforceRateLimit(ctx))) return;
    if (enforceCommandCooldown && !(await enforceCommandCooldown(ctx))) return;
    if (ensureUser) ensureUser(ctx.from.id, ctx.from);
    await handleTruthCommand(ctx);
  });
  
  bot.command('dare', async (ctx) => {
    if (enforceRateLimit && !(await enforceRateLimit(ctx))) return;
    if (enforceCommandCooldown && !(await enforceCommandCooldown(ctx))) return;
    if (ensureUser) ensureUser(ctx.from.id, ctx.from);
    await handleDareCommand(ctx);
  });
  
  bot.command('wyr', async (ctx) => {
    if (enforceRateLimit && !(await enforceRateLimit(ctx))) return;
    if (enforceCommandCooldown && !(await enforceCommandCooldown(ctx))) return;
    if (ensureUser) ensureUser(ctx.from.id, ctx.from);
    await handleWYRCommand(ctx);
  });
  
  // Dev tools
  bot.command('run', async (ctx) => {
    if (enforceRateLimit && !(await enforceRateLimit(ctx))) return;
    if (enforceCommandCooldown && !(await enforceCommandCooldown(ctx))) return;
    if (ensureUser) ensureUser(ctx.from.id, ctx.from);
    await handleRunCommand(ctx);
  });
  
  // Media
  bot.command('wallpaper', async (ctx) => {
    if (enforceRateLimit && !(await enforceRateLimit(ctx))) return;
    if (enforceCommandCooldown && !(await enforceCommandCooldown(ctx))) return;
    if (ensureUser) ensureUser(ctx.from.id, ctx.from);
    await handleWallpaperCommand(ctx);
  });
  
  // Callback query handlers
  bot.callbackQuery(/^dl_(video|audio):/, async (ctx) => {
    await handleDownloadCallback(ctx, ctx.callbackQuery.data);
  });
  
  bot.callbackQuery(/^media_info:/, async (ctx) => {
    await handleMediaInfoCallback(ctx, ctx.callbackQuery.data);
  });
}

export default {
  handleAutoDetection,
  registerSuperUtilityCommands,
  // Export individual handlers for custom integration
  handleDownloadCommand,
  handleLyricsCommand,
  handleMovieCommand,
  handleQRCommand,
  handleShortCommand,
  handleCurrencyCommand,
  handleWeatherCommand,
  handleTranslateCommand,
  handleConvertCommand,
  handleWikiCommand,
  handleDefineCommand,
  handleFactCommand,
  handleTodayCommand,
  handleQuoteCommand,
  handleQuotifyCommand,
  handleTruthCommand,
  handleDareCommand,
  handleWYRCommand,
  handleRunCommand,
  handleWallpaperCommand
};
