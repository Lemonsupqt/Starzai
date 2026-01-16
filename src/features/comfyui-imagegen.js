/**
 * ComfyUI Image Generation Integration (Hivenet)
 * Interactive UI with edit-in-place design
 * Supports Hassaku XL and Dark Beast Z models
 * Special 4K mode for Dark Beast Z
 * Uses grammY bot API syntax
 */

import fetch from 'node-fetch';

// ComfyUI API URL (Hivenet instance)
const COMFYUI_API = process.env.COMFYUI_API || 'https://7d658bf1-c72d-4b24-b4b4-c88dc7289f98-8888.tenants.hivecompute.ai';

// Aspect ratio presets - Standard
const ASPECT_RATIOS = {
  square: { width: 1024, height: 1024, label: '🔲 Square 1:1' },
  portrait: { width: 832, height: 1216, label: '📱 Portrait 2:3' },
  landscape: { width: 1216, height: 832, label: '🖼️ Landscape 3:2' },
  phone: { width: 576, height: 1024, label: '📲 Phone 9:16' },
  wide: { width: 1344, height: 768, label: '🎬 Wide 16:9' },
  ultrawide: { width: 1536, height: 640, label: '🎥 Ultrawide 21:9' },
};

// 4K Aspect ratio presets - For Dark Beast Z
const ASPECT_RATIOS_4K = {
  '4k_square': { width: 2048, height: 2048, label: '🔲 4K Square' },
  '4k_portrait': { width: 1536, height: 2560, label: '📱 4K Portrait' },
  '4k_landscape': { width: 2560, height: 1536, label: '🖼️ 4K Landscape' },
  '4k_uhd': { width: 3840, height: 2160, label: '📺 4K UHD 16:9' },
  '4k_uhd_portrait': { width: 2160, height: 3840, label: '📲 4K UHD Portrait' },
  '4k_cinema': { width: 4096, height: 1716, label: '🎬 4K Cinema 2.39:1' },
};

// Available models on Hivenet ComfyUI
const MODELS = {
  'hassaku': { 
    id: 'hassaku.xl.safetensors', 
    label: '🌸 Hassaku XL', 
    style: 'anime',
    description: 'Illustrious anime style, vibrant colors',
    supports4K: false,
    defaultSteps: 28,
    defaultCfg: 7.0,
  },
  'darkbeast': { 
    id: 'dark_beast_z.safetensors', 
    label: '🐉 Dark Beast Z', 
    style: 'realistic',
    description: '4K photorealistic (ZImageTurbo)',
    supports4K: true,
    isZIT: true, // ZImageTurbo - uses CFG 1 and fewer steps
    defaultSteps: 10,
    defaultCfg: 1.0,
    recommendedSampler: 'euler',
    recommendedScheduler: 'sgm_uniform',
  },
};

// Quality presets - Optimized for RTX 4090 (faster steps, same quality)
const QUALITY_PRESETS = {
  turbo: { steps: 8, cfg: 2.0, label: '🚀 Turbo', description: '~3s, LCM/Lightning' },
  fast: { steps: 15, cfg: 5.0, label: '⚡ Fast', description: '~6s, quick preview' },
  balanced: { steps: 20, cfg: 6.5, label: '⚖️ Balanced', description: '~10s, good quality' },
  quality: { steps: 28, cfg: 7.0, label: '✨ Quality', description: '~15s, high detail' },
  ultra: { steps: 35, cfg: 7.5, label: '💎 Ultra', description: '~20s, maximum quality' },
};

// Quality presets - 4K Mode (Dark Beast Z) - Optimized for RTX 4090
const QUALITY_PRESETS_4K = {
  '4k_fast': { steps: 20, cfg: 5.0, label: '⚡ 4K Fast', description: '~20s, quick 4K' },
  '4k_balanced': { steps: 28, cfg: 5.5, label: '⚖️ 4K Balanced', description: '~30s, good 4K' },
  '4k_quality': { steps: 35, cfg: 6.0, label: '✨ 4K Quality', description: '~45s, detailed 4K' },
  '4k_ultra': { steps: 45, cfg: 6.5, label: '💎 4K Ultra', description: '~60s, premium 4K' },
  '4k_extreme': { steps: 60, cfg: 7.0, label: '🔥 4K Extreme', description: '~90s, extreme 4K' },
};

