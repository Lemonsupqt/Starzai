/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                        APIMart Integration Module                            ║
 * ║              Future-proof provider for Image & Video generation              ║
 * ╠═══════════════════════════════════════════════════════════════════════════════╣
 * ║  Supports: SeedDream 4.5, and future models (video, etc.)                   ║
 * ║  Architecture: Registry-based model system for easy expansion               ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import fetch from "node-fetch";

// =====================
// MODEL REGISTRY - Add new models here
// =====================
// Each model entry defines its capabilities, defaults, and API mapping.
// To add a new model: just add an entry to this registry.

const APIMART_MODELS = {
  // ─── IMAGE GENERATION MODELS ───
  "seedream-4.5": {
    id: "doubao-seedance-4-5",
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
    supportedSizes: ["1:1", "4:3", "3:4", "16:9", "9:16", "3:2", "2:3", "21:9", "9:21", "auto"],
    supportedResolutions: ["2K", "4K"],
    defaultSize: "1:1",
    defaultResolution: "2K",
    promptOptimizationModes: ["standard", "fast"],
    supportsWatermark: true,
    maxPollAttempts: 60,
    pollIntervalMs: 2000,
    estimatedTimeSeconds: 20,
  },

  // ─── FUTURE: More image models ───
  // "seedream-4.0": {
  //   id: "doubao-seedance-4-0",
  //   name: "SeedDream 4.0",
  //   type: "image",
  //   ...
  // },
  // "flux-kontext": {
  //   id: "flux-kontext",
  //   name: "Flux Kontext",
  //   type: "image",
  //   ...
  // },

  // ─── FUTURE: Video generation models ───
  // "sora-2": {
  //   id: "sora-2",
  //   name: "Sora 2",
  //   type: "video",
  //   provider: "OpenAI",
  //   ...
  // },
  // "veo-3.1": {
  //   id: "veo-3.1",
  //   name: "Veo 3.1",
  //   type: "video",
  //   provider: "Google",
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
  "21:9": { icon: "🖥️", label: "Ultra-wide", emoji: "🖥️" },
  "9:21": { icon: "📜", label: "Ultra-tall", emoji: "📜" },
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
      body["optimize_prompt_options"] = { mode: optimizePromptMode };
    }
    if (watermark) body.watermark = true;

    this.stats.totalRequests++;
    this.stats.lastRequest = Date.now();

    console.log(`[APIMart] Submitting ${modelConfig.name} generation: "${prompt.slice(0, 60)}..." (${size || 'default'}, ${resolution || 'default'})`);

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

  // ─── HIGH-LEVEL: Generate Image and Download Buffer ───
  async generateImageBuffer(options = {}, onProgress = null) {
    const result = await this.generateImage(options, onProgress);

    // Download the first image
    const imageUrl = result.urls[0];
    console.log(`[APIMart] Downloading image: ${imageUrl.slice(0, 80)}...`);

    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to download image: ${imageResponse.status}`);
    }

    const buffer = Buffer.from(await imageResponse.arrayBuffer());

    return {
      buffer,
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
