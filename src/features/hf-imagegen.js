/**
 * HF Space Image Generation Integration
 * Interactive UI with edit-in-place design
 * Uses grammY bot API syntax
 */

import fetch from 'node-fetch';

// HF Space API URL
const HF_IMAGEGEN_API = process.env.HF_IMAGEGEN_API || '';

// Aspect ratio presets
const ASPECT_RATIOS = {
  square: { width: 1024, height: 1024, label: '🔲 Square 1:1' },
  portrait: { width: 768, height: 1152, label: '📱 Portrait 2:3' },
  landscape: { width: 1152, height: 768, label: '🖼️ Landscape 3:2' },
  phone: { width: 576, height: 1024, label: '📲 Phone 9:16' },
  wide: { width: 1216, height: 832, label: '🎬 Wide 3:2' },
  ultrawide: { width: 1344, height: 768, label: '🎥 Ultrawide 21:9' },
};

// Available models
const MODELS = {
  peppermint: { id: 'peppermint', label: '🍬 Peppermint', style: 'anime' },
  'wai-illustrious': { id: 'wai-illustrious', label: '🎨 WAI Illustrious', style: 'anime' },
  'ntr-mix': { id: 'ntr-mix', label: '🔥 NTR MIX', style: 'anime' },
};

// Available LoRAs
const LORAS = {
  none: { id: null, label: '❌ None' },
  'shiny-nai': { id: 'shiny-nai', label: '✨ Shiny Nai Style' },
};

// Quality presets
const QUALITY_PRESETS = {
  fast: { steps: 20, cfg: 6.0, label: '⚡ Fast' },
  balanced: { steps: 30, cfg: 7.0, label: '⚖️ Balanced' },
  quality: { steps: 40, cfg: 7.5, label: '✨ Quality' },
  ultra: { steps: 50, cfg: 8.0, label: '💎 Ultra' },
};

// Default negative prompt
const DEFAULT_NEGATIVE = 'lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry, artist name';

// Session storage for user generation settings
const userSessions = new Map();

/**
 * Get or create user session
 */
function getSession(userId) {
  if (!userSessions.has(userId)) {
    userSessions.set(userId, {
      prompt: '',
      negativePrompt: DEFAULT_NEGATIVE,
      aspectRatio: 'portrait',
      quality: 'balanced',
      numImages: 1,
      seed: -1,
      model: 'peppermint',
      lora: 'none',
      messageId: null,
      chatId: null,
      state: 'idle', // idle, configuring, generating
    });
  }
  return userSessions.get(userId);
}

/**
 * Build the main generation UI message
 */
function buildMainUI(session) {
  const ar = ASPECT_RATIOS[session.aspectRatio];
  const q = QUALITY_PRESETS[session.quality];
  
  const promptDisplay = session.prompt.length > 100 
    ? session.prompt.substring(0, 100) + '...' 
    : session.prompt;
  
  return `🎨 *Image Generation*

📝 *Prompt:* ${promptDisplay || '_Not set_'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📐 *Size:* ${ar.width}x${ar.height} (${session.aspectRatio})
🎯 *Quality:* ${q.label} (${q.steps} steps)
🔢 *Images:* ${session.numImages}
⚡ *CFG:* ${q.cfg}
🌱 *Seed:* ${session.seed === -1 ? 'Random' : session.seed}
🤖 *Model:* ${MODELS[session.model]?.label || session.model}
✨ *LoRA:* ${LORAS[session.lora]?.label || 'None'}`;
}

/**
 * Build main UI keyboard
 */
function buildMainKeyboard(session) {
  const canGenerate = session.prompt && session.prompt.length > 0;
  
  return {
    inline_keyboard: [
      canGenerate ? [{ text: '🎲 Generate', callback_data: 'img_generate' }] : [],
      [
        { text: '📐 Size', callback_data: 'img_size' },
        { text: '🎯 Quality', callback_data: 'img_quality' },
        { text: '🔢 Count', callback_data: 'img_count' },
      ],
      [
        { text: '🌱 Seed', callback_data: 'img_seed' },
        { text: '🚫 Negative', callback_data: 'img_negative' },
      ],
      [
        { text: '🤖 Model', callback_data: 'img_model' },
        { text: '✨ LoRA', callback_data: 'img_lora' },
      ],
      [{ text: '❌ Cancel', callback_data: 'img_cancel' }]
    ].filter(row => row.length > 0)
  };
}