// Samplers available in ComfyUI - Optimized for RTX 4090
const SAMPLERS = {
  // FAST - Best for quick generations
  euler: { id: 'euler', label: '⚡ Euler', description: 'Fastest, consistent', speed: 'fast' },
  euler_a: { id: 'euler_ancestral', label: '🎲 Euler A', description: 'Fast, creative', speed: 'fast' },
  lcm: { id: 'lcm', label: '🚀 LCM', description: 'Ultra fast (4-8 steps)', speed: 'ultra' },
  
  // BALANCED - Good speed/quality
  dpmpp_2m: { id: 'dpmpp_2m', label: '⚖️ DPM++ 2M', description: 'Balanced, reliable', speed: 'balanced' },
  dpmpp_2s_a: { id: 'dpmpp_2s_ancestral', label: '🎯 DPM++ 2S A', description: 'Balanced, varied', speed: 'balanced' },
  heun: { id: 'heun', label: '📊 Heun', description: 'Balanced, smooth', speed: 'balanced' },
  
  // QUALITY - Best detail
  dpmpp_sde: { id: 'dpmpp_sde', label: '🎨 DPM++ SDE', description: 'Artistic, detailed', speed: 'quality' },
  dpmpp_2m_sde: { id: 'dpmpp_2m_sde', label: '💫 DPM++ 2M SDE', description: 'Best quality', speed: 'quality' },
  dpmpp_3m_sde: { id: 'dpmpp_3m_sde', label: '✨ DPM++ 3M SDE', description: 'Premium quality', speed: 'quality' },
  
  // SPECIAL
  ddim: { id: 'ddim', label: '🔧 DDIM', description: 'Classic, deterministic', speed: 'balanced' },
  uni_pc: { id: 'uni_pc', label: '🎪 UniPC', description: 'Fast convergence', speed: 'fast' },
  uni_pc_bh2: { id: 'uni_pc_bh2', label: '🎭 UniPC BH2', description: 'Smoother UniPC', speed: 'fast' },
};

// Schedulers
const SCHEDULERS = {
  normal: { id: 'normal', label: '📊 Normal' },
  karras: { id: 'karras', label: '🌊 Karras', description: 'Smoother results' },
  exponential: { id: 'exponential', label: '📈 Exponential' },
  sgm_uniform: { id: 'sgm_uniform', label: '🎯 SGM Uniform', description: 'Best for SDXL' },
};

// Default negative prompts
const DEFAULT_NEGATIVE = 'lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry, artist name';

const DEFAULT_NEGATIVE_4K = 'lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry, artist name, pixelated, compression artifacts, noise, grain, low resolution, upscaled, interpolated';

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
      model: 'hassaku',
      sampler: 'euler_a',
      scheduler: 'karras',
      messageId: null,
      chatId: null,
      state: 'idle', // idle, configuring, generating
      mode4K: false, // 4K mode toggle
      hiresfix: false, // Hires fix for upscaling
    });
  }
  return userSessions.get(userId);
}

/**
 * Build the main generation UI message
 */
function buildMainUI(session) {
  const model = MODELS[session.model];
  const is4K = session.mode4K && model?.supports4K;
  
  const aspectRatios = is4K ? ASPECT_RATIOS_4K : ASPECT_RATIOS;
  const qualityPresets = is4K ? QUALITY_PRESETS_4K : QUALITY_PRESETS;
  
  const ar = aspectRatios[session.aspectRatio] || ASPECT_RATIOS.portrait;
  const q = qualityPresets[session.quality] || QUALITY_PRESETS.balanced;
  const sampler = SAMPLERS[session.sampler] || SAMPLERS.euler_a;
  
  const promptDisplay = session.prompt.length > 100 
    ? session.prompt.substring(0, 100) + '...' 
    : session.prompt;
  
  let modeIndicator = '';
  if (is4K) {
    modeIndicator = '\n🔥 *4K MODE ACTIVE* - Ultra high resolution!\n';
  }
  
  return `🎨 *Hivenet Image Generation*
${modeIndicator}
📝 *Prompt:* ${promptDisplay || '_Not set_'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🤖 *Model:* ${model?.label || session.model}
📐 *Size:* ${ar.width}×${ar.height}
🎯 *Quality:* ${q.label} (${q.steps} steps)
⚡ *CFG:* ${q.cfg}
🎲 *Sampler:* ${sampler.label}
🔢 *Images:* ${session.numImages}
🌱 *Seed:* ${session.seed === -1 ? 'Random' : session.seed}

_Powered by ComfyUI on Hivenet RTX 4090_`;
}

/**
 * Build main UI keyboard
 */
function buildMainKeyboard(session) {
  const canGenerate = session.prompt && session.prompt.length > 0;
  const model = MODELS[session.model];
  const is4K = session.mode4K && model?.supports4K;
  
  const buttons = [
    canGenerate ? [{ text: '🎲 Generate', callback_data: 'hi_generate' }] : [],
    [
      { text: '🤖 Model', callback_data: 'hi_model' },
      { text: '📐 Size', callback_data: 'hi_size' },
    ],
    [
      { text: '🎯 Quality', callback_data: 'hi_quality' },
      { text: '🎲 Sampler', callback_data: 'hi_sampler' },
    ],
    [
      { text: '🔢 Count', callback_data: 'hi_count' },
      { text: '🌱 Seed', callback_data: 'hi_seed' },
    ],
    [
      { text: '🚫 Negative', callback_data: 'hi_negative' },
    ],
  ];
  
  // Add 4K toggle for Dark Beast Z
  if (model?.supports4K) {
    const toggle4K = is4K 
      ? { text: '🔥 4K Mode: ON', callback_data: 'hi_4k_toggle' }
      : { text: '📺 4K Mode: OFF', callback_data: 'hi_4k_toggle' };
    buttons.push([toggle4K]);
  }
  
  buttons.push([{ text: '❌ Cancel', callback_data: 'hi_cancel' }]);
  
  return {
    inline_keyboard: buttons.filter(row => row.length > 0)
  };
}

