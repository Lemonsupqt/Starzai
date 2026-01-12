/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                    STARZAI HF IMAGE GENERATION MODULE                         ║
 * ║              Hugging Face Space SDXL Integration for StarzAI Bot              ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 * 
 * This module provides image generation using a self-hosted HF Space running
 * Stable Diffusion XL Lightning. It serves as a primary or fallback option
 * for the bot's image generation capabilities.
 * 
 * Features:
 * - SDXL Lightning (ultra-fast 4-step generation)
 * - Multiple model support (sdxl-lightning, sdxl-base, playground)
 * - Automatic retry with exponential backoff
 * - Fallback to DeAPI or Pollinations if HF Space is down
 * 
 * Environment Variables:
 * - HF_IMAGE_API: URL of your HF Space (e.g., https://kazukixd-starzai-sdxl-api.hf.space)
 * - HF_IMAGE_KEY: Optional API key for authentication
 * - HF_IMAGE_MODEL: Default model (sdxl-lightning, sdxl-base, playground)
 */

import fetch from 'node-fetch';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const HF_IMAGE_CONFIG = {
  // HF Space URL - set via environment variable
  api: process.env.HF_IMAGE_API || '',
  apiKey: process.env.HF_IMAGE_KEY || '',
  defaultModel: process.env.HF_IMAGE_MODEL || 'sdxl-lightning',
  timeout: 120000,  // 2 minutes for generation
  maxRetries: 3,
  retryDelay: 2000  // 2 seconds between retries
};

// Aspect ratio to dimension mapping (matching existing bot config)
const HF_ASPECT_RATIOS = {
  "1:1": { width: 1024, height: 1024 },
  "4:3": { width: 1024, height: 768 },
  "3:4": { width: 768, height: 1024 },
  "16:9": { width: 1024, height: 576 },
  "9:16": { width: 576, height: 1024 },
  "3:2": { width: 1024, height: 682 }
};

// Stats tracking
const hfImageStats = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  totalGenerationTime: 0,
  lastError: null,
  lastSuccess: null,
  isAvailable: true,
  lastHealthCheck: null
};

// ═══════════════════════════════════════════════════════════════════════════════
// HEALTH CHECK
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if the HF Space is available and responding
 */