/**
 * Build size selection keyboard
 */
function buildSizeKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '🔲 Square', callback_data: 'img_size_square' },
        { text: '📱 Portrait', callback_data: 'img_size_portrait' },
      ],
      [
        { text: '🖼️ Landscape', callback_data: 'img_size_landscape' },
        { text: '📲 Phone', callback_data: 'img_size_phone' },
      ],
      [
        { text: '🎬 Wide', callback_data: 'img_size_wide' },
        { text: '🎥 Ultrawide', callback_data: 'img_size_ultrawide' },
      ],
      [{ text: '🔙 Back', callback_data: 'img_back' }]
    ]
  };
}

/**
 * Build quality selection keyboard
 */
function buildQualityKeyboard() {
  return {
    inline_keyboard: [
      [{ text: '⚡ Fast (20 steps)', callback_data: 'img_quality_fast' }],
      [{ text: '⚖️ Balanced (30 steps)', callback_data: 'img_quality_balanced' }],
      [{ text: '✨ Quality (40 steps)', callback_data: 'img_quality_quality' }],
      [{ text: '💎 Ultra (50 steps)', callback_data: 'img_quality_ultra' }],
      [{ text: '🔙 Back', callback_data: 'img_back' }]
    ]
  };
}

/**
 * Build model selection keyboard
 */
function buildModelKeyboard() {
  return {
    inline_keyboard: [
      [{ text: '🍬 Peppermint (Anime)', callback_data: 'img_model_peppermint' }],
      [{ text: '🎨 WAI Illustrious (Anime)', callback_data: 'img_model_wai-illustrious' }],
      [{ text: '🔥 NTR MIX (Anime)', callback_data: 'img_model_ntr-mix' }],
      [{ text: '🔙 Back', callback_data: 'img_back' }]
    ]
  };
}

/**
 * Build LoRA selection keyboard
 */
function buildLoraKeyboard() {
  return {
    inline_keyboard: [
      [{ text: '❌ No LoRA', callback_data: 'img_lora_none' }],
      [{ text: '✨ Shiny Nai Style', callback_data: 'img_lora_shiny-nai' }],
      [{ text: '🔙 Back', callback_data: 'img_back' }]
    ]
  };
}

/**
 * Build count selection keyboard
 */
function buildCountKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '1️⃣', callback_data: 'img_count_1' },
        { text: '2️⃣', callback_data: 'img_count_2' },
        { text: '3️⃣', callback_data: 'img_count_3' },
        { text: '4️⃣', callback_data: 'img_count_4' },
      ],
      [{ text: '🔙 Back', callback_data: 'img_back' }]
    ]
  };
}

/**
 * Start image generation flow
 * @param {Object} bot - grammY bot.api object
 * @param {Object} msg - Message object
 * @param {string} prompt - User's prompt
 */
async function startImageGeneration(bot, msg, prompt) {
  const userId = msg.from.id;
  const chatId = msg.chat.id;
  const session = getSession(userId);
  
  session.prompt = prompt;
  session.chatId = chatId;
  session.state = 'configuring';
  
  const text = buildMainUI(session);
  const keyboard = buildMainKeyboard(session);
  
  // grammY: bot.sendMessage(chatId, text, options)
  const sentMsg = await bot.sendMessage(chatId, text, {
    parse_mode: 'Markdown',
    reply_markup: keyboard
  });
  
  session.messageId = sentMsg.message_id;
}

/**
 * Handle callback queries for image generation
 * @param {Object} bot - grammY bot.api object
 * @param {Object} query - Callback query object
 */