/**
 * Build model selection keyboard
 */
function buildModelKeyboard() {
  const modelButtons = Object.entries(MODELS).map(([key, model]) => {
    const badge = model.supports4K ? ' [4K]' : '';
    return [{ text: `${model.label}${badge}`, callback_data: `hi_model_${key}` }];
  });
  return {
    inline_keyboard: [
      ...modelButtons,
      [{ text: '🔙 Back', callback_data: 'hi_back' }]
    ]
  };
}

/**
 * Build size selection keyboard
 */
function buildSizeKeyboard(session) {
  const model = MODELS[session.model];
  const is4K = session.mode4K && model?.supports4K;
  const aspectRatios = is4K ? ASPECT_RATIOS_4K : ASPECT_RATIOS;
  
  const sizeButtons = Object.entries(aspectRatios).map(([key, ar]) => {
    return [{ text: `${ar.label} (${ar.width}×${ar.height})`, callback_data: `hi_size_${key}` }];
  });
  
  return {
    inline_keyboard: [
      ...sizeButtons,
      [{ text: '🔙 Back', callback_data: 'hi_back' }]
    ]
  };
}

/**
 * Build quality selection keyboard
 */
function buildQualityKeyboard(session) {
  const model = MODELS[session.model];
  const is4K = session.mode4K && model?.supports4K;
  const qualityPresets = is4K ? QUALITY_PRESETS_4K : QUALITY_PRESETS;
  
  const qualityButtons = Object.entries(qualityPresets).map(([key, q]) => {
    return [{ text: `${q.label} - ${q.description}`, callback_data: `hi_quality_${key}` }];
  });
  
  return {
    inline_keyboard: [
      ...qualityButtons,
      [{ text: '🔙 Back', callback_data: 'hi_back' }]
    ]
  };
}

/**
 * Build sampler selection keyboard - Grouped by speed
 */
function buildSamplerKeyboard() {
  // Group samplers by speed category
  const fastSamplers = Object.entries(SAMPLERS).filter(([k, s]) => s.speed === 'fast' || s.speed === 'ultra');
  const balancedSamplers = Object.entries(SAMPLERS).filter(([k, s]) => s.speed === 'balanced');
  const qualitySamplers = Object.entries(SAMPLERS).filter(([k, s]) => s.speed === 'quality');
  
  const keyboard = [
    [{ text: '⚡ FAST SAMPLERS ⚡', callback_data: 'hi_noop' }],
    ...fastSamplers.map(([key, s]) => [{ text: `${s.label}`, callback_data: `hi_sampler_${key}` }]),
    [{ text: '⚖️ BALANCED ⚖️', callback_data: 'hi_noop' }],
    ...balancedSamplers.map(([key, s]) => [{ text: `${s.label}`, callback_data: `hi_sampler_${key}` }]),
    [{ text: '✨ QUALITY ✨', callback_data: 'hi_noop' }],
    ...qualitySamplers.map(([key, s]) => [{ text: `${s.label}`, callback_data: `hi_sampler_${key}` }]),
    [{ text: '🔙 Back', callback_data: 'hi_back' }]
  ];
  
  return { inline_keyboard: keyboard };
}

/**
 * Build count selection keyboard
 */
function buildCountKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '1️⃣', callback_data: 'hi_count_1' },
        { text: '2️⃣', callback_data: 'hi_count_2' },
        { text: '3️⃣', callback_data: 'hi_count_3' },
        { text: '4️⃣', callback_data: 'hi_count_4' },
      ],
      [{ text: '🔙 Back', callback_data: 'hi_back' }]
    ]
  };
}

/**
 * Build ComfyUI workflow JSON for image generation
 */
