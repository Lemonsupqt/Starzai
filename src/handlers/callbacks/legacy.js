/**
 * handlers/callbacks/legacy.js
 * Auto-extracted from index.js
 */

// =====================
// CALLBACKS: LEGACY
// Lines 13123-13331 from original index.js
// =====================

// /weather - Get weather
bot.command("weather", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  if (!(await enforceCommandCooldown(ctx))) return;
  ensureUser(ctx.from.id, ctx.from);
  
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
});

// /translate - Translate text
bot.command("translate", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  if (!(await enforceCommandCooldown(ctx))) return;
  ensureUser(ctx.from.id, ctx.from);
  
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
});

// /convert - Unit converter
bot.command("convert", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  if (!(await enforceCommandCooldown(ctx))) return;
  ensureUser(ctx.from.id, ctx.from);
  
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
});

// /wiki - Wikipedia search
bot.command("wiki", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  if (!(await enforceCommandCooldown(ctx))) return;
  ensureUser(ctx.from.id, ctx.from);
  
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
});

// /define - Dictionary
bot.command("define", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  if (!(await enforceCommandCooldown(ctx))) return;
  ensureUser(ctx.from.id, ctx.from);
  
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