async function checkHFSpaceHealth() {
  if (!HF_IMAGE_CONFIG.api) {
    hfImageStats.isAvailable = false;
    return false;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(HF_IMAGE_CONFIG.api, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'StarzAI-Bot/2.0'
      }
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      hfImageStats.isAvailable = data.status === 'online';
      hfImageStats.lastHealthCheck = new Date();
      console.log(`[HF-IMG] Health check: ${hfImageStats.isAvailable ? 'OK' : 'FAILED'}`);
      return hfImageStats.isAvailable;
    }

    hfImageStats.isAvailable = false;
    return false;
  } catch (error) {
    console.warn(`[HF-IMG] Health check failed: ${error.message}`);
    hfImageStats.isAvailable = false;
    hfImageStats.lastError = error.message;
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// IMAGE GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate an image using the HF Space SDXL API
 * 
 * @param {string} prompt - The text prompt for image generation
 * @param {string} aspectRatio - Aspect ratio (1:1, 4:3, 3:4, 16:9, 9:16, 3:2)
 * @param {object} options - Additional options
 * @param {string} options.model - Model to use (sdxl-lightning, sdxl-base, playground)
 * @param {string} options.negativePrompt - Negative prompt
 * @param {number} options.seed - Random seed for reproducibility
 * @param {number} options.steps - Number of inference steps
 * @param {number} options.guidance - Guidance scale
 * @returns {Promise<{success: boolean, buffer?: Buffer, error?: string, metadata?: object}>}
 */
async function generateHFImage(prompt, aspectRatio = '1:1', options = {}) {
  if (!HF_IMAGE_CONFIG.api) {
    return { 
      success: false, 
      error: 'HF Image API not configured. Set HF_IMAGE_API environment variable.' 
    };
  }

  const dimensions = HF_ASPECT_RATIOS[aspectRatio] || HF_ASPECT_RATIOS['1:1'];
  const model = options.model || HF_IMAGE_CONFIG.defaultModel;

  const requestBody = {
    prompt: prompt,
    negative_prompt: options.negativePrompt || 
      'blurry, bad quality, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, text, error, ugly, deformed',
    model: model,
    width: dimensions.width,
    height: dimensions.height,
    seed: options.seed || null,
    steps: options.steps || null,
    guidance_scale: options.guidance || null,
    api_key: HF_IMAGE_CONFIG.apiKey || undefined
  };

  hfImageStats.totalRequests++;
  const startTime = Date.now();

  for (let attempt = 1; attempt <= HF_IMAGE_CONFIG.maxRetries; attempt++) {
    try {
      console.log(`[HF-IMG] Generating image (attempt ${attempt}/${HF_IMAGE_CONFIG.maxRetries}): "${prompt.slice(0, 50)}..."`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), HF_IMAGE_CONFIG.timeout);

      const response = await fetch(`${HF_IMAGE_CONFIG.api}/generate`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'StarzAI-Bot/2.0'
        },
        body: JSON.stringify(requestBody)
      });

      clearTimeout(timeoutId);

      // Check for HTML response (HF Space starting up)
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        throw new Error('HF Space is starting up, please wait...');
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Generation failed');
      }

      // Fetch the generated image
      const imageUrl = data.url.startsWith('http') 
        ? data.url 
        : `${HF_IMAGE_CONFIG.api}${data.url}`;

      const imageResponse = await fetch(imageUrl, {
        headers: { 'User-Agent': 'StarzAI-Bot/2.0' }
      });

      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${imageResponse.status}`);
      }

      const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
      const generationTime = Date.now() - startTime;

      // Update stats
      hfImageStats.successfulRequests++;
      hfImageStats.totalGenerationTime += generationTime;
      hfImageStats.lastSuccess = new Date();
      hfImageStats.isAvailable = true;

      console.log(`[HF-IMG] Generated successfully in ${generationTime}ms (seed: ${data.seed})`);

      return {
        success: true,
        buffer: imageBuffer,
        metadata: {
          prompt: data.prompt,
          model: data.model,
          seed: data.seed,
          generationTime: data.generation_time,
          imageId: data.image_id
        }
      };

    } catch (error) {
      console.warn(`[HF-IMG] Attempt ${attempt} failed: ${error.message}`);
      
      if (attempt === HF_IMAGE_CONFIG.maxRetries) {
        hfImageStats.failedRequests++;
        hfImageStats.lastError = error.message;
        
        return {
          success: false,
          error: `HF Image generation failed after ${HF_IMAGE_CONFIG.maxRetries} attempts: ${error.message}`
        };
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, HF_IMAGE_CONFIG.retryDelay * attempt));
    }
  }

  return { success: false, error: 'Unknown error' };
}

/**
 * Generate image with automatic fallback to other providers
 * Priority: HF Space -> DeAPI -> Pollinations
 * 
 * @param {string} prompt - The text prompt
 * @param {string} aspectRatio - Aspect ratio
 * @param {function} deapiGenerator - DeAPI generator function (optional)
 * @param {function} pollinationsGenerator - Pollinations generator function (optional)
 * @returns {Promise<{success: boolean, buffer?: Buffer, provider: string, error?: string}>}
 */
async function generateImageWithFallback(prompt, aspectRatio, deapiGenerator = null, pollinationsGenerator = null) {
  // Try HF Space first if configured
  if (HF_IMAGE_CONFIG.api && hfImageStats.isAvailable) {
    const hfResult = await generateHFImage(prompt, aspectRatio);
    if (hfResult.success) {
      return { ...hfResult, provider: 'hf-sdxl' };
    }
    console.log(`[HF-IMG] Falling back to alternative provider...`);
  }

  // Try DeAPI if available
  if (deapiGenerator) {
    try {
      const buffer = await deapiGenerator(prompt, aspectRatio);
      return { success: true, buffer, provider: 'deapi' };
    } catch (error) {
      console.log(`[HF-IMG] DeAPI fallback failed: ${error.message}`);
    }
  }

  // Try Pollinations as last resort
  if (pollinationsGenerator) {
    try {
      const buffer = await pollinationsGenerator(prompt);
      return { success: true, buffer, provider: 'pollinations' };
    } catch (error) {
      console.log(`[HF-IMG] Pollinations fallback failed: ${error.message}`);
    }
  }

  return { 
    success: false, 
    error: 'All image generation providers failed',
    provider: 'none'
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATS & UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get HF Image generation statistics
 */
function getHFImageStats() {
  const avgTime = hfImageStats.successfulRequests > 0
    ? Math.round(hfImageStats.totalGenerationTime / hfImageStats.successfulRequests)
    : 0;

  return {
    configured: !!HF_IMAGE_CONFIG.api,
    available: hfImageStats.isAvailable,
    totalRequests: hfImageStats.totalRequests,
    successfulRequests: hfImageStats.successfulRequests,
    failedRequests: hfImageStats.failedRequests,
    successRate: hfImageStats.totalRequests > 0
      ? Math.round((hfImageStats.successfulRequests / hfImageStats.totalRequests) * 100)
      : 0,
    averageGenerationTime: avgTime,
    lastError: hfImageStats.lastError,
    lastSuccess: hfImageStats.lastSuccess,
    lastHealthCheck: hfImageStats.lastHealthCheck,
    apiUrl: HF_IMAGE_CONFIG.api ? HF_IMAGE_CONFIG.api.replace(/^https?:\/\//, '').split('.')[0] + '...' : 'Not configured'
  };
}

/**
 * Check if HF Image API is configured
 */
function isHFImageConfigured() {
  return !!HF_IMAGE_CONFIG.api;
}

/**
 * Get available models from HF Space
 */
async function getHFImageModels() {
  if (!HF_IMAGE_CONFIG.api) {
    return { success: false, error: 'HF Image API not configured' };
  }

  try {
    const response = await fetch(`${HF_IMAGE_CONFIG.api}/models`, {
      headers: { 'User-Agent': 'StarzAI-Bot/2.0' }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export {
  generateHFImage,
  generateImageWithFallback,
  checkHFSpaceHealth,
  getHFImageStats,
  isHFImageConfigured,
  getHFImageModels,
  HF_IMAGE_CONFIG,
  HF_ASPECT_RATIOS
};

// Run health check on module load
if (HF_IMAGE_CONFIG.api) {
  checkHFSpaceHealth().then(available => {
    console.log(`[HF-IMG] Module initialized. API: ${available ? 'Available' : 'Unavailable'}`);
  });
}