function buildComfyWorkflow(session) {
  const model = MODELS[session.model];
  const is4K = session.mode4K && model?.supports4K;
  const isZIT = model?.isZIT; // ZImageTurbo models need separate CLIP (Qwen) and VAE
  
  const aspectRatios = is4K ? ASPECT_RATIOS_4K : ASPECT_RATIOS;
  const qualityPresets = is4K ? QUALITY_PRESETS_4K : QUALITY_PRESETS;
  
  const ar = aspectRatios[session.aspectRatio] || ASPECT_RATIOS.portrait;
  const q = qualityPresets[session.quality] || QUALITY_PRESETS.balanced;
  const sampler = SAMPLERS[session.sampler] || SAMPLERS.euler_a;
  
  const seed = session.seed === -1 ? Math.floor(Math.random() * 2147483647) : session.seed;
  const negativePrompt = is4K ? DEFAULT_NEGATIVE_4K : session.negativePrompt;
  
  // Choose scheduler based on model and sampler for optimal speed
  let scheduler = session.scheduler || 'karras';
  if (sampler.id === 'lcm') scheduler = 'sgm_uniform'; // LCM works best with sgm_uniform
  if (model?.isZIT) scheduler = model.recommendedScheduler || 'sgm_uniform'; // ZImageTurbo prefers sgm_uniform
  
  // Override CFG for ZImageTurbo models (they need CFG ~1)
  let cfg = q.cfg;
  let steps = q.steps;
  if (model?.isZIT) {
    cfg = model.defaultCfg || 1.0; // ZIT models need CFG 1
    steps = Math.min(steps, 15); // ZIT models work best with fewer steps
  }
  
  let workflow;
  
  if (isZIT) {
    // ZImageTurbo workflow (Dark Beast Z) - uses Qwen CLIP and separate VAE
    workflow = {
      "1": {
        "inputs": {
          "clip_name": "model-00001-of-00003.safetensors",
          "type": "qwen_image"
        },
        "class_type": "CLIPLoader"
      },
      "2": {
        "inputs": {
          "text": session.prompt,
          "clip": ["1", 0]
        },
        "class_type": "CLIPTextEncode"
      },
      "3": {
        "inputs": {
          "ckpt_name": model.id
        },
        "class_type": "CheckpointLoaderSimple"
      },
      "4": {
        "inputs": {
          "seed": seed,
          "steps": steps,
          "cfg": cfg,
          "sampler_name": sampler.id,
          "scheduler": scheduler,
          "denoise": 1,
          "model": ["3", 0],
          "positive": ["2", 0],
          "negative": ["5", 0],
          "latent_image": ["6", 0]
        },
        "class_type": "KSampler"
      },
      "5": {
        "inputs": {
          "text": negativePrompt,
          "clip": ["1", 0]
        },
        "class_type": "CLIPTextEncode"
      },
      "6": {
        "inputs": {
          "width": ar.width,
          "height": ar.height,
          "batch_size": session.numImages
        },
        "class_type": "EmptyLatentImage"
      },
      "7": {
        "inputs": {
          "samples": ["4", 0],
          "vae": ["9", 0]
        },
        "class_type": "VAEDecode"
      },
      "8": {
        "inputs": {
          "filename_prefix": "StarzAI_DBZ",
          "images": ["7", 0]
        },
        "class_type": "SaveImage"
      },
      "9": {
        "inputs": {
          "vae_name": "ae.safetensors"
        },
        "class_type": "VAELoader"
      }
    };
  } else {
    // Standard workflow for models with embedded CLIP (Hassaku XL, Dark Beast Z)
    workflow = {
      "3": {
        "inputs": {
          "seed": seed,
          "steps": steps,
          "cfg": cfg,
          "sampler_name": sampler.id,
          "scheduler": scheduler,
          "denoise": 1,
          "model": ["4", 0],
          "positive": ["6", 0],
          "negative": ["7", 0],
          "latent_image": ["5", 0]
        },
        "class_type": "KSampler"
      },
      "4": {
        "inputs": {
          "ckpt_name": model.id
        },
        "class_type": "CheckpointLoaderSimple"
      },
      "5": {
        "inputs": {
          "width": ar.width,
          "height": ar.height,
          "batch_size": session.numImages
        },
        "class_type": "EmptyLatentImage"
      },
      "6": {
        "inputs": {
          "text": session.prompt,
          "clip": ["4", 1]
        },
        "class_type": "CLIPTextEncode"
      },
      "7": {
        "inputs": {
          "text": negativePrompt,
          "clip": ["4", 1]
        },
        "class_type": "CLIPTextEncode"
      },
      "8": {
        "inputs": {
          "samples": ["3", 0],
          "vae": ["4", 2]
        },
        "class_type": "VAEDecode"
      },
      "9": {
        "inputs": {
          "filename_prefix": "StarzAI",
          "images": ["8", 0]
        },
        "class_type": "SaveImage"
      }
    };
  }
  
  return { workflow, seed };
}

/**
 * Start image generation flow
 * @param {Object} bot - grammY bot.api object
 * @param {Object} msg - Message object
 * @param {string} prompt - User's prompt
 */