async function handleImageCallback(bot, query) {
  const userId = query.from.id;
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  const data = query.data;
  const session = getSession(userId);
  
  // Ensure this is the right message (but allow retry/new from photo messages)
  const isRetryOrNew = data === 'img_retry' || data === 'img_new';
  if (session.messageId !== messageId && !isRetryOrNew) {
    await bot.answerCallbackQuery(query.id, { text: 'Session expired. Start a new /imagine command.' });
    return;
  }
  
  try {
    if (data === 'img_back') {
      const text = buildMainUI(session);
      const keyboard = buildMainKeyboard(session);
      // grammY: bot.editMessageText(chatId, messageId, text, options)
      await bot.editMessageText(chatId, messageId, text, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
      await bot.answerCallbackQuery(query.id);
    }
    else if (data === 'img_size') {
      const text = `🎨 *Select Aspect Ratio*\n\nCurrent: ${ASPECT_RATIOS[session.aspectRatio].label}`;
      await bot.editMessageText(chatId, messageId, text, {
        parse_mode: 'Markdown',
        reply_markup: buildSizeKeyboard()
      });
      await bot.answerCallbackQuery(query.id);
    }
    else if (data.startsWith('img_size_')) {
      const size = data.replace('img_size_', '');
      if (ASPECT_RATIOS[size]) {
        session.aspectRatio = size;
        await bot.answerCallbackQuery(query.id, { text: `Size set to ${ASPECT_RATIOS[size].label}` });
      }
      const text = buildMainUI(session);
      const keyboard = buildMainKeyboard(session);
      await bot.editMessageText(chatId, messageId, text, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
    }
    else if (data === 'img_quality') {
      const text = `🎯 *Select Quality Preset*\n\nCurrent: ${QUALITY_PRESETS[session.quality].label}\n\nHigher quality = longer generation time`;
      await bot.editMessageText(chatId, messageId, text, {
        parse_mode: 'Markdown',
        reply_markup: buildQualityKeyboard()
      });
      await bot.answerCallbackQuery(query.id);
    }
    else if (data.startsWith('img_quality_')) {
      const quality = data.replace('img_quality_', '');
      if (QUALITY_PRESETS[quality]) {
        session.quality = quality;
        await bot.answerCallbackQuery(query.id, { text: `Quality set to ${QUALITY_PRESETS[quality].label}` });
      }
      const text = buildMainUI(session);
      const keyboard = buildMainKeyboard(session);
      await bot.editMessageText(chatId, messageId, text, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
    }
    else if (data === 'img_count') {
      const text = `🔢 *Number of Images*\n\nCurrent: ${session.numImages}\n\nMore images = longer generation time`;
      await bot.editMessageText(chatId, messageId, text, {
        parse_mode: 'Markdown',
        reply_markup: buildCountKeyboard()
      });
      await bot.answerCallbackQuery(query.id);
    }
    else if (data.startsWith('img_count_')) {
      const count = parseInt(data.replace('img_count_', ''));
      if (count >= 1 && count <= 4) {
        session.numImages = count;
        await bot.answerCallbackQuery(query.id, { text: `Will generate ${count} image(s)` });
      }
      const text = buildMainUI(session);
      const keyboard = buildMainKeyboard(session);
      await bot.editMessageText(chatId, messageId, text, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
    }
    else if (data === 'img_seed') {
      session.seed = session.seed === -1 ? Math.floor(Math.random() * 2147483647) : -1;
      await bot.answerCallbackQuery(query.id, { 
        text: session.seed === -1 ? 'Seed: Random' : `Seed: ${session.seed}` 
      });
      const text = buildMainUI(session);
      const keyboard = buildMainKeyboard(session);
      await bot.editMessageText(chatId, messageId, text, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
    }
    else if (data === 'img_negative') {
      await bot.answerCallbackQuery(query.id, { 
        text: 'Negative prompt is set to default quality tags',
        show_alert: true
      });
    }
    else if (data === 'img_model') {
      const text = `🤖 *Select Model*\n\nCurrent: ${MODELS[session.model]?.label || session.model}\n\n_Different models produce different styles!_`;
      await bot.editMessageText(chatId, messageId, text, {
        parse_mode: 'Markdown',
        reply_markup: buildModelKeyboard()
      });
      await bot.answerCallbackQuery(query.id);
    }
    else if (data.startsWith('img_model_')) {
      const model = data.replace('img_model_', '');
      if (MODELS[model]) {
        session.model = model;
        await bot.answerCallbackQuery(query.id, { text: `Model: ${MODELS[model].label}` });
      }
      const text = buildMainUI(session);
      const keyboard = buildMainKeyboard(session);
      await bot.editMessageText(chatId, messageId, text, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
    }
    else if (data === 'img_lora') {
      const text = `✨ *Select LoRA*\n\nCurrent: ${LORAS[session.lora]?.label || 'None'}\n\n_LoRAs add extra style on top of the model!_`;
      await bot.editMessageText(chatId, messageId, text, {
        parse_mode: 'Markdown',
        reply_markup: buildLoraKeyboard()
      });
      await bot.answerCallbackQuery(query.id);
    }
    else if (data.startsWith('img_lora_')) {
      const lora = data.replace('img_lora_', '');
      if (LORAS[lora]) {
        session.lora = lora;
        await bot.answerCallbackQuery(query.id, { text: `LoRA: ${LORAS[lora].label}` });
      }
      const text = buildMainUI(session);
      const keyboard = buildMainKeyboard(session);
      await bot.editMessageText(chatId, messageId, text, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
    }
    else if (data === 'img_cancel') {
      userSessions.delete(userId);
      await bot.editMessageText(chatId, messageId, '❌ Image generation cancelled.');
      await bot.answerCallbackQuery(query.id);
    }
    else if (data === 'img_generate') {
      await generateImage(bot, query, session);
    }
    else if (data === 'img_retry') {
      session.seed = -1;
      // For retry from photo message, send a new status message
      const statusMsg = await bot.sendMessage(chatId, '🔄 *Retrying generation...*', { parse_mode: 'Markdown' });
      session.messageId = statusMsg.message_id;
      session.isPhotoMessage = false;
      await generateImage(bot, query, session);
    }
    else if (data === 'img_new') {
      userSessions.delete(userId);
      await bot.editMessageText(chatId, messageId, '🎨 Send a new /imagine command with your prompt!');
      await bot.answerCallbackQuery(query.id);
    }
    else {
      await bot.answerCallbackQuery(query.id);
    }
  } catch (error) {
    console.error('[ImageGen] Callback error:', error);
    try {
      await bot.answerCallbackQuery(query.id, { text: 'Error processing request' });
    } catch (e) {}
  }
}

/**
 * Generate image using HF Space API
 */
async function generateImage(bot, query, session) {
  const chatId = session.chatId;
  const messageId = session.messageId;
  
  if (!HF_IMAGEGEN_API) {
    await bot.editMessageText(chatId, messageId, '❌ Image generation is not configured. Please set HF_IMAGEGEN_API.');
    return;
  }
  
  session.state = 'generating';
  const q = QUALITY_PRESETS[session.quality];
  const ar = ASPECT_RATIOS[session.aspectRatio];
  
  // Check if Space is awake first
  let spaceReady = false;
  try {
    const healthCheck = await fetch(`${HF_IMAGEGEN_API}/health`, { 
      signal: AbortSignal.timeout(5000) 
    });
    const healthData = await healthCheck.json();
    spaceReady = healthData.model_loaded === true;
  } catch (e) {
    spaceReady = false;
  }
  
  // Show appropriate status message
  let statusText;
  if (!spaceReady) {
    statusText = `🎨 *Initializing AI...*

📝 ${session.prompt.substring(0, 50)}${session.prompt.length > 50 ? '...' : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔄 *Loading model into GPU memory*
📦 Downloading ~7GB model files...

⏱️ _First request takes 2-4 minutes_
⚡ _After loading: ~8-15 seconds per image_`;
  } else {
    statusText = `🎨 *Creating your image...*

📝 ${session.prompt.substring(0, 50)}${session.prompt.length > 50 ? '...' : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🖼️ *Rendering:* ${ar.width}×${ar.height}
⚙️ *Quality:* ${q.steps} steps | CFG ${q.cfg}
🤖 *Model:* ${MODELS[session.model]?.label || session.model}

⏱️ _Estimated: 8-15 seconds_`;
  }

  await bot.editMessageText(chatId, messageId, statusText, { parse_mode: 'Markdown' });
  await bot.answerCallbackQuery(query.id, { text: spaceReady ? 'Creating image (~10s)...' : 'Loading model (~3 min)...' });
  
  try {
    // Use longer timeout if Space was sleeping
    const controller = new AbortController();
    const timeoutMs = spaceReady ? 120000 : 300000; // 2 min if ready, 5 min if waking
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    // Batch generation - single request with multiple images (more efficient)
    const response = await fetch(`${HF_IMAGEGEN_API}/generate`, {
      signal: controller.signal,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: session.prompt,
        negative_prompt: session.negativePrompt,
        steps: q.steps,
        cfg_scale: q.cfg,
        width: ar.width,
        height: ar.height,
        seed: session.seed,
        num_images: session.numImages,
        model: session.model,
        lora: session.lora === 'none' ? null : session.lora,
      }),
    });
    
    clearTimeout(timeoutId);
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Generation failed');
    }
    
    // Handle both old API (image/seed) and new API (images/seeds) formats
    const images = result.images || (result.image ? [result.image] : []);
    const seeds = result.seeds || (result.seed ? [result.seed] : []);
    const genTime = result.generation_time?.toFixed(1) || '?';
    
    if (images.length === 0) {
      throw new Error('No images generated');
    }
    
    // Send generated images
    for (let i = 0; i < images.length; i++) {
      const imgBuffer = Buffer.from(images[i], 'base64');
      const seed = seeds[i] || 'unknown';
      
      const caption = `✨ *Generated Image${images.length > 1 ? ` ${i+1}/${images.length}` : ''}*

📝 ${session.prompt.substring(0, 100)}${session.prompt.length > 100 ? '...' : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📐 ${ar.width}×${ar.height} | 🎯 ${q.steps} steps
🤖 ${MODELS[session.model]?.label || session.model}
🌱 Seed: \`${seed}\`
⏱️ ${genTime}s

_Generated via StarzAI_`;
      
      // grammY: sendPhoto with InputFile
      const { InputFile } = await import('grammy');
      const sentPhoto = await bot.sendPhoto(chatId, new InputFile(imgBuffer, 'generated.png'), {
        caption: caption,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🔄 Retry', callback_data: 'img_retry' },
              { text: '🆕 New', callback_data: 'img_new' },
            ]
          ]
        }
      });
      
      // Update session messageId to the last sent photo for Retry to work
      session.messageId = sentPhoto.message_id;
    }
    
    // Delete the generating message
    try {
      await bot.deleteMessage(chatId, messageId);
    } catch (e) {}
    
    session.state = 'idle';
    
  } catch (error) {
    console.error('[ImageGen] Generation error:', error);
    
    const errorText = `❌ *Generation Failed*

Error: ${error.message}

Please try again or adjust your settings.`;

    await bot.editMessageText(chatId, messageId, errorText, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🔄 Retry', callback_data: 'img_retry' },
            { text: '⚙️ Settings', callback_data: 'img_back' },
          ],
          [{ text: '❌ Cancel', callback_data: 'img_cancel' }]
        ]
      }
    });
    
    session.state = 'configuring';
  }
}

