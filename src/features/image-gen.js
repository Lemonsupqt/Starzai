/**
 * Image Generation Module
 * Handles AI image generation via DeAPI
 */

import { DEAPI_KEYS, OWNER_IDS } from "../config/index.js";
import { scheduleSave } from "../database/manager.js";
import { getUserRecord } from "./users.js";

// =====================
// DeAPI Key Manager
// =====================

export const deapiKeyManager = {
  currentIndex: 0,
  keyStats: new Map(),
  totalImageGenerations: 0,
  
  init() {
    for (const key of DEAPI_KEYS) {
      const keyId = this.getKeyId(key);
      this.keyStats.set(keyId, {
        calls: 0,
        successes: 0,
        failures: 0,
        lastUsed: null,
        lastError: null,
        disabled: false,
        disabledUntil: null,
        consecutiveFailures: 0
      });
    }
    console.log(`[DeAPI] Initialized ${DEAPI_KEYS.length} API key(s)`);
  },
  
  loadStats(data) {
    if (data?.totalImageGenerations) {
      this.totalImageGenerations = data.totalImageGenerations;
      console.log(`[DeAPI] Loaded ${this.totalImageGenerations} total image generations from storage`);
    }
  },
  
  getPersistentStats() {
    return {
      totalImageGenerations: this.totalImageGenerations
    };
  },
  
  getKeyId(key) {
    return key.slice(0, 8) + '...';
  },
  
  getNextKey() {
    if (DEAPI_KEYS.length === 0) return null;
    
    const now = Date.now();
    let attempts = 0;
    
    while (attempts < DEAPI_KEYS.length) {
      const key = DEAPI_KEYS[this.currentIndex];
      const keyId = this.getKeyId(key);
      const stats = this.keyStats.get(keyId);
      
      this.currentIndex = (this.currentIndex + 1) % DEAPI_KEYS.length;
      
      if (stats?.disabled) {
        if (stats.disabledUntil && now > stats.disabledUntil) {
          stats.disabled = false;
          stats.disabledUntil = null;
          stats.consecutiveFailures = 0;
          console.log(`[DeAPI] Re-enabled key ${keyId} after cooldown`);
        } else {
          attempts++;
          continue;
        }
      }
      
      return key;
    }
    
    console.warn('[DeAPI] All keys disabled, using first key as fallback');
    return DEAPI_KEYS[0];
  },
  
  recordSuccess(key) {
    const keyId = this.getKeyId(key);
    const stats = this.keyStats.get(keyId);
    if (stats) {
      stats.calls++;
      stats.successes++;
      stats.lastUsed = Date.now();
      stats.consecutiveFailures = 0;
    }
    this.totalImageGenerations++;
    scheduleSave('imageStats', 'normal');
  },
  
  recordFailure(key, error) {
    const keyId = this.getKeyId(key);
    const stats = this.keyStats.get(keyId);
    if (stats) {
      stats.calls++;
      stats.failures++;
      stats.lastUsed = Date.now();
      stats.lastError = error?.message || String(error);
      stats.consecutiveFailures++;
      
      if (stats.consecutiveFailures >= 3) {
        stats.disabled = true;
        stats.disabledUntil = Date.now() + (5 * 60 * 1000);
        console.warn(`[DeAPI] Disabled key ${keyId} for 5 minutes after ${stats.consecutiveFailures} consecutive failures`);
      }
    }
  },
  
  async fetchBalance(key) {
    try {
      const response = await fetch('https://api.deapi.ai/api/v1/client/balance', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${key}`,
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) return null;
      
      const data = await response.json();
      return data?.data?.balance ?? data?.balance ?? data?.credits ?? null;
    } catch (error) {
      console.warn(`[DeAPI] Error fetching balance:`, error.message);
      return null;
    }
  },
  
  getStats() {
    const result = {
      totalKeys: DEAPI_KEYS.length,
      activeKeys: 0,
      disabledKeys: 0,
      totalCalls: 0,
      totalSuccesses: 0,
      totalFailures: 0,
      keys: []
    };
    
    for (const [keyId, stats] of this.keyStats.entries()) {
      if (stats.disabled) {
        result.disabledKeys++;
      } else {
        result.activeKeys++;
      }
      result.totalCalls += stats.calls;
      result.totalSuccesses += stats.successes;
      result.totalFailures += stats.failures;
      
      result.keys.push({
        id: keyId,
        ...stats,
        successRate: stats.calls > 0 ? Math.round((stats.successes / stats.calls) * 100) : 100
      });
    }
    
    return result;
  },
  
  hasKeys() {
    return DEAPI_KEYS.length > 0;
  }
};

// Initialize the key manager
deapiKeyManager.init();

// =====================
// Image Generation Config
// =====================

export const IMG_ASPECT_RATIOS = {
  "1:1": { width: 768, height: 768, icon: "⬜", label: "Square" },
  "4:3": { width: 896, height: 672, icon: "🖼️", label: "Landscape" },
  "3:4": { width: 672, height: 896, icon: "📱", label: "Portrait" },
  "16:9": { width: 1024, height: 576, icon: "🎬", label: "Widescreen" },
  "9:16": { width: 576, height: 1024, icon: "📲", label: "Story" },
  "3:2": { width: 864, height: 576, icon: "📷", label: "Photo" }
};

// NSFW detection
const NSFW_KEYWORDS = /\b(nsfw|nude|naked|sex|porn|hentai|lewd|erotic|xxx|boob|tit|ass|dick|cock|pussy|vagina|penis|breast|nipple|butt|thigh|bikini|lingerie|underwear|bra|panties|topless|bottomless|strip|seduc|horny|kinky|fetish|bondage|bdsm|dominat|submissive|spank|whip|latex|leather|corset|stockings|garter|cleavage|curvy|thicc|busty|milf|waifu|ahegao|ecchi)\b/i;

export function isNsfwPrompt(prompt) {
  return NSFW_KEYWORDS.test(prompt);
}

// =====================
// Safe Mode
// =====================

export function shouldEnforceSafeMode(userId) {
  const user = getUserRecord(userId);
  if (!user) return true;
  
  if (OWNER_IDS.has(String(userId))) return false;
  if (user.tier === 'free') return true;
  
  return user.imagePrefs?.safeMode !== false;
}

export function canToggleSafeMode(userId) {
  const user = getUserRecord(userId);
  if (!user) return false;
  
  if (OWNER_IDS.has(String(userId))) return true;
  return user.tier === 'premium' || user.tier === 'ultra';
}

// =====================
// Taglines
// =====================

const IMAGE_GEN_TAGLINES = {
  common: [
    "Ludicrous Minds™", "Definitely Not Magic™", "Fancy Math™", "Trust Us Bro™",
    "Vibes and Electricity™", "Trust The Process™", "Neural Nonsense™",
    "Creative Overconfidence™", "Pixels and Hope™", "AI Goes Brrrr™"
  ],
  rare: [
    "Digital Voodoo™", "Chaos Engine™", "Questionable Genius™", "Hallucinations™",
    "Visual Lies™", "Controlled Chaos™", "Beautiful Accidents™"
  ],
  legendary: [
    "The Void™", "The Abyss Stares Back™", "Entropy Wins™", "The Algorithm Decides™"
  ],
  nsfw: [
    "Lewd Thoughts™", "Bonk™", "Down Bad™", "Research Purposes™"
  ]
};

export function getRandomTagline(prompt = '') {
  if (prompt && isNsfwPrompt(prompt)) {
    const nsfwTaglines = IMAGE_GEN_TAGLINES.nsfw;
    return nsfwTaglines[Math.floor(Math.random() * nsfwTaglines.length)];
  }
  
  const roll = Math.random() * 100;
  let tier;
  
  if (roll < 70) tier = 'common';
  else if (roll < 95) tier = 'rare';
  else tier = 'legendary';
  
  const taglines = IMAGE_GEN_TAGLINES[tier];
  return taglines[Math.floor(Math.random() * taglines.length)];
}

// =====================
// Image Generation
// =====================

export async function generateFluxImage(prompt, aspectRatio, userId, retryCount = 0) {
  const config = IMG_ASPECT_RATIOS[aspectRatio] || IMG_ASPECT_RATIOS["1:1"];
  const steps = 4;
  
  const apiKey = deapiKeyManager.getNextKey();
  if (!apiKey) {
    throw new Error("No DeAPI keys configured");
  }
  
  const keyId = deapiKeyManager.getKeyId(apiKey);
  console.log(`[IMG/Flux] Using DeAPI key ${keyId} for user ${userId}`);
  
  try {
    // Submit request
    const submitResponse = await fetch("https://api.deapi.ai/api/v1/client/txt2img", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        prompt: prompt,
        model: "Flux1schnell",
        width: config.width,
        height: config.height,
        steps: steps,
        seed: Math.floor(Math.random() * 4294967295),
        negative_prompt: ""
      })
    });
    
    if (!submitResponse.ok) {
      const errorText = await submitResponse.text();
      const error = new Error(`DeAPI submit error (${submitResponse.status}): ${errorText}`);
      
      const isQuotaError = submitResponse.status === 402 || 
                          submitResponse.status === 429 || 
                          errorText.toLowerCase().includes('credit');
      
      deapiKeyManager.recordFailure(apiKey, error);
      
      if (isQuotaError && retryCount < DEAPI_KEYS.length - 1) {
        console.log(`[IMG/Flux] Key ${keyId} quota error, trying next key...`);
        return generateFluxImage(prompt, aspectRatio, userId, retryCount + 1);
      }
      
      throw error;
    }
    
    const submitData = await submitResponse.json();
    const requestId = submitData?.data?.request_id;
    
    if (!requestId) {
      throw new Error("No request_id returned from DeAPI");
    }
    
    console.log(`[IMG/Flux] Submitted request ${requestId} for user ${userId}`);
    
    // Poll for result
    let imageUrl = null;
    let attempts = 0;
    const maxAttempts = 30;
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const statusResponse = await fetch(
        `https://api.deapi.ai/api/v1/client/request-status/${requestId}`,
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Accept": "application/json"
          }
        }
      );
      
      if (!statusResponse.ok) {
        attempts++;
        continue;
      }
      
      const statusData = await statusResponse.json();
      const status = statusData?.data?.status || statusData?.status;
      
      if (status === "done" || status === "completed" || status === "success") {
        imageUrl = statusData?.data?.result_url ||
                   statusData?.data?.result?.url ||
                   statusData?.data?.url ||
                   (Array.isArray(statusData?.data?.images) ? statusData.data.images[0] : null);
        break;
      } else if (status === "error" || status === "failed") {
        throw new Error(statusData?.data?.error || "Image generation failed");
      }
      
      attempts++;
    }
    
    if (!imageUrl) {
      throw new Error("Timeout waiting for image generation");
    }
    
    // Download the image
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to download image: ${imageResponse.status}`);
    }
    
    deapiKeyManager.recordSuccess(apiKey);
    console.log(`[IMG/Flux] Successfully generated image using key ${keyId}`);
    
    const buffer = Buffer.from(await imageResponse.arrayBuffer());
    return { buffer, url: imageUrl };
    
  } catch (error) {
    deapiKeyManager.recordFailure(apiKey, error);
    throw error;
  }
}
