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
🌱 *Seed:* ${session.seed === -1 ? 'Random' : session.seed}`;
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
  
  // Ensure this is the right message
  if (session.messageId !== messageId) {
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
    statusText = `🎨 *Waking up AI...*

📝 ${session.prompt.substring(0, 50)}...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

😴 *The AI is sleeping to save costs*
⏳ Waking up and loading model...

_This may take 2-3 minutes on first use._
_Subsequent requests will be much faster!_`;
  } else {
    statusText = `🎨 *Generating...*

📝 ${session.prompt.substring(0, 50)}...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⏳ *Progress:* Starting...
⚙️ *Settings:* ${q.steps} steps | ${ar.width}x${ar.height}

_This may take 10-30 seconds..._`;
  }

  await bot.editMessageText(chatId, messageId, statusText, { parse_mode: 'Markdown' });
  await bot.answerCallbackQuery(query.id, { text: spaceReady ? 'Generating image...' : 'Waking up AI... please wait 2-3 min' });
  
  try {
    // Use longer timeout if Space was sleeping
    const controller = new AbortController();
    const timeoutMs = spaceReady ? 120000 : 300000; // 2 min if ready, 5 min if waking
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
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
      }),
    });
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Generation failed');
    }
    
    // Handle both old API (image/seed) and new API (images/seeds) formats
    const images = result.images || (result.image ? [result.image] : []);
    const seeds = result.seeds || (result.seed ? [result.seed] : []);
    
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
📐 ${ar.width}x${ar.height} | 🎯 ${q.steps} steps | ⚡ CFG ${q.cfg}
🌱 Seed: \`${seed}\`
⏱️ ${result.generation_time?.toFixed(1) || '?'}s

_Generated via StarzAI_`;
      
      // grammY: sendPhoto with InputFile
      const { InputFile } = await import('grammy');
      await bot.sendPhoto(chatId, new InputFile(imgBuffer, 'generated.png'), {
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