/**
 * Quick generate without UI (for power users)
 */
async function quickGenerate(bot, msg, prompt, options = {}) {
  const chatId = msg.chat.id;
  
  if (!HF_IMAGEGEN_API) {
    await bot.sendMessage(chatId, '❌ Image generation is not configured.');
    return;
  }
  
  const statusMsg = await bot.sendMessage(chatId, '🎨 Generating image...', {
    reply_to_message_id: msg.message_id
  });
  
  try {
    const response = await fetch(`${HF_IMAGEGEN_API}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: prompt,
        negative_prompt: options.negative || DEFAULT_NEGATIVE,
        steps: options.steps || 30,
        cfg_scale: options.cfg || 7.0,
        width: options.width || 768,
        height: options.height || 1152,
        seed: options.seed || -1,
        num_images: 1,
      }),
    });
    
    const result = await response.json();
    
    if (!result.success || !result.images || result.images.length === 0) {
      throw new Error(result.error || 'Generation failed');
    }
    
    const imgBuffer = Buffer.from(result.images[0], 'base64');
    const { InputFile } = await import('grammy');
    
    await bot.sendPhoto(chatId, new InputFile(imgBuffer, 'generated.png'), {
      caption: `🎨 ${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}\n🌱 Seed: ${result.seeds[0]}`,
      reply_to_message_id: msg.message_id
    });
    
    await bot.deleteMessage(chatId, statusMsg.message_id);
    
  } catch (error) {
    await bot.editMessageText(chatId, statusMsg.message_id, `❌ Generation failed: ${error.message}`);
  }
}

/**
 * Check if HF Space is available
 */
async function checkHealth() {
  if (!HF_IMAGEGEN_API) return { available: false, error: 'Not configured' };
  
  try {
    const response = await fetch(`${HF_IMAGEGEN_API}/health`);
    const data = await response.json();
    return { available: data.model_loaded, ...data };
  } catch (error) {
    return { available: false, error: error.message };
  }
}

export {
  startImageGeneration,
  handleImageCallback,
  quickGenerate,
  checkHealth,
  getSession,
  ASPECT_RATIOS,
  QUALITY_PRESETS,
};
