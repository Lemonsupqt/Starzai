/**
 * config/env.js
 * Auto-extracted from index.js
 */

// =====================
// ENV and DeAPI
// Lines 1-315 from original index.js
// =====================

/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                              STARZAI BOT v2.0                                  ║
 * ║                         Telegram AI Assistant Bot                              ║
 * ╠═══════════════════════════════════════════════════════════════════════════════╣
 * ║  Author: Lemonsupqt                                                           ║
 * ║  Lines: 20,461 | Sections: 47 | Last Updated: Jan 2026                        ║
 * ╠═══════════════════════════════════════════════════════════════════════════════╣
 * ║  ⚠️  AI AGENTS: Read CONTRIBUTING.md before making changes!                    ║
 * ║  ⚠️  Update this TOC and ARCHITECTURE.md after any modifications!             ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 *
 * ┌─────────────────────────────────────────────────────────────────────────────────┐
 * │                            TABLE OF CONTENTS                                    │
 * │                     (Use Ctrl+G in VS Code to jump to line)                     │
 * ├─────────┬───────────────────────────────────────────────────────────────────────┤
 * │  LINE   │  SECTION                                                              │
 * ├─────────┼───────────────────────────────────────────────────────────────────────┤
 * │         │  ═══ CONFIGURATION ═══                                                │
 * │    62   │  ENV - Environment variables, API keys, model configs                 │
 * │         │                                                                       │
 * │         │  ═══ CORE SYSTEMS ═══                                                 │
 * │   367   │  BOT + LLM - Bot initialization                                       │
 * │   380   │  MULTI-PROVIDER LLM SYSTEM - GitHub Models + MegaLLM fallback         │
 * │   770   │  TELEGRAM CHANNEL STORAGE - Persistent data in Telegram channel       │
 * │   807   │  SUPABASE STORAGE - Primary database persistence                      │
 * │  1118   │  IN-MEMORY STATE - Runtime caches and session data                    │
 * │         │                                                                       │
 * │         │  ═══ MIDDLEWARE ═══                                                   │
 * │  1211   │  RATE LIMIT - Per-user rate limiting                                  │
 * │  1333   │  ANTI-SPAM SYSTEM - Spam detection and prevention                     │
 * │  1599   │  GROUP ACTIVATION SYSTEM - Dormant mode for groups                    │
 * │  1783   │  CONCURRENT PROCESSING - Parallel request handling                    │
 * │         │                                                                       │
 * │         │  ═══ USER MANAGEMENT ═══                                              │
 * │  1632   │  USER + ACCESS CONTROL - User tiers, bans, permissions                │
 * │         │                                                                       │
 * │         │  ═══ FEATURES ═══                                                     │
 * │  2063   │  PARTNER MANAGEMENT - AI companion system                             │
 * │  2145   │  CHARACTER MODE - Quick character roleplay                            │
 * │  2290   │  INLINE SESSION MANAGEMENT - Inline mode sessions                     │
 * │  2338   │  HISTORY (DM/Group) - Chat history management                         │
 * │  2351   │  LLM HELPERS - Text generation, vision, streaming                     │
 * │  2701   │  VIDEO PROCESSING - Frame extraction, transcription                   │
 * │  2819   │  WEB SEARCH - Multi-engine search (SearXNG, DDG, Parallel)            │
 * │  5007   │  IMAGE GENERATION - DeAPI integration                                 │
 * │  6799   │  TODO SYSTEM - Personal task management                               │
 * │  7534   │  COLLAB TODO - Collaborative task system                              │
 * │  14940  │  VIDEO SUMMARIZATION - AI video analysis                              │
 * │         │                                                                       │
 * │         │  ═══ UTILITIES ═══                                                    │
 * │  3515   │  MARKDOWN CONVERTER - AI output to Telegram HTML                      │
 * │  3719   │  PARALLEL EXTRACT API - URL content extraction                        │
 * │  3802   │  UI HELPERS - Menus, keyboards, messages                              │
 * │  4133   │  INLINE CHAT UI - Inline chat interface                               │
 * │  4207   │  SETTINGS KEYBOARDS - Model selection menus                           │
 * │ 11143   │  MODEL CATEGORY HELPERS - Tier-based model access                     │
 * │         │                                                                       │
 * │         │  ═══ COMMANDS ═══                                                     │
 * │  4341   │  COMMANDS - All bot commands (/start, /help, /model, etc.)            │
 * │ 11285   │  OWNER COMMANDS - Admin commands (/grant, /ban, /status, etc.)        │
 * │         │                                                                       │
 * │         │  ═══ CALLBACK HANDLERS ═══                                            │
 * │  8957   │  TODO CALLBACKS - Task management buttons                             │
 * │  9885   │  COLLAB TODO CALLBACKS - Collaborative task buttons                   │
 * │ 12648   │  MENU CALLBACKS - Main menu navigation                                │
 * │ 13174   │  LEGACY CALLBACKS - Backwards compatibility                           │
 * │ 13383   │  INLINE CHAT CALLBACKS - Inline chat buttons                          │
 * │ 13563   │  SETTINGS CALLBACKS - Model selection buttons                         │
 * │ 13704   │  SHARED CHAT CALLBACKS - Multi-user inline chat                       │
 * │ 13746   │  INLINE SETTINGS CALLBACKS - Inline model selection                   │
 * │         │                                                                       │
 * │         │  ═══ MESSAGE HANDLERS ═══                                             │
 * │ 13893   │  WEBAPP DATA HANDLER - Mini app data processing                       │
 * │ 14021   │  DM / GROUP TEXT - Main message handler                               │
 * │ 14784   │  PHOTO HANDLER - Image processing                                     │
 * │         │                                                                       │
 * │         │  ═══ INLINE MODE ═══                                                  │
 * │ 15361   │  INLINE MODE - Interactive inline queries                             │
 * │ 18245   │  CHOSEN INLINE RESULT - Post-selection handling                       │
 * │ 19917   │  INLINE BUTTON ACTIONS - Inline keyboard callbacks                    │
 * │ 20360   │  INLINE CACHE CLEANUP - TTL management                                │
 * │         │                                                                       │
 * │         │  ═══ SERVER ═══                                                       │
 * │ 20383   │  WEBHOOK SERVER - Railway deployment                                  │
 * └─────────┴───────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────────────┐
 * │                              ARCHITECTURE NOTES                                 │
 * ├─────────────────────────────────────────────────────────────────────────────────┤
 * │  • Reference modules are in src/ folder (for code navigation)                  │
 * │  • See ARCHITECTURE.md for detailed documentation                              │
 * │  • New features should be added as modules in src/ then imported here          │
 * │  • Use // @SECTION: NAME comments for IDE navigation                           │
 * └─────────────────────────────────────────────────────────────────────────────────┘
 */

import { Bot, InlineKeyboard, InputFile, webhookCallback } from "grammy";
import http from "http";
import OpenAI from "openai";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { exec } from "child_process";

// Super Utilities Module (27 features)
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
} from './src/features/super-utilities.js';
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