async function startHivenetGeneration(bot, msg, prompt) {
  const userId = msg.from.id;
  const chatId = msg.chat.id;
  const session = getSession(userId);
  
  session.prompt = prompt;
  session.chatId = chatId;
  session.state = 'configuring';
  
  const text = buildMainUI(session);
  const keyboard = buildMainKeyboard(session);
  
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
async function handleHivenetCallback(bot, query) {
  const userId = query.from.id;
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  const data = query.data;
  const session = getSession(userId);
  
  // Ensure this is the right message (but allow retry/new from photo messages)
  const isRetryOrNew = data === 'hi_retry' || data === 'hi_new';
  if (session.messageId !== messageId && !isRetryOrNew) {
    await bot.answerCallbackQuery(query.id, { text: 'Session expired. Start a new /hi command.' });
    return;
  }
  
  try {
    if (data === 'hi_back') {
      const text = buildMainUI(session);
      const keyboard = buildMainKeyboard(session);
      await bot.editMessageText(chatId, messageId, text, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
      await bot.answerCallbackQuery(query.id);
    }
    else if (data === 'hi_model') {
      const text = `🤖 *Select Model*\n\n🌸 *Hassaku XL* - Anime/Illustrious style\n🐉 *Dark Beast Z* - 4K Photorealistic [4K]`;
      await bot.editMessageText(chatId, messageId, text, {
        parse_mode: 'Markdown',
        reply_markup: buildModelKeyboard()
      });
      await bot.answerCallbackQuery(query.id);
    }
    else if (data.startsWith('hi_model_')) {
      const modelKey = data.replace('hi_model_', '');
      if (MODELS[modelKey]) {
        session.model = modelKey;
        // Reset 4K mode if switching to non-4K model
        if (!MODELS[modelKey].supports4K) {
          session.mode4K = false;
          // Reset to standard aspect ratio if was using 4K
          if (session.aspectRatio.startsWith('4k_')) {
            session.aspectRatio = 'portrait';
          }
          if (session.quality.startsWith('4k_')) {
            session.quality = 'balanced';
          }
        }
        await bot.answerCallbackQuery(query.id, { text: `Model: ${MODELS[modelKey].label}` });
      }
      const text = buildMainUI(session);
      const keyboard = buildMainKeyboard(session);
      await bot.editMessageText(chatId, messageId, text, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
    }
    else if (data === 'hi_4k_toggle') {
      const model = MODELS[session.model];
      if (model?.supports4K) {
        session.mode4K = !session.mode4K;
        // Reset aspect ratio and quality when toggling 4K
        if (session.mode4K) {
          session.aspectRatio = '4k_portrait';
          session.quality = '4k_balanced';
          session.negativePrompt = DEFAULT_NEGATIVE_4K;
          await bot.answerCallbackQuery(query.id, { text: '🔥 4K Mode ENABLED!' });
        } else {
          session.aspectRatio = 'portrait';
          session.quality = 'balanced';
          session.negativePrompt = DEFAULT_NEGATIVE;
          await bot.answerCallbackQuery(query.id, { text: '📺 4K Mode disabled' });
        }
      }
      const text = buildMainUI(session);
      const keyboard = buildMainKeyboard(session);
      await bot.editMessageText(chatId, messageId, text, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
    }
    else if (data === 'hi_size') {
      const model = MODELS[session.model];
      const is4K = session.mode4K && model?.supports4K;
      const modeText = is4K ? '4K ' : '';
      const text = `📐 *Select ${modeText}Aspect Ratio*\n\nChoose your preferred image dimensions:`;
      await bot.editMessageText(chatId, messageId, text, {
        parse_mode: 'Markdown',
        reply_markup: buildSizeKeyboard(session)
      });
      await bot.answerCallbackQuery(query.id);
    }
    else if (data.startsWith('hi_size_')) {
      const sizeKey = data.replace('hi_size_', '');
      const model = MODELS[session.model];
      const is4K = session.mode4K && model?.supports4K;
      const aspectRatios = is4K ? ASPECT_RATIOS_4K : ASPECT_RATIOS;
      
      if (aspectRatios[sizeKey]) {
        session.aspectRatio = sizeKey;
        await bot.answerCallbackQuery(query.id, { text: `Size: ${aspectRatios[sizeKey].label}` });
      }
      const text = buildMainUI(session);
      const keyboard = buildMainKeyboard(session);
      await bot.editMessageText(chatId, messageId, text, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
    }
    else if (data === 'hi_quality') {
      const model = MODELS[session.model];
      const is4K = session.mode4K && model?.supports4K;
      const modeText = is4K ? '4K ' : '';
      const text = `🎯 *Select ${modeText}Quality Preset*\n\nHigher quality = longer generation time`;
      await bot.editMessageText(chatId, messageId, text, {
        parse_mode: 'Markdown',
        reply_markup: buildQualityKeyboard(session)
      });
      await bot.answerCallbackQuery(query.id);
    }
    else if (data.startsWith('hi_quality_')) {
      const qualityKey = data.replace('hi_quality_', '');
      const model = MODELS[session.model];
      const is4K = session.mode4K && model?.supports4K;
      const qualityPresets = is4K ? QUALITY_PRESETS_4K : QUALITY_PRESETS;
      
      if (qualityPresets[qualityKey]) {
        session.quality = qualityKey;
        await bot.answerCallbackQuery(query.id, { text: `Quality: ${qualityPresets[qualityKey].label}` });
      }
      const text = buildMainUI(session);
      const keyboard = buildMainKeyboard(session);
      await bot.editMessageText(chatId, messageId, text, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
    }
    else if (data === 'hi_sampler') {
      const text = `🎲 *Select Sampler*\n\nDifferent samplers produce different artistic styles:`;
      await bot.editMessageText(chatId, messageId, text, {
        parse_mode: 'Markdown',
        reply_markup: buildSamplerKeyboard()
      });
      await bot.answerCallbackQuery(query.id);
    }
    else if (data.startsWith('hi_sampler_')) {
      const samplerKey = data.replace('hi_sampler_', '');
      if (SAMPLERS[samplerKey]) {
        session.sampler = samplerKey;
        await bot.answerCallbackQuery(query.id, { text: `Sampler: ${SAMPLERS[samplerKey].label}` });
      }
      const text = buildMainUI(session);
      const keyboard = buildMainKeyboard(session);
      await bot.editMessageText(chatId, messageId, text, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
    }
    else if (data === 'hi_count') {
      const text = `🔢 *Number of Images*\n\nCurrent: ${session.numImages}\n\n⚠️ More images = longer generation time`;
      await bot.editMessageText(chatId, messageId, text, {
        parse_mode: 'Markdown',
        reply_markup: buildCountKeyboard()
      });
      await bot.answerCallbackQuery(query.id);
    }
    else if (data.startsWith('hi_count_')) {
      const count = parseInt(data.replace('hi_count_', ''));
      if (count >= 1 && count <= 4) {
        session.numImages = count;
        await bot.answerCallbackQuery(query.id, { text: `Count: ${count} image(s)` });
      }
      const text = buildMainUI(session);
      const keyboard = buildMainKeyboard(session);
      await bot.editMessageText(chatId, messageId, text, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
    }
    else if (data === 'hi_seed') {
      const text = `🌱 *Seed Settings*\n\nCurrent: ${session.seed === -1 ? 'Random' : session.seed}\n\nSame seed + same settings = same image`;
      await bot.editMessageText(chatId, messageId, text, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🎲 Random', callback_data: 'hi_seed_random' }],
            [{ text: '📋 Keep Last', callback_data: 'hi_seed_keep' }],
            [{ text: '🔙 Back', callback_data: 'hi_back' }]
          ]
        }
      });
      await bot.answerCallbackQuery(query.id);
    }
    else if (data === 'hi_seed_random') {
      session.seed = -1;
      await bot.answerCallbackQuery(query.id, { text: 'Seed: Random' });
      const text = buildMainUI(session);
      const keyboard = buildMainKeyboard(session);
      await bot.editMessageText(chatId, messageId, text, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
    }
    else if (data === 'hi_seed_keep') {
      if (session.lastSeed) {
        session.seed = session.lastSeed;
        await bot.answerCallbackQuery(query.id, { text: `Seed: ${session.lastSeed}` });
      } else {
        await bot.answerCallbackQuery(query.id, { text: 'No previous seed available' });
      }
      const text = buildMainUI(session);
      const keyboard = buildMainKeyboard(session);
      await bot.editMessageText(chatId, messageId, text, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
    }
    else if (data === 'hi_negative') {
      const model = MODELS[session.model];
      const is4K = session.mode4K && model?.supports4K;
      const text = `🚫 *Negative Prompt*\n\nCurrent:\n\`${session.negativePrompt.substring(0, 200)}...\`\n\n${is4K ? '✨ Using enhanced 4K negative prompt' : ''}`;
      await bot.editMessageText(chatId, messageId, text, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔄 Reset to Default', callback_data: 'hi_negative_reset' }],
            [{ text: '🔙 Back', callback_data: 'hi_back' }]
          ]
        }
      });
      await bot.answerCallbackQuery(query.id);
    }
    else if (data === 'hi_negative_reset') {
      const model = MODELS[session.model];
      const is4K = session.mode4K && model?.supports4K;
      session.negativePrompt = is4K ? DEFAULT_NEGATIVE_4K : DEFAULT_NEGATIVE;
      await bot.answerCallbackQuery(query.id, { text: 'Negative prompt reset' });
      const text = buildMainUI(session);
      const keyboard = buildMainKeyboard(session);
      await bot.editMessageText(chatId, messageId, text, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
    }
    else if (data === 'hi_cancel') {
      userSessions.delete(userId);
      await bot.editMessageText(chatId, messageId, '❌ Image generation cancelled.');
      await bot.answerCallbackQuery(query.id);
    }
    else if (data === 'hi_generate') {
      session.state = 'generating';
      // Store messageId for photo message updates
      session.isPhotoMessage = false;
      await generateHivenetImage(bot, query, session);
    }
    else if (data === 'hi_retry') {
      // Retry with same settings
      session.seed = -1; // New random seed
      session.isPhotoMessage = true;
      session.messageId = messageId;
      await generateHivenetImage(bot, query, session);
    }
    else if (data === 'hi_new') {
      userSessions.delete(userId);
      await bot.editMessageText(chatId, messageId, '🎨 Send a new /hi command with your prompt!');
      await bot.answerCallbackQuery(query.id);
    }
    else {
      await bot.answerCallbackQuery(query.id);
    }
  } catch (error) {
    console.error('[ComfyUI] Callback error:', error);
    try {
      await bot.answerCallbackQuery(query.id, { text: 'Error processing request' });
    } catch (e) {}
  }
}

/**
 * Generate image using ComfyUI API
 */
async function generateHivenetImage(bot, query, session) {
  const chatId = session.chatId;
  const messageId = session.messageId;
  
  const model = MODELS[session.model];
  const is4K = session.mode4K && model?.supports4K;
  const aspectRatios = is4K ? ASPECT_RATIOS_4K : ASPECT_RATIOS;
  const qualityPresets = is4K ? QUALITY_PRESETS_4K : QUALITY_PRESETS;
  
  const ar = aspectRatios[session.aspectRatio] || ASPECT_RATIOS.portrait;
  const q = qualityPresets[session.quality] || QUALITY_PRESETS.balanced;
  
  // Estimate time based on quality preset
  const sampler = SAMPLERS[session.sampler] || SAMPLERS.euler_a;
  let estimatedTime = is4K ? '20-60' : '5-15';
  if (q.label.includes('Turbo')) estimatedTime = '2-5';
  else if (q.label.includes('Fast')) estimatedTime = is4K ? '15-25' : '4-8';
  else if (q.label.includes('Ultra') || q.label.includes('Extreme')) estimatedTime = is4K ? '45-90' : '15-25';
  
  // Build status message
  let statusText = `🎨 *Generating${is4K ? ' 4K' : ''} Image...*

📝 ${session.prompt.substring(0, 50)}${session.prompt.length > 50 ? '...' : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🤖 *Model:* ${model?.label || session.model}
🖼️ *Resolution:* ${ar.width}×${ar.height}
⚙️ *Steps:* ${q.steps} | *Sampler:* ${sampler.label}

⏱️ _Estimated: ~${estimatedTime}s_
🖥️ _RTX 4090 • 24GB VRAM_`;

  try {
    await bot.editMessageText(chatId, messageId, statusText, { parse_mode: 'Markdown' });
  } catch (e) {
    // If edit fails, send new message
    const newMsg = await bot.sendMessage(chatId, statusText, { parse_mode: 'Markdown' });
    session.messageId = newMsg.message_id;
  }
  
  await bot.answerCallbackQuery(query.id, { text: is4K ? 'Creating 4K image...' : 'Creating image...' });
  
  try {
    // Build the workflow
    const { workflow, seed } = buildComfyWorkflow(session);
    session.lastSeed = seed;
    
    // Queue the prompt
    const queueResponse = await fetch(`${COMFYUI_API}/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: workflow }),
      signal: AbortSignal.timeout(is4K ? 180000 : 120000), // 3 min for 4K, 2 min for standard
    });
    
    if (!queueResponse.ok) {
      throw new Error(`ComfyUI queue error: ${queueResponse.status}`);
    }
    
    const queueResult = await queueResponse.json();
    const promptId = queueResult.prompt_id;
    
    if (!promptId) {
      throw new Error('No prompt ID received from ComfyUI');
    }
    
    // Poll for completion - Faster polling for RTX 4090
    let completed = false;
    let attempts = 0;
    const pollInterval = 1000; // Poll every 1 second (RTX 4090 is fast)
    const maxAttempts = is4K ? 120 : 45; // 2 min for 4K, 45s for standard
    
    while (!completed && attempts < maxAttempts) {
      await new Promise(r => setTimeout(r, pollInterval));
      attempts++;
      
      const historyResponse = await fetch(`${COMFYUI_API}/history/${promptId}`);
      const history = await historyResponse.json();
      
      if (history[promptId] && history[promptId].outputs) {
        completed = true;
        
        // Get the output images
        const outputs = history[promptId].outputs;
        const imageNode = Object.values(outputs).find(o => o.images && o.images.length > 0);
        
        if (!imageNode || !imageNode.images || imageNode.images.length === 0) {
          throw new Error('No images in output');
        }
        
        // Download and send each image
        for (let i = 0; i < imageNode.images.length; i++) {
          const img = imageNode.images[i];
          const imageUrl = `${COMFYUI_API}/view?filename=${encodeURIComponent(img.filename)}&subfolder=${encodeURIComponent(img.subfolder || '')}&type=${img.type || 'output'}`;
          
          const imageResponse = await fetch(imageUrl);
          if (!imageResponse.ok) {
            throw new Error(`Failed to download image: ${imageResponse.status}`);
          }
          
          const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
          
          const caption = `✨ *${is4K ? '4K ' : ''}Generated Image${imageNode.images.length > 1 ? ` ${i+1}/${imageNode.images.length}` : ''}*

📝 ${session.prompt.substring(0, 100)}${session.prompt.length > 100 ? '...' : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 ${model?.label || session.model}
📐 ${ar.width}×${ar.height} | 🎯 ${q.steps} steps
🌱 Seed: \`${seed}\`

_Generated via StarzAI on Hivenet_`;
          
          const { InputFile } = await import('grammy');
          const sentPhoto = await bot.sendPhoto(chatId, new InputFile(imageBuffer, `starzai_${is4K ? '4k_' : ''}${Date.now()}.png`), {
            caption: caption,
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [
                  { text: '🔄 Retry', callback_data: 'hi_retry' },
                  { text: '🆕 New', callback_data: 'hi_new' },
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
      }
    }
    
    if (!completed) {
      throw new Error('Generation timed out');
    }
    
  } catch (error) {
    console.error('[ComfyUI] Generation error:', error);
    
    const errorText = `❌ *Generation Failed*

Error: ${error.message}

Please try again or adjust your settings.
${is4K ? '\n💡 _4K images require more time. Try standard resolution if timeout persists._' : ''}`;

    try {
      await bot.editMessageText(chatId, messageId, errorText, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🔄 Retry', callback_data: 'hi_retry' },
              { text: '⚙️ Settings', callback_data: 'hi_back' },
            ],
            [{ text: '❌ Cancel', callback_data: 'hi_cancel' }]
          ]
        }
      });
    } catch (e) {
      await bot.sendMessage(chatId, errorText, { parse_mode: 'Markdown' });
    }
    
    session.state = 'configuring';
  }
}

/**
 * Quick generate without UI (for power users)
 */
async function quickHivenetGenerate(bot, msg, prompt, options = {}) {
  const chatId = msg.chat.id;
  
  const statusMsg = await bot.sendMessage(chatId, '🎨 Generating image on Hivenet...', {
    reply_to_message_id: msg.message_id
  });
  
  try {
    const model = options.model || 'hassaku';
    const modelInfo = MODELS[model];
    const seed = options.seed || Math.floor(Math.random() * 2147483647);
    
    const workflow = {
      "3": {
        "inputs": {
          "seed": seed,
          "steps": options.steps || modelInfo?.defaultSteps || 28,
          "cfg": options.cfg || modelInfo?.defaultCfg || 7.0,
          "sampler_name": "euler_ancestral",
          "scheduler": "karras",
          "denoise": 1,
          "model": ["4", 0],
          "positive": ["6", 0],
          "negative": ["7", 0],
          "latent_image": ["5", 0]
        },
        "class_type": "KSampler"
      },
      "4": {
        "inputs": {
          "ckpt_name": modelInfo?.id || "hassaku.xl.safetensors"
        },
        "class_type": "CheckpointLoaderSimple"
      },
      "5": {
        "inputs": {
          "width": options.width || 832,
          "height": options.height || 1216,
          "batch_size": 1
        },
        "class_type": "EmptyLatentImage"
      },
      "6": {
        "inputs": {
          "text": prompt,
          "clip": ["4", 1]
        },
        "class_type": "CLIPTextEncode"
      },
      "7": {
        "inputs": {
          "text": options.negative || DEFAULT_NEGATIVE,
          "clip": ["4", 1]
        },
        "class_type": "CLIPTextEncode"
      },
      "8": {
        "inputs": {
          "samples": ["3", 0],
          "vae": ["4", 2]
        },
        "class_type": "VAEDecode"
      },
      "9": {
        "inputs": {
          "filename_prefix": "StarzAI_Quick",
          "images": ["8", 0]
        },
        "class_type": "SaveImage"
      }
    };
    
    // Queue the prompt
    const queueResponse = await fetch(`${COMFYUI_API}/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: workflow }),
      signal: AbortSignal.timeout(120000),
    });
    
    const queueResult = await queueResponse.json();
    const promptId = queueResult.prompt_id;
    
    // Poll for completion
    let completed = false;
    let attempts = 0;
    
    while (!completed && attempts < 60) {
      await new Promise(r => setTimeout(r, 2000));
      attempts++;
      
      const historyResponse = await fetch(`${COMFYUI_API}/history/${promptId}`);
      const history = await historyResponse.json();
      
      if (history[promptId] && history[promptId].outputs) {
        completed = true;
        
        const outputs = history[promptId].outputs;
        const imageNode = Object.values(outputs).find(o => o.images && o.images.length > 0);
        
        if (imageNode && imageNode.images.length > 0) {
          const img = imageNode.images[0];
          const imageUrl = `${COMFYUI_API}/view?filename=${encodeURIComponent(img.filename)}&subfolder=${encodeURIComponent(img.subfolder || '')}&type=${img.type || 'output'}`;
          
          const imageResponse = await fetch(imageUrl);
          const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
          
          const { InputFile } = await import('grammy');
          await bot.sendPhoto(chatId, new InputFile(imageBuffer, 'generated.png'), {
            caption: `🎨 ${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}\n🌱 Seed: ${seed}`,
            reply_to_message_id: msg.message_id
          });
          
          await bot.deleteMessage(chatId, statusMsg.message_id);
        }
      }
    }
    
    if (!completed) {
      throw new Error('Generation timed out');
    }
    
  } catch (error) {
    console.error('[ComfyUI Quick] Error:', error);
    await bot.editMessageText(chatId, statusMsg.message_id, `❌ Generation failed: ${error.message}`);
  }
}

/**
 * Check if ComfyUI is available
 */
async function checkHivenetHealth() {
  try {
    const response = await fetch(`${COMFYUI_API}/system_stats`, {
      signal: AbortSignal.timeout(10000)
    });
    const data = await response.json();
    return { 
      available: true, 
      ...data,
      gpu: data.devices?.[0]?.name || 'Unknown GPU',
      vram: data.devices?.[0]?.vram_total ? `${(data.devices[0].vram_total / 1024 / 1024 / 1024).toFixed(1)} GB` : 'Unknown'
    };
  } catch (error) {
    return { available: false, error: error.message };
  }
}

export {
  startHivenetGeneration,
  handleHivenetCallback,
  quickHivenetGenerate,
  checkHivenetHealth,
  getSession,
  ASPECT_RATIOS,
  ASPECT_RATIOS_4K,
  QUALITY_PRESETS,
  QUALITY_PRESETS_4K,
  MODELS,
  SAMPLERS,
};
