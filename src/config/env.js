/**
 * config/env.js
 * Auto-extracted from index.js
 */

// =====================
// ENV and DeAPI
// Lines 1-315 from original index.js
// =====================

import { Bot, InlineKeyboard, InputFile, webhookCallback } from "grammy";
import http from "http";
import OpenAI from "openai";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
const execAsync = promisify(exec);

// =====================
// ENV
// =====================
const BOT_TOKEN = process.env.BOT_TOKEN;
const MEGALLM_API_KEY = process.env.MEGALLM_API_KEY;
const GITHUB_PAT = process.env.GITHUB_PAT || "";
const PUBLIC_URL = process.env.PUBLIC_URL; // e.g. https://xxxxx.up.railway.app
const PORT = Number(process.env.PORT || 3000);

const RATE_LIMIT_PER_MINUTE = Number(process.env.RATE_LIMIT_PER_MINUTE || 30);

// Model access rules (paste real MegaLLM model IDs here via Railway variables)
function parseCsvEnv(name, fallback = "") {
  const raw = (process.env[name] ?? fallback).trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

// MegaLLM models (existing)
const FREE_MODELS = parseCsvEnv("FREE_MODELS");
const PREMIUM_MODELS = parseCsvEnv("PREMIUM_MODELS");
const ULTRA_MODELS = parseCsvEnv("ULTRA_MODELS"); // optional, can be empty

// GitHub Models (new - optional)
// One GITHUB_PAT token works for all models with models:read permission
const GITHUB_FREE_MODELS = parseCsvEnv("GITHUB_FREE_MODELS", "openai/gpt-4.1-nano,openai/gpt-5-nano");
const GITHUB_PREMIUM_MODELS = parseCsvEnv("GITHUB_PREMIUM_MODELS", "openai/gpt-5-mini,openai/gpt-5");
const GITHUB_ULTRA_MODELS = parseCsvEnv("GITHUB_ULTRA_MODELS", "openai/gpt-5-chat");

const DEFAULT_FREE_MODEL =
  (process.env.DEFAULT_FREE_MODEL || FREE_MODELS[0] || "").trim();
const DEFAULT_PREMIUM_MODEL =
  (process.env.DEFAULT_PREMIUM_MODEL || PREMIUM_MODELS[0] || DEFAULT_FREE_MODEL || "").trim();
const DEFAULT_ULTRA_MODEL =
  (process.env.DEFAULT_ULTRA_MODEL || ULTRA_MODELS[0] || DEFAULT_PREMIUM_MODEL || DEFAULT_FREE_MODEL || "").trim();

function allModelsForTier(tier) {
  // Combine MegaLLM and GitHub Models for each tier
  if (tier === "ultra") {
    return [
      ...FREE_MODELS, ...PREMIUM_MODELS, ...ULTRA_MODELS,
      ...GITHUB_FREE_MODELS, ...GITHUB_PREMIUM_MODELS, ...GITHUB_ULTRA_MODELS
    ];
  }
  if (tier === "premium") {
    return [
      ...FREE_MODELS, ...PREMIUM_MODELS,
      ...GITHUB_FREE_MODELS, ...GITHUB_PREMIUM_MODELS
    ];
  }
  return [...FREE_MODELS, ...GITHUB_FREE_MODELS];
}

// MODEL_VISION is optional - all MegaLLM models support vision, so user's selected model is used
const MODEL_VISION = process.env.MODEL_VISION || ""; // kept for backward compatibility

const OWNER_IDS = new Set(
  (process.env.OWNER_IDS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
);

// Telegram channel for persistent storage (optional but recommended)
const STORAGE_CHANNEL_ID = process.env.STORAGE_CHANNEL_ID || "";

// Supabase for permanent persistent storage (recommended)
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_KEY || "";

// Optional: Parallel AI Search / Extract API key for web search integration
const PARALLEL_API_KEY = process.env.PARALLEL_API_KEY || "";

const FEEDBACK_CHAT_ID = process.env.FEEDBACK_CHAT_ID || "";

// DeAPI for image generation (ZImageTurbo)
// Supports multiple API keys separated by commas for load balancing and failover
const DEAPI_KEYS_RAW = process.env.DEAPI_KEY || "";
const DEAPI_KEYS = DEAPI_KEYS_RAW
  .split(",")
  .map(k => k.trim())
  .filter(Boolean);

// DeAPI Multi-Key Manager
const deapiKeyManager = {
  currentIndex: 0,
  keyStats: new Map(), // key -> { calls, successes, failures, lastUsed, lastError, disabled, credits }
  totalImageGenerations: 0, // Persistent total across restarts
  
  // Initialize stats for all keys
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
  
  // Load persistent stats from data
  loadStats(data) {
    if (data?.totalImageGenerations) {
      this.totalImageGenerations = data.totalImageGenerations;
      console.log(`[DeAPI] Loaded ${this.totalImageGenerations} total image generations from storage`);
    }
  },
  
  // Get persistent stats for saving
  getPersistentStats() {
    return {
      totalImageGenerations: this.totalImageGenerations
    };
  },
  
  // Get a short identifier for a key (first 8 chars)
  getKeyId(key) {
    return key.slice(0, 8) + '...';
  },
  
  // Get the next available key (round-robin with failover)
  getNextKey() {
    if (DEAPI_KEYS.length === 0) return null;
    
    const now = Date.now();
    let attempts = 0;
    
    while (attempts < DEAPI_KEYS.length) {
      const key = DEAPI_KEYS[this.currentIndex];
      const keyId = this.getKeyId(key);
      const stats = this.keyStats.get(keyId);
      
      // Move to next key for next call (round-robin)
      this.currentIndex = (this.currentIndex + 1) % DEAPI_KEYS.length;
      
      // Check if key is temporarily disabled
      if (stats?.disabled) {
        if (stats.disabledUntil && now > stats.disabledUntil) {
          // Re-enable the key after cooldown
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
    
    // All keys are disabled, return the first one anyway (will likely fail but gives user feedback)
    console.warn('[DeAPI] All keys disabled, using first key as fallback');
    return DEAPI_KEYS[0];
  },
  
  // Record a successful API call
  recordSuccess(key) {
    const keyId = this.getKeyId(key);
    const stats = this.keyStats.get(keyId);
    if (stats) {
      stats.calls++;
      stats.successes++;
      stats.lastUsed = Date.now();
      stats.consecutiveFailures = 0;
    }
    // Increment persistent total and schedule save
    this.totalImageGenerations++;
    if (typeof scheduleSave === 'function') {
      scheduleSave('imageStats', 'normal');
    }
  },
  
  // Record a failed API call
  recordFailure(key, error) {
    const keyId = this.getKeyId(key);
    const stats = this.keyStats.get(keyId);
    if (stats) {
      stats.calls++;
      stats.failures++;
      stats.lastUsed = Date.now();
      stats.lastError = error?.message || String(error);
      stats.consecutiveFailures++;
      
      // Disable key temporarily after 3 consecutive failures
      if (stats.consecutiveFailures >= 3) {
        stats.disabled = true;
        stats.disabledUntil = Date.now() + (5 * 60 * 1000); // 5 minute cooldown
        console.warn(`[DeAPI] Disabled key ${keyId} for 5 minutes after ${stats.consecutiveFailures} consecutive failures`);
      }
    }
  },
  
  // Fetch balance for a specific key
  async fetchBalance(key) {
    try {
      const response = await fetch('https://api.deapi.ai/api/v1/client/balance', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${key}`,
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        console.warn(`[DeAPI] Failed to fetch balance for key ${this.getKeyId(key)}: ${response.status}`);
        return null;
      }
      
      const data = await response.json();
      // Handle various response formats
      const balance = data?.data?.balance ?? data?.balance ?? data?.credits ?? data?.data?.credits ?? null;
      return balance;
    } catch (error) {
      console.warn(`[DeAPI] Error fetching balance for key ${this.getKeyId(key)}:`, error.message);
      return null;
    }
  },
  
  // Fetch balances for all keys
  async fetchAllBalances() {
    const balances = new Map();
    
    for (const key of DEAPI_KEYS) {
      const keyId = this.getKeyId(key);
      const balance = await this.fetchBalance(key);
      balances.set(keyId, balance);
      
      // Update stats with balance
      const stats = this.keyStats.get(keyId);
      if (stats) {
        stats.balance = balance;
        stats.balanceUpdatedAt = Date.now();
      }
    }
    
    return balances;
  },
  
  // Get stats for owner status command
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
  
  // Get stats with fresh balances (async version)
  async getStatsWithBalances() {
    // Fetch fresh balances
    await this.fetchAllBalances();
    return this.getStats();
  },
  
  // Check if any keys are available
  hasKeys() {
    return DEAPI_KEYS.length > 0;
  }
};

// Initialize the key manager
deapiKeyManager.init();

// Legacy compatibility - returns first key or empty string
const DEAPI_KEY = DEAPI_KEYS[0] || "";

if (!BOT_TOKEN) throw new Error("Missing BOT_TOKEN");
if (!MEGALLM_API_KEY) throw new Error("Missing MEGALLM_API_KEY");
if (!GITHUB_PAT) console.warn("⚠️  GITHUB_PAT not set - GitHub Models will be unavailable");


