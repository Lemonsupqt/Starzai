/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                        APIMart Integration Module                            ║
 * ║              Future-proof provider for Image & Video generation              ║
 * ╠═══════════════════════════════════════════════════════════════════════════════╣
 * ║  Supports: SeedDream 4.5, GPT-4o Image, and future models (video, etc.)     ║
 * ║  Architecture: Registry-based model system for easy expansion               ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import fetch from "node-fetch";

// =====================
// MODEL REGISTRY - Add new models here
// =====================
// Each model entry defines its capabilities, defaults, and API mapping.
// To add a new model: just add an entry to this registry.

// ─── RAILWAY ENV VARIABLE OVERRIDES ───
// Model IDs:
//   APIMART_MODEL_SEEDREAM45  = model ID for SeedDream 4.5 (default: doubao-seedance-4-5)
//   APIMART_MODEL_SEEDREAM40  = model ID for SeedDream 4.0 (default: doubao-seedance-4-0)
//   APIMART_MODEL_GPT4O       = model ID for GPT-4o Image  (default: gpt-4o-image)
//
// Resolutions (comma-separated, e.g. "2K,4K" or "1080p,720p,480p"):
//   APIMART_RES_SEEDREAM45    = resolutions for SeedDream 4.5 (default: 2K,4K)
//   APIMART_RES_SEEDREAM40    = resolutions for SeedDream 4.0 (default: 1080p,720p,480p)
//   APIMART_RES_GPT4O         = resolutions for GPT-4o       (default: none)
//
// Default resolution (what's used when user hasn't picked one):
//   APIMART_DEFRES_SEEDREAM45 = default resolution for 4.5 (default: null = API decides)
//   APIMART_DEFRES_SEEDREAM40 = default resolution for 4.0 (default: null = API decides)

function parseEnvResolutions(envVar, fallback) {
  const val = process.env[envVar];
  if (!val) return fallback;
  return val.split(",").map(r => r.trim()).filter(Boolean);
}

function parseEnvDefRes(envVar) {
  const val = process.env[envVar];
  if (!val || val === "null" || val === "auto" || val === "none") return null;
  return val.trim();
}

const APIMART_MODELS = {
  // ─── IMAGE GENERATION MODELS ───
  "seedream-4.5": {
    id: process.env.APIMART_MODEL_SEEDREAM45 || "doubao-seedance-4-5",
    name: "SeedDream 4.5",
    shortName: "SD 4.5",
    type: "image",
    provider: "ByteDance",
    description: "4K text-to-image with perfect text rendering",
    icon: "🌱",
    costPerImage: 0.028,
    capabilities: ["text-to-image", "image-editing", "reference-images", "4k", "text-rendering", "batch"],
    maxBatch: 15,
    maxReferenceImages: 10,
    supportedSizes: ["1:1", "4:3", "3:4", "16:9", "9:16", "3:2", "2:3", "21:9", "9:21"],
    supportedResolutions: parseEnvResolutions("APIMART_RES_SEEDREAM45", ["1080p", "720p"]),
    defaultSize: "1:1",
    defaultResolution: parseEnvDefRes("APIMART_DEFRES_SEEDREAM45") || "1080p",
    promptOptimizationModes: ["standard", "fast"],
    supportsWatermark: true,
    maxPollAttempts: 60,
    pollIntervalMs: 2000,
    estimatedTimeSeconds: 20,
  },

  "seedream-4.0": {
    id: process.env.APIMART_MODEL_SEEDREAM40 || "doubao-seedance-4-0",
    name: "SeedDream 4.0",
    shortName: "SD 4.0",
    type: "image",
    provider: "ByteDance",
    description: "Fast text-to-image generation",
    icon: "🌿",
    costPerImage: 0.020,
    capabilities: ["text-to-image", "image-editing", "reference-images", "text-rendering", "batch"],
    maxBatch: 15,
    maxReferenceImages: 10,
    supportedSizes: ["1:1", "4:3", "3:4", "16:9", "9:16", "3:2", "2:3", "21:9", "9:21"],
    supportedResolutions: parseEnvResolutions("APIMART_RES_SEEDREAM40", ["1080p", "720p", "480p"]),
    defaultSize: "1:1",
    defaultResolution: parseEnvDefRes("APIMART_DEFRES_SEEDREAM40") || "1080p",
    promptOptimizationModes: ["standard", "fast"],
    supportsWatermark: true,
    maxPollAttempts: 60,
    pollIntervalMs: 2000,
    estimatedTimeSeconds: 15,
  },

  "gpt-4o-image": {
    id: process.env.APIMART_MODEL_GPT4O || "gpt-4o-image",
    name: "GPT-4o Image",
    shortName: "GPT-4o",
    type: "image",
    provider: "OpenAI",
    description: "Native multimodal image gen with text rendering",
    icon: "✨",
    costPerImage: 0.006,
    capabilities: ["text-to-image", "image-editing", "reference-images", "text-rendering", "mask-editing", "batch"],
    maxBatch: 4,
    maxReferenceImages: 5,
    supportedSizes: ["1:1", "2:3", "3:2"],
    supportedResolutions: parseEnvResolutions("APIMART_RES_GPT4O", []),
    defaultSize: "1:1",
    defaultResolution: null,
    promptOptimizationModes: [],
    supportsWatermark: false,
    maxPollAttempts: 60,
    pollIntervalMs: 2000,
    estimatedTimeSeconds: 15,
  },

  // ─── FUTURE: Video generation models ───
  // "sora-2": {
  //   id: "sora-2",
  //   name: "Sora 2",
  //   type: "video",
  //   provider: "OpenAI",
  //   ...
  // },
};

// =====================
// ASPECT RATIO CONFIGS
// =====================
const APIMART_ASPECT_RATIOS = {
  "1:1":  { icon: "⬜", label: "Square",     emoji: "1️⃣" },
  "4:3":  { icon: "🖼️", label: "Landscape",  emoji: "🏞️" },
  "3:4":  { icon: "📱", label: "Portrait",   emoji: "📱" },
  "16:9": { icon: "🎬", label: "Widescreen", emoji: "🎬" },
  "9:16": { icon: "📲", label: "Story",      emoji: "📲" },
  "3:2":  { icon: "📷", label: "Photo",      emoji: "📷" },
  "2:3":  { icon: "🎴", label: "Tall Photo", emoji: "🎴" },
  "21:9": { icon: "🖥️", label: "Ultra Wide",     emoji: "🖥️" },
  "9:21": { icon: "📜", label: "Ultra Vertical", emoji: "📜" },
};

// =====================
// APIMART CLIENT
// =====================
const BASE_URL = "https://api.apimart.ai";

class APIMartClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.stats = {
      totalRequests: 0,
      totalSuccesses: 0,
      totalFailures: 0,
      totalCost: 0,
      lastRequest: null,
      lastError: null,
    };
  }

  // Update API key (e.g., from Railway env reload)
  setApiKey(key) {
    this.apiKey = key;
  }

  hasKey() {
    return Boolean(this.apiKey);
  }

  // ─── HEADERS ───
  _headers() {
    return {
      "Authorization": `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
      "Accept": "application/json",
    };
  }

  // ─── SUBMIT IMAGE GENERATION ───
  async submitImageGeneration(options = {}) {
    const {
      model = "seedream-4.5",
      prompt,
      size,
      resolution,
      n = 1,
      imageUrls = [],
      optimizePromptMode,
      watermark = false,
    } = options;

    const modelConfig = APIMART_MODELS[model];
    if (!modelConfig) throw new Error(`Unknown model: ${model}`);
    if (modelConfig.type !== "image") throw new Error(`Model ${model} is not an image model`);

    // Build request body — keep it simple, only add fields that have values
    const body = {
      model: modelConfig.id,
      prompt: prompt,
    };

    // Only add optional fields if they have values
    if (size) body.size = size;
    if (resolution) body.resolution = resolution;
    if (n > 1) body.n = n;
    if (imageUrls.length > 0) body.image_urls = imageUrls;
    if (optimizePromptMode) {
      body.optimize_prompt_options = { mode: optimizePromptMode };
    }
    if (watermark) body.watermark = true;

    this.stats.totalRequests++;
    this.stats.lastRequest = Date.now();

    console.log(`[APIMart] Submitting ${modelConfig.name} generation: "${prompt.slice(0, 60)}..." (${size || 'default'}, ${resolution || 'default'})`);
    console.log(`[APIMart] Request body:`, JSON.stringify(body));

    const response = await fetch(`${BASE_URL}/v1/images/generations`, {
      method: "POST",
      headers: this._headers(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.stats.totalFailures++;
      this.stats.lastError = errorText;
      const error = new Error(`APIMart submit error (${response.status}): ${errorText}`);
      error.statusCode = response.status;
      throw error;
    }

    const data = await response.json();

    if (data.code !== 200 || !data.data?.[0]?.task_id) {
      this.stats.totalFailures++;
      throw new Error(`APIMart unexpected response: ${JSON.stringify(data).slice(0, 200)}`);
    }

    const taskId = data.data[0].task_id;
    console.log(`[APIMart] Task submitted: ${taskId}`);

    return {
      taskId,
      status: data.data[0].status,
      model: modelConfig,
    };
  }

  // ─── SUBMIT VIDEO GENERATION (future-proof) ───
  async submitVideoGeneration(options = {}) {
    // Placeholder for future video generation support
    // Will follow similar pattern: submit -> poll -> get result
    throw new Error("Video generation not yet implemented. Coming soon!");
  }

  // ─── POLL TASK STATUS ───
  async getTaskStatus(taskId) {
    const response = await fetch(`${BASE_URL}/v1/tasks/${taskId}?language=en`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`APIMart status check failed (${response.status})`);
    }

    const data = await response.json();
    const taskData = data.data || data;

    return {
      id: taskData.id,
      status: taskData.status, // pending, processing, completed, failed, cancelled
      progress: taskData.progress || 0,
      result: taskData.result || null,
      estimatedTime: taskData.estimated_time,
      actualTime: taskData.actual_time,
      error: taskData.error || null,
      created: taskData.created,
      completed: taskData.completed,
    };
  }

  // ─── POLL UNTIL COMPLETE ───
  async pollUntilComplete(taskId, modelKey = "seedream-4.5", onProgress = null) {
    const modelConfig = APIMART_MODELS[modelKey] || APIMART_MODELS["seedream-4.5"];
    const maxAttempts = modelConfig.maxPollAttempts || 60;
    const pollInterval = modelConfig.pollIntervalMs || 2000;

    let attempts = 0;

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      attempts++;

      try {
        const status = await this.getTaskStatus(taskId);

        // Report progress
        if (onProgress) {
          onProgress(status.progress, status.status, attempts);
        }

        if (status.status === "completed") {
          this.stats.totalSuccesses++;
          this.stats.totalCost += modelConfig.costPerImage || 0;
          console.log(`[APIMart] Task ${taskId} completed in ${status.actualTime || '?'}s`);
          return status;
        }

        if (status.status === "failed") {
          this.stats.totalFailures++;
          const errMsg = status.error?.message || "Generation failed";
          console.error(`[APIMart] Task ${taskId} failed: ${errMsg}`);
          throw new Error(errMsg);
        }

        if (status.status === "cancelled") {
          throw new Error("Task was cancelled");
        }

      } catch (error) {
        // Network errors during polling - keep trying
        if (error.message.includes("status check failed") && attempts < maxAttempts - 1) {
          console.warn(`[APIMart] Poll attempt ${attempts} failed, retrying...`);
          continue;
        }
        throw error;
      }
    }

    this.stats.totalFailures++;
    throw new Error(`Timeout: Image generation took too long (>${maxAttempts * pollInterval / 1000}s)`);
  }

  // ─── HIGH-LEVEL: Generate Image (submit + poll + download) ───
  async generateImage(options = {}, onProgress = null) {
    const { model = "seedream-4.5" } = options;

    // Step 1: Submit
    const submission = await this.submitImageGeneration(options);

    // Step 2: Poll until complete
    const result = await this.pollUntilComplete(submission.taskId, model, onProgress);

    // Step 3: Extract image URLs
    const images = result.result?.images || [];
    if (images.length === 0) {
      throw new Error("No images returned from generation");
    }

    // Extract all image URLs (each image can have multiple URLs)
    const imageUrls = [];
    for (const img of images) {
      if (Array.isArray(img.url)) {
        imageUrls.push(...img.url);
      } else if (typeof img.url === "string") {
        imageUrls.push(img.url);
      }
    }

    if (imageUrls.length === 0) {
      throw new Error("No image URLs in result");
    }

    return {
      urls: imageUrls,
      taskId: submission.taskId,
      actualTime: result.actualTime,
      model: submission.model,
    };
  }

  // ─── HIGH-LEVEL: Generate Image and Download Buffer(s) ───
  async generateImageBuffer(options = {}, onProgress = null) {
    const result = await this.generateImage(options, onProgress);

    // Download ALL images in parallel
    const downloadPromises = result.urls.map(async (url, i) => {
      console.log(`[APIMart] Downloading image ${i + 1}/${result.urls.length}: ${url.slice(0, 80)}...`);
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`Failed to download image ${i + 1}: ${resp.status}`);
      return Buffer.from(await resp.arrayBuffer());
    });

    const buffers = await Promise.all(downloadPromises);

    return {
      buffer: buffers[0],       // backward compat: first image
      buffers,                  // all image buffers
      urls: result.urls,
      taskId: result.taskId,
      actualTime: result.actualTime,
      model: result.model,
    };
  }

  // ─── STATS ───
  getStats() {
    return { ...this.stats };
  }

  getPersistentStats() {
    return {
      totalRequests: this.stats.totalRequests,
      totalSuccesses: this.stats.totalSuccesses,
      totalFailures: this.stats.totalFailures,
      totalCost: this.stats.totalCost,
    };
  }

  loadStats(data) {
    if (data) {
      this.stats.totalRequests = data.totalRequests || 0;
      this.stats.totalSuccesses = data.totalSuccesses || 0;
      this.stats.totalFailures = data.totalFailures || 0;
      this.stats.totalCost = data.totalCost || 0;
    }
  }
}

// =====================
// HELPER FUNCTIONS
// =====================

/** Get all registered models */
function getAvailableModels(type = null) {
  const models = Object.entries(APIMART_MODELS);
  if (type) {
    return models.filter(([, m]) => m.type === type);
  }
  return models;
}

/** Get image models only */
function getImageModels() {
  return getAvailableModels("image");
}

/** Get video models only (future) */
function getVideoModels() {
  return getAvailableModels("video");
}

/** Get model config by key */
function getModelConfig(key) {
  return APIMART_MODELS[key] || null;
}

/** Get default image model key */
function getDefaultImageModel() {
  const imageModels = getImageModels();
  return imageModels.length > 0 ? imageModels[0][0] : null;
}

/** Get aspect ratio config */
function getAspectRatioConfig(ratio) {
  return APIMART_ASPECT_RATIOS[ratio] || APIMART_ASPECT_RATIOS["1:1"];
}

/** Parse aspect ratio from natural language */
function parseAspectRatio(text) {
  const lower = text.toLowerCase();
  
  if (/\b(21[:\-x]9|ultrawide|ultra[\s-]?wide)\b/.test(lower)) return "21:9";
  if (/\b(9[:\-x]21|ultratall|ultra[\s-]?tall)\b/.test(lower)) return "9:21";
  if (/\b(16[:\-x]9|widescreen|wide|cinematic|movie)\b/.test(lower)) return "16:9";
  if (/\b(9[:\-x]16|story|stories|vertical|tall|tiktok|reels?)\b/.test(lower)) return "9:16";
  if (/\b(4[:\-x]3|landscape|horizontal)\b/.test(lower)) return "4:3";
  if (/\b(3[:\-x]4|portrait|mobile)\b/.test(lower)) return "3:4";
  if (/\b(3[:\-x]2|photo|photograph)\b/.test(lower)) return "3:2";
  if (/\b(2[:\-x]3|tall[\s-]?photo)\b/.test(lower)) return "2:3";
  if (/\b(1[:\-x]1|square)\b/.test(lower)) return "1:1";
  
  return null;
}

/** Clean prompt by removing ratio keywords */
function cleanPromptRatio(prompt) {
  return prompt
    .replace(/\b(in\s+)?(21[:\-x]9|9[:\-x]21|16[:\-x]9|9[:\-x]16|4[:\-x]3|3[:\-x]4|3[:\-x]2|2[:\-x]3|1[:\-x]1)\b/gi, '')
    .replace(/\b(in\s+)?(ultrawide|ultra[\s-]?wide|ultratall|ultra[\s-]?tall|widescreen|wide|cinematic|movie|story|stories|vertical|tall|tiktok|reels?|landscape|horizontal|portrait|mobile|photo|photograph|tall[\s-]?photo|square)\s*(ratio|format|mode)?\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// =====================
// EXPORTS
// =====================
export {
  APIMartClient,
  APIMART_MODELS,
  APIMART_ASPECT_RATIOS,
  getAvailableModels,
  getImageModels,
  getVideoModels,
  getModelConfig,
  getDefaultImageModel,
  getAspectRatioConfig,
  parseAspectRatio,
  cleanPromptRatio,
};
