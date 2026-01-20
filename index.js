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
import fetch from "node-fetch";

// Super Utilities Module (27 features)
import {
  downloadMedia,
  cleanupDownload,
  detectPlatform,
  URL_PATTERNS,
  getLyrics,
  searchMusic,
  getSongById,
  downloadMusic,
  searchMedia,
  getMediaDetails,
  getTrailers,
  generateQR,
  scanQR,
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

// HF Space Image Generation
import {
  startImageGeneration,
  handleImageCallback,
  quickGenerate,
  checkHealth as checkHFHealth
} from './src/features/hf-imagegen.js';

// ComfyUI Image Generation (Hivenet)
import {
  startHivenetGeneration,
  handleHivenetCallback,
  quickHivenetGenerate,
  checkHivenetHealth,
  MODELS as HIVENET_MODELS
} from './src/features/comfyui-imagegen.js';

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
if (!GITHUB_PAT) console.warn("⚠️  GITHUB_PAT not set - GITHUB Models will be unavailable");

// =====================
// QR THEMES & SETTINGS HELPERS
// =====================

const QR_THEMES = {
  classic: {
    key: "classic",
    label: "Classic",
    icon: "⬛⬜",
    description: "High-contrast black on white. Maximum compatibility.",
    dark: "#000000",
    light: "#ffffff",
    width: 2048,
    errorCorrectionLevel: "L",
    margin: 4,
  },
  midnight: {
    key: "midnight",
    label: "Midnight Neon",
    icon: "🌌",
    description: "Cyan code on deep navy background.",
    dark: "#00ffff",
    light: "#020617",
    width: 2048,
    errorCorrectionLevel: "Q",
    margin: 4,
  },
  sunset: {
    key: "sunset",
    label: "Sunset",
    icon: "🌅",
    description: "Warm orange on dark plum.",
    dark: "#f97316",
    light: "#111827",
    width: 2048,
    errorCorrectionLevel: "Q",
    margin: 4,
  },
  emerald: {
    key: "emerald",
    label: "Emerald Matrix",
    icon: "💚",
    description: "Matrix-style green on near-black.",
    dark: "#22c55e",
    light: "#020617",
    width: 2048,
    errorCorrectionLevel: "Q",
    margin: 4,
  },
  blossom: {
    key: "blossom",
    label: "Blush Blossom",
    icon: "🌸",
    description: "Soft rose on pale cream.",
    dark: "#be123c",
    light: "#fff7ed",
    width: 2048,
    errorCorrectionLevel: "M",
    margin: 4,
  },
  ice: {
    key: "ice",
    label: "Ice Glass",
    icon: "🧊",
    description: "Cool blue on very light gray.",
    dark: "#1d4ed8",
    light: "#f9fafb",
    width: 2048,
    errorCorrectionLevel: "M",
    margin: 4,
  },
};

function getUserQrPrefs(userId) {
  const user = getUserRecord(userId);
  const base = user?.qrPrefs || {};
  const themeKey = base.theme && QR_THEMES[base.theme] ? base.theme : "classic";
  const theme = QR_THEMES[themeKey];
  const logoEnabled = base.logoEnabled === true;
  const reencodeOnScan = base.reencodeOnScan !== false; // default: true
  const artMode = base.artMode === true; // default: false
  return {
    themeKey,
    theme,
    size: base.size || theme.width || 2048,
    errorCorrectionLevel:
      base.errorCorrectionLevel || theme.errorCorrectionLevel || "L",
    margin: base.margin ?? theme.margin ?? 4,
    logoEnabled,
    reencodeOnScan,
    artMode,
  };
}

// Build text + keyboard for /qs and callbacks, and persist normalized prefs
function buildQrSettingsView(userId) {
  const prefs = getUserQrPrefs(userId);
  const user = getUserRecord(userId);
  user.qrPrefs = user.qrPrefs || {};
  user.qrPrefs.theme = prefs.themeKey;
  user.qrPrefs.size = prefs.size;
  user.qrPrefs.errorCorrectionLevel = prefs.errorCorrectionLevel;
  user.qrPrefs.margin = prefs.margin;
  user.qrPrefs.logoEnabled = prefs.logoEnabled;
  user.qrPrefs.reencodeOnScan = prefs.reencodeOnScan;
  user.qrPrefs.artMode = prefs.artMode;
  saveUsers();

  const theme = prefs.theme;
  const lines = [];

  lines.push("🎨 <b>QR Settings</b>");
  lines.push("");
  lines.push(`Theme: ${theme.icon} <b>${escapeHTML(theme.label)}</b>`);
  lines.push(
    `Size: <code>${prefs.size}×${prefs.size}</code> • Error correction: <b>${escapeHTML(
      prefs.errorCorrectionLevel
    )}</b>`
  );
  lines.push(`Quiet zone (margin modules): <code>${prefs.margin}</code>`);
  lines.push("");
  lines.push("<b>Overlay & Art</b>");
  lines.push(
    `• Logo overlay: <b>${prefs.logoEnabled ? "On (center logo)" : "Off"}</b>`
  );
  lines.push(
    `• Art mode: <b>${prefs.artMode ? "On (dot-style art QR)" : "Off"}</b>`
  );
  lines.push(
    `• Re-encode on scan: <b>${
      prefs.reencodeOnScan ? "On (rebuild scanned QR with these settings)" : "Off"
    }</b>`
  );
  lines.push("");
  lines.push(
    "<i>Art mode renders a dot-style QR over your image from <code>/qa</code> (full art kept visible). "
    + "Logo overlay and art mode are mutually exclusive to keep codes scannable.</i>"
  );
  lines.push("");
  lines.push("<b>Themes</b>");

  Object.values(QR_THEMES).forEach((t) => {
    const isCurrent = t.key === prefs.themeKey;
    const prefix = isCurrent ? "✅" : "▫️";
    lines.push(
      `${prefix} ${t.icon} <b>${escapeHTML(t.label)}</b> – ${escapeHTML(
        t.description
      )}`
    );
  });

  lines.push("");
  lines.push(
    "Use the buttons below to open each section: themes, resolution, error correction, overlays, and scan behaviour."
  );

  const kb = new InlineKeyboard();

  // Main QR settings menu (compact, multi-section)
  kb
    .text("🎨 Themes", "qs_menu:themes")
    .text("📐 Resolution", "qs_menu:size")
    .row()
    .text("🛡️ Error correction", "qs_menu:ec")
    .row()
    .text("✨ Overlay & Art", "qs_menu:overlay")
    .text("📸 Scan behaviour", "qs_menu:scan")
    .row()
    .text("↩️ Reset", "qs_reset");

  return { text: lines.join("\n"), keyboard: kb, prefs };
}

// Sub-view: Theme selection
function buildQrThemesView(userId) {
  const prefs = getUserQrPrefs(userId);
  const theme = prefs.theme;

  const lines = [];
  lines.push("🎨 <b>QR Themes</b>");
  lines.push("");
  lines.push(
    `Current theme: ${theme.icon} <b>${escapeHTML(theme.label)}</b>`
  );
  lines.push("");

  Object.values(QR_THEMES).forEach((t) => {
    const isCurrent = t.key === prefs.themeKey;
    const prefix = isCurrent ? "✅" : "▫️";
    lines.push(
      `${prefix} ${t.icon} <b>${escapeHTML(t.label)}</b> – ${escapeHTML(
        t.description
      )}`
    );
  });

  lines.push("");
  lines.push("<i>Tap a theme below, or go back to the main QR settings menu.</i>");

  const kb = new InlineKeyboard();
  const themes = Object.values(QR_THEMES);
  for (let i = 0; i < themes.length; i += 2) {
    const t1 = themes[i];
    const label1 =
      (t1.key === prefs.themeKey ? "✅ " : "") + `${t1.icon} ${t1.label}`;
    kb.text(label1, `qs_theme:${t1.key}`);
    if (themes[i + 1]) {
      const t2 = themes[i + 1];
      const label2 =
        (t2.key === prefs.themeKey ? "✅ " : "") + `${t2.icon} ${t2.label}`;
      kb.text(label2, `qs_theme:${t2.key}`);
    }
    kb.row();
  }
  kb.text("⬅ Back", "qs_menu:main");

  return { text: lines.join("\n"), keyboard: kb, prefs };
}

// Sub-view: Resolution (size)
function buildQrSizeView(userId) {
  const prefs = getUserQrPrefs(userId);

  const lines = [];
  lines.push("📐 <b>QR Resolution</b>");
  lines.push("");
  lines.push(
    `Current size: <code>${prefs.size}×${prefs.size}</code>`
  );
  lines.push(`Quiet zone (margin modules): <code>${prefs.margin}</code>`);
  lines.push("");
  lines.push(
    "<i>Bigger sizes are easier to scan, but produce larger files.</i>"
  );

  const kb = new InlineKeyboard();
  const sizes = [1024, 2048, 4096];
  const sizeLabels = {
    1024: "🔹 1024",
    2048: "🔸 2048",
    4096: "💎 4096",
  };
  sizes.forEach((s) => {
    const active = prefs.size === s;
    kb.text(active ? `✅ ${sizeLabels[s]}` : sizeLabels[s], `qs_size:${s}`);
  });
  kb.row();
  kb.text("⬅ Back", "qs_menu:main");

  return { text: lines.join("\n"), keyboard: kb, prefs };
}

// Sub-view: Error correction level
function buildQrEcView(userId) {
  const prefs = getUserQrPrefs(userId);

  const lines = [];
  lines.push("🛡️ <b>Error Correction</b>");
  lines.push("");
  lines.push(
    `Current level: <b>${escapeHTML(prefs.errorCorrectionLevel)}</b>`
  );
  lines.push("");
  lines.push("• ⚡ L – Lowest redundancy, smallest code");
  lines.push("• ⭐ M – Balanced for most use-cases");
  lines.push("• 🛡️ Q – High redundancy (better for art / logos)");
  lines.push("• 💎 H – Maximum redundancy, densest code");
  lines.push("");
  lines.push("<i>Higher levels survive more distortion but require more pixels.</i>");

  const kb = new InlineKeyboard();
  const levels = ["L", "M", "Q", "H"];
  levels.forEach((lvl) => {
    const active = prefs.errorCorrectionLevel === lvl;
    const emoji =
      lvl === "L"
        ? "⚡"
        : lvl === "M"
        ? "⭐"
        : lvl === "Q"
        ? "🛡️"
        : "💎";
    kb.text(
      active ? `✅ ${emoji} ${lvl}` : `${emoji} ${lvl}`,
      `qs_level:${lvl}`
    );
  });
  kb.row();
  kb.text("⬅ Back", "qs_menu:main");

  return { text: lines.join("\n"), keyboard: kb, prefs };
}

// Sub-view: Overlay & Art
function buildQrOverlayView(userId) {
  const prefs = getUserQrPrefs(userId);

  const lines = [];
  lines.push("✨ <b>Overlay & Art</b>");
  lines.push("");
  lines.push(
    `Logo overlay: <b>${prefs.logoEnabled ? "On (center logo)" : "Off"}</b>`
  );
  lines.push(
    `Art mode: <b>${prefs.artMode ? "On (dot-style art QR)" : "Off"}</b>`
  );
  lines.push("");
  lines.push(
    "<i>Logo overlay uses the image set with <code>/qrlogo</code> in the center.</i>"
  );
  lines.push(
    "<i>Art mode uses the image from <code>/qa</code> to color dot-style modules on a clean background.</i>"
  );
  lines.push(
    "<i>To keep codes scannable, logo overlay and art mode cannot be enabled together.</i>"
  );

  const kb = new InlineKeyboard();
  const logoLabel = prefs.logoEnabled
    ? "✅ Logo overlay: On"
    : "✨ Logo overlay: Off";
  const artLabel = prefs.artMode ? "🎨 Art mode: On" : "🎨 Art mode: Off";

  kb.text(logoLabel, `qs_logo:${prefs.logoEnabled ? "0" : "1"}`).row();
  kb.text(artLabel, `qs_art:${prefs.artMode ? "0" : "1"}`).row();
  kb.text("⬅ Back", "qs_menu:main");

  return { text: lines.join("\n"), keyboard: kb, prefs };
}

// Sub-view: Scan behaviour (re-encode)
function buildQrScanView(userId) {
  const prefs = getUserQrPrefs(userId);

  const lines = [];
  lines.push("📸 <b>Scan Behaviour</b>");
  lines.push("");
  lines.push(
    `Re-encode on scan: <b>${
      prefs.reencodeOnScan ? "On" : "Off"
    }</b>`
  );
  lines.push("");
  lines.push(
    "<i>When enabled, sending a QR photo will re-scan and rebuild it with your current theme, size, and art settings.</i>"
  );

  const kb = new InlineKeyboard();
  const reLabel = prefs.reencodeOnScan
    ? "✅ Re-encode on scan: On"
    : "📸 Re-encode on scan: Off";
  kb.text(reLabel, `qs_reencode:${prefs.reencodeOnScan ? "0" : "1"}`).row();
  kb.text("⬅ Back", "qs_menu:main");

  return { text: lines.join("\n"), keyboard: kb, prefs };
}

// Adjust error correction when using logo overlay or art mode that disturbs central modules
function getEffectiveQrErrorCorrection(level, needsHighEc) {
  const order = ["L", "M", "Q", "H"];
  const requested = (level || "L").toUpperCase();
  const idx = order.indexOf(requested);
  const baseLevel = idx === -1 ? "L" : order[idx];
  if (!needsHighEc) return baseLevel;
  // With visual overlays, require at least Q-level error correction
  const minIndexForOverlay = 2; // Q
  const effectiveIdx = Math.max(order.indexOf(baseLevel), minIndexForOverlay);
  return order[effectiveIdx];
}

// Fetch QR logo buffer from Telegram (center logo)
async function getQrLogoBuffer(botApi) {
  if (!prefsDb.qrLogo || !prefsDb.qrLogo.fileId) {
    return null;
  }
  try {
    const file = await botApi.getFile(prefsDb.qrLogo.fileId);
    const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;
    const response = await fetch(fileUrl);
    return await response.buffer();
  } catch (e) {
    console.error("QR logo fetch error:", e);
    return null;
  }
}

// Fetch QR art background buffer from Telegram (full-canvas art)
async function getQrArtBuffer(botApi) {
  if (!prefsDb.qrArt || !prefsDb.qrArt.fileId) {
    return null;
  }
  try {
    const file = await botApi.getFile(prefsDb.qrArt.fileId);
    const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;
    const response = await fetch(fileUrl);
    return await response.buffer();
  } catch (e) {
    console.error("QR art fetch error:", e);
    return null;
  }
}

// Render QR with centered logo overlay, matching theme colors
// Smart mode: keep underlying QR modules partially visible (QArt-style) to aid scanners.
async function renderQrWithLogo(qrBuffer, theme, botApi) {
  try {
    const logoBuffer = await getQrLogoBuffer(botApi);
    if (!logoBuffer) return qrBuffer;

    const { createCanvas, loadImage } = await import("canvas");
    const qrImg = await loadImage(qrBuffer);
    const logoImg = await loadImage(logoBuffer);

    const size = qrImg.width;
    const canvas = createCanvas(size, size);
    const ctx2d = canvas.getContext("2d");

    // Draw base QR
    ctx2d.drawImage(qrImg, 0, 0, size, size);

    // Logo sizing and position
    // Slightly smaller than before to avoid covering timing/alignment patterns too aggressively
    const logoScale = 0.18; // 18% of QR size
    const logoSize = Math.floor(size * logoScale);
    const x = Math.floor((size - logoSize) / 2);
    const y = Math.floor((size - logoSize) / 2);

    const radius = Math.floor(logoSize * 0.3);
    const bgColor = theme.light || "#ffffff";
    const borderColor = theme.dark || "#000000";
    const borderWidth = Math.max(3, Math.floor(size * 0.008));

    function drawRoundedRectPath(ctx, x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    }

    // Background pad: semi-transparent so QR modules remain partially visible (helps jsQR + other scanners)
    ctx2d.save();
    drawRoundedRectPath(ctx2d, x, y, logoSize, logoSize, radius);
    ctx2d.fillStyle = bgColor;
    ctx2d.globalAlpha = 0.78; // soften but do not erase underlying modules
    ctx2d.fill();
    ctx2d.globalAlpha = 1;
    ctx2d.lineWidth = borderWidth;
    ctx2d.strokeStyle = borderColor;
    ctx2d.stroke();
    ctx2d.restore();

    // Logo clipped inside slightly smaller rounded rect
    ctx2d.save();
    drawRoundedRectPath(
      ctx2d,
      x,
      y,
      logoSize,
      logoSize,
      Math.floor(radius * 0.9)
    );
    ctx2d.clip();
    ctx2d.globalAlpha = 0.96; // allow a hint of QR pattern to bleed through
    ctx2d.drawImage(logoImg, x, y, logoSize, logoSize);
    ctx2d.globalAlpha = 1;
    ctx2d.restore();

    return canvas.toBuffer("image/png");
  } catch (e) {
    console.error("QR logo overlay error:", e);
    return qrBuffer;
  }
}

// Helper: hex color → { r, g, b }
function hexToRgb(hex) {
  if (!hex) return { r: 0, g: 0, b: 0 };
  let clean = String(hex).trim();
  if (clean[0] === "#") clean = clean.slice(1);
  if (clean.length === 3) {
    clean = clean
      .split("")
      .map((ch) => ch + ch)
      .join("");
  }
  if (clean.length === 8) {
    // Drop alpha if present (#RRGGBBAA)
    clean = clean.slice(0, 6);
  }
  const num = parseInt(clean || "000000", 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return { r, g, b };
}

// Helper: relative luminance for contrast checks
function getLuminance(r, g, b) {
  const toLinear = (v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const R = toLinear(r);
  const G = toLinear(g);
  const B = toLinear(b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

// Core art renderer: generate a dot-style QR directly from data + theme + art,
// keeping the underlying image fully visible (KFC-style).
async function renderQrArtFromData(rawData, options, botApi) {
  const { theme, size: targetSize, margin, errorCorrectionLevel } = options;

  const { createCanvas, loadImage } = await import("canvas");
  const QRCodeModule = await import("qrcode");
  const QRCode = QRCodeModule.default || QRCodeModule;

  const ecc = (errorCorrectionLevel || "L").toUpperCase();
  const qr = QRCode.create(rawData, { errorCorrectionLevel: ecc });

  const modules = qr.modules;
  const n = modules.size;

  // Margin is specified in "module units"
  const marginModules =
    typeof margin === "number" && Number.isFinite(margin) ? Math.max(0, margin) : 4;
  const totalModules = n + marginModules * 2;

  const baseSize =
    (typeof targetSize === "number" && targetSize > 0
      ? targetSize
      : theme?.width) || 2048;

  let scale = Math.floor(baseSize / totalModules);
  if (scale < 1) scale = 1;

  const size = totalModules * scale;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");

  const darkRgb = hexToRgb(theme?.dark || "#000000");
  const lightRgb = hexToRgb(theme?.light || "#ffffff");

  // 1) Draw full-canvas art background
  const artBuffer =
    (await getQrArtBuffer(botApi)) || (await getQrLogoBuffer(botApi));
  if (artBuffer) {
    const artImg = await loadImage(artBuffer);

    // Optional circular mask for the art (KFC-style framing)
    ctx.save();
    const radius = size * 0.5;
    const cx0 = size / 2;
    const cy0 = size / 2;
    ctx.beginPath();
    ctx.arc(cx0, cy0, radius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    const artScale = Math.max(size / artImg.width, size / artImg.height);
    const w = artImg.width * artScale;
    const h = artImg.height * artScale;
    const dx = (size - w) / 2;
    const dy = (size - h) / 2;
    ctx.drawImage(artImg, dx, dy, w, h);
    ctx.restore();
  } else {
    // Fallback: simple themed gradient
    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, theme?.light || "#ffffff");
    grad.addColorStop(1, theme?.dark || "#000000");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }

  // 2) Soften the background slightly with a light wash to aid readability
  ctx.save();
  ctx.fillStyle = `rgb(${lightRgb.r},${lightRgb.g},${lightRgb.b})`;
  ctx.globalAlpha = 0.14;
  ctx.fillRect(0, 0, size, size);
  ctx.restore();

  // 3) Precompute art pixels for color sampling (from the already-drawn background)
  const bgData = ctx.getImageData(0, 0, size, size);
  const artPixels = bgData.data;

  function sampleArtColor(px, py) {
    const x = Math.max(0, Math.min(size - 1, Math.round(px)));
    const y = Math.max(0, Math.min(size - 1, Math.round(py)));
    const idx = (y * size + x) * 4;
    return {
      r: artPixels[idx],
      g: artPixels[idx + 1],
      b: artPixels[idx + 2],
    };
  }

  function mixWithThemeDark(sample) {
    // Blend so dots keep the image hue but stay distinctly dark.
    const mix = 0.45;
    let r = darkRgb.r * mix + sample.r * (1 - mix);
    let g = darkRgb.g * mix + sample.g * (1 - mix);
    let b = darkRgb.b * mix + sample.b * (1 - mix);

    const lumBg = getLuminance(lightRgb.r, lightRgb.g, lightRgb.b);
    const lumDot = getLuminance(r, g, b);

    // Cap brightness relative to the themed light background.
    const maxLum = Math.min(lumBg * 0.42, 0.42);

    if (lumDot > maxLum) {
      const factor = maxLum / (lumDot || 1);
      r *= factor;
      g *= factor;
      b *= factor;
    }

    return {
      r: Math.round(Math.max(0, Math.min(255, r))),
      g: Math.round(Math.max(0, Math.min(255, g))),
      b: Math.round(Math.max(0, Math.min(255, b))),
    };
  }

  function isInFinder(row, col) {
    const inTopLeft = row <= 6 && col <= 6;
    const inTopRight = row <= 6 && col >= n - 7;
    const inBottomLeft = row >= n - 7 && col <= 6;
    return inTopLeft || inTopRight || inBottomLeft;
  }

  // 4) Optional outer border around the QR region to separate it from background
  ctx.save();
  const qrPx = marginModules * scale;
  const qrSizePx = n * scale;
  ctx.strokeStyle = `rgba(${darkRgb.r},${darkRgb.g},${darkRgb.b},0.85)`;
  ctx.lineWidth = Math.max(2, Math.floor(scale * 0.4));
  ctx.strokeRect(qrPx - scale * 0.5, qrPx - scale * 0.5, qrSizePx + scale, qrSizePx + scale);
  ctx.restore();

  // 5) Draw modules as dots over the art background
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      if (!modules.get(row, col)) continue;

      const x = (marginModules + col) * scale;
      const y = (marginModules + row) * scale;
      const cx = x + scale / 2;
      const cy = y + scale / 2;

      // Finder patterns: keep them as solid squares, tinted but dark and opaque
      if (isInFinder(row, col)) {
        ctx.fillStyle = `rgb(${darkRgb.r},${darkRgb.g},${darkRgb.b})`;
        ctx.fillRect(x, y, scale, scale);
        continue;
      }

      const sample = sampleArtColor(cx, cy);
      const dot = mixWithThemeDark(sample);
      ctx.fillStyle = `rgb(${dot.r},${dot.g},${dot.b})`;

      const radius = scale * 0.48;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  return canvas.toBuffer("image/png");
}

// Fallback: existing safe "background art behind QR" behavior
async function renderQrArtFallback(qrBuffer, theme, botApi) {
  try {
    const artBuffer =
      (await getQrArtBuffer(botApi)) || (await getQrLogoBuffer(botApi));
    if (!artBuffer) return qrBuffer;

    const { createCanvas, loadImage } = await import("canvas");
    const qrImg = await loadImage(qrBuffer);
    const artImg = await loadImage(artBuffer);

    const size = qrImg.width;
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext("2d");

    ctx.drawImage(qrImg, 0, 0, size, size);

    ctx.save();
    ctx.globalCompositeOperation = "destination-over";
    const scale = Math.max(size / artImg.width, size / artImg.height);
    const drawW = artImg.width * scale;
    const drawH = artImg.height * scale;
    const dx = (size - drawW) / 2;
    const dy = (size - drawH) / 2;
    ctx.drawImage(artImg, dx, dy, drawW, drawH);
    ctx.restore();

    return canvas.toBuffer("image/png");
  } catch (e) {
    console.error("QR art fallback error:", e);
    return qrBuffer;
  }
}

// Art mode entry point used by existing call sites that only have a QR buffer.
// We scan the QR to recover its data, then re-render it with the dot-style art renderer.
async function renderQrArt(qrBuffer, theme, botApi) {
  try {
    const qrResult = await scanQR(qrBuffer);
    if (!qrResult.success || !qrResult.data) {
      return await renderQrArtFallback(qrBuffer, theme, botApi);
    }

    const { createCanvas, loadImage } = await import("canvas");
    const qrImg = await loadImage(qrBuffer);
    const size = qrImg.width || theme?.width || 2048;

    return await renderQrArtFromData(
      qrResult.data,
      {
        theme,
        size,
        // We don't know the original margin / EC here; choose a safer default for art.
        margin: 4,
        errorCorrectionLevel: "Q",
      },
      botApi
    );
  } catch (e) {
    console.error("QR art render error:", e);
    return await renderQrArtFallback(qrBuffer, theme, botApi);
  }
}

// =====================
// BOT + LLM
// =====================
const bot = new Bot(BOT_TOKEN);

let BOT_ID = null;
let BOT_USERNAME = "";

const openai = new OpenAI({
  baseURL: "https://ai.megallm.io/v1",
  apiKey: MEGALLM_API_KEY,
});

// =====================
// MULTI-PROVIDER LLM SYSTEM
// =====================

// Provider statistics with enhanced tracking
const providerStats = {
  github: { 
    calls: 0, 
    successes: 0, 
    failures: 0, 
    totalTokens: 0,
    lastUsed: null,
    lastError: null,
    lastErrorTime: null,
    avgResponseTime: 0,
    responseTimeCount: 0
  },
  megallm: { 
    calls: 0, 
    successes: 0, 
    failures: 0, 
    totalTokens: 0,
    lastUsed: null,
    lastError: null,
    lastErrorTime: null,
    avgResponseTime: 0,
    responseTimeCount: 0
  }
};

// Helper functions for provider stats
function recordProviderCall(provider, success, tokens = 0, responseTime = 0, error = null) {
  const stats = providerStats[provider];
  if (!stats) return;
  
  stats.calls++;
  stats.lastUsed = Date.now();
  
  if (success) {
    stats.successes++;
    stats.totalTokens += tokens;
    // Update rolling average response time
    if (responseTime > 0) {
      stats.avgResponseTime = ((stats.avgResponseTime * stats.responseTimeCount) + responseTime) / (stats.responseTimeCount + 1);
      stats.responseTimeCount++;
    }
  } else {
    stats.failures++;
    stats.lastError = error?.message || String(error);
    stats.lastErrorTime = Date.now();
  }
}

function getProviderStats() {
  const result = {};
  for (const [key, stats] of Object.entries(providerStats)) {
    const provider = LLM_PROVIDERS[key];
    result[key] = {
      name: provider?.name || key,
      enabled: provider?.enabled || false,
      calls: stats.calls,
      successes: stats.successes,
      failures: stats.failures,
      successRate: stats.calls > 0 ? Math.round((stats.successes / stats.calls) * 100) : 100,
      totalTokens: stats.totalTokens,
      avgResponseTime: Math.round(stats.avgResponseTime),
      lastUsed: stats.lastUsed,
      lastError: stats.lastError,
      lastErrorTime: stats.lastErrorTime,
      health: getProviderHealth(stats)
    };
  }
  return result;
}

function getProviderHealth(stats) {
  if (stats.calls === 0) return 'unknown';
  const successRate = (stats.successes / stats.calls) * 100;
  const recentError = stats.lastErrorTime && (Date.now() - stats.lastErrorTime) < 5 * 60 * 1000;
  
  if (successRate >= 95 && !recentError) return 'excellent';
  if (successRate >= 80) return 'good';
  if (successRate >= 50) return 'degraded';
  return 'critical';
}

// Provider registry - easy to add more providers!
const LLM_PROVIDERS = {
  github: {
    name: 'GitHub Models',
    priority: 1,  // Lower = higher priority (try first)
    enabled: !!GITHUB_PAT,
    models: {
      fast: 'openai/gpt-5-nano',
      balanced: 'openai/gpt-4.1-nano', 
      quality: 'openai/gpt-5-mini'
    },
    defaultModel: 'openai/gpt-5-nano',
    cost: 0.00001,  // per token unit
    endpoint: 'https://models.github.ai/inference/chat/completions'
  },
  megallm: {
    name: 'MegaLLM',
    priority: 2,  // Fallback
    enabled: !!MEGALLM_API_KEY,
    models: {},  // Uses existing model system
    cost: 0.001,  // estimate per query
    endpoint: 'https://ai.megallm.io/v1'
  }
};

// Get enabled providers sorted by priority
function getEnabledProviders() {
  return Object.entries(LLM_PROVIDERS)
    .filter(([_, provider]) => provider.enabled)
    .sort(([_, a], [__, b]) => a.priority - b.priority)
    .map(([key, provider]) => ({ key, ...provider }));
}

// Detect provider from model name
function getProviderForModel(model) {
  if (!model) return 'megallm';
  
  // GitHub Models use format: "provider/model-name"
  if (model.startsWith('openai/') || 
      model.startsWith('anthropic/') || 
      model.startsWith('google/') ||
      model.startsWith('microsoft/')) {
    return 'github';
  }
  
  // Default to MegaLLM for all other models
  return 'megallm';
}

// Each provider uses its own model naming - no translation needed
// GitHub Models: "openai/gpt-4.1-nano", "openai/gpt-5-nano", "openai/gpt-5-mini", etc.
// MegaLLM: "gpt-4o", "gpt-4o-mini", etc.

// Clean response from thinking tokens and artifacts
// Properly handles thinking models by extracting actual response content
function cleanLLMResponse(text) {
  if (!text) return '';
  
  let cleaned = text;
  
  // Handle thinking models that wrap entire response in thinking tags
  // Extract content AFTER the thinking block, or content OUTSIDE thinking blocks
  
  // Pattern 1: <think>...</think> followed by actual response
  const thinkMatch = cleaned.match(/<think>[\s\S]*?<\/think>([\s\S]*)/i);
  if (thinkMatch && thinkMatch[1]?.trim()) {
    cleaned = thinkMatch[1];
  } else {
    // Just remove thinking blocks if there's content outside them
    cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, '');
  }
  
  // Pattern 2: <thinking>...</thinking> followed by actual response
  const thinkingMatch = cleaned.match(/<thinking>[\s\S]*?<\/thinking>([\s\S]*)/i);
  if (thinkingMatch && thinkingMatch[1]?.trim()) {
    cleaned = thinkingMatch[1];
  } else {
    cleaned = cleaned.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '');
  }
  
  // Pattern 3: Some models use **Thinking:** or similar headers
  // Remove thinking sections that start with headers
  cleaned = cleaned.replace(/\*\*(?:Thinking|Reasoning|Analysis):\*\*[\s\S]*?(?=\*\*(?:Response|Answer|Output):\*\*|$)/gi, '');
  cleaned = cleaned.replace(/\*\*(?:Response|Answer|Output):\*\*/gi, ''); // Remove the header itself
  
  // Pattern 4: Chinese thinking markers
  // 思考过程：... 回答：...
  const chineseThinkMatch = cleaned.match(/[思考过程分析]+[:：][\s\S]*?[回答结果输出]+[:：]([\s\S]*)/i);
  if (chineseThinkMatch && chineseThinkMatch[1]?.trim()) {
    cleaned = chineseThinkMatch[1];
  }
  
  // Remove remaining Chinese thinking phrases mixed with English
  cleaned = cleaned.replace(/I'm[\u4e00-\u9fff]+ing[^.!?]*/gi, '');
  cleaned = cleaned.replace(/[\u4e00-\u9fff]+ing\s*(about|your|the|this)[^.!?]*/gi, '');
  
  // Remove standalone thinking status lines (but not if they're the only content)
  const statusLinePattern = /^.*?(thinking|reasoning|\u601d\u8003|\u8003\u8651)\s*(in progress|about|\.\.\.).*$/gim;
  const withoutStatus = cleaned.replace(statusLinePattern, '');
  if (withoutStatus.trim()) {
    cleaned = withoutStatus;
  }
  
  // Remove lines that are just "..." or similar
  cleaned = cleaned.replace(/^\s*\.{3,}\s*$/gm, '');
  
  // Clean up multiple newlines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  
  return cleaned.trim();
}

// GitHub Models API call
async function callGitHubModels({ model, messages, temperature = 0.7, max_tokens = 350 }) {
  if (!GITHUB_PAT) {
    throw new Error('GitHub PAT not configured');
  }

  // Note: Some GitHub Models (gpt-5-nano, gpt-5-mini, gpt-5) only support default temperature (1.0)
  // We omit temperature parameter to use the default value
  const response = await fetch(LLM_PROVIDERS.github.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GITHUB_PAT}`,
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28'
    },
    body: JSON.stringify({
      model: model || LLM_PROVIDERS.github.defaultModel,
      messages,
      // temperature omitted - uses model default (required for gpt-5-nano, gpt-5-mini, gpt-5)
      max_completion_tokens: max_tokens  // GitHub Models uses max_completion_tokens, not max_tokens
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GitHub Models API error (${response.status}): ${error}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  
  if (!content) {
    throw new Error('No content in GitHub Models response');
  }

  return cleanLLMResponse(content.trim());
}

// MegaLLM API call (wrapper for existing openai client)
async function callMegaLLM({ model, messages, temperature = 0.7, max_tokens = 350 }) {
  const resp = await openai.chat.completions.create({
    model,
    messages,
    temperature,
    max_tokens,
  });
  const rawContent = (resp?.choices?.[0]?.message?.content || "").trim();
  
  // Debug: Log raw response for thinking models
  if (model.includes('gemini') || model.includes('thinking') || model.includes('deepseek-r1')) {
    console.log(`[LLM DEBUG] Raw response (first 500 chars): ${rawContent.slice(0, 500)}`);
  }
  
  const cleaned = cleanLLMResponse(rawContent);
  
  // Debug: Log if cleaning resulted in empty output
  if (rawContent && !cleaned) {
    console.log(`[LLM DEBUG] Cleaning removed all content! Raw length: ${rawContent.length}`);
    console.log(`[LLM DEBUG] Raw content: ${rawContent.slice(0, 1000)}`);
  }
  
  return cleaned;
}

// Provider call wrapper with timeout
async function callProviderWithTimeout(providerKey, options, timeout) {
  const provider = LLM_PROVIDERS[providerKey];
  
  let callFunction;
  if (providerKey === 'github') {
    callFunction = callGitHubModels(options);
  } else if (providerKey === 'megallm') {
    callFunction = callMegaLLM(options);
  } else {
    throw new Error(`Unknown provider: ${providerKey}`);
  }

  return withTimeout(
    callFunction,
    timeout,
    `${provider.name} timed out after ${timeout/1000}s`
  );
}

// Fallback models for MegaLLM (DeepSeek/Qwen - unlimited usage)
const MEGALLM_FALLBACK_MODELS = {
  fast: 'deepseek-ai/deepseek-v3.1',               // Fast responses
  balanced: 'qwen/qwen3-next-80b-a3b-instruct',    // Good balance
  quality: 'deepseek-ai/deepseek-v3.1'             // Best quality
};

// Get appropriate fallback model based on the original model tier
function getFallbackModel(originalModel) {
  // Map original models to fallback tiers
  if (originalModel?.includes('nano') || originalModel?.includes('mini')) {
    return MEGALLM_FALLBACK_MODELS.fast;
  } else if (originalModel?.includes('chat') || originalModel?.includes('gpt-5-mini')) {
    return MEGALLM_FALLBACK_MODELS.balanced;
  } else {
    return MEGALLM_FALLBACK_MODELS.quality;
  }
}

// Main LLM call - uses intended provider with MegaLLM fallback on rate limit/errors
async function llmWithProviders({ model, messages, temperature = 0.7, max_tokens = 350, retries = 2, timeout = 15000, preferredProvider = null }) {
  const providers = getEnabledProviders();
  
  if (providers.length === 0) {
    throw new Error('No LLM providers available');
  }

  // Auto-detect provider from model name
  const targetProvider = preferredProvider || getProviderForModel(model);
  console.log(`[LLM] Using provider: ${targetProvider} for model: ${model}`);
  
  // Find the target provider
  const provider = providers.find(p => p.key === targetProvider);
  
  if (!provider) {
    throw new Error(`Provider '${targetProvider}' is not available or not configured`);
  }

  // Try the intended provider with retries
  let lastError = null;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    providerStats[provider.key].calls++;
    
    try {
      console.log(`[LLM] ${provider.name} attempt ${attempt + 1}/${retries + 1} with model: ${model}...`);
      
      const result = await callProviderWithTimeout(
        provider.key,
        { model, messages, temperature, max_tokens },
        timeout
      );
      
      providerStats[provider.key].successes++;
      console.log(`[LLM] ✅ Success with ${provider.name}`);
      
      return { content: result, provider: provider.key };
    } catch (error) {
      providerStats[provider.key].failures++;
      lastError = error;
      console.error(`[LLM] ❌ ${provider.name} attempt ${attempt + 1} failed:`, error.message);
      
      // Only retry on timeout errors within the same provider
      if (!error.message?.includes('timed out') && !error.message?.includes('timeout')) {
        break; // Don't retry on non-timeout errors, go to fallback
      }
      
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 1000)); // Wait 1s before retry
      }
    }
  }

  // Primary provider failed - try MegaLLM fallback with DeepSeek/Qwen (unlimited usage)
  const megallmProvider = providers.find(p => p.key === 'megallm');
  
  if (megallmProvider && targetProvider !== 'megallm') {
    const fallbackModel = getFallbackModel(model);
    console.log(`[LLM] ⚡ Falling back to MegaLLM with ${fallbackModel}...`);
    
    // Cap max_tokens at 400 for nano/mini models to keep responses concise
    const fallbackMaxTokens = (model?.toLowerCase().includes('nano') || model?.toLowerCase().includes('mini')) 
      ? Math.min(max_tokens, 400) 
      : max_tokens;
    
    providerStats.megallm.calls++;
    
    try {
      const result = await callProviderWithTimeout(
        'megallm',
        { model: fallbackModel, messages, temperature, max_tokens: fallbackMaxTokens },
        timeout
      );
      
      providerStats.megallm.successes++;
      console.log(`[LLM] ✅ Fallback success with MegaLLM (${fallbackModel})`);
      
      return { content: result, provider: 'megallm', fallback: true, fallbackModel };
    } catch (fallbackError) {
      providerStats.megallm.failures++;
      console.error(`[LLM] ❌ MegaLLM fallback also failed:`, fallbackError.message);
    }
  }

  // All providers failed
  throw lastError || new Error(`All providers failed for model: ${model}`);
}

// =====================
// TELEGRAM CHANNEL STORAGE
// Persists data in a Telegram channel - survives redeployments!
// =====================
const DATA_DIR = process.env.DATA_DIR || ".data";
const USERS_FILE = path.join(DATA_DIR, "users.json");
const PREFS_FILE = path.join(DATA_DIR, "prefs.json");
const INLINE_SESSIONS_FILE = path.join(DATA_DIR, "inline_sessions.json");
const PARTNERS_FILE = path.join(DATA_DIR, "partners.json");
const TODOS_FILE = path.join(DATA_DIR, "todos.json");
const COLLAB_TODOS_FILE = path.join(DATA_DIR, "collab_todos.json");

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}
ensureDir();

function readJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}
function writeJson(file, obj) {
  fs.writeFileSync(file, JSON.stringify(obj, null, 2), "utf8");
}

// Initialize with local fallback (will be overwritten by Supabase/Telegram data on startup)
let usersDb = readJson(USERS_FILE, { users: {} });
let prefsDb = readJson(PREFS_FILE, { userModel: {}, groups: {} });
let inlineSessionsDb = readJson(INLINE_SESSIONS_FILE, { sessions: {} });
let partnersDb = readJson(PARTNERS_FILE, { partners: {} });
let todosDb = readJson(TODOS_FILE, { todos: {} });
let collabTodosDb = readJson(COLLAB_TODOS_FILE, { lists: {}, userLists: {} });

// =====================
// SUPABASE STORAGE (Primary - permanent persistence)
// =====================
async function supabaseGet(key) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/bot_data?key=eq.${key}&select=value`, {
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.length > 0 ? data[0].value : null;
  } catch (e) {
    console.error(`Supabase GET ${key} error:`, e.message);
    return null;
  }
}

async function supabaseSet(key, value) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return false;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/bot_data`, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates",
      },
      body: JSON.stringify({
        key,
        value,
        updated_at: new Date().toISOString(),
      }),
    });
    return res.ok;
  } catch (e) {
    console.error(`Supabase SET ${key} error:`, e.message);
    return false;
  }
}

async function loadFromSupabase() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.log("No Supabase configured, skipping.");
    return false;
  }
  
  console.log("Loading data from Supabase...");
  
  try {
    const [users, prefs, sessions, imageStats, todos, collabTodos] = await Promise.all([
      supabaseGet("users"),
      supabaseGet("prefs"),
      supabaseGet("inlineSessions"),
      supabaseGet("imageStats"),
      supabaseGet("todos"),
      supabaseGet("collabTodos"),
    ]);
    
    if (users) {
      usersDb = users;
      console.log(`Loaded ${Object.keys(usersDb.users || {}).length} users from Supabase`);
    }
    if (prefs) {
      prefsDb = prefs;
      console.log(`Loaded prefs from Supabase`);
    }
    if (sessions) {
      inlineSessionsDb = sessions;
      console.log(`Loaded inline sessions from Supabase`);
    }
    if (imageStats) {
      deapiKeyManager.loadStats(imageStats);
    }
    if (todos) {
      todosDb = todos;
      console.log(`Loaded todos from Supabase`);
    }
    if (collabTodos) {
      collabTodosDb = collabTodos;
      console.log(`Loaded ${Object.keys(collabTodosDb.lists || {}).length} collab lists from Supabase`);
    }
    
    return true;
  } catch (e) {
    console.error("Failed to load from Supabase:", e.message);
    return false;
  }
}

async function saveToSupabase(dataType) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return false;
  
  let data;
  if (dataType === "users") data = usersDb;
  else if (dataType === "prefs") data = prefsDb;
  else if (dataType === "inlineSessions") data = inlineSessionsDb;
  else if (dataType === "partners") data = partnersDb;
  else if (dataType === "imageStats") data = deapiKeyManager.getPersistentStats();
  else if (dataType === "todos") data = todosDb;
  else if (dataType === "collabTodos") data = collabTodosDb;
  else return false;
  
  const success = await supabaseSet(dataType, data);
  if (success) {
    console.log(`Saved ${dataType} to Supabase`);
  }
  return success;
}

// Track message IDs for each data type in the storage channel
// Persist to file so we can delete old messages after restart
const STORAGE_IDS_FILE = path.join(DATA_DIR, "storageIds.json");
let storageMessageIds = readJson(STORAGE_IDS_FILE, {
  users: null,
  prefs: null,
  inlineSessions: null,
});

function saveStorageIds() {
  writeJson(STORAGE_IDS_FILE, storageMessageIds);
}

// Debounce saves to avoid hitting Telegram rate limits
let saveTimeout = null;
let pendingSaves = new Set();

function scheduleSave(dataType, priority = 'normal') {
  pendingSaves.add(dataType);
  if (saveTimeout) clearTimeout(saveTimeout);
  
  // Priority-based save delays for better performance
  // High priority: 2 seconds (critical data like user records)
  // Normal priority: 5 seconds (stats, preferences)
  // Low priority: 10 seconds (analytics, non-critical)
  const delay = priority === 'high' ? 2000 : 
                priority === 'normal' ? 5000 : 10000;
  
  saveTimeout = setTimeout(() => {
    // Don't await - let saves happen in background without blocking requests
    flushSaves().catch(err => {
      console.error("❌ Background save error:", err);
    });
  }, delay);
}

async function flushSaves() {
  if (pendingSaves.size === 0) return;
  const toSave = [...pendingSaves];
  pendingSaves.clear();
  
  for (const dataType of toSave) {
    // Try Supabase first (permanent), then Telegram as backup
    const supabaseOk = await saveToSupabase(dataType);
    if (!supabaseOk) {
      // Fall back to Telegram channel storage
      await saveToTelegram(dataType);
    } else {
      // Also save locally as backup
      if (dataType === "users") writeJson(USERS_FILE, usersDb);
      if (dataType === "prefs") writeJson(PREFS_FILE, prefsDb);
      if (dataType === "inlineSessions") writeJson(INLINE_SESSIONS_FILE, inlineSessionsDb);
      if (dataType === "partners") writeJson(PARTNERS_FILE, partnersDb);
      if (dataType === "todos") writeJson(TODOS_FILE, todosDb);
    }
  }
}

async function saveToTelegram(dataType) {
  if (!STORAGE_CHANNEL_ID) {
    // Fallback to local file storage
    if (dataType === "users") writeJson(USERS_FILE, usersDb);
    if (dataType === "prefs") writeJson(PREFS_FILE, prefsDb);
    if (dataType === "inlineSessions") writeJson(INLINE_SESSIONS_FILE, inlineSessionsDb);
    if (dataType === "partners") writeJson(PARTNERS_FILE, partnersDb);
    if (dataType === "todos") writeJson(TODOS_FILE, todosDb);
    if (dataType === "collabTodos") writeJson(COLLAB_TODOS_FILE, collabTodosDb);
    return;
  }
  
  try {
    let data, label;
    if (dataType === "users") {
      data = usersDb;
      label = "📊 USERS_DATA";
    } else if (dataType === "prefs") {
      data = prefsDb;
      label = "⚙️ PREFS_DATA";
    } else if (dataType === "inlineSessions") {
      data = inlineSessionsDb;
      label = "💬 INLINE_SESSIONS";
    } else if (dataType === "partners") {
      data = partnersDb;
      label = "🤝🏻 PARTNERS_DATA";
    } else if (dataType === "todos") {
      data = todosDb;
      label = "📋 TODOS_DATA";
    } else if (dataType === "collabTodos") {
      data = collabTodosDb;
      label = "👥 COLLAB_TODOS_DATA";
    } else {
      return;
    }
    
    const jsonStr = JSON.stringify(data);
    
    // Always use document upload - more reliable and no size/formatting issues
    const buffer = Buffer.from(jsonStr, "utf8");
    const inputFile = new InputFile(buffer, `${dataType}.json`);
    
    if (storageMessageIds[dataType]) {
      // Delete old message and send new one (can't edit documents)
      try {
        await bot.api.deleteMessage(STORAGE_CHANNEL_ID, storageMessageIds[dataType]);
      } catch (e) {
        // Ignore delete errors
      }
    }
    
    const msg = await bot.api.sendDocument(STORAGE_CHANNEL_ID, inputFile, {
      caption: `${label} | Updated: ${new Date().toISOString()}`,
    });
    storageMessageIds[dataType] = msg.message_id;
    saveStorageIds(); // Persist message ID so we can delete it after restart
    console.log(`Saved ${dataType} to Telegram (msg_id: ${msg.message_id})`);
    
    // Also save locally as backup
    if (dataType === "users") writeJson(USERS_FILE, usersDb);
    if (dataType === "prefs") writeJson(PREFS_FILE, prefsDb);
    if (dataType === "inlineSessions") writeJson(INLINE_SESSIONS_FILE, inlineSessionsDb);
    if (dataType === "partners") writeJson(PARTNERS_FILE, partnersDb);
    if (dataType === "todos") writeJson(TODOS_FILE, todosDb);
    if (dataType === "collabTodos") writeJson(COLLAB_TODOS_FILE, collabTodosDb);
    
  } catch (e) {
    console.error(`Failed to save ${dataType} to Telegram:`, e.message);
    // Fallback to local storage
    if (dataType === "users") writeJson(USERS_FILE, usersDb);
    if (dataType === "prefs") writeJson(PREFS_FILE, prefsDb);
    if (dataType === "inlineSessions") writeJson(INLINE_SESSIONS_FILE, inlineSessionsDb);
    if (dataType === "partners") writeJson(PARTNERS_FILE, partnersDb);
    if (dataType === "todos") writeJson(TODOS_FILE, todosDb);
    if (dataType === "collabTodos") writeJson(COLLAB_TODOS_FILE, collabTodosDb);
  }
}

async function loadFromTelegram() {
  if (!STORAGE_CHANNEL_ID) {
    console.log("No STORAGE_CHANNEL_ID set, using local storage only.");
    return;
  }
  
  console.log("Loading data from Telegram storage channel...");
  
  try {
    // Verify channel access
    const chat = await bot.api.getChat(STORAGE_CHANNEL_ID);
    console.log(`Storage channel verified: ${chat.title || chat.id}`);
    
    // Search for recent messages with our data files
    // We need to find the most recent users.json, prefs.json, and inline_sessions.json
    const dataTypes = ["users", "prefs", "inlineSessions"];
    const labels = {
      users: "📊 USERS_DATA",
      prefs: "⚙️ PREFS_DATA",
      inlineSessions: "💬 INLINE_SESSIONS"
    };
    
    // Get recent messages from channel (search last 50 messages)
    // Note: We can't search, so we'll rely on pinned messages or just use local + save
    // For now, let's just verify and use local files, but ensure we save properly
    
    console.log("Telegram storage ready. Using local files as primary, syncing to Telegram.");
    console.log(`Loaded users: ${Object.keys(usersDb.users || {}).length}`);
    
    // Log current user tiers for debugging
    for (const [uid, user] of Object.entries(usersDb.users || {})) {
      if (user.tier !== "free") {
        console.log(`  User ${uid} (${user.first_name}): tier=${user.tier}, model=${user.model}`);
      }
    }
    
  } catch (e) {
    console.error("Failed to access storage channel:", e.message);
    console.log("Falling back to local storage only.");
  }
}

function saveUsers(priority = 'normal') {
  scheduleSave("users", priority);
}
function savePrefs() {
  scheduleSave("prefs");
}
function saveInlineSessions() {
  scheduleSave("inlineSessions");
}
function savePartners() {
  scheduleSave("partners");
}
function saveTodos() {
  scheduleSave("todos");
}
function saveCollabTodos() {
  scheduleSave("collabTodos");
}

// =====================
// IN-MEMORY STATE
// =====================
const chatHistory = new Map(); // chatId -> [{role, content}...]
const partnerChatHistory = new Map(); // oderId -> [{role, content}...] - separate history for partner mode
const inlineCache = new Map(); // key -&gt; { prompt, answer, model, createdAt, userId }
// For DM/GC answers: simple continuation cache keyed by random id
// Used when the user taps the "Continue" button to ask the AI to extend its answer.
const dmContinueCache = new Map(); // key -> { userId, chatId, model, systemPrompt, userTextWithContext, modeLabel, sourcesHtml, createdAt }
const rate = new Map(); // userId -> { windowStartMs, count }
const groupActiveUntil = new Map(); // chatId -> timestamp when bot becomes dormant
const GROUP_ACTIVE_DURATION = 2 * 60 * 1000; // 2 minutes in ms

// Response caching removed - was not being used and may cause issues

// Ensure prefsDb.groups exists (for group authorization metadata)
function ensurePrefsGroups() {
  if (!prefsDb.groups) {
    prefsDb.groups = {};
  }
}

function getGroupRecord(chatId) {
  ensurePrefsGroups();
  const id = String(chatId);
  return prefsDb.groups[id] || null;
}

function setGroupAuthorization(chatId, allowed, meta = {}) {
  ensurePrefsGroups();
  const id = String(chatId);
  const existing = prefsDb.groups[id] || {};
  prefsDb.groups[id] = {
    id,
    allowed,
    title: meta.title !== undefined ? meta.title : existing.title || null,
    addedBy: meta.addedBy !== undefined ? meta.addedBy : existing.addedBy || null,
    updatedAt: new Date().toISOString(),
    note: meta.note !== undefined ? meta.note : existing.note || null,
  };
  savePrefs();
}

function isGroupAuthorized(chatId) {
  const rec = getGroupRecord(chatId);
  return !!rec?.allowed;
}

// Active inline message tracking (for editing)
const activeInlineMessages = new Map(); // sessionKey -&gt; inline_message_id

function nowMs() {
  return Date.now();
}
function makeId(bytes = 6) {
  return crypto.randomBytes(bytes).toString("hex");
}
function isOwner(ctx) {
  const uid = ctx.from?.id ? String(ctx.from.id) : "";
  return OWNER_IDS.has(uid);
}

// Parse human duration strings like "10m", "2h", "1d" or plain minutes ("30")
function parseDurationToMs(input) {
  if (!input) return null;
  const trimmed = String(input).trim().toLowerCase();

  const unitMatch = trimmed.match(/^(\d+)([smhd])$/);
  let value;
  let unit;

  if (unitMatch) {
    value = Number(unitMatch[1]);
    unit = unitMatch[2];
  } else if (/^\d+$/.test(trimmed)) {
    value = Number(trimmed);
    unit = "m"; // default to minutes
  } else {
    return null;
  }

  if (!Number.isFinite(value) || value <= 0) return null;

  const multipliers = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return value * multipliers[unit];
}

// =====================
// RATE LIMIT
// =====================
function rateKey(ctx) {
  return ctx.from?.id ? String(ctx.from.id) : "anon";
}
function checkRateLimit(ctx) {
  const key = rateKey(ctx);
  const t = nowMs();
  const windowMs = 60_000;

  const entry = rate.get(key) || { windowStartMs: t, count: 0 };

  if (t - entry.windowStartMs >= windowMs) {
    entry.windowStartMs = t;
    entry.count = 0;
  }

  entry.count += 1;
  rate.set(key, entry);

  if (entry.count > RATE_LIMIT_PER_MINUTE) {
    const waitSec = Math.ceil((windowMs - (t - entry.windowStartMs)) / 1000);
    return { ok: false, waitSec };
  }
  return { ok: true, waitSec: 0 };
}

async function enforceRateLimit(ctx) {
  const fromId = ctx.from?.id;
  if (fromId && OWNER_IDS.has(String(fromId))) {
    // Owners are not rate-limited
    return true;
  }

  const r = checkRateLimit(ctx);
  if (r.ok) return true;

  const msg = `Rate limit hit. Try again in ~${r.waitSec}s.`;

  if (ctx.inlineQuery) {
    await safeAnswerInline(
      ctx,
      [
        {
          type: "article",
          id: "rate",
          title: "Slow down 😅",
          description: msg,
          input_message_content: { message_text: msg },
        },
      ],
      { cache_time: 1, is_personal: true }
    );
  } else if (ctx.callbackQuery) {
    await ctx.answerCallbackQuery({ text: msg, show_alert: true });
  } else {
    await ctx.reply(msg);
  }
  return false;
}

// Per-tier command cooldowns (slash commands only)
const commandCooldown = new Map(); // userId -> last command timestamp (ms)

function getTierForCooldown(user, userId) {
  const idStr = String(userId);
  if (OWNER_IDS.has(idStr)) return "owner";
  const t = user?.tier || "free";
  if (t === "premium" || t === "ultra" || t === "free") return t;
  return "free";
}

function getCommandCooldownSecondsForTier(tier) {
  if (tier === "owner") return 0;
  if (tier === "ultra") return 10;
  if (tier === "premium") return 30;
  // free and unknown default
  return 60;
}

async function enforceCommandCooldown(ctx) {
  const from = ctx.from;
  const userId = from?.id ? String(from.id) : null;
  if (!userId) return true;

  // Owners: no command cooldown
  if (OWNER_IDS.has(userId)) {
    return true;
  }

  const user = getUserRecord(userId) || ensureUser(userId, from);
  const tier = getTierForCooldown(user, userId);
  const cooldownSec = getCommandCooldownSecondsForTier(tier);
  if (cooldownSec <= 0) {
    return true;
  }

  const cooldownMs = cooldownSec * 1000;
  const now = nowMs();
  const last = commandCooldown.get(userId) || 0;
  const elapsed = now - last;

  if (last && elapsed < cooldownMs) {
    const remainingSec = Math.ceil((cooldownMs - elapsed) / 1000);
    const msg = `⏱️ Command cooldown: wait ~${remainingSec}s before using another command.`;
    try {
      if (ctx.callbackQuery) {
        await ctx.answerCallbackQuery({ text: msg, show_alert: true });
      } else {
        await ctx.reply(msg);
      }
    } catch {
      // Ignore notification errors
    }
    return false;
  }

  commandCooldown.set(userId, now);
  return true;
}

// =====================
// ANTI-SPAM SYSTEM
// =====================
const spamTracking = new Map(); // userId -> { messages: [], lastWarning: timestamp }

const SPAM_CONFIG = {
  // Message frequency limits
  MAX_MESSAGES_PER_10_SEC: 5,
  MAX_MESSAGES_PER_MINUTE: 15,
  
  // Content-based detection
  MAX_REPEATED_MESSAGES: 3,
  MIN_MESSAGE_INTERVAL_MS: 500, // Minimum time between messages
  
  // Similarity detection
  SIMILARITY_THRESHOLD: 0.8, // 80% similar = spam
  
  // Penalties
  WARNING_COOLDOWN_MS: 60_000, // 1 minute between warnings
  AUTO_MUTE_DURATION_MINUTES: 10,
  AUTO_MUTE_THRESHOLD: 3, // Mute after 3 spam detections
};

function getSpamRecord(userId) {
  const key = String(userId);
  if (!spamTracking.has(key)) {
    spamTracking.set(key, {
      messages: [],
      spamCount: 0,
      lastWarning: 0,
    });
  }
  return spamTracking.get(key);
}

function cleanOldMessages(record, nowMs) {
  // Keep only messages from last minute
  record.messages = record.messages.filter(m => nowMs - m.timestamp < 60_000);
}

function calculateSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 1;
  
  // Simple character-based similarity
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  
  if (longer.length === 0) return 1;
  
  let matches = 0;
  for (let i = 0; i < shorter.length; i++) {
    if (longer.includes(shorter[i])) matches++;
  }
  
  return matches / longer.length;
}

function detectSpam(userId, messageText) {
  // Skip spam check for trusted users (performance optimization)
  if (isTrustedUser(userId)) {
    return { isSpam: false, reason: "trusted_user", severity: "none" };
  }
  
  const record = getSpamRecord(userId);
  const nowMs = Date.now();
  
  cleanOldMessages(record, nowMs);
  
  const recentMessages = record.messages;
  const last10Sec = recentMessages.filter(m => nowMs - m.timestamp < 10_000);
  const lastMinute = recentMessages.filter(m => nowMs - m.timestamp < 60_000);
  
  // Check 1: Too many messages in 10 seconds
  if (last10Sec.length >= SPAM_CONFIG.MAX_MESSAGES_PER_10_SEC) {
    return {
      isSpam: true,
      reason: "Too many messages in 10 seconds",
      severity: "high"
    };
  }
  
  // Check 2: Too many messages per minute
  if (lastMinute.length >= SPAM_CONFIG.MAX_MESSAGES_PER_MINUTE) {
    return {
      isSpam: true,
      reason: "Too many messages per minute",
      severity: "medium"
    };
  }
  
  // Check 3: Messages sent too quickly
  if (recentMessages.length > 0) {
    const lastMsg = recentMessages[recentMessages.length - 1];
    if (nowMs - lastMsg.timestamp < SPAM_CONFIG.MIN_MESSAGE_INTERVAL_MS) {
      return {
        isSpam: true,
        reason: "Messages sent too quickly",
        severity: "medium"
      };
    }
  }
  
  // Check 4: Repeated identical or similar messages
  if (messageText && messageText.length > 5) {
    let identicalCount = 0;
    let similarCount = 0;
    
    for (const msg of recentMessages) {
      if (msg.text === messageText) {
        identicalCount++;
      } else {
        const similarity = calculateSimilarity(msg.text, messageText);
        if (similarity >= SPAM_CONFIG.SIMILARITY_THRESHOLD) {
          similarCount++;
        }
      }
    }
    
    if (identicalCount >= SPAM_CONFIG.MAX_REPEATED_MESSAGES) {
      return {
        isSpam: true,
        reason: "Repeated identical messages",
        severity: "high"
      };
    }
    
    if (similarCount >= SPAM_CONFIG.MAX_REPEATED_MESSAGES) {
      return {
        isSpam: true,
        reason: "Repeated similar messages",
        severity: "medium"
      };
    }
  }
  
  // Check 5: Suspicious patterns (URLs, mentions, etc.)
  if (messageText) {
    const urlCount = (messageText.match(/https?:\/\//gi) || []).length;
    const mentionCount = (messageText.match(/@\w+/g) || []).length;
    
    if (urlCount > 3 || mentionCount > 5) {
      return {
        isSpam: true,
        reason: "Suspicious content pattern",
        severity: "low"
      };
    }
  }
  
  return { isSpam: false };
}

function trackMessage(userId, messageText) {
  const record = getSpamRecord(userId);
  const nowMs = Date.now();
  
  record.messages.push({
    text: messageText || "",
    timestamp: nowMs
  });
  
  cleanOldMessages(record, nowMs);
}

async function handleSpamDetection(ctx, spamResult, userId) {
  const record = getSpamRecord(userId);
  const nowMs = Date.now();
  
  record.spamCount = (record.spamCount || 0) + 1;
  
  // Log spam detection
  console.log(`[SPAM] User ${userId}: ${spamResult.reason} (severity: ${spamResult.severity}, count: ${record.spamCount})`);
  
  // Auto-mute after threshold
  if (record.spamCount >= SPAM_CONFIG.AUTO_MUTE_THRESHOLD) {
    const durationMs = SPAM_CONFIG.AUTO_MUTE_DURATION_MINUTES * 60 * 1000;
    const autoReason = `${spamResult.reason} (automatic spam detection)`;
    
    // Apply a regular mute using the global mute system
    const { until } = applyMuteToUser(
      String(userId),
      durationMs,
      "all",
      autoReason,
      "system"
    );
    
    // Reset spam count
    record.spamCount = 0;
    
    // Notify user
    try {
      const untilDate = until ? new Date(until).toLocaleString() : "unknown";
      await ctx.reply(
        `🚫 *Auto-Muted for Spam*\\n\\n` +
        `You have been automatically muted for ${SPAM_CONFIG.AUTO_MUTE_DURATION_MINUTES} minutes due to spam behavior.\\n\\n` +
        `Reason: ${spamResult.reason}\\n` +
        `Mute expires: ${untilDate}\\n\\n` +
        `_Please avoid spamming to use the bot._`,
        { parse_mode: "Markdown" }
      );
    } catch (e) {
      console.error("Failed to notify muted user:", e);
    }
    
    return true; // Muted
  }
  
  // Send warning (with cooldown)
  if (nowMs - record.lastWarning > SPAM_CONFIG.WARNING_COOLDOWN_MS) {
    record.lastWarning = nowMs;
    
    try {
      await ctx.reply(
        `⚠️ *Spam Warning*\\n\\n` +
        `${spamResult.reason}\\n\\n` +
        `Please slow down or you will be automatically muted.\\n` +
        `(Warning ${record.spamCount}/${SPAM_CONFIG.AUTO_MUTE_THRESHOLD})`,
        { parse_mode: "Markdown" }
      );
    } catch (e) {
      console.error("Failed to send spam warning:", e);
    }
  }
  
  return false; // Not muted yet
}

async function checkAntiSpam(ctx, messageText) {
  const userId = ctx.from?.id;
  if (!userId) return true; // Allow if no user ID
  
  // Skip spam check for owners
  if (OWNER_IDS.has(String(userId))) return true;
  
  // Detect spam
  const spamResult = detectSpam(userId, messageText);
  
  if (spamResult.isSpam) {
    const wasMuted = await handleSpamDetection(ctx, spamResult, userId);
    if (wasMuted) {
      return false; // Block message
    }
    
    // For high severity, block immediately
    if (spamResult.severity === "high") {
      return false;
    }
  }
  
  // Track this message
  trackMessage(userId, messageText);
  
  return true; // Allow message
}

// =====================
// ANTI-SPAM SYSTEM
// =====================
// =====================
// GROUP ACTIVATION SYSTEM
// =====================
// Bot is dormant by default in groups. Activates for 2 minutes after command/mention.
// During active window, responds to all messages. Goes dormant after inactivity.

function activateGroup(chatId) {
  const id = String(chatId);
  groupActiveUntil.set(id, Date.now() + GROUP_ACTIVE_DURATION);
}

function deactivateGroup(chatId) {
  const id = String(chatId);
  groupActiveUntil.delete(id);
}

function isGroupActive(chatId) {
  const id = String(chatId);
  const until = groupActiveUntil.get(id);
  if (!until) return false;
  if (Date.now() > until) {
    groupActiveUntil.delete(id); // Clean up expired
    return false;
  }
  return true;
}

function getGroupActiveRemaining(chatId) {
  const id = String(chatId);
  const until = groupActiveUntil.get(id);
  if (!until) return 0;
  const remaining = until - Date.now();
  return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
}

// =====================
// USER + ACCESS CONTROL
// =====================
function getUserRecord(userId) {
  return usersDb.users[String(userId)] || null;
}

function ensureUser(userId, from = null) {
  const id = String(userId);
  const isOwnerUser = OWNER_IDS.has(id);
  
  if (!usersDb.users[id]) {
    // New user - auto-grant ultra to owners
    const defaultTier = isOwnerUser ? "ultra" : "free";
    const defaultModel = isOwnerUser ? (DEFAULT_ULTRA_MODEL || DEFAULT_PREMIUM_MODEL || DEFAULT_FREE_MODEL) : DEFAULT_FREE_MODEL;
    
    usersDb.users[id] = {
      registeredAt: new Date().toISOString(),
      username: from?.username || null,
      firstName: from?.first_name || null,
      role: defaultTier,
      tier: defaultTier,
      model: defaultModel,
      allowedModels: [],
      banned: false,
      // Usage stats
      stats: {
        totalMessages: 0,
        totalInlineQueries: 0,
        totalTokensUsed: 0,
        lastActive: new Date().toISOString(),
        lastModel: defaultModel,
      },
      // Recent prompts history (DISABLED to prevent database bloat)
      // history: [],
      // Saved characters for quick roleplay (max 10)
      savedCharacters: [],
      // Active character mode for DM/GC
      activeCharacter: null,
      // Web search toggle - when ON, all messages get web search
      webSearch: false,
      // Per-user websearch usage (daily)
      webSearchUsage: {
        date: new Date().toISOString().slice(0, 10),
        used: 0,
      },
      // Warning history (for /warn)
      warnings: [],
      // Image generation preferences
      imagePrefs: {
        defaultRatio: "1:1",  // Default aspect ratio
        steps: 8,              // Generation steps (owner-only adjustment)
        safeMode: true,        // NSFW filter (free=always on, premium/ultra=toggle, owner=off)
      },
    };
    saveUsers();
  } else {
    // Existing user - upgrade owners to ultra if not already
    if (isOwnerUser && usersDb.users[id].tier !== "ultra") {
      usersDb.users[id].tier = "ultra";
      usersDb.users[id].role = "ultra";
      saveUsers();
    }
    // migration: if old users exist without tier
    if (!usersDb.users[id].tier) {
      usersDb.users[id].tier = usersDb.users[id].role || "free";
    }
    if (!usersDb.users[id].model) {
      usersDb.users[id].model = DEFAULT_FREE_MODEL;
    }
    // migration: add stats if missing
    if (!usersDb.users[id].stats) {
      usersDb.users[id].stats = {
        totalMessages: 0,
        totalInlineQueries: 0,
        totalTokensUsed: 0,
        lastActive: usersDb.users[id].registeredAt || new Date().toISOString(),
        lastModel: usersDb.users[id].model,
      };
    }
    // Update username/firstName if provided
    if (from?.username) usersDb.users[id].username = from.username;
    if (from?.first_name) usersDb.users[id].firstName = from.first_name;
    // migration: add savedCharacters if missing
    if (!usersDb.users[id].savedCharacters) {
      usersDb.users[id].savedCharacters = [];
    }
    // migration: add activeCharacter if missing
    if (usersDb.users[id].activeCharacter === undefined) {
      usersDb.users[id].activeCharacter = null;
    }
    // migration: add banned flag if missing
    if (usersDb.users[id].banned === undefined) {
      usersDb.users[id].banned = false;
    }
    // migration: add warnings array if missing
    if (!usersDb.users[id].warnings) {
      usersDb.users[id].warnings = [];
    }
    // migration: add webSearchUsage if missing
    if (!usersDb.users[id].webSearchUsage) {
      usersDb.users[id].webSearchUsage = {
        date: new Date().toISOString().slice(0, 10),
        used: 0,
      };
    }
    // migration: add imagePrefs if missing
    if (!usersDb.users[id].imagePrefs) {
      usersDb.users[id].imagePrefs = {
        defaultRatio: "1:1",
        steps: 8,
        safeMode: true,
      };
    }
    // migration: add safeMode to imagePrefs if missing
    if (usersDb.users[id].imagePrefs && usersDb.users[id].imagePrefs.safeMode === undefined) {
      usersDb.users[id].imagePrefs.safeMode = true;
    }
    saveUsers();
  }
  return usersDb.users[id];
}

// Check if a user is banned
function isUserBanned(userId) {
  const rec = getUserRecord(userId);
  return !!rec?.banned;
}

// Check if a user is trusted (skip spam checks for performance)
function isTrustedUser(userId) {
  // Owners are always trusted
  if (OWNER_IDS.has(String(userId))) {
    return true;
  }
  
  const rec = getUserRecord(userId);
  if (!rec) return false;
  
  // Trusted if:
  // - No warnings
  // - 100+ messages sent
  // - Not banned or muted
  const hasNoWarnings = !rec.warnings || rec.warnings.length === 0;
  const hasGoodHistory = (rec.messagesCount || 0) >= 100;
  const notBanned = !rec.banned;
  const notMuted = !rec.mute;
  
  return hasNoWarnings && hasGoodHistory && notBanned && notMuted;
}

// =====================
// CONCURRENT PROCESSING MIDDLEWARE
// Enable parallel request handling for multiple users
// =====================
bot.use(async (ctx, next) => {
  // Process requests concurrently instead of sequentially
  // This allows multiple users to be served simultaneously
  next().catch(err => {
    console.error("❌ Handler error:", err);
    // Try to notify user of error
    try {
      ctx.reply("❌ An error occurred processing your request. Please try again.").catch(() => {});
    } catch (e) {
      // Ignore if we can't send error message
    }
  });
});

// Global ban middleware - blocks banned users from using the bot
// but still allows feedback (/feedback + Feedback button) so banned
// users can send an appeal or report an issue.
bot.use(async (ctx, next) => {
  const fromId = ctx.from?.id;
  if (!fromId) return next();

  const idStr = String(fromId);

  // Owners are never blocked by ban middleware
  if (OWNER_IDS.has(idStr)) {
    return next();
  }

  const user = getUserRecord(idStr);
  if (user && user.banned) {
    // Allow feedback flows even when banned (DM only)
    const chatType = ctx.chat?.type;
    const isPrivate = chatType === "private";
    const text = ctx.message?.text || "";

    const isFeedbackCommand = isPrivate && /^\/feedback\b/i.test(text);
    const isFeedbackButton =
      ctx.callbackQuery?.data === "menu_feedback";
    const isFeedbackActive =
      isPrivate && pendingFeedback.has(String(idStr));

    if (isFeedbackCommand || isFeedbackButton || isFeedbackActive) {
      return next();
    }

    try {
      if (ctx.callbackQuery) {
        await ctx.answerCallbackQuery({
          text: "🚫 You are banned from using this bot.",
          show_alert: true,
        });
        return;
      }

      if (ctx.inlineQuery) {
        await ctx.answerInlineQuery([], { cache_time: 1, is_personal: true });
        return;
      }

      if (ctx.message) {
        if (ctx.chat?.type === "private") {
          const replyMarkup =
            FEEDBACK_CHAT_ID
              ? new InlineKeyboard().text("💡 Feedback", "menu_feedback")
              : undefined;
          await ctx.reply("🚫 You are banned from using this bot.", {
            reply_markup: replyMarkup,
          });
        }
        return;
      }
    } catch {
      // Ignore errors from notifying banned users
      return;
    }
    return;
  }

  return next();
});

// Global mute middleware - temporary or scoped mutes
bot.use(async (ctx, next) => {
  const fromId = ctx.from?.id;
  if (!fromId) return next();

  const idStr = String(fromId);

  // Owners are never blocked by mute middleware
  if (OWNER_IDS.has(idStr)) {
    return next();
  }

  const user = getUserRecord(idStr);
  if (!user || !user.mute) {
    return next();
  }

  const m = user.mute;
  const now = Date.now();

  // Expired mute: clear and optionally restore tier, then continue
  if (m.until && now > m.until) {
    if (m.scope === "tier" && m.previousTier && user.tier === "free") {
      user.tier = m.previousTier;
      user.role = m.previousTier;
    }
    delete user.mute;
    saveUsers();
    return next();
  }

  const scope = m.scope || "all";

  // Tier-only mute is handled via tier change, not by blocking requests
  if (scope === "tier") {
    return next();
  }

  const chatType = ctx.chat?.type;
  const isInline = !!ctx.inlineQuery;
  const isPrivate = chatType === "private";
  const isGroup = chatType === "group" || chatType === "supergroup";

  let shouldBlock = false;

  if (scope === "all") {
    shouldBlock = true;
  } else if (scope === "dm" && isPrivate && ctx.message) {
    shouldBlock = true;
  } else if (scope === "group" && isGroup && ctx.message) {
    shouldBlock = true;
  } else if (scope === "inline" && isInline) {
    shouldBlock = true;
  }

  if (!shouldBlock) {
    return next();
  }

  const untilStr = m.until ? new Date(m.until).toLocaleString() : null;
  const reasonLine = m.reason ? `\n\n*Reason:* ${escapeMarkdown(m.reason)}` : "";
  const untilLine = untilStr ? `\n\n_Mute ends at: ${escapeMarkdown(untilStr)}_` : "";

  try {
    if (ctx.inlineQuery) {
      await ctx.answerInlineQuery([], { cache_time: 1, is_personal: true });
      return;
    }

    if (ctx.callbackQuery) {
      await ctx.answerCallbackQuery({
        text: "🔇 You are muted on this bot.",
        show_alert: true,
      });
      return;
    }

    if (ctx.message && isPrivate) {
      const text = `🔇 *You are muted on StarzAI.*${reasonLine}${untilLine}`;
      await ctx.reply(text, { parse_mode: "Markdown" });
      return;
    }

    // In groups, stay silent to avoid spam
    if (ctx.message && isGroup) {
      return;
    }
  } catch {
    return;
  }

  return;
});

// Track user activity
function trackUsage(userId, type = "message", tokens = 0) {
  const u = ensureUser(userId);
  if (!u.stats) {
    u.stats = {
      totalMessages: 0,
      totalInlineQueries: 0,
      totalTokensUsed: 0,
      lastActive: new Date().toISOString(),
      lastModel: u.model,
    };
  }
  
  if (type === "message") u.stats.totalMessages++;
  if (type === "inline") u.stats.totalInlineQueries++;
  u.stats.totalTokensUsed += tokens;
  u.stats.lastActive = new Date().toISOString();
  u.stats.lastModel = u.model;
  saveUsers();
}

// Websearch quota helpers

function getTodayDateKey() {
  return new Date().toISOString().slice(0, 10);
}

function getWebsearchDailyLimitForTier(tier) {
  if (tier === "ultra") return 18;
  if (tier === "premium") return 6;
  // free and unknown
  return 2;
}

function getWebsearchDailyLimitForUser(userId) {
  const idStr = String(userId);
  if (OWNER_IDS.has(idStr)) {
    // Owners: effectively unlimited
    return Infinity;
  }
  const user = getUserRecord(idStr);
  const tier = user?.tier || "free";
  return getWebsearchDailyLimitForTier(tier);
}

function getWebsearchUsage(user) {
  const today = getTodayDateKey();
  if (!user.webSearchUsage || user.webSearchUsage.date !== today) {
    user.webSearchUsage = { date: today, used: 0 };
  }
  return user.webSearchUsage;
}

// Consume one websearch from the user's daily quota.
// Returns { allowed, limit, used, remaining }.
function consumeWebsearchQuota(userId) {
  const u = ensureUser(userId);
  const limit = getWebsearchDailyLimitForUser(userId);

  // Owners: no quota enforcement
  if (!Number.isFinite(limit)) {
    return { allowed: true, limit, used: 0, remaining: Infinity };
  }

  const usage = getWebsearchUsage(u);
  if (usage.used >= limit) {
    return { allowed: false, limit, used: usage.used, remaining: 0 };
  }

  usage.used += 1;
  saveUsers();

  const remaining = Math.max(0, limit - usage.used);
  return { allowed: true, limit, used: usage.used, remaining };
}

// Read-only view of current quota status.
function getWebsearchQuotaStatus(userId) {
  const u = ensureUser(userId);
  const limit = getWebsearchDailyLimitForUser(userId);

  if (!Number.isFinite(limit)) {
    return { limit, used: 0, remaining: Infinity };
  }

  const usage = getWebsearchUsage(u);
  const remaining = Math.max(0, limit - usage.used);
  return { limit, used: usage.used, remaining };
}

// Add prompt to user's history (max 10 recent)
// DISABLED: History tracking removed to prevent database bloat
function addToHistory(userId, prompt, mode = "default") {
  // History tracking disabled
  return;
}

function registerUser(from) {
  return ensureUser(from.id, from);
}

// =====================
// PARTNER MANAGEMENT
// =====================
function getPartner(userId) {
  const id = String(userId);
  return partnersDb.partners[id] || null;
}

function setPartner(userId, partnerData) {
  const id = String(userId);
  if (!partnersDb.partners[id]) {
    partnersDb.partners[id] = {
      name: null,
      personality: null,
      background: null,
      style: null,
      createdAt: Date.now(),
      chatHistory: [],
      active: false, // Whether partner mode is active
    };
  }
  Object.assign(partnersDb.partners[id], partnerData, { updatedAt: Date.now() });
  savePartners();
  return partnersDb.partners[id];
}

function clearPartner(userId) {
  const id = String(userId);
  delete partnersDb.partners[id];
  partnerChatHistory.delete(id);
  savePartners();
}

function getPartnerChatHistory(userId) {
  const id = String(userId);
  const partner = getPartner(userId);
  
  // Try in-memory first, then fall back to stored
  if (partnerChatHistory.has(id)) {
    return partnerChatHistory.get(id);
  }
  
  // Load from partner data if exists
  if (partner?.chatHistory) {
    partnerChatHistory.set(id, partner.chatHistory);
    return partner.chatHistory;
  }
  
  return [];
}

function addPartnerMessage(userId, role, content) {
  const id = String(userId);
  let history = getPartnerChatHistory(userId);
  
  history.push({ role, content });
  
  // Keep last 20 messages for context
  if (history.length > 20) history = history.slice(-20);
  
  partnerChatHistory.set(id, history);
  
  // Also save to persistent storage
  const partner = getPartner(userId);
  if (partner) {
    partner.chatHistory = history;
    savePartners();
  }
  
  return history;
}

function clearPartnerChat(userId) {
  const id = String(userId);
  partnerChatHistory.delete(id);
  const partner = getPartner(userId);
  if (partner) {
    partner.chatHistory = [];
    savePartners();
  }
}

// =====================
// CHARACTER MODE MANAGEMENT
// =====================
const characterChatHistory = new Map(); // chatId -> [{role, content}...] - separate history for character mode

function getSavedCharacters(userId) {
  const u = ensureUser(userId);
  return u.savedCharacters || [];
}

function saveCharacter(userId, characterName) {
  const u = ensureUser(userId);
  if (!u.savedCharacters) u.savedCharacters = [];
  
  // Normalize character name
  const normalizedName = characterName.trim().toLowerCase();
  
  // Check if already saved
  if (u.savedCharacters.some(c => c.toLowerCase() === normalizedName)) {
    return { success: false, message: "Character already saved!" };
  }
  
  // Max 10 saved characters
  if (u.savedCharacters.length >= 10) {
    return { success: false, message: "Max 10 characters! Remove one first." };
  }
  
  u.savedCharacters.push(characterName.trim());
  saveUsers();
  return { success: true, message: `Saved ${characterName}!` };
}

function removeCharacter(userId, characterName) {
  const u = ensureUser(userId);
  if (!u.savedCharacters) return { success: false, message: "No saved characters!" };
  
  const normalizedName = characterName.trim().toLowerCase();
  const index = u.savedCharacters.findIndex(c => c.toLowerCase() === normalizedName);
  
  if (index === -1) {
    return { success: false, message: "Character not found!" };
  }
  
  u.savedCharacters.splice(index, 1);
  saveUsers();
  return { success: true, message: `Removed ${characterName}!` };
}

function setActiveCharacter(userId, chatId, characterName) {
  const u = ensureUser(userId);
  const chatKey = String(chatId);
  
  if (!u.activeCharacter) u.activeCharacter = {};
  
  if (characterName) {
    u.activeCharacter[chatKey] = {
      name: characterName,
      activatedAt: Date.now(),
    };
  } else {
    delete u.activeCharacter[chatKey];
  }
  saveUsers();
}

function getActiveCharacter(userId, chatId) {
  const u = ensureUser(userId);
  if (!u.activeCharacter) return null;
  
  const chatKey = String(chatId);
  return u.activeCharacter[chatKey] || null;
}

function clearActiveCharacter(userId, chatId) {
  setActiveCharacter(userId, chatId, null);
  // Also clear character chat history
  const historyKey = `${userId}_${chatId}`;
  characterChatHistory.delete(historyKey);
}

function getCharacterChatHistory(userId, chatId) {
  const historyKey = `${userId}_${chatId}`;
  return characterChatHistory.get(historyKey) || [];
}

function addCharacterMessage(userId, chatId, role, content) {
  const historyKey = `${userId}_${chatId}`;
  let history = getCharacterChatHistory(userId, chatId);
  
  history.push({ role, content });
  
  // Keep last 20 messages for context
  if (history.length > 20) history = history.slice(-20);
  
  characterChatHistory.set(historyKey, history);
  return history;
}

function buildCharacterSystemPrompt(characterName) {
  return `You are roleplaying as ${characterName}. Stay completely in character throughout the entire conversation. Respond to everything as ${characterName} would - use their speech patterns, vocabulary, mannerisms, and personality. Be creative and entertaining while still being helpful. Never break character unless explicitly asked to stop.`;
}

function buildPartnerSystemPrompt(partner) {
  let prompt = `You are ${partner.name || "a companion"}, a personalized AI partner.`;
  
  if (partner.personality) {
    prompt += ` Your personality: ${partner.personality}.`;
  }
  if (partner.background) {
    prompt += ` Your background: ${partner.background}.`;
  }
  if (partner.style) {
    prompt += ` Your speaking style: ${partner.style}.`;
  }
  
  prompt += " Stay in character throughout the conversation. Be engaging, warm, and remember previous messages in our chat. Respond naturally as this character would.";
  
  return prompt;
}

function ensureChosenModelValid(userId) {
  const u = ensureUser(userId);
  const allowed = allModelsForTier(u.tier);

  // If no allowed models, fail safe
  if (!allowed.length) {
    u.model = "";
    saveUsers();
    return "";
  }

  if (!allowed.includes(u.model)) {
    // Choose tier-appropriate default
    if (u.tier === "ultra") u.model = DEFAULT_ULTRA_MODEL;
    else if (u.tier === "premium") u.model = DEFAULT_PREMIUM_MODEL;
    else u.model = DEFAULT_FREE_MODEL;

    // final fallback
    if (!allowed.includes(u.model)) u.model = allowed[0];

    saveUsers();
  }
  return u.model;
}

// =====================
// INLINE SESSION MANAGEMENT
// =====================
function getInlineSession(userId) {
  const id = String(userId);
  if (!inlineSessionsDb.sessions[id]) {
    inlineSessionsDb.sessions[id] = {
      history: [],
      model: ensureChosenModelValid(userId),
      lastActive: nowMs(),
      state: "idle", // idle, chatting
    };
    saveInlineSessions();
  }
  return inlineSessionsDb.sessions[id];
}

function updateInlineSession(userId, updates) {
  const id = String(userId);
  const session = getInlineSession(userId);
  Object.assign(session, updates, { lastActive: nowMs() });
  inlineSessionsDb.sessions[id] = session;
  saveInlineSessions();
  return session;
}

function clearInlineSession(userId) {
  const id = String(userId);
  inlineSessionsDb.sessions[id] = {
    history: [],
    model: ensureChosenModelValid(userId),
    lastActive: nowMs(),
    state: "idle",
  };
  saveInlineSessions();
  return inlineSessionsDb.sessions[id];
}

function addToInlineHistory(userId, role, content) {
  const session = getInlineSession(userId);
  session.history.push({ role, content });
  // Keep last 20 messages
  while (session.history.length > 20) session.history.shift();
  session.lastActive = nowMs();
  saveInlineSessions();
  return session;
}

// =====================
// HISTORY (DM/Group)
// =====================
function getHistory(chatId) {
  if (!chatHistory.has(chatId)) chatHistory.set(chatId, []);
  return chatHistory.get(chatId);
}
function pushHistory(chatId, role, content) {
  const h = getHistory(chatId);
  h.push({ role, content });
  while (h.length > 24) h.shift();
}

// =====================
// LLM HELPERS
// =====================

// Timeout wrapper for API calls
function withTimeout(promise, ms, errorMsg = "Request timed out") {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(errorMsg)), ms)
    ),
  ]);
}

// Special vision function with much longer timeouts (images take longer to process)
async function llmTextVision({ model, messages, temperature = 0.7, max_tokens = 1000, retries = 2 }) {
  const timeouts = [60000, 90000, 120000]; // Vision timeouts: 60s, 90s, 120s
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    const timeout = timeouts[Math.min(attempt, timeouts.length - 1)];
    
    try {
      console.log(`Vision LLM attempt ${attempt + 1}/${retries + 1} with ${timeout/1000}s timeout`);
      const resp = await withTimeout(
        openai.chat.completions.create({
          model,
          messages,
          temperature,
          max_tokens,
        }),
        timeout,
        `Vision model ${model} timed out (attempt ${attempt + 1})`
      );
      return (resp?.choices?.[0]?.message?.content || "").trim();
    } catch (err) {
      console.error(`Vision LLM Error (attempt ${attempt + 1}):`, err.message);
      
      if (attempt === retries) {
        throw err;
      }
      
      if (!err.message?.includes("timed out")) {
        throw err;
      }
      
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

async function llmText({ model, messages, temperature = 0.7, max_tokens = 350, retries = 2, timeout: customTimeout = null, useProviderSystem = true }) {
  // NEW: Use multi-provider system with automatic fallback
  if (useProviderSystem) {
    try {
      const result = await llmWithProviders({
        model,
        messages,
        temperature,
        max_tokens,
        retries,
        timeout: customTimeout || 15000
      });
      return result.content;
    } catch (err) {
      console.error('[LLM] All providers failed:', err.message);
      throw err;
    }
  }
  
  // FALLBACK: Original single-provider logic (for backward compatibility)
  const defaultTimeouts = [15000, 20000, 30000];
  const timeouts = customTimeout ? [customTimeout, customTimeout, customTimeout] : defaultTimeouts;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    const attemptTimeout = timeouts[Math.min(attempt, timeouts.length - 1)];
    
    try {
      console.log(`LLM attempt ${attempt + 1}/${retries + 1} with ${attemptTimeout/1000}s timeout`);
      const resp = await withTimeout(
        openai.chat.completions.create({
          model,
          messages,
          temperature,
          max_tokens,
        }),
        attemptTimeout,
        `Model ${model} timed out (attempt ${attempt + 1})`
      );
      return (resp?.choices?.[0]?.message?.content || "").trim();
    } catch (err) {
      console.error(`LLM Error (attempt ${attempt + 1}):`, err.message);
      
      if (attempt === retries) {
        throw err;
      }
      
      if (!err.message?.includes("timed out")) {
        throw err;
      }
      
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}

// Streaming LLM function - calls onChunk callback with accumulated text
async function llmTextStream({ model, messages, temperature = 0.7, max_tokens = 500, onChunk }) {
  try {
    const stream = await openai.chat.completions.create({
      model,
      messages,
      temperature,
      max_tokens,
      stream: true,
    });
    
    let fullText = "";
    let lastUpdate = 0;
    const UPDATE_INTERVAL = 500; // Update every 500ms to avoid rate limits
    
    for await (const chunk of stream) {
      const content = chunk.choices?.[0]?.delta?.content || "";
      if (content) {
        fullText += content;
        
        // Throttle updates to avoid Telegram rate limits
        const now = Date.now();
        if (now - lastUpdate >= UPDATE_INTERVAL) {
          lastUpdate = now;
          try {
            await onChunk(fullText);
          } catch (e) {
            // Ignore edit errors (message unchanged, etc)
          }
        }
      }
    }
    
    // Final update with complete text
    try {
      await onChunk(fullText);
    } catch (e) {
      // Ignore
    }
    
    return fullText.trim();
  } catch (err) {
    console.error("Streaming LLM Error:", err.message);
    throw err;
  }
}

// Detect if a model is a "thinking" model that needs more tokens
// Note: GPT-5-nano/mini are NOT thinking models - they're fast models
// Only include models that actually do chain-of-thought reasoning
function isThinkingModel(model) {
  if (!model) return false;
  const m = model.toLowerCase();
  
  // Explicitly exclude fast/nano/mini models even if they have "gpt-5" in name
  if (m.includes('nano') || m.includes('mini')) return false;
  
  return m.includes('gemini-2.5-pro') ||   // Gemini Pro does thinking, Flash doesn't
         m.includes('deepseek-r1') || 
         m.includes('thinking') || 
         m.includes('reasoning') ||
         m.includes('kimi-k2-thinking') ||
         m.includes('o1-') ||           // OpenAI o1 models
         m.includes('o3-') ||           // OpenAI o3 models
         m.includes('grok-4.1-fast-reasoning') ||  // Grok reasoning
         m.includes('claude-opus-4-1'); // Claude Opus 4.1
}

// Get appropriate max_tokens based on model type
function getMaxTokensForModel(model, baseTokens = 400) {
  // Thinking models need 3-4x more tokens to output reasoning + response
  if (isThinkingModel(model)) {
    return Math.max(baseTokens * 4, 1600); // At least 1600 for thinking models
  }
  return baseTokens;
}

// Smart detection: Does this response appear incomplete and need continuation?
// Returns true if the response seems cut off or incomplete
function responseNeedsContinuation(text, maxTokensUsed = 400) {
  if (!text || typeof text !== 'string') return false;
  
  const trimmed = text.trim();
  const len = trimmed.length;
  
  // Very short responses (under 300 chars) are almost always complete
  // e.g., "I'm doing great, thanks for asking! How can I help you?"
  // Increased from 200 to 300 to catch more casual responses
  if (len < 300) return false;
  
  // Medium responses (300-600 chars) need clear incompleteness signals
  // Don't show Continue just because it's medium length
  if (len < 600) {
    // Only show Continue if there's a clear incomplete signal
    const clearIncomplete = /[,:]\.\.\.?\s*$|\band\s*$|\bor\s*$|\bthe\s*$|```[a-z]*\s*$/i.test(trimmed);
    if (!clearIncomplete) return false;
  }
  
  // Check for explicit completion signals (model said it's done)
  const completionSignals = [
    /\?\s*$/,                           // Ends with a question (asking user)
    /!\s*$/,                            // Ends with exclamation (complete thought)
    /\.\s*$/,                           // Ends with period (complete sentence)
    /let me know[.!]?\s*$/i,            // "Let me know" = waiting for user
    /help you[.!?]?\s*$/i,              // "How can I help you?" = complete
    /any questions[.!?]?\s*$/i,         // Offering to answer more = complete
    /feel free to ask[.!]?\s*$/i,       // Inviting questions = complete
    /hope (this|that) helps[.!]?\s*$/i, // Conclusion phrase
    /good luck[.!]?\s*$/i,              // Sign-off phrase
    /:\)\s*$/,                          // Ends with smiley = casual complete
    /\u{1F44D}|\u{1F44B}|\u{1F60A}/u,   // Ends with emoji (thumbs up, wave, smile)
  ];
  
  for (const signal of completionSignals) {
    if (signal.test(trimmed)) {
      // Short-to-medium responses with completion signals are complete
      if (len < 800) return false;
    }
  }
  
  // Check for incompleteness signals
  const incompleteSignals = [
    /[,:]\s*$/,                         // Ends with comma or colon (mid-list/mid-thought)
    /\.\.\.\.?\s*$/,                    // Ends with ellipsis (trailing off)
    /\band\s*$/i,                       // Ends with "and" (mid-sentence)
    /\bor\s*$/i,                        // Ends with "or" (mid-sentence)
    /\bthe\s*$/i,                       // Ends with "the" (mid-sentence)
    /\bto\s*$/i,                        // Ends with "to" (mid-sentence)
    /\bfor\s*$/i,                       // Ends with "for" (mid-sentence)
    /\bwith\s*$/i,                      // Ends with "with" (mid-sentence)
    /\bin\s*$/i,                        // Ends with "in" (mid-sentence)
    /\bis\s*$/i,                        // Ends with "is" (mid-sentence)
    /\bare\s*$/i,                       // Ends with "are" (mid-sentence)
    /\bthat\s*$/i,                      // Ends with "that" (mid-sentence)
    /\bwhich\s*$/i,                     // Ends with "which" (mid-sentence)
    /\d+\.\s*$/,                        // Ends with numbered list item start (e.g., "3. ")
    /^\s*[-*•]\s*$/m,                   // Has empty bullet point
    /```[a-z]*\s*$/i,                   // Ends with unclosed code block
  ];
  
  for (const signal of incompleteSignals) {
    if (signal.test(trimmed)) {
      return true; // Definitely incomplete
    }
  }
  
  // Check for numbered/bulleted lists that might be cut off
  // If we see "1." and "2." but the response is long, it might have more items
  const hasNumberedList = /\n\s*\d+\.\s+/g.test(trimmed);
  const hasBulletList = /\n\s*[-*•]\s+/g.test(trimmed);
  
  if ((hasNumberedList || hasBulletList) && len > 1200) {
    // Long list-based response - might have more items
    // But only if it doesn't end with a conclusion
    const lastLine = trimmed.split('\n').pop()?.trim() || '';
    if (!/^(In summary|Overall|In conclusion|To summarize|That's|These are)/i.test(lastLine)) {
      return true;
    }
  }
  
  // If response is very long (approaching token limit) and doesn't have clear ending
  // Rough estimate: 1 token ≈ 4 chars, so 400 tokens ≈ 1600 chars
  const estimatedTokens = len / 4;
  const tokenLimitRatio = estimatedTokens / maxTokensUsed;
  
  if (tokenLimitRatio > 0.85) {
    // Response used 85%+ of token budget - likely hit the limit
    // Check if it ends mid-sentence
    const lastChar = trimmed.slice(-1);
    if (!/[.!?)"]/.test(lastChar)) {
      return true; // Doesn't end with sentence-ending punctuation
    }
  }
  
  // Default: assume complete if none of the above triggered
  return false;
}

async function llmChatReply({ chatId, userText, systemPrompt, model }) {
  const history = getHistory(chatId);
  const messages = [
    { role: "system", content: systemPrompt },
    ...history,
    { role: "user", content: userText },
  ];

  // Use higher max_tokens for thinking models
  const maxTokens = getMaxTokensForModel(model, 400);
  
  const out = await llmText({ model, messages, temperature: 0.7, max_tokens: maxTokens });
  pushHistory(chatId, "user", userText);
  pushHistory(chatId, "assistant", out);
  return out || "(no output)";
}

// Inline chat LLM - uses inline session history
async function llmInlineChatReply({ userId, userText, model }) {
  const session = getInlineSession(userId);
  const systemPrompt =
    "You are StarzTechBot, a friendly AI assistant. " +
    "Give concise, direct answers (under 800 characters). " +
    "Don't advertise features or suggest commands.";

  const messages = [
    { role: "system", content: systemPrompt },
    ...session.history,
    { role: "user", content: userText },
  ];

  const out = await llmText({ model, messages, temperature: 0.7, max_tokens: 300 });

  // Add to history
  addToInlineHistory(userId, "user", userText);
  addToInlineHistory(userId, "assistant", out);

  return out || "(no output)";
}

async function llmVisionReply({ chatId, userText, imageBase64, mime, model }) {
  const history = getHistory(chatId);
  const messages = [
    { role: "system", content: "You are a helpful assistant. Describe and analyze images clearly." },
    ...history,
    {
      role: "user",
      content: [
        { type: "text", text: userText },
        { type: "image_url", image_url: { url: `data:${mime};base64,${imageBase64}` } },
      ],
    },
  ];

  // Vision requests need longer timeouts and more tokens
  const out = await llmTextVision({ model, messages, temperature: 0.6, max_tokens: 1000 });
  pushHistory(chatId, "user", userText);
  pushHistory(chatId, "assistant", out);
  return out || "(no output)";
}

async function telegramFileToBase64(fileUrl) {
  const resp = await fetch(fileUrl);
  const buf = await resp.arrayBuffer();
  return Buffer.from(buf).toString("base64");
}

// =====================
// VIDEO PROCESSING UTILITIES
// =====================

// Download video from Telegram and save to temp file
async function downloadTelegramVideo(fileUrl) {
  const tempDir = `/tmp/starzai_video_${Date.now()}`;
  await execAsync(`mkdir -p ${tempDir}`);
  const videoPath = `${tempDir}/video.mp4`;
  
  const resp = await fetch(fileUrl);
  const buf = await resp.arrayBuffer();
  fs.writeFileSync(videoPath, Buffer.from(buf));
  
  return { tempDir, videoPath };
}

// Extract key frames from video (5 frames evenly distributed)
async function extractVideoFrames(videoPath, tempDir, numFrames = 5) {
  try {
    // Check if ffprobe exists
    try {
      await execAsync('which ffprobe');
    } catch {
      console.error("ffprobe not found - ffmpeg not installed");
      return { frames: [], duration: 0, error: "ffmpeg not installed" };
    }
    
    // Get video duration
    console.log(`[VIDEO] Getting duration for: ${videoPath}`);
    const { stdout: durationOut, stderr: durationErr } = await execAsync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}" 2>&1`
    );
    console.log(`[VIDEO] Duration output: ${durationOut}, stderr: ${durationErr}`);
    const duration = parseFloat(durationOut.trim()) || 10;
    
    // Extract frames at intervals
    const frames = [];
    const interval = duration / (numFrames + 1);
    
    for (let i = 1; i <= numFrames; i++) {
      const timestamp = interval * i;
      const framePath = `${tempDir}/frame_${i}.jpg`;
      
      console.log(`[VIDEO] Extracting frame ${i} at ${timestamp}s`);
      try {
        await execAsync(
          `ffmpeg -ss ${timestamp} -i "${videoPath}" -vframes 1 -q:v 2 "${framePath}" -y 2>&1`,
          { timeout: 30000 }
        );
      } catch (frameErr) {
        console.error(`[VIDEO] Frame ${i} extraction failed:`, frameErr.message);
        continue;
      }
      
      // Read frame as base64
      if (fs.existsSync(framePath)) {
        const frameData = fs.readFileSync(framePath);
        frames.push({
          timestamp: timestamp.toFixed(1),
          base64: frameData.toString("base64")
        });
        console.log(`[VIDEO] Frame ${i} extracted successfully`);
      }
    }
    
    console.log(`[VIDEO] Total frames extracted: ${frames.length}`);
    return { frames, duration };
  } catch (e) {
    console.error("Frame extraction error:", e.message, e.stack);
    return { frames: [], duration: 0, error: e.message };
  }
}

// Extract and transcribe audio from video
async function extractAndTranscribeAudio(videoPath, tempDir) {
  try {
    const audioPath = `${tempDir}/audio.mp3`;
    
    // Extract audio
    await execAsync(
      `ffmpeg -i "${videoPath}" -vn -acodec libmp3lame -q:a 4 "${audioPath}" -y 2>/dev/null`
    );
    
    if (!fs.existsSync(audioPath)) {
      return { transcript: null, hasAudio: false };
    }
    
    // Check if audio file has content (not silent)
    const stats = fs.statSync(audioPath);
    if (stats.size < 1000) {
      return { transcript: null, hasAudio: false };
    }
    
    // Use manus-speech-to-text for transcription
    try {
      const { stdout } = await execAsync(`manus-speech-to-text "${audioPath}"`, { timeout: 60000 });
      const transcript = stdout.trim();
      return { transcript: transcript || null, hasAudio: true };
    } catch (e) {
      console.error("Transcription error:", e.message);
      return { transcript: null, hasAudio: true };
    }
  } catch (e) {
    console.error("Audio extraction error:", e.message);
    return { transcript: null, hasAudio: false };
  }
}

// Clean up temp directory
async function cleanupTempDir(tempDir) {
  try {
    await execAsync(`rm -rf "${tempDir}"`);
  } catch (e) {
    console.error("Cleanup error:", e.message);
  }
}

// =====================
// WEB SEARCH - Multi-Engine Integration
// =====================

// SearXNG instances (free, open source meta search)
const SEARXNG_INSTANCES = [
  'https://search.ononoki.org',
  'https://searx.work',
  'https://search.bus-hit.me',
  'https://searx.tuxcloud.net',
  'https://search.mdosch.de',
  'https://searx.be',
  'https://search.sapti.me',
  'https://searx.tiekoetter.com'
];

// DuckDuckGo Instant Answer API (free, no key needed)
async function duckDuckGoSearch(query) {
  try {
    // DDG Instant Answer API - gives quick facts
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'StarzAI-Bot/1.0' },
      timeout: 8000
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    const results = [];
    
    // Abstract (main answer)
    if (data.Abstract) {
      results.push({
        title: data.Heading || query,
        url: data.AbstractURL || '',
        content: data.Abstract,
        engine: 'DuckDuckGo'
      });
    }
    
    // Related topics
    if (data.RelatedTopics) {
      for (const topic of data.RelatedTopics.slice(0, 4)) {
        if (topic.Text && topic.FirstURL) {
          results.push({
            title: topic.Text.split(' - ')[0] || 'Related',
            url: topic.FirstURL,
            content: topic.Text,
            engine: 'DuckDuckGo'
          });
        }
      }
    }
    
    if (results.length > 0) {
      return {
        success: true,
        results: results,
        query: query,
        instance: 'DuckDuckGo'
      };
    }
    return null;
  } catch (e) {
    console.log('DDG search error:', e.message);
    return null;
  }
}

// DuckDuckGo HTML scraping fallback (more comprehensive results)
async function duckDuckGoScrape(query, numResults = 5) {
  try {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 10000
    });
    
    if (!response.ok) return null;
    
    const html = await response.text();
    const results = [];
    
    // Parse results using regex (simple extraction)
    const resultRegex = /<a rel=\"nofollow\" class=\"result__a\" href=\"([^\"]+)\">([^<]+)<\/a>[\s\S]*?<a class=\"result__snippet\"[^>]*>([^<]*)<\/a>/g;
    let match;
    
    while ((match = resultRegex.exec(html)) !== null && results.length < numResults) {
      const [, url, title, snippet] = match;
      if (url && title) {
        results.push({
          title: title.trim(),
          url: url.startsWith('//') ? 'https:' + url : url,
          content: snippet?.trim() || 'No description',
          engine: 'DuckDuckGo'
        });
      }
    }
    
    if (results.length > 0) {
      return {
        success: true,
        results: results,
        query: query,
        instance: 'DuckDuckGo'
      };
    }
    return null;
  } catch (e) {
    console.log('DDG scrape error:', e.message);
    return null;
  }
}

// SearXNG search
async function searxngSearch(query, numResults = 5) {
  const errors = [];
  
  // Shuffle instances to distribute load
  const shuffled = [...SEARXNG_INSTANCES].sort(() => Math.random() - 0.5);
  
  for (const instance of shuffled) {
    try {
      const url = `${instance}/search?q=${encodeURIComponent(query)}&format=json&engines=google,bing,duckduckgo`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json'
        },
        timeout: 8000
      });
      
      if (!response.ok) {
        errors.push(`${instance}: HTTP ${response.status}`);
        continue;
      }
      
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        return {
          success: true,
          results: data.results.slice(0, numResults).map(r => ({
            title: r.title || 'No title',
            url: r.url || '',
            content: r.content || r.snippet || 'No description',
            engine: r.engine || 'SearXNG'
          })),
          query: query,
          instance: instance
        };
      }
    } catch (e) {
      errors.push(`${instance}: ${e.message}`);
    }
  }
  
  return { success: false, errors };
}

// External Search API (web search + extraction in one call)
// Note: we intentionally do not expose the underlying provider name in user-facing text.
async function parallelWebSearch(query, numResults = 5) {
  if (!PARALLEL_API_KEY) {
    return { success: false, error: 'Search API key not configured', query };
  }

  try {
    const response = await fetch('https://api.parallel.ai/v1beta/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': PARALLEL_API_KEY,
        'parallel-beta': 'search-extract-2025-10-10',
      },
      body: JSON.stringify({
        objective: query,
        mode: 'one-shot',
        max_results: numResults,
        excerpts: {
          max_chars_per_result: 1500,
        },
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      console.log('External web search HTTP error:', response.status, text.slice(0, 500));
      return {
        success: false,
        error: `HTTP ${response.status}: ${text.slice(0, 200) || "Unknown error from search API"}`,
        query,
        status: response.status,
      };
    }

    const data = await response.json();
    const rawResults = Array.isArray(data.results) ? data.results : [];

    const results = rawResults.slice(0, numResults).map((r) => {
      const excerpts =
        Array.isArray(r.excerpts)
          ? r.excerpts.join("\n\n")
          : (typeof r.excerpts === "string" ? r.excerpts : "");
      const content = excerpts || "";
      return {
        title: r.title || r.url || "No title",
        url: r.url || "",
        content: content || "No description",
        engine: "external-search",
      };
    });

    return {
      success: true,
      results,
      query,
      instance: 'external-search',
    };
  } catch (e) {
    console.log('External web search error:', e.message);
    return {
      success: false,
      error: e.message || 'External web search failed',
      query,
    };
  }
}

// Main web search function - tries multiple sources
async function webSearch(query, numResults = 5) {
  // Prefer Parallel.ai Search API if configured
  if (PARALLEL_API_KEY) {
    const parallelResult = await parallelWebSearch(query, numResults);
    if (parallelResult.success && parallelResult.results && parallelResult.results.length > 0) {
      return parallelResult;
    }
  }

  // Try SearXNG first (best results, uses Google/Bing)
  const searxResult = await searxngSearch(query, numResults);
  if (searxResult.success) return searxResult;
  
  // Try DuckDuckGo scrape (comprehensive)
  const ddgScrape = await duckDuckGoScrape(query, numResults);
  if (ddgScrape) return ddgScrape;
  
  // Try DuckDuckGo Instant Answer API (quick facts)
  const ddgInstant = await duckDuckGoSearch(query);
  if (ddgInstant) return ddgInstant;
  
  return {
    success: false,
    error: 'All search engines unavailable. Try again later.',
    query: query
  };
}

// Check if a message is asking about time/date
function isTimeQuery(text) {
  const lowerText = text.toLowerCase();
  const timePatterns = [
    /what('s|\s+is)\s+(the\s+)?time/i,
    /current\s+time/i,
    /time\s+(now|right now|in|at)/i,
    /what\s+time\s+is\s+it/i,
    /tell\s+(me\s+)?the\s+time/i,
    /what('s|\s+is)\s+(the\s+)?(date|day)/i,
    /today('s)?\s+date/i,
    /what\s+day\s+is\s+(it|today)/i
  ];
  return timePatterns.some(pattern => pattern.test(lowerText));
}

// Extract timezone/location from time query
// Comprehensive mapping of countries, cities, and timezone abbreviations
function extractTimezone(text) {
  const lowerText = text.toLowerCase();
  
  // Comprehensive timezone mappings - ordered by specificity (longer matches first)
  // Format: [searchTerm, IANA timezone, displayName]
  const timezones = [
    // Multi-word locations (check these first)
    ['new york', 'America/New_York', 'New York'],
    ['los angeles', 'America/Los_Angeles', 'Los Angeles'],
    ['hong kong', 'Asia/Hong_Kong', 'Hong Kong'],
    ['new zealand', 'Pacific/Auckland', 'New Zealand'],
    ['south africa', 'Africa/Johannesburg', 'South Africa'],
    ['south korea', 'Asia/Seoul', 'South Korea'],
    ['north korea', 'Asia/Pyongyang', 'North Korea'],
    ['saudi arabia', 'Asia/Riyadh', 'Saudi Arabia'],
    ['sri lanka', 'Asia/Colombo', 'Sri Lanka'],
    ['costa rica', 'America/Costa_Rica', 'Costa Rica'],
    ['puerto rico', 'America/Puerto_Rico', 'Puerto Rico'],
    ['el salvador', 'America/El_Salvador', 'El Salvador'],
    ['united kingdom', 'Europe/London', 'United Kingdom'],
    ['united states', 'America/New_York', 'United States (Eastern)'],
    ['united arab emirates', 'Asia/Dubai', 'UAE'],
    
    // European countries
    ['poland', 'Europe/Warsaw', 'Poland'],
    ['warsaw', 'Europe/Warsaw', 'Warsaw'],
    ['germany', 'Europe/Berlin', 'Germany'],
    ['berlin', 'Europe/Berlin', 'Berlin'],
    ['france', 'Europe/Paris', 'France'],
    ['paris', 'Europe/Paris', 'Paris'],
    ['spain', 'Europe/Madrid', 'Spain'],
    ['madrid', 'Europe/Madrid', 'Madrid'],
    ['barcelona', 'Europe/Madrid', 'Barcelona'],
    ['italy', 'Europe/Rome', 'Italy'],
    ['rome', 'Europe/Rome', 'Rome'],
    ['milan', 'Europe/Rome', 'Milan'],
    ['netherlands', 'Europe/Amsterdam', 'Netherlands'],
    ['amsterdam', 'Europe/Amsterdam', 'Amsterdam'],
    ['belgium', 'Europe/Brussels', 'Belgium'],
    ['brussels', 'Europe/Brussels', 'Brussels'],
    ['switzerland', 'Europe/Zurich', 'Switzerland'],
    ['zurich', 'Europe/Zurich', 'Zurich'],
    ['austria', 'Europe/Vienna', 'Austria'],
    ['vienna', 'Europe/Vienna', 'Vienna'],
    ['sweden', 'Europe/Stockholm', 'Sweden'],
    ['stockholm', 'Europe/Stockholm', 'Stockholm'],
    ['norway', 'Europe/Oslo', 'Norway'],
    ['oslo', 'Europe/Oslo', 'Oslo'],
    ['denmark', 'Europe/Copenhagen', 'Denmark'],
    ['copenhagen', 'Europe/Copenhagen', 'Copenhagen'],
    ['finland', 'Europe/Helsinki', 'Finland'],
    ['helsinki', 'Europe/Helsinki', 'Helsinki'],
    ['portugal', 'Europe/Lisbon', 'Portugal'],
    ['lisbon', 'Europe/Lisbon', 'Lisbon'],
    ['greece', 'Europe/Athens', 'Greece'],
    ['athens', 'Europe/Athens', 'Athens'],
    ['turkey', 'Europe/Istanbul', 'Turkey'],
    ['istanbul', 'Europe/Istanbul', 'Istanbul'],
    ['ukraine', 'Europe/Kiev', 'Ukraine'],
    ['kyiv', 'Europe/Kiev', 'Kyiv'],
    ['kiev', 'Europe/Kiev', 'Kiev'],
    ['czech', 'Europe/Prague', 'Czech Republic'],
    ['prague', 'Europe/Prague', 'Prague'],
    ['hungary', 'Europe/Budapest', 'Hungary'],
    ['budapest', 'Europe/Budapest', 'Budapest'],
    ['romania', 'Europe/Bucharest', 'Romania'],
    ['bucharest', 'Europe/Bucharest', 'Bucharest'],
    ['ireland', 'Europe/Dublin', 'Ireland'],
    ['dublin', 'Europe/Dublin', 'Dublin'],
    ['scotland', 'Europe/London', 'Scotland'],
    ['wales', 'Europe/London', 'Wales'],
    ['england', 'Europe/London', 'England'],
    ['london', 'Europe/London', 'London'],
    ['uk', 'Europe/London', 'UK'],
    ['russia', 'Europe/Moscow', 'Russia'],
    ['moscow', 'Europe/Moscow', 'Moscow'],
    
    // Asian countries
    ['india', 'Asia/Kolkata', 'India'],
    ['mumbai', 'Asia/Kolkata', 'Mumbai'],
    ['delhi', 'Asia/Kolkata', 'Delhi'],
    ['bangalore', 'Asia/Kolkata', 'Bangalore'],
    ['kolkata', 'Asia/Kolkata', 'Kolkata'],
    ['chennai', 'Asia/Kolkata', 'Chennai'],
    ['japan', 'Asia/Tokyo', 'Japan'],
    ['tokyo', 'Asia/Tokyo', 'Tokyo'],
    ['osaka', 'Asia/Tokyo', 'Osaka'],
    ['china', 'Asia/Shanghai', 'China'],
    ['beijing', 'Asia/Shanghai', 'Beijing'],
    ['shanghai', 'Asia/Shanghai', 'Shanghai'],
    ['korea', 'Asia/Seoul', 'South Korea'],
    ['seoul', 'Asia/Seoul', 'Seoul'],
    ['singapore', 'Asia/Singapore', 'Singapore'],
    ['malaysia', 'Asia/Kuala_Lumpur', 'Malaysia'],
    ['kuala lumpur', 'Asia/Kuala_Lumpur', 'Kuala Lumpur'],
    ['thailand', 'Asia/Bangkok', 'Thailand'],
    ['bangkok', 'Asia/Bangkok', 'Bangkok'],
    ['vietnam', 'Asia/Ho_Chi_Minh', 'Vietnam'],
    ['hanoi', 'Asia/Ho_Chi_Minh', 'Hanoi'],
    ['indonesia', 'Asia/Jakarta', 'Indonesia'],
    ['jakarta', 'Asia/Jakarta', 'Jakarta'],
    ['philippines', 'Asia/Manila', 'Philippines'],
    ['manila', 'Asia/Manila', 'Manila'],
    ['pakistan', 'Asia/Karachi', 'Pakistan'],
    ['karachi', 'Asia/Karachi', 'Karachi'],
    ['bangladesh', 'Asia/Dhaka', 'Bangladesh'],
    ['dhaka', 'Asia/Dhaka', 'Dhaka'],
    ['nepal', 'Asia/Kathmandu', 'Nepal'],
    ['kathmandu', 'Asia/Kathmandu', 'Kathmandu'],
    ['iran', 'Asia/Tehran', 'Iran'],
    ['tehran', 'Asia/Tehran', 'Tehran'],
    ['iraq', 'Asia/Baghdad', 'Iraq'],
    ['baghdad', 'Asia/Baghdad', 'Baghdad'],
    ['israel', 'Asia/Jerusalem', 'Israel'],
    ['jerusalem', 'Asia/Jerusalem', 'Jerusalem'],
    ['tel aviv', 'Asia/Jerusalem', 'Tel Aviv'],
    ['dubai', 'Asia/Dubai', 'Dubai'],
    ['uae', 'Asia/Dubai', 'UAE'],
    ['qatar', 'Asia/Qatar', 'Qatar'],
    ['doha', 'Asia/Qatar', 'Doha'],
    ['kuwait', 'Asia/Kuwait', 'Kuwait'],
    ['bahrain', 'Asia/Bahrain', 'Bahrain'],
    ['oman', 'Asia/Muscat', 'Oman'],
    ['riyadh', 'Asia/Riyadh', 'Riyadh'],
    ['taiwan', 'Asia/Taipei', 'Taiwan'],
    ['taipei', 'Asia/Taipei', 'Taipei'],
    
    // Americas
    ['usa', 'America/New_York', 'USA (Eastern)'],
    ['america', 'America/New_York', 'USA (Eastern)'],
    ['nyc', 'America/New_York', 'New York'],
    ['boston', 'America/New_York', 'Boston'],
    ['miami', 'America/New_York', 'Miami'],
    ['washington', 'America/New_York', 'Washington DC'],
    ['chicago', 'America/Chicago', 'Chicago'],
    ['dallas', 'America/Chicago', 'Dallas'],
    ['houston', 'America/Chicago', 'Houston'],
    ['denver', 'America/Denver', 'Denver'],
    ['phoenix', 'America/Phoenix', 'Phoenix'],
    ['seattle', 'America/Los_Angeles', 'Seattle'],
    ['san francisco', 'America/Los_Angeles', 'San Francisco'],
    ['california', 'America/Los_Angeles', 'California'],
    ['canada', 'America/Toronto', 'Canada (Eastern)'],
    ['toronto', 'America/Toronto', 'Toronto'],
    ['vancouver', 'America/Vancouver', 'Vancouver'],
    ['montreal', 'America/Montreal', 'Montreal'],
    ['mexico', 'America/Mexico_City', 'Mexico'],
    ['mexico city', 'America/Mexico_City', 'Mexico City'],
    ['brazil', 'America/Sao_Paulo', 'Brazil'],
    ['sao paulo', 'America/Sao_Paulo', 'São Paulo'],
    ['rio', 'America/Sao_Paulo', 'Rio de Janeiro'],
    ['argentina', 'America/Argentina/Buenos_Aires', 'Argentina'],
    ['buenos aires', 'America/Argentina/Buenos_Aires', 'Buenos Aires'],
    ['chile', 'America/Santiago', 'Chile'],
    ['santiago', 'America/Santiago', 'Santiago'],
    ['colombia', 'America/Bogota', 'Colombia'],
    ['bogota', 'America/Bogota', 'Bogotá'],
    ['peru', 'America/Lima', 'Peru'],
    ['lima', 'America/Lima', 'Lima'],
    ['venezuela', 'America/Caracas', 'Venezuela'],
    ['caracas', 'America/Caracas', 'Caracas'],
    ['cuba', 'America/Havana', 'Cuba'],
    ['havana', 'America/Havana', 'Havana'],
    ['jamaica', 'America/Jamaica', 'Jamaica'],
    ['panama', 'America/Panama', 'Panama'],
    
    // Oceania
    ['australia', 'Australia/Sydney', 'Australia (Sydney)'],
    ['sydney', 'Australia/Sydney', 'Sydney'],
    ['melbourne', 'Australia/Melbourne', 'Melbourne'],
    ['brisbane', 'Australia/Brisbane', 'Brisbane'],
    ['perth', 'Australia/Perth', 'Perth'],
    ['auckland', 'Pacific/Auckland', 'Auckland'],
    ['fiji', 'Pacific/Fiji', 'Fiji'],
    ['hawaii', 'Pacific/Honolulu', 'Hawaii'],
    ['honolulu', 'Pacific/Honolulu', 'Honolulu'],
    
    // Africa
    ['egypt', 'Africa/Cairo', 'Egypt'],
    ['cairo', 'Africa/Cairo', 'Cairo'],
    ['nigeria', 'Africa/Lagos', 'Nigeria'],
    ['lagos', 'Africa/Lagos', 'Lagos'],
    ['kenya', 'Africa/Nairobi', 'Kenya'],
    ['nairobi', 'Africa/Nairobi', 'Nairobi'],
    ['morocco', 'Africa/Casablanca', 'Morocco'],
    ['casablanca', 'Africa/Casablanca', 'Casablanca'],
    ['johannesburg', 'Africa/Johannesburg', 'Johannesburg'],
    ['cape town', 'Africa/Johannesburg', 'Cape Town'],
    ['ethiopia', 'Africa/Addis_Ababa', 'Ethiopia'],
    ['ghana', 'Africa/Accra', 'Ghana'],
    ['accra', 'Africa/Accra', 'Accra'],
    
    // Timezone abbreviations (less specific, check last)
    ['ist', 'Asia/Kolkata', 'India (IST)'],
    ['pst', 'America/Los_Angeles', 'Pacific Time'],
    ['pdt', 'America/Los_Angeles', 'Pacific Time'],
    ['mst', 'America/Denver', 'Mountain Time'],
    ['mdt', 'America/Denver', 'Mountain Time'],
    ['cst', 'America/Chicago', 'Central Time'],
    ['cdt', 'America/Chicago', 'Central Time'],
    ['est', 'America/New_York', 'Eastern Time'],
    ['edt', 'America/New_York', 'Eastern Time'],
    ['gmt', 'Europe/London', 'GMT'],
    ['bst', 'Europe/London', 'UK'],
    ['cet', 'Europe/Paris', 'Central European Time'],
    ['cest', 'Europe/Paris', 'Central European Time'],
    ['eet', 'Europe/Athens', 'Eastern European Time'],
    ['jst', 'Asia/Tokyo', 'Japan (JST)'],
    ['kst', 'Asia/Seoul', 'Korea (KST)'],
    ['aest', 'Australia/Sydney', 'Australia (AEST)'],
    ['aedt', 'Australia/Sydney', 'Australia (AEDT)'],
    ['nzst', 'Pacific/Auckland', 'New Zealand'],
    ['utc', 'UTC', 'UTC'],
  ];
  
  // Check each timezone mapping (order matters - more specific first)
  for (const [key, tz, displayName] of timezones) {
    if (lowerText.includes(key)) {
      return { timezone: tz, location: displayName };
    }
  }
  
  return null;
}

// Get formatted time response
function getTimeResponse(text, messageDate) {
  const tzInfo = extractTimezone(text);
  const now = messageDate ? new Date(messageDate * 1000) : new Date();
  
  let timezone = 'UTC';
  let locationName = 'UTC';
  
  if (tzInfo) {
    timezone = tzInfo.timezone;
    locationName = tzInfo.location;
  }
  
  try {
    const options = {
      timeZone: timezone,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    };
    
    const formatter = new Intl.DateTimeFormat('en-US', options);
    const formatted = formatter.format(now);
    
    // Also get just time and date separately
    const timeOnly = now.toLocaleTimeString('en-US', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hour12: true });
    const dateOnly = now.toLocaleDateString('en-US', { timeZone: timezone, weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    
    return {
      isTimeQuery: true,
      response: `🕐 <b>${timeOnly}</b> in ${locationName}\n📅 ${dateOnly}`,
      timezone: timezone,
      location: locationName
    };
  } catch (e) {
    return {
      isTimeQuery: true,
      response: `🕐 Current UTC time: ${now.toUTCString()}`,
      timezone: 'UTC',
      location: 'UTC'
    };
  }
}

// Check if a message needs web search (current events, news, real-time info)
function needsWebSearch(text) {
  const lowerText = text.toLowerCase();
  
  // Don't web search for time queries - we handle those directly
  if (isTimeQuery(text)) return false;
  
  // Keywords that suggest need for current/real-time info
  const searchTriggers = [
    'latest', 'recent', 'current', 'today', 'yesterday', 'this week', 'this month',
    'news', 'update', 'happening', 'going on',
    'price of', 'stock price', 'weather in', 'score of',
    'who won', 'who is winning', 'election',
    'released', 'announced', 'launched',
    '2024', '2025', '2026',
    'search for', 'look up', 'find out', 'google'
  ];
  
  return searchTriggers.some(trigger => lowerText.includes(trigger));
}

// Format search results for AI context
function formatSearchResultsForAI(searchResult) {
  if (!searchResult.success) {
    return `[Web search failed: ${searchResult.error}]`;
  }
  
  let context = `[Web Search Results for \"${searchResult.query}\"]:\\n\\n`;
  searchResult.results.forEach((r, i) => {
    context += `${i + 1}. ${r.title}\\n`;
    context += `   URL: ${r.url}\\n`;
    context += `   ${r.content}\\n\\n`;
  });
  
  return context;
}

// Decide how many sources to show in websearch based on user tier / ownership
function getWebsearchSourceLimit(userId, totalResults) {
  const idStr = String(userId);
  if (OWNER_IDS.has(idStr)) return totalResults; // owners see all sources
  
  const user = getUserRecord(idStr);
  const tier = user?.tier || "free";
  let limit = 2; // default for free
  
  if (tier === "premium") limit = 5;
  else if (tier === "ultra") limit = 7;
  
  return Math.min(totalResults, limit);
}

// Build HTML-formatted sources list with clickable titles (one line, like: Sources: Title1, Title2)
function buildWebsearchSourcesHtml(searchResult, userId) {
  if (!searchResult || !searchResult.success || !Array.isArray(searchResult.results) || searchResult.results.length === 0) {
    return "";
  }

  const total = searchResult.results.length;
  const limit = getWebsearchSourceLimit(userId, total);
  if (!limit) return "";

  const parts = [];
  for (let i = 0; i < limit; i++) {
    const r = searchResult.results[i];
    const url = r.url || "";
    const title = escapeHTML(r.title || url || `Source ${i + 1}`);

    if (url) {
      parts.push(`<a href="${url}">${title}</a>`);
    } else {
      parts.push(title);
    }
  }

  let html = "\n\n<b>Sources:</b> " + parts.join(", ");
  const idStr = String(userId);
  if (limit < total && !OWNER_IDS.has(idStr)) {
    html += ` <i>(showing ${limit} of ${total})</i>`;
  }
  html += "\n";

  return html;
}

// Build inline-specific sources list that uses [1], [2] style clickable indices
function buildWebsearchSourcesInlineHtml(searchResult, userId) {
  if (!searchResult || !searchResult.success || !Array.isArray(searchResult.results) || searchResult.results.length === 0) {
    return "";
  }

  const total = searchResult.results.length;
  const limit = getWebsearchSourceLimit(userId, total);
  if (!limit) return "";

  const parts = [];
  for (let i = 0; i < limit; i++) {
    const r = searchResult.results[i];
    const url = r.url || "";
    const label = `[${i + 1}]`;

    if (url) {
      parts.push(`<a href="${url}">${label}</a>`);
    } else {
      parts.push(label);
    }
  }

  let html = "\n\n<b>Sources:</b> " + parts.join(", ");
  const idStr = String(userId);
  if (limit < total && !OWNER_IDS.has(idStr)) {
    html += ` <i>(showing ${limit} of ${total})</i>`;
  }
  html += "\n";

  return html;
}

// Turn numeric citations into [1], [2] form and make them clickable links to result URLs.
function linkifyWebsearchCitations(text, searchResult) {
  if (!text || !searchResult || !Array.isArray(searchResult.results) || searchResult.results.length === 0) {
    return text;
  }

  const total = searchResult.results.length;

  // First, normalize bare numeric citations like " 1." or " 2" into "[1]" / "[2]"
  text = text.replace(/(\s)(\d+)(?=(?:[)\].,!?;:]\s|[)\].,!?;:]?$|\s|$))/g, (match, space, numStr) => {
    const idx = parseInt(numStr, 10);
    if (!idx || idx < 1 || idx > total) return match;
    return `${space}[${idx}]`;
  });

  // Then, convert [1], [2] into Markdown links so convertToTelegramHTML renders them as <a href="...">[1]</a>
  return text.replace(/\[(\d+)\](?!\()/g, (match, numStr) => {
    const idx = parseInt(numStr, 10);
    if (!idx || idx < 1 || idx > total) return match;
    const r = searchResult.results[idx - 1];
    if (!r || !r.url) return match;
    return `[${idx}](${r.url})`;
  });
}

// =====================
// MARKDOWN CONVERTER - AI output to Telegram HTML format
// =====================
// AI outputs standard Markdown, but Telegram uses different syntax.
// We convert to HTML format which is most reliable and supports:
// - <b>bold</b>
// - <i>italic</i>
// - <u>underline</u>
// - <s>strikethrough</s>
// - <code>inline code</code>
// - <pre>code blocks</pre>
// - <pre><code class="language-xxx">syntax highlighted code</code></pre>
// - <blockquote>quotes</blockquote>
// - <a href="url">links</a>
function convertToTelegramHTML(text) {
  if (!text) return text;

  let result = String(text);

  // Step 1: Protect and convert code blocks with language (```python ... ```)
  const codeBlocksWithLang = [];
  result = result.replace(/```(\w+)\n([\s\S]*?)```/g, (match, lang, code) => {
    const escapedCode = escapeHTML(code.trim());
    codeBlocksWithLang.push(`<pre><code class="language-${lang}">${escapedCode}</code></pre>`);
    return `@@CODEBLOCK_LANG_${codeBlocksWithLang.length - 1}@@`;
  });

  // Step 2: Protect and convert code blocks without language (``` ... ```)
  const codeBlocks = [];
  result = result.replace(/```([\s\S]*?)```/g, (match, code) => {
    const escapedCode = escapeHTML(code.trim());
    codeBlocks.push(`<pre>${escapedCode}</pre>`);
    return `@@CODEBLOCK_${codeBlocks.length - 1}@@`;
  });

  // Step 3: Protect and convert inline code (`...`)
  const inlineCode = [];
  result = result.replace(/`([^`]+)`/g, (match, code) => {
    const escapedCode = escapeHTML(code);
    inlineCode.push(`<code>${escapedCode}</code>`);
    return `@@INLINECODE_${inlineCode.length - 1}@@`;
  });

  // Step 4: Escape remaining HTML special characters
  result = escapeHTML(result);

  // Step 5: Convert Markdown to HTML

  // Headers (# Header) -> bold
  result = result.replace(/^#{1,6}\s*(.+)$/gm, '<b>$1</b>');

  // Bold + Italic (***text*** or ___text___)
  result = result.replace(/\*\*\*([^*]+)\*\*\*/g, '<b><i>$1</i></b>');
  result = result.replace(/___([^_]+)___/g, '<b><i>$1</i></b>');

  // Bold (**text** or __text__)
  result = result.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  result = result.replace(/__([^_]+)__/g, '<b>$1</b>');

  // Italic (*text* or _text_)
  result = result.replace(/(?<!\w)\*([^*\n]+)\*(?!\w)/g, '<i>$1</i>');
  result = result.replace(/(?<!\w)_([^_\n]+)_(?!\w)/g, '<i>$1</i>');

  // Strikethrough (~~text~~)
  result = result.replace(/~~([^~]+)~~/g, '<s>$1</s>');

  // Block quotes (> text)
  // At this point '>' has been escaped to '&gt;' by escapeHTML, so we match that.
  result = result.replace(/^&gt;\s*(.+)$/gm, '<blockquote>$1</blockquote>');
  // Merge consecutive blockquotes
  result = result.replace(/<\/blockquote>\n<blockquote>/g, '\n');

  // Links [text](url)
  // If the link text is purely numeric (e.g. "1"), render it as a bracketed citation "[1]".
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, label, url) => {
    const trimmed = String(label).trim();
    if (/^\d+$/.test(trimmed)) {
      return `<a href="${url}">[${trimmed}]</a>`;
    }
    return `<a href="${url}">${trimmed}</a>`;
  });

  // Horizontal rules (--- or ***)
  result = result.replace(/^(---|\*\*\*|___)$/gm, '──────────');

  // Bullet points (- item or * item)
  result = result.replace(/^[-*]\s+(.+)$/gm, '• $1');

  // Numbered lists (1. item)
  result = result.replace(/^(\d+)\.\s+(.+)$/gm, '$1. $2');

  // Step 6: Restore code blocks and inline code
  inlineCode.forEach((code, i) => {
    result = result.replace(`@@INLINECODE_${i}@@`, code);
  });

  codeBlocks.forEach((code, i) => {
    result = result.replace(`@@CODEBLOCK_${i}@@`, code);
  });

  codeBlocksWithLang.forEach((code, i) => {
    result = result.replace(`@@CODEBLOCK_LANG_${i}@@`, code);
  });

  return result;
}

// Helper function to escape HTML special characters
function escapeHTML(text) {
  if (!text) return text;
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Split long DM/GC answers into a visible chunk and remaining text,
// avoiding cutting mid-word or mid-sentence where possible.
// We keep maxLen fairly conservative so that after Markdown -> HTML
// conversion we stay under Telegram's ~4096 character hard limit.
function splitAnswerForDM(full, maxLen = 2400) {
  if (!full) {
    return { visible: "", remaining: "", completed: true };
  }

  const trimmed = full.trim();
  if (trimmed.length <= maxLen) {
    return { visible: trimmed, remaining: "", completed: true };
  }

  let slice = trimmed.slice(0, maxLen);
  // Reuse tail trimming helper to avoid ugly mid-sentence endings
  const cleaned = trimIncompleteTail(slice);
  const visible = cleaned;
  const remaining = trimmed.slice(visible.length).trimStart();

  return {
    visible,
    remaining,
    completed: remaining.length === 0,
  };
}

// Escape special Markdown characters (for Telegram Markdown)
// NOTE: This is only used in a few legacy paths; most new flows use HTML via convertToTelegramHTML.
function escapeMarkdown(text) {
  if (!text) return text;
  return String(text)
    .replace(/\\/g, '\\\\')
    .replace(/\*/g, '\\*')
    .replace(/_/g, '\\_')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/~/g, '\\~')
    .replace(/`/g, '\\`')
    .replace(/>/g, '\\>')
    .replace(/#/g, '\\#')
    .replace(/\+/g, '\\+')
    .replace(/-/g, '\\-')
    .replace(/=/g, '\\=')
    .replace(/\|/g, '\\|')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/\./g, '\\.')
    .replace(/!/g, '\\!/'); 
}

// Trim incomplete tail of a long answer (avoid cutting mid-word or mid-sentence)
// Used for Blackhole continuation so we don't leave broken endings like "so it me"
function trimIncompleteTail(text, maxTail = 220) {
  if (!text) return text;
  const trimmed = text.trimEnd();
  if (!trimmed) return trimmed;

  const lastChar = trimmed[trimmed.length - 1];
  // If it already ends with sensible punctuation, leave it
  if (".?!)]\"'".includes(lastChar)) {
    return trimmed;
  }

  const start = Math.max(0, trimmed.length - maxTail);
  const tail = trimmed.slice(start);

  // Prefer to cut at a sentence boundary within the tail
  const lastDot = tail.lastIndexOf(".");
  const lastQ = tail.lastIndexOf("?");
  const lastEx = tail.lastIndexOf("!");
  const lastSentenceEnd = Math.max(lastDot, lastQ, lastEx);

  if (lastSentenceEnd !== -1) {
    return trimmed.slice(0, start + lastSentenceEnd + 1);
  }

  // Otherwise cut at last space to avoid half-words
  const lastSpace = tail.lastIndexOf(" ");
  if (lastSpace !== -1) {
    return trimmed.slice(0, start + lastSpace);
  }

  return trimmed;
}

// =====================
// PARALLEL EXTRACT API
// Extract and clean content from specific URLs using an external Extract API.
// NOTE: We intentionally avoid naming the provider in user-visible text for privacy.
async function parallelExtractUrls(urls) {
  if (!PARALLEL_API_KEY) {
    return {
      success: false,
      error: "Parallel API key not configured",
      urls,
    };
  }

  const urlList = Array.isArray(urls) ? urls.filter(Boolean) : [urls].filter(Boolean);
  if (!urlList.length) {
    return {
      success: false,
      error: "No URLs provided",
      urls: [],
    };
  }

  try {
    const res = await fetch("https://api.parallel.ai/v1beta/extract", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": PARALLEL_API_KEY,
        // Official beta header for Extract API as per docs:
        // "valid values are: search-extract-2025-10-10"
        "parallel-beta": "search-extract-2025-10-10",
      },
      // Match the minimal shape shown in the official Python example:
      // urls + simple boolean excerpts/full_content flags.
      body: JSON.stringify({
        urls: urlList,
        excerpts: true,
        full_content: true,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.log("Parallel extract HTTP error:", res.status, text.slice(0, 500));
      return {
        success: false,
        error: `HTTP ${res.status}: ${text.slice(0, 200) || "Unknown error from Parallel Extract API"}`,
        urls: urlList,
        status: res.status,
      };
    }

    const data = await res.json();
    const results = Array.isArray(data.results) ? data.results : [];

    const mapped = results.map((r) => {
      const excerpts =
        Array.isArray(r.excerpts)
          ? r.excerpts.join("\n\n")
          : (typeof r.excerpts === "string" ? r.excerpts : "");
      const content = excerpts || r.full_content || "";
      return {
        url: r.url || "",
        title: r.title || (r.url || "No title"),
        content: content || "No content extracted",
      };
    });

    return {
      success: true,
      results: mapped,
      urls: urlList,
    };
  } catch (e) {
    console.log("Parallel extract error:", e.message);
    return {
      success: false,
      error: e.message || "Parallel extract failed",
      urls: Array.isArray(urls) ? urls : [urls],
    };
  }
}

// =====================
// UI HELPERS
// =====================
function helpText() {
  return [
    "⚡ *StarzAI* — Your AI Assistant",
    "",
    "📌 *Basic Commands*",
    "• /start — Welcome message",
    "• /help — This help menu",
    "• /model — Choose AI model",
    "• /reset — Clear chat memory",
    "",
    "🌟 *Feature Commands*",
    "• /partner — Create your AI companion",
    "• /char — Quick character roleplay",
    "• /persona — Set AI personality",
    "• /stats — Your usage statistics",
    "• /search — Web search (raw results)",
    "• /websearch — AI web search with summary",
    FEEDBACK_CHAT_ID ? "• /feedback — Send feedback to the StarzAI team" : "",
    "",
    "🕐 *Time & Date*",
    "• Ask things like: `what's the time in Tokyo?`, `current date in London`",
    "",
    "⌨️ *Inline Modes* (type @starztechbot)",
    "• `q:` — ⭐ Quark (quick answers)",
    "• `b:` — 🗿🔬 Blackhole (deep research)",
    "• `code:` — 💻 Code help",
    "• `e:` — 🧠 Explain (ELI5)",
    "• `as [char]:` — 🎭 Character roleplay",
    "• `sum:` — 📝 Summarize text",
    "• `p:` — 🤝🏻 Partner chat",
    "",
    "🔧 *Owner commands*",
    "• /status, /info, /grant, /revoke, /ban, /unban, /softban, /warn, /clearwarns, /banlist, /mute, /unmute, /mutelist, /ownerhelp",
  ]
    .filter(Boolean)
    .join("\n");
}

// Main menu message builder
function buildMainMenuMessage(userId) {
  const u = getUserRecord(userId);
  const model = ensureChosenModelValid(userId);
  const tier = u?.tier?.toUpperCase() || "FREE";
  const shortModel = model.split("/").pop();
  
  return [
    "⚡ *StarzAI* — Your AI Assistant",
    "",
    `👤 *Tier:* ${tier}  •  🤖 *Model:* \`${shortModel}\``,
    "",
    "━━━━━━━━━━━━━━━━━━━━━━",
    "",
    "💬 *DM* — Chat directly with AI",
    "👥 *Groups* — Say \"Starz\" / \"StarzAI\" or reply to the bot",
    "⌨️ *Inline* — Type @starztechbot anywhere",
    "",
    "━━━━━━━━━━━━━━━━━━━━━━",
    "",
    "_Tap a button below to explore!_",
  ].join("\n");
}

// Main menu keyboard
function mainMenuKeyboard(userId) {
  const user = getUserRecord(userId);
  const webSearchIcon = user?.webSearch ? "🌐 Web: ON" : "🔍 Web: OFF";
  
  const kb = new InlineKeyboard()
    .text("🌟 Features", "menu_features")
    .text("⚙️ Model", "menu_model")
    .row()
    .text("🤝🏻 Partner", "menu_partner")
    .text("📋 Tasks", "todo_list")
    .row()
    .text("🎭 Character", "menu_char")
    .text("📊 Stats", "menu_stats")
    .row()
    .text(webSearchIcon, "toggle_websearch")
    .switchInline("⚡ Try Inline", "");

  if (FEEDBACK_CHAT_ID) {
    kb.row().text("💡 Feedback", "menu_feedback");
  }

  return kb;
}

// Back button keyboard
function backToMainKeyboard() {
  return new InlineKeyboard().text("« Back to Menu", "menu_back");
}

// Legacy helpKeyboard for compatibility
function helpKeyboard(userId) {
  return mainMenuKeyboard(userId);
}

// Beautiful inline help card
function buildInlineHelpCard() {
  return [
    "✨ *StarzAI - Your AI Assistant* ✨",
    "",
    "━━━━━━━━━━━━━━━━━━━━━━",
    "🌟 *FEATURES*",
    "━━━━━━━━━━━━━━━━━━━━━━",
    "",
    "⚡ *AI Modes*",
    "• ⭐ Quark - Lightning fast answers",
    "• 🗿🔬 Blackhole - Deep research",
    "• 💻 Code - Programming help",
    "• 🧠 Explain - Simple explanations",
    "• 🎭 Character - Fun roleplay",
    "• 📝 Summarize - Condense text",
    "",
    "🤝🏻 *AI Partner*",
    "Create your custom AI companion!",
    "",
    "🎭 *Character Mode*",
    "Quick roleplay as any character",
    "",
    "━━━━━━━━━━━━━━━━━━━━━━",
    "📖 *HOW TO USE*",
    "━━━━━━━━━━━━━━━━━━━━━━",
    "",
    "💬 *DM* - Just send a message!",
    "👥 *Groups* - Say \"Starz\" / \"StarzAI\" or reply to the bot",
    "⌨️ *Inline* - Type @starztechbot anywhere",
    "",
    "━━━━━━━━━━━━━━━━━━━━━━",
    "⌨️ *INLINE MODES*",
    "━━━━━━━━━━━━━━━━━━━━━━",
    "",
    "`q:` → ⭐ Quark (quick)",
    "`b:` → 🗿🔬 Blackhole (deep)",
    "`code:` → 💻 Code help",
    "`e:` → 🧠 Explain (ELI5)",
    "`as [char]:` → 🎭 Character",
    "`sum:` → 📝 Summarize",
    "`p:` → 🤝🏻 Partner chat",
    "",
    "━━━━━━━━━━━━━━━━━━━━━━",
    "",
    "💖 *Thank you for using StarzAI!*",
  ].join("\n");
}

// Partner setup helpers
function buildPartnerSetupMessage(partner) {
  if (!partner) {
    return [
      "🤝🏻 *Create Your AI Partner*",
      "",
      "Set up a personalized AI companion!",
      "Tap the buttons below to configure:",
      "",
      "⬜ *Name* - Not set",
      "⬜ *Personality* - Not set",
      "⬜ *Background* - Not set",
      "⬜ *Style* - Not set",
      "",
      "_Tap a button to set each field_",
    ].join("\n");
  }
  
  const status = partner.active ? "🟢 Active" : "⚪ Inactive";
  const chatCount = getPartnerChatHistory(partner.userId || 0)?.length || 0;
  
  const nameStatus = partner.name ? `✅ *Name:* ${partner.name}` : "⬜ *Name* - Not set";
  const persStatus = partner.personality ? `✅ *Personality:* ${partner.personality.slice(0, 40)}${partner.personality.length > 40 ? "..." : ""}` : "⬜ *Personality* - Not set";
  const bgStatus = partner.background ? `✅ *Background:* ${partner.background.slice(0, 40)}${partner.background.length > 40 ? "..." : ""}` : "⬜ *Background* - Not set";
  const styleStatus = partner.style ? `✅ *Style:* ${partner.style.slice(0, 40)}${partner.style.length > 40 ? "..." : ""}` : "⬜ *Style* - Not set";
  
  return [
    `🤝🏻 *Your AI Partner* ${status}`,
    "",
    nameStatus,
    persStatus,
    bgStatus,
    styleStatus,
    "",
    `💬 *Chat history:* ${chatCount} messages`,
    "",
    "_Tap buttons to edit or start chatting_",
  ].join("\n");
}

function buildPartnerKeyboard(partner) {
  const kb = new InlineKeyboard();
  
  // Setup buttons row 1
  kb.text(partner?.name ? `✏️ Name` : `➕ Name`, "partner_set_name")
    .text(partner?.personality ? `✏️ Personality` : `➕ Personality`, "partner_set_personality");
  kb.row();
  
  // Setup buttons row 2
  kb.text(partner?.background ? `✏️ Background` : `➕ Background`, "partner_set_background")
    .text(partner?.style ? `✏️ Style` : `➕ Style`, "partner_set_style");
  kb.row();
  
  // Action buttons
  if (partner?.name) {
    kb.text(partner?.active ? "⏹ Stop Chat" : "💬 Start Chat", partner?.active ? "partner_stop" : "partner_chat");
    kb.text("🗑 Clear Chat", "partner_clearchat");
    kb.row();
    kb.text("❌ Delete Partner", "partner_delete");
    kb.row();
  }
  
  // Add back to main menu button
  kb.text("« Back to Menu", "menu_back");
  
  return kb;
}

function inlineAnswerKeyboard(key) {
  const item = inlineCache.get(key);
  const mode = item?.mode || "default";
  const isBlackhole = mode === "blackhole";
  const isQuark = mode === "quark";
  const isSummarize = mode === "summarize";
  const isExplain = mode === "explain";
  const isCode = mode === "code";
  const isCompleted = Boolean(item?.completed);

  const user = item?.userId ? getUserRecord(item.userId) : null;
  const tier = user?.tier || "free";
  const isUltraUser = tier === "ultra";
  const isPremiumUser = tier === "premium";

  const originalAnswer = item?.originalAnswer;
  const hasOriginal = typeof originalAnswer === "string" && originalAnswer.length > 0;
  const transformed = hasOriginal && item?.answer !== originalAnswer;

  const shortCount = typeof item?.shortCount === "number" ? item.shortCount : 0;
  const longCount = typeof item?.longCount === "number" ? item.longCount : 0;
  const transformsUsed = typeof item?.transformsUsed === "number" ? item.transformsUsed : 0;
  const shortLongLocked = !!item?.shortLongLocked;

  // Regen limits per tier (per answer)
  const regenCount = typeof item?.regenCount === "number" ? item.regenCount : 0;
  let maxRegen = 1;
  if (isUltraUser) maxRegen = 3;
  else if (isPremiumUser) maxRegen = 2;
  const canRegen = regenCount < maxRegen;

  let canShort = false;
  let canLong = false;

  if (isUltraUser) {
    // Ultra: up to 2 Shorter and 2 Longer per answer
    canShort = shortCount < 2;
    canLong = longCount < 2;
  } else if (isPremiumUser) {
    // Premium: up to 2 transforms total (any combination)
    const remaining = Math.max(0, 2 - transformsUsed);
    canShort = remaining > 0;
    canLong = remaining > 0;
  } else {
    // Free: 1 transform total per answer
    canShort = !shortLongLocked && transformsUsed === 0;
    canLong = !shortLongLocked && transformsUsed === 0;
  }

  const showRevert = hasOriginal && transformed;

  // Ultra Summary results themselves: special, simpler controls
  if (isSummarize) {
    const kb = new InlineKeyboard().switchInlineCurrent("💬 Reply", `c:${key}: `);
    if (canRegen) {
      kb.text("🔁 Regen", `inl_regen:${key}`);
    }

    kb.row();
    if (canShort) kb.text("✂️ More concise", `inl_short:${key}`);
    if (canLong) kb.text("📚 More detail", `inl_long:${key}`);
    if (showRevert) {
      if (!canShort && !canLong) kb.row();
      kb.text("↩️ Revert", `inl_revert:${key}`);
    }
    return kb;
  }

  const kb = new InlineKeyboard().switchInlineCurrent("💬 Reply", `c:${key}: `);
  if (canRegen) {
    kb.text("🔁 Regen", `inl_regen:${key}`);
  }

  // Shorter/Longer + Revert row (all non-summary modes)
  kb.row();
  if (canShort) kb.text("✂️ Shorter", `inl_short:${key}`);
  if (canLong) kb.text("📈 Longer", `inl_long:${key}`);
  if (showRevert) {
    if (!canShort && !canLong) kb.row();
    kb.text("↩️ Revert", `inl_revert:${key}`);
  }

  // Quark: no Continue or Ultra Summary (already one-shot)
  if (isQuark) {
    return kb;
  }

  // Continue / Ultra Summary buttons (mode-dependent)
  if (isBlackhole) {
    // For Blackhole, use inline mode so continuation/summary become new messages.
    if (!isCompleted) {
      kb.row().switchInlineCurrent("➡️ Continue", `bhcont ${key}`);
    } else if (isUltraUser) {
      // Once full analysis is done, offer Ultra Summary as a new inline message for Ultra users.
      kb.row().switchInlineCurrent("🧾 Ultra Summary", `ultrasum ${key}`);
    }
  } else if (isExplain || isCode) {
    // Explain & Code: callback-based continuation while incomplete.
    if (!isCompleted) {
      kb.row().text("➡️ Continue", `inl_cont:${key}`);
    } else if (isUltraUser) {
      // When fully revealed, provide Ultra Summary as a new inline message for Ultra users.
      kb.row().switchInlineCurrent("🧾 Ultra Summary", `ultrasum ${key}`);
    }
  } else {
    // Other modes (quick, research, chat, etc.): standard Continue while available.
    if (!isCompleted) {
      kb.row().text("➡️ Continue", `inl_cont:${key}`);
    }
  }

  return kb;
}

// =====================
// INLINE CHAT UI
// =====================
function formatInlineChatDisplay(session, userId) {
  const u = ensureUser(userId);
  const history = session.history || [];
  const model = session.model || ensureChosenModelValid(userId);
  
  let display = `🤖 *StarzAI Chat*\n`;
  display += `📊 Model: \`${model}\`\n`;
  display += `━━━━━━━━━━━━━━━\n\n`;
  
  if (history.length === 0) {
    display += `_No messages yet._\n_Type your message to start chatting!_`;
  } else {
    // Show last 4 exchanges (8 messages)
    const recentHistory = history.slice(-8);
    for (const msg of recentHistory) {
      if (msg.role === "user") {
        display += `👤 *You:* ${msg.content.slice(0, 200)}${msg.content.length > 200 ? "..." : ""}\n\n`;
      } else {
        display += `🤖 *AI:* ${msg.content.slice(0, 400)}${msg.content.length > 400 ? "..." : ""}\n\n`;
      }
    }
  }
  
  display += `\n━━━━━━━━━━━━━━━`;
  return display.slice(0, 3800);
}

function inlineChatKeyboard(sessionKey, hasHistory = false) {
  const kb = new InlineKeyboard();
  
  // Main action row
  kb.text("💬 Reply", `ichat_reply:${sessionKey}`)
    .text("🔄 Regen", `ichat_regen:${sessionKey}`);
  kb.row();
  
  // Secondary actions
  kb.text("🗑️ Clear", `ichat_clear:${sessionKey}`)
    .text("⚙️ Model", `ichat_model:${sessionKey}`);
  kb.row();
  
  // Switch inline to continue conversation
  kb.switchInlineCurrentChat("✏️ Type message...", "chat:");
  
  return kb;
}

function inlineModelSelectKeyboard(sessionKey, userId) {
  const u = ensureUser(userId);
  const session = getInlineSession(userId);
  const currentModel = session.model;
  const allowed = allModelsForTier(u.tier);
  
  const kb = new InlineKeyboard();
  
  // Show up to 6 models
  const models = allowed.slice(0, 6);
  for (let i = 0; i < models.length; i++) {
    const m = models[i];
    const isSelected = m === currentModel;
    kb.text(`${isSelected ? "✅ " : ""}${m.split("/").pop()}`, `ichat_setmodel:${sessionKey}:${m}`);
    if (i % 2 === 1) kb.row();
  }
  if (models.length % 2 === 1) kb.row();
  
  kb.text("« Back", `ichat_back:${sessionKey}`);
  
  return kb;
}



// =====================
// SETTINGS MENU KEYBOARDS (for editable inline message)
// =====================

// Main settings menu - shows model categories
function settingsMainKeyboard(userId) {
  const kb = new InlineKeyboard();
  const user = getUserRecord(userId);
  const tier = user?.tier || "free";
  
  kb.text("🆓 Free Models", "setmenu:free").row();
  
  if (tier === "premium" || tier === "ultra") {
    kb.text("⭐ Premium Models", "setmenu:premium").row();
  }
  
  if (tier === "ultra") {
    kb.text("💎 Ultra Models", "setmenu:ultra").row();
  }
  
  kb.text("❌ Close", "setmenu:close");
  
  return kb;
}

// Category submenu - shows models in a category with pagination (4 per page)
function settingsCategoryKeyboard(category, userId, currentModel, page = 0) {
  const kb = new InlineKeyboard();
  const user = getUserRecord(userId);
  const tier = user?.tier || "free";
  
  let models = [];
  if (category === "free") models = [...FREE_MODELS, ...GITHUB_FREE_MODELS];
  else if (category === "premium" && (tier === "premium" || tier === "ultra")) models = [...PREMIUM_MODELS, ...GITHUB_PREMIUM_MODELS];
  else if (category === "ultra" && tier === "ultra") models = [...ULTRA_MODELS, ...GITHUB_ULTRA_MODELS];
  
  const MODELS_PER_PAGE = 4;
  const totalPages = Math.ceil(models.length / MODELS_PER_PAGE);
  const startIdx = page * MODELS_PER_PAGE;
  const pageModels = models.slice(startIdx, startIdx + MODELS_PER_PAGE);
  
  // Show models (4 per page, 1 per row for clean mobile display)
  pageModels.forEach((m) => {
    const mShort = m.split("/").pop();
    const isSelected = m === currentModel;
    const label = isSelected ? `✅ ${mShort}` : mShort;
    kb.text(label, `setmodel:${m}`).row();
  });
  
  // Pagination row
  if (totalPages > 1) {
    const navRow = [];
    if (page > 0) {
      kb.text("◀️", `setpage:${category}:${page - 1}`);
    }
    kb.text(`${page + 1}/${totalPages}`, "noop");
    if (page < totalPages - 1) {
      kb.text("▶️", `setpage:${category}:${page + 1}`);
    }
    kb.row();
  }
  
  kb.text("⬅️ Back", "setmenu:back");
  
  return kb;
}



// Inline settings keyboard - shows model categories
function inlineSettingsCategoryKeyboard(sessionKey, userId) {
  const kb = new InlineKeyboard();
  const user = getUserRecord(userId);
  const tier = user?.tier || "free";
  
  // Show categories based on user tier
  kb.text("🆓 Free Models", `iset_cat:free:${sessionKey}`);
  kb.row();
  
  if (tier === "premium" || tier === "ultra") {
    kb.text("⭐ Premium Models", `iset_cat:premium:${sessionKey}`);
    kb.row();
  }
  
  if (tier === "ultra") {
    kb.text("💎 Ultra Models", `iset_cat:ultra:${sessionKey}`);
    kb.row();
  }
  
  return kb;
}

// Inline settings - model list for a category with pagination (4 per page)
function inlineSettingsModelKeyboard(category, sessionKey, userId, page = 0) {
  const kb = new InlineKeyboard();
  const user = getUserRecord(userId);
  const currentModel = user?.model || "";
  
  let models = [];
  if (category === "free") models = [...FREE_MODELS, ...GITHUB_FREE_MODELS];
  else if (category === "premium") models = [...PREMIUM_MODELS, ...GITHUB_PREMIUM_MODELS];
  else if (category === "ultra") models = [...ULTRA_MODELS, ...GITHUB_ULTRA_MODELS];
  
  const MODELS_PER_PAGE = 4;
  const totalPages = Math.ceil(models.length / MODELS_PER_PAGE);
  const startIdx = page * MODELS_PER_PAGE;
  const pageModels = models.slice(startIdx, startIdx + MODELS_PER_PAGE);
  
  // Show models (4 per page, 1 per row for clean mobile display)
  pageModels.forEach((m) => {
    const mShort = m.split("/").pop();
    const isSelected = m === currentModel;
    const label = isSelected ? `✅ ${mShort}` : mShort;
    kb.text(label, `iset_model:${m}:${sessionKey}`).row();
  });
  
  // Pagination row
  if (totalPages > 1) {
    if (page > 0) {
      kb.text("◀️", `iset_page:${category}:${page - 1}:${sessionKey}`);
    }
    kb.text(`${page + 1}/${totalPages}`, "noop");
    if (page < totalPages - 1) {
      kb.text("▶️", `iset_page:${category}:${page + 1}:${sessionKey}`);
    }
    kb.row();
  }
  
  // Back button
  kb.text("← Back", `iset_back:${sessionKey}`);
  
  return kb;
}

// =====================
// COMMANDS
// =====================
bot.command("start", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  if (!(await enforceCommandCooldown(ctx))) return;
  ensureUser(ctx.from.id, ctx.from);

  const chatType = ctx.chat.type;

  // Deep-link handling in private chat, e.g. /start group_-100123...
  if (chatType === "private") {
    const text = ctx.message.text || "";
    const args = text.split(" ").slice(1);
    const param = args[0];

    if (param && param.startsWith("group_")) {
      const groupId = param.slice("group_".length);
      const u = ctx.from;
      if (u?.id) {
        pendingFeedback.set(String(u.id), {
          createdAt: Date.now(),
          source: "group_unauthed",
          groupId,
        });
      }

      await ctx.reply(
        "💡 *Feedback Mode* (group)\\n\\n" +
          `We detected this group ID: \`${groupId}\`.\\n\\n` +
          "Please send *one message* describing the problem (for example why you want it authorized).\\n" +
          "You can attach *one photo or video* with a caption, or just send text.\\n\\n" +
          "_You have 2 minutes. After that, feedback mode will expire._",
        {
          parse_mode: "Markdown",
          reply_to_message_id: ctx.message?.message_id,
        }
      );
      return;
    }

    // Handle feedback deep link
    if (param === "feedback") {
      if (!FEEDBACK_CHAT_ID) {
        return ctx.reply("⚠️ Feedback is not configured yet. Please try again later.", {
          reply_to_message_id: ctx.message?.message_id,
        });
      }
      
      const u = ctx.from;
      if (!u?.id) return;
      
      pendingFeedback.set(String(u.id), { createdAt: Date.now(), source: "deeplink" });
      return ctx.reply(
        "💡 *Feedback Mode*\\n\\n" +
          "Please send *one message* with your feedback.\\n" +
          "You can attach *one photo or video* with a caption, or just send text.\\n\\n" +
          "_You have 2 minutes. After that, feedback mode will expire._",
        {
          parse_mode: "Markdown",
          reply_to_message_id: ctx.message?.message_id,
        }
      );
    }
  }

  await ctx.reply(buildMainMenuMessage(ctx.from.id), {
    parse_mode: "Markdown",
    reply_markup: mainMenuKeyboard(ctx.from.id),
    reply_to_message_id: ctx.message?.message_id,
  });
});

bot.command("help", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  if (!(await enforceCommandCooldown(ctx))) return;
  ensureUser(ctx.from.id, ctx.from);
  
  await ctx.reply(buildMainMenuMessage(ctx.from.id), {
    parse_mode: "Markdown",
    reply_markup: mainMenuKeyboard(ctx.from.id),
    reply_to_message_id: ctx.message?.message_id,
  });
});

// /search command - Web search (counts against daily websearch quota)
bot.command("search", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  if (!(await enforceCommandCooldown(ctx))) return;
  ensureUser(ctx.from.id, ctx.from);
  
  const query = ctx.message.text.replace(/^\/search\s*/i, "").trim();
  
  if (!query) {
    return ctx.reply("🔍 <b>Web Search</b>\\n\\nUsage: <code>/search your query here</code>\\n\\nExample: <code>/search latest AI news</code>", {
      parse_mode: "HTML",
      reply_to_message_id: ctx.message?.message_id,
    });
  }
  
  const statusMsg = await ctx.reply(`🔍 Searching for: <i>${escapeHTML(query)}</i>...`, {
    parse_mode: "HTML",
    reply_to_message_id: ctx.message?.message_id,
  });
  
  try {
    const quota = consumeWebsearchQuota(ctx.from.id);
    if (!quota.allowed) {
      const user = getUserRecord(ctx.from.id);
      const tierLabel = (user?.tier || "free").toUpperCase();
      const limit = quota.limit ?? 0;
      const used = quota.used ?? limit;
      const msg =
        `🌐 <b>Daily websearch limit reached</b>\\n\\n` +
        `Tier: <b>${escapeHTML(tierLabel)}</b>\\n` +
        `Today: <b>${used}/${limit}</b> websearches used.\\n\\n` +
        `<i>Try again tomorrow or upgrade your plan for more websearches.</i>`;
      await ctx.api.editMessageText(ctx.chat.id, statusMsg.message_id, msg, {
        parse_mode: "HTML",
      });
      return;
    }

    const searchResult = await webSearch(query, 5);
    
    if (!searchResult.success) {
      return ctx.api.editMessageText(ctx.chat.id, statusMsg.message_id, 
        `❌ Search failed: ${escapeHTML(searchResult.error)}`, 
        { parse_mode: "HTML" });
    }
    
    // Format results for display
    let response = `🔍 <b>Search Results for:</b> <i>${escapeHTML(query)}</i>\\n\\n`;
    
    searchResult.results.forEach((r, i) => {
      response += `<b>${i + 1}. ${escapeHTML(r.title)}</b>\\n`;
      response += `<a href="${r.url}">${escapeHTML(r.url.slice(0, 50))}${r.url.length > 50 ? '...' : ''}</a>\\n`;
      response += `${escapeHTML(r.content.slice(0, 150))}${r.content.length > 150 ? '...' : ''}\\n\\n`;
    });
    
    response += `<i>🌐 via ${searchResult.instance.replace('https://', '')}</i>`;
    
    await ctx.api.editMessageText(ctx.chat.id, statusMsg.message_id, response, { 
      parse_mode: "HTML",
      disable_web_page_preview: true 
    });
    
    trackUsage(ctx.from.id, "message");
    
  } catch (e) {
    console.error("Search error:", e);
    await ctx.api.editMessageText(ctx.chat.id, statusMsg.message_id, 
      `❌ Search error: ${escapeHTML(e.message?.slice(0, 100) || 'Unknown error')}`, 
      { parse_mode: "HTML" });
  }
});

// /websearch command - Search and get AI summary (uses daily websearch quota)
bot.command("websearch", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  if (!(await enforceCommandCooldown(ctx))) return;
  ensureUser(ctx.from.id, ctx.from);
  
  const query = ctx.message.text.replace(/^\/websearch\s*/i, "").trim();
  
  if (!query) {
    return ctx.reply(
      "🔍 <b>AI Web Search</b>\\n\\nUsage: <code>/websearch your question</code>\\n\\nSearches the web and gives you an AI-summarized answer.\\n\\nExample: <code>/websearch What's the latest news about Tesla?</code>",
      {
        parse_mode: "HTML",
        reply_to_message_id: ctx.message?.message_id,
      }
    );
  }
  
  const statusMsg = await ctx.reply(
    `🔍 Searching and analyzing: <i>${escapeHTML(query)}</i>...`,
    {
      parse_mode: "HTML",
      reply_to_message_id: ctx.message?.message_id,
    }
  );
  
  try {
    const model = ensureChosenModelValid(ctx.from.id);
    const quota = consumeWebsearchQuota(ctx.from.id);
    const startTime = Date.now();

    // If quota is exhausted, fall back to an offline-style answer without live web results
    if (!quota.allowed) {
      const offlineResponse = await llmText({
        model,
        messages: [
          {
            role: "system",
            content:
              "You are a helpful assistant. You do NOT have access to live web search for this request. " +
              "Answer based on your existing knowledge only. If you are unsure or information may be outdated, say so clearly."
          },
          {
            role: "user",
            content: `Question (no live websearch available): ${query}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 800,
      });

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const aiText = offlineResponse || "";

      let response = `🔍 <b>AI Web Search</b>\n\n`;
      response += `<b>Query:</b> <i>${escapeHTML(query)}</i>\n\n`;
      response += convertToTelegramHTML(aiText.slice(0, 3500));
      response += `\n\n<i>⚠️ Daily websearch limit reached — answered without live web results • ${elapsed}s • ${escapeHTML(model)}</i>`;

      await ctx.api.editMessageText(ctx.chat.id, statusMsg.message_id, response, {
        parse_mode: "HTML",
        disable_web_page_preview: true,
      });

      trackUsage(ctx.from.id, "message");
      return;
    }

    // Search the web (quota available)
    const searchResult = await webSearch(query, 5);
    
    if (!searchResult.success) {
      return ctx.api.editMessageText(
        ctx.chat.id,
        statusMsg.message_id, 
        `❌ Search failed: ${escapeHTML(searchResult.error)}`, 
        { parse_mode: "HTML" }
      );
    }
    
    await ctx.api.editMessageText(
      ctx.chat.id,
      statusMsg.message_id, 
      `🔍 Found ${searchResult.results.length} results, analyzing with AI...`, 
      { parse_mode: "HTML" }
    );
    
    // Format search results for AI
    const searchContext = formatSearchResultsForAI(searchResult);
    
    // Get AI to summarize
    const aiResponse = await llmText({
      model,
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant with access to real-time web search results.\n" +
            "\n" +
            "CRITICAL CITATION INSTRUCTIONS:\n" +
            "• Every non-obvious factual claim should be backed by a source index like [1], [2], etc.\n" +
            "• When you summarize multiple sources, include multiple indices, e.g. [1][3].\n" +
            "• If you mention a specific number, date, name, or quote, always attach the source index.\n" +
            "• Never invent citations; only use indices that exist in the search results.\n" +
            "\n" +
            "GENERAL STYLE:\n" +
            "• Use short paragraphs and bullet points so the answer is easy to scan.\n" +
            "• Make it clear which parts come from which sources via [index] references.\n" +
            "• For short verbatim excerpts (1–2 sentences), use quote blocks (lines starting with '>').\n" +
            "• If the search results don't contain relevant information, say so explicitly."
        },
        {
          role: "user",
          content:
            `${searchContext}\n\n` +
            `User's question: ${query}\n\n` +
            "The numbered search results above are your ONLY sources of truth. " +
            "Write an answer that:\n" +
            "1) Directly answers the user's question, and\n" +
            "2) Explicitly cites sources using [1], [2], etc next to the claims.\n" +
            "Do not cite sources that are not provided."
        }
      ],
      temperature: 0.6,
      max_tokens: 800
    });
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    
    let aiText = aiResponse || "";
    aiText = linkifyWebsearchCitations(aiText, searchResult);
    
    let response = `🔍 <b>AI Web Search</b>\n\n`;
    response += `<b>Query:</b> <i>${escapeHTML(query)}</i>\n\n`;
    response += convertToTelegramHTML(aiText.slice(0, 3500));
    response += buildWebsearchSourcesHtml(searchResult, ctx.from.id);
    response += `\n\n<i>🌐 ${searchResult.results.length} sources • ${elapsed}s • ${escapeHTML(model)}</i>`;
    
    await ctx.api.editMessageText(ctx.chat.id, statusMsg.message_id, response, { 
      parse_mode: "HTML",
      disable_web_page_preview: true 
    });
    
    trackUsage(ctx.from.id, "message");
    
  } catch (e) {
    console.error("Websearch error:", e);
    await ctx.api.editMessageText(
      ctx.chat.id,
      statusMsg.message_id, 
      `❌ Error: ${escapeHTML(e.message?.slice(0, 100) || "Unknown error")}`, 
      { parse_mode: "HTML" }
    );
  }
});

// /extract command - Extract content from a specific URL using an external Extract API
bot.command("extract", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  if (!(await enforceCommandCooldown(ctx))) return;
  ensureUser(ctx.from.id, ctx.from);

  const full = ctx.message.text.replace(/^\/extract\s*/i, "").trim();

  if (!full) {
    const help = [
      "🧲 <b>Extract content from a URL</b>",
      "",
      "Usage:",
      "<code>/extract https://example.com/article</code>",
      "<code>/extract https://example.com/article What are the main points?</code>",
      "",
      "The bot fetches the page via an Extract API, pulls the important content,",
      "and (optionally) answers your question about it."
    ].join("\\n");
    return ctx.reply(help, {
      parse_mode: "HTML",
      reply_to_message_id: ctx.message?.message_id,
    });
  }

  if (!PARALLEL_API_KEY) {
    return ctx.reply(
      "⚠️ Extract API is not configured yet. Set the appropriate API key in env to enable it.",
      {
        parse_mode: "HTML",
        reply_to_message_id: ctx.message?.message_id,
      }
    );
  }

  // Split into URL + optional question
  const parts = full.split(/\s+/);
  const url = parts.shift();
  const question = parts.join(" ").trim();

  if (!url || !/^https?:\/\//i.test(url)) {
    return ctx.reply(
      "❌ Please provide a valid URL.\\nExample: <code>/extract https://example.com/article</code>",
      {
        parse_mode: "HTML",
        reply_to_message_id: ctx.message?.message_id,
      }
    );
  }

  const statusMsg = await ctx.reply(
    `🧲 Extracting content from: <a href="${escapeHTML(url)}">${escapeHTML(url.slice(0, 60))}${url.length > 60 ? "..." : ""}</a>`,
    {
      parse_mode: "HTML",
      disable_web_page_preview: true,
      reply_to_message_id: ctx.message?.message_id,
    }
  );

  try {
    // Extract full content for this URL
    const extractResult = await parallelExtractUrls(url);

    if (!extractResult.success || !extractResult.results || extractResult.results.length === 0) {
      const msg = extractResult.error
        ? `❌ Extract failed: ${escapeHTML(extractResult.error)}`
        : "❌ Extract failed: no content returned.";
      await ctx.api.editMessageText(ctx.chat.id, statusMsg.message_id, msg, {
        parse_mode: "HTML",
      });
      return;
    }

    const first = extractResult.results[0];
    const pageTitle = first.title || url;
    const pageContent = first.content || "";

    // If user didn't ask a question, just summarize the page
    const userQuestion = question || "Summarize the main points of this page.";

    const model = ensureChosenModelValid(ctx.from.id);
    const startTime = Date.now();

    const prompt = [
      `You are a helpful assistant. You are given content extracted from a single web page.`,
      `Answer the user's request using ONLY this content. If something is not in the content, say you don't know.`,
      ``,
      `Page URL: ${url}`,
      `Page title: ${pageTitle}`,
      ``,
      `--- START OF EXTRACTED CONTENT ---`,
      pageContent.slice(0, 8000),
      `--- END OF EXTRACTED CONTENT ---`,
      ``,
      `User request: ${userQuestion}`,
    ].join("\n");

    const answer = await llmText({
      model,
      messages: [
        { role: "system", content: "You answer questions based only on the provided page content." },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 800,
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const safeTitle = escapeHTML(pageTitle);

    let response = `🧲 <b>Extracted from:</b> <a href="${escapeHTML(url)}">${safeTitle}</a>\n\n`;
    response += convertToTelegramHTML((answer || "").slice(0, 3500));
    response += `\n\n<i>🔗 Extract • ${elapsed}s • ${escapeHTML(model)}</i>`;

    await ctx.api.editMessageText(ctx.chat.id, statusMsg.message_id, response, {
      parse_mode: "HTML",
      disable_web_page_preview: false,
    });

    trackUsage(ctx.from.id, "message");
  } catch (e) {
    console.error("Extract command error:", e);
    await ctx.api.editMessageText(
      ctx.chat.id,
      statusMsg.message_id,
      `❌ Error while extracting: ${escapeHTML(e.message?.slice(0, 120) || "Unknown error")}`,
      { parse_mode: "HTML" }
    );
  }
});

bot.command("register", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  if (!(await enforceCommandCooldown(ctx))) return;

  const u = ctx.from;
  if (!u?.id) {
    return ctx.reply("Could not get your user info.", {
      reply_to_message_id: ctx.message?.message_id,
    });
  }

  if (getUserRecord(u.id)) {
    return ctx.reply("✅ You're already registered.", {
      reply_markup: helpKeyboard(),
      reply_to_message_id: ctx.message?.message_id,
    });
  }

  registerUser(u);
  await ctx.reply("✅ Registered! Use /model to choose models.", {
    reply_markup: helpKeyboard(),
    reply_to_message_id: ctx.message?.message_id,
  });
});

bot.command("reset", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  if (!(await enforceCommandCooldown(ctx))) return;
  chatHistory.delete(ctx.chat.id);
  await ctx.reply("Done. Memory cleared for this chat.", {
    reply_to_message_id: ctx.message?.message_id,
  });
});

// Group activation commands
bot.command("stop", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  if (!(await enforceCommandCooldown(ctx))) return;

  if (ctx.chat.type === "private") {
    return ctx.reply("ℹ️ This command is for group chats. In DMs, I'm always listening!", {
      reply_to_message_id: ctx.message?.message_id,
    });
  }
  
  deactivateGroup(ctx.chat.id);
  await ctx.reply("🚫 Bot is now dormant. Mention me or reply to wake me up!", {
    parse_mode: "HTML",
    reply_to_message_id: ctx.message?.message_id,
  });
});

bot.command("talk", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  if (!(await enforceCommandCooldown(ctx))) return;

  if (ctx.chat.type === "private") {
    return ctx.reply("ℹ️ This command is for group chats. In DMs, I'm always listening!", {
      reply_to_message_id: ctx.message?.message_id,
    });
  }
  
  activateGroup(ctx.chat.id);
  const remaining = getGroupActiveRemaining(ctx.chat.id);
  await ctx.reply(
    `✅ Bot is now active! I'll respond to all messages for ${Math.ceil(remaining / 60)} minutes.\n\nUse /stop to make me dormant again.`,
    {
      parse_mode: "HTML",
      reply_to_message_id: ctx.message?.message_id,
    }
  );
});

// /feedback - entrypoint for feedback flow (DM only)
bot.command("feedback", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  if (!(await enforceCommandCooldown(ctx))) return;

  if (!FEEDBACK_CHAT_ID) {
    return ctx.reply("⚠️ Feedback is not configured yet. Please try again later.", {
      reply_to_message_id: ctx.message?.message_id,
    });
  }
  if (ctx.chat.type !== "private") {
    return ctx.reply("💡 Please send feedback in a private chat with me.", {
      reply_to_message_id: ctx.message?.message_id,
    });
  }

  const u = ctx.from;
  if (!u?.id) return;

  pendingFeedback.set(String(u.id), { createdAt: Date.now(), source: "command" });
  await ctx.reply(
    "💡 *Feedback Mode*\\n\\n" +
      "Please send *one message* with your feedback.\\n" +
      "You can attach *one photo or video* with a caption, or just send text.\\n\\n" +
      "_You have 2 minutes. After that, feedback mode will expire._",
    {
      parse_mode: "Markdown",
      reply_to_message_id: ctx.message?.message_id,
    }
  );
});

// /g - Quick image generation alias (owner only)
bot.command("g", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const u = ctx.from;
  if (!u?.id) return;
  
  // Owner only
  if (!OWNER_IDS.has(String(u.id))) {
    return; // Silently ignore for non-owners
  }
  
  const text = ctx.message?.text || "";
  const prompt = text.replace(/^\/g\s*/i, "").trim();
  
  if (!prompt) {
    await ctx.reply("🎨 `/g <prompt>` - Quick image gen (owner only)", { parse_mode: "Markdown" });
    return;
  }
  
  try {
    await startImageGeneration(ctx.api, ctx.message, prompt);
    console.log(`[G] Owner ${u.id} started image generation: "${prompt.slice(0, 50)}"`);
  } catch (error) {
    console.error("Image generation error:", error);
    await ctx.reply("❌ Generation failed. Try again.");
  }
});

// /ga - Activate/wake up the HF Space (owner only)
bot.command("ga", async (ctx) => {
  const u = ctx.from;
  if (!u?.id) return;
  
  // Owner only
  if (!OWNER_IDS.has(String(u.id))) {
    return; // Silently ignore for non-owners
  }
  
  const HF_API = process.env.HF_IMAGEGEN_API;
  if (!HF_API) {
    await ctx.reply("❌ HF_IMAGEGEN_API not configured.");
    return;
  }
  
  const statusMsg = await ctx.reply("🔄 Checking AI Space status...");
  
  try {
    // Check current status
    const healthRes = await fetch(`${HF_API}/health`, { signal: AbortSignal.timeout(10000) });
    const health = await healthRes.json();
    
    if (health.model_loaded) {
      await ctx.api.editMessageText(ctx.chat.id, statusMsg.message_id, 
        `✅ *AI Space is ACTIVE!*\n\n🤖 Model: \`${health.current_model || 'loaded'}\`\n📊 Available: ${health.available_models?.join(', ') || 'peppermint'}\n\n_Ready to generate images!_`,
        { parse_mode: 'Markdown' }
      );
    } else {
      await ctx.api.editMessageText(ctx.chat.id, statusMsg.message_id,
        `😴 *AI Space is waking up...*\n\n⏳ Loading model into GPU...\n_This takes 30-60 seconds._\n\nI'll ping it to speed up the wake!`,
        { parse_mode: 'Markdown' }
      );
      
      // Ping the generate endpoint to trigger model loading
      fetch(`${HF_API}/health`).catch(() => {});
      
      // Wait and check again
      await new Promise(r => setTimeout(r, 30000));
      
      const health2 = await fetch(`${HF_API}/health`, { signal: AbortSignal.timeout(10000) }).then(r => r.json()).catch(() => ({}));
      
      if (health2.model_loaded) {
        await ctx.api.editMessageText(ctx.chat.id, statusMsg.message_id,
          `✅ *AI Space is now ACTIVE!*\n\n🤖 Model: \`${health2.current_model || 'loaded'}\`\n\n_Ready to generate images!_`,
          { parse_mode: 'Markdown' }
        );
      } else {
        await ctx.api.editMessageText(ctx.chat.id, statusMsg.message_id,
          `⏳ *AI Space is still loading...*\n\n_Model is being loaded. Try /ga again in 30 seconds._`,
          { parse_mode: 'Markdown' }
        );
      }
    }
  } catch (error) {
    console.error('[GA] Error:', error);
    await ctx.api.editMessageText(ctx.chat.id, statusMsg.message_id,
      `😴 *AI Space is sleeping*\n\n⏳ Sending wake-up signal...\n_Try /g or /imagine in 1-2 minutes._`,
      { parse_mode: 'Markdown' }
    );
    // Ping to wake it up
    fetch(`${HF_API}/health`).catch(() => {});
  }
});

// /gd - Deactivate/show Space status (owner only) - Note: Can't actually pause via API
bot.command("gd", async (ctx) => {
  const u = ctx.from;
  if (!u?.id) return;
  
  // Owner only
  if (!OWNER_IDS.has(String(u.id))) {
    return;
  }
  
  const HF_API = process.env.HF_IMAGEGEN_API;
  if (!HF_API) {
    await ctx.reply("❌ HF_IMAGEGEN_API not configured.");
    return;
  }
  
  try {
    const healthRes = await fetch(`${HF_API}/health`, { signal: AbortSignal.timeout(10000) });
    const health = await healthRes.json();
    
    const status = health.model_loaded ? '✅ Active' : '😴 Sleeping';
    const models = health.available_models?.join(', ') || 'peppermint';
    
    await ctx.reply(
      `📊 *AI Space Status*\n\n` +
      `🟢 Status: ${status}\n` +
      `🤖 Current Model: \`${health.current_model || 'none'}\`\n` +
      `📋 Available Models: ${models}\n\n` +
      `⏰ Sleep Timer: 30 min inactivity\n` +
      `💡 _Space will auto-sleep after 30 min of no requests._\n\n` +
      `🔗 [Open Space Settings](https://huggingface.co/spaces/KazukiXD/starzai-imagegen/settings)`,
      { parse_mode: 'Markdown', disable_web_page_preview: true }
    );
  } catch (error) {
    await ctx.reply(
      `📊 *AI Space Status*\n\n` +
      `😴 Status: Sleeping/Offline\n\n` +
      `_Use /ga to wake it up!_`,
      { parse_mode: 'Markdown' }
    );
  }
});

// /imagine - AI image generation with HF Space (Peppermint SDXL)
bot.command("imagine", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const u = ctx.from;
  if (!u?.id) return;
  
  ensureUser(u.id, u);
  
  // Activate group if used in group chat
  if (ctx.chat.type !== "private") {
    activateGroup(ctx.chat.id);
  }
  
  const text = ctx.message?.text || "";
  const prompt = text.replace(/^\/imagine\s*/i, "").trim();
  
  if (!prompt) {
    await ctx.reply(
      "🎨 *AI Image Generator*\n\n" +
      "Generate stunning anime-style images!\n\n" +
      "*Usage:*\n" +
      "`/imagine anime girl with pink hair`\n" +
      "`/imagine fantasy landscape with mountains`\n" +
      "`/imagine cyberpunk city at night`\n\n" +
      "_Powered by Peppermint SDXL_",
      { parse_mode: "Markdown" }
    );
    return;
  }
  
  // Check if prompt is too long
  if (prompt.length > 500) {
    await ctx.reply("⚠️ Prompt is too long. Please keep it under 500 characters.");
    return;
  }
  
  // Use the HF Space interactive UI
  try {
    await startImageGeneration(ctx.api, ctx.message, prompt);
    console.log(`[IMAGINE] User ${u.id} started image generation: "${prompt.slice(0, 50)}"`);
  } catch (error) {
    console.error("Image generation error:", error);
    await ctx.reply(
      "❌ *Image generation failed*\n\n" +
      "The service might be temporarily unavailable. Please try again in a moment.\n\n" +
      "_If the problem persists, use /feedback to report it._",
      { parse_mode: "Markdown" }
    );
  }
});

// /hi - Hivenet ComfyUI image generation (RTX 4090)
bot.command("hi", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const u = ctx.from;
  if (!u?.id) return;
  
  // Owner only for now
  if (!OWNER_IDS.has(String(u.id))) {
    return; // Silently ignore for non-owners
  }
  
  const text = ctx.message?.text || "";
  const prompt = text.replace(/^\/hi\s*/i, "").trim();
  
  if (!prompt) {
    await ctx.reply(
      "🎨 *Hivenet Image Generator*\n\n" +
      "Generate stunning images on RTX 4090!\n\n" +
      "*Models Available:*\n" +
      "🌸 Hassaku XL - Anime/Illustrious style\n" +
      "🐉 Dark Beast Z - 4K Photorealistic\n\n" +
      "*Usage:*\n" +
      "`/hi anime girl with pink hair`\n" +
      "`/hi photorealistic landscape`\n\n" +
      "_Powered by ComfyUI on Hivenet_",
      { parse_mode: "Markdown" }
    );
    return;
  }
  
  // Check if prompt is too long
  if (prompt.length > 500) {
    await ctx.reply("⚠️ Prompt is too long. Please keep it under 500 characters.");
    return;
  }
  
  try {
    await startHivenetGeneration(ctx.api, ctx.message, prompt);
    console.log(`[HI] Owner ${u.id} started Hivenet generation: "${prompt.slice(0, 50)}"`);
  } catch (error) {
    console.error("Hivenet generation error:", error);
    await ctx.reply(
      "❌ *Hivenet generation failed*\n\n" +
      "The ComfyUI instance might be unavailable. Please try again in a moment.\n\n" +
      "_Use /hia to check the status._",
      { parse_mode: "Markdown" }
    );
  }
});

// /hia - Activate/check Hivenet ComfyUI status (owner only)
bot.command("hia", async (ctx) => {
  const u = ctx.from;
  if (!u?.id) return;
  
  // Owner only
  if (!OWNER_IDS.has(String(u.id))) {
    return;
  }
  
  const statusMsg = await ctx.reply("🔄 Checking Hivenet ComfyUI status...");
  
  try {
    const health = await checkHivenetHealth();
    
    if (health.available) {
      const modelList = Object.values(HIVENET_MODELS).map(m => `${m.label}${m.supports4K ? ' [4K]' : ''}`).join('\n');
      await ctx.api.editMessageText(ctx.chat.id, statusMsg.message_id,
        `✅ *Hivenet ComfyUI is ACTIVE!*\n\n` +
        `🖥️ GPU: ${health.gpu || 'RTX 4090'}\n` +
        `💾 VRAM: ${health.vram || '24 GB'}\n\n` +
        `*Available Models:*\n${modelList}\n\n` +
        `_Ready to generate images!_`,
        { parse_mode: 'Markdown' }
      );
    } else {
      await ctx.api.editMessageText(ctx.chat.id, statusMsg.message_id,
        `😴 *Hivenet ComfyUI is OFFLINE*\n\n` +
        `Error: ${health.error || 'Connection failed'}\n\n` +
        `_Check if the instance is running on Hivenet console._`,
        { parse_mode: 'Markdown' }
      );
    }
  } catch (error) {
    console.error('[HIA] Error:', error);
    await ctx.api.editMessageText(ctx.chat.id, statusMsg.message_id,
      `❌ *Failed to check Hivenet status*\n\n` +
      `Error: ${error.message}`,
      { parse_mode: 'Markdown' }
    );
  }
});

// =====================
// IMAGE GENERATION
// =====================

// Funny rotating taglines with rarity tiers (hide the source!)
// Common (70%) - Items 1-40
// Rare (25%) - Items 41-80  
// Legendary (5%) - Items 81-100
const IMAGE_GEN_TAGLINES = {
  // COMMON (70%) - Lighthearted, punny, safe
  common: [
    "Ludicrous Minds™",
    "Definitely Not Magic™",
    "Fancy Math™",
    "Trust Us Bro™",
    "Vibes and Electricity™",
    "Buttons We Pressed™",
    "Trust The Process™",
    "Artistic Panic™",
    "Neural Nonsense™",
    "Creative Overconfidence™",
    "Image Wizardry™",
    "Pixels and Hope™",
    "Science, Probably™",
    "Pixel Perfect-ish™",
    "Dreams Rendered™",
    "Imagination.exe™",
    "Creativity.dll™",
    "The Cloud Did It™",
    "Certified Fresh Pixels™",
    "AI Goes Brrrr™",
    "Quantum Guesswork™",
    "Artisanal Pixels™",
    "Hand-Crafted by Robots™",
    "100% Organic AI™",
    "Made with Love and GPUs™",
    "Coffee and Code™",
    "Bits and Pieces™",
    "Technically Not Magic™",
    "Imagination Station™",
    "Hopes and Dreams™",
    "Pixel Sorcery™",
    "Digital Daydreams™",
    "Algorithmic Art™",
    "Computational Creativity™",
    "Binary Beauty™",
    "Silicon Dreams™",
    "Electric Imagination™",
    "Synthetic Visions™",
    "Automated Artistry™",
    "Machine Muses™"
  ],
  
  // RARE (25%) - Edgier, wittier, more memorable
  rare: [
    "Digital Voodoo™",
    "Chaos Engine™",
    "Questionable Genius™",
    "Hallucinations™",
    "High-Entropy™",
    "Visual Lies™",
    "Pattern Abuse™",
    "Controlled Chaos™",
    "Organized Madness™",
    "Beautiful Accidents™",
    "Calculated Randomness™",
    "Structured Nonsense™",
    "Elegant Confusion™",
    "Sophisticated Guessing™",
    "Professional Winging It™",
    "Expert Improvisation™",
    "Deliberate Mistakes™",
    "Intentional Glitches™",
    "Curated Chaos™",
    "Refined Randomness™",
    "Artful Errors™",
    "Graceful Failures™",
    "Productive Confusion™",
    "Creative Destruction™",
    "Constructive Chaos™",
    "Methodical Madness™",
    "Systematic Insanity™",
    "Logical Lunacy™",
    "Rational Absurdity™",
    "Sensible Nonsense™",
    "Reasonable Madness™",
    "Sane Insanity™",
    "Coherent Chaos™",
    "Orderly Disorder™",
    "Tidy Turbulence™",
    "Neat Entropy™",
    "Clean Confusion™",
    "Pure Pandemonium™",
    "Refined Ruckus™",
    "Polished Pandemonium™"
  ],
  
  // LEGENDARY (5%) - Dark, cryptic, mysterious
  legendary: [
    "Nothing Personal™",
    "Cold Truth™",
    "Inevitability™",
    "The Void™",
    "Silence™",
    "The Abyss Stares Back™",
    "Entropy Wins™",
    "Heat Death™",
    "The Final Answer™",
    "Oblivion™",
    "The Last Pixel™",
    "End of Line™",
    "NULL™",
    "undefined™",
    "404 Soul Not Found™",
    "The Machine Remembers™",
    "We Know™",
    "It Watches™",
    "The Algorithm Decides™",
    "Fate.exe™"
  ],
  
  // SPECIAL - Context-triggered taglines
  nsfw: [
    "Lewd Thoughts™",
    "Bonk™",
    "Down Bad™",
    "Horny Jail™",
    "Touch Grass™",
    "Sir This Is A Wendy's™",
    "FBI Open Up™",
    "Cultured™",
    "Man of Culture™",
    "Research Purposes™"
  ]
};

// NSFW keyword detection patterns
const NSFW_KEYWORDS = /\b(nsfw|nude|naked|sex|porn|hentai|lewd|erotic|xxx|boob|tit|ass|dick|cock|pussy|vagina|penis|breast|nipple|butt|thigh|bikini|lingerie|underwear|bra|panties|topless|bottomless|strip|seduc|horny|kinky|fetish|bondage|bdsm|dominat|submissive|spank|whip|latex|leather|corset|stockings|garter|cleavage|curvy|thicc|busty|milf|waifu|ahegao|ecchi)\b/i;

// Check if prompt contains NSFW content
function isNsfwPrompt(prompt) {
  return NSFW_KEYWORDS.test(prompt);
}

// Check if user should have safe mode enforced
// Free users: always safe mode (cannot disable)
// Premium/Ultra: can toggle safe mode
// Owners: unrestricted (safe mode always off)
function shouldEnforceSafeMode(userId) {
  const user = usersDb.users[String(userId)];
  if (!user) return true; // Default to safe
  
  const isOwnerUser = OWNER_IDS.has(String(userId));
  
  // Owners are unrestricted
  if (isOwnerUser) return false;
  
  // Free users always have safe mode
  if (user.tier === 'free') return true;
  
  // Premium/Ultra can toggle
  return user.imagePrefs?.safeMode !== false;
}

// Check if user can toggle safe mode (premium/ultra only)
function canToggleSafeMode(userId) {
  const user = usersDb.users[String(userId)];
  if (!user) return false;
  
  const isOwnerUser = OWNER_IDS.has(String(userId));
  if (isOwnerUser) return true; // Owners can always toggle (though it doesn't affect them)
  
  return user.tier === 'premium' || user.tier === 'ultra';
}

// Get a random tagline with rarity weighting
// Common: 70%, Rare: 25%, Legendary: 5%
// Special: NSFW prompts get special taglines
function getRandomTagline(prompt = '') {
  // Check for NSFW content first
  if (prompt && isNsfwPrompt(prompt)) {
    const nsfwTaglines = IMAGE_GEN_TAGLINES.nsfw;
    return nsfwTaglines[Math.floor(Math.random() * nsfwTaglines.length)];
  }
  
  const roll = Math.random() * 100;
  let tier;
  
  if (roll < 70) {
    tier = 'common';
  } else if (roll < 95) {
    tier = 'rare';
  } else {
    tier = 'legendary';
  }
  
  const taglines = IMAGE_GEN_TAGLINES[tier];
  return taglines[Math.floor(Math.random() * taglines.length)];
}

// Aspect ratio configurations
const IMG_ASPECT_RATIOS = {
  "1:1": { width: 768, height: 768, icon: "⬜", label: "Square" },
  "4:3": { width: 896, height: 672, icon: "🖼️", label: "Landscape" },
  "3:4": { width: 672, height: 896, icon: "📱", label: "Portrait" },
  "16:9": { width: 1024, height: 576, icon: "🎬", label: "Widescreen" },
  "9:16": { width: 576, height: 1024, icon: "📲", label: "Story" },
  "3:2": { width: 864, height: 576, icon: "📷", label: "Photo" }
};

// Store pending image prompts (userId -> { prompt, messageId, chatId })
const pendingImagePrompts = new Map();

// Helper function to generate image with Flux1schnell model
async function generateFluxImage(prompt, aspectRatio, userId, retryCount = 0) {
  const config = IMG_ASPECT_RATIOS[aspectRatio] || IMG_ASPECT_RATIOS["1:1"];
  
  // Flux1schnell is optimized for 4 steps
  const steps = 4;
  
  // Get the next available API key
  const apiKey = deapiKeyManager.getNextKey();
  if (!apiKey) {
    throw new Error("No DeAPI keys configured");
  }
  
  const keyId = deapiKeyManager.getKeyId(apiKey);
  console.log(`[IMG2/Flux] Using DeAPI key ${keyId} for user ${userId}`);
  
  try {
    // Submit image generation request
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
                          errorText.toLowerCase().includes('credit') ||
                          errorText.toLowerCase().includes('quota') ||
                          errorText.toLowerCase().includes('limit');
      
      deapiKeyManager.recordFailure(apiKey, error);
      
      if (isQuotaError && retryCount < DEAPI_KEYS.length - 1) {
        console.log(`[IMG2/Flux] Key ${keyId} quota/credit error, trying next key...`);
        return generateFluxImage(prompt, aspectRatio, userId, retryCount + 1);
      }
      
      throw error;
    }
    
    const submitData = await submitResponse.json();
    const requestId = submitData?.data?.request_id;
    
    if (!requestId) {
      const error = new Error("No request_id returned from DeAPI");
      deapiKeyManager.recordFailure(apiKey, error);
      throw error;
    }
    
    console.log(`[IMG2/Flux] Submitted request ${requestId} for user ${userId} (${aspectRatio}) using key ${keyId}`);
    
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
                   statusData?.data?.result?.image_url ||
                   statusData?.data?.url ||
                   statusData?.data?.image_url ||
                   statusData?.result?.url ||
                   (Array.isArray(statusData?.data?.result) ? statusData.data.result[0]?.url : null) ||
                   (Array.isArray(statusData?.data?.images) ? statusData.data.images[0] : null);
        console.log(`[IMG2/Flux] Found image URL: ${imageUrl ? imageUrl.slice(0, 100) + '...' : 'null'}`);
        break;
      } else if (status === "error" || status === "failed") {
        const error = new Error(statusData?.data?.error || statusData?.error || "Image generation failed");
        deapiKeyManager.recordFailure(apiKey, error);
        throw error;
      }
      
      attempts++;
    }
    
    if (!imageUrl) {
      const error = new Error("Timeout waiting for image generation");
      deapiKeyManager.recordFailure(apiKey, error);
      throw error;
    }
    
    // Download the image
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      const error = new Error(`Failed to download image: ${imageResponse.status}`);
      deapiKeyManager.recordFailure(apiKey, error);
      throw error;
    }
    
    // Success! Record it
    deapiKeyManager.recordSuccess(apiKey);
    console.log(`[IMG2/Flux] Successfully generated image using key ${keyId}`);
    
    return Buffer.from(await imageResponse.arrayBuffer());
    
  } catch (error) {
    if (retryCount < DEAPI_KEYS.length - 1 && 
        (error.message.includes('fetch') || 
         error.message.includes('network') ||
         error.message.includes('timeout'))) {
      console.log(`[IMG2/Flux] Network error, trying next key...`);
      return generateFluxImage(prompt, aspectRatio, userId, retryCount + 1);
    }
    throw error;
  }
}

// Helper function to generate image with ZImageTurbo (with multi-key support)
async function generateDeAPIImage(prompt, aspectRatio, userId, retryCount = 0) {
  const config = IMG_ASPECT_RATIOS[aspectRatio] || IMG_ASPECT_RATIOS["1:1"];
  
  // Get user's custom steps (owner only feature)
  const user = usersDb.users[String(userId)];
  const isOwnerUser = OWNER_IDS.has(String(userId));
  const steps = (isOwnerUser && user?.imagePrefs?.steps) ? user.imagePrefs.steps : 8;
  
  // Get the next available API key
  const apiKey = deapiKeyManager.getNextKey();
  if (!apiKey) {
    throw new Error("No DeAPI keys configured");
  }
  
  const keyId = deapiKeyManager.getKeyId(apiKey);
  console.log(`[IMG] Using DeAPI key ${keyId} for user ${userId}`);
  
  try {
    // Step 1: Submit image generation request
    const submitResponse = await fetch("https://api.deapi.ai/api/v1/client/txt2img", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        prompt: prompt,
        model: "ZImageTurbo_INT8",
        width: config.width,
        height: config.height,
        steps: steps,
        seed: Math.floor(Math.random() * 4294967295),
        negative_prompt: "blur, low quality, distorted, ugly, deformed"
      })
    });
    
    if (!submitResponse.ok) {
      const errorText = await submitResponse.text();
      const error = new Error(`DeAPI submit error (${submitResponse.status}): ${errorText}`);
      
      // Check if it's a credit/quota error that should trigger failover
      const isQuotaError = submitResponse.status === 402 || 
                          submitResponse.status === 429 || 
                          errorText.toLowerCase().includes('credit') ||
                          errorText.toLowerCase().includes('quota') ||
                          errorText.toLowerCase().includes('limit');
      
      deapiKeyManager.recordFailure(apiKey, error);
      
      // Try next key if we have more keys and haven't exceeded retry limit
      if (isQuotaError && retryCount < DEAPI_KEYS.length - 1) {
        console.log(`[IMG] Key ${keyId} quota/credit error, trying next key...`);
        return generateDeAPIImage(prompt, aspectRatio, userId, retryCount + 1);
      }
      
      throw error;
    }
    
    const submitData = await submitResponse.json();
    const requestId = submitData?.data?.request_id;
    
    if (!requestId) {
      const error = new Error("No request_id returned from DeAPI");
      deapiKeyManager.recordFailure(apiKey, error);
      throw error;
    }
    
    console.log(`[IMG] Submitted request ${requestId} for user ${userId} (${aspectRatio}) using key ${keyId}`);
    
    // Step 2: Poll for result
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
      
      // Debug log to see actual response format
      if (attempts === 0 || status === "done" || status === "completed" || status === "error" || status === "failed") {
        console.log(`[IMG] Status check #${attempts + 1}: status=${status}, data=${JSON.stringify(statusData).slice(0, 500)}`);
      }
      
      if (status === "done" || status === "completed" || status === "success") {
        imageUrl = statusData?.data?.result_url ||
                   statusData?.data?.result?.url ||
                   statusData?.data?.result?.image_url ||
                   statusData?.data?.url ||
                   statusData?.data?.image_url ||
                   statusData?.result?.url ||
                   (Array.isArray(statusData?.data?.result) ? statusData.data.result[0]?.url : null) ||
                   (Array.isArray(statusData?.data?.images) ? statusData.data.images[0] : null);
        console.log(`[IMG] Found image URL: ${imageUrl ? imageUrl.slice(0, 100) + '...' : 'null'}`);
        break;
      } else if (status === "error" || status === "failed") {
        const error = new Error(statusData?.data?.error || statusData?.error || "Image generation failed");
        deapiKeyManager.recordFailure(apiKey, error);
        throw error;
      }
      
      attempts++;
    }
    
    if (!imageUrl) {
      const error = new Error("Timeout waiting for image generation");
      deapiKeyManager.recordFailure(apiKey, error);
      throw error;
    }
    
    // Step 3: Download the image
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      const error = new Error(`Failed to download image: ${imageResponse.status}`);
      deapiKeyManager.recordFailure(apiKey, error);
      throw error;
    }
    
    // Success! Record it
    deapiKeyManager.recordSuccess(apiKey);
    console.log(`[IMG] Successfully generated image using key ${keyId}`);
    
    return Buffer.from(await imageResponse.arrayBuffer());
    
  } catch (error) {
    // If this was a network/server error and we have more keys, try the next one
    if (retryCount < DEAPI_KEYS.length - 1 && 
        (error.message.includes('fetch') || 
         error.message.includes('network') ||
         error.message.includes('ECONNREFUSED') ||
         error.message.includes('timeout'))) {
      console.log(`[IMG] Key ${keyId} network error, trying next key...`);
      return generateDeAPIImage(prompt, aspectRatio, userId, retryCount + 1);
    }
    throw error;
  }
}

// Parse natural language aspect ratio from prompt
function parseAspectRatioFromText(text) {
  const lower = text.toLowerCase();
  
  // Check for explicit ratio mentions
  if (/\b(16[:\-x]9|widescreen|wide|cinematic|movie)\b/.test(lower)) return "16:9";
  if (/\b(9[:\-x]16|story|stories|vertical|tall|tiktok|reels?)\b/.test(lower)) return "9:16";
  if (/\b(4[:\-x]3|landscape|horizontal)\b/.test(lower)) return "4:3";
  if (/\b(3[:\-x]4|portrait|mobile)\b/.test(lower)) return "3:4";
  if (/\b(3[:\-x]2|photo|photograph)\b/.test(lower)) return "3:2";
  if (/\b(1[:\-x]1|square)\b/.test(lower)) return "1:1";
  
  return null; // No ratio detected
}

// Clean prompt by removing ratio keywords
function cleanPromptFromRatio(prompt) {
  return prompt
    .replace(/\b(in\s+)?(16[:\-x]9|9[:\-x]16|4[:\-x]3|3[:\-x]4|3[:\-x]2|1[:\-x]1)\b/gi, '')
    .replace(/\b(in\s+)?(widescreen|wide|cinematic|movie|story|stories|vertical|tall|tiktok|reels?|landscape|horizontal|portrait|mobile|photo|photograph|square)\s*(ratio|format|mode)?\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// /img - AI image generation with smart aspect ratio detection
bot.command("img", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const u = ctx.from;
  if (!u?.id) return;
  
  const user = ensureUser(u.id, u);
  
  if (ctx.chat.type !== "private") {
    activateGroup(ctx.chat.id);
  }
  
  if (!deapiKeyManager.hasKeys()) {
    await ctx.reply(
      "⚠️ Image generation is not configured. Use /imagine instead for free image generation.",
      { parse_mode: "Markdown" }
    );
    return;
  }
  
  const text = ctx.message?.text || "";
  let rawPrompt = text.replace(/^\/img\s*/i, "").trim();
  
  if (!rawPrompt) {
    const defaultRatio = user.imagePrefs?.defaultRatio || "1:1";
    const defaultConfig = IMG_ASPECT_RATIOS[defaultRatio];
    await ctx.reply(
      "🎨 *AI Image Generator*\n\n" +
      "Create stunning images with AI!\n\n" +
      "*Usage:*\n" +
      "`/img a cute cat in space`\n" +
      "`/img a sunset in widescreen`\n" +
      "`/img portrait of a warrior`\n\n" +
      "*Smart Ratios:* Just mention it!\n" +
      "• _widescreen, cinematic, movie_ → 16:9\n" +
      "• _story, vertical, tiktok_ → 9:16\n" +
      "• _portrait, mobile_ → 3:4\n" +
      "• _landscape, horizontal_ → 4:3\n" +
      "• _square_ → 1:1\n\n" +
      `📌 *Your default:* ${defaultConfig?.icon || '⬜'} ${defaultConfig?.label || 'Square'}\n` +
      `_Use /imgset to change default_\n\n` +
      `_Powered by ${getRandomTagline()}_`,
      { parse_mode: "Markdown" }
    );
    return;
  }
  
  if (rawPrompt.length > 500) {
    await ctx.reply("⚠️ Prompt is too long. Please keep it under 500 characters.");
    return;
  }
  
  // Check NSFW content and safe mode
  if (isNsfwPrompt(rawPrompt) && shouldEnforceSafeMode(u.id)) {
    const tier = user.tier || 'free';
    let message = "🔒 *Safe Mode Active*\n\n" +
      "Your prompt contains content that isn't allowed in safe mode.\n\n";
    
    if (tier === 'free') {
      message += "_Free users have safe mode enabled by default._\n" +
        "Upgrade to Premium or Ultra to access unrestricted image generation.";
    } else {
      message += "_You can disable safe mode in_ /imgset _to generate this content._";
    }
    
    await ctx.reply(message, { parse_mode: "Markdown" });
    return;
  }
  
  // Try to detect aspect ratio from prompt
  const detectedRatio = parseAspectRatioFromText(rawPrompt);
  const cleanedPrompt = detectedRatio ? cleanPromptFromRatio(rawPrompt) : rawPrompt;
  const finalPrompt = cleanedPrompt || rawPrompt; // Fallback if cleaning removed everything
  
  // If ratio detected, generate immediately with that ratio
  if (detectedRatio) {
    const config = IMG_ASPECT_RATIOS[detectedRatio];
    const statusMsg = await ctx.reply(
      "🎨 *Generating your image...*\n\n" +
      `📝 _${finalPrompt.slice(0, 100)}${finalPrompt.length > 100 ? '...' : ''}_\n\n` +
      `📐 ${config.icon} ${config.label} (${detectedRatio})\n\n` +
      "⏳ Please wait 5-15 seconds...",
      { parse_mode: "Markdown" }
    );
    
    // Store for regenerate
    pendingImagePrompts.set(u.id, {
      prompt: finalPrompt,
      messageId: statusMsg.message_id,
      chatId: ctx.chat.id,
      lastAspectRatio: detectedRatio
    });
    
    try {
      const imageBuffer = await generateDeAPIImage(finalPrompt, detectedRatio, u.id);
      
      const actionButtons = [
        [
          { text: "🔄 Regenerate", callback_data: `img_regen:${detectedRatio}` },
          { text: "📐 Change Ratio", callback_data: "img_change_ar" }
        ],
        [
          { text: "✨ New Image", callback_data: "img_new" }
        ]
      ];
      
      await ctx.api.sendPhoto(
        ctx.chat.id,
        new InputFile(imageBuffer, "generated_image.jpg"),
        {
          caption: `🎨 *Generated Image*\n\n` +
                   `📝 _${finalPrompt.slice(0, 200)}${finalPrompt.length > 200 ? '...' : ''}_\n\n` +
                   `📐 ${config.icon} ${config.label}\n` +
                   `⚡ _Powered by ${getRandomTagline(finalPrompt)}_`,
          parse_mode: "Markdown",
          reply_markup: { inline_keyboard: actionButtons }
        }
      );
      
      try { await ctx.api.deleteMessage(ctx.chat.id, statusMsg.message_id); } catch (e) {}
      
      console.log(`[IMG] User ${u.id} generated image (${detectedRatio}, auto-detected): "${finalPrompt.slice(0, 50)}"`);
      return;
      
    } catch (error) {
      console.error("Image generation error:", error);
      try {
        await ctx.api.editMessageText(
          ctx.chat.id,
          statusMsg.message_id,
          "❌ *Image generation failed*\n\n" +
          `Error: ${error.message?.slice(0, 100) || 'Unknown error'}\n\n` +
          "Try again or use /imagine for free alternative.",
          {
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [
                [{ text: "🔄 Try Again", callback_data: `img_ar:${detectedRatio.replace(':', ':')}` }],
                [{ text: "❌ Cancel", callback_data: "img_cancel" }]
              ]
            }
          }
        );
      } catch (e) {
        await ctx.reply("❌ Image generation failed. Please try /imagine instead.");
      }
      return;
    }
  }
  
  // Use user's default ratio directly - no picker needed!
  const userDefault = user.imagePrefs?.defaultRatio || "1:1";
  const config = IMG_ASPECT_RATIOS[userDefault];
  
  const statusMsg = await ctx.reply(
    "🎨 *Generating your image...*\n\n" +
    `📝 _${finalPrompt.slice(0, 100)}${finalPrompt.length > 100 ? '...' : ''}_\n\n` +
    `📐 ${config.icon} ${config.label} (${userDefault})\n\n` +
    "⏳ Please wait 5-15 seconds...",
    { parse_mode: "Markdown" }
  );
  
  // Store for regenerate
  pendingImagePrompts.set(u.id, {
    prompt: finalPrompt,
    messageId: statusMsg.message_id,
    chatId: ctx.chat.id,
    lastAspectRatio: userDefault
  });
  
  try {
    const imageBuffer = await generateDeAPIImage(finalPrompt, userDefault, u.id);
    
    const actionButtons = [
      [
        { text: "🔄 Regenerate", callback_data: `img_regen:${userDefault}` },
        { text: "📐 Change Ratio", callback_data: "img_change_ar" }
      ],
      [
        { text: "✨ New Image", callback_data: "img_new" }
      ]
    ];
    
    await ctx.api.sendPhoto(
      ctx.chat.id,
      new InputFile(imageBuffer, "generated_image.jpg"),
      {
        caption: `🎨 *Generated Image*\n\n` +
                 `📝 _${finalPrompt.slice(0, 200)}${finalPrompt.length > 200 ? '...' : ''}_\n\n` +
                 `📐 ${config.icon} ${config.label}\n` +
                 `⚡ _Powered by ${getRandomTagline(finalPrompt)}_`,
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: actionButtons }
      }
    );
    
    try { await ctx.api.deleteMessage(ctx.chat.id, statusMsg.message_id); } catch (e) {}
    
    console.log(`[IMG] User ${u.id} generated image (${userDefault}, default): "${finalPrompt.slice(0, 50)}"`);
    
  } catch (error) {
    console.error("Image generation error:", error);
    try {
      await ctx.api.editMessageText(
        ctx.chat.id,
        statusMsg.message_id,
        "❌ *Image generation failed*\n\n" +
        `Error: ${error.message?.slice(0, 100) || 'Unknown error'}\n\n` +
        "Try again or use /imagine for free alternative.",
        {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [{ text: "🔄 Try Again", callback_data: `img_ar:${userDefault.replace(':', ':')}` }],
              [{ text: "❌ Cancel", callback_data: "img_cancel" }]
            ]
          }
        }
      );
    } catch (e) {
      await ctx.reply("❌ Image generation failed. Please try /imagine instead.");
    }
  }
});

// /img2 - Flux1schnell image generation (alternative model)
bot.command("img2", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  if (!(await enforceCommandCooldown(ctx))) return;
  
  const u = ctx.from;
  if (!u?.id) return;
  
  const user = ensureUser(u.id, u);
  
  if (!deapiKeyManager.hasKeys()) {
    await ctx.reply(
      "⚠️ Image generation is not configured. Use /imagine instead for free image generation.",
      { parse_mode: "Markdown" }
    );
    return;
  }
  
  const rawPrompt = ctx.message?.text?.replace(/^\/img2\s*/i, "").trim();
  
  if (!rawPrompt) {
    await ctx.reply(
      "🎨 *Flux Image Generator*\n\n" +
      "Generate images using the Flux model (alternative style).\n\n" +
      "*Usage:* `/img2 <prompt>`\n\n" +
      "*Example:*\n" +
      "`/img2 cyberpunk city at night`\n" +
      "`/img2 portrait of a warrior`\n\n" +
      `_Powered by ${getRandomTagline()}_`,
      { parse_mode: "Markdown" }
    );
    return;
  }
  
  if (rawPrompt.length > 500) {
    await ctx.reply("⚠️ Prompt too long. Please keep it under 500 characters.");
    return;
  }
  
  const finalPrompt = rawPrompt;
  
  // Check NSFW content and safe mode
  if (isNsfwPrompt(finalPrompt) && shouldEnforceSafeMode(u.id)) {
    const tier = user.tier || 'free';
    if (tier === 'free') {
      await ctx.reply(
        "🔒 *Safe Mode Active*\n\n" +
        "Your prompt contains content that isn't allowed in safe mode.\n\n" +
        "_Free users have safe mode enabled by default._\n" +
        "Upgrade to Premium or Ultra to access unrestricted image generation.",
        { parse_mode: "Markdown" }
      );
    } else {
      await ctx.reply(
        "🔒 *Safe Mode Active*\n\n" +
        "Your prompt contains content that isn't allowed in safe mode.\n\n" +
        "_You can disable safe mode in /imgset to generate this content._",
        { parse_mode: "Markdown" }
      );
    }
    return;
  }
  
  // Use user's default ratio directly
  const userDefault = user.imagePrefs?.defaultRatio || "1:1";
  const config = IMG_ASPECT_RATIOS[userDefault];
  
  const statusMsg = await ctx.reply(
    "🎨 *Generating with Flux...*\n\n" +
    `📝 _${finalPrompt.slice(0, 100)}${finalPrompt.length > 100 ? '...' : ''}_\n\n` +
    `📐 ${config.icon} ${config.label} (${userDefault})\n\n` +
    "⏳ Please wait 5-15 seconds...",
    { parse_mode: "Markdown" }
  );
  
  // Store for regenerate
  pendingImagePrompts.set(u.id, {
    prompt: finalPrompt,
    messageId: statusMsg.message_id,
    chatId: ctx.chat.id,
    lastAspectRatio: userDefault,
    model: 'flux'
  });
  
  try {
    const imageBuffer = await generateFluxImage(finalPrompt, userDefault, u.id);
    
    const actionButtons = [
      [
        { text: "🔄 Regenerate", callback_data: `img2_regen:${userDefault}` },
        { text: "📐 Change Ratio", callback_data: "img2_change_ar" }
      ],
      [
        { text: "✨ New Image", callback_data: "img2_new" }
      ]
    ];
    
    await ctx.api.sendPhoto(
      ctx.chat.id,
      new InputFile(imageBuffer, "flux_image.jpg"),
      {
        caption: `🎨 *Flux Generated Image*\n\n` +
                 `📝 _${finalPrompt.slice(0, 200)}${finalPrompt.length > 200 ? '...' : ''}_\n\n` +
                 `📐 ${config.icon} ${config.label}\n` +
                 `⚡ _Powered by ${getRandomTagline(finalPrompt)}_`,
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: actionButtons }
      }
    );
    
    try { await ctx.api.deleteMessage(ctx.chat.id, statusMsg.message_id); } catch (e) {}
    
    console.log(`[IMG2/Flux] User ${u.id} generated image (${userDefault}): "${finalPrompt.slice(0, 50)}"`);
    
  } catch (error) {
    console.error("Flux image generation error:", error);
    try {
      await ctx.api.editMessageText(
        ctx.chat.id,
        statusMsg.message_id,
        "❌ *Image generation failed*\n\n" +
        `Error: ${error.message?.slice(0, 100) || 'Unknown error'}\n\n` +
        "Try /img for the standard model or /imagine for free alternative.",
        {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [{ text: "🔄 Try Again", callback_data: `img2_ar:${userDefault.replace(':', ':')}` }],
              [{ text: "❌ Cancel", callback_data: "img_cancel" }]
            ]
          }
        }
      );
    } catch (e) {
      await ctx.reply("❌ Image generation failed. Please try /img or /imagine instead.");
    }
  }
});

// Handle img2 regenerate
bot.callbackQuery(/^img2_regen:(.+):(.+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const u = ctx.from;
  if (!u?.id) return;
  
  const pending = pendingImagePrompts.get(u.id);
  if (!pending) {
    await ctx.answerCallbackQuery({ text: "Session expired. Please use /img2 again.", show_alert: true });
    return;
  }
  
  const match = ctx.callbackQuery.data.match(/^img2_regen:(.+):(.+)$/);
  const aspectRatio = match ? `${match[1]}:${match[2]}` : pending.lastAspectRatio || "1:1";
  const config = IMG_ASPECT_RATIOS[aspectRatio];
  
  await ctx.answerCallbackQuery({ text: "🔄 Regenerating..." });
  
  try {
    const imageBuffer = await generateFluxImage(pending.prompt, aspectRatio, u.id);
    
    const actionButtons = [
      [
        { text: "🔄 Regenerate", callback_data: `img2_regen:${aspectRatio}` },
        { text: "📐 Change Ratio", callback_data: "img2_change_ar" }
      ],
      [
        { text: "✨ New Image", callback_data: "img2_new" }
      ]
    ];
    
    await ctx.api.sendPhoto(
      ctx.chat.id,
      new InputFile(imageBuffer, "flux_image.jpg"),
      {
        caption: `🎨 *Flux Regenerated Image*\n\n` +
                 `📝 _${pending.prompt.slice(0, 200)}..._\n\n` +
                 `📐 ${config.icon} ${config.label}\n` +
                 `⚡ _Powered by ${getRandomTagline(pending.prompt)}_`,
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: actionButtons }
      }
    );
    
    console.log(`[IMG2/Flux] User ${u.id} regenerated image`);
    
  } catch (error) {
    console.error("Flux regenerate error:", error);
    await ctx.answerCallbackQuery({ text: `❌ Failed: ${error.message?.slice(0, 50)}`, show_alert: true });
  }
});

// Handle img2 change aspect ratio
bot.callbackQuery("img2_change_ar", async (ctx) => {
  const u = ctx.from;
  if (!u?.id) return;
  
  const pending = pendingImagePrompts.get(u.id);
  if (!pending) {
    await ctx.answerCallbackQuery({ text: "Session expired. Please use /img2 again.", show_alert: true });
    return;
  }
  
  await ctx.answerCallbackQuery();
  
  const currentRatio = pending.lastAspectRatio || "1:1";
  
  const aspectButtons = [
    [
      { text: `${currentRatio === "1:1" ? "✅ " : ""}⬜ Square`, callback_data: `img2_ar:1:1` },
      { text: `${currentRatio === "4:3" ? "✅ " : ""}🖼️ Landscape`, callback_data: `img2_ar:4:3` },
      { text: `${currentRatio === "3:4" ? "✅ " : ""}📱 Portrait`, callback_data: `img2_ar:3:4` }
    ],
    [
      { text: `${currentRatio === "16:9" ? "✅ " : ""}🎬 Widescreen`, callback_data: `img2_ar:16:9` },
      { text: `${currentRatio === "9:16" ? "✅ " : ""}📲 Story`, callback_data: `img2_ar:9:16` },
      { text: `${currentRatio === "3:2" ? "✅ " : ""}📷 Photo`, callback_data: `img2_ar:3:2` }
    ],
    [
      { text: "❌ Cancel", callback_data: "img_cancel" }
    ]
  ];
  
  await ctx.reply(
    "🎨 *Change Aspect Ratio (Flux)*\n\n" +
    `📝 _${pending.prompt.slice(0, 100)}${pending.prompt.length > 100 ? '...' : ''}_\n\n` +
    "Select new ratio:",
    {
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: aspectButtons }
    }
  );
});

// Handle img2 aspect ratio selection
bot.callbackQuery(/^img2_ar:(.+):(.+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const u = ctx.from;
  if (!u?.id) return;
  
  const pending = pendingImagePrompts.get(u.id);
  if (!pending) {
    await ctx.answerCallbackQuery({ text: "Session expired. Please use /img2 again.", show_alert: true });
    return;
  }
  
  const match = ctx.callbackQuery.data.match(/^img2_ar:(.+):(.+)$/);
  const aspectRatio = match ? `${match[1]}:${match[2]}` : "1:1";
  const config = IMG_ASPECT_RATIOS[aspectRatio];
  
  await ctx.answerCallbackQuery({ text: `🎨 Generating with ${config.label}...` });
  
  // Update pending with new ratio
  pending.lastAspectRatio = aspectRatio;
  
  try {
    // Delete the ratio selection message
    try { await ctx.deleteMessage(); } catch (e) {}
    
    const imageBuffer = await generateFluxImage(pending.prompt, aspectRatio, u.id);
    
    const actionButtons = [
      [
        { text: "🔄 Regenerate", callback_data: `img2_regen:${aspectRatio}` },
        { text: "📐 Change Ratio", callback_data: "img2_change_ar" }
      ],
      [
        { text: "✨ New Image", callback_data: "img2_new" }
      ]
    ];
    
    await ctx.api.sendPhoto(
      ctx.chat.id,
      new InputFile(imageBuffer, "flux_image.jpg"),
      {
        caption: `🎨 *Flux Generated Image*\n\n` +
                 `📝 _${pending.prompt.slice(0, 200)}${pending.prompt.length > 200 ? '...' : ''}_\n\n` +
                 `📐 ${config.icon} ${config.label}\n` +
                 `⚡ _Powered by ${getRandomTagline(pending.prompt)}_`,
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: actionButtons }
      }
    );
    
    console.log(`[IMG2/Flux] User ${u.id} generated image with new ratio (${aspectRatio})`);
    
  } catch (error) {
    console.error("Flux image generation error:", error);
    await ctx.reply(`❌ Image generation failed: ${error.message?.slice(0, 100)}`);
  }
});

// Handle img2 new image
bot.callbackQuery("img2_new", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply(
    "🎨 *New Flux Image*\n\n" +
    "Send me a new prompt with /img2:\n\n" +
    "`/img2 your prompt here`",
    { parse_mode: "Markdown" }
  );
});

// Handle aspect ratio selection
bot.callbackQuery(/^img_ar:(.+):(.+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const u = ctx.from;
  if (!u?.id) return;
  
  const pending = pendingImagePrompts.get(u.id);
  if (!pending) {
    await ctx.answerCallbackQuery({ text: "Session expired. Please use /img again.", show_alert: true });
    return;
  }
  
  const match = ctx.callbackQuery.data.match(/^img_ar:(.+):(.+)$/);
  const aspectRatio = match ? `${match[1]}:${match[2]}` : "1:1";
  const config = IMG_ASPECT_RATIOS[aspectRatio] || IMG_ASPECT_RATIOS["1:1"];
  
  await ctx.answerCallbackQuery();
  
  // Update message to show generating status
  try {
    await ctx.api.editMessageText(
      pending.chatId,
      pending.messageId,
      "🎨 *Generating your image...*\n\n" +
      `📝 _${pending.prompt.slice(0, 100)}${pending.prompt.length > 100 ? '...' : ''}_\n\n` +
      `📐 ${config.icon} ${config.label} (${aspectRatio})\n\n` +
      "⏳ Please wait 5-15 seconds...",
      { parse_mode: "Markdown" }
    );
  } catch (e) {
    // Ignore edit errors
  }
  
  try {
    const imageBuffer = await generateDeAPIImage(pending.prompt, aspectRatio, u.id);
    
    // Create action buttons for the generated image
    const actionButtons = [
      [
        { text: "🔄 Regenerate", callback_data: `img_regen:${aspectRatio}` },
        { text: "📐 Change Ratio", callback_data: "img_change_ar" }
      ],
      [
        { text: "✨ New Image", callback_data: "img_new" }
      ]
    ];
    
    // Send the image
    await ctx.api.sendPhoto(
      pending.chatId,
      new InputFile(imageBuffer, "generated_image.jpg"),
      {
        caption: `🎨 *Generated Image*\n\n` +
                 `📝 _${pending.prompt.slice(0, 200)}${pending.prompt.length > 200 ? '...' : ''}_\n\n` +
                 `📐 ${config.icon} ${config.label}\n` +
                 `⚡ _Powered by ${getRandomTagline(pending.prompt)}_`,
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: actionButtons }
      }
    );
    
    // Delete the selection message
    try {
      await ctx.api.deleteMessage(pending.chatId, pending.messageId);
    } catch (e) {
      // Ignore
    }
    
    // Update pending with last used aspect ratio (for regenerate)
    pendingImagePrompts.set(u.id, {
      ...pending,
      lastAspectRatio: aspectRatio,
      messageId: null
    });
    
    // Track usage
    const rec = getUserRecord(u.id);
    if (rec) {
      rec.messagesCount = (rec.messagesCount || 0) + 1;
      saveUsers();
    }
    
    console.log(`[IMG] User ${u.id} generated image (${aspectRatio}): "${pending.prompt.slice(0, 50)}"`);
    
  } catch (error) {
    console.error("DeAPI image generation error:", error);
    
    try {
      await ctx.api.editMessageText(
        pending.chatId,
        pending.messageId,
        "❌ *Image generation failed*\n\n" +
        `Error: ${error.message?.slice(0, 100) || 'Unknown error'}\n\n` +
        "Try again or use /imagine for free alternative.",
        {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [{ text: "🔄 Try Again", callback_data: `img_ar:${aspectRatio.replace(':', ':')}` }],
              [{ text: "❌ Cancel", callback_data: "img_cancel" }]
            ]
          }
        }
      );
    } catch (e) {
      await ctx.reply("❌ Image generation failed. Please try /imagine instead.");
    }
  }
});

// Handle regenerate with same settings
bot.callbackQuery(/^img_regen:(.+):(.+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const u = ctx.from;
  if (!u?.id) return;
  
  const pending = pendingImagePrompts.get(u.id);
  if (!pending?.prompt) {
    await ctx.answerCallbackQuery({ text: "Session expired. Please use /img again.", show_alert: true });
    return;
  }
  
  const match = ctx.callbackQuery.data.match(/^img_regen:(.+):(.+)$/);
  const aspectRatio = match ? `${match[1]}:${match[2]}` : pending.lastAspectRatio || "1:1";
  const config = IMG_ASPECT_RATIOS[aspectRatio] || IMG_ASPECT_RATIOS["1:1"];
  
  await ctx.answerCallbackQuery({ text: "🔄 Regenerating..." });
  
  // Send a new generating message
  const statusMsg = await ctx.reply(
    "🔄 *Regenerating image...*\n\n" +
    `📝 _${pending.prompt.slice(0, 100)}..._\n` +
    `📐 ${config.icon} ${config.label}\n\n` +
    "⏳ Please wait...",
    { parse_mode: "Markdown" }
  );
  
  try {
    const imageBuffer = await generateDeAPIImage(pending.prompt, aspectRatio, u.id);
    
    const actionButtons = [
      [
        { text: "🔄 Regenerate", callback_data: `img_regen:${aspectRatio}` },
        { text: "📐 Change Ratio", callback_data: "img_change_ar" }
      ],
      [
        { text: "✨ New Image", callback_data: "img_new" }
      ]
    ];
    
    await ctx.replyWithPhoto(
      new InputFile(imageBuffer, "generated_image.jpg"),
      {
        caption: `🎨 *Regenerated Image*\n\n` +
                 `📝 _${pending.prompt.slice(0, 200)}..._\n\n` +
                 `📐 ${config.icon} ${config.label}\n` +
                 `⚡ _Powered by ${getRandomTagline(pending.prompt)}_`,
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: actionButtons }
      }
    );
    
    try {
      await ctx.api.deleteMessage(ctx.chat.id, statusMsg.message_id);
    } catch (e) {}
    
    const rec = getUserRecord(u.id);
    if (rec) {
      rec.messagesCount = (rec.messagesCount || 0) + 1;
      saveUsers();
    }
    
  } catch (error) {
    console.error("DeAPI regenerate error:", error);
    try {
      await ctx.api.editMessageText(
        ctx.chat.id,
        statusMsg.message_id,
        "❌ Regeneration failed. Please try again.",
        { parse_mode: "Markdown" }
      );
    } catch (e) {}
  }
});

// Handle change aspect ratio
bot.callbackQuery("img_change_ar", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const u = ctx.from;
  if (!u?.id) return;
  
  const pending = pendingImagePrompts.get(u.id);
  if (!pending?.prompt) {
    await ctx.answerCallbackQuery({ text: "Session expired. Please use /img again.", show_alert: true });
    return;
  }
  
  await ctx.answerCallbackQuery();
  
  const aspectButtons = [
    [
      { text: "⬜ Square", callback_data: `img_ar:1:1` },
      { text: "🖼️ Landscape", callback_data: `img_ar:4:3` },
      { text: "📱 Portrait", callback_data: `img_ar:3:4` }
    ],
    [
      { text: "🎬 Widescreen", callback_data: `img_ar:16:9` },
      { text: "📲 Story", callback_data: `img_ar:9:16` },
      { text: "📷 Photo", callback_data: `img_ar:3:2` }
    ],
    [
      { text: "❌ Cancel", callback_data: "img_cancel" }
    ]
  ];
  
  const msg = await ctx.reply(
    "📐 *Change Aspect Ratio*\n\n" +
    `📝 _${pending.prompt.slice(0, 150)}..._\n\n` +
    "Select a new format:",
    {
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: aspectButtons }
    }
  );
  
  pendingImagePrompts.set(u.id, {
    ...pending,
    messageId: msg.message_id,
    chatId: ctx.chat.id
  });
});

// Handle new image request
bot.callbackQuery("img_new", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply(
    "✨ *New Image*\n\n" +
    "Send a new prompt with:\n" +
    "`/img your description here`",
    { parse_mode: "Markdown" }
  );
});

// Handle cancel
bot.callbackQuery("img_cancel", async (ctx) => {
  const u = ctx.from;
  if (u?.id) {
    pendingImagePrompts.delete(u.id);
  }
  
  await ctx.answerCallbackQuery({ text: "Cancelled" });
  
  try {
    await ctx.deleteMessage();
  } catch (e) {
    try {
      await ctx.editMessageText("❌ Cancelled");
    } catch (e2) {}
  }
});

// =====================
// HF SPACE IMAGE GENERATION CALLBACKS (/imagine)
// =====================

// Handle all HF image generation callbacks
bot.callbackQuery(/^img_(size|quality|count|seed|negative|generate|retry|new|cancel|back|model|lora|ar_|q_|n_|s_)/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  try {
    await handleImageCallback(ctx.api, ctx.callbackQuery);
  } catch (error) {
    console.error("HF image callback error:", error);
    await ctx.answerCallbackQuery({ text: "Error processing request", show_alert: true });
  }
});

// Handle all Hivenet ComfyUI image generation callbacks (/hi)
bot.callbackQuery(/^hi_(size|quality|count|seed|negative|generate|retry|new|cancel|back|model|sampler|4k_toggle)/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  try {
    await handleHivenetCallback(ctx.api, ctx.callbackQuery);
  } catch (error) {
    console.error("Hivenet image callback error:", error);
    await ctx.answerCallbackQuery({ text: "Error processing request", show_alert: true });
  }
});

// /imgset - Configure image generation preferences
bot.command("imgset", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const u = ctx.from;
  if (!u?.id) return;
  
  const user = ensureUser(u.id, u);
  const currentRatio = user.imagePrefs?.defaultRatio || "1:1";
  const currentConfig = IMG_ASPECT_RATIOS[currentRatio];
  const isOwnerUser = OWNER_IDS.has(String(u.id));
  
  const text = ctx.message?.text || "";
  const args = text.replace(/^\/imgset\s*/i, "").trim().toLowerCase();
  
  // Handle steps setting (owner only)
  if (args.startsWith("steps ") && isOwnerUser) {
    const stepsValue = parseInt(args.replace("steps ", "").trim());
    if (isNaN(stepsValue) || stepsValue < 1 || stepsValue > 50) {
      await ctx.reply("⚠️ Steps must be between 1 and 50.");
      return;
    }
    user.imagePrefs = user.imagePrefs || {};
    user.imagePrefs.steps = stepsValue;
    saveUsers();
    await ctx.reply(`✅ Image generation steps set to *${stepsValue}*\n\n_Higher steps = better quality but slower_`, { parse_mode: "Markdown" });
    return;
  }
  
  // Handle safe mode toggle (premium/ultra only)
  if (args === "safe on" || args === "safe off" || args === "nsfw on" || args === "nsfw off") {
    if (!canToggleSafeMode(u.id)) {
      await ctx.reply(
        "🔒 *Safe Mode Toggle*\n\n" +
        "This feature is only available for *Premium* and *Ultra* users.\n\n" +
        "Free users have safe mode enabled by default to keep things family-friendly.",
        { parse_mode: "Markdown" }
      );
      return;
    }
    
    const enableSafe = args === "safe on" || args === "nsfw off";
    user.imagePrefs = user.imagePrefs || {};
    user.imagePrefs.safeMode = enableSafe;
    saveUsers();
    
    if (enableSafe) {
      await ctx.reply("✅ *Safe Mode Enabled*\n\nNSFW content will be blocked.", { parse_mode: "Markdown" });
    } else {
      await ctx.reply("🔓 *Safe Mode Disabled*\n\nNSFW content is now allowed.\n\n_Please use responsibly._", { parse_mode: "Markdown" });
    }
    return;
  }
  
  // Handle ratio setting
  const ratioMap = {
    "square": "1:1", "1:1": "1:1",
    "landscape": "4:3", "4:3": "4:3",
    "portrait": "3:4", "3:4": "3:4",
    "widescreen": "16:9", "16:9": "16:9", "wide": "16:9",
    "story": "9:16", "9:16": "9:16", "vertical": "9:16",
    "photo": "3:2", "3:2": "3:2"
  };
  
  if (args && ratioMap[args]) {
    const newRatio = ratioMap[args];
    const newConfig = IMG_ASPECT_RATIOS[newRatio];
    user.imagePrefs = user.imagePrefs || {};
    user.imagePrefs.defaultRatio = newRatio;
    saveUsers();
    await ctx.reply(
      `✅ Default aspect ratio set to ${newConfig.icon} *${newConfig.label}* (${newRatio})\n\n` +
      `Now when you use /img without specifying a ratio, it will use this!`,
      { parse_mode: "Markdown" }
    );
    return;
  }
  
  // Show settings menu
  const currentSafeMode = shouldEnforceSafeMode(u.id);
  const canToggle = canToggleSafeMode(u.id);
  
  const buttons = [
    [
      { text: `${currentRatio === "1:1" ? "✅ " : ""}⬜ Square`, callback_data: "imgset_ratio:1:1" },
      { text: `${currentRatio === "4:3" ? "✅ " : ""}🖼️ Landscape`, callback_data: "imgset_ratio:4:3" },
      { text: `${currentRatio === "3:4" ? "✅ " : ""}📱 Portrait`, callback_data: "imgset_ratio:3:4" }
    ],
    [
      { text: `${currentRatio === "16:9" ? "✅ " : ""}🎬 Widescreen`, callback_data: "imgset_ratio:16:9" },
      { text: `${currentRatio === "9:16" ? "✅ " : ""}📲 Story`, callback_data: "imgset_ratio:9:16" },
      { text: `${currentRatio === "3:2" ? "✅ " : ""}📷 Photo`, callback_data: "imgset_ratio:3:2" }
    ]
  ];
  
  // Add safe mode toggle button for premium/ultra users
  if (canToggle) {
    buttons.push([
      { 
        text: currentSafeMode ? "🔒 Safe Mode: ON (tap to disable)" : "🔓 Safe Mode: OFF (tap to enable)", 
        callback_data: currentSafeMode ? "imgset_safe:off" : "imgset_safe:on" 
      }
    ]);
  }
  
  let settingsText = `⚙️ *Image Settings*\n\n` +
    `📐 *Default Ratio:* ${currentConfig?.icon || '⬜'} ${currentConfig?.label || 'Square'} (${currentRatio})\n\n` +
    `Select a new default ratio:`;
  
  // Show safe mode status
  if (isOwnerUser) {
    settingsText += `\n\n🔓 *Safe Mode:* OFF _(owners unrestricted)_`;
  } else if (user.tier === 'free') {
    settingsText += `\n\n🔒 *Safe Mode:* ON _(always on for free users)_`;
  } else {
    settingsText += `\n\n${currentSafeMode ? '🔒' : '🔓'} *Safe Mode:* ${currentSafeMode ? 'ON' : 'OFF'}`;
  }
  
  // Show steps setting for owners
  if (isOwnerUser) {
    const currentSteps = user.imagePrefs?.steps || 8;
    settingsText += `\n\n🔧 *Steps:* ${currentSteps} _(owner only)_\n` +
      `Use \`/imgset steps [1-50]\` to change`;
  }
  
  await ctx.reply(settingsText, {
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: buttons }
  });
});

// Handle imgset ratio selection
bot.callbackQuery(/^imgset_ratio:(.+):(.+)$/, async (ctx) => {
  const u = ctx.from;
  if (!u?.id) return;
  
  const user = ensureUser(u.id, u);
  const match = ctx.callbackQuery.data.match(/^imgset_ratio:(.+):(.+)$/);
  const newRatio = match ? `${match[1]}:${match[2]}` : "1:1";
  const newConfig = IMG_ASPECT_RATIOS[newRatio];
  
  user.imagePrefs = user.imagePrefs || {};
  user.imagePrefs.defaultRatio = newRatio;
  saveUsers();
  
  await ctx.answerCallbackQuery({ text: `✅ Default set to ${newConfig.label}` });
  
  // Update the message with new selection
  const isOwnerUser = OWNER_IDS.has(String(u.id));
  
  const currentSafeMode = shouldEnforceSafeMode(u.id);
  const canToggle = canToggleSafeMode(u.id);
  
  const buttons = [
    [
      { text: `${newRatio === "1:1" ? "✅ " : ""}⬜ Square`, callback_data: "imgset_ratio:1:1" },
      { text: `${newRatio === "4:3" ? "✅ " : ""}🖼️ Landscape`, callback_data: "imgset_ratio:4:3" },
      { text: `${newRatio === "3:4" ? "✅ " : ""}📱 Portrait`, callback_data: "imgset_ratio:3:4" }
    ],
    [
      { text: `${newRatio === "16:9" ? "✅ " : ""}🎬 Widescreen`, callback_data: "imgset_ratio:16:9" },
      { text: `${newRatio === "9:16" ? "✅ " : ""}📲 Story`, callback_data: "imgset_ratio:9:16" },
      { text: `${newRatio === "3:2" ? "✅ " : ""}📷 Photo`, callback_data: "imgset_ratio:3:2" }
    ]
  ];
  
  // Add safe mode toggle button for premium/ultra users
  if (canToggle) {
    buttons.push([
      { 
        text: currentSafeMode ? "🔒 Safe Mode: ON (tap to disable)" : "🔓 Safe Mode: OFF (tap to enable)", 
        callback_data: currentSafeMode ? "imgset_safe:off" : "imgset_safe:on" 
      }
    ]);
  }
  
  // Add back to features button (if came from menu)
  buttons.push([
    { text: "« Back to Features", callback_data: "menu_features" }
  ]);
  
  let settingsText = `🎨 *Image Settings*\n\n` +
    `📐 *Default Ratio:* ${newConfig.icon} ${newConfig.label} (${newRatio}) ✅\n\n` +
    `Select your default aspect ratio for /img:`;
  
  // Show safe mode status
  if (isOwnerUser) {
    settingsText += `\n\n🔓 *Safe Mode:* OFF _(owners unrestricted)_`;
  } else if (user.tier === 'free') {
    settingsText += `\n\n🔒 *Safe Mode:* ON _(always on for free users)_`;
  } else {
    settingsText += `\n\n${currentSafeMode ? '🔒' : '🔓'} *Safe Mode:* ${currentSafeMode ? 'ON' : 'OFF'}`;
  }
  
  if (isOwnerUser) {
    const currentSteps = user.imagePrefs?.steps || 8;
    settingsText += `\n\n🔧 *Steps:* ${currentSteps} _(owner only)_\n` +
      `Use \`/imgset steps [1-50]\` to change`;
  }
  
  settingsText += `\n\n_Your default is saved! Use /img to generate images._`;
  
  try {
    await ctx.editMessageText(settingsText, {
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: buttons }
    });
  } catch (e) {}
});

// Handle safe mode toggle
bot.callbackQuery(/^imgset_safe:(on|off)$/, async (ctx) => {
  const u = ctx.from;
  if (!u?.id) return;
  
  const user = ensureUser(u.id, u);
  const match = ctx.callbackQuery.data.match(/^imgset_safe:(on|off)$/);
  const enableSafe = match?.[1] === 'on';
  
  // Check if user can toggle
  if (!canToggleSafeMode(u.id)) {
    await ctx.answerCallbackQuery({ 
      text: "🔒 Safe mode toggle requires Premium or Ultra", 
      show_alert: true 
    });
    return;
  }
  
  user.imagePrefs = user.imagePrefs || {};
  user.imagePrefs.safeMode = enableSafe;
  saveUsers();
  
  await ctx.answerCallbackQuery({ 
    text: enableSafe ? "🔒 Safe mode enabled" : "🔓 Safe mode disabled" 
  });
  
  // Update the message
  const isOwnerUser = OWNER_IDS.has(String(u.id));
  const currentRatio = user.imagePrefs?.defaultRatio || "1:1";
  const currentConfig = IMG_ASPECT_RATIOS[currentRatio];
  const currentSafeMode = shouldEnforceSafeMode(u.id);
  
  const buttons = [
    [
      { text: `${currentRatio === "1:1" ? "✅ " : ""}⬜ Square`, callback_data: "imgset_ratio:1:1" },
      { text: `${currentRatio === "4:3" ? "✅ " : ""}🖼️ Landscape`, callback_data: "imgset_ratio:4:3" },
      { text: `${currentRatio === "3:4" ? "✅ " : ""}📱 Portrait`, callback_data: "imgset_ratio:3:4" }
    ],
    [
      { text: `${currentRatio === "16:9" ? "✅ " : ""}🎬 Widescreen`, callback_data: "imgset_ratio:16:9" },
      { text: `${currentRatio === "9:16" ? "✅ " : ""}📲 Story`, callback_data: "imgset_ratio:9:16" },
      { text: `${currentRatio === "3:2" ? "✅ " : ""}📷 Photo`, callback_data: "imgset_ratio:3:2" }
    ],
    [
      { 
        text: currentSafeMode ? "🔒 Safe Mode: ON (tap to disable)" : "🔓 Safe Mode: OFF (tap to enable)", 
        callback_data: currentSafeMode ? "imgset_safe:off" : "imgset_safe:on" 
      }
    ],
    [
      { text: "« Back to Features", callback_data: "menu_features" }
    ]
  ];
  
  let settingsText = `🎨 *Image Settings*\n\n` +
    `📐 *Default Ratio:* ${currentConfig?.icon || '⬜'} ${currentConfig?.label || 'Square'} (${currentRatio})\n\n` +
    `Select your default aspect ratio for /img:`;
  
  // Show safe mode status
  if (isOwnerUser) {
    settingsText += `\n\n🔓 *Safe Mode:* OFF _(owners unrestricted)_`;
  } else if (user.tier === 'free') {
    settingsText += `\n\n🔒 *Safe Mode:* ON _(always on for free users)_`;
  } else {
    settingsText += `\n\n${currentSafeMode ? '🔒' : '🔓'} *Safe Mode:* ${currentSafeMode ? 'ON' : 'OFF'}`;
  }
  
  if (isOwnerUser) {
    const currentSteps = user.imagePrefs?.steps || 8;
    settingsText += `\n\n🔧 *Steps:* ${currentSteps} _(owner only)_\n` +
      `Use \`/imgset steps [1-50]\` to change`;
  }
  
  try {
    await ctx.editMessageText(settingsText, {
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: buttons }
    });
  } catch (e) {}
});

// Feedback button in main menu or moderation messages
bot.callbackQuery("menu_feedback", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;

  if (!FEEDBACK_CHAT_ID) {
    await ctx.answerCallbackQuery({
      text: "Feedback is not configured yet.",
      show_alert: true,
    });
    return;
  }

  const chatType = ctx.chat?.type;
  if (chatType !== "private") {
    await ctx.answerCallbackQuery({
      text: "Open a private chat with @starztechbot to send feedback.",
      show_alert: true,
    });
    return;
  }

  const u = ctx.from;
  if (!u?.id) {
    await ctx.answerCallbackQuery({ text: "No user ID.", show_alert: true });
    return;
  }

  // Infer context from the message text (ban/mute/softban/warn/general)
  const msgText = ctx.callbackQuery.message?.text || "";
  let source = "general";
  if (msgText.includes("You have been banned from using StarzAI")) {
    source = "ban";
  } else if (msgText.includes("You have been muted on StarzAI")) {
    source = "mute";
  } else if (msgText.includes("temporary soft ban on StarzAI")) {
    source = "softban";
  } else if (msgText.includes("You have received a warning on StarzAI")) {
    source = "warn";
  }

  pendingFeedback.set(String(u.id), { createdAt: Date.now(), source });

  await ctx.answerCallbackQuery();
  await ctx.reply(
    "💡 *Feedback Mode*\n\n" +
      "Please send *one message* with your feedback.\n" +
      "You can attach *one photo or video* with a caption, or just send text.\n\n" +
      "_You have 2 minutes. After that, feedback mode will expire._",
    { parse_mode: "Markdown" }
  );
});

// Owner command: reply to feedback by feedback ID
bot.command("fbreply", async (ctx) => {
  if (!isOwner(ctx)) return ctx.reply("🚫 Owner only.");

  const args = (ctx.message?.text || "").split(/\s+/).slice(1);
  if (args.length < 2) {
    return ctx.reply("Usage: /fbreply <feedbackId> <message>");
  }

  const [feedbackId, ...rest] = args;
  const replyText = rest.join(" ").trim();
  if (!replyText) {
    return ctx.reply("Please provide a reply message after the feedbackId.");
  }

  const userId = extractUserIdFromFeedbackId(feedbackId);
  if (!userId) {
    return ctx.reply("⚠️ Invalid feedback ID format.");
  }

  try {
    await bot.api.sendMessage(
      userId,
      `💡 *Feedback response* (ID: \`${feedbackId}\`)\n\n${escapeMarkdown(replyText)}`,
      { parse_mode: "Markdown" }
    );
    await ctx.reply(`✅ Reply sent to user ${userId} for feedback ${feedbackId}.`);
  } catch (e) {
    console.error("fbreply send error:", e.message);
    await ctx.reply(
      `❌ Failed to send reply to user ${userId}. They may not have started the bot or blocked it.`
    );
  }
});

// Alias: /f <feedbackId> <message>
bot.command("f", async (ctx) => {
  if (!isOwner(ctx)) return ctx.reply("🚫 Owner only.");

  const args = (ctx.message?.text || "").split(/\s+/).slice(1);
  if (args.length < 2) {
    return ctx.reply("Usage: /f <feedbackId> <message>");
  }

  const [feedbackId, ...rest] = args;
  const replyText = rest.join(" ").trim();
  if (!replyText) {
    return ctx.reply("Please provide a reply message after the feedbackId.");
  }

  const userId = extractUserIdFromFeedbackId(feedbackId);
  if (!userId) {
    return ctx.reply("⚠️ Invalid feedback ID format.");
  }

  try {
    await bot.api.sendMessage(
      userId,
      `💡 *Feedback response* (ID: \`${feedbackId}\`)\n\n${escapeMarkdown(replyText)}`,
      { parse_mode: "Markdown" }
    );
    await ctx.reply(`✅ Reply sent to user ${userId} for feedback ${feedbackId}.`);
  } catch (e) {
    console.error("f send error:", e.message);
    await ctx.reply(
      `❌ Failed to send reply to user ${userId}. They may not have started the bot or blocked it.`
    );
  }
});

// /stats - Show user usage statistics
bot.command("stats", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  if (!(await enforceCommandCooldown(ctx))) return;
  const u = ctx.from;
  if (!u?.id) return;
  
  const user = getUserRecord(u.id);
  if (!user) {
    return ctx.reply("❌ You're not registered yet. Send /start first!");
  }
  
  const stats = user.stats || { totalMessages: 0, totalInlineQueries: 0, totalTokensUsed: 0, lastActive: "Never" };
  const shortModel = (user.model || "None").split("/").pop();
  
  // Calculate days since registration
  const regDate = new Date(user.registeredAt || Date.now());
  const daysSinceReg = Math.floor((Date.now() - regDate.getTime()) / (1000 * 60 * 60 * 24));
  
  // Format last active
  const lastActive = stats.lastActive ? new Date(stats.lastActive).toLocaleDateString() : "Never";
  
  const tierEmoji = user.tier === "ultra" ? "💎" : user.tier === "premium" ? "⭐" : "🆓";
  
  const statsMsg = `📊 *Your StarzAI Stats*

👤 *User:* ${user.firstName || "Unknown"} (@${user.username || "no username"})
${tierEmoji} *Plan:* ${(user.tier || "free").toUpperCase()}
🤖 *Model:* \`${shortModel}\`

💬 *DM Messages:* ${stats.totalMessages.toLocaleString()}
⚡ *Inline Queries:* ${stats.totalInlineQueries.toLocaleString()}
📝 *Total Interactions:* ${(stats.totalMessages + stats.totalInlineQueries).toLocaleString()}

📅 *Member for:* ${daysSinceReg} days
🕒 *Last Active:* ${lastActive}

_Keep chatting to grow your stats!_`;
  
  await ctx.reply(statsMsg, {
    parse_mode: "Markdown",
    reply_to_message_id: ctx.message?.message_id,
  });
});

// =====================
// ADVANCED TODO/CHECKLIST SYSTEM
// =====================

// Priority emoji mapping
const PRIORITY_EMOJI = {
  high: "🔴",
  medium: "🟡",
  low: "🟢",
  none: "⚪"
};

const PRIORITY_LABELS = {
  high: "High",
  medium: "Medium",
  low: "Low",
  none: "None"
};

// Category emoji mapping
const CATEGORY_EMOJI = {
  work: "💼",
  personal: "👤",
  shopping: "🛒",
  health: "💪",
  learning: "📚",
  finance: "💰",
  home: "🏠",
  social: "👥",
  travel: "✈️",
  other: "📌"
};

// Get category emoji
function getCategoryEmoji(category) {
  if (!category) return "📌";
  return CATEGORY_EMOJI[category.toLowerCase()] || "📌";
}

// Get task by ID
function getTaskById(userId, taskId) {
  const userTodos = getUserTodos(userId);
  return userTodos.tasks.find(t => t.id === taskId) || null;
}

// Update a task's properties
function updateTask(userId, taskId, updates) {
  const userTodos = getUserTodos(userId);
  const task = userTodos.tasks.find(t => t.id === taskId);
  if (!task) return null;
  
  if (updates.text !== undefined) task.text = updates.text;
  if (updates.priority !== undefined) task.priority = updates.priority;
  if (updates.category !== undefined) task.category = updates.category;
  if (updates.dueDate !== undefined) task.dueDate = updates.dueDate;
  
  saveTodos();
  return task;
}

// Check if a due date is overdue
function isOverdue(dueDate) {
  if (!dueDate) return false;
  const today = new Date().toISOString().slice(0, 10);
  return dueDate < today;
}

// Get user's completion streak
function getCompletionStreak(userId) {
  const userTodos = getUserTodos(userId);
  return userTodos.stats?.currentStreak || 0;
}

// Category emoji mapping
const DEFAULT_CATEGORIES = {
  personal: "👤",
  work: "💼",
  shopping: "🛒",
  health: "💪",
  learning: "📚",
  finance: "💰",
  home: "🏠",
  other: "📌"
};

// Get user's todo list
function getUserTodos(userId) {
  const id = String(userId);
  if (!todosDb.todos[id]) {
    todosDb.todos[id] = {
      tasks: [],
      categories: { ...DEFAULT_CATEGORIES },
      settings: {
        defaultCategory: "personal",
        defaultPriority: "none",
        showCompleted: true,
        sortBy: "created"
      },
      stats: {
        totalCreated: 0,
        totalCompleted: 0,
        currentStreak: 0,
        longestStreak: 0,
        lastCompletedDate: null
      }
    };
    saveTodos();
  }
  return todosDb.todos[id];
}

// Generate unique task ID
function generateTaskId() {
  return crypto.randomBytes(4).toString("hex");
}

// Create a new task
function createTask(userId, taskData) {
  const userTodos = getUserTodos(userId);
  const task = {
    id: generateTaskId(),
    text: taskData.text,
    completed: false,
    priority: taskData.priority || userTodos.settings.defaultPriority,
    category: taskData.category || userTodos.settings.defaultCategory,
    dueDate: taskData.dueDate || null,
    dueTime: taskData.dueTime || null,
    recurring: taskData.recurring || null,
    subtasks: [],
    notes: taskData.notes || "",
    createdAt: new Date().toISOString(),
    completedAt: null,
    parentId: taskData.parentId || null
  };
  
  if (task.parentId) {
    const parentTask = userTodos.tasks.find(t => t.id === task.parentId);
    if (parentTask) {
      parentTask.subtasks.push(task);
    }
  } else {
    userTodos.tasks.push(task);
  }
  
  userTodos.stats.totalCreated++;
  saveTodos();
  return task;
}

// Toggle task completion
function toggleTaskCompletion(userId, taskId) {
  const userTodos = getUserTodos(userId);
  
  let task = userTodos.tasks.find(t => t.id === taskId);
  let isSubtask = false;
  
  if (!task) {
    for (const t of userTodos.tasks) {
      const subtask = t.subtasks?.find(st => st.id === taskId);
      if (subtask) {
        task = subtask;
        isSubtask = true;
        break;
      }
    }
  }
  
  if (!task) return null;
  
  task.completed = !task.completed;
  task.completedAt = task.completed ? new Date().toISOString() : null;
  
  if (task.completed) {
    userTodos.stats.totalCompleted++;
    
    const today = new Date().toISOString().slice(0, 10);
    const lastCompleted = userTodos.stats.lastCompletedDate;
    
    if (!lastCompleted) {
      userTodos.stats.currentStreak = 1;
    } else {
      const lastDate = new Date(lastCompleted);
      const todayDate = new Date(today);
      const diffDays = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        userTodos.stats.currentStreak++;
      } else if (diffDays > 1) {
        userTodos.stats.currentStreak = 1;
      }
    }
    
    userTodos.stats.lastCompletedDate = today;
    userTodos.stats.longestStreak = Math.max(
      userTodos.stats.longestStreak,
      userTodos.stats.currentStreak
    );
    
    // Handle recurring tasks
    if (task.recurring && !isSubtask) {
      const newTask = { ...task };
      newTask.id = generateTaskId();
      newTask.completed = false;
      newTask.completedAt = null;
      newTask.createdAt = new Date().toISOString();
      
      if (task.dueDate) {
        const dueDate = new Date(task.dueDate);
        const interval = task.recurring.interval || 1;
        
        switch (task.recurring.type) {
          case 'daily':
            dueDate.setDate(dueDate.getDate() + interval);
            break;
          case 'weekly':
            dueDate.setDate(dueDate.getDate() + (7 * interval));
            break;
          case 'monthly':
            dueDate.setMonth(dueDate.getMonth() + interval);
            break;
        }
        newTask.dueDate = dueDate.toISOString().slice(0, 10);
      }
      
      userTodos.tasks.push(newTask);
    }
  }
  
  saveTodos();
  return task;
}

// Delete a task
function deleteTaskById(userId, taskId) {
  const userTodos = getUserTodos(userId);
  
  const index = userTodos.tasks.findIndex(t => t.id === taskId);
  if (index !== -1) {
    userTodos.tasks.splice(index, 1);
    saveTodos();
    return true;
  }
  
  for (const task of userTodos.tasks) {
    const subIndex = task.subtasks?.findIndex(st => st.id === taskId);
    if (subIndex !== -1) {
      task.subtasks.splice(subIndex, 1);
      saveTodos();
      return true;
    }
  }
  
  return false;
}

// Get tasks with filters
function getFilteredTasks(userId, filters = {}) {
  const userTodos = getUserTodos(userId);
  let tasks = [...userTodos.tasks];
  
  if (!userTodos.settings.showCompleted && !filters.showCompleted) {
    tasks = tasks.filter(t => !t.completed);
  }
  
  if (filters.category) {
    tasks = tasks.filter(t => t.category === filters.category);
  }
  
  if (filters.priority) {
    tasks = tasks.filter(t => t.priority === filters.priority);
  }
  
  if (filters.dueFilter) {
    const today = new Date().toISOString().slice(0, 10);
    
    switch (filters.dueFilter) {
      case 'today':
        tasks = tasks.filter(t => t.dueDate === today);
        break;
      case 'overdue':
        tasks = tasks.filter(t => t.dueDate && t.dueDate < today && !t.completed);
        break;
      case 'upcoming':
        tasks = tasks.filter(t => t.dueDate && t.dueDate > today);
        break;
      case 'noduedate':
        tasks = tasks.filter(t => !t.dueDate);
        break;
    }
  }
  
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    tasks = tasks.filter(t => 
      t.text.toLowerCase().includes(searchLower) ||
      t.notes?.toLowerCase().includes(searchLower)
    );
  }
  
  const sortBy = filters.sortBy || userTodos.settings.sortBy;
  tasks.sort((a, b) => {
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }
    
    switch (sortBy) {
      case 'priority':
        const priorityOrder = { high: 0, medium: 1, low: 2, none: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      case 'dueDate':
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      case 'category':
        return (a.category || '').localeCompare(b.category || '');
      case 'created':
      default:
        return new Date(b.createdAt) - new Date(a.createdAt);
    }
  });
  
  return tasks;
}

// Format task for display
function formatTaskDisplay(task, userTodos, showIndex = true, index = 0) {
  const checkbox = task.completed ? "✅" : "⬜";
  const priority = PRIORITY_EMOJI[task.priority] || "";
  const category = userTodos.categories[task.category] || "📌";
  
  let text = `${checkbox} `;
  if (showIndex) text += `*${index}.* `;
  if (priority && task.priority !== 'none') text += `${priority} `;
  
  if (task.completed) {
    text += `~${task.text}~`;
  } else {
    text += task.text;
  }
  
  if (task.dueDate) {
    const today = new Date().toISOString().slice(0, 10);
    const isOverdue = task.dueDate < today && !task.completed;
    const isToday = task.dueDate === today;
    
    if (isOverdue) {
      text += ` ⚠️ _Overdue_`;
    } else if (isToday) {
      text += ` 📅 _Today_`;
    } else {
      text += ` 📅 _${task.dueDate}_`;
    }
  }
  
  if (task.recurring) {
    text += ` 🔄`;
  }
  
  text += ` ${category}`;
  
  return text;
}

// Build todo list message
function buildTodoListMessage(userId, page = 0, filters = {}) {
  const userTodos = getUserTodos(userId);
  const tasks = getFilteredTasks(userId, filters);
  const pageSize = 8;
  const totalPages = Math.ceil(tasks.length / pageSize) || 1;
  const currentPage = Math.min(page, totalPages - 1);
  const startIndex = currentPage * pageSize;
  const pageTasks = tasks.slice(startIndex, startIndex + pageSize);
  
  const totalTasks = userTodos.tasks.length;
  const completedTasks = userTodos.tasks.filter(t => t.completed).length;
  const todayDate = new Date().toISOString().slice(0, 10);
  const overdueTasks = userTodos.tasks.filter(t => 
    t.dueDate && t.dueDate < todayDate && !t.completed
  ).length;
  
  let message = [
    "✅ *Starz Check - Personal*",
    "",
    `📊 *Progress:* ${completedTasks}/${totalTasks} completed`,
  ];
  
  if (overdueTasks > 0) {
    message.push(`⚠️ *Overdue:* ${overdueTasks} task${overdueTasks > 1 ? 's' : ''}`);
  }
  
  if (userTodos.stats.currentStreak > 0) {
    message.push(`🔥 *Streak:* ${userTodos.stats.currentStreak} day${userTodos.stats.currentStreak > 1 ? 's' : ''}`);
  }
  
  message.push("");
  
  if (pageTasks.length === 0) {
    if (filters.category || filters.priority || filters.dueFilter || filters.search) {
      message.push("_No tasks match your filters._");
    } else {
      message.push("_No tasks yet! Tap ➕ Add to create one._");
    }
  } else {
    message.push("_Tap a task to toggle • Double-tap for options_");
  }
  
  if (totalPages > 1) {
    message.push("");
    message.push(`_Page ${currentPage + 1}/${totalPages}_`);
  }
  
  return message.join("\n");
}

// Build todo keyboard
function buildTodoKeyboard(userId, page = 0, filters = {}) {
  const userTodos = getUserTodos(userId);
  const tasks = getFilteredTasks(userId, filters);
  const pageSize = 8;
  const totalPages = Math.ceil(tasks.length / pageSize) || 1;
  const currentPage = Math.min(page, totalPages - 1);
  const startIndex = currentPage * pageSize;
  const pageTasks = tasks.slice(startIndex, startIndex + pageSize);
  
  const kb = new InlineKeyboard();
  
  // Task buttons with text (one per row, like inline mode)
  pageTasks.forEach(task => {
    if (!task || !task.text) return; // Skip invalid tasks
    
    const icon = task.completed ? "✅" : "⬜";
    const text = task.text.slice(0, 25) + (task.text.length > 25 ? "..." : "");
    
    // Category emoji
    const catEmoji = userTodos.categories?.[task.category]?.emoji || "👤";
    
    // Priority indicator
    let priInd = "";
    if (task.priority === "high") priInd = " 🔴";
    else if (task.priority === "medium") priInd = " 🟡";
    
    // Due indicator
    let dueInd = "";
    if (task.dueDate) {
      const today = new Date().toISOString().slice(0, 10);
      if (task.dueDate < today && !task.completed) dueInd = " ⚠️";
      else if (task.dueDate === today) dueInd = " 📅";
    }
    
    kb.text(`${icon} ${text} ${catEmoji}${priInd}${dueInd}`, `todo_toggle:${task.id}`);
    kb.row();
  });
  
  // Pagination
  if (totalPages > 1) {
    if (currentPage > 0) {
      kb.text("◀️", `todo_page:${currentPage - 1}`);
    }
    kb.text(`${currentPage + 1}/${totalPages}`, "todo_noop");
    if (currentPage < totalPages - 1) {
      kb.text("▶️", `todo_page:${currentPage + 1}`);
    }
    kb.row();
  }
  
  // Action buttons - simplified to match inline style
  kb.text("➕ Add", "todo_add")
    .text("🔍 Filter", "todo_filter")
    .text("👥 Collab", "collab_list")
    .row()
    .text("🗑️ Clear Done", "todo_clear_done")
    .text("« Menu", "menu_back");
  
  return kb;
}

// Build filter keyboard
function buildTodoFilterKeyboard(userId) {
  const userTodos = getUserTodos(userId);
  const kb = new InlineKeyboard();
  
  kb.text("📅 Today", "todo_filter_due:today")
    .text("⚠️ Overdue", "todo_filter_due:overdue")
    .row()
    .text("🔜 Upcoming", "todo_filter_due:upcoming")
    .text("📭 No Date", "todo_filter_due:noduedate")
    .row();
  
  kb.text("🔴 High", "todo_filter_priority:high")
    .text("🟡 Med", "todo_filter_priority:medium")
    .text("🟢 Low", "todo_filter_priority:low")
    .row();
  
  const categories = Object.entries(userTodos.categories).slice(0, 4);
  categories.forEach(([key, emoji]) => {
    kb.text(`${emoji}`, `todo_filter_category:${key}`);
  });
  kb.row();
  
  const showCompleted = userTodos.settings.showCompleted;
  kb.text(showCompleted ? "👁️ Hide Done" : "👁️ Show Done", "todo_toggle_completed")
    .row();
  
  kb.text("🔄 Clear Filters", "todo_clear_filters")
    .text("« Back", "todo_list")
    .row();
  
  return kb;
}

// Build settings keyboard
function buildTodoSettingsKeyboard(userId) {
  const userTodos = getUserTodos(userId);
  const kb = new InlineKeyboard();
  
  kb.text("📊 Sort by:", "todo_noop").row();
  
  const sortOptions = [
    { key: 'created', label: '🕐' },
    { key: 'priority', label: '🎯' },
    { key: 'dueDate', label: '📅' },
    { key: 'category', label: '📁' }
  ];
  
  sortOptions.forEach(opt => {
    const isActive = userTodos.settings.sortBy === opt.key;
    kb.text(`${isActive ? '✓ ' : ''}${opt.label}`, `todo_sort:${opt.key}`);
  });
  kb.row();
  
  kb.text("Default Priority:", "todo_noop").row();
  ['none', 'low', 'medium', 'high'].forEach(p => {
    const isActive = userTodos.settings.defaultPriority === p;
    kb.text(`${isActive ? '✓ ' : ''}${PRIORITY_EMOJI[p]}`, `todo_default_priority:${p}`);
  });
  kb.row();
  
  kb.text("📊 View Stats", "todo_stats").row();
  
  kb.text("« Back to Tasks", "todo_list");
  
  return kb;
}

// Build stats message
function buildTodoStatsMessage(userId) {
  const userTodos = getUserTodos(userId);
  const stats = userTodos.stats;
  const tasks = userTodos.tasks;
  
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.completed).length;
  const pendingTasks = totalTasks - completedTasks;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  
  const categoryStats = {};
  tasks.forEach(t => {
    const cat = t.category || 'other';
    if (!categoryStats[cat]) categoryStats[cat] = { total: 0, completed: 0 };
    categoryStats[cat].total++;
    if (t.completed) categoryStats[cat].completed++;
  });
  
  const priorityStats = { high: 0, medium: 0, low: 0, none: 0 };
  tasks.filter(t => !t.completed).forEach(t => {
    priorityStats[t.priority || 'none']++;
  });
  
  let message = [
    "📊 *Task Statistics*",
    "",
    "━━━━━━━━━━━━━━━━━━━━━━",
    "",
    `📋 *Total Tasks:* ${totalTasks}`,
    `✅ *Completed:* ${completedTasks}`,
    `⏳ *Pending:* ${pendingTasks}`,
    `📈 *Completion Rate:* ${completionRate}%`,
    "",
    "━━━━━━━━━━━━━━━━━━━━━━",
    "",
    `🔥 *Current Streak:* ${stats.currentStreak} day${stats.currentStreak !== 1 ? 's' : ''}`,
    `🏆 *Longest Streak:* ${stats.longestStreak} day${stats.longestStreak !== 1 ? 's' : ''}`,
    `📅 *All-time Completed:* ${stats.totalCompleted}`,
    "",
    "━━━━━━━━━━━━━━━━━━━━━━",
    "",
    "*Pending by Priority:*",
    `${PRIORITY_EMOJI.high} High: ${priorityStats.high}`,
    `${PRIORITY_EMOJI.medium} Medium: ${priorityStats.medium}`,
    `${PRIORITY_EMOJI.low} Low: ${priorityStats.low}`,
  ];
  
  if (Object.keys(categoryStats).length > 0) {
    message.push("");
    message.push("*By Category:*");
    Object.entries(categoryStats).forEach(([cat, s]) => {
      const emoji = userTodos.categories[cat] || "📌";
      message.push(`${emoji} ${cat}: ${s.completed}/${s.total}`);
    });
  }
  
  return message.join("\n");
}

// Pending task input tracking
const pendingTodoInput = new Map();

// Current filter state per user
const todoFilters = new Map();

function getTodoFilters(userId) {
  return todoFilters.get(String(userId)) || {};
}

function setTodoFilters(userId, filters) {
  todoFilters.set(String(userId), filters);
}

function clearTodoFilters(userId) {
  todoFilters.delete(String(userId));
}

// Filter todos based on filters
function filterTodos(tasks, filters) {
  if (!tasks || !Array.isArray(tasks)) return [];
  if (!filters || Object.keys(filters).length === 0) return tasks;
  
  return tasks.filter(task => {
    if (filters.priority && task.priority !== filters.priority) return false;
    if (filters.category && task.category !== filters.category) return false;
    if (filters.completed !== undefined && task.completed !== filters.completed) return false;
    if (filters.hasDueDate && !task.dueDate) return false;
    return true;
  });
}

// Sort todos based on sort option
function sortTodos(tasks, sortBy) {
  if (!tasks || !Array.isArray(tasks)) return [];
  
  const sorted = [...tasks];
  
  switch (sortBy) {
    case 'priority':
      const priorityOrder = { high: 0, medium: 1, low: 2, null: 3 };
      sorted.sort((a, b) => (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3));
      break;
    case 'dueDate':
      sorted.sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      });
      break;
    case 'category':
      sorted.sort((a, b) => (a.category || 'zzz').localeCompare(b.category || 'zzz'));
      break;
    case 'created':
    default:
      sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      break;
  }
  
  return sorted;
}

// Parse due date from natural language
function parseTodoDueDate(input) {
  const lower = input.toLowerCase().trim();
  const today = new Date();
  
  if (lower === 'today') {
    return today.toISOString().slice(0, 10);
  }
  if (lower === 'tomorrow') {
    today.setDate(today.getDate() + 1);
    return today.toISOString().slice(0, 10);
  }
  if (lower === 'nextweek' || lower === 'next week') {
    today.setDate(today.getDate() + 7);
    return today.toISOString().slice(0, 10);
  }
  
  const dateMatch = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateMatch) {
    return input;
  }
  
  const shortMatch = input.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (shortMatch) {
    const month = parseInt(shortMatch[1]);
    const day = parseInt(shortMatch[2]);
    const year = today.getFullYear();
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  
  return null;
}

// Parse task from text (supports inline options)
// Format: task text #category !priority @date
function parseTaskText(text) {
  const result = {
    text: text,
    category: null,
    priority: null,
    dueDate: null
  };
  
  const categoryMatch = text.match(/#(\w+)/);
  if (categoryMatch) {
    result.category = categoryMatch[1].toLowerCase();
    result.text = result.text.replace(/#\w+/, '').trim();
  }
  
  const priorityMatch = text.match(/!(high|med|medium|low|h|m|l)/i);
  if (priorityMatch) {
    const p = priorityMatch[1].toLowerCase();
    if (p === 'h' || p === 'high') result.priority = 'high';
    else if (p === 'm' || p === 'med' || p === 'medium') result.priority = 'medium';
    else if (p === 'l' || p === 'low') result.priority = 'low';
    result.text = result.text.replace(/!(high|med|medium|low|h|m|l)/i, '').trim();
  }
  
  const dateMatch = text.match(/@(\S+)/);
  if (dateMatch) {
    result.dueDate = parseTodoDueDate(dateMatch[1]);
    result.text = result.text.replace(/@\S+/, '').trim();
  }
  
  return result;
}

// =====================
// COLLABORATIVE TODO SYSTEM (Starz Check - Collab)
// =====================

// Generate unique list ID
function generateCollabListId() {
  return crypto.randomBytes(4).toString("hex");
}

// Generate join code (shorter, user-friendly)
function generateJoinCode() {
  return crypto.randomBytes(3).toString("hex").toUpperCase();
}

// Get all collab lists for a user
function getCollabListsForUser(userId) {
  const id = String(userId);
  if (!collabTodosDb.userLists) collabTodosDb.userLists = {};
  if (!collabTodosDb.userLists[id]) collabTodosDb.userLists[id] = [];
  
  // Return actual list objects
  return collabTodosDb.userLists[id]
    .map(listId => collabTodosDb.lists[listId])
    .filter(Boolean);
}

// Get a specific collab list by ID
function getCollabList(listId) {
  return collabTodosDb.lists?.[listId] || null;
}

// Get a collab list by join code
function getCollabListByCode(code) {
  const upperCode = code.toUpperCase();
  return Object.values(collabTodosDb.lists || {}).find(l => l.joinCode === upperCode) || null;
}

// Create a new collaborative list
function createCollabList(userId, name, description = "") {
  const listId = generateCollabListId();
  const joinCode = generateJoinCode();
  
  if (!collabTodosDb.lists) collabTodosDb.lists = {};
  if (!collabTodosDb.userLists) collabTodosDb.userLists = {};
  
  const list = {
    id: listId,
    name: name,
    description: description,
    joinCode: joinCode,
    ownerId: String(userId),
    members: [{ userId: String(userId), username: null, joinedAt: new Date().toISOString(), role: "owner" }],
    tasks: [],
    createdAt: new Date().toISOString(),
    settings: {
      allowMemberAdd: true,
      showCompletedBy: true,
      notifyOnComplete: true
    },
    stats: {
      totalCreated: 0,
      totalCompleted: 0
    }
  };
  
  collabTodosDb.lists[listId] = list;
  
  // Add to user's list
  if (!collabTodosDb.userLists[String(userId)]) {
    collabTodosDb.userLists[String(userId)] = [];
  }
  collabTodosDb.userLists[String(userId)].push(listId);
  
  saveCollabTodos();
  return list;
}

// Join a collaborative list
function joinCollabList(userId, joinCode, username = null) {
  const list = getCollabListByCode(joinCode);
  if (!list) return { success: false, error: "List not found" };
  
  const id = String(userId);
  
  // Check if already a member
  if (list.members.some(m => m.userId === id)) {
    return { success: false, error: "Already a member", list };
  }
  
  // Add member
  list.members.push({
    userId: id,
    username: username,
    joinedAt: new Date().toISOString(),
    role: "member"
  });
  
  // Add to user's lists
  if (!collabTodosDb.userLists[id]) {
    collabTodosDb.userLists[id] = [];
  }
  if (!collabTodosDb.userLists[id].includes(list.id)) {
    collabTodosDb.userLists[id].push(list.id);
  }
  
  saveCollabTodos();
  return { success: true, list };
}

// Leave a collaborative list
function leaveCollabList(userId, listId) {
  const list = getCollabList(listId);
  if (!list) return false;
  
  const id = String(userId);
  
  // Can't leave if owner
  if (list.ownerId === id) {
    return { success: false, error: "Owner cannot leave. Delete the list instead." };
  }
  
  // Remove from members
  list.members = list.members.filter(m => m.userId !== id);
  
  // Remove from user's lists
  if (collabTodosDb.userLists[id]) {
    collabTodosDb.userLists[id] = collabTodosDb.userLists[id].filter(lid => lid !== listId);
  }
  
  saveCollabTodos();
  return { success: true };
}

// Delete a collaborative list (owner only)
function deleteCollabList(userId, listId) {
  const list = getCollabList(listId);
  if (!list) return { success: false, error: "List not found" };
  
  if (list.ownerId !== String(userId)) {
    return { success: false, error: "Only the owner can delete this list" };
  }
  
  // Remove from all members' lists
  list.members.forEach(m => {
    if (collabTodosDb.userLists[m.userId]) {
      collabTodosDb.userLists[m.userId] = collabTodosDb.userLists[m.userId].filter(lid => lid !== listId);
    }
  });
  
  // Delete the list
  delete collabTodosDb.lists[listId];
  
  saveCollabTodos();
  return { success: true };
}

// Add task to collaborative list
function addCollabTask(userId, listId, taskData, username = null) {
  const list = getCollabList(listId);
  if (!list) return null;
  
  // Check if user is a member
  if (!list.members.some(m => m.userId === String(userId))) {
    return null;
  }
  
  const task = {
    id: generateTaskId(),
    text: taskData.text,
    completed: false,
    priority: taskData.priority || "none",
    category: taskData.category || "other",
    dueDate: taskData.dueDate || null,
    createdAt: new Date().toISOString(),
    createdBy: { userId: String(userId), username },
    completedAt: null,
    completedBy: null,
    assignedTo: taskData.assignedTo || null
  };
  
  list.tasks.push(task);
  list.stats.totalCreated++;
  
  saveCollabTodos();
  return task;
}

// Toggle collab task completion
function toggleCollabTask(userId, listId, taskId, username = null) {
  const list = getCollabList(listId);
  if (!list) return null;
  
  // Check if user is a member
  if (!list.members.some(m => m.userId === String(userId))) {
    return null;
  }
  
  const task = list.tasks.find(t => t.id === taskId);
  if (!task) return null;
  
  task.completed = !task.completed;
  
  if (task.completed) {
    task.completedAt = new Date().toISOString();
    task.completedBy = { userId: String(userId), username };
    list.stats.totalCompleted++;
  } else {
    task.completedAt = null;
    task.completedBy = null;
  }
  
  saveCollabTodos();
  return task;
}

// Delete collab task
function deleteCollabTask(userId, listId, taskId) {
  const list = getCollabList(listId);
  if (!list) return false;
  
  // Check if user is a member
  if (!list.members.some(m => m.userId === String(userId))) {
    return false;
  }
  
  const index = list.tasks.findIndex(t => t.id === taskId);
  if (index === -1) return false;
  
  list.tasks.splice(index, 1);
  saveCollabTodos();
  return true;
}

// Get collab task by ID
function getCollabTaskById(listId, taskId) {
  const list = getCollabList(listId);
  if (!list) return null;
  return list.tasks.find(t => t.id === taskId) || null;
}

// Update collab task
function updateCollabTask(userId, listId, taskId, updates) {
  const list = getCollabList(listId);
  if (!list) return null;
  
  // Check if user is a member
  if (!list.members.some(m => m.userId === String(userId))) {
    return null;
  }
  
  const task = list.tasks.find(t => t.id === taskId);
  if (!task) return null;
  
  if (updates.text !== undefined) task.text = updates.text;
  if (updates.priority !== undefined) task.priority = updates.priority;
  if (updates.category !== undefined) task.category = updates.category;
  if (updates.dueDate !== undefined) task.dueDate = updates.dueDate;
  if (updates.assignedTo !== undefined) task.assignedTo = updates.assignedTo;
  
  saveCollabTodos();
  return task;
}

// Clear completed tasks from collab list
function clearCollabCompletedTasks(userId, listId) {
  const list = getCollabList(listId);
  if (!list) return 0;
  
  // Check if user is owner or member
  if (!list.members.some(m => m.userId === String(userId))) {
    return 0;
  }
  
  const beforeCount = list.tasks.length;
  list.tasks = list.tasks.filter(t => !t.completed);
  const removed = beforeCount - list.tasks.length;
  
  if (removed > 0) saveCollabTodos();
  return removed;
}

// Build collab list display message
function buildCollabListMessage(list, page = 0) {
  const pageSize = 8;
  const tasks = list.tasks;
  const totalPages = Math.ceil(tasks.length / pageSize) || 1;
  const currentPage = Math.min(page, totalPages - 1);
  const startIndex = currentPage * pageSize;
  const pageTasks = tasks.slice(startIndex, startIndex + pageSize);
  
  const completedCount = tasks.filter(t => t.completed).length;
  const pendingCount = tasks.length - completedCount;
  
  let message = [
    `👥 <b>${escapeHTML(list.name)}</b>`,
    ``,
    `📊 ${pendingCount} pending • ${completedCount} done • ${list.members.length} members`,
    `🔑 Join code: <code>${list.joinCode}</code>`,
    ``,
  ];
  
  if (pageTasks.length === 0) {
    message.push(`<i>No tasks yet! Add one with the button below.</i>`);
  } else {
    pageTasks.forEach((task, i) => {
      const idx = startIndex + i + 1;
      const checkbox = task.completed ? "✅" : "⬜";
      const text = task.completed ? `<s>${escapeHTML(task.text)}</s>` : escapeHTML(task.text);
      const priorityIndicator = task.priority === "high" ? " 🔴" : task.priority === "medium" ? " 🟡" : "";
      
      let completedByText = "";
      if (task.completed && task.completedBy && list.settings.showCompletedBy) {
        const completer = task.completedBy.username || `User ${task.completedBy.userId.slice(-4)}`;
        completedByText = ` <i>by ${escapeHTML(completer)}</i>`;
      }
      
      message.push(`${checkbox} ${idx}. ${text}${priorityIndicator}${completedByText}`);
    });
  }
  
  if (totalPages > 1) {
    message.push(``);
    message.push(`<i>Page ${currentPage + 1}/${totalPages}</i>`);
  }
  
  message.push(``);
  message.push(`<i>Tap task to toggle • Tap again for options</i>`);
  
  return message.join("\n");
}

// Build collab list keyboard
function buildCollabListKeyboard(list, page = 0) {
  const pageSize = 8;
  const tasks = list.tasks;
  const totalPages = Math.ceil(tasks.length / pageSize) || 1;
  const currentPage = Math.min(page, totalPages - 1);
  const startIndex = currentPage * pageSize;
  const pageTasks = tasks.slice(startIndex, startIndex + pageSize);
  
  const kb = new InlineKeyboard();
  
  // Task toggle buttons (2 per row)
  for (let i = 0; i < pageTasks.length; i += 2) {
    const task1 = pageTasks[i];
    const icon1 = task1.completed ? "✅" : "⬜";
    kb.text(`${icon1} ${startIndex + i + 1}`, `ct_tap:${list.id}:${task1.id}`);
    
    if (pageTasks[i + 1]) {
      const task2 = pageTasks[i + 1];
      const icon2 = task2.completed ? "✅" : "⬜";
      kb.text(`${icon2} ${startIndex + i + 2}`, `ct_tap:${list.id}:${task2.id}`);
    }
    kb.row();
  }
  
  // Pagination
  if (totalPages > 1) {
    if (currentPage > 0) {
      kb.text("◀️", `ct_page:${list.id}:${currentPage - 1}`);
    }
    kb.text(`${currentPage + 1}/${totalPages}`, "ct_noop");
    if (currentPage < totalPages - 1) {
      kb.text("▶️", `ct_page:${list.id}:${currentPage + 1}`);
    }
    kb.row();
  }
  
  // Action buttons - simplified
  kb.text("➕ Add", `ct_add:${list.id}`)
    .text("👥 Members", `ct_members:${list.id}`)
    .text("🔗 Share", `ct_share:${list.id}`)
    .row()
    .text("🗑️ Clear Done", `ct_clear:${list.id}`)
    .text("← My Lists", "collab_list");
  
  return kb;
}

// /todo - Advanced todo/checklist command
bot.command("todo", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  if (!(await enforceCommandCooldown(ctx))) return;
  const u = ctx.from;
  if (!u?.id) return;
  
  ensureUser(u.id, u);
  const args = ctx.message.text.replace(/^\/todo\s*/i, "").trim();
  const parts = args.split(/\s+/);
  const subcommand = parts[0]?.toLowerCase();
  const rest = parts.slice(1).join(" ").trim();
  
  // No subcommand - show task list
  if (!subcommand) {
    const filters = getTodoFilters(u.id);
    await ctx.reply(buildTodoListMessage(u.id, 0, filters), {
      parse_mode: "Markdown",
      reply_markup: buildTodoKeyboard(u.id, 0, filters),
      reply_to_message_id: ctx.message?.message_id,
    });
    return;
  }
  
  // /todo add <task>
  if (subcommand === "add" || subcommand === "a") {
    if (!rest) {
      return ctx.reply(
        "📋 *Add Task*\n\n" +
        "Usage: `/todo add Buy groceries`\n\n" +
        "*Quick options:*\n" +
        "• `#work` - Set category\n" +
        "• `!high` - Set priority (high/med/low)\n" +
        "• `@today` - Set due date (today/tomorrow/nextweek)\n\n" +
        "Example: `/todo add Finish report #work !high @tomorrow`",
        { parse_mode: "Markdown", reply_to_message_id: ctx.message?.message_id }
      );
    }
    
    const parsed = parseTaskText(rest);
    if (!parsed.text) {
      return ctx.reply("❌ Task text cannot be empty!", { reply_to_message_id: ctx.message?.message_id });
    }
    
    const task = createTask(u.id, parsed);
    const userTodos = getUserTodos(u.id);
    
    let confirmMsg = `✅ *Task added!*\n\n${formatTaskDisplay(task, userTodos, false)}`;
    if (parsed.dueDate) confirmMsg += `\n📅 Due: ${parsed.dueDate}`;
    if (parsed.priority) confirmMsg += `\n${PRIORITY_EMOJI[parsed.priority]} Priority: ${PRIORITY_LABELS[parsed.priority]}`;
    
    await ctx.reply(confirmMsg, {
      parse_mode: "Markdown",
      reply_markup: new InlineKeyboard().text("📋 View Tasks", "todo_list"),
      reply_to_message_id: ctx.message?.message_id,
    });
    return;
  }
  
  // /todo done <number>
  if (subcommand === "done" || subcommand === "d" || subcommand === "check") {
    const num = parseInt(rest);
    if (!num || num < 1) {
      return ctx.reply("Usage: `/todo done 1` (task number)", { parse_mode: "Markdown", reply_to_message_id: ctx.message?.message_id });
    }
    
    const tasks = getFilteredTasks(u.id, getTodoFilters(u.id));
    if (num > tasks.length) {
      return ctx.reply(`❌ Task #${num} not found. You have ${tasks.length} tasks.`, { reply_to_message_id: ctx.message?.message_id });
    }
    
    const task = tasks[num - 1];
    toggleTaskCompletion(u.id, task.id);
    
    const status = task.completed ? "completed" : "marked incomplete";
    const emoji = task.completed ? "✅" : "⬜";
    
    await ctx.reply(`${emoji} Task #${num} ${status}!`, {
      reply_markup: new InlineKeyboard().text("📋 View Tasks", "todo_list"),
      reply_to_message_id: ctx.message?.message_id,
    });
    return;
  }
  
  // /todo delete <number>
  if (subcommand === "delete" || subcommand === "del" || subcommand === "rm") {
    const num = parseInt(rest);
    if (!num || num < 1) {
      return ctx.reply("Usage: `/todo delete 1` (task number)", { parse_mode: "Markdown", reply_to_message_id: ctx.message?.message_id });
    }
    
    const tasks = getFilteredTasks(u.id, getTodoFilters(u.id));
    if (num > tasks.length) {
      return ctx.reply(`❌ Task #${num} not found. You have ${tasks.length} tasks.`, { reply_to_message_id: ctx.message?.message_id });
    }
    
    const task = tasks[num - 1];
    deleteTaskById(u.id, task.id);
    
    await ctx.reply(`🗑️ Task #${num} deleted!`, {
      reply_markup: new InlineKeyboard().text("📋 View Tasks", "todo_list"),
      reply_to_message_id: ctx.message?.message_id,
    });
    return;
  }
  
  // /todo clear - Clear all completed tasks
  if (subcommand === "clear") {
    const userTodos = getUserTodos(u.id);
    const beforeCount = userTodos.tasks.length;
    userTodos.tasks = userTodos.tasks.filter(t => !t.completed);
    const removed = beforeCount - userTodos.tasks.length;
    saveTodos();
    
    await ctx.reply(`🗑️ Cleared ${removed} completed task${removed !== 1 ? 's' : ''}!`, {
      reply_markup: new InlineKeyboard().text("📋 View Tasks", "todo_list"),
      reply_to_message_id: ctx.message?.message_id,
    });
    return;
  }
  
  // /todo stats - Show statistics
  if (subcommand === "stats") {
    await ctx.reply(buildTodoStatsMessage(u.id), {
      parse_mode: "Markdown",
      reply_markup: new InlineKeyboard().text("📋 View Tasks", "todo_list"),
      reply_to_message_id: ctx.message?.message_id,
    });
    return;
  }
  
  // /todo help
  if (subcommand === "help") {
    const helpMsg = [
      "📋 *Todo Commands*",
      "",
      "`/todo` - View your task list",
      "`/todo add <task>` - Add a new task",
      "`/todo done <#>` - Toggle task completion",
      "`/todo delete <#>` - Delete a task",
      "`/todo clear` - Clear completed tasks",
      "`/todo stats` - View statistics",
      "",
      "*Quick Add Options:*",
      "• `#category` - work, personal, shopping, etc.",
      "• `!priority` - high, med, low",
      "• `@date` - today, tomorrow, nextweek, or YYYY-MM-DD",
      "",
      "*Example:*",
      "`/todo add Buy milk #shopping !low @tomorrow`",
    ].join("\n");
    
    await ctx.reply(helpMsg, {
      parse_mode: "Markdown",
      reply_to_message_id: ctx.message?.message_id,
    });
    return;
  }
  
  // Unknown subcommand - treat as quick add
  const parsed = parseTaskText(args);
  if (parsed.text) {
    const task = createTask(u.id, parsed);
    const userTodos = getUserTodos(u.id);
    
    await ctx.reply(`✅ *Task added!*\n\n${formatTaskDisplay(task, userTodos, false)}`, {
      parse_mode: "Markdown",
      reply_markup: new InlineKeyboard().text("📋 View Tasks", "todo_list"),
      reply_to_message_id: ctx.message?.message_id,
    });
  } else {
    await ctx.reply("Use `/todo help` to see available commands.", {
      parse_mode: "Markdown",
      reply_to_message_id: ctx.message?.message_id,
    });
  }
});

// /collab - Collaborative todo lists command
bot.command("collab", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  if (!(await enforceCommandCooldown(ctx))) return;
  const u = ctx.from;
  if (!u?.id) return;
  
  ensureUser(u.id, u);
  const args = ctx.message.text.replace(/^\/collab\s*/i, "").trim();
  const parts = args.split(/\s+/);
  const subcommand = parts[0]?.toLowerCase();
  const rest = parts.slice(1).join(" ").trim();
  
  // No subcommand - show collab lists
  if (!subcommand) {
    const userLists = getCollabListsForUser(u.id);
    
    if (userLists.length === 0) {
      await ctx.reply(
        "👥 *Starz Check - Collaborative*\n\n" +
        "_No shared lists yet!_\n\n" +
        "*Create a new list:*\n" +
        "`/collab new Party Planning`\n\n" +
        "*Or join with a code:*\n" +
        "`/collab join ABC123`",
        {
          parse_mode: "Markdown",
          reply_markup: new InlineKeyboard()
            .text("➕ Create List", "collab_create")
            .text("🔗 Join List", "collab_join")
            .row()
            .text("📋 Personal Tasks", "todo_list"),
          reply_to_message_id: ctx.message?.message_id
        }
      );
      return;
    }
    
    let message = [
      "👥 *Starz Check - Collaborative*",
      "",
      `You have ${userLists.length} shared list${userLists.length !== 1 ? 's' : ''}:`,
      "",
    ];
    
    const kb = new InlineKeyboard();
    
    userLists.slice(0, 8).forEach((list, i) => {
      const pendingCount = list.tasks.filter(t => !t.completed).length;
      const isOwner = list.ownerId === String(u.id);
      const ownerBadge = isOwner ? " 👑" : "";
      message.push(`${i + 1}. *${list.name}*${ownerBadge} (${pendingCount} pending)`);
      
      kb.text(`${i + 1}. ${list.name.slice(0, 15)}`, `collab_open:${list.id}`);
      if ((i + 1) % 2 === 0) kb.row();
    });
    
    if (userLists.length % 2 !== 0) kb.row();
    
    kb.text("➕ Create", "collab_create")
      .text("🔗 Join", "collab_join")
      .row()
      .text("📋 Personal Tasks", "todo_list");
    
    await ctx.reply(message.join("\n"), {
      parse_mode: "Markdown",
      reply_markup: kb,
      reply_to_message_id: ctx.message?.message_id
    });
    return;
  }
  
  // /collab new <name>
  if (subcommand === "new" || subcommand === "create") {
    if (!rest) {
      return ctx.reply(
        "➕ *Create Collaborative List*\n\n" +
        "Usage: `/collab new Party Planning`",
        { parse_mode: "Markdown", reply_to_message_id: ctx.message?.message_id }
      );
    }
    
    const listName = rest.slice(0, 50);
    const newList = createCollabList(u.id, listName);
    
    await ctx.reply(
      `✅ *List Created!*\n\n👥 *${listName}*\n\n🔑 Share this code with others:\n\`${newList.joinCode}\`\n\nThey can join with:\n\`/collab join ${newList.joinCode}\``,
      {
        parse_mode: "Markdown",
        reply_markup: new InlineKeyboard()
          .text("📋 View List", `collab_open:${newList.id}`)
          .text("👥 All Lists", "collab_list"),
        reply_to_message_id: ctx.message?.message_id
      }
    );
    return;
  }
  
  // /collab join <code>
  if (subcommand === "join") {
    if (!rest) {
      return ctx.reply(
        "🔗 *Join Collaborative List*\n\n" +
        "Usage: `/collab join ABC123`",
        { parse_mode: "Markdown", reply_to_message_id: ctx.message?.message_id }
      );
    }
    
    const joinCode = rest.toUpperCase();
    const result = joinCollabList(u.id, joinCode, ctx.from?.username);
    
    if (result.success) {
      const list = result.list;
      await ctx.reply(
        `✅ *Joined Successfully!*\n\n👥 *${list.name}*\n\n👤 ${list.members.length} members\n📋 ${list.tasks.length} tasks`,
        {
          parse_mode: "Markdown",
          reply_markup: new InlineKeyboard()
            .text("📋 View List", `collab_open:${list.id}`)
            .text("👥 All Lists", "collab_list"),
          reply_to_message_id: ctx.message?.message_id
        }
      );
    } else {
      await ctx.reply(
        `⚠️ *${result.error || "Could not join list"}*\n\nCheck the code and try again.`,
        {
          parse_mode: "Markdown",
          reply_to_message_id: ctx.message?.message_id
        }
      );
    }
    return;
  }
  
  // /collab help
  if (subcommand === "help") {
    const helpMsg = [
      "👥 *Collaborative Lists Commands*",
      "",
      "`/collab` - View your shared lists",
      "`/collab new <name>` - Create a new list",
      "`/collab join <code>` - Join with a code",
      "",
      "*Inside a list:*",
      "• Tap task numbers to toggle",
      "• Tap again for options",
      "• Share the code with friends",
      "• Everyone can add & check tasks",
    ].join("\n");
    
    await ctx.reply(helpMsg, {
      parse_mode: "Markdown",
      reply_to_message_id: ctx.message?.message_id
    });
    return;
  }
  
  // Unknown - show help
  await ctx.reply("Use `/collab help` to see available commands.", {
    parse_mode: "Markdown",
    reply_to_message_id: ctx.message?.message_id
  });
});

// Todo callback handlers
bot.callbackQuery("todo_list", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  await ctx.answerCallbackQuery();
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const filters = getTodoFilters(userId);
  
  try {
    await ctx.editMessageText(buildTodoListMessage(userId, 0, filters), {
      parse_mode: "Markdown",
      reply_markup: buildTodoKeyboard(userId, 0, filters)
    });
  } catch (e) {
    // Message unchanged, ignore
  }
});

// Track last tap for double-tap detection in DM
const dmTodoLastTap = new Map();

bot.callbackQuery(/^todo_toggle:(.+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const taskId = ctx.match[1];
  const now = Date.now();
  const lastTap = dmTodoLastTap.get(userId);
  
  // Check for double-tap (same task within 3 seconds)
  if (lastTap && lastTap.taskId === taskId && (now - lastTap.timestamp) < 3000) {
    // Double-tap detected - show action menu
    dmTodoLastTap.delete(userId);
    await ctx.answerCallbackQuery({ text: "⚙️ Opening options..." });
    
    const task = getTaskById(userId, taskId);
    if (!task) {
      return ctx.answerCallbackQuery({ text: "Task not found", show_alert: true });
    }
    
    const checkbox = task.completed ? "✅" : "⬜";
    const categoryEmoji = getCategoryEmoji(task.category);
    const priorityText = task.priority === "high" ? "🔴 High" : task.priority === "medium" ? "🟡 Medium" : "🟢 Low";
    const dueText = task.dueDate ? `\n📅 Due: ${task.dueDate}` : "";
    
    const menuText = [
      `⚙️ *Task Options*`,
      ``,
      `${checkbox} ${task.text}`,
      ``,
      `${categoryEmoji} ${task.category || "personal"} \u2022 ${priorityText}${dueText}`,
      ``,
      `_Choose an action:_`,
    ].join("\n");
    
    const keyboard = new InlineKeyboard()
      .text(task.completed ? "⬜ Uncomplete" : "✅ Complete", `todo_toggle:${taskId}`)
      .text("🗑️ Delete", `todo_delete_task:${taskId}`)
      .row()
      .text("✏️ Edit Text", `todo_edit_task:${taskId}`)
      .row()
      .text("🔴 High", `todo_priority:${taskId}:high`)
      .text("🟡 Med", `todo_priority:${taskId}:medium`)
      .text("🟢 Low", `todo_priority:${taskId}:low`)
      .row()
      .text("📅 Today", `todo_due:${taskId}:today`)
      .text("📅 Tomorrow", `todo_due:${taskId}:tomorrow`)
      .row()
      .text("← Back to List", "todo_list");
    
    try {
      await ctx.editMessageText(menuText, {
        parse_mode: "Markdown",
        reply_markup: keyboard,
      });
    } catch (e) {}
    return;
  }
  
  // First tap - toggle the task
  dmTodoLastTap.set(userId, { taskId, timestamp: now });
  
  // Auto-clear after 3 seconds
  setTimeout(() => {
    const current = dmTodoLastTap.get(userId);
    if (current && current.taskId === taskId && current.timestamp === now) {
      dmTodoLastTap.delete(userId);
    }
  }, 3000);
  
  const task = toggleTaskCompletion(userId, taskId);
  
  if (task) {
    const status = task.completed ? "✅ Done! Tap again for options" : "⬜ Unchecked! Tap again for options";
    await ctx.answerCallbackQuery({ text: status });
  } else {
    await ctx.answerCallbackQuery({ text: "Task not found", show_alert: true });
    return;
  }
  
  const filters = getTodoFilters(userId);
  
  try {
    await ctx.editMessageText(buildTodoListMessage(userId, 0, filters), {
      parse_mode: "Markdown",
      reply_markup: buildTodoKeyboard(userId, 0, filters)
    });
  } catch (e) {}
});

bot.callbackQuery(/^todo_page:(\d+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  await ctx.answerCallbackQuery();
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const page = parseInt(ctx.match[1]);
  const filters = getTodoFilters(userId);
  
  try {
    await ctx.editMessageText(buildTodoListMessage(userId, page, filters), {
      parse_mode: "Markdown",
      reply_markup: buildTodoKeyboard(userId, page, filters)
    });
  } catch (e) {}
});

bot.callbackQuery("todo_add", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  await ctx.answerCallbackQuery();
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  pendingTodoInput.set(String(userId), { action: "add", timestamp: Date.now() });
  
  try {
    await ctx.editMessageText(
      "📋 *Add New Task*\n\n" +
      "Type your task below:\n\n" +
      "*Quick options:*\n" +
      "• `#work` - Set category\n" +
      "• `!high` - Set priority\n" +
      "• `@today` - Set due date\n\n" +
      "_Example: Buy groceries #shopping !low @tomorrow_",
      {
        parse_mode: "Markdown",
        reply_markup: new InlineKeyboard().text("❌ Cancel", "todo_list")
      }
    );
  } catch (e) {}
});

bot.callbackQuery("todo_clear_done", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const userTodos = getUserTodos(userId);
  const beforeCount = userTodos.tasks.length;
  userTodos.tasks = userTodos.tasks.filter(t => !t.completed);
  const removed = beforeCount - userTodos.tasks.length;
  saveTodos();
  
  await ctx.answerCallbackQuery({ text: `🗑️ Cleared ${removed} completed task${removed !== 1 ? 's' : ''}!` });
  
  const filters = getTodoFilters(userId);
  
  try {
    await ctx.editMessageText(buildTodoListMessage(userId, 0, filters), {
      parse_mode: "Markdown",
      reply_markup: buildTodoKeyboard(userId, 0, filters)
    });
  } catch (e) {}
});

bot.callbackQuery("todo_filter", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  await ctx.answerCallbackQuery();
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  try {
    await ctx.editMessageText(
      "🔍 *Filter Tasks*\n\n" +
      "Select a filter to apply:",
      {
        parse_mode: "Markdown",
        reply_markup: buildTodoFilterKeyboard(userId)
      }
    );
  } catch (e) {}
});

bot.callbackQuery(/^todo_filter_due:(.+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const dueFilter = ctx.match[1];
  const filters = { ...getTodoFilters(userId), dueFilter };
  setTodoFilters(userId, filters);
  
  await ctx.answerCallbackQuery({ text: `Filter: ${dueFilter}` });
  
  try {
    await ctx.editMessageText(buildTodoListMessage(userId, 0, filters), {
      parse_mode: "Markdown",
      reply_markup: buildTodoKeyboard(userId, 0, filters)
    });
  } catch (e) {}
});

bot.callbackQuery(/^todo_filter_priority:(.+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const priority = ctx.match[1];
  const filters = { ...getTodoFilters(userId), priority };
  setTodoFilters(userId, filters);
  
  await ctx.answerCallbackQuery({ text: `Filter: ${priority} priority` });
  
  try {
    await ctx.editMessageText(buildTodoListMessage(userId, 0, filters), {
      parse_mode: "Markdown",
      reply_markup: buildTodoKeyboard(userId, 0, filters)
    });
  } catch (e) {}
});

bot.callbackQuery(/^todo_filter_category:(.+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const category = ctx.match[1];
  const filters = { ...getTodoFilters(userId), category };
  setTodoFilters(userId, filters);
  
  await ctx.answerCallbackQuery({ text: `Filter: ${category}` });
  
  try {
    await ctx.editMessageText(buildTodoListMessage(userId, 0, filters), {
      parse_mode: "Markdown",
      reply_markup: buildTodoKeyboard(userId, 0, filters)
    });
  } catch (e) {}
});

bot.callbackQuery("todo_toggle_completed", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const userTodos = getUserTodos(userId);
  userTodos.settings.showCompleted = !userTodos.settings.showCompleted;
  saveTodos();
  
  const status = userTodos.settings.showCompleted ? "Showing" : "Hiding";
  await ctx.answerCallbackQuery({ text: `${status} completed tasks` });
  
  const filters = getTodoFilters(userId);
  
  try {
    await ctx.editMessageText(buildTodoListMessage(userId, 0, filters), {
      parse_mode: "Markdown",
      reply_markup: buildTodoKeyboard(userId, 0, filters)
    });
  } catch (e) {}
});

bot.callbackQuery("todo_clear_filters", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  clearTodoFilters(userId);
  
  await ctx.answerCallbackQuery({ text: "Filters cleared" });
  
  try {
    await ctx.editMessageText(buildTodoListMessage(userId, 0, {}), {
      parse_mode: "Markdown",
      reply_markup: buildTodoKeyboard(userId, 0, {})
    });
  } catch (e) {}
});

bot.callbackQuery("todo_settings", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  await ctx.answerCallbackQuery();
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const userTodos = getUserTodos(userId);
  const sortLabels = { created: 'Created', priority: 'Priority', dueDate: 'Due Date', category: 'Category' };
  
  try {
    await ctx.editMessageText(
      "⚙️ *Task Settings*\n\n" +
      `📊 *Sort by:* ${sortLabels[userTodos.settings.sortBy]}\n` +
      `${PRIORITY_EMOJI[userTodos.settings.defaultPriority]} *Default Priority:* ${PRIORITY_LABELS[userTodos.settings.defaultPriority]}\n` +
      `👁️ *Show Completed:* ${userTodos.settings.showCompleted ? 'Yes' : 'No'}`,
      {
        parse_mode: "Markdown",
        reply_markup: buildTodoSettingsKeyboard(userId)
      }
    );
  } catch (e) {}
});

bot.callbackQuery(/^todo_sort:(.+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const sortBy = ctx.match[1];
  const userTodos = getUserTodos(userId);
  userTodos.settings.sortBy = sortBy;
  saveTodos();
  
  const sortLabels = { created: 'Created', priority: 'Priority', dueDate: 'Due Date', category: 'Category' };
  await ctx.answerCallbackQuery({ text: `Sort by: ${sortLabels[sortBy]}` });
  
  try {
    await ctx.editMessageText(
      "⚙️ *Task Settings*\n\n" +
      `📊 *Sort by:* ${sortLabels[userTodos.settings.sortBy]}\n` +
      `${PRIORITY_EMOJI[userTodos.settings.defaultPriority]} *Default Priority:* ${PRIORITY_LABELS[userTodos.settings.defaultPriority]}\n` +
      `👁️ *Show Completed:* ${userTodos.settings.showCompleted ? 'Yes' : 'No'}`,
      {
        parse_mode: "Markdown",
        reply_markup: buildTodoSettingsKeyboard(userId)
      }
    );
  } catch (e) {}
});

bot.callbackQuery(/^todo_default_priority:(.+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const priority = ctx.match[1];
  const userTodos = getUserTodos(userId);
  userTodos.settings.defaultPriority = priority;
  saveTodos();
  
  await ctx.answerCallbackQuery({ text: `Default priority: ${PRIORITY_LABELS[priority]}` });
  
  const sortLabels = { created: 'Created', priority: 'Priority', dueDate: 'Due Date', category: 'Category' };
  
  try {
    await ctx.editMessageText(
      "⚙️ *Task Settings*\n\n" +
      `📊 *Sort by:* ${sortLabels[userTodos.settings.sortBy]}\n` +
      `${PRIORITY_EMOJI[userTodos.settings.defaultPriority]} *Default Priority:* ${PRIORITY_LABELS[userTodos.settings.defaultPriority]}\n` +
      `👁️ *Show Completed:* ${userTodos.settings.showCompleted ? 'Yes' : 'No'}`,
      {
        parse_mode: "Markdown",
        reply_markup: buildTodoSettingsKeyboard(userId)
      }
    );
  } catch (e) {}
});

bot.callbackQuery("todo_stats", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  await ctx.answerCallbackQuery();
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  try {
    await ctx.editMessageText(buildTodoStatsMessage(userId), {
      parse_mode: "Markdown",
      reply_markup: new InlineKeyboard().text("« Back to Tasks", "todo_list")
    });
  } catch (e) {}
});

bot.callbackQuery("todo_noop", async (ctx) => {
  await ctx.answerCallbackQuery();
});

// DM todo delete task handler
bot.callbackQuery(/^todo_delete_task:(.+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const taskId = ctx.match[1];
  const deleted = deleteTaskById(userId, taskId);
  
  if (deleted) {
    await ctx.answerCallbackQuery({ text: "🗑️ Task deleted!" });
  } else {
    await ctx.answerCallbackQuery({ text: "Task not found", show_alert: true });
    return;
  }
  
  const filters = getTodoFilters(userId);
  
  try {
    await ctx.editMessageText(buildTodoListMessage(userId, 0, filters), {
      parse_mode: "Markdown",
      reply_markup: buildTodoKeyboard(userId, 0, filters)
    });
  } catch (e) {}
});

// DM todo edit task handler
bot.callbackQuery(/^todo_edit_task:(.+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const taskId = ctx.match[1];
  const task = getTaskById(userId, taskId);
  
  if (!task) {
    await ctx.answerCallbackQuery({ text: "Task not found", show_alert: true });
    return;
  }
  
  await ctx.answerCallbackQuery();
  
  // Store pending edit
  pendingTodoInput.set(String(userId), { action: "edit", taskId, timestamp: Date.now() });
  
  try {
    await ctx.editMessageText(
      `✏️ *Edit Task*\n\n` +
      `Current: ${task.text}\n\n` +
      `_Reply with the new text for this task:_`,
      {
        parse_mode: "Markdown",
        reply_markup: new InlineKeyboard().text("← Cancel", "todo_list")
      }
    );
  } catch (e) {}
});

// DM todo priority handler
bot.callbackQuery(/^todo_priority:(.+):(.+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const taskId = ctx.match[1];
  const priority = ctx.match[2];
  
  const task = updateTask(userId, taskId, { priority });
  
  if (task) {
    const emoji = priority === "high" ? "🔴" : priority === "medium" ? "🟡" : "🟢";
    await ctx.answerCallbackQuery({ text: `${emoji} Priority set to ${priority}` });
  } else {
    await ctx.answerCallbackQuery({ text: "Task not found", show_alert: true });
    return;
  }
  
  const filters = getTodoFilters(userId);
  
  try {
    await ctx.editMessageText(buildTodoListMessage(userId, 0, filters), {
      parse_mode: "Markdown",
      reply_markup: buildTodoKeyboard(userId, 0, filters)
    });
  } catch (e) {}
});

// DM todo due date handler
bot.callbackQuery(/^todo_due:(.+):(.+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const taskId = ctx.match[1];
  const dueOption = ctx.match[2];
  
  let dueDate;
  const today = new Date();
  
  if (dueOption === "today") {
    dueDate = today.toISOString().slice(0, 10);
  } else if (dueOption === "tomorrow") {
    today.setDate(today.getDate() + 1);
    dueDate = today.toISOString().slice(0, 10);
  }
  
  const task = updateTask(userId, taskId, { dueDate });
  
  if (task) {
    await ctx.answerCallbackQuery({ text: `📅 Due date set to ${dueOption}` });
  } else {
    await ctx.answerCallbackQuery({ text: "Task not found", show_alert: true });
    return;
  }
  
  const filters = getTodoFilters(userId);
  
  try {
    await ctx.editMessageText(buildTodoListMessage(userId, 0, filters), {
      parse_mode: "Markdown",
      reply_markup: buildTodoKeyboard(userId, 0, filters)
    });
  } catch (e) {}
});

// Collab list callback from personal todo
bot.callbackQuery("collab_list", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  await ctx.answerCallbackQuery();
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const userLists = getCollabListsForUser(userId);
  
  if (userLists.length === 0) {
    try {
      await ctx.editMessageText(
        "👥 *Starz Check - Collaborative*\n\n" +
        "_No shared lists yet!_\n\n" +
        "*Create a new list:*\n" +
        "`/collab new Party Planning`\n\n" +
        "*Or join with a code:*\n" +
        "`/collab join ABC123`",
        {
          parse_mode: "Markdown",
          reply_markup: new InlineKeyboard()
            .text("➕ Create List", "collab_create")
            .text("🔗 Join List", "collab_join")
            .row()
            .text("« Back to Personal", "todo_list")
        }
      );
    } catch (e) {}
    return;
  }
  
  // Show list of collaborative lists
  let message = [
    "👥 *Starz Check - Collaborative*",
    "",
    `You have ${userLists.length} shared list${userLists.length !== 1 ? 's' : ''}:`,
    "",
  ];
  
  const kb = new InlineKeyboard();
  
  userLists.slice(0, 8).forEach((list, i) => {
    const pendingCount = list.tasks.filter(t => !t.completed).length;
    const isOwner = list.ownerId === String(userId);
    const ownerBadge = isOwner ? " 👑" : "";
    message.push(`${i + 1}. *${list.name}*${ownerBadge} (${pendingCount} pending)`);
    
    kb.text(`${i + 1}. ${list.name.slice(0, 15)}`, `collab_open:${list.id}`);
    if ((i + 1) % 2 === 0) kb.row();
  });
  
  if (userLists.length % 2 !== 0) kb.row();
  
  kb.text("➕ Create", "collab_create")
    .text("🔗 Join", "collab_join")
    .row()
    .text("« Back to Personal", "todo_list");
  
  try {
    await ctx.editMessageText(message.join("\n"), {
      parse_mode: "Markdown",
      reply_markup: kb
    });
  } catch (e) {}
});

bot.callbackQuery(/^collab_open:(.+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  await ctx.answerCallbackQuery();
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const listId = ctx.match[1];
  const list = getCollabList(listId);
  
  if (!list) {
    try {
      await ctx.editMessageText("⚠️ List not found.", {
        reply_markup: new InlineKeyboard().text("« Back", "collab_list")
      });
    } catch (e) {}
    return;
  }
  
  const listText = buildCollabListMessage(list, 0);
  const keyboard = buildCollabListKeyboard(list, 0);
  
  // Replace the inline switch button with a DM-friendly back button
  // We need to rebuild the keyboard for DM context
  const dmKeyboard = new InlineKeyboard();
  
  const pageSize = 8;
  const pageTasks = list.tasks.slice(0, pageSize);
  
  for (let i = 0; i < pageTasks.length; i += 2) {
    const task1 = pageTasks[i];
    const icon1 = task1.completed ? "✅" : "⬜";
    dmKeyboard.text(`${icon1} ${i + 1}`, `ct_tap:${list.id}:${task1.id}`);
    
    if (pageTasks[i + 1]) {
      const task2 = pageTasks[i + 1];
      const icon2 = task2.completed ? "✅" : "⬜";
      dmKeyboard.text(`${icon2} ${i + 2}`, `ct_tap:${list.id}:${task2.id}`);
    }
    dmKeyboard.row();
  }
  
  dmKeyboard
    .text("➕ Add", `ct_add:${list.id}`)
    .text("🗑️ Clear", `ct_clear:${list.id}`)
    .row()
    .text("👥 Members", `ct_members:${list.id}`)
    .text("🔗 Share", `ct_share:${list.id}`)
    .row()
    .text("« My Lists", "collab_list");
  
  try {
    await ctx.editMessageText(listText, {
      parse_mode: "HTML",
      reply_markup: dmKeyboard
    });
  } catch (e) {}
});

bot.callbackQuery("collab_create", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  await ctx.answerCallbackQuery();
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  pendingTodoInput.set(String(userId), { action: "collab_create", timestamp: Date.now() });
  
  try {
    await ctx.editMessageText(
      "➕ *Create Collaborative List*\n\n" +
      "Type a name for your shared list:\n\n" +
      "_Example: Party Planning_",
      {
        parse_mode: "Markdown",
        reply_markup: new InlineKeyboard().text("❌ Cancel", "collab_list")
      }
    );
  } catch (e) {}
});

bot.callbackQuery("collab_join", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  await ctx.answerCallbackQuery();
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  pendingTodoInput.set(String(userId), { action: "collab_join", timestamp: Date.now() });
  
  try {
    await ctx.editMessageText(
      "🔗 *Join Collaborative List*\n\n" +
      "Enter the join code:\n\n" +
      "_Example: ABC123_",
      {
        parse_mode: "Markdown",
        reply_markup: new InlineKeyboard().text("❌ Cancel", "collab_list")
      }
    );
  } catch (e) {}
});

// =====================
// INLINE TODO CALLBACK HANDLERS
// Double-tap pattern: first tap toggles, second tap within 3s opens action menu
// =====================

// Track last tap for double-tap detection
const inlineTodoLastTap = new Map(); // oduserId -> { taskId, timestamp }

bot.callbackQuery(/^itodo_tap:(.+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const taskId = ctx.match[1];
  const now = Date.now();
  const lastTap = inlineTodoLastTap.get(userId);
  
  // Check for double-tap (same task within 3 seconds)
  if (lastTap && lastTap.taskId === taskId && (now - lastTap.timestamp) < 3000) {
    // Double-tap detected - show action menu
    inlineTodoLastTap.delete(userId);
    await ctx.answerCallbackQuery({ text: "⚙️ Opening options..." });
    
    const task = getTaskById(userId, taskId);
    if (!task) {
      return ctx.answerCallbackQuery({ text: "Task not found", show_alert: true });
    }
    
    const checkbox = task.completed ? "✅" : "⬜";
    const categoryEmoji = getCategoryEmoji(task.category);
    const priorityText = task.priority === "high" ? "🔴 High" : task.priority === "medium" ? "🟡 Medium" : "🟢 Low";
    const dueText = task.dueDate ? `\n📅 Due: ${task.dueDate}` : "";
    
    const menuText = [
      `⚙️ <b>Task Options</b>`,
      ``,
      `${checkbox} ${escapeHTML(task.text)}`,
      ``,
      `${categoryEmoji} ${escapeHTML(task.category || "personal")} • ${priorityText}${dueText}`,
      ``,
      `<i>Choose an action:</i>`,
    ].join("\n");
    
    const keyboard = new InlineKeyboard()
      .text(task.completed ? "⬜ Uncomplete" : "✅ Complete", `itodo_toggle:${taskId}`)
      .text("🗑️ Delete", `itodo_delete:${taskId}`)
      .row()
      .text("✏️ Edit Text", `itodo_edit:${taskId}`)
      .row()
      .text("🔴 High", `itodo_priority:${taskId}:high`)
      .text("🟡 Med", `itodo_priority:${taskId}:medium`)
      .text("🟢 Low", `itodo_priority:${taskId}:low`)
      .row()
      .text("📅 Today", `itodo_due:${taskId}:today`)
      .text("📅 Tomorrow", `itodo_due:${taskId}:tomorrow`)
      .row()
      .text("← Back to List", "itodo_back");
    
    try {
      await ctx.editMessageText(menuText, {
        parse_mode: "HTML",
        reply_markup: keyboard,
      });
    } catch (e) {}
    return;
  }
  
  // First tap - toggle the task
  inlineTodoLastTap.set(userId, { taskId, timestamp: now });
  
  // Auto-clear after 3 seconds
  setTimeout(() => {
    const current = inlineTodoLastTap.get(userId);
    if (current && current.taskId === taskId && current.timestamp === now) {
      inlineTodoLastTap.delete(userId);
    }
  }, 3000);
  
  const task = toggleTaskCompletion(userId, taskId);
  
  if (task) {
    const status = task.completed ? "✅ Done! Tap again for options" : "⬜ Unchecked! Tap again for options";
    await ctx.answerCallbackQuery({ text: status });
  } else {
    await ctx.answerCallbackQuery({ text: "Task not found", show_alert: true });
    return;
  }
  
  // Refresh the task list
  const userTodos = getUserTodos(userId);
  const filters = getTodoFilters(userId);
  const tasks = userTodos.tasks || [];
  const taskCount = tasks.length;
  const doneCount = tasks.filter(t => t.completed).length;
  const pendingCount = taskCount - doneCount;
  
  const filteredTodos = filterTodos(tasks, filters);
  const sortedTodos = sortTodos(filteredTodos, filters.sortBy || "created");
  const displayTodos = sortedTodos.slice(0, 8);
  
// Compact title only - tasks are buttons
  const streak = getCompletionStreak(userId);
  let taskListText = `✅ <b>Starz Check</b>`;
  if (streak > 0) taskListText += ` 🔥${streak}`;
  
  const keyboard = new InlineKeyboard();
  
  // Each task is its own button row - like tic-tac-toe!
  displayTodos.forEach((task) => {
    if (!task || !task.text) return; // Skip invalid tasks
    const icon = task.completed ? "✅" : "⬜";
    const text = task.text.slice(0, 28) + (task.text.length > 28 ? "..." : "");
    const catEmoji = getCategoryEmoji(task.category);
    const priInd = task.priority === "high" ? "🔴" : task.priority === "medium" ? "🟡" : "";
    const dueInd = task.dueDate && isOverdue(task.dueDate) && !task.completed ? "⚠️" : "";
    keyboard.text(`${icon} ${text} ${catEmoji}${priInd}${dueInd}`, `itodo_tap:${task.id}`);
    keyboard.row();
  });
  
  keyboard
    .switchInlineCurrent("➕", "t:add ")
    .text("🔍", "itodo_filter")
    .text("👥", "itodo_collab")
    .row()
    .text("← Back", "inline_main_menu");
  
  try {
    await ctx.editMessageText(taskListText, {
      parse_mode: "HTML",
      reply_markup: keyboard,
    });
  } catch (e) {}
});

bot.callbackQuery(/^itodo_toggle:(.+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const taskId = ctx.match[1];
  const task = toggleTaskCompletion(userId, taskId);
  
  if (task) {
    await ctx.answerCallbackQuery({ text: task.completed ? "✅ Completed!" : "⬜ Unchecked!" });
  } else {
    await ctx.answerCallbackQuery({ text: "Task not found", show_alert: true });
    return;
  }
  
  // Go back to list
  const userTodos = getUserTodos(userId);
  const filters = getTodoFilters(userId);
  const tasks = userTodos.tasks || [];
  const taskCount = tasks.length;
  const doneCount = tasks.filter(t => t.completed).length;
  const pendingCount = taskCount - doneCount;
  
  const filteredTodos = filterTodos(tasks, filters);
  const sortedTodos = sortTodos(filteredTodos, filters.sortBy || "created");
  const displayTodos = sortedTodos.slice(0, 8);
  
  // Compact title only - tasks are buttons
  const streak = getCompletionStreak(userId);
  let taskListText = `✅ <b>Starz Check</b>`;
  if (streak > 0) taskListText += ` 🔥${streak}`;
  
  const keyboard = new InlineKeyboard();
  
  // Each task is its own button row - like tic-tac-toe!
  displayTodos.forEach((task) => {
    if (!task || !task.text) return; // Skip invalid tasks
    const icon = task.completed ? "✅" : "⬜";
    const text = task.text.slice(0, 28) + (task.text.length > 28 ? "..." : "");
    const catEmoji = getCategoryEmoji(task.category);
    const priInd = task.priority === "high" ? "🔴" : task.priority === "medium" ? "🟡" : "";
    const dueInd = task.dueDate && isOverdue(task.dueDate) && !task.completed ? "⚠️" : "";
    keyboard.text(`${icon} ${text} ${catEmoji}${priInd}${dueInd}`, `itodo_tap:${task.id}`);
    keyboard.row();
  });
  
  keyboard
    .switchInlineCurrent("➕", "t:add ")
    .text("🔍", "itodo_filter")
    .text("👥", "itodo_collab")
    .row()
    .text("← Back", "inline_main_menu");
  
  try {
    await ctx.editMessageText(taskListText, {
      parse_mode: "HTML",
      reply_markup: keyboard,
    });
  } catch (e) {}
});

bot.callbackQuery(/^itodo_delete:(.+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const taskId = ctx.match[1];
  const deleted = deleteTaskById(userId, taskId);
  
  if (deleted) {
    await ctx.answerCallbackQuery({ text: "🗑️ Task deleted!" });
  } else {
    await ctx.answerCallbackQuery({ text: "Task not found", show_alert: true });
    return;
  }
  
  // Go back to list
  const userTodos = getUserTodos(userId);
  const filters = getTodoFilters(userId);
  const tasks = userTodos.tasks || [];
  const taskCount = tasks.length;
  const doneCount = tasks.filter(t => t.completed).length;
  const pendingCount = taskCount - doneCount;
  
  if (taskCount === 0) {
    try {
      await ctx.editMessageText("📋 <b>My Tasks</b>\n\n<i>No tasks yet!</i>\n\n<i>via StarzAI • Tasks</i>", {
        parse_mode: "HTML",
        reply_markup: new InlineKeyboard()
          .text("➕ Add Task", "itodo_add")
          .row()
          .switchInlineCurrent("← Back", ""),
      });
    } catch (e) {}
    return;
  }
  
  const filteredTodos = filterTodos(tasks, filters);
  const sortedTodos = sortTodos(filteredTodos, filters.sortBy || "created");
  const displayTodos = sortedTodos.slice(0, 8);
  
  // Compact title only - tasks are buttons
  const streak = getCompletionStreak(userId);
  let taskListText = `✅ <b>Starz Check</b>`;
  if (streak > 0) taskListText += ` 🔥${streak}`;
  
  const keyboard = new InlineKeyboard();
  
  // Each task is its own button row - like tic-tac-toe!
  displayTodos.forEach((task) => {
    if (!task || !task.text) return; // Skip invalid tasks
    const icon = task.completed ? "✅" : "⬜";
    const text = task.text.slice(0, 28) + (task.text.length > 28 ? "..." : "");
    const catEmoji = getCategoryEmoji(task.category);
    const priInd = task.priority === "high" ? "🔴" : task.priority === "medium" ? "🟡" : "";
    const dueInd = task.dueDate && isOverdue(task.dueDate) && !task.completed ? "⚠️" : "";
    keyboard.text(`${icon} ${text} ${catEmoji}${priInd}${dueInd}`, `itodo_tap:${task.id}`);
    keyboard.row();
  });
  
  keyboard
    .switchInlineCurrent("➕", "t:add ")
    .text("🔍", "itodo_filter")
    .text("👥", "itodo_collab")
    .row()
    .text("← Back", "inline_main_menu");
  
  try {
    await ctx.editMessageText(taskListText, {
      parse_mode: "HTML",
      reply_markup: keyboard,
    });
  } catch (e) {}
});

bot.callbackQuery(/^itodo_priority:(.+):(.+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const taskId = ctx.match[1];
  const priority = ctx.match[2];
  
  const task = updateTask(userId, taskId, { priority });
  
  if (task) {
    const emoji = priority === "high" ? "🔴" : priority === "medium" ? "🟡" : "🟢";
    await ctx.answerCallbackQuery({ text: `${emoji} Priority set to ${priority}!` });
  } else {
    await ctx.answerCallbackQuery({ text: "Task not found", show_alert: true });
    return;
  }
  
  // Refresh the action menu
  const updatedTask = getTaskById(userId, taskId);
  if (!updatedTask) return;
  
  const checkbox = updatedTask.completed ? "✅" : "⬜";
  const categoryEmoji = getCategoryEmoji(updatedTask.category);
  const priorityText = updatedTask.priority === "high" ? "🔴 High" : updatedTask.priority === "medium" ? "🟡 Medium" : "🟢 Low";
  const dueText = updatedTask.dueDate ? `\n📅 Due: ${updatedTask.dueDate}` : "";
  
  const menuText = [
    `⚙️ <b>Task Options</b>`,
    ``,
    `${checkbox} ${escapeHTML(updatedTask.text)}`,
    ``,
    `${categoryEmoji} ${escapeHTML(updatedTask.category || "personal")} • ${priorityText}${dueText}`,
    ``,
    `<i>Choose an action:</i>`,
  ].join("\n");
  
  const keyboard = new InlineKeyboard()
    .text(updatedTask.completed ? "⬜ Uncomplete" : "✅ Complete", `itodo_toggle:${taskId}`)
    .text("🗑️ Delete", `itodo_delete:${taskId}`)
    .row()
    .text("✏️ Edit Text", `itodo_edit:${taskId}`)
    .row()
    .text("🔴 High", `itodo_priority:${taskId}:high`)
    .text("🟡 Med", `itodo_priority:${taskId}:medium`)
    .text("🟢 Low", `itodo_priority:${taskId}:low`)
    .row()
    .text("📅 Today", `itodo_due:${taskId}:today`)
    .text("📅 Tomorrow", `itodo_due:${taskId}:tomorrow`)
    .row()
    .text("← Back to List", "itodo_back");
  
  try {
    await ctx.editMessageText(menuText, {
      parse_mode: "HTML",
      reply_markup: keyboard,
    });
  } catch (e) {}
});

bot.callbackQuery(/^itodo_due:(.+):(.+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const taskId = ctx.match[1];
  const dueOption = ctx.match[2];
  
  let dueDate;
  const today = new Date();
  if (dueOption === "today") {
    dueDate = today.toISOString().split("T")[0];
  } else if (dueOption === "tomorrow") {
    today.setDate(today.getDate() + 1);
    dueDate = today.toISOString().split("T")[0];
  } else {
    dueDate = dueOption;
  }
  
  const task = updateTask(userId, taskId, { dueDate });
  
  if (task) {
    await ctx.answerCallbackQuery({ text: `📅 Due date set to ${dueDate}!` });
  } else {
    await ctx.answerCallbackQuery({ text: "Task not found", show_alert: true });
    return;
  }
  
  // Refresh the action menu
  const updatedTask = getTaskById(userId, taskId);
  if (!updatedTask) return;
  
  const checkbox = updatedTask.completed ? "✅" : "⬜";
  const categoryEmoji = getCategoryEmoji(updatedTask.category);
  const priorityText = updatedTask.priority === "high" ? "🔴 High" : updatedTask.priority === "medium" ? "🟡 Medium" : "🟢 Low";
  const dueText = updatedTask.dueDate ? `\n📅 Due: ${updatedTask.dueDate}` : "";
  
  const menuText = [
    `⚙️ <b>Task Options</b>`,
    ``,
    `${checkbox} ${escapeHTML(updatedTask.text)}`,
    ``,
    `${categoryEmoji} ${escapeHTML(updatedTask.category || "personal")} • ${priorityText}${dueText}`,
    ``,
    `<i>Choose an action:</i>`,
  ].join("\n");
  
  const keyboard = new InlineKeyboard()
    .text(updatedTask.completed ? "⬜ Uncomplete" : "✅ Complete", `itodo_toggle:${taskId}`)
    .text("🗑️ Delete", `itodo_delete:${taskId}`)
    .row()
    .text("✏️ Edit Text", `itodo_edit:${taskId}`)
    .row()
    .text("🔴 High", `itodo_priority:${taskId}:high`)
    .text("🟡 Med", `itodo_priority:${taskId}:medium`)
    .text("🟢 Low", `itodo_priority:${taskId}:low`)
    .row()
    .text("📅 Today", `itodo_due:${taskId}:today`)
    .text("📅 Tomorrow", `itodo_due:${taskId}:tomorrow`)
    .row()
    .text("← Back to List", "itodo_back");
  
  try {
    await ctx.editMessageText(menuText, {
      parse_mode: "HTML",
      reply_markup: keyboard,
    });
  } catch (e) {}
});

bot.callbackQuery(/^itodo_edit:(.+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const taskId = ctx.match[1];
  const task = getTaskById(userId, taskId);
  
  if (!task) {
    await ctx.answerCallbackQuery({ text: "Task not found", show_alert: true });
    return;
  }
  
  await ctx.answerCallbackQuery({ text: "✏️ Tap button to edit" });
  
  // Show edit with switchInlineCurrent to pre-fill
  const editText = [
    `✏️ <b>Edit Task</b>`,
    ``,
    `Current: ${escapeHTML(task.text)}`,
    ``,
    `Tap the button below to edit:`,
  ].join("\n");
  
  try {
    await ctx.editMessageText(editText, {
      parse_mode: "HTML",
      reply_markup: new InlineKeyboard()
        .switchInlineCurrent("✏️ Edit Now", `sc:edit ${taskId} `)
        .row()
        .text("← Back to Task", `itodo_view:${taskId}`)
        .text("← Back to List", "itodo_back"),
    });
  } catch (e) {}
});

bot.callbackQuery(/^itodo_view:(.+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const taskId = ctx.match[1];
  const task = getTaskById(userId, taskId);
  
  if (!task) {
    await ctx.answerCallbackQuery({ text: "Task not found", show_alert: true });
    return;
  }
  
  await ctx.answerCallbackQuery();
  
  const checkbox = task.completed ? "✅" : "⬜";
  const categoryEmoji = getCategoryEmoji(task.category);
  const priorityText = task.priority === "high" ? "🔴 High" : task.priority === "medium" ? "🟡 Medium" : "🟢 Low";
  const dueText = task.dueDate ? `\n📅 Due: ${task.dueDate}` : "";
  
  const menuText = [
    `⚙️ <b>Task Options</b>`,
    ``,
    `${checkbox} ${escapeHTML(task.text)}`,
    ``,
    `${categoryEmoji} ${escapeHTML(task.category || "personal")} • ${priorityText}${dueText}`,
    ``,
    `<i>Choose an action:</i>`,
  ].join("\n");
  
  const keyboard = new InlineKeyboard()
    .text(task.completed ? "⬜ Uncomplete" : "✅ Complete", `itodo_toggle:${taskId}`)
    .text("🗑️ Delete", `itodo_delete:${taskId}`)
    .row()
    .text("✏️ Edit Text", `itodo_edit:${taskId}`)
    .row()
    .text("🔴 High", `itodo_priority:${taskId}:high`)
    .text("🟡 Med", `itodo_priority:${taskId}:medium`)
    .text("🟢 Low", `itodo_priority:${taskId}:low`)
    .row()
    .text("📅 Today", `itodo_due:${taskId}:today`)
    .text("📅 Tomorrow", `itodo_due:${taskId}:tomorrow`)
    .row()
    .text("← Back to List", "itodo_back");
  
  try {
    await ctx.editMessageText(menuText, {
      parse_mode: "HTML",
      reply_markup: keyboard,
    });
  } catch (e) {}
});

bot.callbackQuery("itodo_back", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  await ctx.answerCallbackQuery();
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const todos = getUserTodos(userId);
  const filters = getTodoFilters(userId);
  const tasks = todos.tasks || [];
  const taskCount = tasks.length;
  const doneCount = tasks.filter(t => t.completed).length;
  const pendingCount = taskCount - doneCount;
  
  if (taskCount === 0) {
    try {
      await ctx.editMessageText("📋 <b>Starz Check - Personal</b>\n\n<i>No tasks yet!</i>\n\n<i>via StarzAI • Starz Check</i>", {
        parse_mode: "HTML",
        reply_markup: new InlineKeyboard()
          .text("➕ Add Task", "itodo_add")
          .row()
          .switchInlineCurrent("← Back", ""),
      });
    } catch (e) {}
    return;
  }
  
  const filteredTodos = filterTodos(tasks, filters);
  const sortedTodos = sortTodos(filteredTodos, filters.sortBy || "created");
  const displayTodos = sortedTodos.slice(0, 8);
  
  // Compact title only - tasks are buttons
  const streak = getCompletionStreak(userId);
  let taskListText = `✅ <b>Starz Check</b>`;
  if (streak > 0) taskListText += ` 🔥${streak}`;
  
  const keyboard = new InlineKeyboard();
  
  // Each task is its own button row - like tic-tac-toe!
  displayTodos.forEach((task) => {
    if (!task || !task.text) return; // Skip invalid tasks
    const icon = task.completed ? "✅" : "⬜";
    const text = task.text.slice(0, 28) + (task.text.length > 28 ? "..." : "");
    const catEmoji = getCategoryEmoji(task.category);
    const priInd = task.priority === "high" ? "🔴" : task.priority === "medium" ? "🟡" : "";
    const dueInd = task.dueDate && isOverdue(task.dueDate) && !task.completed ? "⚠️" : "";
    keyboard.text(`${icon} ${text} ${catEmoji}${priInd}${dueInd}`, `itodo_tap:${task.id}`);
    keyboard.row();
  });
  
  keyboard
    .switchInlineCurrent("➕", "t:add ")
    .text("🔍", "itodo_filter")
    .text("👥", "itodo_collab")
    .row()
    .text("← Back", "inline_main_menu");
  
  try {
    await ctx.editMessageText(taskListText, {
      parse_mode: "HTML",
      reply_markup: keyboard,
    });
  } catch (e) {}
});

bot.callbackQuery("itodo_add", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  await ctx.answerCallbackQuery();
  
  // Just switch to inline mode directly - no instruction text needed
  try {
    await ctx.editMessageReplyMarkup({
      reply_markup: new InlineKeyboard()
        .switchInlineCurrent("➕ Type task here...", "t:add ")
        .row()
        .text("← Back", "itodo_back"),
    });
  } catch (e) {}
});

bot.callbackQuery("itodo_filter", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  await ctx.answerCallbackQuery();
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const filters = getTodoFilters(userId);
  
  const filterText = [
    `🔍 <b>Filter Tasks</b>`,
    ``,
    `Current filters:`,
    `• Priority: ${filters.priority || "All"}`,
    `• Category: ${filters.category || "All"}`,
    `• Sort by: ${filters.sortBy || "created"}`,
  ].join("\n");
  
  const keyboard = new InlineKeyboard()
    .text("🔴 High", "itodo_fpri:high")
    .text("🟡 Med", "itodo_fpri:medium")
    .text("🟢 Low", "itodo_fpri:low")
    .row()
    .text("💼 Work", "itodo_fcat:work")
    .text("👤 Personal", "itodo_fcat:personal")
    .text("🛒 Shop", "itodo_fcat:shopping")
    .row()
    .text("📅 By Date", "itodo_sort:dueDate")
    .text("🔴 By Priority", "itodo_sort:priority")
    .row()
    .text("❌ Clear Filters", "itodo_fclear")
    .row()
    .text("← Back to List", "itodo_back");
  
  try {
    await ctx.editMessageText(filterText, {
      parse_mode: "HTML",
      reply_markup: keyboard,
    });
  } catch (e) {}
});

bot.callbackQuery(/^itodo_fpri:(.+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const priority = ctx.match[1];
  setTodoFilter(userId, "priority", priority);
  await ctx.answerCallbackQuery({ text: `🔍 Filtering by ${priority} priority` });
  
  // Go back to list with filter applied
  const userTodos = getUserTodos(userId);
  const filters = getTodoFilters(userId);
  const tasks = userTodos.tasks || [];
  const filteredTodos = filterTodos(tasks, filters);
  const sortedTodos = sortTodos(filteredTodos, filters.sortBy || "created");
  const displayTodos = sortedTodos.slice(0, 8);
  
  const taskCount = filteredTodos.length;
  const doneCount = filteredTodos.filter(t => t.completed).length;
  const pendingCount = taskCount - doneCount;
  
  // Compact title with filter indicator
  let taskListText = `✅ <b>Starz Check</b> 🔍${priority}`;
  
  const keyboard = new InlineKeyboard();
  
  // Each task is its own button row - like tic-tac-toe!
  displayTodos.forEach((task) => {
    if (!task || !task.text) return; // Skip invalid tasks
    const icon = task.completed ? "✅" : "⬜";
    const text = task.text.slice(0, 28) + (task.text.length > 28 ? "..." : "");
    const catEmoji = getCategoryEmoji(task.category);
    const priInd = task.priority === "high" ? "🔴" : task.priority === "medium" ? "🟡" : "";
    const dueInd = task.dueDate && isOverdue(task.dueDate) && !task.completed ? "⚠️" : "";
    keyboard.text(`${icon} ${text} ${catEmoji}${priInd}${dueInd}`, `itodo_tap:${task.id}`);
    keyboard.row();
  });
  
  keyboard
    .text("➕ Add", "itodo_add")
    .text("🔍 Filter", "itodo_filter")
    .text("❌ Clear", "itodo_fclear")
    .row()
    .switchInlineCurrent("🔄 Refresh", "t: ")
    .switchInlineCurrent("← Back", "");
  
  try {
    await ctx.editMessageText(taskListText, {
      parse_mode: "HTML",
      reply_markup: keyboard,
    });
  } catch (e) {}
});

bot.callbackQuery(/^itodo_fcat:(.+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const category = ctx.match[1];
  setTodoFilter(userId, "category", category);
  await ctx.answerCallbackQuery({ text: `🔍 Filtering by ${category}` });
  
  // Go back to list with filter applied
  const userTodos = getUserTodos(userId);
  const filters = getTodoFilters(userId);
  const tasks = userTodos.tasks || [];
  const filteredTodos = filterTodos(tasks, filters);
  const sortedTodos = sortTodos(filteredTodos, filters.sortBy || "created");
  const displayTodos = sortedTodos.slice(0, 8);
  
  const taskCount = filteredTodos.length;
  const doneCount = filteredTodos.filter(t => t.completed).length;
  const pendingCount = taskCount - doneCount;
  
  // Compact title with filter indicator
  let taskListText = `✅ <b>Starz Check</b> 🔍${category}`;
  
  const keyboard = new InlineKeyboard();
  
  // Each task is its own button row - like tic-tac-toe!
  displayTodos.forEach((task) => {
    if (!task || !task.text) return; // Skip invalid tasks
    const icon = task.completed ? "✅" : "⬜";
    const text = task.text.slice(0, 28) + (task.text.length > 28 ? "..." : "");
    const catEmoji = getCategoryEmoji(task.category);
    const priInd = task.priority === "high" ? "🔴" : task.priority === "medium" ? "🟡" : "";
    const dueInd = task.dueDate && isOverdue(task.dueDate) && !task.completed ? "⚠️" : "";
    keyboard.text(`${icon} ${text} ${catEmoji}${priInd}${dueInd}`, `itodo_tap:${task.id}`);
    keyboard.row();
  });
  
  keyboard
    .text("➕ Add", "itodo_add")
    .text("🔍 Filter", "itodo_filter")
    .text("❌ Clear", "itodo_fclear")
    .row()
    .switchInlineCurrent("🔄 Refresh", "t: ")
    .switchInlineCurrent("← Back", "");
  
  try {
    await ctx.editMessageText(taskListText, {
      parse_mode: "HTML",
      reply_markup: keyboard,
    });
  } catch (e) {}
});

bot.callbackQuery(/^itodo_sort:(.+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const sortBy = ctx.match[1];
  setTodoFilter(userId, "sortBy", sortBy);
  await ctx.answerCallbackQuery({ text: `📊 Sorting by ${sortBy}` });
  
  // Go back to filter menu
  const filters = getTodoFilters(userId);
  
  const filterText = [
    `🔍 <b>Filter Tasks</b>`,
    ``,
    `Current filters:`,
    `• Priority: ${filters.priority || "All"}`,
    `• Category: ${filters.category || "All"}`,
    `• Sort by: ${filters.sortBy || "created"}`,
  ].join("\n");
  
  const keyboard = new InlineKeyboard()
    .text("🔴 High", "itodo_fpri:high")
    .text("🟡 Med", "itodo_fpri:medium")
    .text("🟢 Low", "itodo_fpri:low")
    .row()
    .text("💼 Work", "itodo_fcat:work")
    .text("👤 Personal", "itodo_fcat:personal")
    .text("🛒 Shop", "itodo_fcat:shopping")
    .row()
    .text("📅 By Date", "itodo_sort:dueDate")
    .text("🔴 By Priority", "itodo_sort:priority")
    .row()
    .text("❌ Clear Filters", "itodo_fclear")
    .row()
    .text("← Back to List", "itodo_back");
  
  try {
    await ctx.editMessageText(filterText, {
      parse_mode: "HTML",
      reply_markup: keyboard,
    });
  } catch (e) {}
});

bot.callbackQuery("itodo_fclear", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  clearTodoFilters(userId);
  await ctx.answerCallbackQuery({ text: "❌ Filters cleared" });
  
  // Go back to list
  const todos = getUserTodos(userId);
  const taskCount = todos.length;
  const doneCount = todos.filter(t => t.completed).length;
  const pendingCount = taskCount - doneCount;
  
  const sortedTodos = sortTodos(todos, "created");
  const displayTodos = sortedTodos.slice(0, 8);
  
  // Compact title only - tasks are buttons
  const streak = getCompletionStreak(userId);
  let taskListText = `✅ <b>Starz Check</b>`;
  if (streak > 0) taskListText += ` 🔥${streak}`;
  
  const keyboard = new InlineKeyboard();
  
  // Each task is its own button row - like tic-tac-toe!
  displayTodos.forEach((task) => {
    if (!task || !task.text) return; // Skip invalid tasks
    const icon = task.completed ? "✅" : "⬜";
    const text = task.text.slice(0, 28) + (task.text.length > 28 ? "..." : "");
    const catEmoji = getCategoryEmoji(task.category);
    const priInd = task.priority === "high" ? "🔴" : task.priority === "medium" ? "🟡" : "";
    const dueInd = task.dueDate && isOverdue(task.dueDate) && !task.completed ? "⚠️" : "";
    keyboard.text(`${icon} ${text} ${catEmoji}${priInd}${dueInd}`, `itodo_tap:${task.id}`);
    keyboard.row();
  });
  
  keyboard
    .switchInlineCurrent("➕", "t:add ")
    .text("🔍", "itodo_filter")
    .text("👥", "itodo_collab")
    .row()
    .text("← Back", "inline_main_menu");
  
  try {
    await ctx.editMessageText(taskListText, {
      parse_mode: "HTML",
      reply_markup: keyboard,
    });
  } catch (e) {}
});

bot.callbackQuery("itodo_stats", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  await ctx.answerCallbackQuery();
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const stats = getTodoStats(userId);
  
  const statsText = [
    `📊 <b>Task Statistics</b>`,
    ``,
    `📋 Total tasks: ${stats.total}`,
    `✅ Completed: ${stats.completed}`,
    `⬜ Pending: ${stats.pending}`,
    `📈 Completion rate: ${stats.completionRate}%`,
    ``,
    `🔥 Current streak: ${stats.streak} days`,
    `🏆 Best streak: ${stats.bestStreak} days`,
  ].join("\n");
  
  try {
    await ctx.editMessageText(statsText, {
      parse_mode: "HTML",
      reply_markup: new InlineKeyboard()
        .text("🗑️ Clear Completed", "itodo_clear_done")
        .row()
        .text("← Back to List", "itodo_back"),
    });
  } catch (e) {}
});

bot.callbackQuery("itodo_clear_done", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const cleared = clearCompletedTasks(userId);
  await ctx.answerCallbackQuery({ text: `🗑️ Cleared ${cleared} completed tasks!` });
  
  // Go back to stats
  const stats = getTodoStats(userId);
  
  const statsText = [
    `📊 <b>Task Statistics</b>`,
    ``,
    `📋 Total tasks: ${stats.total}`,
    `✅ Completed: ${stats.completed}`,
    `⬜ Pending: ${stats.pending}`,
    `📈 Completion rate: ${stats.completionRate}%`,
    ``,
    `🔥 Current streak: ${stats.streak} days`,
    `🏆 Best streak: ${stats.bestStreak} days`,
  ].join("\n");
  
  try {
    await ctx.editMessageText(statsText, {
      parse_mode: "HTML",
      reply_markup: new InlineKeyboard()
        .text("🗑️ Clear Completed", "itodo_clear_done")
        .row()
        .text("← Back to List", "itodo_back"),
    });  } catch (e) {}
});

bot.callbackQuery("itodo_collab", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  await ctx.answerCallbackQuery();
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const userLists = getCollabListsForUser(userId);
  
  let collabText = `👥 <b>Collab Lists</b>`;
  
  const keyboard = new InlineKeyboard();
  
  if (userLists.length === 0) {
    keyboard.text("📋 No lists yet", "ct_create").row();
  } else {
    userLists.slice(0, 5).forEach((list) => {
      const doneCount = list.tasks.filter(t => t.completed).length;
      const totalCount = list.tasks.length;
      keyboard.text(`📋 ${list.name} (${doneCount}/${totalCount})`, `ct_open:${list.id}`).row();
    });
  }
  
  keyboard
    .text("➕ Create", "ct_create")
    .text("🔗 Join", "ct_join")
    .row()
    .text("← Back", "itodo_back");
  
  try {
    await ctx.editMessageText(collabText, {
      parse_mode: "HTML",
      reply_markup: keyboard,
    });
  } catch (e) {}
});

// =====================
// COLLABORATIVE TODO CALLBACKS HANDLERS
// =====================

// Track last tap for collab double-tap detection
const collabTodoLastTap = new Map();

bot.callbackQuery(/^ct_tap:(.+):(.+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const listId = ctx.match[1];
  const taskId = ctx.match[2];
  const now = Date.now();
  const lastTap = collabTodoLastTap.get(userId);
  
  // Check for double-tap (same task within 3 seconds)
  if (lastTap && lastTap.taskId === taskId && lastTap.listId === listId && (now - lastTap.timestamp) < 3000) {
    // Double-tap detected - show action menu
    collabTodoLastTap.delete(userId);
    await ctx.answerCallbackQuery({ text: "⚙️ Opening options..." });
    
    const list = getCollabList(listId);
    const task = list?.tasks.find(t => t.id === taskId);
    if (!task || !list) {
      return ctx.answerCallbackQuery({ text: "Task not found", show_alert: true });
    }
    
    const checkbox = task.completed ? "✅" : "⬜";
    const priorityText = task.priority === "high" ? "🔴 High" : task.priority === "medium" ? "🟡 Medium" : "🟢 Low";
    
    let completedByText = "";
    if (task.completed && task.completedBy) {
      const completer = task.completedBy.username || `User ${task.completedBy.userId.slice(-4)}`;
      completedByText = `\n✅ Completed by: ${escapeHTML(completer)}`;
    }
    
    const menuText = [
      `⚙️ <b>Task Options</b>`,
      ``,
      `${checkbox} ${escapeHTML(task.text)}`,
      ``,
      `👥 List: <b>${escapeHTML(list.name)}</b>`,
      `🎯 Priority: ${priorityText}${completedByText}`,
      ``,
      `<i>Choose an action:</i>`,
    ].join("\n");
    
    const keyboard = new InlineKeyboard()
      .text(task.completed ? "⬜ Uncomplete" : "✅ Complete", `ct_toggle:${listId}:${taskId}`)
      .text("🗑️ Delete", `ct_delete:${listId}:${taskId}`)
      .row()
      .text("🔴 High", `ct_pri:${listId}:${taskId}:high`)
      .text("🟡 Med", `ct_pri:${listId}:${taskId}:medium`)
      .text("🟢 Low", `ct_pri:${listId}:${taskId}:low`)
      .row()
      .text("← Back to List", `ct_back:${listId}`);
    
    try {
      await ctx.editMessageText(menuText, {
        parse_mode: "HTML",
        reply_markup: keyboard,
      });
    } catch (e) {}
    return;
  }
  
  // First tap - toggle task
  collabTodoLastTap.set(userId, { listId, taskId, timestamp: now });
  setTimeout(() => {
    const tap = collabTodoLastTap.get(userId);
    if (tap && tap.taskId === taskId && tap.listId === listId) {
      collabTodoLastTap.delete(userId);
    }
  }, 3000);
  
  const task = toggleCollabTask(userId, listId, taskId, ctx.from?.username);
  
  if (task) {
    const status = task.completed ? "✅ Completed!" : "⬜ Unchecked";
    await ctx.answerCallbackQuery({ text: status });
  } else {
    await ctx.answerCallbackQuery({ text: "Could not toggle task", show_alert: true });
    return;
  }
  
  // Refresh the list view
  const list = getCollabList(listId);
  if (!list) return;
  
  const pendingCount = list.tasks.filter(t => !t.completed).length;
  const doneCount = list.tasks.filter(t => t.completed).length;
  const isOwner = list.ownerId === String(userId);
  
  let listText = `👥 <b>${escapeHTML(list.name)}</b>${isOwner ? " 👑" : ""}\n\n`;
  listText += `📊 ${pendingCount} pending • ${doneCount} done • ${list.members.length} members\n`;
  listText += `🔑 Join code: <code>${list.joinCode}</code>\n\n`;
  
  if (list.tasks.length === 0) {
    listText += `<i>No tasks yet!</i>\n`;
  } else {
    const displayTasks = list.tasks.slice(0, 8);
    displayTasks.forEach((t, i) => {
      const checkbox = t.completed ? "✅" : "⬜";
      const text = t.completed ? `<s>${escapeHTML(t.text)}</s>` : escapeHTML(t.text);
      const priorityIndicator = t.priority === "high" ? " 🔴" : t.priority === "medium" ? " 🟡" : "";
      
      let completedByText = "";
      if (t.completed && t.completedBy && list.settings.showCompletedBy) {
        const completer = t.completedBy.username || `User ${t.completedBy.userId.slice(-4)}`;
        completedByText = ` <i>by ${escapeHTML(completer)}</i>`;
      }
      
      listText += `${checkbox} ${i + 1}. ${text}${priorityIndicator}${completedByText}\n`;
    });
    
    if (list.tasks.length > 8) {
      listText += `\n<i>+${list.tasks.length - 8} more tasks...</i>\n`;
    }
  }
  
  listText += `\n<i>Tap task to toggle • Tap again for options</i>`;
  
  const keyboard = new InlineKeyboard();
  
  const displayTasks = list.tasks.slice(0, 6);
  for (let i = 0; i < displayTasks.length; i += 2) {
    const task1 = displayTasks[i];
    const icon1 = task1.completed ? "✅" : "⬜";
    keyboard.text(`${icon1} ${i + 1}`, `ct_tap:${list.id}:${task1.id}`);
    
    if (displayTasks[i + 1]) {
      const task2 = displayTasks[i + 1];
      const icon2 = task2.completed ? "✅" : "⬜";
      keyboard.text(`${icon2} ${i + 2}`, `ct_tap:${list.id}:${task2.id}`);
    }
    keyboard.row();
  }
  
  keyboard
    .text("➕ Add", `ct_add:${list.id}`)
    .text("🗑️ Clear", `ct_clear:${list.id}`)
    .row()
    .text("👥 Members", `ct_members:${list.id}`)
    .text("🔗 Share", `ct_share:${list.id}`)
    .row()
    .switchInlineCurrent("← My Lists", "ct: ");
  
  try {
    await ctx.editMessageText(listText, {
      parse_mode: "HTML",
      reply_markup: keyboard,
    });
  } catch (e) {}
});

bot.callbackQuery(/^ct_toggle:(.+):(.+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const listId = ctx.match[1];
  const taskId = ctx.match[2];
  
  const task = toggleCollabTask(userId, listId, taskId, ctx.from?.username);
  
  if (task) {
    const status = task.completed ? "✅ Completed!" : "⬜ Unchecked";
    await ctx.answerCallbackQuery({ text: status });
  } else {
    await ctx.answerCallbackQuery({ text: "Could not toggle task", show_alert: true });
    return;
  }
  
  // Go back to list
  const list = getCollabList(listId);
  if (!list) return;
  
  const pendingCount = list.tasks.filter(t => !t.completed).length;
  const doneCount = list.tasks.filter(t => t.completed).length;
  const isOwner = list.ownerId === String(userId);
  
  let listText = `👥 <b>${escapeHTML(list.name)}</b>${isOwner ? " 👑" : ""}\n\n`;
  listText += `📊 ${pendingCount} pending • ${doneCount} done • ${list.members.length} members\n`;
  listText += `🔑 Join code: <code>${list.joinCode}</code>\n\n`;
  
  const displayTasks = list.tasks.slice(0, 8);
  displayTasks.forEach((t, i) => {
    const checkbox = t.completed ? "✅" : "⬜";
    const text = t.completed ? `<s>${escapeHTML(t.text)}</s>` : escapeHTML(t.text);
    const priorityIndicator = t.priority === "high" ? " 🔴" : t.priority === "medium" ? " 🟡" : "";
    
    let completedByText = "";
    if (t.completed && t.completedBy && list.settings.showCompletedBy) {
      const completer = t.completedBy.username || `User ${t.completedBy.userId.slice(-4)}`;
      completedByText = ` <i>by ${escapeHTML(completer)}</i>`;
    }
    
    listText += `${checkbox} ${i + 1}. ${text}${priorityIndicator}${completedByText}\n`;
  });
  
  listText += `\n<i>Tap task to toggle • Tap again for options</i>`;
  
  const keyboard = buildCollabListKeyboard(list, 0);
  
  try {
    await ctx.editMessageText(listText, {
      parse_mode: "HTML",
      reply_markup: keyboard,
    });
  } catch (e) {}
});

bot.callbackQuery(/^ct_delete:(.+):(.+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const listId = ctx.match[1];
  const taskId = ctx.match[2];
  
  const deleted = deleteCollabTask(userId, listId, taskId);
  
  if (deleted) {
    await ctx.answerCallbackQuery({ text: "🗑️ Task deleted!" });
  } else {
    await ctx.answerCallbackQuery({ text: "Could not delete task", show_alert: true });
    return;
  }
  
  // Go back to list
  const list = getCollabList(listId);
  if (!list) return;
  
  const listText = buildCollabListMessage(list, 0);
  const keyboard = buildCollabListKeyboard(list, 0);
  
  try {
    await ctx.editMessageText(listText, {
      parse_mode: "HTML",
      reply_markup: keyboard,
    });
  } catch (e) {}
});

bot.callbackQuery(/^ct_pri:(.+):(.+):(.+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const listId = ctx.match[1];
  const taskId = ctx.match[2];
  const priority = ctx.match[3];
  
  const task = updateCollabTask(userId, listId, taskId, { priority });
  
  if (task) {
    const emoji = priority === "high" ? "🔴" : priority === "medium" ? "🟡" : "🟢";
    await ctx.answerCallbackQuery({ text: `${emoji} Priority set to ${priority}!` });
  } else {
    await ctx.answerCallbackQuery({ text: "Could not update task", show_alert: true });
    return;
  }
  
  // Go back to list
  const list = getCollabList(listId);
  if (!list) return;
  
  const listText = buildCollabListMessage(list, 0);
  const keyboard = buildCollabListKeyboard(list, 0);
  
  try {
    await ctx.editMessageText(listText, {
      parse_mode: "HTML",
      reply_markup: keyboard,
    });
  } catch (e) {}
});

bot.callbackQuery(/^ct_back:(.+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  await ctx.answerCallbackQuery();
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const listId = ctx.match[1];
  const list = getCollabList(listId);
  if (!list) return;
  
  const listText = buildCollabListMessage(list, 0);
  const keyboard = buildCollabListKeyboard(list, 0);
  
  try {
    await ctx.editMessageText(listText, {
      parse_mode: "HTML",
      reply_markup: keyboard,
    });
  } catch (e) {}
});

bot.callbackQuery(/^ct_add:(.+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  await ctx.answerCallbackQuery({ text: "➕ Use inline to add task" });
  
  const listId = ctx.match[1];
  const list = getCollabList(listId);
  if (!list) return;
  
  const addText = [
    `➕ <b>Add Task to ${escapeHTML(list.name)}</b>`,
    ``,
    `Type in inline mode:`,
    `<code>ct:add:${listId} Your task here</code>`,
    ``,
    `<i>Quick options:</i>`,
    `• <code>#work</code> - Set category`,
    `• <code>!high</code> - Set priority`,
    `• <code>@today</code> - Set due date`,
  ].join("\n");
  
  try {
    await ctx.editMessageText(addText, {
      parse_mode: "HTML",
      reply_markup: new InlineKeyboard()
        .switchInlineCurrent("➕ Add Task", `ct:add:${listId} `)
        .row()
        .text("← Back to List", `ct_back:${listId}`),
    });
  } catch (e) {}
});

bot.callbackQuery(/^ct_clear:(.+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const listId = ctx.match[1];
  const cleared = clearCollabCompletedTasks(userId, listId);
  
  await ctx.answerCallbackQuery({ text: `🗑️ Cleared ${cleared} completed tasks!` });
  
  const list = getCollabList(listId);
  if (!list) return;
  
  const listText = buildCollabListMessage(list, 0);
  const keyboard = buildCollabListKeyboard(list, 0);
  
  try {
    await ctx.editMessageText(listText, {
      parse_mode: "HTML",
      reply_markup: keyboard,
    });
  } catch (e) {}
});

bot.callbackQuery(/^ct_members:(.+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  await ctx.answerCallbackQuery();
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const listId = ctx.match[1];
  const list = getCollabList(listId);
  if (!list) return;
  
  const isOwner = list.ownerId === String(userId);
  
  let membersText = [
    `👥 <b>Members of ${escapeHTML(list.name)}</b>`,
    ``,
  ];
  
  list.members.forEach((m, i) => {
    const roleEmoji = m.role === "owner" ? " 👑" : "";
    const name = m.username ? `@${m.username}` : `User ${m.userId.slice(-4)}`;
    membersText.push(`${i + 1}. ${escapeHTML(name)}${roleEmoji}`);
  });
  
  membersText.push(``);
  membersText.push(`🔑 Share code: <code>${list.joinCode}</code>`);
  
  const keyboard = new InlineKeyboard()
    .text("🔗 Share Code", `ct_share:${listId}`)
    .row();
  
  if (isOwner) {
    keyboard.text("🗑️ Delete List", `ct_delete_list:${listId}`).row();
  } else {
    keyboard.text("🚪 Leave List", `ct_leave:${listId}`).row();
  }
  
  keyboard.text("← Back to List", `ct_back:${listId}`);
  
  try {
    await ctx.editMessageText(membersText.join("\n"), {
      parse_mode: "HTML",
      reply_markup: keyboard,
    });
  } catch (e) {}
});

bot.callbackQuery(/^ct_share:(.+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  await ctx.answerCallbackQuery();
  
  const listId = ctx.match[1];
  const list = getCollabList(listId);
  if (!list) return;
  
  const shareText = [
    `🔗 <b>Share ${escapeHTML(list.name)}</b>`,
    ``,
    `Share this code with others:`,
    `<code>${list.joinCode}</code>`,
    ``,
    `They can join by typing:`,
    `<code>ct:join ${list.joinCode}</code>`,
    ``,
    `Or share this message directly!`,
  ].join("\n");
  
  try {
    await ctx.editMessageText(shareText, {
      parse_mode: "HTML",
      reply_markup: new InlineKeyboard()
        .text("← Back to List", `ct_back:${listId}`),
    });
  } catch (e) {}
});

bot.callbackQuery(/^ct_leave:(.+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const listId = ctx.match[1];
  const result = leaveCollabList(userId, listId);
  
  if (result.success) {
    await ctx.answerCallbackQuery({ text: "🚪 Left the list!" });
    
    try {
      await ctx.editMessageText("🚪 <b>You left the list.</b>\n\n<i>via StarzAI • Starz Check</i>", {
        parse_mode: "HTML",
        reply_markup: new InlineKeyboard()
          .switchInlineCurrent("👥 My Lists", "ct: "),
      });
    } catch (e) {}
  } else {
    await ctx.answerCallbackQuery({ text: result.error || "Could not leave list", show_alert: true });
  }
});

bot.callbackQuery(/^ct_delete_list:(.+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const listId = ctx.match[1];
  const list = getCollabList(listId);
  if (!list) return;
  
  // Show confirmation
  const confirmText = [
    `⚠️ <b>Delete ${escapeHTML(list.name)}?</b>`,
    ``,
    `This will permanently delete the list and all ${list.tasks.length} tasks.`,
    ``,
    `All ${list.members.length} members will lose access.`,
    ``,
    `<b>This cannot be undone!</b>`,
  ].join("\n");
  
  try {
    await ctx.editMessageText(confirmText, {
      parse_mode: "HTML",
      reply_markup: new InlineKeyboard()
        .text("🗑️ Yes, Delete", `ct_confirm_delete:${listId}`)
        .text("❌ Cancel", `ct_back:${listId}`),
    });
  } catch (e) {}
});

bot.callbackQuery(/^ct_confirm_delete:(.+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const listId = ctx.match[1];
  const result = deleteCollabList(userId, listId);
  
  if (result.success) {
    await ctx.answerCallbackQuery({ text: "🗑️ List deleted!" });
    
    try {
      await ctx.editMessageText("🗑️ <b>List deleted.</b>\n\n<i>via StarzAI • Starz Check</i>", {
        parse_mode: "HTML",
        reply_markup: new InlineKeyboard()
          .switchInlineCurrent("👥 My Lists", "ct: "),
      });
    } catch (e) {}
  } else {
    await ctx.answerCallbackQuery({ text: result.error || "Could not delete list", show_alert: true });
  }
});

bot.callbackQuery(/^ct_page:(.+):(\d+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  await ctx.answerCallbackQuery();
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const listId = ctx.match[1];
  const page = parseInt(ctx.match[2]);
  const list = getCollabList(listId);
  if (!list) return;
  
  const listText = buildCollabListMessage(list, page);
  const keyboard = buildCollabListKeyboard(list, page);
  
  try {
    await ctx.editMessageText(listText, {
      parse_mode: "HTML",
      reply_markup: keyboard,
    });
  } catch (e) {}
});

bot.callbackQuery("ct_noop", async (ctx) => {
  await ctx.answerCallbackQuery();
});

// /persona - Set custom AI personality
bot.command("persona", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  if (!(await enforceCommandCooldown(ctx))) return;
  const u = ctx.from;
  if (!u?.id) return;
  
  const user = ensureUser(u.id, u);
  const args = ctx.message.text.split(" ").slice(1).join(" ").trim();
  
  if (!args) {
    // Show current persona and help
    const currentPersona = user.persona || "Default (helpful AI assistant)";
    return ctx.reply(
      `🎭 *Custom Persona*\n\nCurrent: _${currentPersona}_\n\n*Usage:*\n\`/persona friendly teacher\`\n\`/persona sarcastic comedian\`\n\`/persona wise philosopher\`\n\`/persona reset\` - Back to default\n\n_Your persona affects all AI responses!_`,
      {
        parse_mode: "Markdown",
        reply_to_message_id: ctx.message?.message_id,
      }
    );
  }
  
  if (args.toLowerCase() === "reset") {
    delete user.persona;
    saveUsers();
    return ctx.reply("✅ Persona reset to default helpful AI assistant!", {
      reply_to_message_id: ctx.message?.message_id,
    });
  }
  
  // Set new persona
  user.persona = args.slice(0, 100); // Limit to 100 chars
  saveUsers();
  
  await ctx.reply(
    `✅ *Persona set!*\n\nAI will now respond as: _${user.persona}_\n\n_Use \`/persona reset\` to go back to default._`,
    {
      parse_mode: "Markdown",
      reply_to_message_id: ctx.message?.message_id,
    }
  );
});

// /history - DISABLED: History feature removed to prevent database bloat
bot.command("history", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  if (!(await enforceCommandCooldown(ctx))) return;
  return ctx.reply(
    "⚠️ *History feature has been disabled*\\n\\nThis feature has been removed to optimize database performance and reduce storage costs.\\n\\n_You can still use inline mode by typing @starztechbot in any chat!_",
    {
      parse_mode: "Markdown",
      reply_to_message_id: ctx.message?.message_id,
    }
  );
});

// /partner - Manage your AI partner
bot.command("partner", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  if (!(await enforceCommandCooldown(ctx))) return;
  const u = ctx.from;
  if (!u?.id) return;
  
  const args = ctx.message.text.split(" ").slice(1);
  const subcommand = args[0]?.toLowerCase();
  const value = args.slice(1).join(" ").trim();
  
  const partner = getPartner(u.id);
  
  // No subcommand - show partner setup with checklist buttons
  if (!subcommand) {
    return ctx.reply(buildPartnerSetupMessage(partner), {
      parse_mode: "Markdown",
      reply_markup: buildPartnerKeyboard(partner),
      reply_to_message_id: ctx.message?.message_id,
    });
  }
  
  // Subcommands
  switch (subcommand) {
    case "name":
      if (!value)
        return ctx.reply("❌ Please provide a name: `/partner name Luna`", {
          parse_mode: "Markdown",
          reply_to_message_id: ctx.message?.message_id,
        });
      setPartner(u.id, { name: value.slice(0, 50) });
      return ctx.reply(`✅ Partner name set to: *${value.slice(0, 50)}*`, {
        parse_mode: "Markdown",
        reply_to_message_id: ctx.message?.message_id,
      });
      
    case "personality":
      if (!value)
        return ctx.reply(
          "❌ Please provide personality traits: `/partner personality cheerful, witty, caring`",
          {
            parse_mode: "Markdown",
            reply_to_message_id: ctx.message?.message_id,
          }
        );
      setPartner(u.id, { personality: value.slice(0, 200) });
      return ctx.reply(
        `✅ Partner personality set to: _${value.slice(0, 200)}_`,
        {
          parse_mode: "Markdown",
          reply_to_message_id: ctx.message?.message_id,
        }
      );
      
    case "background":
      if (!value)
        return ctx.reply(
          "❌ Please provide a background: `/partner background A mysterious traveler from another dimension`",
          {
            parse_mode: "Markdown",
            reply_to_message_id: ctx.message?.message_id,
          }
        );
      setPartner(u.id, { background: value.slice(0, 300) });
      return ctx.reply(
        `✅ Partner background set to: _${value.slice(0, 300)}_`,
        {
          parse_mode: "Markdown",
          reply_to_message_id: ctx.message?.message_id,
        }
      );
      
    case "style":
      if (!value)
        return ctx.reply(
          "❌ Please provide a speaking style: `/partner style speaks softly with poetic phrases`",
          {
            parse_mode: "Markdown",
            reply_to_message_id: ctx.message?.message_id,
          }
        );
      setPartner(u.id, { style: value.slice(0, 200) });
      return ctx.reply(
        `✅ Partner speaking style set to: _${value.slice(0, 200)}_`,
        {
          parse_mode: "Markdown",
          reply_to_message_id: ctx.message?.message_id,
        }
      );
      
    case "chat":
      if (!partner?.name) {
        return ctx.reply(
          "❌ Please set up your partner first! Use `/partner name [name]` to start.",
          {
            parse_mode: "Markdown",
            reply_to_message_id: ctx.message?.message_id,
          }
        );
      }
      setPartner(u.id, { active: true });
      return ctx.reply(
        `🤝🏻 *Partner mode activated!*\\n\\n${partner.name} is now ready to chat. Just send messages and they'll respond in character.\\n\\n_Use \`/partner stop\` to end the conversation._`,
        {
          parse_mode: "Markdown",
          reply_to_message_id: ctx.message?.message_id,
        }
      );
      
    case "stop":
      if (partner) {
        setPartner(u.id, { active: false });
      }
      return ctx.reply("⏹ Partner mode deactivated. Normal AI responses resumed.", {
        reply_to_message_id: ctx.message?.message_id,
      });
      
    case "clearchat":
      clearPartnerChat(u.id);
      return ctx.reply("🗑 Partner chat history cleared. Starting fresh!", {
        reply_to_message_id: ctx.message?.message_id,
      });
      
    case "clear":
    case "delete":
      clearPartner(u.id);
      return ctx.reply("❌ Partner deleted. Use `/partner` to create a new one.", {
        parse_mode: "Markdown",
        reply_to_message_id: ctx.message?.message_id,
      });
      
    default:
      return ctx.reply(
        `❓ Unknown subcommand: \`${subcommand}\`\\n\\n*Available:* name, personality, background, style, chat, stop, clearchat, clear`,
        {
          parse_mode: "Markdown",
          reply_to_message_id: ctx.message?.message_id,
        }
      );
  }
});

// /char - Quick character mode for DM/GC
bot.command("char", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  if (!(await enforceCommandCooldown(ctx))) return;
  const u = ctx.from;
  const chat = ctx.chat;
  if (!u?.id) return;
  
  const args = ctx.message.text.split(" ").slice(1);
  const subcommand = args[0]?.toLowerCase();
  const value = args.slice(1).join(" ").trim();
  
  const activeChar = getActiveCharacter(u.id, chat.id);
  const savedChars = getSavedCharacters(u.id);
  
  // No subcommand - show character status and help with button list
  if (!subcommand) {
    const statusText = activeChar 
      ? `🎭 <b>Active Character:</b> ${escapeHTML(activeChar.name)}\\n\\n`
      : "🎭 <b>No active character</b>\\n\\n";
    
    const savedList = savedChars.length > 0
      ? `💾 <b>Saved Characters:</b>\\n${savedChars.map((c, i) => `${i + 1}. ${escapeHTML(c)}`).join("\\n")}\\n\\n`
      : "";
    
    const helpText = [
      statusText,
      savedList,
      "<b>Commands:</b>",
      "• /char yoda - Start as Yoda",
      "• /char save yoda - Save character",
      "• /char list - Show saved",
      "• /char remove yoda - Remove saved",
      "• /char stop or /default - Stop character mode",
      "",
      "<i>Tap a character button below to start!</i>",
    ].join("\\n");
    
    return ctx.reply(helpText, { 
      parse_mode: "HTML",
      reply_markup: buildCharacterKeyboard(savedChars, activeChar),
      reply_to_message_id: ctx.message?.message_id,
    });
  }
  
  // Subcommands
  switch (subcommand) {
    case "save": {
      if (!value)
        return ctx.reply("❌ Please provide a character name: `/char save yoda`", {
          parse_mode: "Markdown",
          reply_to_message_id: ctx.message?.message_id,
        });
      const result = saveCharacter(u.id, value);
      const emoji = result.success ? "✅" : "❌";
      return ctx.reply(`${emoji} ${result.message}`, {
        reply_to_message_id: ctx.message?.message_id,
      });
    }
    
    case "list": {
      if (savedChars.length === 0) {
        return ctx.reply(
          "💾 *No saved characters yet!*\\\\n\\\\nUse `/char save [name]` to save one.",
          {
            parse_mode: "Markdown",
            reply_to_message_id: ctx.message?.message_id,
          }
        );
      }
      const listText = [
        "💾 *Your Saved Characters:*",
        "",
        ...savedChars.map((c, i) => `${i + 1}. 🎭 ${c}`),
        "",
        "_Tap a button to start chatting!_",
      ].join("\n");
      return ctx.reply(listText, { 
        parse_mode: "Markdown",
        reply_markup: buildCharacterKeyboard(savedChars, activeChar)
      });
    }
    
    case "remove":
    case "delete": {
      if (!value) return ctx.reply("❌ Please provide a character name: `/char remove yoda`", { parse_mode: "Markdown" });
      const result = removeCharacter(u.id, value);
      const emoji = result.success ? "✅" : "❌";
      return ctx.reply(`${emoji} ${result.message}`);
    }
    
    case "stop": {
      if (!activeChar) {
        return ctx.reply("❌ No active character in this chat.");
      }
      clearActiveCharacter(u.id, chat.id);
      return ctx.reply(
        `⏹ Character mode stopped. ${activeChar.name} has left the chat.\n\n_Normal AI responses resumed._`,
        {
          parse_mode: "Markdown",
          reply_to_message_id: ctx.message?.message_id,
        }
      );
    }
    
    default: {
      // Assume it's a character name to activate
      const characterName = args.join(" ").trim();
      if (!characterName) {
        return ctx.reply("❌ Please provide a character name: `/char yoda`", {
          parse_mode: "Markdown",
          reply_to_message_id: ctx.message?.message_id,
        });
      }
      
      setActiveCharacter(u.id, chat.id, characterName);
      
      const chatType = chat.type === "private" ? "DM" : "group";
      return ctx.reply(
        `🎭 *${characterName}* is now active in this ${chatType}!\n\nJust send messages and they'll respond in character.\n\n_Use \`/char stop\` to end._`,
        {
          parse_mode: "Markdown",
          reply_to_message_id: ctx.message?.message_id,
        }
      );
    }
  }
});

// /default - Stop character mode and return to normal AI
bot.command("default", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  if (!(await enforceCommandCooldown(ctx))) return;
  const u = ctx.from;
  const chat = ctx.chat;
  if (!u?.id) return;
  
  const activeChar = getActiveCharacter(u.id, chat.id);
  
  if (!activeChar) {
    return ctx.reply("✅ Already in default mode. No active character.", {
      reply_to_message_id: ctx.message?.message_id,
    });
  }
  
  clearActiveCharacter(u.id, chat.id);
  return ctx.reply(
    `⏹ <b>${escapeHTML(activeChar.name)}</b> has left the chat.\n\n<i>Normal AI responses resumed.</i>`,
    {
      parse_mode: "HTML",
      reply_to_message_id: ctx.message?.message_id,
    }
  );
});

// Build character selection keyboard
function buildCharacterKeyboard(savedChars, activeChar) {
  const keyboard = new InlineKeyboard();
  
  // Add saved character buttons (1 per row for full width)
  for (const char of savedChars) {
    const isActive = activeChar?.name?.toLowerCase() === char.toLowerCase();
    keyboard.text(`${isActive ? "✅" : "🎭"} ${char}`, `char_activate:${char}`);
    keyboard.row();
  }
  
  // Add stop button if character is active
  if (activeChar) {
    keyboard.text("⏹ Stop Character", "char_stop");
    keyboard.row();
  }
  
  // Add back to main menu button
  keyboard.text("« Back to Menu", "menu_back");
  
  return keyboard;
}

// Character callback handlers
bot.callbackQuery(/^char_activate:(.+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  const userId = ctx.from?.id;
  const chatId = ctx.chat?.id;
  if (!userId || !chatId) return ctx.answerCallbackQuery({ text: "Error", show_alert: true });
  
  const characterName = ctx.callbackQuery.data.split(":")[1];
  setActiveCharacter(userId, chatId, characterName);
  
  await ctx.answerCallbackQuery({ text: `🎭 ${characterName} activated!` });
  
  const savedChars = getSavedCharacters(userId);
  const activeChar = getActiveCharacter(userId, chatId);
  
  try {
    await ctx.editMessageText(
      `🎭 *${characterName}* is now active!\n\nJust send messages and they'll respond in character.\n\n_Use \`/char stop\` to end._`,
      { parse_mode: "Markdown", reply_markup: buildCharacterKeyboard(savedChars, activeChar) }
    );
  } catch (e) {
    // Message might be the same
  }
});

bot.callbackQuery("char_stop", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  const userId = ctx.from?.id;
  const chatId = ctx.chat?.id;
  if (!userId || !chatId) return ctx.answerCallbackQuery({ text: "Error", show_alert: true });
  
  const activeChar = getActiveCharacter(userId, chatId);
  if (!activeChar) {
    return ctx.answerCallbackQuery({ text: "No active character!", show_alert: true });
  }
  
  clearActiveCharacter(userId, chatId);
  
  await ctx.answerCallbackQuery({ text: "Character stopped!" });
  
  const savedChars = getSavedCharacters(userId);
  
  try {
    await ctx.editMessageText(
      `⏹ *${activeChar.name}* has left the chat.\n\n_Normal AI responses resumed._`,
      { parse_mode: "Markdown", reply_markup: buildCharacterKeyboard(savedChars, null) }
    );
  } catch (e) {
    // Message might be the same
  }
});

bot.callbackQuery("open_char", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  const userId = ctx.from?.id;
  const chatId = ctx.chat?.id;
  if (!userId) return ctx.answerCallbackQuery({ text: "Error", show_alert: true });
  
  await ctx.answerCallbackQuery();
  
  const activeChar = getActiveCharacter(userId, chatId);
  const savedChars = getSavedCharacters(userId);
  
  const statusText = activeChar 
    ? `🎭 *Active Character:* ${activeChar.name}\n\n`
    : "🎭 *No active character*\n\n";
  
  const savedList = savedChars.length > 0
    ? `💾 *Saved Characters:*\n${savedChars.map((c, i) => `${i + 1}. ${c}`).join("\n")}\n\n`
    : "";
  
  const helpText = [
    statusText,
    savedList,
    "*Commands:*",
    "• `/char yoda` - Start as Yoda",
    "• `/char save yoda` - Save character",
    "• `/char list` - Show saved",
    "• `/char stop` or `/default` - Stop",
    "",
    "_Tap a character button to start!_",
  ].join("\n");
  
  try {
    await ctx.editMessageText(helpText, { 
      parse_mode: "Markdown",
      reply_markup: buildCharacterKeyboard(savedChars, activeChar)
    });
  } catch (e) {
    // If edit fails, send as reply
    await ctx.reply(helpText, { 
      parse_mode: "Markdown",
      reply_markup: buildCharacterKeyboard(savedChars, activeChar)
    });
  }
});

// Partner callback handlers - Setup field buttons
const pendingPartnerInput = new Map(); // userId -&gt; { field, messageId }
// pendingFeedback: userId -&gt; { createdAt, source }
const pendingFeedback = new Map();

async function handleFeedbackIfActive(ctx, options = {}) {
  const u = ctx.from;
  const chat = ctx.chat;
  const msg = ctx.message;

  if (!u?.id || !chat || !msg) return false;

  const pendingFb = pendingFeedback.get(String(u.id));
  if (!pendingFb || chat.type !== "private") {
    return false;
  }

  pendingFeedback.delete(String(u.id));

  // 2 minute timeout
  if (Date.now() - pendingFb.createdAt > 2 * 60 * 1000) {
    await ctx.reply("⌛ Feedback mode expired. Tap the Feedback button again to retry.");
    return true;
  }

  if (!FEEDBACK_CHAT_ID) {
    await ctx.reply("⚠️ Feedback is not configured at the moment. Please try again later.");
    return true;
  }

  const rec = getUserRecord(u.id) || {};
  const feedbackId = `FB-${u.id}-${makeId(4)}`;
  const tier = (rec.tier || "free").toUpperCase();
  const banned = rec.banned ? "YES" : "no";
  const warningsCount = Array.isArray(rec.warnings) ? rec.warnings.length : 0;

  let muteInfo = "none";
  if (rec.mute) {
    const m = rec.mute;
    const scope = m.scope || "all";
    const untilStr = m.until ? new Date(m.until).toLocaleString() : "unknown";
    muteInfo = `scope=${scope}, until=${untilStr}`;
  }

  const sourceTag = pendingFb.source || "general";
  const sourceMap = {
    general: "General (menu)",
    command: "/feedback command",
    ban: "After ban notice",
    mute: "After mute notice",
    softban: "After softban notice",
    warn: "After warning notice",
    group_unauthed: "Unauthorized group",
  };
  const sourceLabel = sourceMap[sourceTag] || sourceTag;

  const username = rec.username || u.username || "";
  const name = rec.firstName || rec.first_name || u.first_name || u.firstName || "";

  const rawCaption =
    options.caption != null ? options.caption : (msg.caption || "");
  const captionText = (rawCaption || "").trim();

  const metaLines = [
    `📬 *New Feedback*`,
    ``,
    `🆔 *Feedback ID:* \`${feedbackId}\``,
    `👤 *User ID:* \`${u.id}\``,
    `🧾 *Context:* ${escapeMarkdown(sourceLabel)}`,
    `🎫 *Tier:* ${escapeMarkdown(tier)}`,
    `🚫 *Banned:* ${banned}`,
    `🔇 *Mute:* ${escapeMarkdown(muteInfo)}`,
    `⚠️ *Warnings:* ${warningsCount}`,
    `📛 *Username:* ${username ? escapeMarkdown("@" + username) : "_none_"}`,
    `👋 *Name:* ${name ? escapeMarkdown(name) : "_none_"}`,
  ];

  if (pendingFb.groupId) {
    metaLines.push(`👥 *Group ID:* \`${pendingFb.groupId}\``);
  }

  if (captionText) {
    metaLines.push(
      `📝 *Caption:* ${escapeMarkdown(captionText.slice(0, 500))}`
    );
  }

  const metaText = metaLines.join("\n");

  try {
    await bot.api.forwardMessage(FEEDBACK_CHAT_ID, chat.id, msg.message_id);
    await bot.api.sendMessage(FEEDBACK_CHAT_ID, metaText, {
      parse_mode: "Markdown",
    });
    await ctx.reply(
      "✅ *Feedback sent!* Thank you for helping improve StarzAI.\n\n" +
        `Your feedback ID is \`${feedbackId}\`. The team may reply to you using this ID.`,
      { parse_mode: "Markdown" }
    );
  } catch (e) {
    console.error("Feedback forward error:", e.message);
    await ctx.reply("❌ Failed to send feedback. Please try again later.");
  }

  return true;
}

bot.callbackQuery("partner_set_name", async (ctx) => {
  await ctx.answerCallbackQuery();
  pendingPartnerInput.set(String(ctx.from.id), { field: "name", timestamp: Date.now() });
  await ctx.reply("📝 *Enter partner name:*\n\n_Example: Luna, Alex, Shadow_", { parse_mode: "Markdown" });
});

bot.callbackQuery("partner_set_personality", async (ctx) => {
  await ctx.answerCallbackQuery();
  pendingPartnerInput.set(String(ctx.from.id), { field: "personality", timestamp: Date.now() });
  await ctx.reply("🎭 *Enter personality traits:*\n\n_Example: cheerful, witty, caring, playful_", { parse_mode: "Markdown" });
});

bot.callbackQuery("partner_set_background", async (ctx) => {
  await ctx.answerCallbackQuery();
  pendingPartnerInput.set(String(ctx.from.id), { field: "background", timestamp: Date.now() });
  await ctx.reply("📖 *Enter background/backstory:*\n\n_Example: A mysterious traveler from another dimension who loves stargazing_", { parse_mode: "Markdown" });
});

bot.callbackQuery("partner_set_style", async (ctx) => {
  await ctx.answerCallbackQuery();
  pendingPartnerInput.set(String(ctx.from.id), { field: "style", timestamp: Date.now() });
  await ctx.reply("💬 *Enter speaking style:*\n\n_Example: speaks softly with poetic phrases, uses lots of emojis_", { parse_mode: "Markdown" });
});

bot.callbackQuery("open_partner", async (ctx) => {
  await ctx.answerCallbackQuery();
  const partner = getPartner(ctx.from.id);
  try {
    await ctx.editMessageText(
      buildPartnerSetupMessage(partner),
      { parse_mode: "Markdown", reply_markup: buildPartnerKeyboard(partner) }
    );
  } catch (e) {
    await ctx.reply(
      buildPartnerSetupMessage(partner),
      { parse_mode: "Markdown", reply_markup: buildPartnerKeyboard(partner) }
    );
  }
});

bot.callbackQuery("do_stats", async (ctx) => {
  await ctx.answerCallbackQuery();
  const u = ctx.from;
  const userRecord = getUserRecord(u.id);
  
  if (!userRecord) {
    return ctx.answerCallbackQuery({ text: "❌ Not registered yet!", show_alert: true });
  }
  
  const model = ensureChosenModelValid(u.id);
  const memberSince = userRecord.createdAt ? new Date(userRecord.createdAt).toLocaleDateString() : "Unknown";
  const messages = userRecord.messageCount || 0;
  const queries = userRecord.inlineQueryCount || 0;
  
  const stats = [
    `📊 *Your Stats*`,
    ``,
    `👤 *User ID:* \`${u.id}\``,
    `🌟 *Tier:* ${userRecord.tier?.toUpperCase() || "FREE"}`,
    `🤖 *Model:* ${model.split("/").pop()}`,
    ``,
    `💬 *Messages:* ${messages}`,
    `⌨️ *Inline queries:* ${queries}`,
    `📅 *Member since:* ${memberSince}`,
  ].join("\n");
  
  try {
    await ctx.editMessageText(stats, { parse_mode: "Markdown", reply_markup: backToMainKeyboard() });
  } catch (e) {
    await ctx.reply(stats, { parse_mode: "Markdown", reply_markup: backToMainKeyboard() });
  }
});

bot.callbackQuery("partner_chat", async (ctx) => {
  await ctx.answerCallbackQuery();
  const u = ctx.from;
  const partner = getPartner(u.id);
  
  if (!partner?.name) {
    return ctx.reply("❌ Please set a name first!", { parse_mode: "Markdown" });
  }
  
  setPartner(u.id, { active: true });
  const updatedPartner = getPartner(u.id);
  await ctx.editMessageText(
    buildPartnerSetupMessage(updatedPartner),
    { parse_mode: "Markdown", reply_markup: buildPartnerKeyboard(updatedPartner) }
  );
  await ctx.reply(`🤝🏻 *${partner.name} is ready!*\n\nJust send messages and they'll respond in character.`, { parse_mode: "Markdown" });
});

bot.callbackQuery("partner_stop", async (ctx) => {
  await ctx.answerCallbackQuery();
  const u = ctx.from;
  setPartner(u.id, { active: false });
  const partner = getPartner(u.id);
  
  await ctx.editMessageText(
    buildPartnerSetupMessage(partner),
    { parse_mode: "Markdown", reply_markup: buildPartnerKeyboard(partner) }
  );
});

bot.callbackQuery("partner_clearchat", async (ctx) => {
  await ctx.answerCallbackQuery({ text: "Chat history cleared!" });
  clearPartnerChat(ctx.from.id);
  const partner = getPartner(ctx.from.id);
  await ctx.editMessageText(
    buildPartnerSetupMessage(partner),
    { parse_mode: "Markdown", reply_markup: buildPartnerKeyboard(partner) }
  );
});

bot.callbackQuery("partner_delete", async (ctx) => {
  await ctx.answerCallbackQuery({ text: "Partner deleted" });
  clearPartner(ctx.from.id);
  await ctx.editMessageText(
    buildPartnerSetupMessage(null),
    { parse_mode: "Markdown", reply_markup: buildPartnerKeyboard(null) }
  );
});

// Helper for time ago
function getTimeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// =====================
// MODEL CATEGORY HELPERS
// =====================

// Build category selection keyboard (main menu)
function modelCategoryKeyboard(userTier) {
  const rows = [];
  
  // Always show FREE
  rows.push([{ text: "🆓 Free Models", callback_data: "model_cat:free" }]);
  
  // Show PREMIUM if user has access
  if (userTier === "premium" || userTier === "ultra") {
    rows.push([{ text: "⭐ Premium Models", callback_data: "model_cat:premium" }]);
  }
  
  // Show ULTRA if user has access
  if (userTier === "ultra") {
    rows.push([{ text: "💎 Ultra Models", callback_data: "model_cat:ultra" }]);
  }
  
  // Add back to main menu button
  rows.push([{ text: "« Back to Menu", callback_data: "menu_back" }]);
  
  return { inline_keyboard: rows };
}

// Build model list keyboard for a specific category
function modelListKeyboard(category, currentModel, userTier, page = 0) {
  const rows = [];
  let models = [];
  
  // Combine MegaLLM and GitHub Models for each category
  if (category === "free") {
    models = [...FREE_MODELS, ...GITHUB_FREE_MODELS];
  } else if (category === "premium" && (userTier === "premium" || userTier === "ultra")) {
    models = [...PREMIUM_MODELS, ...GITHUB_PREMIUM_MODELS];
  } else if (category === "ultra" && userTier === "ultra") {
    models = [...ULTRA_MODELS, ...GITHUB_ULTRA_MODELS];
  }
  
  const MODELS_PER_PAGE = 4;
  const totalPages = Math.ceil(models.length / MODELS_PER_PAGE);
  const startIdx = page * MODELS_PER_PAGE;
  const pageModels = models.slice(startIdx, startIdx + MODELS_PER_PAGE);
  
  // Add model buttons (1 per row for clean mobile display)
  pageModels.forEach((m) => {
    const short = m.split("/").pop();
    rows.push([{
      text: `${m === currentModel ? "✅ " : ""}${short}`,
      callback_data: `setmodel:${m}`,
    }]);
  });
  
  // Pagination row
  if (totalPages > 1) {
    const navRow = [];
    if (page > 0) {
      navRow.push({ text: "◀️", callback_data: `model_page:${category}:${page - 1}` });
    }
    navRow.push({ text: `${page + 1}/${totalPages}`, callback_data: "noop" });
    if (page < totalPages - 1) {
      navRow.push({ text: "▶️", callback_data: `model_page:${category}:${page + 1}` });
    }
    rows.push(navRow);
  }
  
  // Add back button
  rows.push([{ text: "← Back", callback_data: "model_back" }]);
  
  return { inline_keyboard: rows };
}

// Category emoji/title helper
function categoryTitle(category) {
  if (category === "free") return "🆓 FREE";
  if (category === "premium") return "⭐ PREMIUM";
  if (category === "ultra") return "💎 ULTRA";
  return category.toUpperCase();
}

bot.command("model", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  if (!(await enforceCommandCooldown(ctx))) return;

  const u = ensureUser(ctx.from.id, ctx.from);
  const current = ensureChosenModelValid(ctx.from.id);

  await ctx.reply(
    `👤 Plan: *${u.tier.toUpperCase()}*\n🤖 Current: \`${current}\`\n\nSelect a category:`,
    {
      parse_mode: "Markdown",
      reply_markup: modelCategoryKeyboard(u.tier),
      reply_to_message_id: ctx.message?.message_id,
    }
  );
});

bot.command("whoami", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  if (!(await enforceCommandCooldown(ctx))) return;

  const u = ensureUser(ctx.from.id, ctx.from);
  const model = ensureChosenModelValid(ctx.from.id);
  const stats = u.stats || {};

  const safeUsername = u.username ? escapeMarkdown("@" + u.username) : "_not set_";
  const safeName = u.firstName ? escapeMarkdown(u.firstName) : "_not set_";
  const shortModel = model.split("/").pop();
  // Show model as-is inside code block to avoid ugly backslashes like grok\-4\.1
  const safeModel = shortModel;

  const isOwnerUser = OWNER_IDS.has(String(ctx.from.id));
  const tierLabel = isOwnerUser
    ? `${u.tier.toUpperCase()} (OWNER)`
    : (u.tier || "free").toUpperCase();

  const lines = [
    `👤 *Your Profile*`,
    ``,
    `🆔 User ID: \`${ctx.from.id}\``,
    `📛 Username: ${safeUsername}`,
    `👋 Name: ${safeName}`,
    ``,
    `🎫 *Tier:* ${tierLabel}`,
    `🤖 *Model:* \`${safeModel}\``,
    ``,
    `📊 *Usage Stats*`,
    `• Messages: ${stats.totalMessages || 0}`,
    `• Inline queries: ${stats.totalInlineQueries || 0}`,
    `• Last active: ${stats.lastActive ? new Date(stats.lastActive).toLocaleString() : "_unknown_"}`,
    ``,
    `📅 Registered: ${u.registeredAt ? new Date(u.registeredAt).toLocaleDateString() : "_unknown_"}`,
  ];

  await ctx.reply(lines.join("\n"), {
    parse_mode: "Markdown",
    reply_to_message_id: ctx.message?.message_id,
  });
});

// =====================
// OWNER COMMANDS
// =====================

// Bot status command
async function sendOwnerStatus(ctx) {
  const totalUsers = Object.keys(usersDb.users).length;
  const usersByTier = { free: 0, premium: 0, ultra: 0 };
  let totalMessages = 0;
  let totalInline = 0;
  let activeToday = 0;
  let activeWeek = 0;
  let bannedCount = 0;
  
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const weekMs = 7 * dayMs;
  
  for (const [, user] of Object.entries(usersDb.users)) {
    usersByTier[user.tier] = (usersByTier[user.tier] || 0) + 1;
    if (user.banned) {
      bannedCount++;
    }
    if (user.stats) {
      totalMessages += user.stats.totalMessages || 0;
      totalInline += user.stats.totalInlineQueries || 0;
      
      const lastActive = new Date(user.stats.lastActive).getTime();
      if (now - lastActive < dayMs) activeToday++;
      if (now - lastActive < weekMs) activeWeek++;
    }
  }
  
  const inlineSessions = Object.keys(inlineSessionsDb.sessions).length;
  const uptime = process.uptime();
  const uptimeStr = `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`;

  // Derive per-tier cooldowns from the same helper used by enforceCommandCooldown
  const freeCooldown = getCommandCooldownSecondsForTier("free");
  const premiumCooldown = getCommandCooldownSecondsForTier("premium");
  const ultraCooldown = getCommandCooldownSecondsForTier("ultra");
  const ownerCooldown = getCommandCooldownSecondsForTier("owner");

  const lines = [
    `📊 *Bot Status*`,
    ``,
    `⏱ *Uptime:* ${uptimeStr}`,
    `🖥 *Memory:* ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
    ``,
    `👥 *Users*`,
    `• Total: ${totalUsers}`,
    `• Free: ${usersByTier.free}`,
    `• Premium: ${usersByTier.premium}`,
    `• Ultra: ${usersByTier.ultra}`,
    `• Banned: ${bannedCount}`,
    ``,
    `💬 *Messages*`,
    `• Total messages: ${totalMessages}`,
    `• Inline queries: ${totalInline}`,
    `• Active today: ${activeToday}`,
    `• Active last 7 days: ${activeWeek}`,
    ``,
    `💾 *Inline Sessions:* ${inlineSessions}`,
    ``,
    `⚙️ *Rate limiting*`,
    `• Global: ${RATE_LIMIT_PER_MINUTE}/min`,
    `• Command cooldowns:`,
    `  - Free: ${freeCooldown}s`,
    `  - Premium: ${premiumCooldown}s`,
    `  - Ultra: ${ultraCooldown}s`,
    `  - Owners: ${ownerCooldown > 0 ? ownerCooldown + "s" : "none"}`,
  ];
  
  // Add Dev Status button for detailed API diagnostics
  const keyboard = new InlineKeyboard()
    .text("🔧 Dev Status", "dev_status");
  
  await ctx.reply(lines.join("\n"), { 
    parse_mode: "Markdown",
    reply_markup: keyboard
  });
}

bot.command("status", async (ctx) => {
  if (!isOwner(ctx)) return ctx.reply("🚫 Owner only.");
  await sendOwnerStatus(ctx);
});

// Alias: /gstat (global stats)
bot.command("gstat", async (ctx) => {
  if (!isOwner(ctx)) return ctx.reply("🚫 Owner only.");
  await sendOwnerStatus(ctx);
});

// /qrlogo - set global QR center logo (owner only)
bot.command("qrlogo", async (ctx) => {
  if (!isOwner(ctx)) return ctx.reply("🚫 Owner only.");

  const msg = ctx.message;
  const replied = msg?.reply_to_message;
  const photos = replied?.photo;

  if (!photos || photos.length === 0) {
    return ctx.reply(
      "🖼️ Reply to a photo with <code>/qrlogo</code> to set it as the global QR logo.\n\n" +
        "This logo will appear in the center of QR codes when the logo overlay is enabled in <code>/qs</code>.",
      { parse_mode: "HTML", reply_to_message_id: msg?.message_id }
    );
  }

  try {
    const largest = photos[photos.length - 1];
    // We only need the file_id; Telegram will handle caching
    prefsDb.qrLogo = {
      fileId: largest.file_id,
      updatedAt: new Date().toISOString(),
      setBy: String(ctx.from?.id || ""),
    };
    savePrefs();

    await ctx.reply(
      "✅ QR logo updated.\n\n" +
        "When users enable the logo overlay in <code>/qs</code>, this image will appear in the center of generated QR codes.",
      { parse_mode: "HTML", reply_to_message_id: msg?.message_id }
    );
  } catch (e) {
    console.error("QR logo update error:", e);
    await ctx.reply("❌ Failed to set QR logo. Please try again.", {
      reply_to_message_id: msg?.message_id,
    });
  }
});

// /qa - set global QR art background (owner only)
bot.command("qa", async (ctx) => {
  if (!isOwner(ctx)) return ctx.reply("🚫 Owner only.");

  const msg = ctx.message;
  const replied = msg?.reply_to_message;
  const photos = replied?.photo;

  if (!photos || photos.length === 0) {
    return ctx.reply(
      "🎨 Reply to a photo with <code>/qa</code> to set it as the global QR art background.\n\n" +
        "This image will be used as the full-canvas art in Art mode (see <code>/qs</code>). " +
        "The underlying QR pattern stays intact for reliable scanning.",
      { parse_mode: "HTML", reply_to_message_id: msg?.message_id }
    );
  }

  try {
    const largest = photos[photos.length - 1];
    prefsDb.qrArt = {
      fileId: largest.file_id,
      updatedAt: new Date().toISOString(),
      setBy: String(ctx.from?.id || ""),
    };
    savePrefs();

    await ctx.reply(
      "✅ QR art background updated.\n\n" +
        "When Art mode is enabled in <code>/qs</code>, this image will appear behind your QR codes.",
      { parse_mode: "HTML", reply_to_message_id: msg?.message_id }
    );
  } catch (e) {
    console.error("QR art update error:", e);
    await ctx.reply("❌ Failed to set QR art background. Please try again.", {
      reply_to_message_id: msg?.message_id,
    });
  }
});

// /qaclear - clear QR art background (owner only)
bot.command("qaclear", async (ctx) => {
  if (!isOwner(ctx)) return ctx.reply("🚫 Owner only.");

  delete prefsDb.qrArt;
  savePrefs();

  await ctx.reply(
    "🧹 QR art background cleared.\n\n" +
      "Art mode will now fall back to a simple themed background until you set a new image with <code>/qa</code>.",
    { parse_mode: "HTML", reply_to_message_id: ctx.message?.message_id }
  );
});

// Dev Status callback - detailed API diagnostics (owner only)
bot.callbackQuery("dev_status", async (ctx) => {
  const userId = ctx.from?.id;
  if (!OWNER_IDS.has(String(userId))) {
    return ctx.answerCallbackQuery({ text: "🚫 Owner only", show_alert: true });
  }
  
  await ctx.answerCallbackQuery({ text: "🔧 Loading diagnostics..." });
  
  try {
    // Get LLM provider stats
    const llmStats = getProviderStats();
  
  // Get DeAPI stats with balances
  const deapiStats = deapiKeyManager.hasKeys() 
    ? await deapiKeyManager.getStatsWithBalances() 
    : deapiKeyManager.getStats();
  
  const healthEmoji = {
    'excellent': '🟢',
    'good': '🟡',
    'degraded': '🟠',
    'critical': '🔴',
    'unknown': '⚪'
  };
  
  const lines = [
    `🔧 *Dev Status - API Diagnostics*`,
    ``,
    `🤖 *LLM Providers*`,
  ];
  
  // GitHub Models stats
  const github = llmStats.github;
  if (github) {
    lines.push(``);
    lines.push(`*GitHub Models* ${healthEmoji[github.health] || '⚪'}`);
    lines.push(`• Status: ${github.enabled ? '✅ Enabled' : '❌ Disabled'}`);
    lines.push(`• Calls: ${github.calls} (${github.successRate}% success)`);
    lines.push(`• Tokens: ${github.totalTokens.toLocaleString()}`);
    if (github.avgResponseTime > 0) {
      lines.push(`• Avg response: ${github.avgResponseTime}ms`);
    }
    if (github.lastUsed) {
      lines.push(`• Last used: ${new Date(github.lastUsed).toLocaleTimeString()}`);
    }
    if (github.lastError && github.health !== 'excellent') {
      lines.push(`• Last error: \`${github.lastError.slice(0, 50)}\``);
    }
  }
  
  // MegaLLM stats
  const megallm = llmStats.megallm;
  if (megallm) {
    lines.push(``);
    lines.push(`*MegaLLM* ${healthEmoji[megallm.health] || '⚪'}`);
    lines.push(`• Status: ${megallm.enabled ? '✅ Enabled' : '❌ Disabled'}`);
    lines.push(`• Calls: ${megallm.calls} (${megallm.successRate}% success)`);
    lines.push(`• Tokens: ${megallm.totalTokens.toLocaleString()}`);
    if (megallm.avgResponseTime > 0) {
      lines.push(`• Avg response: ${megallm.avgResponseTime}ms`);
    }
    if (megallm.lastUsed) {
      lines.push(`• Last used: ${new Date(megallm.lastUsed).toLocaleTimeString()}`);
    }
    if (megallm.lastError && megallm.health !== 'excellent') {
      lines.push(`• Last error: \`${megallm.lastError.slice(0, 50)}\``);
    }
  }
  
  // DeAPI Image Generation stats
  if (deapiStats.totalKeys > 0) {
    let totalBalance = 0;
    let balanceCount = 0;
    for (const key of deapiStats.keys) {
      if (key.balance !== null && key.balance !== undefined) {
        totalBalance += parseFloat(key.balance) || 0;
        balanceCount++;
      }
    }
    
    const overallHealth = deapiStats.disabledKeys === 0 ? 'excellent' : 
      (deapiStats.activeKeys > 0 ? 'degraded' : 'critical');
    
    lines.push(``);
    lines.push(`🎨 *Image Generation* ${healthEmoji[overallHealth]}`);
    lines.push(`• Keys: ${deapiStats.activeKeys}/${deapiStats.totalKeys} active`);
    if (balanceCount > 0) {
      lines.push(`• Total credits: 💰${totalBalance.toFixed(2)}`);
    }
    lines.push(`• Total generations: ${deapiKeyManager.totalImageGenerations}`);
    lines.push(`• Session calls: ${deapiStats.totalCalls} (${deapiStats.totalCalls > 0 ? Math.round((deapiStats.totalSuccesses / deapiStats.totalCalls) * 100) : 100}% success)`);
    
    // Individual key details
    if (deapiStats.keys.length > 0) {
      lines.push(``);
      lines.push(`*Key Details:*`);
      for (const key of deapiStats.keys) {
        const status = key.disabled ? '🔴' : '🟢';
        const balanceStr = key.balance !== null && key.balance !== undefined 
          ? `💰${parseFloat(key.balance).toFixed(2)}` 
          : '';
        lines.push(`${status} \`${key.id}\` ${balanceStr}`);
        lines.push(`   ${key.successRate}% • ${key.calls} calls`);
        if (key.disabled && key.disabledUntil) {
          const remaining = Math.ceil((key.disabledUntil - Date.now()) / 1000 / 60);
          lines.push(`   ⏳ Re-enables in ${remaining}m`);
        }
      }
    }
  } else {
    lines.push(``);
    lines.push(`🎨 *Image Generation:* ❌ Not configured`);
  }
  
  // System health summary
  const totalProviders = Object.keys(llmStats).length + (deapiStats.totalKeys > 0 ? 1 : 0);
  const healthyProviders = Object.values(llmStats).filter(s => s.enabled && (s.health === 'excellent' || s.health === 'good')).length
    + (deapiStats.activeKeys > 0 ? 1 : 0);
  
  lines.push(``);
  lines.push(`📊 *System Health:* ${healthyProviders}/${totalProviders} services healthy`);
  
  // Back button
  const keyboard = new InlineKeyboard()
    .text("⬅️ Back to Status", "back_to_status");
  
  try {
    await ctx.editMessageText(lines.join("\n"), { 
      parse_mode: "Markdown",
      reply_markup: keyboard
    });
  } catch (e) {
    // If edit fails, send new message
    await ctx.reply(lines.join("\n"), { 
      parse_mode: "Markdown",
      reply_markup: keyboard
    });
  }
  } catch (error) {
    console.error("Dev status error:", error);
    try {
      await ctx.reply(
        "❌ *Error loading diagnostics*\n\n" +
        `\`${error.message?.slice(0, 100) || 'Unknown error'}\`\n\n` +
        "Please try again.",
        { parse_mode: "Markdown" }
      );
    } catch (e) {
      // Ignore
    }
  }
});

// Back to status callback
bot.callbackQuery("back_to_status", async (ctx) => {
  const userId = ctx.from?.id;
  if (!OWNER_IDS.has(String(userId))) {
    return ctx.answerCallbackQuery({ text: "🚫 Owner only", show_alert: true });
  }
  
  await ctx.answerCallbackQuery();
  
  // Rebuild status message
  const totalUsers = Object.keys(usersDb.users).length;
  const usersByTier = { free: 0, premium: 0, ultra: 0 };
  let totalMessages = 0;
  let totalInline = 0;
  let activeToday = 0;
  let activeWeek = 0;
  let bannedCount = 0;
  
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const weekMs = 7 * dayMs;
  
  for (const [, user] of Object.entries(usersDb.users)) {
    usersByTier[user.tier] = (usersByTier[user.tier] || 0) + 1;
    if (user.banned) bannedCount++;
    if (user.stats) {
      totalMessages += user.stats.totalMessages || 0;
      totalInline += user.stats.totalInlineQueries || 0;
      const lastActive = new Date(user.stats.lastActive).getTime();
      if (now - lastActive < dayMs) activeToday++;
      if (now - lastActive < weekMs) activeWeek++;
    }
  }
  
  const inlineSessions = Object.keys(inlineSessionsDb.sessions).length;
  const uptime = process.uptime();
  const uptimeStr = `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`;
  const freeCooldown = getCommandCooldownSecondsForTier("free");
  const premiumCooldown = getCommandCooldownSecondsForTier("premium");
  const ultraCooldown = getCommandCooldownSecondsForTier("ultra");
  const ownerCooldown = getCommandCooldownSecondsForTier("owner");

  const lines = [
    `📊 *Bot Status*`,
    ``,
    `⏱ *Uptime:* ${uptimeStr}`,
    `🖥 *Memory:* ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
    ``,
    `👥 *Users*`,
    `• Total: ${totalUsers}`,
    `• Free: ${usersByTier.free}`,
    `• Premium: ${usersByTier.premium}`,
    `• Ultra: ${usersByTier.ultra}`,
    `• Banned: ${bannedCount}`,
    ``,
    `💬 *Messages*`,
    `• Total messages: ${totalMessages}`,
    `• Inline queries: ${totalInline}`,
    `• Active today: ${activeToday}`,
    `• Active last 7 days: ${activeWeek}`,
    ``,
    `💾 *Inline Sessions:* ${inlineSessions}`,
    ``,
    `⚙️ *Rate limiting*`,
    `• Global: ${RATE_LIMIT_PER_MINUTE}/min`,
    `• Command cooldowns:`,
    `  - Free: ${freeCooldown}s`,
    `  - Premium: ${premiumCooldown}s`,
    `  - Ultra: ${ultraCooldown}s`,
    `  - Owners: ${ownerCooldown > 0 ? ownerCooldown + "s" : "none"}`,
  ];
  
  const keyboard = new InlineKeyboard()
    .text("🔧 Dev Status", "dev_status");
  
  try {
    await ctx.editMessageText(lines.join("\n"), { 
      parse_mode: "Markdown",
      reply_markup: keyboard
    });
  } catch (e) {
    await ctx.reply(lines.join("\n"), { 
      parse_mode: "Markdown",
      reply_markup: keyboard
    });
  }
});

// User info command
bot.command("info", async (ctx) => {
  if (!isOwner(ctx)) return ctx.reply("🚫 Owner only.");
  
  const args = (ctx.message?.text || "").split(/\s+/).slice(1);
  if (args.length < 1) return ctx.reply("Usage: /info &lt;userId&gt;");
  
  const [targetId] = args;
  const user = getUserRecord(targetId);
  
  if (!user) {
    return ctx.reply(`❌ User ${targetId} not found.`);
  }
  
  const stats = user.stats || {};
  const inlineSession = inlineSessionsDb.sessions[targetId];
  const now = Date.now();
  
  // Use HTML to avoid Markdown parsing issues with usernames
  const lines = [
    `👤 <b>User Info</b>`,
    ``,
    `🆔 ID: <code>${targetId}</code>`,
    `📛 Username: ${user.username ? "@" + escapeHTML(user.username) : "<i>not set</i>"}`,
    `👋 Name: ${escapeHTML(user.firstName) || "<i>not set</i>"}`,
    ``,
    `🎫 <b>Tier:</b> ${user.tier?.toUpperCase() || "FREE"}`,
    `🤖 <b>Model:</b> <code>${escapeHTML(user.model) || "default"}</code>`,
    `🚫 <b>Banned:</b> ${user.banned ? "YES" : "no"}`,
  ];

  if (user.banned) {
    if (user.bannedAt) {
      lines.push(`⏰ <b>Banned at:</b> ${new Date(user.bannedAt).toLocaleString()}`);
    }
    if (user.bannedBy) {
      lines.push(`👮 <b>Banned by:</b> <code>${escapeHTML(String(user.bannedBy))}</code>`);
    }
    if (user.banReason) {
      lines.push(`📄 <b>Reason:</b> ${escapeHTML(user.banReason)}`);
    }
    lines.push(``);
  }

  if (user.mute) {
    const m = user.mute;
    const scope = m.scope || "all";
    const until = m.until ? new Date(m.until).toLocaleString() : "unknown";
    const active = !m.until || now <= m.until;
    const status = active ? "ACTIVE" : "expired";
    lines.push(
      `🔇 <b>Mute:</b> ${status}`,
      `• Scope: ${escapeHTML(scope)}`,
      `• Until: ${escapeHTML(until)}`
    );
    if (m.reason) {
      lines.push(`• Reason: ${escapeHTML(m.reason)}`);
    }
    if (m.mutedBy) {
      lines.push(`• Muted by: <code>${escapeHTML(String(m.mutedBy))}</code>`);
    }
    lines.push(``);
  }

  if (Array.isArray(user.warnings) && user.warnings.length > 0) {
    const count = user.warnings.length;
    const last = user.warnings[user.warnings.length - 1] || {};
    lines.push(`⚠️ <b>Warnings:</b> ${count}`);
    if (last.reason) {
      lines.push(`• Last reason: ${escapeHTML(last.reason)}`);
    }
    if (last.at) {
      lines.push(`• Last at: ${new Date(last.at).toLocaleString()}`);
    }
    if (last.by) {
      lines.push(`• Last by: <code>${escapeHTML(String(last.by))}</code>`);
    }
    lines.push(``);
  }

  lines.push(
    `📊 &lt;b&gt;Usage Stats&lt;/b&gt;`,
    `• Messages: ${stats.totalMessages || 0}`,
    `• Inline queries: ${stats.totalInlineQueries || 0}`,
    `• Last model: ${escapeHTML(stats.lastModel) || "unknown"}`,
    `• Last active: ${stats.lastActive ? new Date(stats.lastActive).toLocaleString() : "unknown"}`,
    ``,
    `💬 &lt;b&gt;Inline Session&lt;/b&gt;`,
    `• History: ${inlineSession?.history?.length || 0} messages`,
    `• Model: ${escapeHTML(inlineSession?.model) || "none"}`,
    ``,
    `📅 Registered: ${user.registeredAt ? new Date(user.registeredAt).toLocaleString() : "unknown"}`,
    `🔑 Models: ${allModelsForTier(user.tier || "free").length} (${user.tier || "free"} tier)`,
  );
  
  await ctx.reply(lines.join("\n"), { parse_mode: "HTML" });
});

bot.command("grant", async (ctx) => {
  if (!isOwner(ctx)) return ctx.reply("🚫 Owner only.");

  const args = (ctx.message?.text || "").split(/\s+/).slice(1);
  if (args.length < 2) return ctx.reply("Usage: /grant <userId> <free|premium|ultra>");

  const [targetId, tierArg] = args;
  const tier = tierArg.toLowerCase();
  if (!["free", "premium", "ultra"].includes(tier)) {
    return ctx.reply("⚠️ Tier must be free, premium, or ultra.");
  }

  const rec = ensureUser(targetId);
  const currentTier = rec.tier || "free";
  
  // Check if user already has this tier
  if (currentTier === tier) {
    const tierEmoji = tier === "ultra" ? "💎" : tier === "premium" ? "⭐" : "🆓";
    return ctx.reply(`${tierEmoji} User ${targetId} is already ${tier.toUpperCase()}.`);
  }
  
  const oldTier = currentTier;
  const isUpgrade = ["free", "premium", "ultra"].indexOf(tier) > ["free", "premium", "ultra"].indexOf(oldTier);
  
  rec.tier = tier;
  rec.role = tier;
  saveUsers();

  const tierEmoji = tier === "ultra" ? "💎" : tier === "premium" ? "⭐" : "🆓";
  const arrow = isUpgrade ? "⬆️" : "⬇️";
  await ctx.reply(`${arrow} User ${targetId}: ${oldTier.toUpperCase()} → ${tierEmoji} ${tier.toUpperCase()}`);
  
  // Send congratulations message to the user if upgraded
  if (isUpgrade && (tier === "premium" || tier === "ultra")) {
    try {
      const congratsMsg = tier === "ultra" 
        ? [
            `🎉 *Congratulations!* 🎉`,
            ``,
            `You've been upgraded to 💎 *ULTRA* tier!`,
            ``,
            `✨ *New features unlocked:*`,
            `• Access to ALL models including GPT-5, Gemini 2.5 Pro, Grok 4.1`,
            `• Fastest response times`,
            `• Priority support`,
            ``,
            `Use /model to explore your new models!`,
          ].join("\n")
        : [
            `🎉 *Congratulations!* 🎉`,
            ``,
            `You've been upgraded to ⭐ *PREMIUM* tier!`,
            ``,
            `✨ *New features unlocked:*`,
            `• Access to premium models like Claude, GLM, Mistral`,
            `• Better response quality`,
            `• Priority support`,
            ``,
            `Use /model to explore your new models!`,
          ].join("\n");
      
      await bot.api.sendMessage(targetId, congratsMsg, { parse_mode: "Markdown" });
      await ctx.reply(`✅ Congratulations message sent to user.`);
    } catch (e) {
      console.error("Failed to send congrats:", e.message);
      await ctx.reply(`⚠️ Could not send message to user (they may need to start the bot first).`);
    }
  }
});

bot.command("revoke", async (ctx) => {
  if (!isOwner(ctx)) return ctx.reply("Owner only.");

  const args = (ctx.message?.text || "").split(/\s+/).slice(1);
  if (args.length < 1) return ctx.reply("Usage: /revoke <userId>");

  const [targetId] = args;
  const rec = ensureUser(targetId);
  rec.tier = "free";
  rec.role = "free";
  saveUsers();

  await ctx.reply(`User ${targetId} reverted to free.`);
});

bot.command("allow", async (ctx) => {
  if (!isOwner(ctx)) return ctx.reply("Owner only.");

  const args = (ctx.message?.text || "").split(/\s+/).slice(1);
  if (args.length < 2) return ctx.reply("Usage: /allow <userId> <modelId>");

  const [targetId, modelId] = args;
  const rec = ensureUser(targetId);
  if (!rec.allowedModels.includes(modelId)) rec.allowedModels.push(modelId);
  saveUsers();

  await ctx.reply(`Allowed model ${modelId} for user ${targetId}.`);
});

bot.command("deny", async (ctx) => {
  if (!isOwner(ctx)) return ctx.reply("Owner only.");

  const args = (ctx.message?.text || "").split(/\s+/).slice(1);
  if (args.length < 2) return ctx.reply("Usage: /deny <userId> <modelId>");

  const [targetId, modelId] = args;
  const rec = ensureUser(targetId);
  rec.allowedModels = rec.allowedModels.filter((m) => m !== modelId);
  saveUsers();

  await ctx.reply(`Denied model ${modelId} for user ${targetId}.`);
});

bot.command("allowgroup", async (ctx) => {
  if (!isOwner(ctx)) return ctx.reply("🚫 Owner only.");

  const args = (ctx.message?.text || "").split(/\s+/).slice(1);
  if (args.length < 1) {
    return ctx.reply("Usage: /allowgroup <chatId> [note]");
  }

  const [chatIdRaw, ...noteParts] = args;
  const chatId = chatIdRaw.trim();
  const note = noteParts.join(" ").trim() || null;

  if (!chatId) {
    return ctx.reply("Usage: /allowgroup <chatId> [note]");
  }

  setGroupAuthorization(chatId, true, {
    note,
    addedBy: ctx.from?.id || null,
  });

  await ctx.reply(
    `✅ Group ${chatId} authorized.` + (note ? `\nNote: ${note}` : "")
  );
});

// Alias: /add <chatId> <note>  (owner-facing shorthand)
bot.command("add", async (ctx) => {
  if (!isOwner(ctx)) return ctx.reply("🚫 Owner only.");

  const args = (ctx.message?.text || "").split(/\s+/).slice(1);
  if (args.length < 1) {
    return ctx.reply("Usage: /add <chatId> [note]");
  }

  const [chatIdRaw, ...noteParts] = args;
  const chatId = chatIdRaw.trim();
  const note = noteParts.join(" ").trim() || null;

  if (!chatId) {
    return ctx.reply("Usage: /add <chatId> [note]");
  }

  setGroupAuthorization(chatId, true, {
    note,
    addedBy: ctx.from?.id || null,
  });

  await ctx.reply(
    `✅ Group ${chatId} authorized.` + (note ? `\nNote: ${note}` : "")
  );
});

bot.command("denygroup", async (ctx) => {
  if (!isOwner(ctx)) return ctx.reply("🚫 Owner only.");

  const args = (ctx.message?.text || "").split(/\s+/).slice(1);
  if (args.length < 1) {
    return ctx.reply("Usage: /denygroup <chatId> [reason]");
  }

  const [chatIdRaw, ...reasonParts] = args;
  const chatId = chatIdRaw.trim();
  const reason = reasonParts.join(" ").trim() || null;

  if (!chatId) {
    return ctx.reply("Usage: /denygroup <chatId> [reason]");
  }

  setGroupAuthorization(chatId, false, {
    note: reason,
    addedBy: ctx.from?.id || null,
  });

  await ctx.reply(
    `🚫 Group ${chatId} blocked.` + (reason ? `\nReason: ${reason}` : "")
  );
});

// Alias: /rem <chatId> <reason>  (owner-facing shorthand)
bot.command("rem", async (ctx) => {
  if (!isOwner(ctx)) return ctx.reply("🚫 Owner only.");

  const args = (ctx.message?.text || "").split(/\s+/).slice(1);
  if (args.length < 1) {
    return ctx.reply("Usage: /rem <chatId> [reason]");
  }

  const [chatIdRaw, ...reasonParts] = args;
  const chatId = chatIdRaw.trim();
  const reason = reasonParts.join(" ").trim() || null;

  if (!chatId) {
    return ctx.reply("Usage: /rem <chatId> [reason]");
  }

  setGroupAuthorization(chatId, false, {
    note: reason,
    addedBy: ctx.from?.id || null,
  });

  await ctx.reply(
    `🚫 Group ${chatId} blocked.` + (reason ? `\nReason: ${reason}` : "")
  );
});

bot.command("grouplist", async (ctx) => {
  if (!isOwner(ctx)) return ctx.reply("🚫 Owner only.");

  ensurePrefsGroups();
  const entries = Object.entries(prefsDb.groups || {});
  if (entries.length === 0) {
    return ctx.reply("No groups recorded yet.");
  }

  const max = 50;
  const lines = ["🏘 *Groups (first 50)*", ""];
  for (const [id, g] of entries.slice(0, max)) {
    const status = g.allowed ? "✅ allowed" : "🚫 blocked";
    const title = g.title ? escapeMarkdown(g.title) : "_no title_";
    const note = g.note ? ` — ${escapeMarkdown(g.note)}` : "";
    lines.push(`• \`${id}\` – ${title} (${status})${note}`);
  }
  if (entries.length > max) {
    lines.push("", `...and ${entries.length - max} more.`, "");
  }

  await ctx.reply(lines.join("\n"), { parse_mode: "Markdown" });
});

// Alias: /glist  (owner-facing shorthand)
bot.command("glist", async (ctx) => {
  if (!isOwner(ctx)) return ctx.reply("🚫 Owner only.");

  ensurePrefsGroups();
  const entries = Object.entries(prefsDb.groups || {});
  if (entries.length === 0) {
    return ctx.reply("No groups recorded yet.");
  }

  const max = 50;
  const lines = ["🏘 *Groups (first 50)*", ""];
  for (const [id, g] of entries.slice(0, max)) {
    const status = g.allowed ? "✅ allowed" : "🚫 blocked";
    const title = g.title ? escapeMarkdown(g.title) : "_no title_";
    const note = g.note ? ` — ${escapeMarkdown(g.note)}` : "";
    lines.push(`• \`${id}\` – ${title} (${status})${note}`);
  }
  if (entries.length > max) {
    lines.push("", `...and ${entries.length - max} more.`, "");
  }

  await ctx.reply(lines.join("\n"), { parse_mode: "Markdown" });
});

bot.command("ban", async (ctx) => {
  if (!isOwner(ctx)) return ctx.reply("🚫 Owner only.");

  const args = (ctx.message?.text || "").split(/\s+/).slice(1);
  if (args.length < 1) return ctx.reply("Usage: /ban <userId> [reason]");

  const [targetId, ...reasonParts] = args;
  const reason = reasonParts.join(" ").trim();
  const targetIdStr = String(targetId);

  if (OWNER_IDS.has(targetIdStr)) {
    return ctx.reply("⚠️ Cannot ban an owner.");
  }

  const rec = ensureUser(targetIdStr);
  if (rec.banned) {
    return ctx.reply(`User ${targetIdStr} is already banned.`);
  }

  rec.banned = true;
  rec.bannedAt = new Date().toISOString();
  rec.bannedBy = String(ctx.from?.id || "");
  rec.banReason = reason || null;
  saveUsers();

  let msg = `🚫 User ${targetIdStr} has been banned.`;
  if (reason) msg += ` Reason: ${reason}`;
  await ctx.reply(msg);

  // Notify the banned user (if they have started the bot)
  try {
    const reasonLine = reason ? `\n\n*Reason:* ${escapeMarkdown(reason)}` : "";
    const contactLine =
      "\n\nIf you believe this is a mistake, you can share feedback using the button below.";
    const bannedMsg = [
      "🚫 *You have been banned from using StarzAI.*",
      reasonLine,
      contactLine,
    ].join("");

    const replyMarkup =
      FEEDBACK_CHAT_ID
        ? new InlineKeyboard().text("💡 Feedback", "menu_feedback")
        : undefined;

    await bot.api.sendMessage(targetIdStr, bannedMsg, {
      parse_mode: "Markdown",
      reply_markup: replyMarkup,
    });
  } catch (e) {
    // User might not have started the bot; ignore send error
  }
});

bot.command("unban", async (ctx) => {
  if (!isOwner(ctx)) return ctx.reply("🚫 Owner only.");

  const args = (ctx.message?.text || "").split(/\s+/).slice(1);
  if (args.length < 1) return ctx.reply("Usage: /unban <userId> [reason]");

  const [targetId, ...reasonParts] = args;
  const reason = reasonParts.join(" ").trim();
  const targetIdStr = String(targetId);
  const rec = ensureUser(targetIdStr);

  if (!rec.banned) {
    return ctx.reply(`User ${targetIdStr} is not banned.`);
  }

  rec.banned = false;
  delete rec.bannedAt;
  delete rec.bannedBy;
  delete rec.banReason;
  saveUsers();

  let ownerMsg = `✅ User ${targetIdStr} has been unbanned.`;
  if (reason) ownerMsg += ` Reason: ${reason}`;
  await ctx.reply(ownerMsg);

  // Notify the unbanned user
  try {
    const reasonLine = reason ? `\n\n*Reason:* ${escapeMarkdown(reason)}` : "";
    const baseLine = "✅ *You have been unbanned on StarzAI.*";
    const tailLine = "\n\nYou can use the bot again. Please follow the rules to avoid future bans.";
    const unbannedMsg = [baseLine, reasonLine, tailLine].join("");

    await bot.api.sendMessage(targetIdStr, unbannedMsg, { parse_mode: "Markdown" });
  } catch (e) {
    // User might not have started the bot; ignore send error
  }
});

function applyMuteToUser(targetIdStr, durationMs, scope, reason, mutedById) {
  const rec = ensureUser(targetIdStr);
  const now = Date.now();
  const until = now + durationMs;

  const muteData = {
    until,
    scope,
    reason: reason || null,
    mutedBy: mutedById ? String(mutedById) : "",
    createdAt: new Date(now).toISOString(),
  };

  if (scope === "tier") {
    muteData.previousTier = rec.tier;
    if (rec.tier !== "free") {
      rec.tier = "free";
      rec.role = "free";
    }
  }

  rec.mute = muteData;
  saveUsers();

  return { rec, until };
}

const WARN_SOFTBAN_THRESHOLD = 3;
const WARN_SOFTBAN_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

function extractUserIdFromFeedbackId(feedbackId) {
  if (!feedbackId || typeof feedbackId !== "string") return null;
  const match = feedbackId.match(/^FB-(\d+)-/);
  if (!match) return null;
  return match[1];
}

bot.command("warn", async (ctx) => {
  if (!isOwner(ctx)) return ctx.reply("🚫 Owner only.");

  const args = (ctx.message?.text || "").split(/\s+/).slice(1);
  if (args.length < 1) return ctx.reply("Usage: /warn <userId> [reason]");

  const [targetId, ...reasonParts] = args;
  const targetIdStr = String(targetId);
  const reason = reasonParts.join(" ").trim();

  if (OWNER_IDS.has(targetIdStr)) {
    return ctx.reply("⚠️ Cannot warn an owner.");
  }

  const rec = ensureUser(targetIdStr);
  if (!Array.isArray(rec.warnings)) rec.warnings = [];

  const warnEntry = {
    at: new Date().toISOString(),
    reason: reason || null,
    by: String(ctx.from?.id || ""),
  };
  rec.warnings.push(warnEntry);
  saveUsers();

  const totalWarnings = rec.warnings.length;

  let ownerMsg = `⚠️ Warning added for user ${targetIdStr}. Total warnings: ${totalWarnings}.`;
  if (reason) ownerMsg += ` Reason: ${reason}`;
  await ctx.reply(ownerMsg);

  // Auto softban on repeated warnings if not already banned/muted
  let autoSoftbanApplied = false;
  let autoSoftbanUntil = null;

  if (totalWarnings >= WARN_SOFTBAN_THRESHOLD && !rec.banned && !rec.mute) {
    const autoReason = reason
      ? `${reason} (auto-temporary mute after ${totalWarnings} warnings)`
      : `Auto-temporary mute after ${totalWarnings} warnings`;

    const { until } = applyMuteToUser(
      targetIdStr,
      WARN_SOFTBAN_DURATION_MS,
      "all",
      autoReason,
      ctx.from?.id
    );
    autoSoftbanApplied = true;
    autoSoftbanUntil = until;

    const humanUntil = new Date(until).toLocaleString();
    await ctx.reply(
      `🔇 Auto softban applied to user ${targetIdStr} for 24h (total mute). Ends at: ${humanUntil}.`
    );
  }

  // Notify user
  try {
    const reasonLine = reason ? `\n\n*Reason:* ${escapeMarkdown(reason)}` : "";
    const countLine = `\n\n*Total warnings:* ${totalWarnings}`;
    let extra = "";

    if (autoSoftbanApplied && autoSoftbanUntil) {
      const softbanUntilStr = new Date(autoSoftbanUntil).toLocaleString();
      extra =
        `\n\n🔇 *Temporary mute applied due to repeated warnings.*` +
        `\n_Mute ends at: ${escapeMarkdown(softbanUntilStr)}_`;
    }

    const msg =
      `⚠️ *You have received a warning on StarzAI.*` +
      reasonLine +
      countLine +
      extra;

    const replyMarkup =
      FEEDBACK_CHAT_ID
        ? new InlineKeyboard().text("💡 Feedback", "menu_feedback")
        : undefined;

    await bot.api.sendMessage(targetIdStr, msg, {
      parse_mode: "Markdown",
      reply_markup: replyMarkup,
    });
  } catch (e) {
    // ignore
  }
});

bot.command("clearwarns", async (ctx) => {
  if (!isOwner(ctx)) return ctx.reply("🚫 Owner only.");

  const args = (ctx.message?.text || "").split(/\s+/).slice(1);
  if (args.length < 1) return ctx.reply("Usage: /clearwarns <userId> [reason]");

  const [targetId, ...reasonParts] = args;
  const targetIdStr = String(targetId);
  const reason = reasonParts.join(" ").trim();

  if (OWNER_IDS.has(targetIdStr)) {
    return ctx.reply("⚠️ Cannot clear warnings for an owner.");
  }

  const rec = ensureUser(targetIdStr);
  if (!Array.isArray(rec.warnings) || rec.warnings.length === 0) {
    return ctx.reply(`User ${targetIdStr} has no warnings.`);
  }

  const count = rec.warnings.length;
  rec.warnings = [];
  saveUsers();

  let ownerMsg = `🧹 Cleared ${count} warnings for user ${targetIdStr}.`;
  if (reason) ownerMsg += ` Reason: ${reason}`;
  await ctx.reply(ownerMsg);

  try {
    const reasonLine = reason ? `\n\n*Reason:* ${escapeMarkdown(reason)}` : "";
    const msg = `🧹 *Your warnings on StarzAI have been cleared.*${reasonLine}`;
    await bot.api.sendMessage(targetIdStr, msg, { parse_mode: "Markdown" });
  } catch (e) {
    // ignore
  }
});

// Alias: /cw -> same as /clearwarns
bot.command("cw", async (ctx) => {
  if (!isOwner(ctx)) return ctx.reply("🚫 Owner only.");

  const args = (ctx.message?.text || "").split(/\s+/).slice(1);
  if (args.length < 1) return ctx.reply("Usage: /cw <userId> [reason]");

  const [targetId, ...reasonParts] = args;
  const targetIdStr = String(targetId);
  const reason = reasonParts.join(" ").trim();

  if (OWNER_IDS.has(targetIdStr)) {
    return ctx.reply("⚠️ Cannot clear warnings for an owner.");
  }

  const rec = ensureUser(targetIdStr);
  if (!Array.isArray(rec.warnings) || rec.warnings.length === 0) {
    return ctx.reply(`User ${targetIdStr} has no warnings.`);
  }

  const count = rec.warnings.length;
  rec.warnings = [];
  saveUsers();

  let ownerMsg = `🧹 Cleared ${count} warnings for user ${targetIdStr}.`;
  if (reason) ownerMsg += ` Reason: ${reason}`;
  await ctx.reply(ownerMsg);

  try {
    const reasonLine = reason ? `\n\n*Reason:* ${escapeMarkdown(reason)}` : "";
    const msg = `🧹 *Your warnings on StarzAI have been cleared.*${reasonLine}`;
    await bot.api.sendMessage(targetIdStr, msg, { parse_mode: "Markdown" });
  } catch (e) {
    // ignore
  }
});

bot.command("softban", async (ctx) => {
  if (!isOwner(ctx)) return ctx.reply("🚫 Owner only.");

  const args = (ctx.message?.text || "").split(/\s+/).slice(1);
  if (args.length < 1) return ctx.reply("Usage: /softban <userId> [reason]");

  const [targetId, ...reasonParts] = args;
  const targetIdStr = String(targetId);
  const reason = reasonParts.join(" ").trim();

  if (OWNER_IDS.has(targetIdStr)) {
    return ctx.reply("⚠️ Cannot softban an owner.");
  }

  const rec = ensureUser(targetIdStr);
  if (rec.banned) {
    return ctx.reply(`User ${targetIdStr} is already banned.`);
  }

  const { until } = applyMuteToUser(
    targetIdStr,
    WARN_SOFTBAN_DURATION_MS,
    "all",
    reason || null,
    ctx.from?.id
  );

  const humanUntil = new Date(until).toLocaleString();
  let ownerMsg = `🚫 Softban applied to user ${targetIdStr} for 24h (total mute).`;
  ownerMsg += `\nUntil: ${humanUntil}`;
  if (reason) ownerMsg += `\nReason: ${reason}`;
  await ctx.reply(ownerMsg);

  // Notify user
  try {
    const reasonLine = reason ? `\n\n*Reason:* ${escapeMarkdown(reason)}` : "";
    const untilLine = `\n\n_Ban ends at: ${escapeMarkdown(humanUntil)}_`;
    const msg =
      "🚫 *You have received a temporary soft ban on StarzAI.*" +
      reasonLine +
      "\n\nYou are temporarily blocked from using the bot." +
      untilLine;

    const replyMarkup =
      FEEDBACK_CHAT_ID
        ? new InlineKeyboard().text("💡 Feedback", "menu_feedback")
        : undefined;

    await bot.api.sendMessage(targetIdStr, msg, {
      parse_mode: "Markdown",
      reply_markup: replyMarkup,
    });
  } catch (e) {
    // ignore
  }
});

// Alias: /sban -> same as /softban
bot.command("sban", async (ctx) => {
  if (!isOwner(ctx)) return ctx.reply("🚫 Owner only.");

  const args = (ctx.message?.text || "").split(/\s+/).slice(1);
  if (args.length < 1) return ctx.reply("Usage: /sban <userId> [reason]");

  const [targetId, ...reasonParts] = args;
  const targetIdStr = String(targetId);
  const reason = reasonParts.join(" ").trim();

  if (OWNER_IDS.has(targetIdStr)) {
    return ctx.reply("⚠️ Cannot softban an owner.");
  }

  const rec = ensureUser(targetIdStr);
  if (rec.banned) {
    return ctx.reply(`User ${targetIdStr} is already banned.`);
  }

  const { until } = applyMuteToUser(
    targetIdStr,
    WARN_SOFTBAN_DURATION_MS,
    "all",
    reason || null,
    ctx.from?.id
  );

  const humanUntil = new Date(until).toLocaleString();
  let ownerMsg = `🚫 Softban applied to user ${targetIdStr} for 24h (total mute).`;
  ownerMsg += `\nUntil: ${humanUntil}`;
  if (reason) ownerMsg += `\nReason: ${reason}`;
  await ctx.reply(ownerMsg);

  // Notify user
  try {
    const reasonLine = reason ? `\n\n*Reason:* ${escapeMarkdown(reason)}` : "";
    const untilLine = `\n\n_Ban ends at: ${escapeMarkdown(humanUntil)}_`;
    const msg =
      "🚫 *You have received a temporary soft ban on StarzAI.*" +
      reasonLine +
      "\n\nYou are temporarily blocked from using the bot." +
      untilLine;

    const replyMarkup =
      FEEDBACK_CHAT_ID
        ? new InlineKeyboard().text("💡 Feedback", "menu_feedback")
        : undefined;

    await bot.api.sendMessage(targetIdStr, msg, {
      parse_mode: "Markdown",
      reply_markup: replyMarkup,
    });
  } catch (e) {
    // ignore
  }
});

bot.command("mute", async (ctx) => {
  if (!isOwner(ctx)) return ctx.reply("🚫 Owner only.");

  const args = (ctx.message?.text || "").split(/\s+/).slice(1);
  if (args.length < 2) {
    return ctx.reply(
      "Usage: /mute <userId> <duration> [scope] [reason]\n\n" +
      "duration examples: 10m, 2h, 1d, 30 (minutes)\n" +
      "scope: all, dm, group, inline, tier (default: all)"
    );
  }

  const [targetId, durationRaw, scopeOrReason, ...rest] = args;
  const targetIdStr = String(targetId);

  if (OWNER_IDS.has(targetIdStr)) {
    return ctx.reply("⚠️ Cannot mute an owner.");
  }

  const durationMs = parseDurationToMs(durationRaw);
  if (!durationMs) {
    return ctx.reply("Invalid duration. Use formats like 10m, 2h, 1d, 60 (minutes).");
  }

  let scope = "all";
  let reason = "";

  const possibleScope = (scopeOrReason || "").toLowerCase();
  const validScopes = new Set(["all", "dm", "group", "inline", "tier"]);
  if (possibleScope && validScopes.has(possibleScope)) {
    scope = possibleScope;
    reason = rest.join(" ").trim();
  } else {
    reason = [scopeOrReason, ...rest].filter(Boolean).join(" ").trim();
  }

  const { until } = applyMuteToUser(
    targetIdStr,
    durationMs,
    scope,
    reason || null,
    ctx.from?.id
  );

  const humanUntil = new Date(until).toLocaleString();
  let ownerMsg = `🔇 User ${targetIdStr} muted for ${durationRaw} (scope: ${scope}).`;
  ownerMsg += `\nUntil: ${humanUntil}`;
  if (reason) ownerMsg += `\nReason: ${reason}`;
  await ctx.reply(ownerMsg);

  // Notify muted user
  try {
    const scopeText =
      scope === "all"
        ? "everywhere"
        : scope === "dm"
        ? "in direct messages"
        : scope === "group"
        ? "in groups"
        : scope === "inline"
        ? "in inline mode"
        : "for premium/paid features";
    const reasonLine = reason ? `\n\n*Reason:* ${escapeMarkdown(reason)}` : "";
    const untilLine = `\n\n_Mute ends at: ${escapeMarkdown(humanUntil)}_`;
    const baseLine = `🔇 *You have been muted on StarzAI* (${scopeText}).`;
    const mutedMsg = [baseLine, reasonLine, untilLine].join("");

    const replyMarkup =
      FEEDBACK_CHAT_ID
        ? new InlineKeyboard().text("💡 Feedback", "menu_feedback")
        : undefined;

    await bot.api.sendMessage(targetIdStr, mutedMsg, {
      parse_mode: "Markdown",
      reply_markup: replyMarkup,
    });
  } catch (e) {
    // User might not have started the bot; ignore
  }
});

bot.command("unmute", async (ctx) => {
  if (!isOwner(ctx)) return ctx.reply("🚫 Owner only.");

  const args = (ctx.message?.text || "").split(/\s+/).slice(1);
  if (args.length < 1) return ctx.reply("Usage: /unmute <userId> [reason]");

  const [targetId, ...reasonParts] = args;
  const reason = reasonParts.join(" ").trim();
  const targetIdStr = String(targetId);
  const rec = ensureUser(targetIdStr);

  if (!rec.mute) {
    return ctx.reply(`User ${targetIdStr} is not muted.`);
  }

  if (rec.mute.scope === "tier" && rec.mute.previousTier && rec.tier === "free") {
    rec.tier = rec.mute.previousTier;
    rec.role = rec.mute.previousTier;
  }

  delete rec.mute;
  saveUsers();

  let ownerMsg = `🔊 User ${targetIdStr} has been unmuted.`;
  if (reason) ownerMsg += ` Reason: ${reason}`;
  await ctx.reply(ownerMsg);

  try {
    const reasonLine = reason ? `\n\n*Reason:* ${escapeMarkdown(reason)}` : "";
    const msg = `🔊 *Your mute on StarzAI has been lifted.*${reasonLine}`;
    await bot.api.sendMessage(targetIdStr, msg, { parse_mode: "Markdown" });
  } catch (e) {
    // User might not have started the bot; ignore
  }
});

bot.command("banlist", async (ctx) => {
  if (!isOwner(ctx)) return ctx.reply("🚫 Owner only.");

  const entries = Object.entries(usersDb.users || {}).filter(
    ([, u]) => u.banned
  );

  if (entries.length === 0) {
    return ctx.reply("✅ No banned users currently.");
  }

  const max = 50;
  const subset = entries.slice(0, max);
  const lines = [
    `🚫 <b>Banned users</b> (${entries.length})`,
    "",
  ];

  subset.forEach(([id, u], idx) => {
    const username = u.username ? "@" + escapeHTML(u.username) : "<i>no username</i>";
    const name = u.firstName ? escapeHTML(u.firstName) : "<i>no name</i>";
    const bannedAt = u.bannedAt ? new Date(u.bannedAt).toLocaleString() : "unknown";
    const reasonText = u.banReason ? escapeHTML(u.banReason.slice(0, 80)) : "none";
    lines.push(
      `${idx + 1}. <code>${id}</code> – ${username} (${name})`,
      `   ⏰ ${bannedAt} • Reason: ${reasonText}`,
      ""
    );
  });

  if (entries.length > max) {
    lines.push(
      `... and ${entries.length - max} more. Use /info &lt;userId&gt; for details.`
    );
  }

  await ctx.reply(lines.join("\n"), { parse_mode: "HTML" });
});

bot.command("mutelist", async (ctx) => {
  if (!isOwner(ctx)) return ctx.reply("🚫 Owner only.");

  const entries = Object.entries(usersDb.users || {}).filter(
    ([, u]) => u.mute
  );

  if (entries.length === 0) {
    return ctx.reply("✅ No muted users currently.");
  }

  const max = 50;
  const subset = entries.slice(0, max);
  const lines = [
    `🔇 <b>Muted users</b> (${entries.length})`,
    "",
  ];

  subset.forEach(([id, u], idx) => {
    const m = u.mute;
    const scope = m.scope || "all";
    const until = m.until ? new Date(m.until).toLocaleString() : "unknown";
    const reasonText = m.reason ? escapeHTML(m.reason.slice(0, 80)) : "none";
    const username = u.username ? "@" + escapeHTML(u.username) : "<i>no username</i>";
    const name = u.firstName ? escapeHTML(u.firstName) : "<i>no name</i>";
    lines.push(
      `${idx + 1}. <code>${id}</code> – ${username} (${name})`,
      `   🎯 Scope: ${escapeHTML(scope)} • Until: ${escapeHTML(until)} • Reason: ${reasonText}`,
      ""
    );
  });

  if (entries.length > max) {
    lines.push(
      `... and ${entries.length - max} more. Use /info &lt;userId&gt; for details.`
    );
  }

  await ctx.reply(lines.join("\n"), { parse_mode: "HTML" });
});

bot.command("ownerhelp", async (ctx) => {
  if (!isOwner(ctx)) return ctx.reply("🚫 Owner only.");

  const text = [
    "📘 StarzAI Owner Guide",
    "",
    "👤 User info & status",
    "",
    "• /info <userId> — full user info (tier, bans, mutes, warnings, stats)",
    "• /gstat — global bot stats",
    "",
    "🎫 Tiers & access",
    "",
    "• /grant <userId> <tier>,",
    "• /revoke <userId>",
    "• /allow <userId> <model>,",
    "• /deny <userId> <model>",
    "",
    "🏘 Group authorization",
    "",
    "• /add <chatId> note — authorize a group to use the bot",
    "• /rem <chatId> reason — block a group from using the bot",
    "• /glist — list known groups and their auth status",
    "",
    "🚫 Bans",
    "",
    "• /ban <userId> reason",
    "• /unban <userId> reason",
    "• /sban <userId> reason — 24h total mute",
    "• /banlist — list banned users",
    "",
    "🔇 Mutes",
    "",
    "• /mute <userId> <duration> scope reason",
    "• /unmute <userId> reason",
    "• /mutelist",
    "  scope: all, dm, group, inline, tier",
    "",
    "⚠️ Warnings",
    "",
    "• /warn <userId> reason — auto softban at 3 warnings",
    "• /cw <userId> reason — reset warnings",
    "",
    "💡 Feedback",
    "",
    "• /feedback — user-side command (button in menu)",
    "• /f <feedbackId> <text> — reply to feedback sender",
    "",
    "•Owners cannot be banned, muted, or warned.",
  ]
    .filter(Boolean)
    .join("\n");

  await ctx.reply(text, {
    reply_to_message_id: ctx.message?.message_id,
  });
});

// =====================
// SUPER UTILITIES (27 Features)
// =====================

// Platform emoji mapping for downloads
const PLATFORM_EMOJI = {
  youtube: '📺',
  tiktok: '🎵',
  instagram: '📸',
  twitter: '🐦',
  facebook: '📘',
  spotify: '🎧',
  soundcloud: '☁️',
  deezer: '🎶',
  applemusic: '🍎',
  jiosaavn: '🎵'
};

// /download or /dl - Download media from various platforms
bot.command(["download", "dl"], async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  if (!(await enforceCommandCooldown(ctx))) return;
  ensureUser(ctx.from.id, ctx.from);
  
  const text = ctx.message.text.replace(/^\/(download|dl)\s*/i, '').trim();
  
  if (!text) {
    return ctx.reply(
      '📥 <b>Media Downloader</b>\n\n' +
      'Download videos and audio from:\n' +
      '• YouTube, TikTok, Instagram, Twitter\n' +
      '• Spotify, SoundCloud, Reddit\n' +
      '• And 20+ more platforms!\n\n' +
      '<b>Usage:</b>\n' +
      '<code>/dl https://youtube.com/watch?v=...</code>\n' +
      '<code>/dl https://tiktok.com/@user/video/...</code>\n\n' +
      '<i>Or just paste a link and I\'ll detect it automatically!</i>',
      { parse_mode: 'HTML', reply_to_message_id: ctx.message?.message_id }
    );
  }
  
  const urlMatch = text.match(/https?:\/\/[^\s]+/);
  if (!urlMatch) {
    return ctx.reply('❌ Please provide a valid URL.', {
      reply_to_message_id: ctx.message?.message_id
    });
  }
  
  const url = urlMatch[0];
  const platform = detectPlatform(url);
  const emoji = platform ? PLATFORM_EMOJI[platform] : '📥';
  
  const statusMsg = await ctx.reply(
    `${emoji} <b>Downloading...</b>\n\nThis may take a moment...`,
    { parse_mode: 'HTML', reply_to_message_id: ctx.message?.message_id }
  );
  
  try {
    const result = await downloadMedia(url, false);
    
    if (!result.success) {
      await ctx.api.editMessageText(
        ctx.chat.id, statusMsg.message_id,
        `❌ Download failed: ${escapeHTML(result.error)}`,
        { parse_mode: 'HTML' }
      );
      return;
    }
    
    if (result.picker) {
      const kb = new InlineKeyboard();
      result.options.slice(0, 4).forEach((opt, i) => {
        kb.text(opt.type || `Option ${i + 1}`, `dl_pick:${i}:${encodeURIComponent(url)}`).row();
      });
      
      await ctx.api.editMessageText(
        ctx.chat.id, statusMsg.message_id,
        `${emoji} <b>Multiple options available:</b>\n\nSelect what you want to download:`,
        { parse_mode: 'HTML', reply_markup: kb }
      );
      return;
    }
    
    await ctx.api.editMessageText(
      ctx.chat.id, statusMsg.message_id,
      `${emoji} <b>Uploading to Telegram...</b>`,
      { parse_mode: 'HTML' }
    );
    
    const isAudio = url.includes('soundcloud') || url.includes('spotify');
    
    if (isAudio) {
      await ctx.replyWithAudio(result.url, {
        caption: `${emoji} Downloaded via StarzAI`,
        reply_to_message_id: ctx.message?.message_id
      });
    } else {
      await ctx.replyWithVideo(result.url, {
        caption: `${emoji} Downloaded via StarzAI`,
        reply_to_message_id: ctx.message?.message_id
      });
    }
    
    await ctx.api.deleteMessage(ctx.chat.id, statusMsg.message_id);
    
  } catch (error) {
    await ctx.api.editMessageText(
      ctx.chat.id, statusMsg.message_id,
      `❌ Error: ${escapeHTML(error.message)}`,
      { parse_mode: 'HTML' }
    );
  }
});

// /lyrics - Get song lyrics
bot.command("lyrics", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  if (!(await enforceCommandCooldown(ctx))) return;
  ensureUser(ctx.from.id, ctx.from);
  
  const text = ctx.message.text.replace(/^\/lyrics\s*/i, '').trim();
  
  if (!text) {
    return ctx.reply(
      '🎵 <b>Lyrics Search</b>\n\n' +
      '<b>Usage:</b>\n' +
      '<code>/lyrics Artist - Song Title</code>\n\n' +
      '<b>Example:</b>\n' +
      '<code>/lyrics Ed Sheeran - Shape of You</code>',
      { parse_mode: 'HTML', reply_to_message_id: ctx.message?.message_id }
    );
  }
  
  let artist, title;
  if (text.includes(' - ')) {
    [artist, title] = text.split(' - ').map(s => s.trim());
  } else {
    return ctx.reply(
      '❌ Please use format: <code>/lyrics Artist - Song Title</code>',
      { parse_mode: 'HTML', reply_to_message_id: ctx.message?.message_id }
    );
  }
  
  const statusMsg = await ctx.reply('🎵 Searching for lyrics...', {
    reply_to_message_id: ctx.message?.message_id
  });
  
  const result = await getLyrics(artist, title);
  
  if (!result.success) {
    await ctx.api.editMessageText(
      ctx.chat.id, statusMsg.message_id,
      `❌ Lyrics not found for "${escapeHTML(artist)} - ${escapeHTML(title)}"`,
      { parse_mode: 'HTML' }
    );
    return;
  }
  
  let lyrics = result.lyrics;
  if (lyrics.length > 3500) {
    lyrics = lyrics.slice(0, 3500) + '\n\n... (truncated)';
  }
  
  await ctx.api.editMessageText(
    ctx.chat.id, statusMsg.message_id,
    `🎵 <b>${escapeHTML(artist)} - ${escapeHTML(title)}</b>\n\n${escapeHTML(lyrics)}`,
    { parse_mode: 'HTML' }
  );
});

// /music - Search and download music (JioSaavn API)
const pendingMusicSearches = new Map(); // Store search results for selection

bot.command(["music", "song"], async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  if (!(await enforceCommandCooldown(ctx))) return;
  ensureUser(ctx.from.id, ctx.from);
  
  const text = ctx.message.text.replace(/^\/(music|song)\s*/i, '').trim();
  
  if (!text) {
    return ctx.reply(
      '🎵 <b>Music Download</b>\n\n' +
      '<b>Usage:</b>\n' +
      '<code>/music song name</code>\n' +
      '<code>/music artist - song</code>\n\n' +
      '<b>Examples:</b>\n' +
      '<code>/music Shape of You</code>\n' +
      '<code>/music Ed Sheeran - Perfect</code>\n\n' +
      '<i>Powered by JioSaavn • 320kbps quality</i>',
      { parse_mode: 'HTML', reply_to_message_id: ctx.message?.message_id }
    );
  }
  
  const statusMsg = await ctx.reply('🔍 Searching for music...', {
    reply_to_message_id: ctx.message?.message_id
  });
  
  try {
    const result = await searchMusic(text, 5);
    
    if (!result.success || !result.songs?.length) {
      await ctx.api.editMessageText(
        ctx.chat.id, statusMsg.message_id,
        `❌ No songs found for "${escapeHTML(text)}"`,
        { parse_mode: 'HTML' }
      );
      return;
    }
    
    // Store search results for callback
    const searchId = `ms_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    pendingMusicSearches.set(searchId, result.songs);
    
    // Auto-expire after 5 minutes
    setTimeout(() => pendingMusicSearches.delete(searchId), 5 * 60 * 1000);
    
    // Build song list with inline buttons
    let message = `🎵 <b>Search Results for "${escapeHTML(text)}"</b>\n\n`;
    
    const buttons = result.songs.map((song, i) => {
      message += `<b>${i + 1}.</b> ${escapeHTML(song.name)}\n`;
      message += `    🎤 ${escapeHTML(song.artist)}\n`;
      if (song.album) message += `    💿 ${escapeHTML(song.album)}\n`;
      if (song.duration) message += `    ⏱ ${song.duration}\n`;
      message += '\n';
      
      return [{ text: `${i + 1}. ${song.name.slice(0, 30)}${song.name.length > 30 ? '...' : ''}`, callback_data: `mdl:${searchId}:${i}` }];
    });
    
    message += '<i>Select a song to download (320kbps)</i>';
    
    await ctx.api.editMessageText(
      ctx.chat.id, statusMsg.message_id,
      message,
      { 
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: buttons }
      }
    );
  } catch (error) {
    await ctx.api.editMessageText(
      ctx.chat.id, statusMsg.message_id,
      `❌ Error: ${escapeHTML(error.message)}`,
      { parse_mode: 'HTML' }
    );
  }
});

// Callback for music download selection
bot.callbackQuery(/^mdl:/, async (ctx) => {
  const [, searchId, indexStr] = ctx.callbackQuery.data.split(':');
  const songs = pendingMusicSearches.get(searchId);
  
  if (!songs) {
    await ctx.answerCallbackQuery({ text: 'Search expired. Please search again.', show_alert: true });
    return;
  }
  
  const index = parseInt(indexStr, 10);
  const song = songs[index];
  
  if (!song) {
    await ctx.answerCallbackQuery({ text: 'Song not found.', show_alert: true });
    return;
  }
  
  await ctx.answerCallbackQuery({ text: 'Downloading...' });
  
  try {
    await ctx.editMessageText(
      `🎵 <b>Downloading:</b> ${escapeHTML(song.name)}\n🎤 ${escapeHTML(song.artist)}\n\n<i>Please wait...</i>`,
      { parse_mode: 'HTML' }
    );
    
    // Get full song details with download URL
    const songResult = await getSongById(song.id);
    
    if (!songResult.success || !songResult.song?.downloadUrl) {
      await ctx.editMessageText(
        `❌ Could not get download link for this song.\n\n<i>Try another result or search again.</i>`,
        { parse_mode: 'HTML' }
      );
      return;
    }
    
    const fullSong = songResult.song;
    
    await ctx.editMessageText(
      `🎵 <b>Sending:</b> ${escapeHTML(fullSong.name)}\n🎤 ${escapeHTML(fullSong.artist)}\n💿 ${escapeHTML(fullSong.album)}\n📊 ${fullSong.quality}`,
      { parse_mode: 'HTML' }
    );
    
    // Build caption
    let caption = `🎵 <b>${escapeHTML(fullSong.name)}</b>\n`;
    caption += `🎤 ${escapeHTML(fullSong.artist)}\n`;
    if (fullSong.album) caption += `💿 ${escapeHTML(fullSong.album)}\n`;
    if (fullSong.duration) caption += `⏱ ${fullSong.duration}\n`;
    caption += `📊 ${fullSong.quality}\n\n`;
    caption += `<i>Downloaded via StarzAI</i>`;
    
    // Send the audio file
    await ctx.replyWithAudio(fullSong.downloadUrl, {
      caption: caption,
      parse_mode: 'HTML',
      title: fullSong.name,
      performer: fullSong.artist,
      thumbnail: fullSong.image ? { url: fullSong.image } : undefined
    });
    
    // Delete the selection message
    await ctx.deleteMessage();
    pendingMusicSearches.delete(searchId);
    
  } catch (error) {
    await ctx.editMessageText(
      `❌ Error: ${escapeHTML(error.message)}`,
      { parse_mode: 'HTML' }
    );
  }
});

// /movie - Search movies
bot.command("movie", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  if (!(await enforceCommandCooldown(ctx))) return;
  ensureUser(ctx.from.id, ctx.from);
  
  const text = ctx.message.text.replace(/^\/movie\s*/i, '').trim();
  
  if (!text) {
    return ctx.reply(
      '🎬 <b>Movie Search</b>\n\n' +
      '<b>Usage:</b>\n' +
      '<code>/movie title</code>\n\n' +
      '<b>Example:</b>\n' +
      '<code>/movie Inception</code>',
      { parse_mode: 'HTML', reply_to_message_id: ctx.message?.message_id }
    );
  }
  
  const statusMsg = await ctx.reply(`🔍 Searching for "${escapeHTML(text)}"...`, {
    parse_mode: 'HTML',
    reply_to_message_id: ctx.message?.message_id
  });
  
  const result = await searchMedia(text, 'movie');
  
  if (!result.success) {
    await ctx.api.editMessageText(
      ctx.chat.id, statusMsg.message_id,
      `❌ ${result.error}`,
      { parse_mode: 'HTML' }
    );
    return;
  }
  
  let response = `🎬 <b>Search Results:</b>\n\n`;
  const kb = new InlineKeyboard();
  
  result.results.forEach((item, i) => {
    const title = item.title || item.name;
    const year = (item.release_date || item.first_air_date || '').slice(0, 4);
    const rating = item.vote_average ? `⭐ ${item.vote_average.toFixed(1)}` : '';
    
    response += `${i + 1}. <b>${escapeHTML(title)}</b> ${year ? `(${year})` : ''} ${rating}\n`;
    
    kb.text(`${i + 1}. ${title.slice(0, 20)}`, `media_info:movie:${item.id}`);
    if ((i + 1) % 2 === 0) kb.row();
  });
  
  if (result.results.length % 2 !== 0) kb.row();
  
  await ctx.api.editMessageText(
    ctx.chat.id, statusMsg.message_id,
    response,
    { parse_mode: 'HTML', reply_markup: kb }
  );
});

// /tv - Search TV shows
bot.command("tv", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  if (!(await enforceCommandCooldown(ctx))) return;
  ensureUser(ctx.from.id, ctx.from);
  
  const text = ctx.message.text.replace(/^\/tv\s*/i, '').trim();
  
  if (!text) {
    return ctx.reply(
      '📺 <b>TV Show Search</b>\n\n' +
      '<b>Usage:</b>\n' +
      '<code>/tv title</code>\n\n' +
      '<b>Example:</b>\n' +
      '<code>/tv Breaking Bad</code>',
      { parse_mode: 'HTML', reply_to_message_id: ctx.message?.message_id }
    );
  }
  
  const statusMsg = await ctx.reply(`🔍 Searching for "${escapeHTML(text)}"...`, {
    parse_mode: 'HTML',
    reply_to_message_id: ctx.message?.message_id
  });
  
  const result = await searchMedia(text, 'tv');
  
  if (!result.success) {
    await ctx.api.editMessageText(
      ctx.chat.id, statusMsg.message_id,
      `❌ ${result.error}`,
      { parse_mode: 'HTML' }
    );
    return;
  }
  
  let response = `📺 <b>Search Results:</b>\n\n`;
  const kb = new InlineKeyboard();
  
  result.results.forEach((item, i) => {
    const title = item.title || item.name;
    const year = (item.release_date || item.first_air_date || '').slice(0, 4);
    const rating = item.vote_average ? `⭐ ${item.vote_average.toFixed(1)}` : '';
    
    response += `${i + 1}. <b>${escapeHTML(title)}</b> ${year ? `(${year})` : ''} ${rating}\n`;
    
    kb.text(`${i + 1}. ${title.slice(0, 20)}`, `media_info:tv:${item.id}`);
    if ((i + 1) % 2 === 0) kb.row();
  });
  
  if (result.results.length % 2 !== 0) kb.row();
  
  await ctx.api.editMessageText(
    ctx.chat.id, statusMsg.message_id,
    response,
    { parse_mode: 'HTML', reply_markup: kb }
  );
});

// /qr - Generate QR code
bot.command("qr", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  if (!(await enforceCommandCooldown(ctx))) return;
  ensureUser(ctx.from.id, ctx.from);
  
  const text = ctx.message.text.replace(/^\/qr\s*/i, '').trim();
  
  if (!text) {
    return ctx.reply(
      '📱 <b>QR Code Generator</b>\n\n' +
      '<b>Usage:</b>\n' +
      '<code>/qr your text or URL here</code>\n\n' +
      '<b>Examples:</b>\n' +
      '<code>/qr https://example.com</code>\n' +
      '<code>/qr Hello World!</code>\n\n' +
      'Tip: Use <code>/qs</code> to customize QR themes (colors, resolution, correction level, logo overlay, art mode).',
      { parse_mode: 'HTML', reply_to_message_id: ctx.message?.message_id }
    );
  }
  
  const {
    themeKey,
    theme,
    size,
    errorCorrectionLevel,
    margin,
    logoEnabled,
    artMode,
  } = getUserQrPrefs(ctx.from.id);

  // For art mode we don't need to force higher EC, since we preserve all modules
  const needsHighEc = logoEnabled && !artMode;
  const effectiveLevel = getEffectiveQrErrorCorrection(
    errorCorrectionLevel,
    needsHighEc
  );

  let qrBuffer;

  if (artMode) {
    // Direct art-mode render: dot-style QR over art/background
    try {
      qrBuffer = await renderQrArtFromData(
        text,
        {
          theme,
          size: size || theme.width,
          margin,
          errorCorrectionLevel: effectiveLevel,
        },
        ctx.api
      );
    } catch (e) {
      console.error("Art mode generation failed, falling back to standard QR:", e);
      const result = await generateQR(text, {
        width: size || theme.width,
        margin,
        errorCorrectionLevel: effectiveLevel,
        dark: theme.dark,
        light: theme.light,
      });
      if (!result.success) {
        return ctx.reply(`❌ Failed to generate QR: ${result.error}`, {
          reply_to_message_id: ctx.message?.message_id,
        });
      }
      qrBuffer = result.buffer;
    }
  } else {
    // Standard QR (optionally with center logo)
    const result = await generateQR(text, {
      width: size || theme.width,
      margin,
      errorCorrectionLevel: effectiveLevel,
      dark: theme.dark,
      light: theme.light,
    });
    
    if (!result.success) {
      return ctx.reply(`❌ Failed to generate QR: ${result.error}`, {
        reply_to_message_id: ctx.message?.message_id
      });
    }

    qrBuffer = result.buffer;
    if (logoEnabled) {
      qrBuffer = await renderQrWithLogo(qrBuffer, theme, ctx.api);
    }
  }

  const themeLabel = `${theme.icon} ${theme.label}`;
  
  await ctx.replyWithPhoto(new InputFile(qrBuffer, 'qrcode.png'), {
    caption:
      `📱 QR Code for:\n<code>${escapeHTML(text.slice(0, 200))}</code>\n\n` +
      `🎨 Theme: <b>${escapeHTML(themeLabel)}</b>\n` +
      `📐 Size: <b>${size}×${size}</b> • EC: <b>${escapeHTML(effectiveLevel)}</b>` +
      (!artMode && logoEnabled ? `\n🔷 Logo: <b>Enabled</b>` : "") +
      (artMode ? `\n🖼️ Style: <b>Art mode</b>` : ""),
    parse_mode: 'HTML',
    reply_to_message_id: ctx.message?.message_id
  });
});

// /rename - Rename replied text document (e.g. QR export)
bot.command("rename", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  if (!(await enforceCommandCooldown(ctx))) return;
  ensureUser(ctx.from.id, ctx.from);

  const msg = ctx.message;
  const replied = msg?.reply_to_message;
  const doc = replied?.document;

  if (!doc) {
    return ctx.reply(
      '✏️ <b>Rename file</b>\n\n' +
      'Reply to a text document and use:\n' +
      '<code>/rename My Name</code>\n\n' +
      'This will resend it as <code>My Name.txt</code>.\n' +
      'If you do not use /rename, the default filename is kept.',
      { parse_mode: 'HTML', reply_to_message_id: msg?.message_id }
    );
  }

  const origName = doc.file_name || 'file.txt';
  const isTextDoc =
    (doc.mime_type && doc.mime_type.startsWith('text/')) ||
    origName.toLowerCase().endsWith('.txt');

  if (!isTextDoc) {
    return ctx.reply(
      '❌ This command currently supports only text files (.txt).',
      { reply_to_message_id: msg?.message_id }
    );
  }

  // Parse desired name from command
  const rawName = msg.text.replace(/^\/rename(@\w+)?\s*/i, '').trim();
  if (!rawName) {
    return ctx.reply(
      '❌ Please provide a name.\n\n' +
      'Example:\n<code>/rename My QR Backup</code>',
      { parse_mode: 'HTML', reply_to_message_id: msg?.message_id }
    );
  }

  let desired = rawName;
  const quoteMatch = rawName.match(/^\"(.+)\"$/);
  if (quoteMatch) {
    desired = quoteMatch[1];
  }

  // Sanitize filename (basic)
  desired = desired.replace(/[\\\/:*?"<>|]+/g, '').trim();
  if (!desired) desired = 'renamed';

  let fileName = desired;
  // If no extension provided, use .txt
  if (!/\.[^.\s]{1,10}$/.test(desired)) {
    fileName = `${desired}.txt`;
  }

  try {
    // Download the original file from Telegram and re-upload with new name
    const file = await ctx.api.getFile(doc.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;
    const response = await fetch(fileUrl);
    const buffer = await response.buffer();

    await ctx.replyWithDocument(new InputFile(buffer, fileName), {
      caption: `📄 Renamed file: <code>${escapeHTML(fileName)}</code>`,
      parse_mode: 'HTML',
      reply_to_message_id: msg?.message_id,
    });
  } catch (e) {
    console.error('Rename error:', e);
    await ctx.reply(
      '❌ Failed to rename file. Please try again.',
      { reply_to_message_id: msg?.message_id }
    );
  }
});

// /qs - QR settings (themes, resolution, error correction, logo)
bot.command("qs", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  if (!(await enforceCommandCooldown(ctx))) return;
  ensureUser(ctx.from.id, ctx.from);

  const userId = ctx.from.id;
  const { text, keyboard } = buildQrSettingsView(userId);

  await ctx.reply(text, {
    parse_mode: "HTML",
    reply_markup: keyboard,
    reply_to_message_id: ctx.message?.message_id,
  });
});

// QR settings main menu + section navigation
bot.callbackQuery(/^qs_menu:(.+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  const userId = ctx.from.id;
  const section = ctx.match[1];

  let view;
  switch (section) {
    case "themes":
      view = buildQrThemesView(userId);
      break;
    case "size":
      view = buildQrSizeView(userId);
      break;
    case "ec":
      view = buildQrEcView(userId);
      break;
    case "overlay":
      view = buildQrOverlayView(userId);
      break;
    case "scan":
      view = buildQrScanView(userId);
      break;
    case "main":
    default:
      view = buildQrSettingsView(userId);
      break;
  }

  const { text, keyboard } = view;
  try {
    await ctx.editMessageText(text, {
      parse_mode: "HTML",
      reply_markup: keyboard,
    });
  } catch {
    await ctx.reply(text, {
      parse_mode: "HTML",
      reply_markup: keyboard,
    });
  }
});

// QR settings callbacks
bot.callbackQuery(/^qs_theme:(.+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  const userId = ctx.from.id;
  const match = ctx.match;
  const themeKey = match && match[1] ? match[1] : null;
  if (!themeKey || !QR_THEMES[themeKey]) {
    return ctx.answerCallbackQuery({ text: "Invalid theme.", show_alert: true });
  }

  const user = getUserRecord(userId);
  user.qrPrefs = user.qrPrefs || {};
  user.qrPrefs.theme = themeKey;
  const theme = QR_THEMES[themeKey];
  if (!user.qrPrefs.size) user.qrPrefs.size = theme.width || 2048;
  if (!user.qrPrefs.errorCorrectionLevel) {
    user.qrPrefs.errorCorrectionLevel = theme.errorCorrectionLevel || "L";
  }
  if (user.qrPrefs.margin === undefined) {
    user.qrPrefs.margin = theme.margin ?? 4;
  }
  saveUsers();

  await ctx.answerCallbackQuery({ text: `Theme: ${theme.label} ✅` });

  const { text, keyboard } = buildQrThemesView(userId);
  try {
    await ctx.editMessageText(text, { parse_mode: "HTML", reply_markup: keyboard });
  } catch {
    await ctx.reply(text, { parse_mode: "HTML", reply_markup: keyboard });
  }
});

bot.callbackQuery(/^qs_size:(\d+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  const userId = ctx.from.id;
  const size = parseInt(ctx.match[1], 10);
  if (![1024, 2048, 4096].includes(size)) {
    return ctx.answerCallbackQuery({ text: "Invalid size.", show_alert: true });
  }
  const user = getUserRecord(userId);
  user.qrPrefs = user.qrPrefs || {};
  user.qrPrefs.size = size;
  saveUsers();
  await ctx.answerCallbackQuery({ text: `Size set to ${size}×${size}`, show_alert: false });

  const { text, keyboard } = buildQrSizeView(userId);
  try {
    await ctx.editMessageText(text, { parse_mode: "HTML", reply_markup: keyboard });
  } catch {
    await ctx.reply(text, { parse_mode: "HTML", reply_markup: keyboard });
  }
});

bot.callbackQuery(/^qs_level:([LMQH])$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  const userId = ctx.from.id;
  const level = ctx.match[1];
  const user = getUserRecord(userId);
  user.qrPrefs = user.qrPrefs || {};
  user.qrPrefs.errorCorrectionLevel = level;
  saveUsers();
  await ctx.answerCallbackQuery({ text: `Error correction: ${level}`, show_alert: false });

  const { text, keyboard } = buildQrEcView(userId);
  try {
    await ctx.editMessageText(text, { parse_mode: "HTML", reply_markup: keyboard });
  } catch {
    await ctx.reply(text, { parse_mode: "HTML", reply_markup: keyboard });
  }
});

bot.callbackQuery(/^qs_logo:(0|1)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  const userId = ctx.from.id;
  const enable = ctx.match[1] === "1";
  const user = getUserRecord(userId);
  user.qrPrefs = user.qrPrefs || {};

  // Logo overlay and art mode are mutually exclusive
  user.qrPrefs.logoEnabled = enable;
  if (enable) {
    user.qrPrefs.artMode = false;
  }

  saveUsers();
  await ctx.answerCallbackQuery({
    text: enable
      ? "Logo overlay enabled (art mode disabled)"
      : "Logo overlay disabled",
    show_alert: false,
  });

  const { text, keyboard } = buildQrOverlayView(userId);
  try {
    await ctx.editMessageText(text, { parse_mode: "HTML", reply_markup: keyboard });
  } catch {
    await ctx.reply(text, { parse_mode: "HTML", reply_markup: keyboard });
  }
});

bot.callbackQuery(/^qs_reencode:(0|1)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  const userId = ctx.from.id;
  const enable = ctx.match[1] === "1";
  const user = getUserRecord(userId);
  user.qrPrefs = user.qrPrefs || {};
  user.qrPrefs.reencodeOnScan = enable;
  saveUsers();
  await ctx.answerCallbackQuery({
    text: enable ? "Re-encode on scan enabled" : "Re-encode on scan disabled",
    show_alert: false,
  });

  const { text, keyboard } = buildQrScanView(userId);
  try {
    await ctx.editMessageText(text, { parse_mode: "HTML", reply_markup: keyboard });
  } catch {
    await ctx.reply(text, { parse_mode: "HTML", reply_markup: keyboard });
  }
});

bot.callbackQuery(/^qs_art:(0|1)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  const userId = ctx.from.id;
  const enable = ctx.match[1] === "1";
  const user = getUserRecord(userId);
  user.qrPrefs = user.qrPrefs || {};

  // Art mode and logo overlay are mutually exclusive
  user.qrPrefs.artMode = enable;
  if (enable) {
    user.qrPrefs.logoEnabled = false;
  }

  saveUsers();
  await ctx.answerCallbackQuery({
    text: enable ? "Art mode enabled (logo overlay disabled)" : "Art mode disabled",
    show_alert: false,
  });

  const { text, keyboard } = buildQrOverlayView(userId);
  try {
    await ctx.editMessageText(text, { parse_mode: "HTML", reply_markup: keyboard });
  } catch {
    await ctx.reply(text, { parse_mode: "HTML", reply_markup: keyboard });
  }
});

bot.callbackQuery("qs_reset", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  const userId = ctx.from.id;
  const user = getUserRecord(userId);
  user.qrPrefs = {
    theme: "classic",
    size: 2048,
    errorCorrectionLevel: "L",
    margin: 4,
    logoEnabled: false,
    reencodeOnScan: true,
    artMode: false,
  };
  saveUsers();
  await ctx.answerCallbackQuery({ text: "QR settings reset.", show_alert: false });

  const { text, keyboard } = buildQrSettingsView(userId);
  try {
    await ctx.editMessageText(text, { parse_mode: "HTML", reply_markup: keyboard });
  } catch {
    await ctx.reply(text, { parse_mode: "HTML", reply_markup: keyboard });
  }
});

// /short - URL shortener
bot.command("short", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  if (!(await enforceCommandCooldown(ctx))) return;
  ensureUser(ctx.from.id, ctx.from);
  
  const text = ctx.message.text.replace(/^\/short\s*/i, '').trim();
  
  if (!text) {
    return ctx.reply(
      '🔗 <b>URL Shortener</b>\n\n' +
      '<b>Usage:</b>\n' +
      '<code>/short https://your-long-url.com/path</code>',
      { parse_mode: 'HTML', reply_to_message_id: ctx.message?.message_id }
    );
  }
  
  if (!/^https?:\/\//i.test(text)) {
    return ctx.reply('❌ Please provide a valid URL starting with http:// or https://', {
      reply_to_message_id: ctx.message?.message_id
    });
  }
  
  const result = await shortenURL(text);
  
  if (!result.success) {
    return ctx.reply(`❌ Failed to shorten URL: ${result.error}`, {
      reply_to_message_id: ctx.message?.message_id
    });
  }
  
  await ctx.reply(
    `🔗 <b>Shortened URL:</b>\n\n` +
    `<code>${escapeHTML(result.shortUrl)}</code>\n\n` +
    `<i>Original: ${escapeHTML(text.slice(0, 50))}${text.length > 50 ? '...' : ''}</i>`,
    { parse_mode: 'HTML', reply_to_message_id: ctx.message?.message_id }
  );
});

// /currency - Currency converter
bot.command("currency", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  if (!(await enforceCommandCooldown(ctx))) return;
  ensureUser(ctx.from.id, ctx.from);
  
  const text = ctx.message.text.replace(/^\/currency\s*/i, '').trim();
  
  if (!text) {
    return ctx.reply(
      '💱 <b>Currency Converter</b>\n\n' +
      '<b>Usage:</b>\n' +
      '<code>/currency 100 USD to EUR</code>\n' +
      '<code>/currency 50 GBP EUR</code>\n\n' +
      '<b>Popular codes:</b> USD, EUR, GBP, JPY, INR, AUD, CAD',
      { parse_mode: 'HTML', reply_to_message_id: ctx.message?.message_id }
    );
  }
  
  const match = text.match(/^([\d.]+)\s*([A-Za-z]{3})\s*(?:to\s*)?([A-Za-z]{3})$/i);
  
  if (!match) {
    return ctx.reply(
      '❌ Invalid format. Use: <code>/currency 100 USD to EUR</code>',
      { parse_mode: 'HTML', reply_to_message_id: ctx.message?.message_id }
    );
  }
  
  const [, amount, from, to] = match;
  const result = await convertCurrency(parseFloat(amount), from, to);
  
  if (!result.success) {
    return ctx.reply(`❌ ${result.error}`, {
      reply_to_message_id: ctx.message?.message_id
    });
  }
  
  await ctx.reply(
    `💱 <b>Currency Conversion</b>\n\n` +
    `<code>${result.amount} ${result.from}</code> = <code>${result.converted} ${result.to}</code>\n\n` +
    `<i>Rate: 1 ${result.from} = ${result.rate.toFixed(4)} ${result.to}</i>`,
    { parse_mode: 'HTML', reply_to_message_id: ctx.message?.message_id }
  );
});

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
      reply_to_message_id: ctx.message?.message_id
    });
  }
  
  let response = `📖 <b>${escapeHTML(result.word)}</b>`;
  if (result.phonetic) {
    response += ` <i>${escapeHTML(result.phonetic)}</i>`;
  }
  response += '\n\n';
  
  result.meanings.forEach(meaning => {
    response += `<b>${escapeHTML(meaning.partOfSpeech)}</b>\n`;
    meaning.definitions.slice(0, 3).forEach((def, i) => {
      response += `${i + 1}. ${escapeHTML(def.definition)}\n`;
      if (def.example) {
        response += `   <i>"${escapeHTML(def.example)}"</i>\n`;
      }
    });
    response += '\n';
  });
  
  await ctx.reply(response, {
    parse_mode: 'HTML',
    reply_to_message_id: ctx.message?.message_id
  });
});

// /fact - Random fact
bot.command("fact", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  if (!(await enforceCommandCooldown(ctx))) return;
  ensureUser(ctx.from.id, ctx.from);
  
  const result = await getRandomFact();
  
  if (!result.success) {
    return ctx.reply(`❌ ${result.error}`, {
      reply_to_message_id: ctx.message?.message_id
    });
  }
  
  await ctx.reply(
    `💡 <b>Random Fact</b>\n\n${escapeHTML(result.fact)}`,
    { parse_mode: 'HTML', reply_to_message_id: ctx.message?.message_id }
  );
});

// /today - This day in history
bot.command("today", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  if (!(await enforceCommandCooldown(ctx))) return;
  ensureUser(ctx.from.id, ctx.from);
  
  const result = await getThisDayInHistory();
  
  if (!result.success) {
    return ctx.reply(`❌ ${result.error}`, {
      reply_to_message_id: ctx.message?.message_id
    });
  }
  
  let response = `📅 <b>This Day in History (${result.date})</b>\n\n`;
  
  result.events.forEach(event => {
    response += `<b>${event.year}</b>: ${escapeHTML(event.text)}\n\n`;
  });
  
  await ctx.reply(response, {
    parse_mode: 'HTML',
    reply_to_message_id: ctx.message?.message_id
  });
});

// /quote - Random quote
bot.command("quote", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  if (!(await enforceCommandCooldown(ctx))) return;
  ensureUser(ctx.from.id, ctx.from);
  
  const result = await getRandomQuote();
  
  if (!result.success) {
    return ctx.reply(`❌ ${result.error}`, {
      reply_to_message_id: ctx.message?.message_id
    });
  }
  
  await ctx.reply(
    `💬 <i>"${escapeHTML(result.quote)}"</i>\n\n— <b>${escapeHTML(result.author)}</b>`,
    { parse_mode: 'HTML', reply_to_message_id: ctx.message?.message_id }
  );
});

// /quotify - Generate Discord-style quote image
bot.command("quotify", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  if (!(await enforceCommandCooldown(ctx))) return;
  ensureUser(ctx.from.id, ctx.from);
  
  const replied = ctx.message.reply_to_message;
  
  if (!replied || !replied.text) {
    return ctx.reply(
      '🖼️ <b>Quote Image Generator</b>\n\n' +
      'Reply to a message with <code>/quotify</code> to turn it into a quote image!',
      { parse_mode: 'HTML', reply_to_message_id: ctx.message?.message_id }
    );
  }
  
  const statusMsg = await ctx.reply('🎨 Generating quote image...', {
    reply_to_message_id: ctx.message?.message_id
  });
  
  const user = replied.from;
  const username = user?.first_name || 'Anonymous';
  
  let avatarUrl = null;
  try {
    const photos = await ctx.api.getUserProfilePhotos(user.id, { limit: 1 });
    if (photos.total_count > 0) {
      const fileId = photos.photos[0][0].file_id;
      const file = await ctx.api.getFile(fileId);
      avatarUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;
    }
  } catch (e) {
    // Ignore avatar errors
  }
  
  const result = await generateQuoteImage(replied.text, username, avatarUrl);
  
  if (!result.success) {
    await ctx.api.editMessageText(
      ctx.chat.id, statusMsg.message_id,
      `❌ Failed to generate image: ${result.error}`,
      { parse_mode: 'HTML' }
    );
    return;
  }
  
  await ctx.replyWithPhoto(new InputFile(result.buffer, 'quote.png'), {
    reply_to_message_id: ctx.message?.message_id
  });
  
  await ctx.api.deleteMessage(ctx.chat.id, statusMsg.message_id);
});

// /truth - Truth question
bot.command("truth", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  if (!(await enforceCommandCooldown(ctx))) return;
  ensureUser(ctx.from.id, ctx.from);
  
  const question = getTruthOrDare('truth');
  await ctx.reply(
    `🤔 <b>Truth</b>\n\n${escapeHTML(question)}`,
    { parse_mode: 'HTML', reply_to_message_id: ctx.message?.message_id }
  );
});

// /dare - Dare challenge
bot.command("dare", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  if (!(await enforceCommandCooldown(ctx))) return;
  ensureUser(ctx.from.id, ctx.from);
  
  const dare = getTruthOrDare('dare');
  await ctx.reply(
    `😈 <b>Dare</b>\n\n${escapeHTML(dare)}`,
    { parse_mode: 'HTML', reply_to_message_id: ctx.message?.message_id }
  );
});

// /wyr - Would You Rather
bot.command("wyr", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  if (!(await enforceCommandCooldown(ctx))) return;
  ensureUser(ctx.from.id, ctx.from);
  
  const { option1, option2 } = getWouldYouRather();
  
  const kb = new InlineKeyboard()
    .text(`🅰️ Option A`, 'wyr_a')
    .text(`🅱️ Option B`, 'wyr_b');
  
  await ctx.reply(
    `🤷 <b>Would You Rather...</b>\n\n` +
    `🅰️ ${escapeHTML(option1)}\n\n` +
    `<b>OR</b>\n\n` +
    `🅱️ ${escapeHTML(option2)}`,
    { parse_mode: 'HTML', reply_markup: kb, reply_to_message_id: ctx.message?.message_id }
  );
});

// /run - Code runner
bot.command("run", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  if (!(await enforceCommandCooldown(ctx))) return;
  ensureUser(ctx.from.id, ctx.from);
  
  const text = ctx.message.text.replace(/^\/run\s*/i, '').trim();
  
  if (!text) {
    const popular = ['python', 'javascript', 'java', 'c', 'cpp', 'go', 'rust', 'ruby', 'php'];
    
    return ctx.reply(
      '💻 <b>Code Runner</b>\n\n' +
      '<b>Usage:</b>\n' +
      '<code>/run language\nyour code here</code>\n\n' +
      '<b>Example:</b>\n' +
      '<code>/run python\nprint("Hello World!")</code>\n\n' +
      `<b>Popular languages:</b> ${popular.join(', ')}\n\n` +
      `<i>50+ languages supported!</i>`,
      { parse_mode: 'HTML', reply_to_message_id: ctx.message?.message_id }
    );
  }
  
  const lines = text.split('\n');
  const language = lines[0].trim().toLowerCase();
  const code = lines.slice(1).join('\n');
  
  if (!code) {
    return ctx.reply(
      '❌ Please provide code to run.\n\n' +
      '<b>Format:</b>\n' +
      '<code>/run language\nyour code here</code>',
      { parse_mode: 'HTML', reply_to_message_id: ctx.message?.message_id }
    );
  }
  
  const statusMsg = await ctx.reply(`💻 Running ${language} code...`, {
    reply_to_message_id: ctx.message?.message_id
  });
  
  const result = await runCode(language, code);
  
  if (!result.success) {
    await ctx.api.editMessageText(
      ctx.chat.id, statusMsg.message_id,
      `❌ ${escapeHTML(result.error)}`,
      { parse_mode: 'HTML' }
    );
    return;
  }
  
  let response = `💻 <b>${escapeHTML(result.language)} ${escapeHTML(result.version)}</b>\n\n`;
  
  if (result.output) {
    response += `<b>Output:</b>\n<code>${escapeHTML(result.output.slice(0, 2000))}</code>\n`;
  }
  
  if (result.stderr) {
    response += `\n<b>Errors:</b>\n<code>${escapeHTML(result.stderr.slice(0, 500))}</code>\n`;
  }
  
  response += `\n<i>Exit code: ${result.exitCode}</i>`;
  
  await ctx.api.editMessageText(
    ctx.chat.id, statusMsg.message_id,
    response,
    { parse_mode: 'HTML' }
  );
});

// /wallpaper - Search wallpapers
bot.command("wallpaper", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  if (!(await enforceCommandCooldown(ctx))) return;
  ensureUser(ctx.from.id, ctx.from);
  
  const text = ctx.message.text.replace(/^\/wallpaper\s*/i, '').trim();
  
  if (!text) {
    return ctx.reply(
      '🖼️ <b>Wallpaper Search</b>\n\n' +
      '<b>Usage:</b>\n' +
      '<code>/wallpaper search term</code>\n\n' +
      '<b>Examples:</b>\n' +
      '<code>/wallpaper nature</code>\n' +
      '<code>/wallpaper cyberpunk city</code>',
      { parse_mode: 'HTML', reply_to_message_id: ctx.message?.message_id }
    );
  }
  
  const statusMsg = await ctx.reply('🔍 Searching wallpapers...', {
    reply_to_message_id: ctx.message?.message_id
  });
  
  const result = await searchWallpapers(text);
  
  if (!result.success) {
    await ctx.api.editMessageText(
      ctx.chat.id, statusMsg.message_id,
      `❌ ${result.error}`,
      { parse_mode: 'HTML' }
    );
    return;
  }
  
  const wallpaper = result.wallpapers[0];
  
  const kb = new InlineKeyboard();
  if (result.wallpapers.length > 1) {
    kb.text('Next →', `wp_next:${encodeURIComponent(text)}:1`);
  }
  kb.row().url('🔗 Full Resolution', wallpaper.url);
  
  await ctx.api.deleteMessage(ctx.chat.id, statusMsg.message_id);
  
  await ctx.replyWithPhoto(wallpaper.thumbnail, {
    caption: `🖼️ <b>Wallpaper</b> (1/${result.wallpapers.length})\n\nResolution: ${wallpaper.resolution}`,
    parse_mode: 'HTML',
    reply_markup: kb,
    reply_to_message_id: ctx.message?.message_id
  });
});

// /roast - AI roast generator
bot.command("roast", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  if (!(await enforceCommandCooldown(ctx))) return;
  ensureUser(ctx.from.id, ctx.from);
  
  const target = ctx.message.reply_to_message?.from?.first_name || ctx.from.first_name;
  
  const roasts = [
    `${target}, you're not stupid; you just have bad luck thinking.`,
    `${target}, I'd agree with you but then we'd both be wrong.`,
    `${target}, you're like a cloud. When you disappear, it's a beautiful day.`,
    `${target}, I'm not saying I hate you, but I would unplug your life support to charge my phone.`,
    `${target}, you bring everyone so much joy... when you leave.`,
    `${target}, if I had a face like yours, I'd sue my parents.`,
    `${target}, you're the reason the gene pool needs a lifeguard.`,
    `${target}, I'd explain it to you but I left my crayons at home.`,
    `${target}, you're not completely useless. You can always serve as a bad example.`,
    `${target}, somewhere out there is a tree producing oxygen for you. You owe it an apology.`
  ];
  
  const roast = roasts[Math.floor(Math.random() * roasts.length)];
  
  await ctx.reply(
    `🔥 <b>Roast</b>\n\n${escapeHTML(roast)}`,
    { parse_mode: 'HTML', reply_to_message_id: ctx.message?.message_id }
  );
});

// /pickup - Pickup lines
bot.command("pickup", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  if (!(await enforceCommandCooldown(ctx))) return;
  ensureUser(ctx.from.id, ctx.from);
  
  const lines = [
    "Are you a magician? Because whenever I look at you, everyone else disappears.",
    "Do you have a map? Because I just got lost in your eyes.",
    "Is your name Google? Because you have everything I've been searching for.",
    "Are you a parking ticket? Because you've got 'fine' written all over you.",
    "Do you believe in love at first sight, or should I walk by again?",
    "Is your dad a boxer? Because you're a knockout!",
    "Are you a campfire? Because you're hot and I want s'more.",
    "Do you have a Band-Aid? Because I just scraped my knee falling for you.",
    "Is there an airport nearby, or is that just my heart taking off?",
    "Are you a time traveler? Because I see you in my future."
  ];
  
  const line = lines[Math.floor(Math.random() * lines.length)];
  
  await ctx.reply(
    `💕 <b>Pickup Line</b>\n\n<i>${escapeHTML(line)}</i>`,
    { parse_mode: 'HTML', reply_to_message_id: ctx.message?.message_id }
  );
});

// Callback for media info
bot.callbackQuery(/^media_info:/, async (ctx) => {
  const [, type, id] = ctx.callbackQuery.data.split(':');
  
  await ctx.answerCallbackQuery({ text: 'Loading details...' });
  
  const result = await getMediaDetails(id, type);
  
  if (!result.success) {
    await ctx.answerCallbackQuery({ text: result.error, show_alert: true });
    return;
  }
  
  const d = result.details;
  const title = d.title || d.name;
  const year = (d.release_date || d.first_air_date || '').slice(0, 4);
  const rating = d.vote_average ? `⭐ ${d.vote_average.toFixed(1)}/10` : '';
  const runtime = d.runtime ? `${d.runtime} min` : d.episode_run_time?.[0] ? `${d.episode_run_time[0]} min/ep` : '';
  const genres = d.genres?.map(g => g.name).join(', ') || '';
  
  let response = `🎬 <b>${escapeHTML(title)}</b> ${year ? `(${year})` : ''}\n\n`;
  response += `${rating} ${runtime ? `• ${runtime}` : ''}\n`;
  if (genres) response += `📎 ${escapeHTML(genres)}\n`;
  response += `\n${escapeHTML(d.overview?.slice(0, 500) || 'No description available.')}\n`;
  
  if (result.recommendations && result.recommendations.length > 0) {
    response += `\n<b>Similar:</b> `;
    response += result.recommendations.slice(0, 3).map(r => escapeHTML(r.title || r.name)).join(', ');
  }
  
  const kb = new InlineKeyboard();
  
  const trailers = await getTrailers(id, type);
  if (trailers.success && trailers.trailers.length > 0) {
    const trailer = trailers.trailers[0];
    kb.url('🎬 Watch Trailer', `https://youtube.com/watch?v=${trailer.key}`);
  }
  
  kb.url('📖 More Info', `https://themoviedb.org/${type}/${id}`);
  
  if (d.poster_path) {
    try {
      await ctx.editMessageMedia({
        type: 'photo',
        media: `https://image.tmdb.org/t/p/w500${d.poster_path}`,
        caption: response.slice(0, 1024),
        parse_mode: 'HTML'
      }, { reply_markup: kb });
    } catch (e) {
      await ctx.editMessageText(response, {
        parse_mode: 'HTML',
        reply_markup: kb
      });
    }
  } else {
    await ctx.editMessageText(response, {
      parse_mode: 'HTML',
      reply_markup: kb
    });
  }
});

// Callback for wallpaper navigation
bot.callbackQuery(/^wp_next:/, async (ctx) => {
  const [, query, indexStr] = ctx.callbackQuery.data.split(':');
  const index = parseInt(indexStr);
  
  await ctx.answerCallbackQuery();
  
  const result = await searchWallpapers(decodeURIComponent(query));
  
  if (!result.success || index >= result.wallpapers.length) {
    await ctx.answerCallbackQuery({ text: 'No more wallpapers', show_alert: true });
    return;
  }
  
  const wallpaper = result.wallpapers[index];
  
  const kb = new InlineKeyboard();
  if (index > 0) {
    kb.text('← Prev', `wp_next:${query}:${index - 1}`);
  }
  if (index < result.wallpapers.length - 1) {
    kb.text('Next →', `wp_next:${query}:${index + 1}`);
  }
  kb.row().url('🔗 Full Resolution', wallpaper.url);
  
  try {
    await ctx.editMessageMedia({
      type: 'photo',
      media: wallpaper.thumbnail,
      caption: `🖼️ <b>Wallpaper</b> (${index + 1}/${result.wallpapers.length})\n\nResolution: ${wallpaper.resolution}`,
      parse_mode: 'HTML'
    }, { reply_markup: kb });
  } catch (e) {
    // Ignore edit errors
  }
});

// Callback for auto-detected media download (uses URL cache to avoid 64-byte limit)
bot.callbackQuery(/^adl:/, async (ctx) => {
  const [, mode, urlId] = ctx.callbackQuery.data.split(':');
  const url = pendingDownloadUrls.get(urlId);
  
  if (!url) {
    await ctx.answerCallbackQuery({ text: 'Link expired. Please send the link again.', show_alert: true });
    return;
  }
  
  const audioOnly = mode === 'a';
  await ctx.answerCallbackQuery({ text: 'Starting download...' });
  
  const platform = detectPlatform(url);
  const emoji = platform ? PLATFORM_EMOJI[platform] : '📥';
  
  try {
    await ctx.editMessageText(
      `${emoji} <b>Downloading ${audioOnly ? 'audio' : 'video'}...</b>\n\nThis may take a moment...`,
      { parse_mode: 'HTML' }
    );
    
    const result = await downloadMedia(url, audioOnly);
    
    if (!result.success) {
      await ctx.editMessageText(
        `❌ Download failed: ${escapeHTML(result.error)}`,
        { parse_mode: 'HTML' }
      );
      return;
    }
    
    await ctx.editMessageText(
      `${emoji} <b>Sending to Telegram...</b>`,
      { parse_mode: 'HTML' }
    );
    
    // Build caption
    let caption = `${emoji} <b>${escapeHTML(result.title || 'Downloaded')}</b>`;
    if (result.author) caption += `\n👤 ${escapeHTML(result.author)}`;
    if (result.album) caption += `\n💿 ${escapeHTML(result.album)}`;
    if (result.quality) caption += `\n🎵 ${result.quality}`;
    caption += `\n\n<i>Downloaded via StarzAI</i>`;
    
    // API-based downloads return URLs directly, not file paths
    if (result.url) {
      // Send directly using URL
      if (audioOnly || result.type === 'audio' || result.isMusic) {
        // For music, send as audio with proper metadata
        await ctx.replyWithAudio(result.url, {
          caption: caption,
          parse_mode: 'HTML',
          title: result.title,
          performer: result.author
        });
      } else if (result.type === 'slideshow' && result.images) {
        // TikTok slideshow - send as media group
        const mediaGroup = result.images.slice(0, 10).map((img, i) => ({
          type: 'photo',
          media: img,
          caption: i === 0 ? caption : undefined,
          parse_mode: i === 0 ? 'HTML' : undefined
        }));
        await ctx.replyWithMediaGroup(mediaGroup);
        if (result.music) {
          await ctx.replyWithAudio(result.music, { caption: '🎵 Audio' });
        }
      } else {
        await ctx.replyWithVideo(result.url, {
          caption: caption,
          parse_mode: 'HTML',
          supports_streaming: true
        });
      }
    } else if (result.filePath) {
      // Legacy file-based download (fallback)
      const fs = await import('fs');
      const { InputFile } = await import('grammy');
      const fileBuffer = fs.default.readFileSync(result.filePath);
      const inputFile = new InputFile(fileBuffer, result.filename);
      
      if (audioOnly) {
        await ctx.replyWithAudio(inputFile, { caption: caption, parse_mode: 'HTML' });
      } else {
        await ctx.replyWithVideo(inputFile, { caption: caption, parse_mode: 'HTML' });
      }
      cleanupDownload(result.filePath);
    }
    
    await ctx.deleteMessage();
    pendingDownloadUrls.delete(urlId);
    
  } catch (error) {
    await ctx.editMessageText(
      `❌ Error: ${escapeHTML(error.message)}`,
      { parse_mode: 'HTML' }
    );
  }
});

// =====================
// CALLBACKS: UNIFIED MENU NAVIGATION
// =====================

// Back to main menu
bot.callbackQuery("menu_back", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  await ctx.answerCallbackQuery();
  
  try {
    await ctx.editMessageText(buildMainMenuMessage(ctx.from.id), {
      parse_mode: "Markdown",
      reply_markup: mainMenuKeyboard(ctx.from.id)
    });
  } catch (e) {
    // If edit fails (message unchanged), ignore
  }
});

// Features menu
bot.callbackQuery("menu_features", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  await ctx.answerCallbackQuery();
  
  const featuresText = [
    "🌟 *StarzAI Features*",
    "",
    "⚡ *AI Modes (Inline)*",
    "• ⭐ *Quark* (`q:`) - Lightning fast answers",
    "• 🗿🔬 *Blackhole* (`b:`) - Deep research & analysis",
    "• 💻 *Code* (`code:`) - Programming help & snippets",
    "• 🧠 *Explain* (`e:`) - Simple ELI5 explanations",
    "• 🎭 *Character* (`as:`) - Roleplay as any character",
    "• 📝 *Summarize* (`sum:`) - Condense long text",
    "",
    "🤝🏻 *AI Partner*",
    "Create your personalized AI companion!",
    "• Custom name, personality, background",
    "• Persistent chat memory",
    "• Works in DM and inline (`p:`)",
    "",
    "🎭 *Character Mode*",
    "Quick roleplay as existing characters!",
    "• `/char yoda` - Start as Yoda",
    "• `/char save yoda` - Save to favorites",
    "• `/char stop` - End character mode",
    "",
    "🎨 *AI Image Generator*",
    "Create stunning images from text!",
    "• `/img prompt` - Fast turbo model",
    "• `/img2 prompt` - Flux model (alt style)",
    "• `/imagine prompt` - Free alternative",
    "• Or just say: \"generate image of...\" or \"draw...\"",
    "• `/imgset` - Set default ratio & safe mode",
    "",
    "📊 *Stats*",
    "• /stats - Your usage statistics",
    "",
    "📋 *Task Manager*",
    "Advanced to-do list with priorities!",
    "• `/todo` - View your tasks",
    "• `/todo add task` - Quick add",
    "• Categories, due dates, streaks",
  ].join("\n");
  
  const kb = new InlineKeyboard()
    .text("📋 Tasks", "todo_list")
    .text("🎨 Image Settings", "menu_imgset")
    .row()
    .text("💳 Plans & Benefits", "menu_plans")
    .text("« Back to Menu", "menu_back");
  
  try {
    await ctx.editMessageText(featuresText, {
      parse_mode: "Markdown",
      reply_markup: kb
    });
  } catch (e) {
    // If edit fails, ignore
  }
});

// Image Settings menu (from Features)
bot.callbackQuery("menu_imgset", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  await ctx.answerCallbackQuery();
  
  const u = ctx.from;
  if (!u?.id) return;
  
  const user = ensureUser(u.id, u);
  const isOwnerUser = OWNER_IDS.has(String(u.id));
  
  const currentRatio = user.imagePrefs?.defaultRatio || "1:1";
  const currentConfig = IMG_ASPECT_RATIOS[currentRatio];
  const currentSafeMode = shouldEnforceSafeMode(u.id);
  const canToggle = canToggleSafeMode(u.id);
  
  const buttons = [
    [
      { text: `${currentRatio === "1:1" ? "✅ " : ""}⬜ Square`, callback_data: "imgset_ratio:1:1" },
      { text: `${currentRatio === "4:3" ? "✅ " : ""}🖼️ Landscape`, callback_data: "imgset_ratio:4:3" },
      { text: `${currentRatio === "3:4" ? "✅ " : ""}📱 Portrait`, callback_data: "imgset_ratio:3:4" }
    ],
    [
      { text: `${currentRatio === "16:9" ? "✅ " : ""}🎬 Widescreen`, callback_data: "imgset_ratio:16:9" },
      { text: `${currentRatio === "9:16" ? "✅ " : ""}📲 Story`, callback_data: "imgset_ratio:9:16" },
      { text: `${currentRatio === "3:2" ? "✅ " : ""}📷 Photo`, callback_data: "imgset_ratio:3:2" }
    ]
  ];
  
  // Add safe mode toggle button for premium/ultra users
  if (canToggle) {
    buttons.push([
      { 
        text: currentSafeMode ? "🔒 Safe Mode: ON (tap to disable)" : "🔓 Safe Mode: OFF (tap to enable)", 
        callback_data: currentSafeMode ? "imgset_safe:off" : "imgset_safe:on" 
      }
    ]);
  }
  
  // Add back to features button
  buttons.push([
    { text: "« Back to Features", callback_data: "menu_features" }
  ]);
  
  let settingsText = `🎨 *Image Settings*\n\n` +
    `📐 *Default Ratio:* ${currentConfig?.icon || '⬜'} ${currentConfig?.label || 'Square'} (${currentRatio})\n\n` +
    `Select your default aspect ratio for /img:`;
  
  // Show safe mode status
  if (isOwnerUser) {
    settingsText += `\n\n🔓 *Safe Mode:* OFF _(owners unrestricted)_`;
  } else if (user.tier === 'free') {
    settingsText += `\n\n🔒 *Safe Mode:* ON _(always on for free users)_`;
  } else {
    settingsText += `\n\n${currentSafeMode ? '🔒' : '🔓'} *Safe Mode:* ${currentSafeMode ? 'ON' : 'OFF'}`;
  }
  
  // Show steps setting for owners
  if (isOwnerUser) {
    const currentSteps = user.imagePrefs?.steps || 8;
    settingsText += `\n\n🔧 *Steps:* ${currentSteps} _(owner only)_\n` +
      `Use \`/imgset steps [1-50]\` to change`;
  }
  
  settingsText += `\n\n_Tap a ratio to set it as your default._`;
  
  try {
    await ctx.editMessageText(settingsText, {
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: buttons }
    });
  } catch (e) {
    await ctx.reply(settingsText, {
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: buttons }
    });
  }
});

// Plans & benefits menu
bot.callbackQuery("menu_plans", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  await ctx.answerCallbackQuery();

  const user = getUserRecord(ctx.from.id);
  const tierRaw = user?.tier || "free";
  const tier = tierRaw.toUpperCase();
  const tierEmoji = tierRaw === "ultra" ? "💎" : tierRaw === "premium" ? "⭐" : "🆓";

  const msg = [
    "💳 *StarzAI Plans & Benefits*",
    "",
    `Your current plan: ${tierEmoji} *${tier}*`,
    "",
    "🆓 *Free*",
    "• Access to fast free models",
    "• Inline modes: Quark, Explain, Summarize, Code, Blackhole, etc.",
    "• Shorter/Longer: 1 transform total per answer (then Revert only)",
    "• No Ultra Summary button",
    "",
    "⭐ *Premium*",
    "• Everything in Free",
    "• Access to premium models",
    "• Shorter/Longer: up to 2 transforms per answer",
    "• Faster responses and higher quality",
    "",
    "💎 *Ultra*",
    "• Everything in Premium",
    "• Access to all Ultra models",
    "• Shorter: 2x and Longer: 2x per answer, with Revert",
    "• 🧾 Ultra Summary for long Blackhole/Explain/Code answers",
    "",
    "_Upgrades are managed manually for now. Contact the owner or support to get Premium/Ultra access._",
  ].join("\n");

  const kb = new InlineKeyboard()
    .text("🌟 Features", "menu_features")
    .row()
    .text("« Back to Menu", "menu_back");

  try {
    await ctx.editMessageText(msg, { parse_mode: "Markdown", reply_markup: kb });
  } catch (e) {
    await ctx.reply(msg, { parse_mode: "Markdown", reply_markup: kb });
  }
});

// Model menu
bot.callbackQuery("menu_model", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  await ctx.answerCallbackQuery();
  
  const u = ensureUser(ctx.from.id, ctx.from);
  const current = ensureChosenModelValid(ctx.from.id);
  
  try {
    await ctx.editMessageText(
      `⚙️ *Model Selection*\n\n👤 Plan: *${u.tier.toUpperCase()}*\n🤖 Current: \`${current}\`\n\n_Select a category:_`,
      { parse_mode: "Markdown", reply_markup: modelCategoryKeyboard(u.tier) }
    );
  } catch (e) {
    // If edit fails, ignore
  }
});

// Partner menu
bot.callbackQuery("menu_partner", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  await ctx.answerCallbackQuery();
  
  const partner = getPartner(ctx.from.id);
  
  try {
    await ctx.editMessageText(
      buildPartnerSetupMessage(partner),
      { parse_mode: "Markdown", reply_markup: buildPartnerKeyboard(partner) }
    );
  } catch (e) {
    // If edit fails, ignore
  }
});

// Stats menu
bot.callbackQuery("menu_stats", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  await ctx.answerCallbackQuery();
  
  const u = ctx.from;
  const user = getUserRecord(u.id);
  
  if (!user) {
    return ctx.answerCallbackQuery({ text: "❌ Not registered yet!", show_alert: true });
  }
  
  const userStats = user.stats || { totalMessages: 0, totalInlineQueries: 0, lastActive: null };
  const shortModel = (user.model || ensureChosenModelValid(u.id)).split("/").pop();
  
  // Calculate days since registration
  const regDate = new Date(user.registeredAt || Date.now());
  const daysSinceReg = Math.floor((Date.now() - regDate.getTime()) / (1000 * 60 * 60 * 24));
  
  // Format last active
  const lastActive = userStats.lastActive ? new Date(userStats.lastActive).toLocaleDateString() : "Never";
  
  const tierEmoji = user.tier === "ultra" ? "💎" : user.tier === "premium" ? "⭐" : "🆓";
  
  const stats = [
    `📊 *Your StarzAI Stats*`,
    ``,
    `👤 *User:* ${user.firstName || "Unknown"} (@${user.username || "no username"})`,
    `${tierEmoji} *Plan:* ${(user.tier || "free").toUpperCase()}`,
    `🤖 *Model:* \`${shortModel}\``,
    ``,
    `💬 *DM Messages:* ${(userStats.totalMessages || 0).toLocaleString()}`,
    `⚡ *Inline Queries:* ${(userStats.totalInlineQueries || 0).toLocaleString()}`,
    `📝 *Total Interactions:* ${((userStats.totalMessages || 0) + (userStats.totalInlineQueries || 0)).toLocaleString()}`,
    ``,
    `📅 *Member for:* ${daysSinceReg} days`,
    `🕒 *Last Active:* ${lastActive}`,
    ``,
    `_Keep chatting to grow your stats!_`,
  ].join("\n");
  
  const keyboard = new InlineKeyboard()
    .text("« Back to Menu", "menu_back");
  
  try {
    await ctx.editMessageText(stats, {
      parse_mode: "Markdown",
      reply_markup: keyboard
    });
  } catch (e) {
    // If edit fails, ignore
  }
});

// History menu (inside stats) - DISABLED
bot.callbackQuery("menu_history", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  await ctx.answerCallbackQuery({ text: "History feature has been disabled to optimize database performance.", show_alert: true });
  
  try {
    await ctx.editMessageText(
      "⚠️ *History feature has been disabled*\n\nThis feature has been removed to optimize database performance and reduce storage costs.\n\n_You can still use inline mode by typing @starztechbot in any chat!_",
      { parse_mode: "Markdown", reply_markup: new InlineKeyboard().text("← Back to Stats", "menu_stats").row().text("« Back to Menu", "menu_back") }
    );
  } catch (e) {}
});

// Character menu
bot.callbackQuery("menu_char", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  await ctx.answerCallbackQuery();
  
  const userId = ctx.from?.id;
  const chatId = ctx.chat?.id;
  
  const activeChar = getActiveCharacter(userId, chatId);
  const savedChars = getSavedCharacters(userId);
  
  const statusText = activeChar 
    ? `🎭 *Active Character:* ${activeChar.name}\n\n`
    : "🎭 *No active character*\n\n";
  
  const savedList = savedChars.length > 0
    ? `💾 *Saved Characters:*\n${savedChars.map((c, i) => `${i + 1}. ${c}`).join("\n")}\n\n`
    : "";
  
  const helpText = [
    statusText,
    savedList,
    "*Commands:*",
    "• `/char yoda` - Start as Yoda",
    "• `/char save yoda` - Save character",
    "• `/char list` - Show saved",
    "• `/char stop` or `/default` - Stop",
    "",
    "_Tap a character button to start!_",
  ].join("\n");
  
  try {
    await ctx.editMessageText(helpText, { 
      parse_mode: "Markdown",
      reply_markup: buildCharacterKeyboard(savedChars, activeChar)
    });
  } catch (e) {
    // If edit fails, ignore
  }
});

// DM/GC AI-Continue button: ask the model to extend its previous answer
bot.callbackQuery(/^dm_ai_cont:(.+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  const data = ctx.callbackQuery.data || "";
  const match = data.match(/^dm_ai_cont:(.+)$/);
  if (!match) {
    return ctx.answerCallbackQuery();
  }

  const key = match[1];
  const entry = dmContinueCache.get(key);
  if (!entry) {
    return ctx.answerCallbackQuery({ text: "Session expired. Please ask again.", show_alert: true });
  }

  const callerId = String(ctx.from?.id || "");
  if (callerId !== String(entry.userId)) {
    return ctx.answerCallbackQuery({ text: "Only the original requester can continue this answer.", show_alert: true });
  }

  // Stop the spinner immediately and show a small toast
  await ctx.answerCallbackQuery({ text: "Continuing...", show_alert: false });

  // Remove the old Continue button to avoid spam clicks
  try {
    // Calling without arguments clears the inline keyboard in the current message
    await ctx.editMessageReplyMarkup();
  } catch {
    // ignore if we can't edit the old markup
  }

  dmContinueCache.delete(key);

  const { chatId, model, systemPrompt, userTextWithContext, modeLabel, sourcesHtml } = entry;

  // Send a temporary status message that we'll edit with the continuation
  const statusMsg = await ctx.reply("⏳ <i>Continuing...</i>", {
    parse_mode: "HTML",
    reply_to_message_id: ctx.callbackQuery.message?.message_id,
  });

  const startTime = Date.now();

  try {
    const continuedSystemPrompt =
      systemPrompt +
      " You are continuing your previous answer for the same request. Do not repeat what you've already said; just continue from where you left off." +
      " When you have fully covered all essential points and there is nothing important left to add, append the exact token END_OF_ANSWER at the very end of your final continuation. Do not use this token on partial continuations.";

    const continuedUserText =
      `${userTextWithContext}\n\nContinue the answer from where you left off. ` +
      "Add further important details or sections that you didn't reach yet.";

    let more = await llmChatReply({
      chatId,
      userText: continuedUserText,
      systemPrompt: continuedSystemPrompt,
      model,
    });

    let finished = false;
    if (typeof more === "string" && more.includes("END_OF_ANSWER")) {
      finished = true;
      // Strip the marker from the visible text
      more = more.replace(/END_OF_ANSWER\s*$/g, "").replace(/END_OF_ANSWER/g, "").trimEnd();
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const rawOutput =
      more && more.trim()
        ? more.slice(0, 3600)
        : "_No further details were generated._";
    const formatted = convertToTelegramHTML(rawOutput);
    const htmlModeLabel = modeLabel
      ? modeLabel.replace(/\*([^*]+)\*/g, "<b>$1</b>").replace(/_([^_]+)_/g, "<i>$1</i>")
      : "";

    // Offer another Continue button only if the model did NOT signal completion.
    // We rely on the END_OF_ANSWER marker instead of length heuristics.
    let replyMarkup;
    if (!finished) {
      const newKey = makeId(8);
      dmContinueCache.set(newKey, {
        userId: entry.userId,
        chatId,
        model,
        systemPrompt,
        userTextWithContext,
        modeLabel,
        sourcesHtml,
        createdAt: Date.now(),
      });
      replyMarkup = new InlineKeyboard().text("➡️ Continue", `dm_ai_cont:${newKey}`);
    }

    const replyText =
      `${htmlModeLabel}${formatted}` +
      (sourcesHtml || "") +
      `\n\n<i>⚡ ${elapsed}s • ${model}${finished ? " • end" : ""}</i>`;

    await ctx.api.editMessageText(chatId, statusMsg.message_id, replyText, {
      parse_mode: "HTML",
      reply_markup: replyMarkup,
    });
  } catch (e) {
    console.error("DM AI-continue error:", e);
    try {
      await ctx.api.editMessageText(
        chatId,
        statusMsg.message_id,
        "❌ <i>Error while continuing. Try again.</i>",
        { parse_mode: "HTML" }
      );
    } catch {
      // ignore
    }
  }
});

// Original menu_register handler
bot.callbackQuery("menu_register", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const u = ctx.from;
  if (!u?.id) return ctx.answerCallbackQuery({ text: "No user id.", show_alert: true });
  
  const existing = getUserRecord(u.id);
  if (!existing) registerUser(u);
  
  await ctx.answerCallbackQuery({ text: existing ? "✅ Already registered!" : "✅ Registered!" });
  
  // Update the main menu to show new status
  try {
    await ctx.editMessageText(buildMainMenuMessage(ctx.from.id), {
      parse_mode: "Markdown",
      reply_markup: mainMenuKeyboard(ctx.from.id)
    });
  } catch (e) {
    // If edit fails, ignore
  }
});

// Toggle web search setting
bot.callbackQuery("toggle_websearch", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const userId = ctx.from.id;
  const user = getUserRecord(userId);
  
  if (!user) {
    return ctx.answerCallbackQuery({ text: "Please register first!", show_alert: true });
  }
  
  // Toggle the setting
  const newValue = !user.webSearch;
  usersDb.users[String(userId)].webSearch = newValue;
  saveUsers();
  
  await ctx.answerCallbackQuery({ 
    text: newValue ? "🌐 Web Search ON - All messages will include web results!" : "🔍 Web Search OFF - Auto-detect mode",
    show_alert: false
  });
  
  // Update the menu to show new toggle state
  try {
    await ctx.editMessageText(buildMainMenuMessage(userId), {
      parse_mode: "Markdown",
      reply_markup: mainMenuKeyboard(userId)
    });
  } catch (e) {
    // If edit fails, ignore
  }
});

// =====================
// CALLBACKS: LEGACY (for backwards compatibility)
// =====================

// Noop callback for tier headers (non-clickable)
bot.callbackQuery("noop", async (ctx) => {
  await ctx.answerCallbackQuery();
});

bot.callbackQuery("help_features", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  await ctx.answerCallbackQuery();
  
  const featuresText = [
    "🌟 *StarzAI Features*",
    "",
    "⚡ *AI Modes (Inline)*",
    "• ⭐ *Quark* (`q:`) - Lightning fast answers",
    "• 🗿🔬 *Blackhole* (`b:`) - Deep research & analysis",
    "• 💻 *Code* (`code:`) - Programming help & snippets",
    "• 🧠 *Explain* (`e:`) - Simple ELI5 explanations",
    "• 🎭 *Character* (`as:`) - Roleplay as any character",
    "• 📝 *Summarize* (`sum:`) - Condense long text",
    "",
    "🤝🏻 *AI Partner*",
    "Create your personalized AI companion!",
    "• Custom name, personality, background",
    "• Persistent chat memory",
    "• Works in DM and inline (`p:`)",
    "_Use /partner to set up_",
    "",
    "🎭 *Character Mode*",
    "Quick roleplay as existing characters!",
    "• `/char yoda` - Start as Yoda",
    "• `/char save yoda` - Save to favorites",
    "• `/char list` - View saved characters",
    "• `/char stop` - End character mode",
    "_Works in DM and group chats_",
    "",
    "🎨 *AI Image Generator*",
    "Create stunning images from text!",
    "• `/img prompt` - Fast turbo model",
    "• `/img2 prompt` - Flux model (alt style)",
    "• `/imagine prompt` - Free alternative",
    "• Or just say: \"generate image of...\" or \"draw...\"",
    "• `/imgset` - Set default ratio & safe mode",
    "",
    "📊 *Stats*",
    "• /stats - Your usage statistics",
    "",
    "📡 *Multi-Platform*",
    "• DM - Direct chat with AI",
    "• Groups - Say \"Starz\" / \"Ai\" or reply to the bot",
    "• Inline - Type @starztechbot anywhere",
  ].join("\n");
  
  await ctx.reply(featuresText, { parse_mode: "Markdown", reply_markup: helpKeyboard() });
});

bot.callbackQuery("do_register", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;

  const u = ctx.from;
  if (!u?.id) return ctx.answerCallbackQuery({ text: "No user id.", show_alert: true });

  if (!getUserRecord(u.id)) registerUser(u);

  await ctx.answerCallbackQuery({ text: "Registered ✅" });
  await ctx.reply("✅ Registered! Use /model to choose models.", { reply_markup: helpKeyboard() });
});

bot.callbackQuery("do_whoami", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;

  const u = ensureUser(ctx.from.id, ctx.from);
  const model = ensureChosenModelValid(ctx.from.id);
  
  await ctx.answerCallbackQuery();
  await ctx.reply(`Your userId: ${ctx.from.id}\nTier: ${u.tier}\nCurrent model: ${model}`);
});

bot.callbackQuery("open_model", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;

  const u = ensureUser(ctx.from.id, ctx.from);
  const current = ensureChosenModelValid(ctx.from.id);

  await ctx.answerCallbackQuery();
  await ctx.reply(
    `👤 Plan: *${u.tier.toUpperCase()}*\n🤖 Current: \`${current}\`\n\nSelect a category:`,
    { parse_mode: "Markdown", reply_markup: modelCategoryKeyboard(u.tier) }
  );
});

// Category selection callback
bot.callbackQuery(/^model_cat:(free|premium|ultra)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const match = ctx.callbackQuery.data.match(/^model_cat:(free|premium|ultra)$/);
  if (!match) return ctx.answerCallbackQuery({ text: "Invalid.", show_alert: true });
  
  const category = match[1];
  const u = ensureUser(ctx.from.id, ctx.from);
  const current = ensureChosenModelValid(ctx.from.id);
  
  // Check access
  if (category === "premium" && u.tier === "free") {
    return ctx.answerCallbackQuery({ text: "🔒 Premium tier required", show_alert: true });
  }
  if (category === "ultra" && u.tier !== "ultra") {
    return ctx.answerCallbackQuery({ text: "🔒 Ultra tier required", show_alert: true });
  }
  
  await ctx.answerCallbackQuery();
  
  try {
    await ctx.editMessageText(
      `${categoryTitle(category)} *Models*\n\n🤖 Current: \`${current}\`\n\n_Select a model:_`,
      { parse_mode: "Markdown", reply_markup: modelListKeyboard(category, current, u.tier) }
    );
  } catch {
    // If edit fails, ignore
  }
});

// Back button callback
bot.callbackQuery("model_back", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const u = ensureUser(ctx.from.id, ctx.from);
  const current = ensureChosenModelValid(ctx.from.id);
  
  await ctx.answerCallbackQuery();
  
  try {
    await ctx.editMessageText(
      `⚙️ *Model Selection*\n\n👤 Plan: *${u.tier.toUpperCase()}*\n🤖 Current: \`${current}\`\n\n_Select a category:_`,
      { parse_mode: "Markdown", reply_markup: modelCategoryKeyboard(u.tier) }
    );
  } catch {
    // If edit fails, ignore
  }
});

// Handle pagination for model selection
bot.callbackQuery(/^model_page:(.+):(\d+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const match = ctx.callbackQuery.data.match(/^model_page:(.+):(\d+)$/);
  if (!match) return ctx.answerCallbackQuery({ text: "Invalid.", show_alert: true });
  
  const category = match[1];
  const page = parseInt(match[2], 10);
  const u = ensureUser(ctx.from.id, ctx.from);
  const current = ensureChosenModelValid(ctx.from.id);
  
  await ctx.answerCallbackQuery();
  
  try {
    await ctx.editMessageText(
      `${categoryTitle(category)} *Models*\n\n🤖 Current: \`${current}\`\n\n_Select a model:_`,
      { parse_mode: "Markdown", reply_markup: modelListKeyboard(category, current, u.tier, page) }
    );
  } catch {
    // If edit fails, ignore
  }
});

bot.callbackQuery(/^(set_model|setmodel):(.+)$/i, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;

  const match = ctx.callbackQuery.data.match(/^(?:set_model|setmodel):(.+)$/i);
  if (!match) return ctx.answerCallbackQuery({ text: "Invalid.", show_alert: true });

  const modelId = match[1];
  const u = ensureUser(ctx.from.id, ctx.from);
  const allowed = allModelsForTier(u.tier);

  if (!allowed.includes(modelId)) {
    return ctx.answerCallbackQuery({ text: "Model not available for your tier.", show_alert: true });
  }

  u.model = modelId;
  saveUsers();

  // Also update inline session model
  updateInlineSession(ctx.from.id, { model: modelId });

  await ctx.answerCallbackQuery({ text: `✅ Switched to ${modelId}` });

  try {
    // Show success message with back options
    await ctx.editMessageText(
      `✅ *Model Changed*\n\n🤖 Now using: \`${modelId}\`\n👤 Plan: *${u.tier.toUpperCase()}*`,
      { 
        parse_mode: "Markdown", 
        reply_markup: { 
          inline_keyboard: [
            [{ text: "← Back to Models", callback_data: "model_back" }],
            [{ text: "« Back to Menu", callback_data: "menu_back" }]
          ] 
        } 
      }
    );
  } catch {
    // ignore if can't edit
  }
});

// =====================
// INLINE CHAT CALLBACKS
// =====================

// Reply button - prompts user to type
bot.callbackQuery(/^ichat_reply:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery({ text: "Type your message below! 💬" });
});

// Regenerate last response
bot.callbackQuery(/^ichat_regen:(.+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const userId = ctx.from?.id;
  if (!userId) return ctx.answerCallbackQuery({ text: "Error", show_alert: true });
  
  const session = getInlineSession(userId);
  
  if (session.history.length < 2) {
    return ctx.answerCallbackQuery({ text: "No message to regenerate!", show_alert: true });
  }
  
  await ctx.answerCallbackQuery({ text: "Regenerating... ⏳" });
  
  try {
    // Get last user message
    const lastUserMsg = [...session.history].reverse().find(m => m.role === "user");
    if (!lastUserMsg) {
      return ctx.answerCallbackQuery({ text: "No user message found!", show_alert: true });
    }
    
    // Remove last assistant message
    if (session.history[session.history.length - 1].role === "assistant") {
      session.history.pop();
    }
    // Remove last user message too (will be re-added)
    if (session.history[session.history.length - 1]?.role === "user") {
      session.history.pop();
    }
    saveInlineSessions();
    
    // Regenerate
    const model = session.model || ensureChosenModelValid(userId);
    await llmInlineChatReply({ userId, userText: lastUserMsg.content, model });
    
    // Update the message
    const updatedSession = getInlineSession(userId);
    const sessionKey = makeId(6);
    
    await ctx.editMessageText(
      formatInlineChatDisplay(updatedSession, userId),
      { 
        parse_mode: "Markdown",
        reply_markup: inlineChatKeyboard(sessionKey, updatedSession.history.length > 0)
      }
    );
  } catch (e) {
    console.error("Regen error:", e);
    await ctx.answerCallbackQuery({ text: "Failed to regenerate. Try again.", show_alert: true });
  }
});

// Clear conversation
bot.callbackQuery(/^ichat_clear:(.+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const userId = ctx.from?.id;
  if (!userId) return ctx.answerCallbackQuery({ text: "Error", show_alert: true });
  
  clearInlineSession(userId);
  
  await ctx.answerCallbackQuery({ text: "Chat cleared! 🗑️" });
  
  const session = getInlineSession(userId);
  const sessionKey = makeId(6);
  
  try {
    await ctx.editMessageText(
      formatInlineChatDisplay(session, userId),
      { 
        parse_mode: "Markdown",
        reply_markup: inlineChatKeyboard(sessionKey, false)
      }
    );
  } catch {
    // ignore
  }
});

// Show model selection
bot.callbackQuery(/^ichat_model:(.+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const userId = ctx.from?.id;
  if (!userId) return ctx.answerCallbackQuery({ text: "Error", show_alert: true });
  
  await ctx.answerCallbackQuery();
  
  const sessionKey = ctx.callbackQuery.data.split(":")[1];
  
  try {
    await ctx.editMessageText(
      "⚙️ *Select Model*\n\nChoose a model for inline chat:",
      { 
        parse_mode: "Markdown",
        reply_markup: inlineModelSelectKeyboard(sessionKey, userId)
      }
    );
  } catch {
    // ignore
  }
});

// Set model from inline
bot.callbackQuery(/^ichat_setmodel:(.+):(.+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const userId = ctx.from?.id;
  if (!userId) return ctx.answerCallbackQuery({ text: "Error", show_alert: true });
  
  const parts = ctx.callbackQuery.data.split(":");
  const sessionKey = parts[1];
  const modelId = parts.slice(2).join(":"); // Handle model IDs with colons
  
  const u = ensureUser(userId);
  const allowed = allModelsForTier(u.tier);
  
  if (!allowed.includes(modelId)) {
    return ctx.answerCallbackQuery({ text: "Model not available for your tier.", show_alert: true });
  }
  
  // Update both user model and session model
  u.model = modelId;
  saveUsers();
  updateInlineSession(userId, { model: modelId });
  
  await ctx.answerCallbackQuery({ text: `Model: ${modelId} ✅` });
  
  // Go back to chat view
  const session = getInlineSession(userId);
  const newSessionKey = makeId(6);
  
  try {
    await ctx.editMessageText(
      formatInlineChatDisplay(session, userId),
      { 
        parse_mode: "Markdown",
        reply_markup: inlineChatKeyboard(newSessionKey, session.history.length > 0)
      }
    );
  } catch {
    // ignore
  }
});

// Back to chat from model selection
bot.callbackQuery(/^ichat_back:(.+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const userId = ctx.from?.id;
  if (!userId) return ctx.answerCallbackQuery({ text: "Error", show_alert: true });
  
  await ctx.answerCallbackQuery();
  
  const session = getInlineSession(userId);
  const sessionKey = makeId(6);
  
  try {
    await ctx.editMessageText(
      formatInlineChatDisplay(session, userId),
      { 
        parse_mode: "Markdown",
        reply_markup: inlineChatKeyboard(sessionKey, session.history.length > 0)
      }
    );
  } catch {
    // ignore
  }
});

// =====================
// SETTINGS MENU CALLBACKS (Editable inline message menu)
// =====================

// Handle category selection (Free/Premium/Ultra)
bot.callbackQuery(/^setmenu:(free|premium|ultra)$/, async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return ctx.answerCallbackQuery({ text: "Error", show_alert: true });
  
  const category = ctx.callbackQuery.data.split(":")[1];
  const currentModel = ensureChosenModelValid(userId);
  const shortModel = currentModel.split("/").pop();
  
  await ctx.answerCallbackQuery();
  
  const categoryNames = { free: "🆓 Free", premium: "⭐ Premium", ultra: "💎 Ultra" };
  
  try {
    await ctx.editMessageText(
      `⚙️ *${categoryNames[category]} Models*\n\nCurrent: \`${shortModel}\`\n\nSelect a model:`,
      { 
        parse_mode: "Markdown",
        reply_markup: settingsCategoryKeyboard(category, userId, currentModel)
      }
    );
  } catch (e) {
    console.error("Edit settings error:", e.message);
  }
});

// Handle model selection
bot.callbackQuery(/^setmodel:(.+)$/, async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return ctx.answerCallbackQuery({ text: "Error", show_alert: true });
  
  const newModel = ctx.callbackQuery.data.slice(9); // Remove "setmodel:"
  const user = getUserRecord(userId);
  const tier = user?.tier || "free";
  const allowed = allModelsForTier(tier);
  
  if (!allowed.includes(newModel)) {
    return ctx.answerCallbackQuery({ text: "Model not available for your tier.", show_alert: true });
  }
  
  // Set the model
  setUserModel(userId, newModel);
  const inlineSess = getInlineSession(userId);
  inlineSess.model = newModel;
  
  const shortModel = newModel.split("/").pop();
  await ctx.answerCallbackQuery({ text: `✅ Model set to ${shortModel}` });
  
  // Show confirmation and go back to main menu
  try {
    await ctx.editMessageText(
      `⚙️ *StarzAI Settings*\n\n✅ Model changed to: \`${shortModel}\`\n\nSelect a category:`,
      { 
        parse_mode: "Markdown",
        reply_markup: settingsMainKeyboard(userId)
      }
    );
  } catch (e) {
    console.error("Edit settings error:", e.message);
  }
});

// Handle back button
bot.callbackQuery(/^setmenu:back$/, async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return ctx.answerCallbackQuery({ text: "Error", show_alert: true });
  
  const currentModel = ensureChosenModelValid(userId);
  const shortModel = currentModel.split("/").pop();
  
  await ctx.answerCallbackQuery();
  
  try {
    await ctx.editMessageText(
      `⚙️ *StarzAI Settings*\n\nCurrent model: \`${shortModel}\`\n\nSelect a category:`,
      { 
        parse_mode: "Markdown",
        reply_markup: settingsMainKeyboard(userId)
      }
    );
  } catch (e) {
    console.error("Edit settings error:", e.message);
  }
});

// Handle close button
bot.callbackQuery(/^setmenu:close$/, async (ctx) => {
  await ctx.answerCallbackQuery({ text: "Settings closed" });
  
  try {
    // Try to delete first (works for regular messages)
    await ctx.deleteMessage();
  } catch (e) {
    // Can't delete inline messages, edit to show closed state
    try {
      await ctx.editMessageText(
        `⚙️ *Settings closed*\n\n_Use @starztechbot to open again_`,
        { parse_mode: "Markdown" }
      );
    } catch {
      // Message unchanged or other error
    }
  }
});

// Handle pagination for model selection
bot.callbackQuery(/^setpage:(.+):(\d+)$/, async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return ctx.answerCallbackQuery({ text: "Error", show_alert: true });
  
  const [, category, pageStr] = ctx.callbackQuery.data.match(/^setpage:(.+):(\d+)$/);
  const page = parseInt(pageStr, 10);
  const currentModel = ensureChosenModelValid(userId);
  const shortModel = currentModel.split("/").pop();
  
  await ctx.answerCallbackQuery();
  
  const categoryNames = { free: "🆓 Free", premium: "⭐ Premium", ultra: "💎 Ultra" };
  
  try {
    await ctx.editMessageText(
      `⚙️ *${categoryNames[category]} Models*\n\nCurrent: \`${shortModel}\`\n\nSelect a model:`,
      { 
        parse_mode: "Markdown",
        reply_markup: settingsCategoryKeyboard(category, userId, currentModel, page)
      }
    );
  } catch (e) {
    console.error("Edit settings error:", e.message);
  }
});

// Noop handler for page indicator button
bot.callbackQuery(/^noop$/, async (ctx) => {
  await ctx.answerCallbackQuery();
});

// =====================
// SHARED CHAT CALLBACKS (Multi-user inline chat)
// Now uses switch_inline_query_current_chat - no DM needed!
// =====================

// Page navigation (legacy Yap shared chat - now disabled)
bot.callbackQuery(/^schat_page:(.+):(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery({
    text: "Yap (shared chat) mode has been removed. Use inline modes like q:, b:, code:, e:, sum:, or p: instead.",
    show_alert: true,
  });
});

// Noop for page indicator button (doesn't count towards rate limit)
bot.callbackQuery(/^schat_noop$/, async (ctx) => {
  await ctx.answerCallbackQuery();
});

// Ask AI - legacy Yap input (now disabled)
bot.callbackQuery(/^schat_ask:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery({
    text: "Yap (shared chat) mode has been removed. Use inline modes like q:, b:, code:, e:, sum:, or p: instead.",
    show_alert: true,
  });
});

// Refresh shared chat display (legacy Yap - now disabled)
bot.callbackQuery(/^schat_refresh:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery({
    text: "Yap (shared chat) mode has been removed.",
    show_alert: true,
  });
});

// Clear shared chat (legacy Yap - now disabled)
bot.callbackQuery(/^schat_clear:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery({
    text: "Yap (shared chat) mode has been removed.",
    show_alert: true,
  });
});

// =====================
// INLINE SETTINGS CALLBACKS
// =====================

// Category selection - show models for that category
bot.callbackQuery(/^iset_cat:(.+):(.+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const userId = ctx.from?.id;
  if (!userId) return ctx.answerCallbackQuery({ text: "Error", show_alert: true });
  
  const parts = ctx.callbackQuery.data.split(":");
  const category = parts[1];
  const sessionKey = parts[2];
  
  const user = getUserRecord(userId);
  const tier = user?.tier || "free";
  
  // Check if user has access to this category
  if (category === "premium" && tier === "free") {
    return ctx.answerCallbackQuery({ text: "🔒 Premium required!", show_alert: true });
  }
  if (category === "ultra" && tier !== "ultra") {
    return ctx.answerCallbackQuery({ text: "🔒 Ultra required!", show_alert: true });
  }
  
  const categoryEmoji = category === "free" ? "🆓" : category === "premium" ? "⭐" : "💎";
  const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
  
  await ctx.answerCallbackQuery({ text: `${categoryEmoji} ${categoryName} Models` });
  
  try {
    await ctx.editMessageText(
      `⚙️ *${categoryEmoji} ${categoryName} Models*\n\n🤖 Current: \`${user?.model || "none"}\`\n\nSelect a model:`,
      { 
        parse_mode: "Markdown",
        reply_markup: inlineSettingsModelKeyboard(category, sessionKey, userId)
      }
    );
  } catch (e) {
    console.error("Edit message error:", e.message);
  }
});

// Model selection - set the model
bot.callbackQuery(/^iset_model:(.+):(.+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const userId = ctx.from?.id;
  if (!userId) return ctx.answerCallbackQuery({ text: "Error", show_alert: true });
  
  const data = ctx.callbackQuery.data;
  // Parse: iset_model:model_name:sessionKey
  const firstColon = data.indexOf(":");
  const lastColon = data.lastIndexOf(":");
  const model = data.slice(firstColon + 1, lastColon);
  const sessionKey = data.slice(lastColon + 1);
  
  const user = getUserRecord(userId);
  if (!user) {
    return ctx.answerCallbackQuery({ text: "User not found. Use /start first!", show_alert: true });
  }
  
  // Check if user can use this model
  const allowed = allModelsForTier(user.tier);
  if (!allowed.includes(model)) {
    return ctx.answerCallbackQuery({ text: "🔒 You don't have access to this model!", show_alert: true });
  }
  
  // Set the model
  user.model = model;
  saveUsers();
  
  // Also update inline session
  updateInlineSession(userId, { model });
  
  const shortName = model.split("/").pop();
  await ctx.answerCallbackQuery({ text: `✅ Switched to ${shortName}!` });
  
  try {
    await ctx.editMessageText(
      `✅ *Model Changed!*\n\n🤖 Now using: \`${model}\`\n\n_Your new model is ready to use!_`,
      { 
        parse_mode: "Markdown",
        reply_markup: new InlineKeyboard().text("← Back to Categories", `iset_back:${sessionKey}`)
      }
    );
  } catch (e) {
    console.error("Edit message error:", e.message);
  }
});

// Back to categories
bot.callbackQuery(/^iset_back:(.+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const userId = ctx.from?.id;
  if (!userId) return ctx.answerCallbackQuery({ text: "Error", show_alert: true });
  
  const sessionKey = ctx.callbackQuery.data.split(":")[1];
  const user = getUserRecord(userId);
  const model = user?.model || "gpt-4o-mini";
  
  await ctx.answerCallbackQuery();
  
  try {
    await ctx.editMessageText(
      `⚙️ *Model Settings*\n\n🤖 Current: \`${model}\`\n\nSelect a category to change model:`,
      { 
        parse_mode: "Markdown",
        reply_markup: inlineSettingsCategoryKeyboard(sessionKey, userId)
      }
    );
  } catch (e) {
    console.error("Edit message error:", e.message);
  }
});

// Handle pagination for inline model selection
bot.callbackQuery(/^iset_page:(.+):(\d+):(.+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const userId = ctx.from?.id;
  if (!userId) return ctx.answerCallbackQuery({ text: "Error", show_alert: true });
  
  const [, category, pageStr, sessionKey] = ctx.callbackQuery.data.match(/^iset_page:(.+):(\d+):(.+)$/);
  const page = parseInt(pageStr, 10);
  const user = getUserRecord(userId);
  
  const categoryEmoji = category === "free" ? "🆓" : category === "premium" ? "⭐" : "💎";
  const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
  
  await ctx.answerCallbackQuery();
  
  try {
    await ctx.editMessageText(
      `⚙️ *${categoryEmoji} ${categoryName} Models*\n\n🤖 Current: \`${user?.model || "none"}\`\n\nSelect a model:`,
      { 
        parse_mode: "Markdown",
        reply_markup: inlineSettingsModelKeyboard(category, sessionKey, userId, page)
      }
    );
  } catch (e) {
    console.error("Edit message error:", e.message);
  }
});

// =====================
// WEBAPP DATA HANDLER
// =====================
bot.on("message:web_app_data", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  try {
    const data = JSON.parse(ctx.message.web_app_data.data);
    const { mode, modeName, query, fullQuery } = data;
    
    console.log(`WebApp data from ${userId}: mode=${mode}, query=${query}`);
    
    if (!mode || !query) {
      return ctx.reply("⚠️ Invalid data from WebApp");
    }
    
    // Get user's model
    const model = ensureChosenModelValid(userId);
    const shortModel = model.split("/").pop();
    
    // Send processing message
    const processingMsg = await ctx.reply(`⏳ Processing ${modeName} request...`);
    
    // Handle different modes
    let systemPrompt = "You are a helpful AI assistant.";
    let maxTokens = 500;
    let temperature = 0.7;
    
    switch (mode) {
      case "q:":
        systemPrompt = "Give extremely concise answers. 1-2 sentences max. Be direct and to the point.";
        maxTokens = 150;
        temperature = 0.5;
        break;
      case "b:":
        systemPrompt = "You are a research expert. Provide comprehensive, well-structured analysis with multiple perspectives. Include key facts, implications, and nuances.";
        maxTokens = 800;
        break;
      case "code:":
        systemPrompt = "You are a programming expert. Provide clear, working code with explanations. Use proper formatting.";
        maxTokens = 600;
        break;
      case "e:":
        systemPrompt = "Explain concepts simply, like teaching a beginner. Use analogies and examples.";
        maxTokens = 400;
        break;
      case "sum:":
        systemPrompt = "Summarize the following text concisely, keeping the key points.";
        maxTokens = 300;
        break;
      case "r:":
        systemPrompt = "You are a research assistant. Give a concise but informative answer in 2-3 paragraphs.";
        maxTokens = 400;
        break;
    }
    
    // Handle character mode specially
    if (mode === "as ") {
      systemPrompt = `You are roleplaying as ${query}. Stay completely in character throughout. Respond as ${query} would - use their speech patterns, vocabulary, mannerisms, and personality.`;
      
      const response = await llmText({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Hello! Introduce yourself briefly." },
        ],
        temperature: 0.8,
        max_tokens: 300,
      });
      
      const formattedResponse = convertToTelegramHTML(response || "*stays in character*");
      
      await ctx.api.editMessageText(
        ctx.chat.id,
        processingMsg.message_id,
        `🎭 <b>Character: ${escapeHTML(query)}</b>\n\n${formattedResponse}\n\n<i>via StarzAI • ${shortModel}</i>`,
        { parse_mode: "HTML" }
      );
      return;
    }
    
    // Handle partner mode
    if (mode === "p:") {
      const partner = getPartner(userId);
      if (!partner) {
        await ctx.api.editMessageText(
          ctx.chat.id,
          processingMsg.message_id,
          "⚠️ You don't have a partner set up yet! Use /partner in DM to create one."
        );
        return;
      }
      systemPrompt = buildPartnerSystemPrompt(partner);
    }
    
    // Get AI response
    const response = await llmText({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: query },
      ],
      temperature,
      max_tokens: maxTokens,
    });
    
    const formattedResponse = convertToTelegramHTML(response || "No response generated.");
    const modeEmoji = {
      "q:": "⭐", "b:": "🗿🔬", "code:": "💻", "e:": "🧠",
      "sum:": "📝", "r:": "🔍", "p:": "🤝🏻"
    };
    
    await ctx.api.editMessageText(
      ctx.chat.id,
      processingMsg.message_id,
      `${modeEmoji[mode] || "✨"} <b>${modeName}: ${escapeHTML(query.slice(0, 50))}${query.length > 50 ? "..." : ""}</b>\n\n${formattedResponse}\n\n<i>via StarzAI • ${shortModel}</i>`,
      { parse_mode: "HTML" }
    );
    
  } catch (e) {
    console.error("WebApp data error:", e);
    await ctx.reply(`⚠️ Error processing request: ${e.message}`);
  }
});

// =====================
// DM / GROUP TEXT
// =====================

// Track processing messages to prevent duplicates
const processingMessages = new Map(); // chatId:messageId -> timestamp
const pendingDownloadUrls = new Map(); // urlId -> url (for auto-detect download buttons)

bot.on("message:text", async (ctx) => {
  const chat = ctx.chat;
  const u = ctx.from;
  const msg = ctx.message;
  const text = (msg?.text || "").trim();
  const messageId = msg?.message_id;
  
  // Debug logging
  console.log(`[MSG] User ${u?.id} in ${chat?.type} (${chat?.id}): "${text?.slice(0, 50)}"`);
  
  if (!(await enforceRateLimit(ctx))) {
    console.log(`[MSG] Rate limited: ${u?.id}`);
    return;
  }

  if (!text || !u?.id) {
    console.log(`[MSG] Empty text or no user ID`);
    return;
  }
  
  // Anti-spam check
  if (!(await checkAntiSpam(ctx, text))) {
    console.log(`[MSG] Spam detected: ${u?.id}`);
    return;
  }

  // Ignore commands
  if (text.startsWith("/")) {
    console.log(`[MSG] Ignoring command: ${text}`);
    return;
  }

  // Auto-detect media links (YouTube, TikTok, Instagram, Twitter, Spotify)
  const detectedPlatform = detectPlatform(text);
  if (detectedPlatform && chat.type === "private") {
    console.log(`[MSG] Auto-detected ${detectedPlatform} link`);
    
    const urlMatch = text.match(/https?:\/\/[^\s]+/);
    if (urlMatch) {
      const url = urlMatch[0];
      const emoji = PLATFORM_EMOJI[detectedPlatform] || '📥';
      
      // Store URL in cache with short ID to avoid callback data limit (64 bytes)
      const urlId = `${u.id}_${Date.now()}`;
      pendingDownloadUrls.set(urlId, url);
      // Clean up old entries after 10 minutes
      setTimeout(() => pendingDownloadUrls.delete(urlId), 10 * 60 * 1000);
      
      const kb = new InlineKeyboard()
        .text(`${emoji} Download Video`, `adl:v:${urlId}`)
        .text(`🎵 Audio Only`, `adl:a:${urlId}`);
      
      await ctx.reply(
        `${emoji} <b>${detectedPlatform.charAt(0).toUpperCase() + detectedPlatform.slice(1)} link detected!</b>\n\nWhat would you like to download?`,
        { parse_mode: 'HTML', reply_markup: kb, reply_to_message_id: messageId }
      );
      return;
    }
  }

  // Ignore messages that are inline results sent via this bot (via_bot == this bot)
  // This prevents GC wake words like "Ai" inside inline answers from triggering the bot again.
  if (msg?.via_bot?.id && BOT_ID && msg.via_bot.id === BOT_ID) {
    console.log(`[MSG] Ignoring via_bot message from this bot in chat ${chat.id}`);
    return;
  }
  
  // Deduplicate - prevent processing same message twice
  const dedupeKey = `${chat.id}:${messageId}`;
  if (processingMessages.has(dedupeKey)) {
    console.log(`Skipping duplicate message: ${dedupeKey}`);
    return;
  }
  processingMessages.set(dedupeKey, Date.now());
  
  // Clean up old entries (older than 5 minutes)
  const fiveMinAgo = Date.now() - 5 * 60 * 1000;
  for (const [key, time] of processingMessages) {
    if (time < fiveMinAgo) processingMessages.delete(key);
  }

  // Auto-register
  if (!getUserRecord(u.id)) registerUser(u);
  
  // Check if user has active character in this chat (for GC continuous conversation)
  const activeCharForUser = getActiveCharacter(u.id, chat.id);
  const userHasActiveChar = !!activeCharForUser?.name;
  
  // Check if this is a reply to a legacy Yap message (via @starztechbot)
  // Yap shared chat mode has been removed, so we no longer treat these specially.
  const replyTo = ctx.message?.reply_to_message;
  const isCharacterMessage = replyTo?.text?.startsWith("🎭");
  // (Replies are handled as normal messages below)

  // Check if user has pending todo input
  const pendingTodo = pendingTodoInput.get(String(u.id));
  if (pendingTodo && chat.type === "private") {
    pendingTodoInput.delete(String(u.id));
    
    // Check if not expired (5 min timeout)
    if (Date.now() - pendingTodo.timestamp < 5 * 60 * 1000) {
      if (pendingTodo.action === "add" && text.trim()) {
        const parsed = parseTaskText(text.trim());
        if (parsed.text) {
          const task = createTask(u.id, parsed);
          const userTodos = getUserTodos(u.id);
          
          await ctx.reply(
            `✅ *Task added!*\n\n${formatTaskDisplay(task, userTodos, false)}`,
            {
              parse_mode: "Markdown",
              reply_markup: new InlineKeyboard().text("📋 View Tasks", "todo_list")
            }
          );
          return;
        }
      }
      
      // Handle collab list creation
      if (pendingTodo.action === "collab_create" && text.trim()) {
        const listName = text.trim().slice(0, 50);
        const newList = createCollabList(u.id, listName);
        
        await ctx.reply(
          `✅ *List Created!*\n\n👥 *${listName}*\n\n🔑 Share this code with others:\n\`${newList.joinCode}\`\n\nThey can join with:\n\`/collab join ${newList.joinCode}\``,
          {
            parse_mode: "Markdown",
            reply_markup: new InlineKeyboard()
              .text("📋 View List", `collab_open:${newList.id}`)
              .text("👥 All Lists", "collab_list")
          }
        );
        return;
      }
      
      // Handle collab list join
      if (pendingTodo.action === "collab_join" && text.trim()) {
        const joinCode = text.trim().toUpperCase();
        const result = joinCollabList(u.id, joinCode, ctx.from?.username);
        
        if (result.success) {
          const list = result.list;
          await ctx.reply(
            `✅ *Joined Successfully!*\n\n👥 *${list.name}*\n\n👤 ${list.members.length} members\n📋 ${list.tasks.length} tasks`,
            {
              parse_mode: "Markdown",
              reply_markup: new InlineKeyboard()
                .text("📋 View List", `collab_open:${list.id}`)
                .text("👥 All Lists", "collab_list")
            }
          );
        } else {
          await ctx.reply(
            `⚠️ *${result.error || "Could not join list"}*\n\nCheck the code and try again.`,
            {
              parse_mode: "Markdown",
              reply_markup: new InlineKeyboard().text("🔗 Try Again", "collab_join")
            }
          );
        }
        return;
      }
    }
  }
  
  // Check if user has pending partner field input
  const pendingPartner = pendingPartnerInput.get(String(u.id));
  if (pendingPartner && chat.type === "private") {
    pendingPartnerInput.delete(String(u.id));
    
    // Check if not expired (5 min timeout)
    if (Date.now() - pendingPartner.timestamp < 5 * 60 * 1000) {
      const { field } = pendingPartner;
      const value = text.trim();
      
      if (value) {
        const maxLengths = { name: 50, personality: 200, background: 300, style: 200 };
        setPartner(u.id, { [field]: value.slice(0, maxLengths[field] || 200) });
        
        const partner = getPartner(u.id);
        await ctx.reply(
          `✅ *${field.charAt(0).toUpperCase() + field.slice(1)}* updated!\\n\\n` + buildPartnerSetupMessage(partner),
          { parse_mode: "Markdown", reply_markup: buildPartnerKeyboard(partner) }
        );
        return;
      }
    }
  }
  
  const feedbackHandled = await handleFeedbackIfActive(ctx);
  if (feedbackHandled) return;
  
  const model = ensureChosenModelValid(u.id);
  const botUsername = BOT_USERNAME || "";
  const botId = BOT_ID;

  // Group chat authorization + activation system:
  // - Groups must be explicitly authorized by the owner (/allowgroup &lt;chatId&gt;)
  // - If not authorized, the bot only responds with an authorization hint
  //   when explicitly invoked (mention, wake word, reply, or active character)
  // - When authorized:
  //   • By default, respond only when:
  //       - The message mentions the bot username, or
  //       - The message contains "Starz" or "Ai", or
  //       - The user replies to the bot, or
  //       - The user has an active character in this chat
  //   • If `/talk` has activated forced-active mode, respond to all messages
  //     for a short window.

  if (chat.type !== "private") {
    const lower = text.toLowerCase();
    const hasStarzWake = /\bstarz\b/.test(lower);
    const hasAiWake = /\bai\b/.test(lower);
    const hasWakeWord = hasStarzWake || hasAiWake;

    const isMentioned = botUsername
      ? lower.includes(`@${botUsername}`) || hasWakeWord
      : hasWakeWord;
    const isReplyToBot = botId && ctx.message?.reply_to_message?.from?.id === botId;
    const hasActiveChar = !!getActiveCharacter(u.id, chat.id)?.name;
    const groupForcedActive = isGroupActive(chat.id); // /talk-controlled

    // Track basic group metadata in prefsDb.groups
    ensurePrefsGroups();
    const gid = String(chat.id);
    const currentTitle = chat.title || chat.username || "";
    const existingGroup = prefsDb.groups[gid];
    if (!existingGroup) {
      prefsDb.groups[gid] = {
        id: gid,
        allowed: false,
        title: currentTitle || null,
        addedBy: null,
        updatedAt: new Date().toISOString(),
        note: null,
      };
      savePrefs();
    } else if (currentTitle && existingGroup.title !== currentTitle) {
      existingGroup.title = currentTitle;
      existingGroup.updatedAt = new Date().toISOString();
      savePrefs();
    }

    const groupAllowed = isGroupAuthorized(chat.id);

    if (!groupAllowed) {
      // Only show the authorization hint when the bot is explicitly invoked
      if (isMentioned || isReplyToBot || hasActiveChar) {
        const lines = [
          "🚫 *This group is not authorized to use StarzAI yet.*",
          "",
          `🆔 *Chat ID:* \`${chat.id}\``,
          "",
          "Ask the bot owner to run:",
          `\`/allowgroup ${chat.id}\``,
          "in a private chat with the bot.",
        ];

        let replyMarkup;
        if (FEEDBACK_CHAT_ID && BOT_USERNAME) {
          const kb = new InlineKeyboard();
          kb.url(
            "💡 Feedback",
            `https://t.me/${BOT_USERNAME}?start=group_${chat.id}`
          );
          replyMarkup = kb;
        }

        await ctx.reply(lines.join("\n"), {
          parse_mode: "Markdown",
          reply_markup: replyMarkup,
        });
      }
      return;
    }

    if (!groupForcedActive) {
      // Default anti-spam mode: ignore unless explicitly invoked or character mode is active
      if (!hasActiveChar && !isMentioned && !isReplyToBot) {
        return;
      }
    } else {
      // In forced-active mode (/talk), keep refreshing the timer on any message
      activateGroup(chat.id);
    }
  }
  
  // Smart image generation detection (works in both DM and GC)
  // Patterns: "generate image of X", "create image of X", "make image of X", "draw X", etc.
  // Also handles common typos like "genrate", "genarate"
  const imageGenPatterns = [
    /^(?:gen[ea]?rate|create|make|draw|paint|render)\s+(?:an?\s+)?(?:image|picture|photo|art|artwork|illustration)\s+(?:of\s+)?(.+)/i,
    /^(?:image|picture|photo)\s+(?:of\s+)?(.+)/i,
    /^draw\s+(?:me\s+)?(?:an?\s+)?(.+)/i,  // "draw me a cat", "draw a sunset"
  ];
  
  let imagePromptMatch = null;
  for (const pattern of imageGenPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      imagePromptMatch = match[1].trim();
      break;
    }
  }
  
  // If image generation detected and we have keys configured
  if (imagePromptMatch && deapiKeyManager.hasKeys()) {
    const user = ensureUser(u.id, u);
    
    // Check NSFW content and safe mode
    if (isNsfwPrompt(imagePromptMatch) && shouldEnforceSafeMode(u.id)) {
      const tier = user.tier || 'free';
      let message = "🔒 *Safe Mode Active*\n\n" +
        "Your prompt contains content that isn't allowed in safe mode.\n\n";
      
      if (tier === 'free') {
        message += "_Free users have safe mode enabled by default._\n" +
          "Upgrade to Premium or Ultra to access unrestricted image generation.";
      } else {
        message += "_You can disable safe mode in_ /imgset _to generate this content._";
      }
      
      await ctx.reply(message, { parse_mode: "Markdown", reply_to_message_id: messageId });
      return;
    }
    
    // Check for ratio in the prompt
    const detectedRatio = parseAspectRatioFromText(imagePromptMatch);
    const cleanedPrompt = detectedRatio ? cleanPromptFromRatio(imagePromptMatch) : imagePromptMatch;
    const finalPrompt = cleanedPrompt || imagePromptMatch;
    const aspectRatio = detectedRatio || user.imagePrefs?.defaultRatio || "1:1";
    const config = IMG_ASPECT_RATIOS[aspectRatio];
    
    console.log(`[IMG] Smart detection in ${chat.type}: "${finalPrompt}" in ${aspectRatio}`);
    
    const statusMsg = await ctx.reply(
      "🎨 *Generating your image...*\n\n" +
      `📝 _${finalPrompt.slice(0, 100)}${finalPrompt.length > 100 ? '...' : ''}_\n\n` +
      `📐 ${config.icon} ${config.label}\n\n` +
      "⏳ Please wait 5-15 seconds...",
      { parse_mode: "Markdown", reply_to_message_id: messageId }
    );
    
    pendingImagePrompts.set(u.id, {
      prompt: finalPrompt,
      messageId: statusMsg.message_id,
      chatId: chat.id,
      lastAspectRatio: aspectRatio
    });
    
    try {
      const imageBuffer = await generateDeAPIImage(finalPrompt, aspectRatio, u.id);
      
      const actionButtons = [
        [
          { text: "🔄 Regenerate", callback_data: `img_regen:${aspectRatio}` },
          { text: "📐 Change Ratio", callback_data: "img_change_ar" }
        ],
        [
          { text: "✨ New Image", callback_data: "img_new" }
        ]
      ];
      
      await ctx.api.sendPhoto(
        chat.id,
        new InputFile(imageBuffer, "generated_image.jpg"),
        {
          caption: `🎨 *Generated Image*\n\n` +
                   `📝 _${finalPrompt.slice(0, 200)}${finalPrompt.length > 200 ? '...' : ''}_\n\n` +
                   `📐 ${config.icon} ${config.label}\n` +
                   `⚡ _Powered by ${getRandomTagline(finalPrompt)}_`,
          parse_mode: "Markdown",
          reply_markup: { inline_keyboard: actionButtons },
          reply_to_message_id: messageId
        }
      );
      
      try { await ctx.api.deleteMessage(chat.id, statusMsg.message_id); } catch (e) {}
      console.log(`[IMG] Smart gen success for user ${u.id}: "${finalPrompt.slice(0, 50)}"`);
      return;
      
    } catch (error) {
      console.error("Smart image generation error:", error);
      try {
        await ctx.api.editMessageText(
          chat.id,
          statusMsg.message_id,
          "❌ *Image generation failed*\n\n" +
          `Error: ${error.message?.slice(0, 100) || 'Unknown error'}\n\n` +
          "Try \`/img your prompt\` or /imagine for alternatives.",
          { parse_mode: "Markdown" }
        );
      } catch (e) {}
      return;
    }
  }

  // Check if user is replying to a specific message
  const replyToMsg = ctx.message?.reply_to_message;
  let replyContext = "";
  let replyCharacter = null; // Character from replied message (for GC character continuation)
  
  if (replyToMsg && replyToMsg.text) {
    // Check if the replied message is a character message (contains "🎭 *CharName*" pattern)
    const charMatch = replyToMsg.text.match(/^🎭 \*?([^*\n]+)\*?\n/);
    if (charMatch && replyToMsg.from?.is_bot) {
      // Someone is replying to a character message - continue with that character
      replyCharacter = charMatch[1].trim();
    }
    
    // User is replying to a specific message - include that context
    const replyFrom = replyToMsg.from?.is_bot ? "AI" : "User";
    replyContext = `[Replying to ${replyFrom}'s message: "${replyToMsg.text.slice(0, 200)}"]

`;
  }

  const startTime = Date.now();
  let statusMsg = null;
  let typingInterval = null;
  let responseSent = false;

  try {
    // Send initial processing status - use HTML to avoid Markdown escaping issues
    // Make this a proper reply to the user's message so the final answer appears threaded.
    statusMsg = await ctx.reply(`⏳ Processing with <b>${model}</b>...`, {
      parse_mode: "HTML",
      reply_to_message_id: msg.message_id,
    });

    // Keep typing indicator active
    typingInterval = setInterval(() => {
      if (!responseSent) {
        ctx.replyWithChatAction("typing").catch(() => {});
      }
    }, 4000);
    await ctx.replyWithChatAction("typing");

    // Check if partner mode is active
    const partner = getPartner(u.id);
    const isPartnerMode = partner?.active && partner?.name;
    
    // Check if character mode is active
    // Priority: replyCharacter (from replied message) > activeCharForUser (user's active character)
    const effectiveCharacter = replyCharacter || activeCharForUser?.name;
    const isCharacterMode = !!effectiveCharacter;
    
    let systemPrompt;
    let out;
    let modeLabel = "";
    // For DM/GC web+AI mode: optional sources footer when web search is used
    let webSourcesFooterHtml = "";
    // For DM/GC: context for simple AI continuation ("Continue" button)
    let dmContinueContext = null;
    // Tracks whether the model explicitly signaled that the answer is finished
    let answerFinished = false;
    
    if (isPartnerMode) {
      // Partner mode - use partner's persona and separate chat history
      systemPrompt = buildPartnerSystemPrompt(partner);
      modeLabel = `🤝🏻 *${partner.name}*\n\n`;
      
      // Add user message to partner history
      addPartnerMessage(u.id, "user", text);
      const partnerHistory = getPartnerChatHistory(u.id);
      
      // Build messages array with partner history
      const messages = [
        { role: "system", content: systemPrompt },
        ...partnerHistory.map(m => ({ role: m.role, content: m.content })),
      ];
      
      out = await llmText({
        model,
        messages,
        temperature: 0.8,
        max_tokens: 500,
      });
      
      // Add AI response to partner history
      addPartnerMessage(u.id, "assistant", out);
      
    } else if (isCharacterMode) {
      // Character mode - roleplay as existing character
      // Use effectiveCharacter which could be from reply or active character
      systemPrompt = buildCharacterSystemPrompt(effectiveCharacter);
      modeLabel = `🎭 *${effectiveCharacter}*\n\n`;
      
      // Add user message to character history (only if it's their active character, not a reply)
      if (activeCharForUser?.name) {
        addCharacterMessage(u.id, chat.id, "user", text);
      }
      const charHistory = activeCharForUser?.name ? getCharacterChatHistory(u.id, chat.id) : [];
      
      // Build messages array with character history
      const messages = [
        { role: "system", content: systemPrompt },
        ...charHistory.map(m => ({ role: m.role, content: m.content })),
      ];
      
      out = await llmText({
        model,
        messages,
        temperature: 0.9,
        max_tokens: 500,
      });
      
      // Add AI response to character history (only if it's their active character)
      if (activeCharForUser?.name) {
        addCharacterMessage(u.id, chat.id, "assistant", out);
      }
      
    } else {
      // Normal mode - use persona or default
      const userRecord = getUserRecord(u.id);
      const persona = userRecord?.persona;
      
      // Check if it's a time/date query - handle directly without AI
      if (isTimeQuery(text)) {
        const timeResult = getTimeResponse(text, msg.date);
        await ctx.api.deleteMessage(chat.id, statusMsg.message_id).catch(() => {});
        
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        await ctx.reply(
          `${timeResult.response}\n\n⚡ ${elapsed}s`,
          { parse_mode: "HTML", reply_to_message_id: msg.message_id }
        );
        return;
      }

      // Owner-only smart extraction when replying to messages with links
      let extractContext = "";
      const isOwnerUser = OWNER_IDS.has(String(u.id));
      if (isOwnerUser && replyToMsg && PARALLEL_API_KEY) {
        try {
          const combined =
            (replyToMsg.text || "") + " " + (replyToMsg.caption || "");
          const urlMatches = combined.match(/https?:\/\/\S+/gi) || [];
          const urls = Array.from(
            new Set(
              urlMatches
                .map((uStr) => uStr.replace(/[),.]+$/g, ""))
                .filter(Boolean)
            )
          );

          if (urls.length > 0) {
            const extractResult = await parallelExtractUrls(
              urls.slice(0, 3)
            );
            if (
              extractResult.success &&
              Array.isArray(extractResult.results) &&
              extractResult.results.length > 0
            ) {
              const parts = extractResult.results.slice(0, 3).map((r, idx) => {
                const title = r.title || r.url || `Link ${idx + 1}`;
                const content = (r.content || "").slice(0, 4000);
                return `SOURCE ${idx + 1}: ${title}\\n${content}`;
              });
              extractContext =
                "\\n\\n[Extracted content from linked pages]\\n\\n" +
                parts.join("\\n\\n");
            }
          }
        } catch (extractErr) {
          console.log(
            "Smart extract (reply) failed:",
            extractErr.message || extractErr
          );
        }
      }
      
      // Check if query needs real-time web search
      // Either: user has webSearch toggle ON, or auto-detect triggers
      let searchContext = "";
      let searchResultForCitations = null;
      const wantsSearch = userRecord?.webSearch || needsWebSearch(text);
      if (wantsSearch) {
        const quota = consumeWebsearchQuota(u.id);
        if (quota.allowed) {
          try {
            await ctx.api
              .editMessageText(
                chat.id,
                statusMsg.message_id,
                `🔍 Searching the web for current info...`,
                { parse_mode: "HTML" }
              )
              .catch(() => {});
            
            const searchResult = await webSearch(text, 5);
            if (searchResult.success) {
              searchContext = "\n\n" + formatSearchResultsForAI(searchResult);
              searchResultForCitations = searchResult;
              modeLabel = "🌐 ";
            }
            
            await ctx.api
              .editMessageText(
                chat.id,
                statusMsg.message_id,
                `⏳ Processing with <b>${model}</b>...`,
                { parse_mode: "HTML" }
              )
              .catch(() => {});
          } catch (searchErr) {
            console.log("Auto-search failed:", searchErr.message);
          }
        } else {
          console.log(
            `Websearch quota exhausted for user ${u.id}: used=${quota.used}, limit=${quota.limit}`
          );
        }
      }
      
      const identityBase =
        "You are StarzTechBot, a friendly AI assistant on Telegram. " +
        "Be concise and direct - give short, helpful answers without unnecessary preamble or tips. " +
        "Don't advertise features or suggest commands unless specifically asked. " +
        "NEVER generate fake image URLs or links - you cannot generate images. If asked to create/generate/draw an image, tell the user to use /img or /imagine commands instead.";

      if (persona) {
        systemPrompt =
          identityBase +
          ` Your personality: ${persona}.` +
          (replyContext
            ? " The user is replying to a specific earlier message; pay close attention to that context when answering."
            : "");
      } else {
        systemPrompt =
          identityBase +
          (replyContext
            ? " The user is replying to a specific earlier message; focus your response on that context."
            : "");
      }

      // Add search context instruction and stricter citation rules if we have search results
      if (searchContext) {
        systemPrompt +=
          " You have access to real-time web search results below. Use them to provide accurate, up-to-date information. " +
          "Every non-obvious factual claim should be backed by a source index like [1], [2], etc. " +
          "When you summarize multiple sources, include multiple indices, e.g. [1][3]. " +
          "If you mention a specific number, date, name, or quote, always attach the source index. " +
          "Never invent citations; only use indices that exist in the search results.";
      }

      // Removed excessive help advertising - users already know they're using StarzTechBot
      systemPrompt +=
        " When you have fully answered the user's current request and there are no important points left to add, append the exact token END_OF_ANSWER at the very end of your reply. Omit this token if you believe a follow-up continuation could still be genuinely helpful.";

      const userTextWithContext = replyContext + (extractContext || "") + text + searchContext;

      out = await llmChatReply({
        chatId: chat.id,
        userText: userTextWithContext,
        systemPrompt,
        model,
      });

      // Check if the model explicitly marked the answer as finished
      if (typeof out === "string" && out.includes("END_OF_ANSWER")) {
        answerFinished = true;
        out = out
          .replace(/END_OF_ANSWER\s*$/g, "")
          .replace(/END_OF_ANSWER/g, "")
          .trimEnd();
      }

      // Store context so we can offer a simple "Continue" button later
      dmContinueContext = {
        systemPrompt,
        userTextWithContext,
        model,
        modeLabel,
      };

      // If we used web search, post-process the answer to add clickable [n] citations
      if (searchResultForCitations && typeof out === "string" && out.length > 0) {
        out = linkifyWebsearchCitations(out, searchResultForCitations);
        // Use [1], [2] style clickable indices in DM/GC sources footer, same as inline
        webSourcesFooterHtml = buildWebsearchSourcesInlineHtml(searchResultForCitations, u.id);
        if (dmContinueContext) {
          dmContinueContext.sourcesHtml = webSourcesFooterHtml;
        }
      }
    }

    // Mark response as sent to stop typing
    responseSent = true;
    if (typingInterval) clearInterval(typingInterval);

    // Track usage
    trackUsage(u.id, "message");

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    // Edit status message with response (cleaner than delete+send)
    const rawOutput =
      out && out.trim()
        ? out.slice(0, 3600)
        : "<i>I couldn't generate a response. Try rephrasing or switch models with /model</i>";
    const formattedOutput = convertToTelegramHTML(rawOutput);
    
    // Convert mode label (which still uses Markdown) into HTML
    const htmlModeLabel = modeLabel
      ? modeLabel.replace(/\*([^*]+)\*/g, "<b>$1</b>").replace(/_([^_]+)_/g, "<i>$1</i>")
      : "";

    // Offer a simple "Continue" button only when:
    // 1. The model did NOT explicitly mark the answer as finished (no END_OF_ANSWER marker)
    // 2. The response actually appears incomplete (smart detection)
    let replyMarkup;
    const maxTokensUsed = getMaxTokensForModel(model, 400);
    const looksIncomplete = responseNeedsContinuation(out, maxTokensUsed);
    const canOfferContinue = dmContinueContext && !answerFinished && looksIncomplete;

    if (canOfferContinue) {
      const key = makeId(8);
      dmContinueCache.set(key, {
        userId: u.id,
        chatId: chat.id,
        model: dmContinueContext.model,
        systemPrompt: dmContinueContext.systemPrompt,
        userTextWithContext: dmContinueContext.userTextWithContext,
        modeLabel: dmContinueContext.modeLabel,
        sourcesHtml: dmContinueContext.sourcesHtml || "",
        createdAt: Date.now(),
      });
      replyMarkup = new InlineKeyboard().text("➡️ Continue", `dm_ai_cont:${key}`);
    }

    const response = `${htmlModeLabel}${formattedOutput}${webSourcesFooterHtml}\n\n<i>⚡ ${elapsed}s • ${model}</i>`;
    if (statusMsg) {
      try {
        await ctx.api.editMessageText(chat.id, statusMsg.message_id, response, {
          parse_mode: "HTML",
          reply_markup: replyMarkup,
        });
      } catch (editErr) {
        // Fallback to new message if edit fails
        await ctx.reply(response, {
          parse_mode: "HTML",
          reply_to_message_id: msg.message_id,
          reply_markup: replyMarkup,
        });
      }
    } else {
      await ctx.reply(response, {
        parse_mode: "HTML",
        reply_to_message_id: msg.message_id,
        reply_markup: replyMarkup,
      });
    }
  } catch (e) {
    console.error(e);
    responseSent = true;
    if (typingInterval) clearInterval(typingInterval);
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const isTimeout = e.message?.includes("timed out");
    
    // Edit status message with error (cleaner than delete+send)
    const errMsg = isTimeout 
      ? `⏱️ Model <b>${model}</b> timed out after ${elapsed}s. Try /model to switch, or try again.`
      : `❌ Error after ${elapsed}s. Try again in a moment.`;
    if (statusMsg) {
      try {
        await ctx.api.editMessageText(chat.id, statusMsg.message_id, errMsg, { parse_mode: "HTML" });
      } catch {
        await ctx.reply(errMsg, {
          parse_mode: "HTML",
          reply_to_message_id: msg.message_id,
        });
      }
    } else {
      await ctx.reply(errMsg, {
        parse_mode: "HTML",
        reply_to_message_id: msg.message_id,
      });
    }
  }
});

// =====================
// PHOTO (DM and Groups with character support)
// =====================
bot.on("message:photo", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const chat = ctx.chat;
  const u = ctx.from;
  if (!u?.id) return;
  
  // Try QR scan first
  try {
    const photo = ctx.message.photo[ctx.message.photo.length - 1];
    const file = await ctx.api.getFile(photo.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;
    const response = await fetch(fileUrl);
    const buffer = await response.buffer();
    
    const qrResult = await scanQR(buffer);
    if (qrResult.success && typeof qrResult.data === "string") {
      const rawData = qrResult.data;
      const dataLength = rawData.length;
      const escaped = escapeHTML(rawData) || "";

      const header =
        `📱 <b>QR Code Scanned Successfully!</b>\n\n` +
        `📊 <b>Data Length:</b> ${dataLength} characters\n\n`;

      const maxMessageChars = 3500;

      // First try to send full content; if too long, fall back to preview + txt file
      const fullPrefix = header + `📄 <b>Content:</b>\n<pre><code>`;
      const fullSuffix = `</code></pre>`;
      let contentHtml = escaped;
      let messageText = fullPrefix + contentHtml + fullSuffix;
      let attachFile = false;

      if (messageText.length > maxMessageChars) {
        // Build a safe preview message and attach full content as a text file
        const previewPrefix = header + `📄 <b>Content (preview):</b>\n<pre><code>`;
        const previewSuffix = `</code></pre>\n\n<i>Full content is attached as a text file below.</i>`;

        const availableForContent =
          maxMessageChars - previewPrefix.length - previewSuffix.length - 50;

        const maxContentLen = availableForContent > 500 ? availableForContent : 500;
        contentHtml = escaped.slice(0, maxContentLen) + "…";
        messageText = previewPrefix + contentHtml + previewSuffix;
        attachFile = true;
      }

      await ctx.reply(messageText, {
        parse_mode: "HTML",
        reply_to_message_id: ctx.message?.message_id,
      });

      if (attachFile) {
        const fileBuffer = Buffer.from(rawData, "utf8");
        // Use a custom filename per QR to avoid duplicate names (include length + hash)
        const shortHash = crypto.createHash("sha1").update(rawData).digest("hex").slice(0, 8);
        const fileName = `qr_${dataLength}chars_${shortHash}.txt`;
        await ctx.replyWithDocument(new InputFile(fileBuffer, fileName), {
          caption: "📄 Full QR content (copyable text file)",
          reply_to_message_id: ctx.message?.message_id,
        });
      }

      // Also re-encode the content as a fresh QR using the user's current /qs settings
      try {
        const {
          theme,
          size,
          errorCorrectionLevel,
          margin,
          logoEnabled,
          reencodeOnScan,
          artMode,
        } = getUserQrPrefs(u.id);

        if (!reencodeOnScan) {
          return;
        }

        const needsHighEc = logoEnabled || artMode;
        const effectiveLevel = getEffectiveQrErrorCorrection(
          errorCorrectionLevel,
          needsHighEc
        );

        const genResult = await generateQR(rawData, {
          width: size || theme.width,
          margin,
          errorCorrectionLevel: effectiveLevel,
          dark: theme.dark,
          light: theme.light,
        });

        if (genResult.success) {
          let qrBuffer = genResult.buffer;
          if (artMode) {
            qrBuffer = await renderQrArt(qrBuffer, theme, ctx.api);
          } else if (logoEnabled) {
            qrBuffer = await renderQrWithLogo(qrBuffer, theme, ctx.api);
          }

          const themeLabel = `${theme.icon} ${theme.label}`;
          await ctx.replyWithPhoto(new InputFile(qrBuffer, "qrcode.png"), {
            caption:
              `🔁 Re-encoded with your QR settings\n\n` +
              `🎨 Theme: <b>${escapeHTML(themeLabel)}</b>\n` +
              `📐 Size: <b>${size}×${size}</b> • EC: <b>${escapeHTML(
                effectiveLevel
              )}</b>` +
              (logoEnabled && !artMode ? `\n🔷 Logo: <b>Enabled</b>` : "") +
              (artMode ? `\n🖼️ Style: <b>Art mode</b>` : ""),
            parse_mode: "HTML",
            reply_to_message_id: ctx.message?.message_id,
          });
        }
      } catch (e) {
        // If re-encoding fails, just ignore; text + file already sent
        console.error("QR re-encode after scan failed:", e);
      }

      return;
    }
  } catch (error) {
    // Silently continue to normal photo processing if QR scan fails
  }
  
  // Anti-spam check
  const caption = ctx.message?.caption || "";
  if (!(await checkAntiSpam(ctx, caption))) return;

  const feedbackHandled = await handleFeedbackIfActive(ctx, { caption });
  if (feedbackHandled) return;

  if (!getUserRecord(u.id)) registerUser(u);

  const model = ensureChosenModelValid(u.id);
  const startTime = Date.now();
  let statusMsg = null;
  
  // Check if user has active character
  const activeCharForUser = getActiveCharacter(u.id, chat.id);
  
  // Check if replying to a character message (like text handler does)
  let replyCharacter = null;
  const replyToMsg = ctx.message?.reply_to_message;
  if (replyToMsg?.from?.id === BOT_ID && replyToMsg?.text) {
    // Check if the replied message starts with a character label
    const charMatch = replyToMsg.text.match(/^🎭\s*(.+?)\n/);
    if (charMatch) {
      replyCharacter = charMatch[1].trim();
    }
  }
  
  // Priority: replyCharacter > activeCharForUser
  const effectiveCharacter = replyCharacter || activeCharForUser?.name;
  const isCharacterMode = !!effectiveCharacter;
  
  // In groups without character mode, only respond if mentioned in caption
  if (chat.type !== "private" && !isCharacterMode) {
    // Skip group photos unless character is active
    return;
  }

  try {
    // Send initial processing status for images
    const statusText = isCharacterMode 
      ? `🎭 <b>${escapeHTML(effectiveCharacter)}</b> is looking at the image...`
      : `🖼️ Analyzing image with <b>${escapeHTML(model)}</b>...`;
    statusMsg = await ctx.reply(statusText, { parse_mode: "HTML" });

    // Keep typing indicator active
    const typingInterval = setInterval(() => {
      ctx.replyWithChatAction("typing").catch(() => {});
    }, 4000);
    await ctx.replyWithChatAction("typing");

    const photos = ctx.message.photo;
    const best = photos[photos.length - 1];
    const file = await ctx.api.getFile(best.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;
    const b64 = await telegramFileToBase64(fileUrl);

    let out;
    let modeLabel = "";
    
    if (isCharacterMode) {
      // Character mode - respond to image as the character
      const characterPrompt = buildCharacterSystemPrompt(effectiveCharacter);
      const userPrompt = caption || "What do you see in this image? React to it.";
      
      // Add to character history only if it's their active character (not a reply to different char)
      if (activeCharForUser?.name && !replyCharacter) {
        addCharacterMessage(u.id, chat.id, "user", `[Sent an image] ${userPrompt}`);
      }
      const charHistory = (activeCharForUser?.name && !replyCharacter) ? getCharacterChatHistory(u.id, chat.id) : [];
      
      // Build messages with vision
      const messages = [
        { role: "system", content: characterPrompt + " The user is showing you an image. React to it in character." },
        ...charHistory.slice(0, -1).map(m => ({ role: m.role, content: m.content })),
        {
          role: "user",
          content: [
            { type: "text", text: userPrompt },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${b64}` } }
          ]
        }
      ];
      
      out = await llmText({
        model,
        messages,
        temperature: 0.9,
        max_tokens: 500,
      });
      
      // Add AI response to character history only if it's their active character
      if (activeCharForUser?.name && !replyCharacter) {
        addCharacterMessage(u.id, chat.id, "assistant", out);
      }
      modeLabel = `🎭 <b>${escapeHTML(effectiveCharacter)}</b>\n\n`;
      
    } else {
      // Normal vision mode
      out = await llmVisionReply({
        chatId: chat.id,
        userText: caption || "What's in this image? Describe it clearly.",
        imageBase64: b64,
        mime: "image/jpeg",
        model,
      });
    }

    clearInterval(typingInterval);

    // Track usage
    trackUsage(u.id, "message");

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    // Edit status message with response
    const formattedOutput = convertToTelegramHTML(out.slice(0, 3700));
    const response = `${modeLabel}${formattedOutput}\n\n<i>👁️ ${elapsed}s • ${escapeHTML(model)}</i>`;
    if (statusMsg) {
      try {
        await ctx.api.editMessageText(chat.id, statusMsg.message_id, response, { parse_mode: "HTML" });
      } catch {
        await ctx.reply(response, { parse_mode: "HTML" });
      }
    } else {
      await ctx.reply(response, { parse_mode: "HTML" });
    }
  } catch (e) {
    console.error("Vision error:", e.message);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    
    const isTimeout = e.message?.includes("timed out");
    const errMsg = isTimeout
      ? `⏱️ Vision timed out after ${elapsed}s. Try /model to switch.`
      : `❌ Couldn't process image after ${elapsed}s. Try again.`;
    if (statusMsg) {
      try {
        await ctx.api.editMessageText(chat.id, statusMsg.message_id, errMsg, { parse_mode: "HTML" });
      } catch {
        await ctx.reply(errMsg, { parse_mode: "HTML" });
      }
    } else {
      await ctx.reply(errMsg, { parse_mode: "HTML" });
    }
  }
});

// =====================
// VIDEO SUMMARIZATION
// =====================
bot.on("message:video", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const chat = ctx.chat;
  const u = ctx.from;
  if (!u?.id) return;
  
  // Anti-spam check
  const caption = ctx.message?.caption || "";
  if (!(await checkAntiSpam(ctx, caption))) return;
  
  // Feedback handling for video + caption (DM only)
  const feedbackHandled = await handleFeedbackIfActive(ctx, { caption });
  if (feedbackHandled) return;

  // In groups: only process if replying to bot or group is active
  if (chat.type !== "private") {
    const isReplyToBot = BOT_ID && ctx.message?.reply_to_message?.from?.id === BOT_ID;
    const groupActive = isGroupActive(chat.id);
    
    if (!isReplyToBot && !groupActive) {
      return; // Ignore videos in groups unless replying to bot or group is active
    }
    
    // Activate group on interaction
    if (isReplyToBot) {
      activateGroup(chat.id);
    }
  }

  if (!getUserRecord(u.id)) registerUser(u);

  const model = ensureChosenModelValid(u.id);
  const startTime = Date.now();
  let statusMsg = null;
  let tempDir = null;

  try {
    // Check video size (limit to 20MB)
    const video = ctx.message.video;
    if (video.file_size > 20 * 1024 * 1024) {
      return ctx.reply("⚠️ Video too large! Please send videos under 20MB.");
    }

    statusMsg = await ctx.reply(`🎬 <b>Processing video...</b>\n\n⏳ Downloading...`, { parse_mode: "HTML" });

    // Keep typing indicator active
    const typingInterval = setInterval(() => {
      ctx.replyWithChatAction("typing").catch(() => {});
    }, 4000);
    await ctx.replyWithChatAction("typing");

    // Download video
    const file = await ctx.api.getFile(video.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;
    const { tempDir: td, videoPath } = await downloadTelegramVideo(fileUrl);
    tempDir = td;

    // Update status
    await ctx.api.editMessageText(chat.id, statusMsg.message_id, 
      `🎬 <b>Processing video...</b>\n\n✅ Downloaded\n⏳ Extracting frames...`, 
      { parse_mode: "HTML" }
    ).catch(() => {});

    // Extract frames - more frames for better context
    const videoDuration = video.duration || 10;
    const frameCount = Math.min(Math.max(Math.ceil(videoDuration / 2), 5), 15); // 1 frame per 2 seconds, min 5, max 15
    let { frames, duration, error: frameError } = await extractVideoFrames(videoPath, tempDir, frameCount);
    
    // Fallback: use Telegram's video thumbnail if ffmpeg failed
    if (frames.length === 0 && video.thumb) {
      console.log("[VIDEO] Using Telegram thumbnail as fallback");
      try {
        const thumbFile = await ctx.api.getFile(video.thumb.file_id);
        const thumbUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${thumbFile.file_path}`;
        const thumbB64 = await telegramFileToBase64(thumbUrl);
        frames = [{ timestamp: "0.0", base64: thumbB64 }];
        duration = video.duration || 0;
      } catch (thumbErr) {
        console.error("[VIDEO] Thumbnail fallback failed:", thumbErr.message);
      }
    }

    // Update status
    await ctx.api.editMessageText(chat.id, statusMsg.message_id, 
      `🎬 <b>Processing video...</b>\n\n✅ Downloaded\n✅ ${frames.length > 0 ? `Got ${frames.length} frame(s)` : "No frames (using thumbnail)"}\n⏳ Transcribing audio...`, 
      { parse_mode: "HTML" }
    ).catch(() => {});

    // Extract and transcribe audio (skip if ffmpeg not available)
    let transcript = null;
    let hasAudio = false;
    if (!frameError || !frameError.includes("ffmpeg not installed")) {
      const audioResult = await extractAndTranscribeAudio(videoPath, tempDir);
      transcript = audioResult.transcript;
      hasAudio = audioResult.hasAudio;
    }

    // Update status
    await ctx.api.editMessageText(chat.id, statusMsg.message_id, 
      `🎬 <b>Processing video...</b>\n\n✅ Downloaded\n✅ Extracted ${frames.length} frames\n✅ Audio ${hasAudio ? (transcript ? "transcribed" : "detected (no speech)") : "not found"}\n⏳ Analyzing with AI...`, 
      { parse_mode: "HTML" }
    ).catch(() => {});

    // Build prompt for AI
    const caption = (ctx.message.caption || "").trim();
    const hasQuestion = caption && (caption.includes("?") || /^(who|what|where|when|why|how|is|are|can|does|did|explain|tell|describe|identify)/i.test(caption));
    
    let userPrompt = caption || "What's happening in this video? Describe the content.";
    
    // Add transcript context if available
    if (transcript) {
      userPrompt += `\n\n[Audio transcript]: ${transcript.slice(0, 1500)}`;
    }

    // Build messages with multiple frames
    const imageContents = frames.map((f, i) => ({
      type: "image_url",
      image_url: { url: `data:image/jpeg;base64,${f.base64}` }
    }));

    // Context-aware system prompt - emphasize accuracy over speculation
    let systemPrompt = `You are analyzing a ${duration.toFixed(1)}s video through ${frames.length} sequential frame(s) taken at regular intervals. `;
    
    // Core instruction: be accurate, don't hallucinate
    systemPrompt += `\n\nIMPORTANT RULES:
- ONLY describe what you can actually SEE in the frames
- DO NOT make up or guess things that aren't visible
- If you're unsure about something, say "appears to be" or "possibly"
- If you can't identify something, say so honestly
- Focus on observable facts: people, objects, actions, text, setting\n\n`;
    
    if (transcript) {
      systemPrompt += "Audio transcript is provided - use it to understand context, identify speech, music, or sounds. ";
    }
    if (hasQuestion) {
      systemPrompt += "Answer the user's specific question based ONLY on what you can see/hear. If you can't answer from the video, say so.";
    } else if (caption) {
      systemPrompt += "Respond to the user's message based on what you observe in the video.";
    } else {
      systemPrompt += "Describe what's happening: the setting, people/characters, actions, any visible text, and notable details. Be specific and factual.";
    }

    const messages = [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          { type: "text", text: userPrompt },
          ...imageContents
        ]
      }
    ];

    const out = await llmText({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 800,
    });

    clearInterval(typingInterval);

    // Track usage
    trackUsage(u.id, "message");

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    // Build response - cleaner format
    let response = convertToTelegramHTML(out.slice(0, 3500));
    response += `\n\n<i>🎬 ${elapsed}s • ${escapeHTML(model)}</i>`;

    await ctx.api.editMessageText(chat.id, statusMsg.message_id, response, { parse_mode: "HTML" });

  } catch (e) {
    console.error("Video processing error:", e.message);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    
    const errMsg = `❌ Couldn't process video after ${elapsed}s.\n\nError: ${escapeHTML(e.message?.slice(0, 100) || "Unknown error")}`;
    if (statusMsg) {
      try {
        await ctx.api.editMessageText(chat.id, statusMsg.message_id, errMsg, { parse_mode: "HTML" });
      } catch {
        await ctx.reply(errMsg, { parse_mode: "HTML" });
      }
    } else {
      await ctx.reply(errMsg, { parse_mode: "HTML" });
    }
  } finally {
    // Clean up temp files
    if (tempDir) {
      cleanupTempDir(tempDir);
    }
  }
});

// Video notes (round videos) - treat as photos using thumbnail
bot.on("message:video_note", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const chat = ctx.chat;
  const u = ctx.from;
  if (!u?.id) return;
  
  // Anti-spam check
  if (!(await checkAntiSpam(ctx, "video_note"))) return;
  
  // In groups: only process if replying to bot or group is active
  if (chat.type !== "private") {
    const isReplyToBot = BOT_ID && ctx.message?.reply_to_message?.from?.id === BOT_ID;
    const groupActive = isGroupActive(chat.id);
    const hasActiveChar = !!getActiveCharacter(u.id, chat.id)?.name;
    
    if (!isReplyToBot && !groupActive && !hasActiveChar) {
      return;
    }
  }
  
  // Use the video note thumbnail as an image
  const videoNote = ctx.message.video_note;
  if (videoNote.thumb) {
    try {
      const thumbFile = await ctx.api.getFile(videoNote.thumb.file_id);
      const thumbUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${thumbFile.file_path}`;
      const b64 = await telegramFileToBase64(thumbUrl);
      
      const model = ensureChosenModelValid(u.id);
      const caption = "What's in this video note?";
      
      const statusMsg = await ctx.reply(`📹 Analyzing video note...`, { parse_mode: "HTML" });
      
      const out = await llmVision({
        chatId: chat.id,
        userText: caption,
        imageBase64: b64,
        mime: "image/jpeg",
        model,
      });
      
      const response = `📹 <b>Video Note</b>\n\n${convertToTelegramHTML(out.slice(0, 3500))}`;
      await ctx.api.editMessageText(chat.id, statusMsg.message_id, response, { parse_mode: "HTML" });
    } catch (e) {
      console.error("Video note error:", e.message);
      await ctx.reply("❌ Couldn't process video note.");
    }
  }
});

// Animations/GIFs
bot.on("message:animation", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const chat = ctx.chat;
  const u = ctx.from;
  if (!u?.id) return;
  
  // Anti-spam check
  const caption = ctx.message?.caption || "";
  if (!(await checkAntiSpam(ctx, caption))) return;
  
  // In groups: only process if replying to bot or group is active or has character
  if (chat.type !== "private") {
    const isReplyToBot = BOT_ID && ctx.message?.reply_to_message?.from?.id === BOT_ID;
    const groupActive = isGroupActive(chat.id);
    const hasActiveChar = !!getActiveCharacter(u.id, chat.id)?.name;
    
    if (!isReplyToBot && !groupActive && !hasActiveChar) {
      return;
    }
    
    if (isReplyToBot) {
      activateGroup(chat.id);
    }
  }
  
  if (!getUserRecord(u.id)) registerUser(u);
  
  const animation = ctx.message.animation;
  const model = ensureChosenModelValid(u.id);
  const startTime = Date.now();
  
  // Check for character mode
  const activeChar = getActiveCharacter(u.id, chat.id);
  const replyToMsg = ctx.message?.reply_to_message;
  let replyCharacter = null;
  
  if (replyToMsg?.text) {
    const charMatch = replyToMsg.text.match(/^🎭 \*?([^*\n]+)\*?\n/);
    if (charMatch && replyToMsg.from?.is_bot) {
      replyCharacter = charMatch[1].trim();
    }
  }
  
  const effectiveCharacter = replyCharacter || activeChar?.name;
  const isCharacterMode = !!effectiveCharacter;
  
  let statusMsg = null;
  let tempDir = null;
  
  try {
    let modeLabel = "";
    let statusText = `🎬 Analyzing GIF...`;
    
    if (isCharacterMode) {
      modeLabel = `🎭 <b>${escapeHTML(effectiveCharacter)}</b>\n\n`;
      statusText = `🎭 ${escapeHTML(effectiveCharacter)} is looking at the GIF...`;
    }
    
    statusMsg = await ctx.reply(statusText, { parse_mode: "HTML" });
    
    // Download the actual GIF file
    const file = await ctx.api.getFile(animation.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;
    
    // Try to extract frames using ffmpeg
    let frames = [];
    let duration = animation.duration || 3;
    
    try {
      const { tempDir: td, videoPath } = await downloadTelegramVideo(fileUrl);
      tempDir = td;
      const result = await extractVideoFrames(videoPath, tempDir, 4);
      frames = result.frames;
      if (result.duration > 0) duration = result.duration;
    } catch (dlErr) {
      console.log("[GIF] Frame extraction failed, trying thumbnail:", dlErr.message);
    }
    
    // Fallback to thumbnail if frame extraction failed
    if (frames.length === 0 && animation.thumb) {
      try {
        const thumbFile = await ctx.api.getFile(animation.thumb.file_id);
        const thumbUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${thumbFile.file_path}`;
        const thumbB64 = await telegramFileToBase64(thumbUrl);
        frames = [{ timestamp: "0.0", base64: thumbB64 }];
      } catch (thumbErr) {
        console.error("[GIF] Thumbnail fallback failed:", thumbErr.message);
      }
    }
    
    if (frames.length === 0) {
      return ctx.api.editMessageText(chat.id, statusMsg.message_id, "⚠️ Couldn't extract frames from GIF.", { parse_mode: "HTML" });
    }
    
    // Build image contents for AI
    const imageContents = frames.map(f => ({
      type: "image_url",
      image_url: { url: `data:image/jpeg;base64,${f.base64}` }
    }));
    
    // Context-aware prompt
    const hasQuestion = caption && (caption.includes("?") || /^(who|what|where|when|why|how|is|are|can|does|did|explain|tell|describe|identify)/i.test(caption));
    let userPrompt = caption || "What's in this GIF? Describe what's happening.";
    
    let out;
    if (isCharacterMode) {
      const systemPrompt = buildCharacterSystemPrompt(effectiveCharacter);
      out = await llmText({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: caption || "React to this GIF" },
              ...imageContents
            ]
          }
        ],
        temperature: 0.85,
        max_tokens: 500,
      });
    } else {
      let gifSystemPrompt = `You are analyzing a ${duration}s GIF/animation through ${frames.length} sequential frame(s).\n\nIMPORTANT: Only describe what you can actually SEE. Don't guess or make things up. If it's a meme, describe the visual elements and any text. If you recognize a person/character, name them. If unsure, say so.\n\n`;
      if (hasQuestion) {
        gifSystemPrompt += "Answer the user's specific question based on what you see.";
      } else if (caption) {
        gifSystemPrompt += "Respond to the user's message based on what you observe.";
      } else {
        gifSystemPrompt += "Describe: the scene, any people/characters, actions, visible text, and if it's a meme/joke, explain it.";
      }
      
      out = await llmText({
        model,
        messages: [
          { role: "system", content: gifSystemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: userPrompt },
              ...imageContents
            ]
          }
        ],
        temperature: 0.7,
        max_tokens: 500,
      });
    }
    
    trackUsage(u.id, "message");
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    
    const response = `${modeLabel}${convertToTelegramHTML(out.slice(0, 3500))}\n\n<i>🎬 ${elapsed}s • ${escapeHTML(model)}</i>`;
    await ctx.api.editMessageText(chat.id, statusMsg.message_id, response, { parse_mode: "HTML" });
    
  } catch (e) {
    console.error("Animation error:", e.message);
    const errMsg = `❌ Couldn't process GIF: ${escapeHTML(e.message?.slice(0, 50) || "Unknown error")}`;
    if (statusMsg) {
      await ctx.api.editMessageText(chat.id, statusMsg.message_id, errMsg, { parse_mode: "HTML" }).catch(() => {});
    } else {
      await ctx.reply(errMsg, { parse_mode: "HTML" });
    }
  } finally {
    if (tempDir) cleanupTempDir(tempDir);
  }
});

// =====================
// INLINE MODE - INTERACTIVE CHAT
// =====================

// Helper to safely answer inline queries (handles expired query errors)
async function safeAnswerInline(ctx, results, options = {}) {
  try {
    return await ctx.answerInlineQuery(results, { cache_time: 0, is_personal: true, ...options });
  } catch (e) {
    // Ignore "query is too old" errors - these are normal when AI takes too long
    if (e.description?.includes("query is too old") || e.description?.includes("query ID is invalid")) {
      console.log(`Inline query expired (normal for slow responses): ${e.description}`);
      return; // Silently ignore
    }
    // Re-throw other errors
    throw e;
  }
}

bot.on("inline_query", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;

  const q = (ctx.inlineQuery.query || "").trim();
  const userId = ctx.from?.id;
  
  console.log(`Inline query from ${userId}: "${q}" (length: ${q.length})`);

  if (!userId) return;

  // Auto-register
  if (!getUserRecord(userId)) registerUser(ctx.from);

  const session = getInlineSession(userId);
  const model = session.model || ensureChosenModelValid(userId);
  const sessionKey = makeId(6);

  // Empty query - show main menu with Ask AI, Starz Check, Settings, Help cards
  if (!q || q.length === 0) {
    console.log("Showing main menu (empty query)");
    const shortModel = model.split("/").pop();
    
    // Get user's task counts for Starz Check card
    const userTodos = getUserTodos(userId);
    const personalPending = (userTodos.tasks || []).filter(t => !t.completed).length;
    const userCollabLists = getCollabListsForUser(userId);
    const collabCount = userCollabLists.length;
    
    // Original Ask AI card with mode buttons
    const askAiText = [
      "⚡ *StarzAI - Ask AI Modes*",
      "",
      "⭐ Quark - Quick answers",
      "🗿🔬 Blackhole - Deep research",
      "💻 Code - Programming help",
      "🧠 Explain - Simple explanations",
      "🎭 Character - Fun personas",
      "📝 Summarize - Condense text",
      "🤝🏻 Partner - Chat with your AI companion",
      "🌐 Websearch - Search the web with AI summary (`w:`)",
      "",
      "_Tap a button or type directly!_",
    ].join("\n");
    
    // Starz Check card - show tasks directly!
    const userTasks = userTodos.tasks || [];
    const streak = getCompletionStreak(userId);
    let starzCheckText = `✅ *Starz Check*`;
    if (streak > 0) starzCheckText += ` 🔥${streak}`;
    
    const results = [
      {
        type: "article",
        id: `ask_ai_${sessionKey}`,
        title: "⚡ Ask AI",
        description: "Quick • Deep • Code • Explain • Web • Character • Summarize",
        thumbnail_url: "https://img.icons8.com/fluency/96/lightning-bolt.png",
        input_message_content: { 
          message_text: askAiText,
          parse_mode: "Markdown"
        },
        reply_markup: new InlineKeyboard()
          .switchInlineCurrent("⭐ Quark", "q: ")
          .switchInlineCurrent("🗿🔬 Blackhole", "b: ")
          .row()
          .switchInlineCurrent("💻 Code", "code: ")
          .switchInlineCurrent("🧠 Explain", "e: ")
          .row()
          .switchInlineCurrent("🌐 Websearch", "w: ")
          .switchInlineCurrent("📝 Summarize", "sum: ")
          .row()
          .switchInlineCurrent("🎭 Character", "as ")
          .switchInlineCurrent("🤝🏻 Partner", "p: "),
      },
      {
        type: "article",
        id: `starz_check_${sessionKey}`,
        title: "✅ Starz Check",
        description: `${personalPending} pending • ${collabCount} collab lists${streak > 0 ? ` • 🔥${streak}` : ""}`,
        thumbnail_url: "https://img.icons8.com/fluency/96/todo-list.png",
        input_message_content: { 
          message_text: starzCheckText,
          parse_mode: "Markdown"
        },
        reply_markup: (() => {
          const kb = new InlineKeyboard();
          // Show tasks directly as buttons!
          userTasks.slice(0, 6).forEach((task) => {
            if (!task || !task.text) return; // Skip invalid tasks
            const icon = task.completed ? "✅" : "⬜";
            const text = task.text.slice(0, 25) + (task.text.length > 25 ? ".." : "");
            const catEmoji = getCategoryEmoji(task.category);
            const priInd = task.priority === "high" ? "🔴" : task.priority === "medium" ? "🟡" : "";
            kb.text(`${icon} ${text} ${catEmoji}${priInd}`, `itodo_tap:${task.id}`);
            kb.row();
          });
          if (userTasks.length === 0) {
            kb.text("📋 No tasks yet", "itodo_add").row();
          }
          // Action row
          kb.switchInlineCurrent("➕", "t:add ")
            .text("🔍", "itodo_filter")
            .text("👥", "itodo_collab")
            .row()
            .text("← Back", "inline_main_menu");
          return kb;
        })(),
      },
      {
        type: "article",
        id: `settings_menu_${sessionKey}`,
        title: `⚙️ Settings`,
        description: `Model: ${shortModel} • Tap to change`,
        thumbnail_url: "https://img.icons8.com/fluency/96/settings.png",
        input_message_content: { 
          message_text: `⚙️ *StarzAI Settings*\n\nCurrent model: \`${shortModel}\`\n\nSelect a category:`,
          parse_mode: "Markdown"
        },
        reply_markup: settingsMainKeyboard(userId),
      },
      {
        type: "article",
        id: `help_menu_${sessionKey}`,
        title: "❓ Help",
        description: "Features • How to use • Support",
        thumbnail_url: "https://img.icons8.com/fluency/96/help.png",
        input_message_content: { 
          message_text: buildInlineHelpCard(),
          parse_mode: "Markdown"
        },
        reply_markup: new InlineKeyboard()
          .url("💬 Feedback", "https://t.me/starztechbot?start=feedback")
          .row()
          .switchInlineCurrent("← Back", ""),
      },
    ];

    return safeAnswerInline(ctx, results, { cache_time: 0, is_personal: true });
  }
  
  // Filter modes when user types partial text
  const qLower = q.toLowerCase();
  const shortModel = model.split("/").pop();
  
  // =====================
  // AUTO URL DETECTION - Detect video/media links for instant download
  // =====================
  
  // URL patterns for auto-detection
  const urlPatterns = {
    youtube: /(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    tiktok: /(?:tiktok\.com\/@[\w.-]+\/video\/|vm\.tiktok\.com\/|tiktok\.com\/t\/)(\w+)/,
    instagram: /(?:instagram\.com\/(?:p|reel|reels|tv)\/)([\w-]+)/,
    twitter: /(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/,
    facebook: /(?:facebook\.com|fb\.watch)\/(?:watch\/\?v=|[\w.]+\/videos\/|reel\/)?(\d+)?/,
    spotify: /(?:open\.spotify\.com\/(?:track|album|playlist)\/)([a-zA-Z0-9]+)/,
  };
  
  const platformEmojis = {
    youtube: '🎬',
    tiktok: '🎵',
    instagram: '📸',
    twitter: '🐦',
    facebook: '📘',
    spotify: '🎧',
  };
  
  const platformNames = {
    youtube: 'YouTube',
    tiktok: 'TikTok',
    instagram: 'Instagram',
    twitter: 'Twitter/X',
    facebook: 'Facebook',
    spotify: 'Spotify',
  };
  
  // Check if query contains a supported URL
  let detectedPlatform = null;
  let detectedUrl = q;
  
  for (const [platform, pattern] of Object.entries(urlPatterns)) {
    if (pattern.test(q)) {
      detectedPlatform = platform;
      break;
    }
  }
  
  // If URL detected, show download option
  if (detectedPlatform) {
    const dlKey = makeId(6);
    const emoji = platformEmojis[detectedPlatform] || '📥';
    const platformName = platformNames[detectedPlatform] || 'Media';
    
    // Store the URL for the callback handler
    inlineCache.set(`dl_pending_${dlKey}`, {
      type: 'download',
      url: detectedUrl,
      platform: detectedPlatform,
      userId: String(userId),
      createdAt: Date.now(),
    });
    setTimeout(() => inlineCache.delete(`dl_pending_${dlKey}`), 5 * 60 * 1000);
    
    return safeAnswerInline(ctx, [
      {
        type: "article",
        id: `dl_start_${dlKey}`,
        title: `${emoji} Download from ${platformName}`,
        description: `Tap to download this ${platformName} media`,
        thumbnail_url: "https://img.icons8.com/fluency/96/download.png",
        input_message_content: {
          message_text: `${emoji} <b>Downloading from ${platformName}...</b>\n\n🔗 ${escapeHTML(detectedUrl.slice(0, 50))}${detectedUrl.length > 50 ? '...' : ''}\n\n<i>⏳ Please wait...</i>`,
          parse_mode: "HTML",
        },
        reply_markup: new InlineKeyboard().text("⏳ Downloading...", `dl_loading_${dlKey}`),
      },
      {
        type: "article",
        id: `dl_audio_${dlKey}`,
        title: `🎵 Download Audio Only`,
        description: `Extract audio from this ${platformName} media`,
        thumbnail_url: "https://img.icons8.com/fluency/96/audio-file.png",
        input_message_content: {
          message_text: `🎵 <b>Extracting audio from ${platformName}...</b>\n\n🔗 ${escapeHTML(detectedUrl.slice(0, 50))}${detectedUrl.length > 50 ? '...' : ''}\n\n<i>⏳ Please wait...</i>`,
          parse_mode: "HTML",
        },
        reply_markup: new InlineKeyboard().text("⏳ Extracting...", `dl_audio_loading_${dlKey}`),
      },
    ], { cache_time: 0, is_personal: true });
  }
  
  // =====================
  // SHORT PREFIX HANDLERS - q, b, code, e, r, s for quick access
  // =====================
  
  // "q:" or "q " - Quark mode (quick, concise answers)
  // Uses deferred response pattern: sends placeholder immediately, then edits with AI response
  if (qLower.startsWith("q:") || qLower.startsWith("q ")) {
    const question = q.slice(2).trim();
    
    if (!question) {
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `q_typing_${sessionKey}`,
          title: "⭐ Quark - Quick Answer",
          description: "Type your question for a fast, concise answer",
          thumbnail_url: "https://img.icons8.com/fluency/96/lightning-bolt.png",
          input_message_content: { message_text: "_" },
          reply_markup: new InlineKeyboard().switchInlineCurrent("← Back to Menu", ""),
        },
      ], { cache_time: 0, is_personal: true });
    }
    
    // Generate a unique key for this request
    const qKey = makeId(6);
    const escapedQuestion = escapeHTML(question);
    
    // Store pending request - will be processed in chosen_inline_result
    inlineCache.set(`q_pending_${qKey}`, {
      prompt: question,
      userId: String(userId),
      model,
      shortModel,
      createdAt: Date.now(),
    });
    setTimeout(() => inlineCache.delete(`q_pending_${qKey}`), 5 * 60 * 1000);
    
    // Return placeholder immediately - AI response will be edited in
    return safeAnswerInline(ctx, [
      {
        type: "article",
        id: `q_start_${qKey}`,
        title: `⭐ Quark: ${question.slice(0, 35)}`,
        description: "Tap to get quick answer",
        thumbnail_url: "https://img.icons8.com/fluency/96/lightning-bolt.png",
        input_message_content: {
          message_text: `⭐ <b>Quark: ${escapedQuestion}</b>\n\n⏳ <i>Getting quick answer...</i>\n\n<i>via StarzAI • Quark • ${shortModel}</i>`,
          parse_mode: "HTML",
        },
        // IMPORTANT: Must include reply_markup to receive inline_message_id
        reply_markup: new InlineKeyboard().text("⏳ Loading...", "noop"),
      },
    ], { cache_time: 0, is_personal: true });
  }
  
  // "b:" or "b " - Blackhole mode (deep research & analysis)
  // Uses deferred response pattern: sends placeholder immediately, then edits with AI response
  if (qLower.startsWith("b:") || qLower.startsWith("b ")) {
    const topic = q.slice(2).trim();
    
    if (!topic) {
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `b_typing_${sessionKey}`,
          title: "🗿🔬 Blackhole - Deep Research",
          description: "Type your topic for in-depth analysis",
          thumbnail_url: "https://img.icons8.com/fluency/96/black-hole.png",
          input_message_content: { message_text: "_" },
          reply_markup: new InlineKeyboard().switchInlineCurrent("← Back to Menu", ""),
        },
      ], { cache_time: 0, is_personal: true });
    }
    
    // Generate a unique key for this request
    const bhKey = makeId(6);
    const escapedTopic = escapeHTML(topic);
    
    // Store pending request - will be processed in chosen_inline_result
    inlineCache.set(`bh_pending_${bhKey}`, {
      type: "blackhole",
      prompt: topic,
      userId: String(userId),
      model,
      shortModel,
      createdAt: Date.now(),
    });
    
    // Send placeholder immediately - this won't timeout!
    // IMPORTANT: Must include reply_markup (inline keyboard) to receive inline_message_id in chosen_inline_result
    return safeAnswerInline(ctx, [
      {
        type: "article",
        id: `bh_start_${bhKey}`,
        title: `🗿🔬 ${topic.slice(0, 40)}`,
        description: "🔄 Tap to start deep analysis...",
        thumbnail_url: "https://img.icons8.com/fluency/96/black-hole.png",
        input_message_content: {
          message_text: `🗿🔬 <b>Blackhole Analysis: ${escapedTopic}</b>\n\n⏳ <i>Analyzing in depth... Please wait...</i>\n\n<i>via StarzAI • Blackhole • ${shortModel}</i>`,
          parse_mode: "HTML",
        },
        // Keyboard is required to get inline_message_id for editing!
        reply_markup: new InlineKeyboard().text("⏳ Loading...", `bh_loading_${bhKey}`),
      },
    ], { cache_time: 0, is_personal: true });
  }

  // "w:" or "w " - Websearch mode (web search + AI summary via Parallel or fallbacks)
  // Uses deferred response pattern similar to Blackhole so inline result can be edited later.
  if (qLower.startsWith("w:") || qLower.startsWith("w ")) {
    const topic = q.slice(2).trim();

    if (!topic) {
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `w_typing_${sessionKey}`,
          title: "🌐 Websearch - AI Web Search",
          description: "Type what you want to search on the web",
          thumbnail_url: "https://img.icons8.com/fluency/96/search.png",
          input_message_content: { message_text: "_" },
          reply_markup: new InlineKeyboard().switchInlineCurrent("← Back to Menu", ""),
        },
      ], { cache_time: 0, is_personal: true });
    }

    const wKey = makeId(6);
    const escapedTopic = escapeHTML(topic);

    inlineCache.set(`w_pending_${wKey}`, {
      type: "websearch",
      prompt: topic,
      userId: String(userId),
      model,
      shortModel,
      createdAt: Date.now(),
    });
    setTimeout(() => inlineCache.delete(`w_pending_${wKey}`), 5 * 60 * 1000);

    return safeAnswerInline(ctx, [
      {
        type: "article",
        id: `w_start_${wKey}`,
        title: `🌐 ${topic.slice(0, 40)}`,
        description: "🔎 Tap to run websearch...",
        thumbnail_url: "https://img.icons8.com/fluency/96/search.png",
        input_message_content: {
          message_text: `🌐 <b>Websearch: ${escapedTopic}</b>\n\n⏳ <i>Searching the web and analyzing...</i>\n\n<i>via StarzAI • Websearch • ${shortModel}</i>`,
          parse_mode: "HTML",
        },
        reply_markup: new InlineKeyboard().text("⏳ Loading...", "w_loading"),
      },
    ], { cache_time: 0, is_personal: true });
  }
  
  // "code:" - Code mode (programming help)
  // Uses deferred response pattern: sends placeholder immediately, then edits with AI response
  if (qLower.startsWith("code:") || qLower.startsWith("code ")) {
    const codeQ = q.slice(5).trim();
    
    if (!codeQ) {
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `code_typing_${sessionKey}`,
          title: "💻 Code - Programming Help",
          description: "Type your coding question",
          thumbnail_url: "https://img.icons8.com/fluency/96/code.png",
          input_message_content: { message_text: "_" },
          reply_markup: new InlineKeyboard().switchInlineCurrent("← Back to Menu", ""),
        },
      ], { cache_time: 0, is_personal: true });
    }
    
    // Generate a unique key for this request
    const codeKey = makeId(6);
    const escapedCodeQ = escapeHTML(codeQ);
    
    // Store pending request - will be processed in chosen_inline_result
    inlineCache.set(`code_pending_${codeKey}`, {
      prompt: codeQ,
      userId: String(userId),
      model,
      shortModel,
      createdAt: Date.now(),
    });
    setTimeout(() => inlineCache.delete(`code_pending_${codeKey}`), 5 * 60 * 1000);
    
    // Return placeholder immediately - AI response will be edited in
    return safeAnswerInline(ctx, [
      {
        type: "article",
        id: `code_start_${codeKey}`,
        title: `💻 Code: ${codeQ.slice(0, 35)}`,
        description: "Tap to get code help",
        thumbnail_url: "https://img.icons8.com/fluency/96/code.png",
        input_message_content: {
          message_text: `💻 <b>Code: ${escapedCodeQ}</b>\n\n⏳ <i>Writing code...</i>\n\n<i>via StarzAI • Code • ${shortModel}</i>`,
          parse_mode: "HTML",
        },
        // IMPORTANT: Must include reply_markup to receive inline_message_id
        reply_markup: new InlineKeyboard().text("⏳ Loading...", "noop"),
      },
    ], { cache_time: 0, is_personal: true });
  }
  
  // "e:" or "e " - Explain mode (ELI5 style)
  // Uses deferred response pattern: sends placeholder immediately, then edits with AI response
  if (qLower.startsWith("e:") || qLower.startsWith("e ")) {
    const concept = q.slice(2).trim();
    
    if (!concept) {
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `e_typing_${sessionKey}`,
          title: "🧠 Explain - Simple Explanations",
          description: "Type a concept to explain simply",
          thumbnail_url: "https://img.icons8.com/fluency/96/brain.png",
          input_message_content: { message_text: "_" },
          reply_markup: new InlineKeyboard().switchInlineCurrent("← Back to Menu", ""),
        },
      ], { cache_time: 0, is_personal: true });
    }
    
    // Generate a unique key for this request
    const expKey = makeId(6);
    const escapedConcept = escapeHTML(concept);
    
    // Store pending request - will be processed in chosen_inline_result
    inlineCache.set(`e_pending_${expKey}`, {
      prompt: concept,
      userId: String(userId),
      model,
      shortModel,
      createdAt: Date.now(),
    });
    setTimeout(() => inlineCache.delete(`e_pending_${expKey}`), 5 * 60 * 1000);
    
    // Return placeholder immediately - AI response will be edited in
    return safeAnswerInline(ctx, [
      {
        type: "article",
        id: `e_start_${expKey}`,
        title: `🧠 Explain: ${concept.slice(0, 35)}`,
        description: "Tap to get simple explanation",
        thumbnail_url: "https://img.icons8.com/fluency/96/brain.png",
        input_message_content: {
          message_text: `🧠 <b>Explain: ${escapedConcept}</b>\n\n⏳ <i>Simplifying...</i>\n\n<i>via StarzAI • Explain • ${shortModel}</i>`,
          parse_mode: "HTML",
        },
        // IMPORTANT: Must include reply_markup to receive inline_message_id
        reply_markup: new InlineKeyboard().text("⏳ Loading...", "noop"),
      },
    ], { cache_time: 0, is_personal: true });
  }
  
  // "as " - Show saved characters when user types just "as " or "as"
  if (qLower === "as" || qLower === "as ") {
    const savedChars = getSavedCharacters(userId);
    
    const results = [];
    
    // Add saved characters as quick options
    if (savedChars.length > 0) {
      savedChars.forEach((char, i) => {
        results.push({
          type: "article",
          id: `as_saved_${i}_${sessionKey}`,
          title: `🎭 ${char}`,
          description: `Tap to chat as ${char}`,
          thumbnail_url: "https://img.icons8.com/fluency/96/theatre-mask.png",
          input_message_content: { message_text: "_" },
          reply_markup: new InlineKeyboard().switchInlineCurrent(`🎭 ${char}`, `as ${char}: `),
        });
      });
    }
    
    // Add typing hint
    results.push({
      type: "article",
      id: `as_typing_hint_${sessionKey}`,
      title: "✍️ Type character name...",
      description: "Example: as yoda: hello there",
      thumbnail_url: "https://img.icons8.com/fluency/96/edit.png",
      input_message_content: { message_text: "_" },
      reply_markup: new InlineKeyboard().switchInlineCurrent("← Back to Menu", ""),
    });
    
    // Add save hint if no saved characters
    if (savedChars.length === 0) {
      results.push({
        type: "article",
        id: `as_save_hint_${sessionKey}`,
        title: "💾 No saved characters",
        description: "Use /char save [name] to save favorites",
        thumbnail_url: "https://img.icons8.com/fluency/96/bookmark.png",
        input_message_content: { message_text: "_" },
      });
    }
    
    return safeAnswerInline(ctx, results, { cache_time: 0, is_personal: true });
  }
  
  // "as:" - Character/Persona mode (as pirate:, as shakespeare:, etc.)
  const asMatch = q.match(/^as\s+([^:]+):\s*(.*)$/i);
  if (asMatch) {
    const character = asMatch[1].trim();
    const question = asMatch[2].trim();
    
    // If no question, generate a character intro message
    if (!question) {
      try {
        // Generate character intro
        const introOut = await llmText({
          model,
          messages: [
            { role: "system", content: `You are ${character}. Introduce yourself in 1-2 sentences in your unique style, personality, and speech patterns. Be creative and stay completely in character. Don't say "I am [name]" directly - show your personality through how you speak.` },
            { role: "user", content: "Introduce yourself briefly." },
          ],
          temperature: 0.9,
          max_tokens: 150,
          timeout: 8000,
          retries: 1,
        });
        
        const intro = (introOut || `*${character} appears*`).slice(0, 500);
        const introKey = makeId(6);
        
        // Cache the intro for replies
        inlineCache.set(introKey, {
          prompt: "[Character Introduction]",
          answer: intro,
          userId: String(userId),
          model,
          character,
          isIntro: true,
          createdAt: Date.now(),
        });
        setTimeout(() => inlineCache.delete(introKey), 30 * 60 * 1000);
        
        const formattedIntro = convertToTelegramHTML(intro);
        const escapedCharacter = escapeHTML(character);
        
        return safeAnswerInline(ctx, [
          {
            type: "article",
            id: `char_intro_${introKey}`,
            title: `🎭 Meet ${character}`,
            description: intro.slice(0, 80),
            thumbnail_url: "https://img.icons8.com/fluency/96/theatre-mask.png",
            input_message_content: {
              message_text: `🎭 <b>${escapedCharacter}</b>\n\n${formattedIntro}\n\n<i>Reply to continue chatting! • via StarzAI</i>`,
              parse_mode: "HTML",
            },
            reply_markup: new InlineKeyboard()
              .text("🔄 New Intro", `char_new_intro:${character}`)
              .switchInlineCurrent(`✉️ Ask ${character.slice(0, 10)}`, `as ${character}: `),
          },
        ], { cache_time: 0, is_personal: true });
      } catch (e) {
        // Fallback if intro generation fails
        return safeAnswerInline(ctx, [
          {
            type: "article",
            id: `as_typing_${sessionKey}`,
            title: `🎭 Chat as ${character}`,
            description: `Type your message after the colon`,
            thumbnail_url: "https://img.icons8.com/fluency/96/theatre-mask.png",
            input_message_content: { message_text: `🎭 <b>${escapeHTML(character)}</b>\n\n<i>*${escapeHTML(character)} is ready to chat*</i>\n\n<i>Reply to start the conversation!</i>`, parse_mode: "HTML" },
            reply_markup: new InlineKeyboard().switchInlineCurrent(`✉️ Ask ${character.slice(0, 10)}`, `as ${character}: `),
          },
        ], { cache_time: 0, is_personal: true });
      }
    }
    
    try {
      const out = await llmText({
        model,
        messages: [
          { role: "system", content: `You are roleplaying as ${character}. Stay completely in character. Respond to everything as ${character} would - use their speech patterns, vocabulary, mannerisms, and personality. Be creative and entertaining while still being helpful.` },
          { role: "user", content: question },
        ],
        temperature: 0.9,
        max_tokens: 400,
        timeout: 10000,
        retries: 1,
      });
      
      const answer = (out || "*stays silent*").slice(0, 1500);
      const asKey = makeId(6);
      
      inlineCache.set(asKey, {
        prompt: question,
        answer,
        userId: String(userId),
        model,
        character,
        mode: "character",
        createdAt: Date.now(),
      });
      setTimeout(() => inlineCache.delete(asKey), 30 * 60 * 1000);
      
      // Track in history
      addToHistory(userId, `as ${character}: ${question}`, "character");
      
      // Convert AI answer to Telegram HTML format
      const formattedAnswer = convertToTelegramHTML(answer);
      const escapedCharacter = escapeHTML(character);
      const escapedQuestion = escapeHTML(question);
      
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `char_${asKey}`,
          title: `🎭 ${character}: ${question.slice(0, 30)}`,
          description: answer.slice(0, 80),
          thumbnail_url: "https://img.icons8.com/fluency/96/theatre-mask.png",
          input_message_content: {
            message_text: `🎭 <b>${escapedCharacter}</b>\n\n❓ <i>${escapedQuestion}</i>\n\n${formattedAnswer}\n\n<i>via StarzAI • Character Mode • ${shortModel}</i>`,
            parse_mode: "HTML",
          },
          reply_markup: inlineAnswerKeyboard(asKey),
        },
      ], { cache_time: 0, is_personal: true });
    } catch (e) {
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `as_err_${sessionKey}`,
          title: "⚠️ Taking too long...",
          description: "Try again",
          thumbnail_url: "https://img.icons8.com/fluency/96/error.png",
          input_message_content: { message_text: "_" },
        },
      ], { cache_time: 0, is_personal: true });
    }
  }
  
  // "sum:" or "s:" (if not settings) - Summarize mode
  // Uses deferred response pattern: sends placeholder immediately, then edits with AI response
  if (qLower.startsWith("sum:") || qLower.startsWith("sum ")) {
    const textToSum = q.slice(4).trim();
    
    if (!textToSum) {
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `sum_typing_${sessionKey}`,
          title: "📝 Summarize",
          description: "Paste text to summarize",
          thumbnail_url: "https://img.icons8.com/fluency/96/summary.png",
          input_message_content: { message_text: "_" },
          reply_markup: new InlineKeyboard().switchInlineCurrent("← Back to Menu", ""),
        },
      ], { cache_time: 0, is_personal: true });
    }
    
    // Generate a unique key for this request
    const sumKey = makeId(6);
    
    // Store pending request - will be processed in chosen_inline_result
    inlineCache.set(`sum_pending_${sumKey}`, {
      prompt: textToSum,
      userId: String(userId),
      model,
      shortModel,
      createdAt: Date.now(),
    });
    setTimeout(() => inlineCache.delete(`sum_pending_${sumKey}`), 5 * 60 * 1000);
    
    // Return placeholder immediately - AI response will be edited in
    return safeAnswerInline(ctx, [
      {
        type: "article",
        id: `sum_start_${sumKey}`,
        title: `📝 Summarize`,
        description: "Tap to summarize text",
        thumbnail_url: "https://img.icons8.com/fluency/96/summary.png",
        input_message_content: {
          message_text: `📝 <b>Summary</b>\n\n⏳ <i>Summarizing...</i>\n\n<i>via StarzAI • Summarize • ${shortModel}</i>`,
          parse_mode: "HTML",
        },
        // IMPORTANT: Must include reply_markup to receive inline_message_id
        reply_markup: new InlineKeyboard().text("⏳ Loading...", "noop"),
      },
    ], { cache_time: 0, is_personal: true });
  }
  
  // "t:" or "t " - Tasks/Todo mode (manage your tasks inline)
  // Uses double-tap pattern: first tap toggles, second tap within 3s opens action menu
  if (qLower.startsWith("t:") || qLower.startsWith("t ")) {
    const subCommand = q.slice(2).trim();
    const userTodos = getUserTodos(userId);
    const filters = getTodoFilters(userId);
    const todos = userTodos.tasks || [];
    
    // t: or t (empty) - show task list
    if (!subCommand) {
      const taskCount = todos.length;
      const doneCount = todos.filter(t => t.completed).length;
      const pendingCount = taskCount - doneCount;
      
      if (taskCount === 0) {
        return safeAnswerInline(ctx, [
          {
            type: "article",
            id: `t_empty_${sessionKey}`,
            title: "📋 No Tasks Yet",
            description: "Type t:add <task> to create your first task",
            thumbnail_url: "https://img.icons8.com/fluency/96/todo-list.png",
            input_message_content: {
              message_text: "📋 <b>My Tasks</b>\n\n<i>No tasks yet!</i>\n\nAdd your first task:\n<code>t:add Buy groceries</code>\n\n<i>via StarzAI • Tasks</i>",
              parse_mode: "HTML",
            },
            reply_markup: new InlineKeyboard()
              .switchInlineCurrent("➕ Add Task", "t:add ")
              .row()
              .switchInlineCurrent("← Back", ""),
          },
        ], { cache_time: 0, is_personal: true });
      }
      
      // Build task list with toggle buttons
      const filteredTodos = filterTodos(todos, filters);
      const sortedTodos = sortTodos(filteredTodos, filters.sortBy || "created");
      const displayTodos = sortedTodos.slice(0, 8); // Show max 8 tasks inline
      
      // Compact title only - tasks are buttons
      const streak = getCompletionStreak(userId);
      let taskListText = `✅ <b>Starz Check</b>`;
      if (streak > 0) taskListText += ` 🔥${streak}`;
      
      // Build keyboard with task toggle buttons
      const keyboard = new InlineKeyboard();
      
      // Each task is its own button row - like tic-tac-toe!
      displayTodos.forEach((task) => {
        if (!task || !task.text) return; // Skip invalid tasks
        const icon = task.completed ? "✅" : "⬜";
        const text = task.text.slice(0, 28) + (task.text.length > 28 ? "..." : "");
        const catEmoji = getCategoryEmoji(task.category);
        const priInd = task.priority === "high" ? "🔴" : task.priority === "medium" ? "🟡" : "";
        const dueInd = task.dueDate && isOverdue(task.dueDate) && !task.completed ? "⚠️" : "";
        keyboard.text(`${icon} ${text} ${catEmoji}${priInd}${dueInd}`, `itodo_tap:${task.id}`);
        keyboard.row();
      });
      
      // Action buttons
      keyboard
        .switchInlineCurrent("➕", "t:add ")
        .text("🔍", "itodo_filter")
        .text("👥", "itodo_collab")
        .row()
        .text("← Back", "inline_main_menu");
      
      // Store session for double-tap detection
      const tKey = makeId(6);
      inlineCache.set(`t_session_${tKey}`, {
        userId: String(userId),
        lastTap: null,
        lastTaskId: null,
        createdAt: Date.now(),
      });
      setTimeout(() => inlineCache.delete(`t_session_${tKey}`), 30 * 60 * 1000);
      
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `t_list_${tKey}`,
          title: `📋 Tasks (${pendingCount} pending)`,
          description: displayTodos.slice(0, 3).map(t => (t.completed ? "✓ " : "○ ") + t.text.slice(0, 20)).join(" • "),
          thumbnail_url: "https://img.icons8.com/fluency/96/todo-list.png",
          input_message_content: {
            message_text: taskListText,
            parse_mode: "HTML",
          },
          reply_markup: keyboard,
        },
      ], { cache_time: 0, is_personal: true });
    }
    
    // t:add <task> - quick add task (deferred - adds on send and updates original message)
    if (subCommand.toLowerCase().startsWith("add ") || subCommand.toLowerCase() === "add") {
      const taskText = subCommand.slice(4).trim();
      
      if (!taskText) {
        return safeAnswerInline(ctx, [
          {
            type: "article",
            id: `t_add_hint_${sessionKey}`,
            title: "➕ Type your task...",
            description: "Example: Buy groceries #shopping !high @tomorrow",
            thumbnail_url: "https://img.icons8.com/fluency/96/plus.png",
            input_message_content: { message_text: "_" },
            reply_markup: new InlineKeyboard().switchInlineCurrent("← Back", "t: "),
          },
        ], { cache_time: 0, is_personal: true });
      }
      
      // Store pending task - will be added when chosen_inline_result fires
      const addKey = makeId(8);
      inlineCache.set(`tadd_pending_${addKey}`, {
        userId: String(userId),
        taskText,
        timestamp: Date.now(),
      });
      setTimeout(() => inlineCache.delete(`tadd_pending_${addKey}`), 5 * 60 * 1000);
      
      const parsed = parseTaskText(taskText);
      const categoryEmoji = getCategoryEmoji(parsed.category || 'personal');
      const priorityText = parsed.priority === "high" ? "🔴" : parsed.priority === "medium" ? "🟡" : "🟢";
      
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `tadd_${addKey}`,
          title: `➕ Add: ${parsed.text.slice(0, 35)}`,
          description: `${categoryEmoji} ${priorityText} Tap to add`,
          thumbnail_url: "https://img.icons8.com/fluency/96/checkmark.png",
          input_message_content: {
            message_text: `✅ Added: ${escapeHTML(parsed.text)}`,
            parse_mode: "HTML",
          },
        },
      ], { cache_time: 0, is_personal: true });
    }
    
    // t:stats - show statistics
    if (subCommand.toLowerCase() === "stats") {
      const stats = getTodoStats(userId);
      
      const statsText = [
        `📊 <b>Task Statistics</b>`,
        ``,
        `📋 Total tasks: ${stats.total}`,
        `✅ Completed: ${stats.completed}`,
        `⬜ Pending: ${stats.pending}`,
        `📈 Completion rate: ${stats.completionRate}%`,
        ``,
        `🔥 Current streak: ${stats.streak} days`,
        `🏆 Best streak: ${stats.bestStreak} days`,
        ``,
        `<i>via StarzAI • Tasks</i>`,
      ].join("\n");
      
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `t_stats_${sessionKey}`,
          title: `📊 Stats: ${stats.completed}/${stats.total} done`,
          description: `${stats.completionRate}% complete • ${stats.streak} day streak`,
          thumbnail_url: "https://img.icons8.com/fluency/96/statistics.png",
          input_message_content: {
            message_text: statsText,
            parse_mode: "HTML",
          },
          reply_markup: new InlineKeyboard()
            .switchInlineCurrent("📋 View Tasks", "t: ")
            .switchInlineCurrent("← Back", ""),
        },
      ], { cache_time: 0, is_personal: true });
    }
    
    // t:done or t:clear - clear completed tasks
    if (subCommand.toLowerCase() === "done" || subCommand.toLowerCase() === "clear") {
      const cleared = clearCompletedTasks(userId);
      
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `t_cleared_${sessionKey}`,
          title: `🗑️ Cleared ${cleared} completed tasks`,
          description: "Completed tasks removed",
          thumbnail_url: "https://img.icons8.com/fluency/96/trash.png",
          input_message_content: {
            message_text: `🗑️ <b>Cleared ${cleared} completed task${cleared !== 1 ? "s" : ""}!</b>\n\n<i>via StarzAI • Tasks</i>`,
            parse_mode: "HTML",
          },
          reply_markup: new InlineKeyboard()
            .switchInlineCurrent("📋 View Tasks", "t: ")
            .switchInlineCurrent("← Back", ""),
        },
      ], { cache_time: 0, is_personal: true });
    }
    
    // t:<number> - toggle specific task by number
    const taskNum = parseInt(subCommand);
    if (!isNaN(taskNum) && taskNum > 0) {
      const sortedTodos = sortTodos(todos, filters.sortBy || "created");
      const task = sortedTodos[taskNum - 1];
      
      if (!task) {
        return safeAnswerInline(ctx, [
          {
            type: "article",
            id: `t_notfound_${sessionKey}`,
            title: `⚠️ Task #${taskNum} not found`,
            description: "Invalid task number",
            thumbnail_url: "https://img.icons8.com/fluency/96/error.png",
            input_message_content: { message_text: "_" },
            reply_markup: new InlineKeyboard().switchInlineCurrent("📋 View Tasks", "t: "),
          },
        ], { cache_time: 0, is_personal: true });
      }
      
      // Show task action menu
      const checkbox = task.completed ? "✅" : "⬜";
      const categoryEmoji = getCategoryEmoji(task.category);
      
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `t_task_${makeId(6)}`,
          title: `${checkbox} ${task.text.slice(0, 35)}`,
          description: "Tap to send task with action buttons",
          thumbnail_url: "https://img.icons8.com/fluency/96/todo-list.png",
          input_message_content: {
            message_text: `${checkbox} <b>Task #${taskNum}</b>\n\n${escapeHTML(task.text)}\n\n${categoryEmoji} ${escapeHTML(task.category || "personal")}\n\n<i>via StarzAI • Tasks</i>`,
            parse_mode: "HTML",
          },
          reply_markup: new InlineKeyboard()
            .text(task.completed ? "⬜ Uncomplete" : "✅ Complete", `itodo_toggle:${task.id}`)
            .text("🗑️ Delete", `itodo_delete:${task.id}`)
            .row()
            .text("✏️ Edit", `itodo_edit:${task.id}`)
            .row()
            .switchInlineCurrent("📋 Back to Tasks", "t: "),
        },
      ], { cache_time: 0, is_personal: true });
    }
    
    // Unknown subcommand - show help
    return safeAnswerInline(ctx, [
      {
        type: "article",
        id: `t_help_${sessionKey}`,
        title: "📋 Tasks Help",
        description: "t: list • t:add <task> • t:stats • t:<#>",
        thumbnail_url: "https://img.icons8.com/fluency/96/help.png",
        input_message_content: {
          message_text: `📋 <b>Tasks Help</b>\n\n<code>t:</code> - View task list\n<code>t:add Buy milk</code> - Add task\n<code>t:add Task #work !high @tomorrow</code> - Quick add with options\n<code>t:1</code> - View/edit task #1\n<code>t:stats</code> - View statistics\n<code>t:clear</code> - Clear completed\n\n<i>via StarzAI • Tasks</i>`,
          parse_mode: "HTML",
        },
        reply_markup: new InlineKeyboard()
          .switchInlineCurrent("📋 View Tasks", "t: ")
          .switchInlineCurrent("← Back", ""),
      },
    ], { cache_time: 0, is_personal: true });
  }
  
  // "sc:" or "sc " - Starz Check Personal mode (alias for t:)
  if (qLower.startsWith("sc:") || qLower.startsWith("sc ")) {
    const subCommand = q.slice(3).trim();
    const todos = getUserTodos(userId);
    const filters = getTodoFilters(userId);
    
    // sc: or sc (empty) - show personal task list
    if (!subCommand) {
      const taskCount = todos.tasks?.length || 0;
      const doneCount = (todos.tasks || []).filter(t => t.completed).length;
      const pendingCount = taskCount - doneCount;
      
      if (taskCount === 0) {
        return safeAnswerInline(ctx, [
          {
            type: "article",
            id: `sc_empty_${sessionKey}`,
            title: "📋 No Personal Tasks Yet",
            description: "Type sc:add <task> to create your first task",
            thumbnail_url: "https://img.icons8.com/fluency/96/todo-list.png",
            input_message_content: {
              message_text: "📋 <b>Starz Check - Personal</b>\n\n<i>No tasks yet!</i>\n\nAdd your first task:\n<code>sc:add Buy groceries</code>\n\n<i>via StarzAI • Starz Check</i>",
              parse_mode: "HTML",
            },
            reply_markup: new InlineKeyboard()
              .switchInlineCurrent("➕ Add Task", "sc:add ")
              .row()
              .switchInlineCurrent("👥 Collab Lists", "ct: ")
              .switchInlineCurrent("← Back", ""),
          },
        ], { cache_time: 0, is_personal: true });
      }
      
      // Build task list with each task as a clickable button row (like tic-tac-toe)
      const filteredTodos = filterTodos(todos.tasks || [], filters);
      const sortedTodos = sortTodos(filteredTodos, filters.sortBy || "created");
      const displayTodos = sortedTodos.slice(0, 6); // Limit to 6 for button space
      
      // Minimal text - just a compact title
      const streak = getCompletionStreak(userId);
      let taskListText = `✅ <b>Starz Check</b>`;
      if (streak > 0) taskListText += ` 🔥${streak}`;
      
      const keyboard = new InlineKeyboard();
      
      // Each task is its own button row - like tic-tac-toe!
      displayTodos.forEach((task) => {
        if (!task || !task.text) return; // Skip invalid tasks
        const icon = task.completed ? "✅" : "⬜";
        const text = task.text.slice(0, 28) + (task.text.length > 28 ? "..." : "");
        const categoryEmoji = getCategoryEmoji(task.category);
        const priorityIndicator = task.priority === "high" ? "🔴" : task.priority === "medium" ? "🟡" : "";
        const dueIndicator = task.dueDate && isOverdue(task.dueDate) && !task.completed ? "⚠️" : "";
        
        keyboard.text(`${icon} ${text} ${categoryEmoji}${priorityIndicator}${dueIndicator}`, `itodo_tap:${task.id}`);
        keyboard.row();
      });
      
      keyboard
        .switchInlineCurrent("➕", "sc:add ")
        .text("🔍", "itodo_filter")
        .text("👥", "itodo_collab")
        .row()
        .text("← Back", "inline_main_menu");
      
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `sc_list_${makeId(6)}`,
          title: `📋 Personal Tasks (${pendingCount} pending)`,
          description: displayTodos.slice(0, 3).map(t => (t.completed ? "✓ " : "○ ") + t.text.slice(0, 20)).join(" • "),
          thumbnail_url: "https://img.icons8.com/fluency/96/todo-list.png",
          input_message_content: {
            message_text: taskListText,
            parse_mode: "HTML",
          },
          reply_markup: keyboard,
        },
      ], { cache_time: 0, is_personal: true });
    }
    
    // sc:add <task> - quick add task (deferred - adds on send and updates original message)
    if (subCommand.toLowerCase().startsWith("add ") || subCommand.toLowerCase() === "add") {
      const taskText = subCommand.slice(4).trim();
      
      if (!taskText) {
        return safeAnswerInline(ctx, [
          {
            type: "article",
            id: `sc_add_help_${sessionKey}`,
            title: "➕ Type your task...",
            description: "Example: Buy groceries #shopping !high @tomorrow",
            thumbnail_url: "https://img.icons8.com/fluency/96/add.png",
            input_message_content: { message_text: "_" },
            reply_markup: new InlineKeyboard().switchInlineCurrent("← Back", "sc: "),
          },
        ], { cache_time: 0, is_personal: true });
      }
      
      // Store pending task - will be added when chosen_inline_result fires
      const addKey = makeId(8);
      inlineCache.set(`tadd_pending_${addKey}`, {
        userId: String(userId),
        taskText,
        timestamp: Date.now(),
      });
      setTimeout(() => inlineCache.delete(`tadd_pending_${addKey}`), 5 * 60 * 1000);
      
      const parsed = parseTaskText(taskText);
      const categoryEmoji = getCategoryEmoji(parsed.category || 'personal');
      const priorityText = parsed.priority === "high" ? "🔴" : parsed.priority === "medium" ? "🟡" : "🟢";
      
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `tadd_${addKey}`,
          title: `➕ Add: ${parsed.text.slice(0, 35)}`,
          description: `${categoryEmoji} ${priorityText} Tap to add`,
          thumbnail_url: "https://img.icons8.com/fluency/96/checkmark.png",
          input_message_content: {
            message_text: `✅ Added: ${escapeHTML(parsed.text)}`,
            parse_mode: "HTML",
          },
        },
      ], { cache_time: 0, is_personal: true });
    }
    
    // sc:edit <taskId> <newText> - edit a task
    if (subCommand.toLowerCase().startsWith("edit ")) {
      const editParts = subCommand.slice(5).trim().split(" ");
      const taskId = editParts[0];
      const newText = editParts.slice(1).join(" ").trim();
      
      if (!taskId) {
        return safeAnswerInline(ctx, [
          {
            type: "article",
            id: `sc_edit_help_${sessionKey}`,
            title: "✏️ Edit Task",
            description: "sc:edit <taskId> New task text",
            thumbnail_url: "https://img.icons8.com/fluency/96/edit.png",
            input_message_content: { message_text: "_" },
            reply_markup: new InlineKeyboard().switchInlineCurrent("← Back", "sc: "),
          },
        ], { cache_time: 0, is_personal: true });
      }
      
      const task = getTaskById(userId, taskId);
      if (!task) {
        return safeAnswerInline(ctx, [
          {
            type: "article",
            id: `sc_edit_notfound_${sessionKey}`,
            title: "⚠️ Task Not Found",
            description: "The task you're trying to edit doesn't exist",
            thumbnail_url: "https://img.icons8.com/fluency/96/error.png",
            input_message_content: {
              message_text: `⚠️ <b>Task Not Found</b>\n\nThe task with ID <code>${escapeHTML(taskId)}</code> doesn't exist.\n\n<i>via StarzAI • Starz Check</i>`,
              parse_mode: "HTML",
            },
            reply_markup: new InlineKeyboard().switchInlineCurrent("📋 View Tasks", "sc: "),
          },
        ], { cache_time: 0, is_personal: true });
      }
      
      if (!newText) {
        // Show current task and prompt for new text
        return safeAnswerInline(ctx, [
          {
            type: "article",
            id: `sc_edit_prompt_${sessionKey}`,
            title: `✏️ Edit: ${task.text.slice(0, 30)}`,
            description: "Type the new text after the task ID",
            thumbnail_url: "https://img.icons8.com/fluency/96/edit.png",
            input_message_content: {
              message_text: `✏️ <b>Editing Task</b>\n\nCurrent: ${escapeHTML(task.text)}\n\nType your new text after the task ID\n\n<i>via StarzAI • Starz Check</i>`,
              parse_mode: "HTML",
            },
            reply_markup: new InlineKeyboard().switchInlineCurrent("← Back", "sc: "),
          },
        ], { cache_time: 0, is_personal: true });
      }
      
      // Store pending edit - will be applied when chosen_inline_result fires
      const editKey = makeId(8);
      inlineCache.set(`tedit_pending_${editKey}`, {
        userId: String(userId),
        taskId,
        newText,
        timestamp: Date.now(),
      });
      setTimeout(() => inlineCache.delete(`tedit_pending_${editKey}`), 5 * 60 * 1000);
      
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `tedit_${editKey}`,
          title: `✅ Update to: ${newText.slice(0, 30)}`,
          description: `Tap to save changes`,
          thumbnail_url: "https://img.icons8.com/fluency/96/checkmark.png",
          input_message_content: {
            message_text: `✅ Updated: ${escapeHTML(newText)}`,
            parse_mode: "HTML",
          },
        },
      ], { cache_time: 0, is_personal: true });
    }
    
    // sc:stats - show statistics
    if (subCommand.toLowerCase() === "stats") {
      const userTodos = getUserTodos(userId);
      const stats = userTodos.stats || { totalCreated: 0, totalCompleted: 0, currentStreak: 0, longestStreak: 0 };
      const tasks = userTodos.tasks || [];
      
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(t => t.completed).length;
      const pendingTasks = totalTasks - completedTasks;
      const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      
      const statsText = [
        "📊 <b>Starz Check - Personal Stats</b>",
        "",
        `📋 Total Tasks: ${totalTasks}`,
        `✅ Completed: ${completedTasks}`,
        `⏳ Pending: ${pendingTasks}`,
        `📈 Completion Rate: ${completionRate}%`,
        "",
        `🔥 Current Streak: ${stats.currentStreak} day${stats.currentStreak !== 1 ? "s" : ""}`,
        `🏆 Longest Streak: ${stats.longestStreak} day${stats.longestStreak !== 1 ? "s" : ""}`,
        `📅 All-time Completed: ${stats.totalCompleted}`,
        "",
        "<i>via StarzAI • Starz Check</i>",
      ].join("\n");
      
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `sc_stats_${sessionKey}`,
          title: "📊 Personal Task Statistics",
          description: `${completedTasks}/${totalTasks} done • 🔥 ${stats.currentStreak} day streak`,
          thumbnail_url: "https://img.icons8.com/fluency/96/statistics.png",
          input_message_content: {
            message_text: statsText,
            parse_mode: "HTML",
          },
          reply_markup: new InlineKeyboard()
            .switchInlineCurrent("📋 View Tasks", "sc: ")
            .switchInlineCurrent("← Back", ""),
        },
      ], { cache_time: 0, is_personal: true });
    }
    
    // Unknown - show help
    return safeAnswerInline(ctx, [
      {
        type: "article",
        id: `sc_help_${sessionKey}`,
        title: "📋 Starz Check - Personal Help",
        description: "sc: list • sc:add <task> • sc:stats",
        thumbnail_url: "https://img.icons8.com/fluency/96/help.png",
        input_message_content: {
          message_text: `📋 <b>Starz Check - Personal Help</b>\n\n<code>sc:</code> - View task list\n<code>sc:add Buy milk</code> - Add task\n<code>sc:add Task #work !high @tomorrow</code> - Quick add with options\n<code>sc:stats</code> - View statistics\n\n<i>via StarzAI • Starz Check</i>`,
          parse_mode: "HTML",
        },
        reply_markup: new InlineKeyboard()
          .switchInlineCurrent("📋 View Tasks", "sc: ")
          .switchInlineCurrent("← Back", ""),
      },
    ], { cache_time: 0, is_personal: true });
  }
  
  // "ct:" or "ct " - Collaborative Todo mode
  if (qLower.startsWith("ct:") || qLower.startsWith("ct ")) {
    const subCommand = q.slice(3).trim();
    const userLists = getCollabListsForUser(userId);
    
    // ct: or ct (empty) - show user's collaborative lists
    if (!subCommand) {
      if (userLists.length === 0) {
        return safeAnswerInline(ctx, [
          {
            type: "article",
            id: `ct_empty_${sessionKey}`,
            title: "👥 No Collaborative Lists Yet",
            description: "Create a new list or join one with a code",
            thumbnail_url: "https://img.icons8.com/fluency/96/conference-call.png",
            input_message_content: {
              message_text: "👥 <b>Starz Check - Collaborative</b>\n\n<i>No shared lists yet!</i>\n\nCreate a new list:\n<code>ct:new Party Planning</code>\n\nOr join with a code:\n<code>ct:join ABC123</code>\n\n<i>via StarzAI • Starz Check</i>",
              parse_mode: "HTML",
            },
            reply_markup: new InlineKeyboard()
              .switchInlineCurrent("➕ Create List", "ct:new ")
              .switchInlineCurrent("🔗 Join List", "ct:join ")
              .row()
              .switchInlineCurrent("📋 Personal", "sc: ")
              .switchInlineCurrent("← Back", ""),
          },
        ], { cache_time: 0, is_personal: true });
      }
      
      // Show list of collaborative lists
      const results = userLists.slice(0, 10).map((list, idx) => {
        const pendingCount = list.tasks.filter(t => !t.completed).length;
        const doneCount = list.tasks.filter(t => t.completed).length;
        const memberCount = list.members.length;
        const isOwner = list.ownerId === String(userId);
        
        let listText = `👥 <b>${escapeHTML(list.name)}</b>${isOwner ? " 👑" : ""}\n\n`;
        listText += `📊 ${pendingCount} pending • ${doneCount} done • ${memberCount} members\n`;
        listText += `🔑 Join code: <code>${list.joinCode}</code>\n\n`;
        
        if (list.tasks.length === 0) {
          listText += `<i>No tasks yet!</i>\n`;
        } else {
          const displayTasks = list.tasks.slice(0, 5);
          displayTasks.forEach((task, i) => {
            const checkbox = task.completed ? "✅" : "⬜";
            const text = task.completed ? `<s>${escapeHTML(task.text)}</s>` : escapeHTML(task.text);
            listText += `${checkbox} ${i + 1}. ${text}\n`;
          });
          if (list.tasks.length > 5) {
            listText += `<i>+${list.tasks.length - 5} more...</i>\n`;
          }
        }
        
        listText += `\n<i>Tap task to toggle • Tap again for options</i>`;
        
        const keyboard = new InlineKeyboard();
        
        const displayTasks = list.tasks.slice(0, 6);
        for (let i = 0; i < displayTasks.length; i += 2) {
          const task1 = displayTasks[i];
          const icon1 = task1.completed ? "✅" : "⬜";
          keyboard.text(`${icon1} ${i + 1}`, `ct_tap:${list.id}:${task1.id}`);
          
          if (displayTasks[i + 1]) {
            const task2 = displayTasks[i + 1];
            const icon2 = task2.completed ? "✅" : "⬜";
            keyboard.text(`${icon2} ${i + 2}`, `ct_tap:${list.id}:${task2.id}`);
          }
          keyboard.row();
        }
        
        keyboard
          .text("➕ Add", `ct_add:${list.id}`)
          .text("🗑️ Clear", `ct_clear:${list.id}`)
          .row()
          .text("👥 Members", `ct_members:${list.id}`)
          .text("🔗 Share", `ct_share:${list.id}`)
          .row()
          .switchInlineCurrent("← My Lists", "ct: ");
        
        return {
          type: "article",
          id: `ct_list_${list.id}_${makeId(4)}`,
          title: `👥 ${list.name}${isOwner ? " 👑" : ""}`,
          description: `${pendingCount} pending • ${memberCount} members • Code: ${list.joinCode}`,
          thumbnail_url: "https://img.icons8.com/fluency/96/conference-call.png",
          input_message_content: {
            message_text: listText,
            parse_mode: "HTML",
          },
          reply_markup: keyboard,
        };
      });
      
      // Add create/join options at the end
      results.push({
        type: "article",
        id: `ct_create_${sessionKey}`,
        title: "➕ Create New List",
        description: "Start a new collaborative checklist",
        thumbnail_url: "https://img.icons8.com/fluency/96/add.png",
        input_message_content: { message_text: "_" },
        reply_markup: new InlineKeyboard().switchInlineCurrent("➕ Create", "ct:new "),
      });
      
      results.push({
        type: "article",
        id: `ct_join_${sessionKey}`,
        title: "🔗 Join Existing List",
        description: "Enter a join code to join a shared list",
        thumbnail_url: "https://img.icons8.com/fluency/96/link.png",
        input_message_content: { message_text: "_" },
        reply_markup: new InlineKeyboard().switchInlineCurrent("🔗 Join", "ct:join "),
      });
      
      return safeAnswerInline(ctx, results, { cache_time: 0, is_personal: true });
    }
    
    // ct:new <name> - create new collaborative list
    if (subCommand.toLowerCase().startsWith("new ") || subCommand.toLowerCase() === "new") {
      const listName = subCommand.slice(4).trim();
      
      if (!listName) {
        return safeAnswerInline(ctx, [
          {
            type: "article",
            id: `ct_new_help_${sessionKey}`,
            title: "➕ Create Collaborative List",
            description: "ct:new Party Planning",
            thumbnail_url: "https://img.icons8.com/fluency/96/add.png",
            input_message_content: { message_text: "_" },
            reply_markup: new InlineKeyboard().switchInlineCurrent("← Back", "ct: "),
          },
        ], { cache_time: 0, is_personal: true });
      }
      
      const newList = createCollabList(userId, listName);
      
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `ct_created_${newList.id}`,
          title: `✅ Created: ${listName}`,
          description: `Share code: ${newList.joinCode}`,
          thumbnail_url: "https://img.icons8.com/fluency/96/checkmark.png",
          input_message_content: {
            message_text: `✅ <b>List Created!</b>\n\n👥 <b>${escapeHTML(listName)}</b>\n\n🔑 Share this code with others:\n<code>${newList.joinCode}</code>\n\nThey can join with:\n<code>ct:join ${newList.joinCode}</code>\n\n<i>via StarzAI • Starz Check</i>`,
            parse_mode: "HTML",
          },
          reply_markup: new InlineKeyboard()
            .switchInlineCurrent("📋 View List", `ct:open ${newList.id}`)
            .text("🔗 Share", `ct_share:${newList.id}`)
            .row()
            .switchInlineCurrent("← My Lists", "ct: "),
        },
      ], { cache_time: 0, is_personal: true });
    }
    
    // ct:join <code> - join a collaborative list
    if (subCommand.toLowerCase().startsWith("join ") || subCommand.toLowerCase() === "join") {
      const joinCode = subCommand.slice(5).trim().toUpperCase();
      
      if (!joinCode) {
        return safeAnswerInline(ctx, [
          {
            type: "article",
            id: `ct_join_help_${sessionKey}`,
            title: "🔗 Join Collaborative List",
            description: "ct:join ABC123",
            thumbnail_url: "https://img.icons8.com/fluency/96/link.png",
            input_message_content: { message_text: "_" },
            reply_markup: new InlineKeyboard().switchInlineCurrent("← Back", "ct: "),
          },
        ], { cache_time: 0, is_personal: true });
      }
      
      const result = joinCollabList(userId, joinCode, ctx.from?.username);
      
      if (!result.success) {
        if (result.error === "Already a member") {
          return safeAnswerInline(ctx, [
            {
              type: "article",
              id: `ct_already_${sessionKey}`,
              title: `📋 Already a member of ${result.list?.name || "this list"}`,
              description: "You're already in this list!",
              thumbnail_url: "https://img.icons8.com/fluency/96/info.png",
              input_message_content: {
                message_text: `ℹ️ <b>Already a Member!</b>\n\nYou're already in <b>${escapeHTML(result.list?.name || "this list")}</b>\n\n<i>via StarzAI • Starz Check</i>`,
                parse_mode: "HTML",
              },
              reply_markup: new InlineKeyboard()
                .switchInlineCurrent("📋 View List", `ct:open ${result.list?.id}`)
                .switchInlineCurrent("← My Lists", "ct: "),
            },
          ], { cache_time: 0, is_personal: true });
        }
        
        return safeAnswerInline(ctx, [
          {
            type: "article",
            id: `ct_notfound_${sessionKey}`,
            title: "⚠️ List Not Found",
            description: "Check the code and try again",
            thumbnail_url: "https://img.icons8.com/fluency/96/error.png",
            input_message_content: {
              message_text: `⚠️ <b>List Not Found</b>\n\nNo list found with code: <code>${escapeHTML(joinCode)}</code>\n\nCheck the code and try again.\n\n<i>via StarzAI • Starz Check</i>`,
              parse_mode: "HTML",
            },
            reply_markup: new InlineKeyboard()
              .switchInlineCurrent("🔗 Try Again", "ct:join ")
              .switchInlineCurrent("← Back", "ct: "),
          },
        ], { cache_time: 0, is_personal: true });
      }
      
      const list = result.list;
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `ct_joined_${list.id}`,
          title: `✅ Joined: ${list.name}`,
          description: `${list.members.length} members • ${list.tasks.length} tasks`,
          thumbnail_url: "https://img.icons8.com/fluency/96/checkmark.png",
          input_message_content: {
            message_text: `✅ <b>Joined Successfully!</b>\n\n👥 <b>${escapeHTML(list.name)}</b>\n\n👤 ${list.members.length} members\n📋 ${list.tasks.length} tasks\n\n<i>via StarzAI • Starz Check</i>`,
            parse_mode: "HTML",
          },
          reply_markup: new InlineKeyboard()
            .switchInlineCurrent("📋 View List", `ct:open ${list.id}`)
            .switchInlineCurrent("← My Lists", "ct: "),
        },
      ], { cache_time: 0, is_personal: true });
    }
    
    // ct:open <listId> - open a specific list
    if (subCommand.toLowerCase().startsWith("open ")) {
      const listId = subCommand.slice(5).trim();
      const list = getCollabList(listId);
      
      if (!list) {
        return safeAnswerInline(ctx, [
          {
            type: "article",
            id: `ct_notfound_${sessionKey}`,
            title: "⚠️ List Not Found",
            description: "This list may have been deleted",
            thumbnail_url: "https://img.icons8.com/fluency/96/error.png",
            input_message_content: { message_text: "_" },
            reply_markup: new InlineKeyboard().switchInlineCurrent("← My Lists", "ct: "),
          },
        ], { cache_time: 0, is_personal: true });
      }
      
      // Check if user is a member
      if (!list.members.some(m => m.userId === String(userId))) {
        return safeAnswerInline(ctx, [
          {
            type: "article",
            id: `ct_notmember_${sessionKey}`,
            title: "⚠️ Not a Member",
            description: "You're not a member of this list",
            thumbnail_url: "https://img.icons8.com/fluency/96/error.png",
            input_message_content: { message_text: "_" },
            reply_markup: new InlineKeyboard()
              .switchInlineCurrent("🔗 Join", `ct:join ${list.joinCode}`)
              .switchInlineCurrent("← Back", "ct: "),
          },
        ], { cache_time: 0, is_personal: true });
      }
      
      const pendingCount = list.tasks.filter(t => !t.completed).length;
      const doneCount = list.tasks.filter(t => t.completed).length;
      const isOwner = list.ownerId === String(userId);
      
      let listText = `👥 <b>${escapeHTML(list.name)}</b>${isOwner ? " 👑" : ""}\n\n`;
      listText += `📊 ${pendingCount} pending • ${doneCount} done • ${list.members.length} members\n`;
      listText += `🔑 Join code: <code>${list.joinCode}</code>\n\n`;
      
      if (list.tasks.length === 0) {
        listText += `<i>No tasks yet! Add one below.</i>\n`;
      } else {
        const displayTasks = list.tasks.slice(0, 8);
        displayTasks.forEach((task, i) => {
          const checkbox = task.completed ? "✅" : "⬜";
          const text = task.completed ? `<s>${escapeHTML(task.text)}</s>` : escapeHTML(task.text);
          const priorityIndicator = task.priority === "high" ? " 🔴" : task.priority === "medium" ? " 🟡" : "";
          
          let completedByText = "";
          if (task.completed && task.completedBy && list.settings.showCompletedBy) {
            const completer = task.completedBy.username || `User ${task.completedBy.userId.slice(-4)}`;
            completedByText = ` <i>by ${escapeHTML(completer)}</i>`;
          }
          
          listText += `${checkbox} ${i + 1}. ${text}${priorityIndicator}${completedByText}\n`;
        });
        
        if (list.tasks.length > 8) {
          listText += `\n<i>+${list.tasks.length - 8} more tasks...</i>\n`;
        }
      }
      
      listText += `\n<i>Tap task to toggle • Tap again for options</i>`;
      
      const keyboard = new InlineKeyboard();
      
      const displayTasks = list.tasks.slice(0, 6);
      for (let i = 0; i < displayTasks.length; i += 2) {
        const task1 = displayTasks[i];
        const icon1 = task1.completed ? "✅" : "⬜";
        keyboard.text(`${icon1} ${i + 1}`, `ct_tap:${list.id}:${task1.id}`);
        
        if (displayTasks[i + 1]) {
          const task2 = displayTasks[i + 1];
          const icon2 = task2.completed ? "✅" : "⬜";
          keyboard.text(`${icon2} ${i + 2}`, `ct_tap:${list.id}:${task2.id}`);
        }
        keyboard.row();
      }
      
      keyboard
        .text("➕ Add", `ct_add:${list.id}`)
        .text("🗑️ Clear", `ct_clear:${list.id}`)
        .row()
        .text("👥 Members", `ct_members:${list.id}`)
        .text("🔗 Share", `ct_share:${list.id}`)
        .row()
        .switchInlineCurrent("🔄 Refresh", `ct:open ${list.id}`)
        .switchInlineCurrent("← My Lists", "ct: ");
      
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `ct_view_${list.id}_${makeId(4)}`,
          title: `👥 ${list.name}${isOwner ? " 👑" : ""}`,
          description: `${pendingCount} pending • ${list.members.length} members`,
          thumbnail_url: "https://img.icons8.com/fluency/96/conference-call.png",
          input_message_content: {
            message_text: listText,
            parse_mode: "HTML",
          },
          reply_markup: keyboard,
        },
      ], { cache_time: 0, is_personal: true });
    }
    
    // ct:add <listId> <task> - add task to collaborative list
    if (subCommand.toLowerCase().startsWith("add:")) {
      const parts = subCommand.slice(4).split(" ");
      const listId = parts[0];
      const taskText = parts.slice(1).join(" ").trim();
      
      const list = getCollabList(listId);
      if (!list) {
        return safeAnswerInline(ctx, [
          {
            type: "article",
            id: `ct_notfound_${sessionKey}`,
            title: "⚠️ List Not Found",
            description: "This list may have been deleted",
            thumbnail_url: "https://img.icons8.com/fluency/96/error.png",
            input_message_content: { message_text: "_" },
            reply_markup: new InlineKeyboard().switchInlineCurrent("← My Lists", "ct: "),
          },
        ], { cache_time: 0, is_personal: true });
      }
      
      if (!taskText) {
        return safeAnswerInline(ctx, [
          {
            type: "article",
            id: `ct_addhelp_${sessionKey}`,
            title: `➕ Add Task to ${list.name}`,
            description: "Type your task after the list ID",
            thumbnail_url: "https://img.icons8.com/fluency/96/add.png",
            input_message_content: { message_text: "_" },
            reply_markup: new InlineKeyboard().switchInlineCurrent("← Back", `ct:open ${listId}`),
          },
        ], { cache_time: 0, is_personal: true });
      }
      
      const parsed = parseTaskText(taskText);
      const newTask = addCollabTask(userId, listId, parsed, ctx.from?.username);
      
      if (!newTask) {
        return safeAnswerInline(ctx, [
          {
            type: "article",
            id: `ct_addfail_${sessionKey}`,
            title: "⚠️ Could not add task",
            description: "You may not be a member of this list",
            thumbnail_url: "https://img.icons8.com/fluency/96/error.png",
            input_message_content: { message_text: "_" },
            reply_markup: new InlineKeyboard().switchInlineCurrent("← My Lists", "ct: "),
          },
        ], { cache_time: 0, is_personal: true });
      }
      
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `ct_added_${newTask.id}`,
          title: `✅ Task Added to ${list.name}`,
          description: parsed.text.slice(0, 40),
          thumbnail_url: "https://img.icons8.com/fluency/96/checkmark.png",
          input_message_content: {
            message_text: `✅ <b>Task Added!</b>\n\n👥 <b>${escapeHTML(list.name)}</b>\n\n⬜ ${escapeHTML(parsed.text)}\n\n<i>via StarzAI • Starz Check</i>`,
            parse_mode: "HTML",
          },
          reply_markup: new InlineKeyboard()
            .switchInlineCurrent("📋 View List", `ct:open ${listId}`)
            .switchInlineCurrent("← My Lists", "ct: "),
        },
      ], { cache_time: 0, is_personal: true });
    }
    
    // Unknown - show help
    return safeAnswerInline(ctx, [
      {
        type: "article",
        id: `ct_help_${sessionKey}`,
        title: "👥 Starz Check - Collab Help",
        description: "ct: lists • ct:new <name> • ct:join <code>",
        thumbnail_url: "https://img.icons8.com/fluency/96/help.png",
        input_message_content: {
          message_text: `👥 <b>Starz Check - Collab Help</b>\n\n<code>ct:</code> - View your shared lists\n<code>ct:new Party Planning</code> - Create new list\n<code>ct:join ABC123</code> - Join with code\n<code>ct:open [id]</code> - Open specific list\n\n<i>via StarzAI • Starz Check</i>`,
          parse_mode: "HTML",
        },
        reply_markup: new InlineKeyboard()
          .switchInlineCurrent("👥 My Lists", "ct: ")
          .switchInlineCurrent("← Back", ""),
      },
    ], { cache_time: 0, is_personal: true });
  }
  
  // "p:" or "p " - Partner mode (chat with your AI partner)
  // Uses deferred response pattern: sends placeholder immediately, then edits with AI response
  if (qLower.startsWith("p:") || qLower.startsWith("p ")) {
    const message = q.slice(2).trim();
    const partner = getPartner(userId);
    
    if (!partner?.name) {
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `p_nopartner_${sessionKey}`,
          title: "🤝🏻 No Partner Set Up",
          description: "Use /partner in bot DM to create your AI companion",
          thumbnail_url: "https://img.icons8.com/fluency/96/heart.png",
          input_message_content: { 
            message_text: "🤝🏻 *Set up your Partner first!*\n\nGo to @starztechbot DM and use:\n\n\`/partner name [name]\`\n\`/partner personality [traits]\`\n\`/partner background [story]\`\n\`/partner style [how they talk]\`\n\nThen come back and chat!",
            parse_mode: "Markdown"
          },
        },
      ], { cache_time: 0, is_personal: true });
    }
    
    if (!message) {
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `p_typing_${sessionKey}`,
          title: `🤝🏻 Chat with ${partner.name}`,
          description: "Type your message to your partner",
          thumbnail_url: "https://img.icons8.com/fluency/96/heart.png",
          input_message_content: { message_text: "_" },
          reply_markup: new InlineKeyboard().switchInlineCurrent("← Back to Menu", ""),
        },
      ], { cache_time: 0, is_personal: true });
    }
    
    // Generate a unique key for this request
    const pKey = makeId(6);
    const escapedPartnerName = escapeHTML(partner.name);
    
    // Store pending request - will be processed in chosen_inline_result
    inlineCache.set(`p_pending_${pKey}`, {
      prompt: message,
      userId: String(userId),
      model,
      shortModel,
      partner,
      createdAt: Date.now(),
    });
    setTimeout(() => inlineCache.delete(`p_pending_${pKey}`), 5 * 60 * 1000);
    
    // Return placeholder immediately - AI response will be edited in
    return safeAnswerInline(ctx, [
      {
        type: "article",
        id: `p_start_${pKey}`,
        title: `🤝🏻 ${partner.name}: ${message.slice(0, 30)}`,
        description: "Tap to chat with your partner",
        thumbnail_url: "https://img.icons8.com/fluency/96/heart.png",
        input_message_content: {
          message_text: `🤝🏻 <b>${escapedPartnerName}</b>\n\n⏳ <i>${partner.name} is thinking...</i>\n\n<i>via StarzAI • Partner • ${shortModel}</i>`,
          parse_mode: "HTML",
        },
        // IMPORTANT: Must include reply_markup to receive inline_message_id
        reply_markup: new InlineKeyboard().text("⏳ Loading...", "noop"),
      },
    ], { cache_time: 0, is_personal: true });
  }
  
  // "r " or "r:" - Research shortcut
  // Uses deferred response pattern: sends placeholder immediately, then edits with AI response
  if (qLower.startsWith("r ") || qLower.startsWith("r:")) {
    const topic = q.slice(2).trim();
    
    if (!topic) {
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `r_typing_${sessionKey}`,
          title: "🔍 Research",
          description: "Type your research topic...",
          thumbnail_url: "https://img.icons8.com/fluency/96/search.png",
          input_message_content: { message_text: "_" },
          reply_markup: new InlineKeyboard().switchInlineCurrent("← Back to Menu", ""),
        },
      ], { cache_time: 0, is_personal: true });
    }
    
    // Generate a unique key for this request
    const rKey = makeId(6);
    const escapedTopic = escapeHTML(topic);
    
    // Store pending request - will be processed in chosen_inline_result
    inlineCache.set(`r_pending_${rKey}`, {
      type: "research",
      prompt: topic,
      userId: String(userId),
      model,
      shortModel,
      createdAt: Date.now(),
    });
    
    // Send placeholder immediately - this won't timeout!
    // IMPORTANT: Must include reply_markup (inline keyboard) to receive inline_message_id in chosen_inline_result
    return safeAnswerInline(ctx, [
      {
        type: "article",
        id: `r_start_${rKey}`,
        title: `🔍 ${topic.slice(0, 40)}`,
        description: "🔄 Tap to start research...",
        thumbnail_url: "https://img.icons8.com/fluency/96/search.png",
        input_message_content: {
          message_text: `🔍 <b>Research: ${escapedTopic}</b>\n\n⏳ <i>Researching... Please wait...</i>\n\n<i>via StarzAI • ${shortModel}</i>`,
          parse_mode: "HTML",
        },
        // Keyboard is required to get inline_message_id for editing!
        reply_markup: new InlineKeyboard().text("⏳ Loading...", `r_loading_${rKey}`),
      },
    ], { cache_time: 0, is_personal: true });
  }
  
  
  // "s" or "s " - Settings shortcut - show model categories with navigation buttons
  if (qLower === "s" || qLower === "s ") {
    const user = getUserRecord(userId);
    const tier = user?.tier || "free";
    
    const results = [
      {
        type: "article",
        id: `s_free_${sessionKey}`,
        title: `🆓 Free Models (${FREE_MODELS.length})`,
        description: "➡️ Tap button to view",
        thumbnail_url: "https://img.icons8.com/fluency/96/free.png",
        input_message_content: { message_text: "_" },
        reply_markup: new InlineKeyboard().switchInlineCurrent("🆓 View Free Models", "s:free "),
      },
    ];
    
    if (tier === "premium" || tier === "ultra") {
      results.push({
        type: "article",
        id: `s_premium_${sessionKey}`,
        title: `⭐ Premium Models (${PREMIUM_MODELS.length})`,
        description: "➡️ Tap button to view",
        thumbnail_url: "https://img.icons8.com/fluency/96/star.png",
        input_message_content: { message_text: "_" },
        reply_markup: new InlineKeyboard().switchInlineCurrent("⭐ View Premium Models", "s:premium "),
      });
    }
    
    if (tier === "ultra") {
      results.push({
        type: "article",
        id: `s_ultra_${sessionKey}`,
        title: `💎 Ultra Models (${ULTRA_MODELS.length})`,
        description: "➡️ Tap button to view",
        thumbnail_url: "https://img.icons8.com/fluency/96/diamond.png",
        input_message_content: { message_text: "_" },
        reply_markup: new InlineKeyboard().switchInlineCurrent("💎 View Ultra Models", "s:ultra "),
      });
    }
    
    results.push({
      type: "article",
      id: `s_current_${sessionKey}`,
      title: `✅ Current: ${shortModel}`,
      description: "Your selected model",
      thumbnail_url: "https://img.icons8.com/fluency/96/checkmark.png",
      input_message_content: { message_text: "_" },
    });
    
    return safeAnswerInline(ctx, results, { cache_time: 0, is_personal: true });
  }
  
  // "s:free", "s:premium", "s:ultra" - Show models in category
  if (qLower.startsWith("s:") && qLower.length > 2) {
    const category = qLower.slice(2).trim();
    const user = getUserRecord(userId);
    const tier = user?.tier || "free";
    
    let models = [];
    if (category === "free" || category.startsWith("free")) models = FREE_MODELS;
    else if ((category === "premium" || category.startsWith("premium")) && (tier === "premium" || tier === "ultra")) models = PREMIUM_MODELS;
    else if ((category === "ultra" || category.startsWith("ultra")) && tier === "ultra") models = ULTRA_MODELS;
    
    if (models.length === 0) {
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `s_noaccess_${sessionKey}`,
          title: "🚫 No access to this tier",
          description: "Upgrade to access more models",
          thumbnail_url: "https://img.icons8.com/fluency/96/lock.png",
          input_message_content: { message_text: "_" },
        },
      ], { cache_time: 0, is_personal: true });
    }
    
    const results = models.map((m, i) => {
      const mShort = m.split("/").pop();
      const isSelected = m === model;
      return {
        type: "article",
        id: `s_model_${i}_${sessionKey}`,
        title: `${isSelected ? "✅ " : ""}${mShort}`,
        description: isSelected ? "Currently selected" : "➡️ Tap button to select",
        thumbnail_url: isSelected 
          ? "https://img.icons8.com/fluency/96/checkmark.png"
          : "https://img.icons8.com/fluency/96/robot.png",
        input_message_content: { message_text: "_" },
        reply_markup: isSelected 
          ? new InlineKeyboard().switchInlineCurrent("← Back to Settings", "s ")
          : new InlineKeyboard().switchInlineCurrent(`Select ${mShort}`, `set:${m} `),
      };
    });
    
    // Add back button
    results.push({
      type: "article",
      id: `s_back_${sessionKey}`,
      title: "← Back to Categories",
      description: "Return to settings",
      thumbnail_url: "https://img.icons8.com/fluency/96/back.png",
      input_message_content: { message_text: "_" },
      reply_markup: new InlineKeyboard().switchInlineCurrent("← Back", "s "),
    });
    
    return safeAnswerInline(ctx, results, { cache_time: 0, is_personal: true });
  }
  
  // "set:modelname" - Actually set the model
  if (qLower.startsWith("set:")) {
    const newModel = q.slice(4).trim();
    const user = getUserRecord(userId);
    const tier = user?.tier || "free";
    const allowedModels = allModelsForTier(tier);
    
    if (allowedModels.includes(newModel)) {
      // Set the model
      setUserModel(userId, newModel);
      const inlineSess = getInlineSession(userId);
      inlineSess.model = newModel;
      
      const newShortModel = newModel.split("/").pop();
      
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `set_done_${sessionKey}`,
          title: `✅ Model set to ${newShortModel}`,
          description: "➡️ Tap button to go back",
          thumbnail_url: "https://img.icons8.com/fluency/96/checkmark.png",
          input_message_content: { message_text: "_" },
          reply_markup: new InlineKeyboard().switchInlineCurrent("← Back to Menu", ""),
        },
      ], { cache_time: 0, is_personal: true });
    } else {
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `set_err_${sessionKey}`,
          title: "❌ Model not available",
          description: "You don't have access to this model",
          thumbnail_url: "https://img.icons8.com/fluency/96/cancel.png",
          input_message_content: { message_text: "_" },
          reply_markup: new InlineKeyboard().switchInlineCurrent("← Back", "s "),
        },
      ], { cache_time: 0, is_personal: true });
    }
  }
  
  // =====================
  // ORIGINAL HANDLERS
  // =====================
  
  // "yap" filter - legacy shared chat mode (now removed)
  if (qLower === "yap" || (qLower.startsWith("yap ") && !qLower.includes(":"))) {
    return safeAnswerInline(ctx, [
      {
        type: "article",
        id: `yap_disabled_${sessionKey}`,
        title: "Yap mode has been removed",
        description: "Use other inline modes instead (q:, b:, code:, e:, sum:, p:).",
        thumbnail_url: "https://img.icons8.com/fluency/96/conference-call.png",
        input_message_content: {
          message_text: "👥 Yap (shared group chat) mode has been removed.\n\nUse other inline modes instead:\n\n• q:  – Quark (quick answers)\n• b:  – Blackhole (deep research)\n• code: – Programming help\n• e:  – Explain (ELI5)\n• sum: – Summarize\n• p:  – Partner chat",
          parse_mode: "Markdown",
        },
      },
    ], { cache_time: 0, is_personal: true });
  }
  
  // c:key: message - Continue conversation (Reply button)
  // Match c:XXXXXX: or c:XXXXXX (with or without trailing colon/space)
  const cMatch = q.match(/^c:([a-zA-Z0-9]+):?\s*(.*)$/i);
  if (cMatch) {
    const cacheKey = cMatch[1];
    const userMessage = (cMatch[2] || "").trim();
    
    const cached = inlineCache.get(cacheKey);
    
    if (!cached) {
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `c_expired_${sessionKey}`,
          title: "⚠️ Session Expired",
          description: "Start a new conversation",
          thumbnail_url: "https://img.icons8.com/fluency/96/error.png",
          input_message_content: { message_text: "_" },
          reply_markup: new InlineKeyboard().switchInlineCurrent("← Back to Menu", ""),
        },
      ], { cache_time: 0, is_personal: true });
    }
    
    if (!userMessage) {
      // Show typing hint with context
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `c_typing_${sessionKey}`,
          title: "✍️ Type your follow-up...",
          description: `Previous: ${(cached.prompt || "").slice(0, 50)}...`,
          thumbnail_url: "https://img.icons8.com/fluency/96/chat.png",
          input_message_content: { message_text: "_" },
          reply_markup: new InlineKeyboard().switchInlineCurrent("← Back to Menu", ""),
        },
      ], { cache_time: 0, is_personal: true });
    }
    
    // Deferred reply: send placeholder immediately, compute answer after user sends
    const replyKey = makeId(6);
    const replyShortModel = model.split("/").pop();
    
    // Store pending payload for chosen_inline_result handler
    inlineCache.set(`pending_${replyKey}`, {
      cacheKey,
      userMessage,
      model,
      cached,
      userId: String(userId),
      createdAt: Date.now(),
    });
    setTimeout(() => inlineCache.delete(`pending_${replyKey}`), 30 * 60 * 1000);
    
    const preview = (cached.answer || "").replace(/\s+/g, " ").slice(0, 80);
    
    return safeAnswerInline(ctx, [
      {
        type: "article",
        id: `c_reply_${replyKey}`,
        title: `✉️ ${userMessage.slice(0, 40)}`,
        description: preview || "Send follow-up reply",
        thumbnail_url: "https://img.icons8.com/fluency/96/send.png",
        input_message_content: {
          message_text: `❓ *${userMessage}*\n\n⏳ _Thinking..._\n\n_via StarzAI • ${replyShortModel}_`,
          parse_mode: "Markdown",
        },
        reply_markup: new InlineKeyboard().text("⏳ Loading...", "reply_loading"),
      },
    ], { cache_time: 0, is_personal: true });
  }
  
  // yap:chatKey: message - legacy Yap mode (removed)
  if (qLower.startsWith("yap:") && q.includes(": ")) {
    return safeAnswerInline(ctx, [
      {
        type: "article",
        id: `yap_legacy_${sessionKey}`,
        title: "Yap mode has been removed",
        description: "Shared Yap chats are no longer supported.",
        thumbnail_url: "https://img.icons8.com/fluency/96/conference-call.png",
        input_message_content: {
          message_text: "👥 Yap (shared group chat) mode has been removed.\n\nUse other inline modes instead:\n\n• q:  – Quark (quick answers)\n• b:  – Blackhole (deep research)\n• code: – Programming help\n• e:  – Explain (ELI5)\n• sum: – Summarize\n• p:  – Partner chat",
          parse_mode: "Markdown",
        },
      },
    ], { cache_time: 0, is_personal: true });
  }
  
  // =====================
  // SETTINGS - All in popup, no messages sent!
  // =====================
  
  // "settings" - show model categories
  if (qLower === "settings" || qLower === "settings ") {
    const user = getUserRecord(userId);
    const tier = user?.tier || "free";
    const shortModel = model.split("/").pop();
    
    const results = [
      {
        type: "article",
        id: `set_cat_free_${sessionKey}`,
        title: "🆓 Free Models",
        description: `${FREE_MODELS.length} models available`,
        thumbnail_url: "https://img.icons8.com/fluency/96/free.png",
        input_message_content: { message_text: "_" },
        reply_markup: new InlineKeyboard().switchInlineCurrent("🆓 View Free Models", "settings:free "),
      },
    ];
    
    if (tier === "premium" || tier === "ultra") {
      results.push({
        type: "article",
        id: `set_cat_premium_${sessionKey}`,
        title: "⭐ Premium Models",
        description: `${PREMIUM_MODELS.length} models available`,
        thumbnail_url: "https://img.icons8.com/fluency/96/star.png",
        input_message_content: { message_text: "_" },
        reply_markup: new InlineKeyboard().switchInlineCurrent("⭐ View Premium Models", "settings:premium "),
      });
    }
    
    if (tier === "ultra") {
      results.push({
        type: "article",
        id: `set_cat_ultra_${sessionKey}`,
        title: "💎 Ultra Models",
        description: `${ULTRA_MODELS.length} models available`,
        thumbnail_url: "https://img.icons8.com/fluency/96/diamond.png",
        input_message_content: { message_text: "_" },
        reply_markup: new InlineKeyboard().switchInlineCurrent("💎 View Ultra Models", "settings:ultra "),
      });
    }
    
    // Back to main menu
    results.push({
      type: "article",
      id: `set_back_${sessionKey}`,
      title: `← Back (Current: ${shortModel})`,
      description: "Return to main menu",
      thumbnail_url: "https://img.icons8.com/fluency/96/back.png",
      input_message_content: { message_text: "_" },
      reply_markup: new InlineKeyboard().switchInlineCurrent("← Back", ""),
    });
    
    return safeAnswerInline(ctx, results, { cache_time: 0, is_personal: true });
  }
  
  // "settings:category" - show models in category
  if (qLower.startsWith("settings:")) {
    const category = qLower.split(":")[1]?.trim()?.split(" ")[0];
    const user = getUserRecord(userId);
    const tier = user?.tier || "free";
    const shortModel = model.split("/").pop();
    
    let models = [];
    let categoryTitle = "";
    let categoryEmoji = "";
    
    if (category === "free") {
      models = FREE_MODELS;
      categoryTitle = "Free";
      categoryEmoji = "🆓";
    } else if (category === "premium" && (tier === "premium" || tier === "ultra")) {
      models = PREMIUM_MODELS;
      categoryTitle = "Premium";
      categoryEmoji = "⭐";
    } else if (category === "ultra" && tier === "ultra") {
      models = ULTRA_MODELS;
      categoryTitle = "Ultra";
      categoryEmoji = "💎";
    }
    
    if (models.length === 0) {
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `set_noaccess_${sessionKey}`,
          title: "🚫 No Access",
          description: "Upgrade your tier to access these models",
          input_message_content: { message_text: "_" },
          reply_markup: new InlineKeyboard().switchInlineCurrent("← Back", "settings "),
        },
      ], { cache_time: 0, is_personal: true });
    }
    
    const results = models.map((m, i) => {
      const mShort = m.split("/").pop();
      const isSelected = m === model;
      return {
        type: "article",
        id: `set_model_${i}_${sessionKey}`,
        title: `${isSelected ? "✅ " : ""}${mShort}`,
        description: isSelected ? "Currently selected" : "Tap to select",
        thumbnail_url: isSelected 
          ? "https://img.icons8.com/fluency/96/checkmark.png"
          : "https://img.icons8.com/fluency/96/robot.png",
        input_message_content: { message_text: "_" },
        reply_markup: new InlineKeyboard().switchInlineCurrent(
          isSelected ? `✅ ${mShort}` : `Select ${mShort}`,
          `set:${m} `
        ),
      };
    });
    
    // Back button
    results.push({
      type: "article",
      id: `set_back_cat_${sessionKey}`,
      title: "← Back to Categories",
      description: "Return to category selection",
      thumbnail_url: "https://img.icons8.com/fluency/96/back.png",
      input_message_content: { message_text: "_" },
      reply_markup: new InlineKeyboard().switchInlineCurrent("← Back", "settings "),
    });
    
    return safeAnswerInline(ctx, results, { cache_time: 0, is_personal: true });
  }
  
  // "set:modelname" - select model (no message sent!)
  if (qLower.startsWith("set:")) {
    const newModel = q.slice(4).trim();
    const user = getUserRecord(userId);
    const tier = user?.tier || "free";
    const allowedModels = allModelsForTier(tier);
    
    if (allowedModels.includes(newModel)) {
      // Set the model
      setUserModel(userId, newModel);
      const inlineSess = getInlineSession(userId);
      inlineSess.model = newModel;
      
      const shortModel = newModel.split("/").pop();
      
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `set_done_${sessionKey}`,
          title: `✅ Model set to ${shortModel}`,
          description: "Tap to return to main menu",
          thumbnail_url: "https://img.icons8.com/fluency/96/checkmark.png",
          input_message_content: { message_text: "_" },
          reply_markup: new InlineKeyboard().switchInlineCurrent("← Back to Menu", ""),
        },
      ], { cache_time: 0, is_personal: true });
    } else {
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `set_err_${sessionKey}`,
          title: "❌ Model not available",
          description: "You don't have access to this model",
          thumbnail_url: "https://img.icons8.com/fluency/96/cancel.png",
          input_message_content: { message_text: "_" },
          reply_markup: new InlineKeyboard().switchInlineCurrent("← Back", "settings "),
        },
      ], { cache_time: 0, is_personal: true });
    }
  }
  
  // =====================
  // RESEARCH MODE
  // =====================
  
  // "research:" prefix - detailed research answer
  if (qLower.startsWith("research:") || qLower.startsWith("research ")) {
    const topic = q.replace(/^research[:\s]+/i, "").trim();
    
    if (!topic) {
      // Show typing hint - stays in popup
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `research_typing_${sessionKey}`,
          title: "✍️ Type your research topic...",
          description: "Example: quantum computing, climate change, AI",
          thumbnail_url: "https://img.icons8.com/fluency/96/search.png",
          input_message_content: { message_text: "_" },
          reply_markup: new InlineKeyboard().switchInlineCurrent("← Back", ""),
        },
      ], { cache_time: 0, is_personal: true });
    }
    
    try {
      const out = await llmText({
        model,
        messages: [
          { role: "system", content: "You are a research assistant. Provide detailed, well-structured, informative answers. Use bullet points and sections where appropriate. Be thorough but clear." },
          { role: "user", content: `Research and explain in detail: ${topic}` },
        ],
        temperature: 0.7,
        max_tokens: 800,
        timeout: 15000,
        retries: 1,
      });
      
      const answer = (out || "No results").slice(0, 3500);
      const shortModel = model.split("/").pop();
      
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `research_${makeId(6)}`,
          title: `✉️ Send: ${topic.slice(0, 35)}`,
          description: `🔍 ${answer.slice(0, 80)}...`,
          thumbnail_url: "https://img.icons8.com/fluency/96/send.png",
          input_message_content: {
            message_text: `🔍 *Research: ${topic}*\n\n${answer}\n\n_via StarzAI • ${shortModel}_`,
            parse_mode: "Markdown",
          },
        },
        {
          type: "article",
          id: `research_back_${sessionKey}`,
          title: "← Back to Menu",
          description: "Cancel and return",
          thumbnail_url: "https://img.icons8.com/fluency/96/back.png",
          input_message_content: { message_text: "_" },
          reply_markup: new InlineKeyboard().switchInlineCurrent("← Back", ""),
        },
      ], { cache_time: 0, is_personal: true });
    } catch (e) {
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `research_err_${sessionKey}`,
          title: "⚠️ Taking too long...",
          description: "Try a simpler topic",
          thumbnail_url: "https://img.icons8.com/fluency/96/error.png",
          input_message_content: { message_text: "_" },
          reply_markup: new InlineKeyboard().switchInlineCurrent("🔄 Try Again", `research: ${topic}`),
        },
        {
          type: "article",
          id: `research_back_err_${sessionKey}`,
          title: "← Back to Menu",
          description: "Cancel and return",
          thumbnail_url: "https://img.icons8.com/fluency/96/back.png",
          input_message_content: { message_text: "_" },
          reply_markup: new InlineKeyboard().switchInlineCurrent("← Back", ""),
        },
      ], { cache_time: 0, is_personal: true });
    }
  }
  
  // "translate" prefix - translation mode
  if (qLower.startsWith("translate")) {
    const match = q.match(/^translate\s+to\s+([\w]+)[:\s]+(.+)$/i);
    
    if (!match) {
      // Show language options or typing hint
      const partialMatch = q.match(/^translate\s+to\s+([\w]*)$/i);
      if (partialMatch) {
        // User is typing language, show common options
        const languages = ["English", "Spanish", "French", "German", "Chinese", "Japanese", "Korean", "Arabic", "Hindi", "Portuguese"];
        const typed = partialMatch[1]?.toLowerCase() || "";
        const filtered = languages.filter(l => l.toLowerCase().startsWith(typed));
        
        const results = filtered.slice(0, 8).map((lang, i) => ({
          type: "article",
          id: `translate_lang_${i}_${sessionKey}`,
          title: `🌐 Translate to ${lang}`,
          description: "Tap to select this language",
          thumbnail_url: "https://img.icons8.com/fluency/96/google-translate.png",
          input_message_content: { message_text: "_" },
          reply_markup: new InlineKeyboard().switchInlineCurrent(`🌐 ${lang}`, `translate to ${lang}: `),
        }));
        
        results.push({
          type: "article",
          id: `translate_back_${sessionKey}`,
          title: "← Back to Menu",
          description: "Cancel and return",
          thumbnail_url: "https://img.icons8.com/fluency/96/back.png",
          input_message_content: { message_text: "_" },
          reply_markup: new InlineKeyboard().switchInlineCurrent("← Back", ""),
        });
        
        return safeAnswerInline(ctx, results, { cache_time: 0, is_personal: true });
      }
      
      // Show typing hint
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `translate_typing_${sessionKey}`,
          title: "✍️ Type: translate to [language]: text",
          description: "Example: translate to Spanish: Hello",
          thumbnail_url: "https://img.icons8.com/fluency/96/google-translate.png",
          input_message_content: { message_text: "_" },
          reply_markup: new InlineKeyboard().switchInlineCurrent("← Back", ""),
        },
      ], { cache_time: 0, is_personal: true });
    }
    
    const targetLang = match[1];
    const textToTranslate = match[2].trim();
    
    try {
      const out = await llmText({
        model,
        messages: [
          { role: "system", content: `You are a translator. Translate the given text to ${targetLang}. Only output the translation, nothing else.` },
          { role: "user", content: textToTranslate },
        ],
        temperature: 0.3,
        max_tokens: 500,
        timeout: 10000,
        retries: 1,
      });
      
      const translation = (out || "Translation failed").trim();
      const shortModel = model.split("/").pop();
      
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `translate_${makeId(6)}`,
          title: `✉️ Send: ${translation.slice(0, 35)}`,
          description: `🌐 ${targetLang} translation`,
          thumbnail_url: "https://img.icons8.com/fluency/96/send.png",
          input_message_content: {
            message_text: `🌐 *Translation to ${targetLang}*\n\n📝 Original: ${textToTranslate}\n\n✅ ${targetLang}: ${translation}\n\n_via StarzAI • ${shortModel}_`,
            parse_mode: "Markdown",
          },
        },
        {
          type: "article",
          id: `translate_back_${sessionKey}`,
          title: "← Back to Menu",
          description: "Cancel and return",
          thumbnail_url: "https://img.icons8.com/fluency/96/back.png",
          input_message_content: { message_text: "_" },
          reply_markup: new InlineKeyboard().switchInlineCurrent("← Back", ""),
        },
      ], { cache_time: 0, is_personal: true });
    } catch (e) {
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `translate_err_${sessionKey}`,
          title: "⚠️ Translation failed",
          description: "Try again",
          thumbnail_url: "https://img.icons8.com/fluency/96/error.png",
          input_message_content: { message_text: "_" },
          reply_markup: new InlineKeyboard().switchInlineCurrent("🔄 Try Again", `translate to ${targetLang}: ${textToTranslate}`),
        },
        {
          type: "article",
          id: `translate_back_err_${sessionKey}`,
          title: "← Back to Menu",
          description: "Cancel and return",
          thumbnail_url: "https://img.icons8.com/fluency/96/back.png",
          input_message_content: { message_text: "_" },
          reply_markup: new InlineKeyboard().switchInlineCurrent("← Back", ""),
        },
      ], { cache_time: 0, is_personal: true });
    }
  }

  // "bhcont KEY" - Blackhole continuation via inline mode
  if (qLower.startsWith("bhcont")) {
    const parts = q.split(/\s+/);
    const contKey = (parts[1] || "").trim();

    if (!contKey) {
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `bhcont_hint_${sessionKey}`,
          title: "🗿🔬 Continue Blackhole",
          description: "Tap Continue under a Blackhole answer to use this.",
          thumbnail_url: "https://img.icons8.com/fluency/96/black-hole.png",
          input_message_content: { message_text: "_" },
          reply_markup: new InlineKeyboard().switchInlineCurrent("← Back", ""),
        },
      ], { cache_time: 0, is_personal: true });
    }

    const baseItem = inlineCache.get(contKey);
    if (!baseItem || baseItem.mode !== "blackhole") {
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `bhcont_expired_${sessionKey}`,
          title: "⚠️ Session expired",
          description: "Start a new Blackhole analysis.",
          thumbnail_url: "https://img.icons8.com/fluency/96/error.png",
          input_message_content: { message_text: "_" },
        },
      ], { cache_time: 0, is_personal: true });
    }

    if (String(userId) !== String(baseItem.userId)) {
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `bhcont_denied_${sessionKey}`,
          title: "🚫 Not your session",
          description: "Only the original requester can continue.",
          thumbnail_url: "https://img.icons8.com/fluency/96/lock.png",
          input_message_content: { message_text: "_" },
        },
      ], { cache_time: 0, is_personal: true });
    }

    const model = baseItem.model || ensureChosenModelValid(userId);
    const shortModel = model.split("/").pop();
    const prompt = baseItem.prompt || "";

    const pendingKey = makeId(6);
    inlineCache.set(`bh_cont_pending_${pendingKey}`, {
      baseKey: contKey,
      userId: String(userId),
      model,
      shortModel,
      createdAt: Date.now(),
    });
    setTimeout(() => inlineCache.delete(`bh_cont_pending_${pendingKey}`), 5 * 60 * 1000);

    const escapedPrompt = escapeHTML(prompt);

    return safeAnswerInline(ctx, [
      {
        type: "article",
        id: `bh_cont_start_${pendingKey}`,
        title: `🗿🔬 Continue Blackhole`,
        description: `Continue: ${prompt.slice(0, 40)}${prompt.length > 40 ? "..." : ""}`,
        thumbnail_url: "https://img.icons8.com/fluency/96/black-hole.png",
        input_message_content: {
          message_text: `🗿🔬 <b>Blackhole Analysis (cont.): ${escapedPrompt}</b>\n\n⏳ <i>Continuing in depth... Please wait...</i>\n\n<i>via StarzAI • Blackhole • ${shortModel}</i>`,
          parse_mode: "HTML",
        },
        reply_markup: new InlineKeyboard().text("⏳ Loading...", "bh_loading"),
      },
    ], { cache_time: 0, is_personal: true });
  }

  // "ultrasum KEY" - Ultra Summary for Blackhole / Explain / Code as a new inline message
  if (qLower.startsWith("ultrasum")) {
    const parts = q.split(/\s+/);
    const baseKey = (parts[1] || "").trim();

    const userRec = getUserRecord(userId);
    const tier = userRec?.tier || "free";
    if (tier !== "ultra") {
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `ultrasum_locked_${sessionKey}`,
          title: "🧾 Ultra Summary (Ultra only)",
          description: "Upgrade to Ultra to unlock Ultra Summary.",
          thumbnail_url: "https://img.icons8.com/fluency/96/diamond.png",
          input_message_content: {
            message_text:
              "💎 *Ultra Summary is an Ultra feature.*\n\n" +
              "Upgrade to Ultra to unlock:\n" +
              "• Ultra Summary for long answers\n" +
              "• Extra Shorter/Longer usage\n" +
              "• Access to all Ultra models\n\n" +
              "_Use the Plans button in the menu or /model for details._",
            parse_mode: "Markdown",
          },
        },
      ], { cache_time: 0, is_personal: true });
    }

    if (!baseKey) {
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `ultrasum_hint_${sessionKey}`,
          title: "🧾 Ultra Summary",
          description: "Tap Ultra Summary under a completed answer to use this.",
          thumbnail_url: "https://img.icons8.com/fluency/96/survey.png",
          input_message_content: { message_text: "_" },
          reply_markup: new InlineKeyboard().switchInlineCurrent("← Back", ""),
        },
      ], { cache_time: 0, is_personal: true });
    }

    const baseItem = inlineCache.get(baseKey);
    if (!baseItem) {
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `ultrasum_expired_${sessionKey}`,
          title: "⚠️ Session expired",
          description: "The original answer is no longer available.",
          thumbnail_url: "https://img.icons8.com/fluency/96/error.png",
          input_message_content: { message_text: "_" },
        },
      ], { cache_time: 0, is_personal: true });
    }

    if (String(userId) !== String(baseItem.userId)) {
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `ultrasum_denied_${sessionKey}`,
          title: "🚫 Not your session",
          description: "Only the original requester can summarize.",
          thumbnail_url: "https://img.icons8.com/fluency/96/lock.png",
          input_message_content: { message_text: "_" },
        },
      ], { cache_time: 0, is_personal: true });
    }

    const mode = baseItem.mode || "default";
    const supported = mode === "blackhole" || mode === "explain" || mode === "code";
    if (!supported || !baseItem.completed) {
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `ultrasum_incomplete_${sessionKey}`,
          title: "🧾 Ultra Summary",
          description: "Finish the answer first, then summarize.",
          thumbnail_url: "https://img.icons8.com/fluency/96/survey.png",
          input_message_content: { message_text: "_" },
        },
      ], { cache_time: 0, is_personal: true });
    }

    const modelForSum = baseItem.model || ensureChosenModelValid(userId);
    const shortModel = modelForSum.split("/").pop();
    const prompt = baseItem.prompt || "";

    const pendingKey = makeId(6);
    inlineCache.set(`ultrasum_pending_${pendingKey}`, {
      baseKey,
      userId: String(userId),
      mode,
      model: modelForSum,
      shortModel,
      createdAt: Date.now(),
    });
    setTimeout(() => inlineCache.delete(`ultrasum_pending_${pendingKey}`), 5 * 60 * 1000);

    const escapedPrompt = escapeHTML(prompt);
    let headerTitle = "Ultra Summary";
    if (mode === "blackhole") {
      const partsCount = baseItem.part || 1;
      headerTitle = `Ultra Summary of Blackhole (${partsCount} part${partsCount > 1 ? "s" : ""})`;
    } else if (mode === "code") {
      headerTitle = "Ultra Summary of Code Answer";
    } else if (mode === "explain") {
      headerTitle = "Ultra Summary of Explanation";
    }

    const icon =
      mode === "blackhole" ? "🗿🔬" : mode === "code" ? "💻" : mode === "explain" ? "🧠" : "🧾";
    const thumb =
      mode === "blackhole"
        ? "https://img.icons8.com/fluency/96/black-hole.png"
        : mode === "code"
        ? "https://img.icons8.com/fluency/96/source-code.png"
        : mode === "explain"
        ? "https://img.icons8.com/fluency/96/brain.png"
        : "https://img.icons8.com/fluency/96/survey.png";

    return safeAnswerInline(ctx, [
      {
        type: "article",
        id: `ultrasum_start_${pendingKey}`,
        title: "🧾 Ultra Summary",
        description: `Summarize: ${prompt.slice(0, 40)}${prompt.length > 40 ? "..." : ""}`,
        thumbnail_url: thumb,
        input_message_content: {
          message_text: `${icon} <b>${headerTitle}: ${escapedPrompt}</b>\n\n⏳ <i>Summarizing all parts... Please wait...</i>\n\n<i>via StarzAI • Ultra Summary • ${shortModel}</i>`,
          parse_mode: "HTML",
        },
        reply_markup: new InlineKeyboard().text("⏳ Loading...", "ultrasum_loading"),
      },
    ], { cache_time: 0, is_personal: true });
  }

  // "chat:" prefix - interactive chat mode
  if (q.startsWith("chat:")) {
    const userMessage = q.slice(5).trim();
    
    if (!userMessage) {
      // Just show current chat state
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `chatview_${sessionKey}`,
          title: "💬 View Chat",
          description: "See your conversation",
          input_message_content: {
            message_text: formatInlineChatDisplay(session, userId),
            parse_mode: "Markdown",
          },
          reply_markup: inlineChatKeyboard(sessionKey, session.history.length > 0),
        },
      ], { cache_time: 0, is_personal: true });
    }

    // User typed a message - process it
    try {
      const answer = await llmInlineChatReply({ userId, userText: userMessage, model });
      const updatedSession = getInlineSession(userId);
      
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `chatreply_${sessionKey}`,
          title: "💬 Send & View Chat",
          description: answer.slice(0, 80),
          input_message_content: {
            message_text: formatInlineChatDisplay(updatedSession, userId),
            parse_mode: "Markdown",
          },
          reply_markup: inlineChatKeyboard(sessionKey, true),
        },
      ], { cache_time: 0, is_personal: true });
    } catch (e) {
      console.error("Inline chat error:", e);
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `chaterr_${sessionKey}`,
          title: "⚠️ Error",
          description: "Model is slow. Try again.",
          input_message_content: {
            message_text: "⚠️ Model is slow right now. Please try again.",
          },
        },
      ], { cache_time: 0, is_personal: true });
    }
  }

  // "new:" prefix - clear and start new chat
  if (q.startsWith("new:")) {
    clearInlineSession(userId);
    const userMessage = q.slice(4).trim();
    
    if (!userMessage) {
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `newchat_${sessionKey}`,
          title: "🆕 New Chat Ready",
          description: "Type your first message",
          input_message_content: {
            message_text: formatInlineChatDisplay(getInlineSession(userId), userId),
            parse_mode: "Markdown",
          },
          reply_markup: inlineChatKeyboard(sessionKey, false),
        },
      ], { cache_time: 0, is_personal: true });
    }

    // Process first message
    try {
      const answer = await llmInlineChatReply({ userId, userText: userMessage, model });
      const updatedSession = getInlineSession(userId);
      
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `newreply_${sessionKey}`,
          title: "💬 New Chat",
          description: answer.slice(0, 80),
          input_message_content: {
            message_text: formatInlineChatDisplay(updatedSession, userId),
            parse_mode: "Markdown",
          },
          reply_markup: inlineChatKeyboard(sessionKey, true),
        },
      ], { cache_time: 0, is_personal: true });
    } catch (e) {
      console.error("New chat error:", e);
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `newerr_${sessionKey}`,
          title: "⚠️ Error",
          description: "Model is slow. Try again.",
          input_message_content: {
            message_text: "⚠️ Model is slow right now. Please try again.",
          },
        },
      ], { cache_time: 0, is_personal: true });
    }
  }

  // Regular query - quick one-shot answer
  // If web mode is enabled (or the query looks time-sensitive), try websearch + AI summary first.
  // Otherwise, fall back to offline quick answer.
  const quickKey = makeId(6);
  const quickShortModel = model.split("/").pop();
  const userRecord = getUserRecord(userId);
  const wantsWebsearch = userRecord?.webSearch || needsWebSearch(q);
  
  try {
    // Attempt websearch-backed answer if desired and quota allows
    if (wantsWebsearch) {
      const quota = consumeWebsearchQuota(userId);
      if (quota.allowed) {
        try {
          const searchResult = await webSearch(q, 5);
          if (searchResult.success && Array.isArray(searchResult.results) && searchResult.results.length > 0) {
            const searchContext = formatSearchResultsForAI(searchResult);
            const startTime = Date.now();
  
            const aiResponse = await llmText({
              model,
              messages: [
                {
                  role: "system",
                  content:
                    "You are a helpful assistant with access to real-time web search results.\n" +
                    "\n" +
                    "CRITICAL CITATION INSTRUCTIONS:\n" +
                    "• Every non-obvious factual claim should be backed by a source index like [1], [2], etc.\n" +
                    "• When you summarize multiple sources, include multiple indices, e.g. [1][3].\n" +
                    "• If you mention a specific number, date, name, or quote, always attach the source index.\n" +
                    "• Never invent citations; only use indices that exist in the search results.\n" +
                    "\n" +
                    "GENERAL STYLE:\n" +
                    "• Use short paragraphs and bullet points so the answer is easy to scan.\n" +
                    "• Make it clear which parts come from which sources via [index] references.\n" +
                    "• For short verbatim excerpts (1–2 sentences), use quote blocks (lines starting with '>').\n" +
                    "• If the search results don't contain relevant information, say so explicitly."
                },
                {
                  role: "user",
                  content:
                    `${searchContext}\n\n` +
                    `User's question: ${q}\n\n` +
                    "The numbered search results above are your ONLY sources of truth. " +
                    "Write an answer that:\n" +
                    "1) Directly answers the user's question, and\n" +
                    "2) Explicitly cites sources using [1], [2], etc next to the claims.\n" +
                    "Do not cite sources that are not provided."
                }
              ],
              temperature: 0.6,
              max_tokens: 800,
              timeout: 15000,
              retries: 1,
            });
  
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  
            let aiText = aiResponse || "No answer generated.";
            aiText = linkifyWebsearchCitations(aiText, searchResult);
  
            // Store the full AI text (with citations) for regen / transforms
            inlineCache.set(quickKey, {
              prompt: q,
              answer: aiText,
              userId: String(userId),
              model,
              mode: "websearch",
              createdAt: Date.now(),
            });
            setTimeout(() => inlineCache.delete(quickKey), 30 * 60 * 1000);
  
            // Track in history
            addToHistory(userId, q, "websearch");
  
            const formattedAnswer = convertToTelegramHTML(aiText.slice(0, 3500));
            const escapedQ = escapeHTML(q);
            const sourcesHtml = buildWebsearchSourcesInlineHtml(searchResult, userId);
  
            await safeAnswerInline(ctx, [
              {
                type: "article",
                id: `answer_${quickKey}`,
                title: `🌐 ${q.slice(0, 40)}`,
                description: aiText.replace(/\s+/g, " ").slice(0, 80),
                thumbnail_url: "https://img.icons8.com/fluency/96/search.png",
                input_message_content: {
                  message_text:
                    `🌐 <b>Websearch</b>\n\n` +
                    `<b>Query:</b> <i>${escapedQ}</i>\n\n` +
                    `${formattedAnswer}${sourcesHtml}\n\n` +
                    `<i>🌐 ${searchResult.results.length} sources • ${elapsed}s • ${quickShortModel}</i>`,
                  parse_mode: "HTML",
                },
                reply_markup: inlineAnswerKeyboard(quickKey),
              },
            ], { cache_time: 0, is_personal: true });
  
            trackUsage(userId, "inline");
            return;
          }
        } catch (searchErr) {
          console.log("Inline quick websearch failed:", searchErr.message || searchErr);
          // Fall through to offline answer
        }
      } else {
        console.log(
          `Inline quick websearch quota exhausted for user ${userId}: used=${quota.used}, limit=${quota.limit}`
        );
      }
    }
  
    // Fallback: offline quick answer (no websearch or websearch unavailable)
    const out = await llmText({
      model,
      messages: [
        { role: "system", content: "Answer compactly and clearly. Prefer <= 900 characters." },
        { role: "user", content: q },
      ],
      temperature: 0.7,
      max_tokens: 240,
      timeout: 12000,
      retries: 1,
    });
  
    const answer = (out || "I couldn't generate a response.").slice(0, 2000);
  
    // Store for Reply/Regen/Shorter/Longer/Continue buttons
    inlineCache.set(quickKey, {
      prompt: q,
      answer,
      userId: String(userId),
      model,
      mode: "quick",
      createdAt: Date.now(),
    });
  
    // Schedule cleanup
    setTimeout(() => inlineCache.delete(quickKey), 30 * 60 * 1000);
  
    // Track in history
    addToHistory(userId, q, "default");
  
    // Convert AI answer to Telegram HTML format
    const formattedAnswer = convertToTelegramHTML(answer);
    const escapedQ = escapeHTML(q);
  
    await safeAnswerInline(ctx, [
      {
        type: "article",
        id: `answer_${quickKey}`,
        title: `⚡ ${q.slice(0, 40)}`,
        description: answer.slice(0, 80),
        thumbnail_url: "https://img.icons8.com/fluency/96/lightning-bolt.png",
        input_message_content: {
          message_text: `❓ <b>${escapedQ}</b>\n\n${formattedAnswer}\n\n<i>via StarzAI • ${quickShortModel}</i>`,
          parse_mode: "HTML",
        },
        reply_markup: inlineAnswerKeyboard(quickKey),
      },
    ], { cache_time: 0, is_personal: true });
  
  } catch (e) {
    console.error("Quick answer error:", e.message);
    const escapedQ = escapeHTML(q);
    await safeAnswerInline(ctx, [
      {
        type: "article",
        id: `error_${quickKey}`,
        title: `⚡ ${q.slice(0, 40)}`,
        description: "⚠️ Model is slow. Try again.",
        thumbnail_url: "https://img.icons8.com/fluency/96/error.png",
        input_message_content: {
          message_text: `❓ <b>${escapedQ}</b>\n\n⚠️ <i>Model is slow right now. Please try again.</i>\n\n<i>via StarzAI</i>`,
          parse_mode: "HTML",
        },
      },
    ], { cache_time: 0, is_personal: true });
  }
  
  trackUsage(userId, "inline");
});

// =====================
// CHOSEN INLINE RESULT - Store inlineMessageId when Yap is first sent
// =====================
bot.on("chosen_inline_result", async (ctx) => {
  const resultId = ctx.chosenInlineResult.result_id;
  const inlineMessageId = ctx.chosenInlineResult.inline_message_id;
  const userId = ctx.from?.id;
  const userName = ctx.from?.first_name || "User";
  
  console.log(`chosen_inline_result: resultId=${resultId}, inlineMessageId=${inlineMessageId}`);
  
  // Store inlineMessageId for yap_start results (legacy Yap mode - now disabled)
  if (resultId.startsWith("yap_start_")) {
    if (inlineMessageId) {
      try {
        await bot.api.editMessageTextInline(
          inlineMessageId,
          "👥 *Yap shared chat mode has been removed.*\n\nUse other inline modes instead:\n\n• `q:`  – Quark (quick answers)\n• `b:`  – Blackhole (deep research)\n• `code:` – Programming help\n• `e:`  – Explain (ELI5)\n• `sum:` – Summarize\n• `p:`  – Partner chat",
          { parse_mode: "Markdown" }
        );
      } catch {}
    }
    return;
  }
  
  // Handle yap_send - legacy Yap mode (now disabled)
  if (resultId.startsWith("yap_send_")) {
    if (inlineMessageId) {
      try {
        await bot.api.editMessageTextInline(
          inlineMessageId,
          "👥 *Yap shared chat mode has been removed.*",
          { parse_mode: "Markdown" }
        );
      } catch {}
    }
    return;
  }
  
  // Handle inline download - dl_start_KEY or dl_audio_KEY
  if (resultId.startsWith("dl_start_") || resultId.startsWith("dl_audio_")) {
    const isAudioOnly = resultId.startsWith("dl_audio_");
    const dlKey = resultId.replace("dl_start_", "").replace("dl_audio_", "");
    const pending = inlineCache.get(`dl_pending_${dlKey}`);
    
    if (!pending) {
      console.log(`Pending download not found for key=${dlKey}`);
      if (inlineMessageId) {
        try {
          await bot.api.editMessageTextInline(
            inlineMessageId,
            "❌ Download request expired. Please try again.",
            { parse_mode: "HTML" }
          );
        } catch {}
      }
      return;
    }
    
    const { url, platform, userId: ownerId } = pending;
    console.log(`Processing inline download: ${url} (platform: ${platform}, audioOnly: ${isAudioOnly})`);
    
    try {
      // Import the download function
      const { downloadWithVKR } = await import('./src/features/super-utilities.js');
      
      // Perform the download
      const result = await downloadWithVKR(url, isAudioOnly);
      
      if (!result.success) {
        if (inlineMessageId) {
          await bot.api.editMessageTextInline(
            inlineMessageId,
            `❌ <b>Download failed</b>\n\n${escapeHTML(result.error || 'Unknown error')}\n\n<i>Try using /dl command instead</i>`,
            { parse_mode: "HTML" }
          );
        }
        return;
      }
      
      // Update message with success and send the file
      const platformEmojis = { youtube: '🎬', tiktok: '🎵', instagram: '📸', twitter: '🐦', facebook: '📘', spotify: '🎧' };
      const emoji = platformEmojis[platform] || '📥';
      
      // Build caption
      let caption = `${emoji} <b>${escapeHTML(result.title || 'Media')}</b>\n`;
      if (result.author) caption += `👤 ${escapeHTML(result.author)}\n`;
      if (result.duration) caption += `⏱ ${result.duration}\n`;
      caption += `\n<i>Downloaded via StarzAI</i>`;
      
      // Update the inline message
      if (inlineMessageId) {
        await bot.api.editMessageTextInline(
          inlineMessageId,
          `${emoji} <b>Download complete!</b>\n\n🎬 ${escapeHTML(result.title || 'Media')}\n👤 ${escapeHTML(result.author || 'Unknown')}\n\n<i>Sending file...</i>`,
          { parse_mode: "HTML" }
        );
      }
      
      // Note: Inline mode can't send files directly, so we update the message with info
      // The user can use /dl command for actual file download
      if (inlineMessageId) {
        await bot.api.editMessageTextInline(
          inlineMessageId,
          `${emoji} <b>${escapeHTML(result.title || 'Media')}</b>\n\n👤 ${escapeHTML(result.author || 'Unknown')}\n⏱ ${result.duration || 'N/A'}\n\n✅ <i>Use /dl command in chat to download this file</i>\n\n🔗 ${escapeHTML(url.slice(0, 50))}${url.length > 50 ? '...' : ''}`,
          { 
            parse_mode: "HTML",
            reply_markup: new InlineKeyboard()
              .url("📥 Open Original", url)
          }
        );
      }
      
    } catch (e) {
      console.error("Inline download error:", e.message);
      if (inlineMessageId) {
        try {
          await bot.api.editMessageTextInline(
            inlineMessageId,
            `❌ <b>Download failed</b>\n\n${escapeHTML(e.message)}\n\n<i>Try using /dl command instead</i>`,
            { parse_mode: "HTML" }
          );
        } catch {}
      }
    }
    
    // Clean up pending
    inlineCache.delete(`dl_pending_${dlKey}`);
    return;
  }
  
  // Handle c_reply - user sent a reply to continue conversation
  if (resultId.startsWith("c_reply_")) {
    const replyKey = resultId.replace("c_reply_", "");
    const pending = inlineCache.get(`pending_${replyKey}`);
    
    if (!pending) {
      console.log(`Pending reply not found for key=${replyKey}`);
      return;
    }
    
    const { cacheKey, userMessage, model, cached } = pending;
    
    console.log(`Processing reply: ${userMessage}`);
    
    // Get AI response
    try {
      const messages = [
        { role: "system", content: "You are a helpful AI assistant. Continue the conversation naturally. Keep responses concise." },
      ];
      
      // Prefer rich history when available
      if (cached.history && cached.history.length > 0) {
        for (const msg of cached.history.slice(-6)) {
          messages.push({ role: msg.role, content: msg.content });
        }
      } else {
        // Fallback to single-turn prompt/answer
        if (cached.prompt) messages.push({ role: "user", content: cached.prompt });
        if (cached.answer) messages.push({ role: "assistant", content: cached.answer });
      }
      
      // Add new user message
      messages.push({ role: "user", content: userMessage });
      
      const out = await llmText({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 500,
      });
      
      const answer = (out || "I couldn't generate a response.").slice(0, 2000);
      const newKey = makeId(6);
      const shortModel = model.split("/").pop();
      
      // Build updated history (keep last 10 messages)
      const baseHistory =
        (cached.history && cached.history.length > 0)
          ? cached.history
          : [
              ...(cached.prompt ? [{ role: "user", content: cached.prompt }] : []),
              ...(cached.answer ? [{ role: "assistant", content: cached.answer }] : []),
            ];
      
      const newHistory = [
        ...baseHistory,
        { role: "user", content: userMessage },
        { role: "assistant", content: answer },
      ].slice(-10);
      
      // Store new conversation state for future replies
      inlineCache.set(newKey, {
        prompt: userMessage,
        answer,
        userId: pending.userId,
        model,
        mode: "chat",
        history: newHistory,
        timestamp: Date.now(),
      });
      
      // Schedule cleanup
      setTimeout(() => inlineCache.delete(newKey), 30 * 60 * 1000);
      
      // Update the inline message with the AI response
      if (inlineMessageId) {
        await bot.api.editMessageTextInline(
          inlineMessageId,
          `❓ *${userMessage}*\n\n${answer}\n\n_via StarzAI • ${shortModel}_`,
          { 
            parse_mode: "Markdown",
            reply_markup: inlineAnswerKeyboard(newKey)
          }
        );
        console.log(`Reply updated with AI response`);
      }
      
    } catch (e) {
      console.error("Failed to get AI response for reply:", e.message);
      
      // Update message to show error
      if (inlineMessageId) {
        try {
          await bot.api.editMessageTextInline(
            inlineMessageId,
            `❓ *${userMessage}*\n\n⚠️ _Error getting response. Try again!_\n\n_via StarzAI_`,
            { parse_mode: "Markdown" }
          );
        } catch {}
      }
    }
    
    // Clean up pending
    inlineCache.delete(`pending_${replyKey}`);
    return;
  }
  
  // Handle quick answer - user sent a quick question
  if (resultId.startsWith("quick_")) {
    const quickKey = resultId.replace("quick_", "");
    const pending = inlineCache.get(`quick_${quickKey}`);
    
    if (!pending) {
      console.log(`Pending quick answer not found for key=${quickKey}`);
      return;
    }
    
    const { prompt, model } = pending;
    const quickShortModel = model.split("/").pop();
    
    console.log(`Processing quick answer: ${prompt}`);
    
    // Get AI response
    try {
      const out = await llmText({
        model,
        messages: [
          { role: "system", content: "Answer compactly and clearly. Prefer <= 900 characters." },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 240,
      });
      
      const answer = (out || "I couldn't generate a response.").slice(0, 2000);
      const newKey = makeId(6);
      
      // Store for Reply/Regen/Shorter/Longer/Continue buttons
      inlineCache.set(newKey, {
        prompt,
        answer,
        userId: pending.userId,
        model,
        mode: "quick",
        createdAt: Date.now(),
      });
      
      // Schedule cleanup
      setTimeout(() => inlineCache.delete(newKey), 30 * 60 * 1000);
      
      // Update the inline message with the AI response
      if (inlineMessageId) {
        await bot.api.editMessageTextInline(
          inlineMessageId,
          `❓ *${prompt}*\n\n${answer}\n\n_via StarzAI • ${quickShortModel}_`,
          { 
            parse_mode: "Markdown",
            reply_markup: inlineAnswerKeyboard(newKey)
          }
        );
        console.log(`Quick answer updated with AI response`);
      }
      
    } catch (e) {
      console.error("Failed to get AI response for quick answer:", e.message);
      
      // Update message to show error
      if (inlineMessageId) {
        try {
          await bot.api.editMessageTextInline(
            inlineMessageId,
            `❓ *${prompt}*\n\n⚠️ _Error getting response. Try again!_\n\n_via StarzAI_`,
            { parse_mode: "Markdown" }
          );
        } catch {}
      }
    }
    
    // Clean up pending
    inlineCache.delete(`quick_${quickKey}`);
    return;
  }
  
  // Handle Blackhole deferred response - bh_start_KEY
  // Now optionally uses web search when Web mode is ON or the topic looks time-sensitive.
  if (resultId.startsWith("bh_start_")) {
    const bhKey = resultId.replace("bh_start_", "");
    const pending = inlineCache.get(`bh_pending_${bhKey}`);
    
    if (!pending || !inlineMessageId) {
      console.log(`Blackhole pending not found or no inlineMessageId: bhKey=${bhKey}`);
      return;
    }
    
    const { prompt, model, shortModel, userId: ownerId } = pending;
    const ownerStr = String(ownerId || pending.userId || "");
    console.log(`Processing Blackhole: ${prompt}`);
    
    try {
      let searchResult = null;
      const userRec = ownerStr ? getUserRecord(ownerStr) : null;
      const wantsWebsearch = (userRec?.webSearch || needsWebSearch(prompt));
      
      // Try to fetch web search context if desired and quota allows
      if (wantsWebsearch && ownerStr) {
        const quota = consumeWebsearchQuota(ownerId || ownerStr);
        if (quota.allowed) {
          try {
            const result = await webSearch(prompt, 5);
            if (result.success && Array.isArray(result.results) && result.results.length > 0) {
              searchResult = result;
            }
          } catch (err) {
            console.log("Blackhole websearch failed:", err.message || err);
          }
        } else {
          console.log(
            `Blackhole websearch quota exhausted for user ${ownerStr}: used=${quota.used}, limit=${quota.limit}`
          );
        }
      }

      let systemContent;
      let userContent;

      if (searchResult) {
        const searchContext = formatSearchResultsForAI(searchResult);
        systemContent =
          "You are a research expert with access to real-time web search results. " +
          "Provide comprehensive, well-structured analysis with multiple perspectives. " +
          "Use headings, bullet points, and quote blocks (lines starting with '>') for key takeaways. " +
          "Base your answer ONLY on the search results provided. " +
          "Every non-obvious factual claim must be backed by a source index like [1], [2], etc. " +
          "When you summarize multiple sources, include multiple indices, e.g. [1][3]. " +
          "For specific numbers, dates, or names, always attach the source index. " +
          "Never invent citations or sources. " +
          "When you have fully covered the topic and there is nothing essential left to add, end your answer with a line containing only END_OF_BLACKHOLE.";
        userContent =
          `${searchContext}\n\n` +
          `User's topic for deep analysis: ${prompt}\n\n` +
          "Write a detailed analysis based ONLY on the search results above, with clear [n] citations tied to the numbered sources.";
      } else {
        systemContent =
          "You are a research expert. Provide comprehensive, well-structured analysis with multiple perspectives. " +
          "Include key facts, implications, and nuances. Use headings, bullet points, and quote blocks (lines starting with '>') for key takeaways. " +
          "Format your answer in clean Markdown. When you have fully covered the topic and there is nothing essential left to add, end your answer with a line containing only END_OF_BLACKHOLE.";
        userContent = `Provide deep analysis on: ${prompt}`;
      }

      const out = await llmText({
        model,
        messages: [
          { role: "system", content: systemContent },
          { role: "user", content: userContent },
        ],
        temperature: 0.7,
        max_tokens: 800,
      });

      const END_MARK = "END_OF_BLACKHOLE";
      let raw = out || "No results";
      if (searchResult) {
        raw = linkifyWebsearchCitations(raw, searchResult);
      }
      let completed = false;

      if (raw.includes(END_MARK)) {
        completed = true;
        raw = raw.replace(END_MARK, "").trim();
        // Nicely formatted closing marker for Telegram (horizontal rule + bold text)
        raw += "\n\n---\n**End of Blackhole analysis.**";
      }

      // Telegram messages are limited to ~4096 characters; keep Blackhole answers near that.
      let answer = raw.slice(0, 3500);
      // Avoid ending the first chunk mid-word or mid-sentence when possible.
      answer = trimIncompleteTail(answer);
      const newKey = makeId(6);
      
      // Store for Regen/Shorter/Longer/Continue buttons
      inlineCache.set(newKey, {
        prompt,
        answer,
        fullAnswer: raw,
        userId: pending.userId,
        model,
        mode: "blackhole",
        completed,
        part: 1,
        // Persist searchResult so future parts can reuse the same sources list
        searchResult: searchResult || null,
        createdAt: Date.now(),
      });
      setTimeout(() => inlineCache.delete(newKey), 30 * 60 * 1000);
      
      // Track in history
      addToHistory(pending.userId, prompt, "blackhole");
      
      // Convert and update
      const formattedAnswer = convertToTelegramHTML(answer);
      const escapedPrompt = escapeHTML(prompt);
      const partLabel = completed ? "Part 1 – final" : "Part 1";

      // Only show sources inline when the analysis is complete
      const sourcesHtml =
        completed && searchResult
          ? buildWebsearchSourcesInlineHtml(searchResult, ownerStr || pending.userId)
          : "";

      await bot.api.editMessageTextInline(
        inlineMessageId,
        `🗿🔬 <b>Blackhole Analysis (${partLabel}): ${escapedPrompt}</b>\n\n${formattedAnswer}${sourcesHtml}\n\n<i>via StarzAI • Blackhole • ${shortModel}</i>`,
        { 
          parse_mode: "HTML",
          reply_markup: inlineAnswerKeyboard(newKey)
        }
      );
      console.log(`Blackhole updated with AI response`);
      
    } catch (e) {
      console.error("Failed to get Blackhole response:", e.message);
      const escapedPrompt = escapeHTML(prompt);
      try {
        await bot.api.editMessageTextInline(
          inlineMessageId,
          `🗿🔬 <b>Blackhole Analysis: ${escapedPrompt}</b>\n\n⚠️ <i>Error getting response. Try again!</i>\n\n<i>via StarzAI</i>`,
          { parse_mode: "HTML" }
        );
      } catch {}
    }
    
    // Clean up pending
    inlineCache.delete(`bh_pending_${bhKey}`);
    return;
  }

  // Handle Blackhole continuation deferred response - bh_cont_start_KEY
  if (resultId.startsWith("bh_cont_start_")) {
    const contId = resultId.replace("bh_cont_start_", "");
    const pending = inlineCache.get(`bh_cont_pending_${contId}`);
    
    if (!pending || !inlineMessageId) {
      console.log(`Blackhole continuation pending not found or no inlineMessageId: contId=${contId}`);
      return;
    }

    const { baseKey, model, shortModel, userId: ownerId } = pending;
    const baseItem = inlineCache.get(baseKey);
    if (!baseItem || baseItem.mode !== "blackhole") {
      console.log(`Base Blackhole item missing for continuation: baseKey=${baseKey}`);
      try {
        await bot.api.editMessageTextInline(
          inlineMessageId,
          `🗿🔬 <b>Blackhole Analysis (cont.)</b>\n\n⚠️ <i>Session expired. Start a new Blackhole analysis.</i>`,
          { parse_mode: "HTML" }
        );
      } catch {}
      return;
    }

    if (String(ctx.from?.id || "") !== String(ownerId)) {
      console.log(`Blackhole continuation denied: not owner`);
      try {
        await bot.api.editMessageTextInline(
          inlineMessageId,
          `🗿🔬 <b>Blackhole Analysis (cont.)</b>\n\n⚠️ <i>Only the original requester can continue this analysis.</i>`,
          { parse_mode: "HTML" }
        );
      } catch {}
      return;
    }

    const prompt = baseItem.prompt || "";
    console.log(`Processing Blackhole continuation for prompt: ${prompt}`);

    try {
      const MAX_DISPLAY = 3500;
      const CONTEXT_LEN = 900;

      let fullAnswer = baseItem.fullAnswer || baseItem.answer || "";
      fullAnswer = trimIncompleteTail(fullAnswer);
      const context = fullAnswer.slice(-CONTEXT_LEN);

      const out = await llmText({
        model,
        messages: [
          {
            role: "system",
            content:
              "You are a research expert continuing a long, structured deep-dive (Blackhole mode). The text below may end mid-sentence; rewrite the ending smoothly and then continue the analysis. Keep the same structure and style as earlier sections: use headings, bullet points, and occasional quote blocks (lines starting with '>') for key takeaways. Do not reprint earlier sections verbatim; only extend from the end. When there is nothing important left to add, end your answer with a line containing only END_OF_BLACKHOLE.",
          },
          {
            role: "user",
            content: `TEXT SO FAR:\n${context}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 700,
      });

      const END_MARK = "END_OF_BLACKHOLE";
      let continuation = (out || "").trim();
      let completed = false;

      if (continuation.includes(END_MARK)) {
        completed = true;
        continuation = continuation.replace(END_MARK, "").trim();
        // Nicely formatted closing marker for Telegram (horizontal rule + bold text)
        continuation += "\n\n---\n**End of Blackhole analysis.**";
      }

      // Clean tail of continuation to avoid ending mid-word/mid-sentence when possible.
      continuation = trimIncompleteTail(continuation);

      const newFull = (fullAnswer + (continuation ? "\n\n" + continuation : "")).trim();

      const newKey = makeId(6);
      const part = (baseItem.part || 1) + 1;

      inlineCache.set(newKey, {
        prompt,
        answer: continuation.slice(0, MAX_DISPLAY),
        fullAnswer: newFull,
        userId: ownerId,
        model,
        mode: "blackhole",
        completed,
        part,
        // Carry forward any searchResult from the base item so final part can show sources
        searchResult: baseItem.searchResult || null,
        createdAt: Date.now(),
      });
      setTimeout(() => inlineCache.delete(newKey), 30 * 60 * 1000);

      // Update base item as well so future continues from any chunk share history
      baseItem.fullAnswer = newFull;
      baseItem.part = part;
      if (completed) baseItem.completed = true;
      inlineCache.set(baseKey, baseItem);

      const formattedAnswer = convertToTelegramHTML(continuation.slice(0, MAX_DISPLAY));
      const escapedPrompt = escapeHTML(prompt);
      const partLabel = completed ? `Part ${part} – final` : `Part ${part}`;
      const sourcesHtml =
        completed && baseItem.searchResult
          ? buildWebsearchSourcesInlineHtml(baseItem.searchResult, ownerId)
          : "";

      await bot.api.editMessageTextInline(
        inlineMessageId,
        `🗿🔬 <b>Blackhole Analysis (${partLabel}): ${escapedPrompt}</b>\n\n${formattedAnswer}${sourcesHtml}\n\n<i>via StarzAI • Blackhole • ${shortModel}</i>`,
        { 
          parse_mode: "HTML",
          reply_markup: inlineAnswerKeyboard(newKey),
        }
      );
      console.log(`Blackhole continuation updated with AI response`);
    } catch (e) {
      console.error("Failed to get Blackhole continuation response:", e.message);
      try {
        await bot.api.editMessageTextInline(
          inlineMessageId,
          `🗿🔬 <b>Blackhole Analysis (cont.)</b>\n\n⚠️ <i>Error getting continuation. Try again!</i>\n\n<i>via StarzAI</i>`,
          { parse_mode: "HTML" }
        );
      } catch {}
    }

    inlineCache.delete(`bh_cont_pending_${contId}`);
    return;
  }

  // Handle Ultra Summary deferred response - ultrasum_start_KEY
  if (resultId.startsWith("ultrasum_start_")) {
    const sumId = resultId.replace("ultrasum_start_", "");
    const pending = inlineCache.get(`ultrasum_pending_${sumId}`);

    if (!pending || !inlineMessageId) {
      console.log(`Ultra Summary pending not found or no inlineMessageId: sumId=${sumId}`);
      return;
    }

    const { baseKey, mode, model, shortModel, userId: ownerId } = pending;
    const ownerRec = getUserRecord(ownerId);
    if (ownerRec?.tier !== "ultra") {
      console.log("Ultra Summary denied: user not Ultra");
      try {
        await bot.api.editMessageTextInline(
          inlineMessageId,
          `🧾 <b>Ultra Summary</b>\n\n⚠️ <i>This feature is only available for Ultra users.</i>`,
          { parse_mode: "HTML" }
        );
      } catch {}
      inlineCache.delete(`ultrasum_pending_${sumId}`);
      return;
    }

    const baseItem = inlineCache.get(baseKey);
    if (!baseItem) {
      console.log(`Base item missing for Ultra Summary: baseKey=${baseKey}`);
      try {
        await bot.api.editMessageTextInline(
          inlineMessageId,
          `🧾 <b>Ultra Summary</b>\n\n⚠️ <i>Session expired. Run the answer again.</i>`,
          { parse_mode: "HTML" }
        );
      } catch {}
      return;
    }

    if (String(ctx.from?.id || "") !== String(ownerId)) {
      console.log(`Ultra Summary denied: not owner`);
      try {
        await bot.api.editMessageTextInline(
          inlineMessageId,
          `🧾 <b>Ultra Summary</b>\n\n⚠️ <i>Only the original requester can summarize this answer.</i>`,
          { parse_mode: "HTML" }
        );
      } catch {}
      return;
    }

    const full = (baseItem.fullAnswer || baseItem.answer || "").trim();
    if (!full || full.length < 50) {
      try {
        await bot.api.editMessageTextInline(
          inlineMessageId,
          `🧾 <b>Ultra Summary</b>\n\n⚠️ <i>Answer is too short to summarize.</i>`,
          { parse_mode: "HTML" }
        );
      } catch {}
      inlineCache.delete(`ultrasum_pending_${sumId}`);
      return;
    }

    const summaryInput = full.slice(0, 12000);
    let systemPrompt =
      "Summarize the content below into a brief, well-structured overview. Use short bullet points and 1–3 very short paragraphs at most. Keep the whole summary compact (no more than a few hundred words).";
    let titlePrefix = "Ultra Summary";
    let icon = "🧾 ";
    if (mode === "blackhole") {
      const parts = baseItem.part || 1;
      systemPrompt =
        `You are summarizing a multi-part deep-dive answer (Parts 1–${parts}). ` +
        "Provide 5–9 very short bullet points that capture the main arguments, key evidence, and final conclusions. " +
        "Avoid long paragraphs, quotes, or code. Keep it tight and scan-friendly.";
      titlePrefix = `Ultra Summary of Blackhole (${parts} part${parts > 1 ? "s" : ""})`;
      icon = "🗿🔬 ";
    } else if (mode === "code") {
      systemPrompt =
        "Summarize the programming answer in 4–7 concise bullet points. Describe the purpose of the code, the main steps, and how to run/use it. Mention languages and key functions or modules, but do not repeat long code snippets. Keep it short.";
      titlePrefix = "Ultra Summary of Code Answer";
      icon = "💻 ";
    } else if (mode === "explain") {
      systemPrompt =
        "Summarize the explanation in 3–6 very short bullet points so it's easy to scan. Each bullet should be 1 short sentence. Focus only on the core ideas.";
      titlePrefix = "Ultra Summary of Explanation";
      icon = "🧠 ";
    }

    try {
      const summaryOut = await llmText({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `TEXT TO SUMMARIZE:\n\n${summaryInput}` },
        ],
        temperature: 0.4,
        max_tokens: 260,
      });

      // Base truncation limit
      let summary = (summaryOut || "No summary available.").slice(0, 1200);

      // Clean up incomplete tail (mid-word / mid-sentence)
      summary = trimIncompleteTail(summary, 220);

      // Drop any dangling heading/bullet line at the very end (like "• Recent Discoveries:")
      const lines = summary.split("\n");
      while (lines.length > 0) {
        const last = lines[lines.length - 1].trim();
        if (!last) {
          // Drop empty trailing lines
          lines.pop();
          continue;
        }
        const isHeaderOnly =
          // Ends with ":" and has no period/question/exclamation afterwards
          (/[:：]\s*$/.test(last) && !/[.!?]\s*$/.test(last)) ||
          // Bullet with very short content
          (/^[•\-*]\s+.+$/.test(last) && last.length < 40);
        if (isHeaderOnly) {
          lines.pop();
          continue;
        }
        break;
      }
      summary = lines.join("\n").trim();

      const newKey = makeId(6);

      inlineCache.set(newKey, {
        prompt: baseItem.prompt || "",
        answer: summary,
        fullAnswer: summary,
        userId: ownerId,
        model,
        mode: "summarize",
        completed: true,
        createdAt: Date.now(),
      });
      setTimeout(() => inlineCache.delete(newKey), 30 * 60 * 1000);

      const formatted = convertToTelegramHTML(summary);
      const escapedPrompt = escapeHTML(baseItem.prompt || "");
      const title =
        mode === "blackhole"
          ? `${titlePrefix}: ${escapedPrompt}`
          : escapedPrompt
          ? `${titlePrefix}: ${escapedPrompt}`
          : titlePrefix;

      await bot.api.editMessageTextInline(
        inlineMessageId,
        `${icon} <b>${title}</b>\n\n${formatted}\n\n<i>via StarzAI • Ultra Summary • ${shortModel}</i>`,
        {
          parse_mode: "HTML",
          reply_markup: inlineAnswerKeyboard(newKey),
        }
      );
      console.log("Ultra Summary updated with AI response");
    } catch (e) {
      console.error("Failed to get Ultra Summary response:", e.message);
      try {
        await bot.api.editMessageTextInline(
          inlineMessageId,
          `🧾 <b>Ultra Summary</b>\n\n⚠️ <i>Error summarizing. Try again!</i>\n\n<i>via StarzAI</i>`,
          { parse_mode: "HTML" }
        );
      } catch {}
    }

    inlineCache.delete(`ultrasum_pending_${sumId}`);
    return;
  }
  
  // Handle Character intro - char_intro_KEY
  if (resultId.startsWith("char_intro_")) {
    const charKey = resultId.replace("char_intro_", "");
    const cached = inlineCache.get(charKey);
    
    if (cached && cached.character && inlineMessageId) {
      // Store the inline message ID so we can handle replies
      inlineCache.set(`char_msg_${charKey}`, {
        ...cached,
        inlineMessageId,
      });
      console.log(`Stored character intro inlineMessageId for key=${charKey}, character=${cached.character}`);
    }
    return;
  }
  
  // Handle Research deferred response - r_start_KEY
  if (resultId.startsWith("r_start_")) {
    const rKey = resultId.replace("r_start_", "");
    const pending = inlineCache.get(`r_pending_${rKey}`);
    
    if (!pending || !inlineMessageId) {
      console.log(`Research pending not found or no inlineMessageId: rKey=${rKey}`);
      return;
    }
    
    const { prompt, model, shortModel } = pending;
    console.log(`Processing Research: ${prompt}`);
    
    try {
      const out = await llmText({
        model,
        messages: [
          {
            role: "system",
            content:
              "You are a research assistant. Give a concise but informative answer in 2-3 paragraphs. Be direct, but use Markdown headings, bullet points, and occasional quote blocks (lines starting with '>') for key takeaways so the answer is easy to scan.",
          },
          { role: "user", content: `Briefly explain: ${prompt}` },
        ],
        temperature: 0.7,
        max_tokens: 400,
      });
      
      const answer = (out || "No results").slice(0, 2000);
      const newKey = makeId(6);
      
      // Store for Regen/Shorter/Longer/Continue buttons
      inlineCache.set(newKey, {
        prompt,
        answer,
        userId: pending.userId,
        model,
        mode: "research",
        createdAt: Date.now(),
      });
      setTimeout(() => inlineCache.delete(newKey), 30 * 60 * 1000);
      
      // Track in history
      addToHistory(pending.userId, prompt, "research");
      
      // Convert and update
      const formattedAnswer = convertToTelegramHTML(answer);
      const escapedPrompt = escapeHTML(prompt);
      
      await bot.api.editMessageTextInline(
        inlineMessageId,
        `🔍 <b>Research: ${escapedPrompt}</b>\\n\\n${formattedAnswer}\\n\\n<i>via StarzAI • ${shortModel}</i>`,
        { 
          parse_mode: "HTML",
          reply_markup: inlineAnswerKeyboard(newKey),
        }
      );
      console.log("Research updated with AI response");
    } catch (e) {
      console.error("Failed to get Research response:", e.message);
      try {
        await bot.api.editMessageTextInline(
          inlineMessageId,
          `🔍 <b>Research</b>\\n\\n⚠️ <i>Error getting response. Try again!</i>\\n\\n<i>via StarzAI</i>`,
          { parse_mode: "HTML" }
        );
      } catch {}
    }
    
    inlineCache.delete(`r_pending_${rKey}`);
    return;
  }

  // Handle Websearch deferred response - w_start_KEY
  if (resultId.startsWith("w_start_")) {
    const wKey = resultId.replace("w_start_", "");
    const pending = inlineCache.get(`w_pending_${wKey}`);
    
    if (!pending || !inlineMessageId) {
      console.log(`Websearch pending not found or no inlineMessageId: wKey=${wKey}`);
      return;
    }
    
    const { prompt, model, shortModel, userId: ownerId } = pending;
    console.log(`Processing Websearch: ${prompt}`);
    
    try {
      const quota = consumeWebsearchQuota(ownerId);
      const startTime = Date.now();
      let answerRaw = "";
      let footerHtml = "";
      let sourcesHtml = "";
      let formattedAnswer = "";

      if (!quota.allowed) {
        // Quota exhausted: answer without live websearch
        console.log(
          `Websearch quota exhausted for user ${ownerId} in inline mode: used=${quota.used}, limit=${quota.limit}`
        );

        const offline = await llmText({
          model,
          messages: [
            {
              role: "system",
              content:
                "You are a helpful assistant. You currently do NOT have access to live web search for this request. " +
                "Answer based on your existing knowledge only. If you are unsure or information may be outdated, say so clearly.",
            },
            {
              role: "user",
              content: `Question (no live websearch available): ${prompt}`,
            },
          ],
          temperature: 0.7,
          max_tokens: 800,
        });

        answerRaw = offline || "No answer generated.";
        const escapedPrompt = escapeHTML(prompt);
        formattedAnswer = convertToTelegramHTML(answerRaw.slice(0, 3500));
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        footerHtml = `\\n\\n<i>⚠️ Daily websearch limit reached — answered without live web results • ${elapsed}s • ${shortModel}</i>`;
        
        const newKey = makeId(6);
        inlineCache.set(newKey, {
          prompt,
          answer: answerRaw,
          userId: String(ownerId),
          model,
          mode: "websearch",
          createdAt: Date.now(),
        });
        setTimeout(() => inlineCache.delete(newKey), 30 * 60 * 1000);

        await bot.api.editMessageTextInline(
          inlineMessageId,
          `🌐 <b>Websearch</b>\\n\\n<b>Query:</b> <i>${escapedPrompt}</i>\\n\\n${formattedAnswer}${footerHtml}`,
          {
            parse_mode: "HTML",
            reply_markup: inlineAnswerKeyboard(newKey),
          }
        );
        console.log("Websearch (offline) updated with AI response");
      } else {
        // Quota available: run live web search
        const searchResult = await webSearch(prompt, 5);
        
        if (!searchResult.success) {
          const errMsg = `❌ Websearch failed: ${escapeHTML(searchResult.error || "Unknown error")}`;
          await bot.api.editMessageTextInline(
            inlineMessageId,
            errMsg,
            { parse_mode: "HTML" }
          );
          inlineCache.delete(`w_pending_${wKey}`);
          return;
        }
        
        const searchContext = formatSearchResultsForAI(searchResult);
        
        const aiResponse = await llmText({
          model,
          messages: [
            {
              role: "system",
              content:
                "You are a helpful assistant with access to real-time web search results.\n" +
                "\n" +
                "CRITICAL CITATION INSTRUCTIONS:\n" +
                "• Every non-obvious factual claim should be backed by a source index like [1], [2], etc.\n" +
                "• When you summarize multiple sources, include multiple indices, e.g. [1][3].\n" +
                "• If you mention a specific number, date, name, or quote, always attach the source index.\n" +
                "• Never invent citations; only use indices that exist in the search results.\n" +
                "\n" +
                "GENERAL STYLE:\n" +
                "• Use short paragraphs and bullet points so the answer is easy to scan.\n" +
                "• Make it clear which parts come from which sources via [index] references.\n" +
                "• For short verbatim excerpts (1–2 sentences), use quote blocks (lines starting with '>').\n" +
                "• If the search results don't contain relevant information, say so explicitly.",
            },
            {
              role: "user",
              content:
                `${searchContext}\\n\\n` +
                `User's question: ${prompt}\\n\\n` +
                "The numbered search results above are your ONLY sources of truth. " +
                "Write an answer that:\n" +
                "1) Directly answers the user's question, and\n" +
                "2) Explicitly cites sources using [1], [2], etc next to the claims.\n" +
                "Do not cite sources that are not provided.",
            },
          ],
          temperature: 0.6,
          max_tokens: 800,
        });
        
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

        answerRaw = aiResponse || "No answer generated.";
        answerRaw = linkifyWebsearchCitations(answerRaw, searchResult);

        const escapedPrompt = escapeHTML(prompt);
        sourcesHtml = buildWebsearchSourcesInlineHtml(searchResult, ownerId);
        formattedAnswer = convertToTelegramHTML(answerRaw.slice(0, 3500));
        footerHtml = `\\n\\n<i>🌐 ${searchResult.results.length} sources • ${elapsed}s • ${shortModel}</i>`;
        
        const newKey = makeId(6);
        inlineCache.set(newKey, {
          prompt,
          answer: answerRaw,
          userId: String(ownerId),
          model,
          mode: "websearch",
          createdAt: Date.now(),
        });
        setTimeout(() => inlineCache.delete(newKey), 30 * 60 * 1000);
        
        await bot.api.editMessageTextInline(
          inlineMessageId,
          `🌐 <b>Websearch</b>\\n\\n<b>Query:</b> <i>${escapedPrompt}</i>\\n\\n${formattedAnswer}${sourcesHtml}${footerHtml}`,
          { 
            parse_mode: "HTML",
            reply_markup: inlineAnswerKeyboard(newKey),
          }
        );
        console.log("Websearch updated with AI response");
      }
    } catch (e) {
      console.error("Failed to get Websearch response:", e.message);
      try {
        await bot.api.editMessageTextInline(
          inlineMessageId,
          `🌐 <b>Websearch</b>\\n\\n⚠️ <i>Error getting response. Try again!</i>`,
          { parse_mode: "HTML" }
        );
      } catch {}
    }
    
    inlineCache.delete(`w_pending_${wKey}`);
    return;
  }
  
  // Handle Quark deferred response - q_start_KEY
  // Now optionally uses web search when Web mode is ON or the question looks time-sensitive.
  if (resultId.startsWith("q_start_")) {
    const qKey = resultId.replace("q_start_", "");
    const pending = inlineCache.get(`q_pending_${qKey}`);
    
    if (!pending || !inlineMessageId) {
      console.log(`Quark pending not found or no inlineMessageId: qKey=${qKey}`);
      return;
    }
    
    const { prompt, model, shortModel, userId: ownerId } = pending;
    const ownerStr = String(ownerId || pending.userId || "");
    console.log(`Processing Quark: ${prompt}`);
    
    try {
      const userRec = ownerStr ? getUserRecord(ownerStr) : null;
      const wantsWebsearch = (userRec?.webSearch || needsWebSearch(prompt));
      
      // Try websearch-backed Quark answer first if desired and quota available
      if (wantsWebsearch && ownerStr) {
        const quota = consumeWebsearchQuota(ownerId || ownerStr);
        if (quota.allowed) {
          try {
            const searchResult = await webSearch(prompt, 5);
            if (searchResult.success && Array.isArray(searchResult.results) && searchResult.results.length > 0) {
              const searchContext = formatSearchResultsForAI(searchResult);
  
              const aiResponse = await llmText({
                model,
                messages: [
                  {
                    role: "system",
                    content:
                      "You are a helpful assistant with access to real-time web search results.\n" +
                      "Answer in at most 2 short sentences while staying accurate.\n" +
                      "\n" +
                      "CRITICAL CITATION INSTRUCTIONS:\n" +
                      "• Every non-obvious factual claim should be backed by a source index like [1], [2], etc.\n" +
                      "• If you summarize multiple sources, include multiple indices, e.g. [1][3].\n" +
                      "• For concrete numbers, dates, or names, always attach the source index.\n" +
                      "• Never invent citations; only use indices that exist in the search results."
                  },
                  {
                    role: "user",
                    content:
                      `${searchContext}\n\n` +
                      `User's question: ${prompt}\n\n` +
                      "Write a direct, compact answer (1–2 sentences maximum) based ONLY on the search results above, and attach [n] citations to the key factual claims."
                  }
                ],
                temperature: 0.5,
                max_tokens: 220,
              });
  
              let answer = aiResponse || "No answer";
              answer = linkifyWebsearchCitations(answer, searchResult).slice(0, 600);
  
              const newKey = makeId(6);
  
              inlineCache.set(newKey, {
                prompt,
                answer,
                userId: ownerStr,
                model,
                mode: "quark",
                createdAt: Date.now(),
              });
              setTimeout(() => inlineCache.delete(newKey), 30 * 60 * 1000);
  
              addToHistory(ownerStr, prompt, "quark");
  
              const formattedAnswer = convertToTelegramHTML(answer);
              const escapedPrompt = escapeHTML(prompt);
              const sourcesHtml = buildWebsearchSourcesInlineHtml(searchResult, ownerStr);
  
              await bot.api.editMessageTextInline(
                inlineMessageId,
                `⭐ <b>${escapedPrompt}</b>\n\n${formattedAnswer}${sourcesHtml}\n\n<i>via StarzAI • Quark • ${shortModel}</i>`,
                { 
                  parse_mode: "HTML",
                  // Quark intentionally has no Continue button
                  reply_markup: inlineAnswerKeyboard(newKey)
                }
              );
              console.log("Quark (websearch) updated with AI response");
              inlineCache.delete(`q_pending_${qKey}`);
              return;
            }
          } catch (webErr) {
            console.log("Quark websearch failed:", webErr.message || webErr);
            // Fall through to offline Quark
          }
        } else {
          console.log(
            `Quark websearch quota exhausted for user ${ownerStr}: used=${quota.used}, limit=${quota.limit}`
          );
        }
      }
    
      // Offline Quark answer (fallback)
      const out = await llmText({
        model,
        messages: [
          { role: "system", content: "Give extremely concise answers. 1-2 sentences max. Be direct and to the point. No fluff." },
          { role: "user", content: prompt },
        ],
        temperature: 0.5,
        max_tokens: 100,
      });
      
      const answer = (out || "No answer").slice(0, 500);
      const newKey = makeId(6);
      
      inlineCache.set(newKey, {
        prompt,
        answer,
        userId: pending.userId,
        model,
        mode: "quark",
        createdAt: Date.now(),
      });
      setTimeout(() => inlineCache.delete(newKey), 30 * 60 * 1000);
      
      addToHistory(pending.userId, prompt, "quark");
      
      const formattedAnswer = convertToTelegramHTML(answer);
      const escapedPrompt = escapeHTML(prompt);
      
      await bot.api.editMessageTextInline(
        inlineMessageId,
        `⭐ <b>${escapedPrompt}</b>\n\n${formattedAnswer}\n\n<i>via StarzAI • Quark • ${shortModel}</i>`,
        { 
          parse_mode: "HTML",
          // Quark intentionally has no Continue button
          reply_markup: inlineAnswerKeyboard(newKey)
        }
      );
      console.log(`Quark updated with AI response`);
      
    } catch (e) {
      console.error("Failed to get Quark response:", e.message);
      const escapedPrompt = escapeHTML(prompt);
      try {
        await bot.api.editMessageTextInline(
          inlineMessageId,
          `⭐ <b>${escapedPrompt}</b>\n\n⚠️ <i>Error getting response. Try again!</i>\n\n<i>via StarzAI</i>`,
          { parse_mode: "HTML" }
        );
      } catch {}
    }
    
    inlineCache.delete(`q_pending_${qKey}`);
    return;
  }
  
  // Helper to avoid cutting code blocks in the middle for Code mode answers.
  // We try to cut AFTER the last complete fenced block (``` ... ```) that fits
  // within maxLen. If none, we fall back to cutting at a newline near maxLen.
  // Returns the visible chunk, remaining text, whether we're done, and the
  // index in `full` where we cut.
  function splitCodeAnswerForDisplay(full, maxLen = 3500) {
    if (!full) return { visible: "", remaining: "", completed: true, cutIndex: 0 };
    if (full.length <= maxLen) {
      return { visible: full, remaining: "", completed: true, cutIndex: full.length };
    }

    const fence = "```";
    const positions = [];
    let idx = 0;
    while (true) {
      const found = full.indexOf(fence, idx);
      if (found === -1) break;
      positions.push(found);
      idx = found + fence.length;
    }

    let cutoff = -1;

    if (positions.length >= 2) {
      // Pair fences as open/close in order and find the last complete block
      // whose closing fence is within maxLen.
      for (let i = 0; i + 1 < positions.length; i += 2) {
        const openIdx = positions[i];
        const closeIdx = positions[i + 1] + fence.length; // include closing fence
        if (closeIdx <= maxLen) {
          cutoff = closeIdx;
        } else {
          break;
        }
      }
    }

    // If we didn't find any complete fenced block within maxLen, fall back to
    // cutting at a newline near maxLen so we don't split mid-line.
    if (cutoff === -1) {
      const fallback = full.lastIndexOf("\n", maxLen);
      cutoff = fallback > 0 ? fallback : maxLen;
    }

    const visible = full.slice(0, cutoff).trimEnd();
    const remaining = full.slice(cutoff).trimStart();
    return { visible, remaining, completed: remaining.length === 0, cutIndex: cutoff };
  }

  // Handle Code deferred response - code_start_KEY
  if (resultId.startsWith("code_start_")) {
    const codeKey = resultId.replace("code_start_", "");
    const pending = inlineCache.get(`code_pending_${codeKey}`);
    
    if (!pending || !inlineMessageId) {
      console.log(`Code pending not found or no inlineMessageId: codeKey=${codeKey}`);
      return;
    }
    
    const { prompt, model, shortModel } = pending;
    console.log(`Processing Code: ${prompt}`);
    
    try {
      const out = await llmText({
        model,
        messages: [
          {
            role: "system",
            content:
              "You are an expert programmer. Provide clear, working code with brief explanations. Always format code using fenced code blocks with language tags, like ```python ... ```. Focus on best practices and clean, idiomatic code. If the user is asking for multiple sizeable code snippets (e.g., in two different languages), prioritize the first main implementation and be willing to let additional full implementations be shown in a continuation.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 700,
      });
      
      const raw = out || "No code";
      const { visible, remaining, completed, cutIndex } = splitCodeAnswerForDisplay(raw, 3500);
      const answer = visible;
      const newKey = makeId(6);
      
      inlineCache.set(newKey, {
        prompt,
        answer,
        fullAnswer: raw,
        cursor: cutIndex,
        userId: pending.userId,
        model,
        mode: "code",
        completed,
        createdAt: Date.now(),
      });
      setTimeout(() => inlineCache.delete(newKey), 30 * 60 * 1000);
      
      addToHistory(pending.userId, prompt, "code");
      
      const formattedAnswer = convertToTelegramHTML(answer);
      const escapedPrompt = escapeHTML(prompt);
      
      await bot.api.editMessageTextInline(
        inlineMessageId,
        `💻 <b>Code: ${escapedPrompt}</b>\n\n${formattedAnswer}\n\n<i>via StarzAI • Code • ${shortModel}</i>`,
        { 
          parse_mode: "HTML",
          reply_markup: inlineAnswerKeyboard(newKey)
        }
      );
      console.log(`Code updated with AI response`);
      
    } catch (e) {
      console.error("Failed to get Code response:", e.message);
      const escapedPrompt = escapeHTML(prompt);
      try {
        await bot.api.editMessageTextInline(
          inlineMessageId,
          `💻 <b>Code: ${escapedPrompt}</b>\n\n⚠️ <i>Error getting response. Try again!</i>\n\n<i>via StarzAI</i>`,
          { parse_mode: "HTML" }
        );
      } catch {}
    }
    
    inlineCache.delete(`code_pending_${codeKey}`);
    return;
  }
  
  // Handle Explain deferred response - e_start_KEY
  if (resultId.startsWith("e_start_")) {
    const eKey = resultId.replace("e_start_", "");
    const pending = inlineCache.get(`e_pending_${eKey}`);
    
    if (!pending || !inlineMessageId) {
      console.log(`Explain pending not found or no inlineMessageId: eKey=${eKey}`);
      return;
    }
    
    const { prompt, model, shortModel } = pending;
    console.log(`Processing Explain: ${prompt}`);
    
    try {
      const out = await llmText({
        model,
        messages: [
          { role: "system", content: "Explain concepts in the simplest possible way, like explaining to a 5-year-old (ELI5). Use analogies, simple words, and relatable examples. Avoid jargon. Make it fun and easy to understand." },
          { role: "user", content: `Explain simply: ${prompt}` },
        ],
        temperature: 0.7,
        max_tokens: 400,
      });
      
      const raw = out || "No explanation";
      const maxLen = 1500;
      let visible = raw;
      let cursor = raw.length;
      let completed = true;

      if (raw.length > maxLen) {
        // Prefer to cut at a sentence or word boundary near the limit
        const slice = raw.slice(0, maxLen);
        let cutoff = slice.length;

        const windowSize = 200;
        const windowStart = Math.max(0, cutoff - windowSize);
        const windowText = slice.slice(windowStart, cutoff);

        let rel = Math.max(
          windowText.lastIndexOf(". "),
          windowText.lastIndexOf("! "),
          windowText.lastIndexOf("? ")
        );
        if (rel !== -1) {
          cutoff = windowStart + rel + 2; // include punctuation + space
        } else {
          const spaceRel = windowText.lastIndexOf(" ");
          if (spaceRel !== -1) {
            cutoff = windowStart + spaceRel;
          }
        }

        visible = slice.slice(0, cutoff).trimEnd();
        cursor = visible.length;
        completed = cursor >= raw.length;
      }

      const answer = visible;
      const newKey = makeId(6);
      const part = 1;
      
      inlineCache.set(newKey, {
        prompt,
        answer,
        fullAnswer: raw,
        cursor,
        userId: pending.userId,
        model,
        shortModel,
        mode: "explain",
        part,
        completed,
        createdAt: Date.now(),
      });
      setTimeout(() => inlineCache.delete(newKey), 30 * 60 * 1000);
      
      addToHistory(pending.userId, prompt, "explain");
      
      const formattedAnswer = convertToTelegramHTML(answer);
      const escapedPrompt = escapeHTML(prompt);
      const headerLabel = completed ? "Full Explanation" : "Explanation (Part 1)";
      
      await bot.api.editMessageTextInline(
        inlineMessageId,
        `🧠 <b>${headerLabel}: ${escapedPrompt}</b>\n\n${formattedAnswer}\n\n<i>via StarzAI • Explain • ${shortModel}</i>`,
        { 
          parse_mode: "HTML",
          reply_markup: inlineAnswerKeyboard(newKey)
        }
      );
      console.log(`Explain updated with AI response`);
      
    } catch (e) {
      console.error("Failed to get Explain response:", e.message);
      const escapedPrompt = escapeHTML(prompt);
      try {
        await bot.api.editMessageTextInline(
          inlineMessageId,
          `🧠 <b>Explain: ${escapedPrompt}</b>\n\n⚠️ <i>Error getting response. Try again!</i>\n\n<i>via StarzAI</i>`,
          { parse_mode: "HTML" }
        );
      } catch {}
    }
    
    inlineCache.delete(`e_pending_${eKey}`);
    return;
  }
  
  // Handle Summarize deferred response - sum_start_KEY
  if (resultId.startsWith("sum_start_")) {
    const sumKey = resultId.replace("sum_start_", "");
    const pending = inlineCache.get(`sum_pending_${sumKey}`);
    
    if (!pending || !inlineMessageId) {
      console.log(`Summarize pending not found or no inlineMessageId: sumKey=${sumKey}`);
      return;
    }
    
    const { prompt, model, shortModel } = pending;
    console.log(`Processing Summarize`);
    
    try {
      const out = await llmText({
        model,
        messages: [
          { role: "system", content: "Summarize the given text concisely. Extract key points and main ideas. Use bullet points if helpful. Keep it brief but comprehensive." },
          { role: "user", content: `Summarize this:\n\n${prompt}` },
        ],
        temperature: 0.3,
        max_tokens: 400,
      });
      
      const answer = (out || "Could not summarize").slice(0, 1500);
      const newKey = makeId(6);
      
      inlineCache.set(newKey, {
        prompt: prompt.slice(0, 200) + "...",
        answer,
        userId: pending.userId,
        model,
        mode: "summarize",
        createdAt: Date.now(),
      });
      setTimeout(() => inlineCache.delete(newKey), 30 * 60 * 1000);
      
      addToHistory(pending.userId, prompt.slice(0, 50), "summarize");
      
      const formattedAnswer = convertToTelegramHTML(answer);
      
      await bot.api.editMessageTextInline(
        inlineMessageId,
        `📝 <b>Summary</b>\n\n${formattedAnswer}\n\n<i>via StarzAI • Summarize • ${shortModel}</i>`,
        { 
          parse_mode: "HTML",
          reply_markup: inlineAnswerKeyboard(newKey)
        }
      );
      console.log(`Summarize updated with AI response`);
      
    } catch (e) {
      console.error("Failed to get Summarize response:", e.message);
      try {
        await bot.api.editMessageTextInline(
          inlineMessageId,
          `📝 <b>Summary</b>\n\n⚠️ <i>Error summarizing. Try again!</i>\n\n<i>via StarzAI</i>`,
          { parse_mode: "HTML" }
        );
      } catch {}
    }
    
    inlineCache.delete(`sum_pending_${sumKey}`);
    return;
  }
  
  // Handle Partner deferred response - p_start_KEY
  if (resultId.startsWith("p_start_")) {
    const pKey = resultId.replace("p_start_", "");
    const pending = inlineCache.get(`p_pending_${pKey}`);
    
    if (!pending || !inlineMessageId) {
      console.log(`Partner pending not found or no inlineMessageId: pKey=${pKey}`);
      return;
    }
    
    const { prompt, model, shortModel, partner } = pending;
    console.log(`Processing Partner: ${prompt}`);
    
    try {
      const systemPrompt = buildPartnerSystemPrompt(partner);
      const partnerHistory = getPartnerChatHistory(pending.userId);
      
      const messages = [
        { role: "system", content: systemPrompt },
        ...partnerHistory.slice(-6).map(m => ({ role: m.role, content: m.content })),
        { role: "user", content: prompt },
      ];
      
      const out = await llmText({
        model,
        messages,
        temperature: 0.85,
        max_tokens: 400,
      });
      
      const answer = (out || "*stays silent*").slice(0, 1500);
      const newKey = makeId(6);
      
      inlineCache.set(newKey, {
        prompt,
        answer,
        userId: pending.userId,
        model,
        isPartner: true,
        partnerName: partner.name,
        createdAt: Date.now(),
      });
      setTimeout(() => inlineCache.delete(newKey), 30 * 60 * 1000);
      
      addPartnerMessage(pending.userId, "user", prompt);
      addPartnerMessage(pending.userId, "assistant", answer);
      
      const formattedAnswer = convertToTelegramHTML(answer);
      const escapedPartnerName = escapeHTML(partner.name);
      
      await bot.api.editMessageTextInline(
        inlineMessageId,
        `🤝🏻 <b>${escapedPartnerName}</b>\n\n${formattedAnswer}\n\n<i>via StarzAI • Partner • ${shortModel}</i>`,
        { 
          parse_mode: "HTML",
          reply_markup: new InlineKeyboard()
            .switchInlineCurrent("💬 Reply", `p: `)
            .text("🔁 Regen", `inl_regen:${newKey}`)
        }
      );
      console.log(`Partner updated with AI response`);
      
    } catch (e) {
      console.error("Failed to get Partner response:", e.message);
      const escapedPartnerName = escapeHTML(partner.name);
      try {
        await bot.api.editMessageTextInline(
          inlineMessageId,
          `🤝🏻 <b>${escapedPartnerName}</b>\n\n⚠️ <i>Error getting response. Try again!</i>\n\n<i>via StarzAI</i>`,
          { parse_mode: "HTML" }
        );
      } catch {}
    }
    
    inlineCache.delete(`p_pending_${pKey}`);
    return;
  }
  
  // Handle Starz Check - store the inline_message_id for later updates
  if (resultId.startsWith("starz_check_")) {
    const checkKey = resultId.replace("starz_check_", "");
    const userId = String(ctx.from?.id || "");
    
    if (inlineMessageId && userId) {
      // Store the inline message ID so we can update it when tasks change
      inlineCache.set(`sc_msg_${userId}`, {
        inlineMessageId,
        timestamp: Date.now(),
      });
      console.log(`Stored Starz Check inlineMessageId for user ${userId}`);
    }
    return;
  }
  
  // Handle t:add - add task, delete new message, update original
  if (resultId.startsWith("tadd_")) {
    const addKey = resultId.replace("tadd_", "");
    const pending = inlineCache.get(`tadd_pending_${addKey}`);
    
    if (!pending) {
      console.log(`Task add pending not found: addKey=${addKey}`);
      return;
    }
    
    const { userId, taskText, chatId } = pending;
    console.log(`Processing task add: ${taskText} for user ${userId}`);
    
    // Parse and add the task
    const parsed = parseTaskText(taskText);
    const userTodos = getUserTodos(userId);
    const newTask = {
      id: makeId(8),
      text: parsed.text || taskText,
      completed: false,
      priority: parsed.priority || 'low',
      category: parsed.category || 'personal',
      dueDate: parsed.dueDate || null,
      createdAt: new Date().toISOString(),
      completedAt: null,
    };
    userTodos.tasks.push(newTask);
    saveTodos();
    
    // Try to delete the "Task Added" message we just sent
    if (inlineMessageId) {
      try {
        // We can't delete inline messages, but we can edit them to be minimal
        await bot.api.editMessageTextInline(
          inlineMessageId,
          `✅ Added: ${parsed.text || taskText}`,
          { parse_mode: "HTML" }
        );
      } catch (e) {
        console.log("Could not edit task added message:", e.message);
      }
    }
    
    // Try to update the original Starz Check message
    const scMsg = inlineCache.get(`sc_msg_${userId}`);
    if (scMsg && scMsg.inlineMessageId) {
      try {
        const tasks = userTodos.tasks || [];
        const streak = getCompletionStreak(userId);
        
        // Build compact task list
        let text = `✅ Starz Check`;
        if (streak > 0) text += ` 🔥${streak}`;
        
        const keyboard = new InlineKeyboard();
        
        // Add task buttons (max 8 to fit)
        const displayTasks = tasks.slice(0, 8);
        displayTasks.forEach((task, idx) => {
          if (!task || !task.text) return; // Skip invalid tasks
          const check = task.completed ? '✅' : '⬜';
          const cat = getCategoryEmoji(task.category);
          const pri = task.priority === 'high' ? '🔴' : task.priority === 'medium' ? '🟡' : '';
          const overdue = !task.completed && isOverdue(task.dueDate) ? '⚠️' : '';
          const label = `${check} ${task.text.slice(0, 20)}${task.text.length > 20 ? '...' : ''} ${cat}${pri}${overdue}`.trim();
          keyboard.text(label, `itodo_tap:${task.id}`).row();
        });
        
        if (tasks.length > 8) {
          keyboard.text(`... +${tasks.length - 8} more`, "itodo_back").row();
        }
        
        // Action buttons
        keyboard
          .switchInlineCurrent("➕", "t:add ")
          .text("🔍", "itodo_filter")
          .text("👥", "itodo_collab")
          .row()
          .text("← Back", "inline_main_menu");
        
        await bot.api.editMessageTextInline(
          scMsg.inlineMessageId,
          text,
          {
            parse_mode: "HTML",
            reply_markup: keyboard,
          }
        );
        console.log(`Updated original Starz Check message for user ${userId}`);
      } catch (e) {
        console.log("Could not update original Starz Check message:", e.message);
      }
    }
    
    inlineCache.delete(`tadd_pending_${addKey}`);
    return;
  }
  
  // Handle tedit - edit task, update original message
  if (resultId.startsWith("tedit_")) {
    const editKey = resultId.replace("tedit_", "");
    const pending = inlineCache.get(`tedit_pending_${editKey}`);
    
    if (!pending) {
      console.log(`Task edit pending not found: editKey=${editKey}`);
      return;
    }
    
    const { userId, taskId, newText } = pending;
    console.log(`Processing task edit: ${taskId} -> ${newText} for user ${userId}`);
    
    // Apply the edit
    const userTodos = getUserTodos(userId);
    const taskIndex = userTodos.tasks.findIndex(t => t.id === taskId);
    if (taskIndex !== -1) {
      userTodos.tasks[taskIndex].text = newText;
      userTodos.tasks[taskIndex].updatedAt = new Date().toISOString();
      saveTodos();
    }
    
    // Try to update the original Starz Check message
    const scMsg = inlineCache.get(`sc_msg_${userId}`);
    if (scMsg && scMsg.inlineMessageId) {
      try {
        const tasks = userTodos.tasks || [];
        const streak = getCompletionStreak(userId);
        
        // Build compact task list
        let text = `\u2705 Starz Check`;
        if (streak > 0) text += ` \ud83d\udd25${streak}`;
        
        const keyboard = new InlineKeyboard();
        
        // Add task buttons (max 8 to fit)
        const displayTasks = tasks.slice(0, 8);
        displayTasks.forEach((task, idx) => {
          if (!task || !task.text) return;
          const check = task.completed ? '\u2705' : '\u2b1c';
          const cat = getCategoryEmoji(task.category);
          const pri = task.priority === 'high' ? '\ud83d\udd34' : task.priority === 'medium' ? '\ud83d\udfe1' : '';
          const overdue = !task.completed && isOverdue(task.dueDate) ? '\u26a0\ufe0f' : '';
          const label = `${check} ${task.text.slice(0, 20)}${task.text.length > 20 ? '...' : ''} ${cat}${pri}${overdue}`.trim();
          keyboard.text(label, `itodo_tap:${task.id}`).row();
        });
        
        if (tasks.length > 8) {
          keyboard.text(`... +${tasks.length - 8} more`, "itodo_back").row();
        }
        
        // Action buttons
        keyboard
          .switchInlineCurrent("\u2795", "t:add ")
          .text("\ud83d\udd0d", "itodo_filter")
          .text("\ud83d\udc65", "itodo_collab")
          .row()
          .text("\u2190 Back", "inline_main_menu");
        
        await bot.api.editMessageTextInline(
          scMsg.inlineMessageId,
          text,
          {
            parse_mode: "HTML",
            reply_markup: keyboard,
          }
        );
        console.log(`Updated original Starz Check message after edit for user ${userId}`);
      } catch (e) {
        console.log("Could not update original Starz Check message:", e.message);
      }
    }
    
    inlineCache.delete(`tedit_pending_${editKey}`);
    return;
  }
  
});

// =====================
// INLINE BUTTON ACTIONS (Legacy)
// =====================
async function editInlineMessage(ctx, newText, key) {
  const htmlText = convertToTelegramHTML(newText.slice(0, 3500));
  await ctx.editMessageText(htmlText, {
    parse_mode: "HTML",
    reply_markup: inlineAnswerKeyboard(key),
  });
}

async function doInlineTransform(ctx, mode) {
  if (!(await enforceRateLimit(ctx))) return;

  const data = ctx.callbackQuery.data;
  const key = data.split(":")[1];
  const item = inlineCache.get(key);

  if (!item) {
    return ctx.answerCallbackQuery({
      text: "This inline result expired. Ask again inline.",
      show_alert: true,
    });
  }

  const actor = ctx.from?.id ? String(ctx.from.id) : "";
  if (actor !== item.userId) {
    return ctx.answerCallbackQuery({
      text: "Only the original requester can use these buttons.",
      show_alert: true,
    });
  }

  // Revert: restore original answer (if available) without changing tier counts
  if (mode === "revert") {
    if (!item.originalAnswer) {
      return ctx.answerCallbackQuery({
        text: "Nothing to revert.",
        show_alert: true,
      });
    }

    item.answer = item.originalAnswer;
    if (item.fullAnswer) {
      item.fullAnswer = item.originalAnswer;
    }

    inlineCache.set(key, item);
    await editInlineMessage(ctx, item.answer, key);
    await ctx.answerCallbackQuery({ text: "Reverted.", show_alert: false });
    return;
  }

  // Regen limit check per tier (per answer)
  if (mode === "regen") {
    const userRec = getUserRecord(item.userId);
    const tier = userRec?.tier || "free";
    if (typeof item.regenCount !== "number") item.regenCount = 0;

    let maxRegen = 1;
    if (tier === "ultra") maxRegen = 3;
    else if (tier === "premium") maxRegen = 2;

    if (item.regenCount >= maxRegen) {
      return ctx.answerCallbackQuery({
        text: "Regen limit reached for this answer.",
        show_alert: true,
      });
    }
  }

  await ctx.answerCallbackQuery({ text: "Working..." });

  try {
    let newAnswer = item.answer;

    if (mode === "regen") {
      newAnswer = await llmText({
        model: item.model,
        messages: [
          { role: "system", content: "Answer clearly. Don't mention system messages." },
          { role: "user", content: item.prompt },
        ],
        temperature: 0.9,
        max_tokens: 260,
      });

      // Reset transform metadata on regen
      delete item.originalAnswer;
      item.shortCount = 0;
      item.longCount = 0;
      item.transformsUsed = 0;
      item.shortLongLocked = false;

      item.regenCount = (item.regenCount || 0) + 1;
    }

    if (mode === "short" || mode === "long") {
      const userRec = getUserRecord(item.userId);
      const tier = userRec?.tier || "free";

      // Initialize transform metadata if missing
      if (!item.originalAnswer) item.originalAnswer = item.answer;
      if (typeof item.shortCount !== "number") item.shortCount = 0;
      if (typeof item.longCount !== "number") item.longCount = 0;
      if (typeof item.transformsUsed !== "number") item.transformsUsed = 0;
      if (typeof item.shortLongLocked !== "boolean") item.shortLongLocked = false;

      const isShort = mode === "short";
      let allowed = true;

      if (tier === "ultra") {
        if (isShort && item.shortCount >= 2) allowed = false;
        if (!isShort && item.longCount >= 2) allowed = false;
      } else if (tier === "premium") {
        if (item.transformsUsed >= 2) allowed = false;
      } else {
        // free
        if (item.shortLongLocked || item.transformsUsed >= 1) allowed = false;
      }

      if (!allowed) {
        // Buttons should already be hidden when limits are reached; this is a safeguard.
        return ctx.answerCallbackQuery({
          text: "Shorter/Longer limit reached for this answer.",
          show_alert: true,
        });
      }

      if (isShort) {
        newAnswer = await llmText({
          model: item.model,
          messages: [
            { role: "system", content: "Rewrite the answer to be shorter while keeping key details." },
            { role: "user", content: `PROMPT:\n${item.prompt}\n\nANSWER:\n${item.answer}` },
          ],
          temperature: 0.5,
          max_tokens: 200,
        });
        item.shortCount = (item.shortCount || 0) + 1;
      } else {
        newAnswer = await llmText({
          model: item.model,
          messages: [
            { role: "system", content: "Expand the answer with more detail, structure, and examples if useful." },
            { role: "user", content: `PROMPT:\n${item.prompt}\n\nANSWER:\n${item.answer}` },
          ],
          temperature: 0.7,
          max_tokens: 420,
        });
        item.longCount = (item.longCount || 0) + 1;
      }

      item.transformsUsed = (item.transformsUsed || 0) + 1;
      if (tier === "free") {
        item.shortLongLocked = true;
      }
    }

    if (mode === "cont") {
      const itemMode = item.mode || "default";
      const isBlackhole = itemMode === "blackhole";
      const isCode = itemMode === "code";
      const isExplain = itemMode === "explain";

      // Blackhole uses its own inline-based continuation (bhcont), so we do nothing here.
      if (isBlackhole) {
        await ctx.answerCallbackQuery({ text: "Use the inline Continue button for Blackhole.", show_alert: true });
        return;
      }

      // Quark never shows Continue, but if somehow triggered, just ignore.
      if (itemMode === "quark") {
        await ctx.answerCallbackQuery({ text: "Quark answers are already complete.", show_alert: true });
        return;
      }

      if (isCode) {
        // For Code mode, we don't ask the model to "continue" the answer.
        // Instead, we reveal the remaining part of the original fullAnswer in
        // safe chunks, avoiding cuts inside fenced code blocks.
        const full = item.fullAnswer || item.answer || "";
        if (!full) {
          await ctx.answerCallbackQuery({ text: "No more code to show.", show_alert: true });
          return;
        }

        let cursor = typeof item.cursor === "number" ? item.cursor : item.answer.length;
        if (cursor >= full.length) {
          item.completed = true;
          inlineCache.set(key, item);
          await ctx.answerCallbackQuery({ text: "Full code already shown.", show_alert: true });
          return;
        }

        const remaining = full.slice(cursor);
        if (!remaining.trim()) {
          item.completed = true;
          inlineCache.set(key, item);
          await ctx.answerCallbackQuery({ text: "Full code already shown.", show_alert: true });
          return;
        }

        // Local splitter: same logic as in the initial Code handler but applied
        // to the remaining text only.
        const maxLen = 3500;
        const fence = "```";
        const positions = [];
        let idxPos = 0;
        while (true) {
          const found = remaining.indexOf(fence, idxPos);
          if (found === -1) break;
          positions.push(found);
          idxPos = found + fence.length;
        }

        let cutoff = -1;
        if (positions.length >= 2) {
          for (let i = 0; i + 1 < positions.length; i += 2) {
            const closeIdx = positions[i + 1] + fence.length;
            if (closeIdx <= maxLen) {
              cutoff = closeIdx;
            } else {
              break;
            }
          }
        }

        if (cutoff === -1) {
          const fallback = remaining.lastIndexOf("\n", maxLen);
          cutoff = fallback > 0 ? fallback : Math.min(maxLen, remaining.length);
        }

        const addition = remaining.slice(0, cutoff).trimEnd();
        const leftover = remaining.slice(cutoff).trimStart();

        if (!addition) {
          item.completed = true;
          inlineCache.set(key, item);
          await ctx.answerCallbackQuery({ text: "No further code to show.", show_alert: true });
          return;
        }

        newAnswer = `${item.answer}\n\n${addition}`.trim();
        item.cursor = cursor + cutoff;
        if (!leftover.length || item.cursor >= full.length) {
          item.completed = true;
        }
      } else if (isExplain) {
        // For Explain mode, reveal the rest of the original explanation without
        // asking the model to rewrite it, cutting at sentence/word boundaries.
        const full = item.fullAnswer || item.answer || "";
        if (!full) {
          await ctx.answerCallbackQuery({ text: "No more explanation to show.", show_alert: true });
          return;
        }

        let cursor = typeof item.cursor === "number" ? item.cursor : item.answer.length;
        if (cursor >= full.length) {
          item.completed = true;
          inlineCache.set(key, item);
          await ctx.answerCallbackQuery({ text: "Explanation already complete.", show_alert: true });
          return;
        }

        const remaining = full.slice(cursor);
        if (!remaining.trim()) {
          item.completed = true;
          inlineCache.set(key, item);
          await ctx.answerCallbackQuery({ text: "Explanation already complete.", show_alert: true });
          return;
        }

        const maxLen = 3500;
        let cutoff = Math.min(maxLen, remaining.length);

        if (cutoff < remaining.length) {
          const windowSize = 200;
          const windowStart = Math.max(0, cutoff - windowSize);
          const windowText = remaining.slice(windowStart, cutoff);

          let rel = Math.max(
            windowText.lastIndexOf(". "),
            windowText.lastIndexOf("! "),
            windowText.lastIndexOf("? ")
          );
          if (rel !== -1) {
            cutoff = windowStart + rel + 2; // include punctuation + space
          } else {
            const spaceRel = windowText.lastIndexOf(" ");
            if (spaceRel !== -1) {
              cutoff = windowStart + spaceRel;
            }
          }
        }

        const addition = remaining.slice(0, cutoff).trimEnd();
        const leftover = remaining.slice(cutoff).trimStart();

        if (!addition) {
          item.completed = true;
          inlineCache.set(key, item);
          await ctx.answerCallbackQuery({ text: "No further explanation to show.", show_alert: true });
          return;
        }

        newAnswer = `${item.answer}\n\n${addition}`.trim();
        item.cursor = cursor + cutoff;
        if (!leftover.length || item.cursor >= full.length) {
          item.completed = true;
        }

        const finalTextExplain = (newAnswer || "(no output)").trim();
        item.answer = finalTextExplain.slice(0, 3500);
        const part = (item.part || 1) + 1;
        item.part = part;
        inlineCache.set(key, item);

        const formattedExplain = convertToTelegramHTML(item.answer);
        const escapedPromptExplain = escapeHTML(item.prompt || "");
        const shortModelExplain = item.shortModel || (item.model || "").split("/").pop() || "";
        let title;
        if (item.completed && part === 1) {
          title = `Full Explanation: ${escapedPromptExplain}`;
        } else if (item.completed) {
          title = `Explanation (Part ${part} – final): ${escapedPromptExplain}`;
        } else {
          title = `Explanation (Part ${part}): ${escapedPromptExplain}`;
        }

        await ctx.editMessageText(
          `🧠 <b>${title}</b>\n\n${formattedExplain}\n\n<i>via StarzAI • Explain${shortModelExplain ? ` • ${shortModelExplain}` : ""}</i>`,
          {
            parse_mode: "HTML",
            reply_markup: inlineAnswerKeyboard(key),
          }
        );
        return;
      } else {
        // Default (quick, research, summarize, chat, etc.)
        const systemPrompt =
          "Continue the previous answer from where it stopped. Do not repeat large sections; just keep going in the same style and format. If it ended mid-sentence, finish that sentence and continue. When there is nothing important left to add, end your answer with a line containing only END_OF_INLINE.";
        const maxTokens = 450;
        const END_MARK = "END_OF_INLINE";

        const continuation = await llmText({
          model: item.model,
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: `PROMPT:\n${item.prompt}\n\nANSWER SO FAR:\n${item.answer}`,
            },
          ],
          temperature: 0.7,
          max_tokens: maxTokens,
        });

        let contText = (continuation || "").trim();
        let completed = false;
        if (contText.includes(END_MARK)) {
          completed = true;
          contText = contText.replace(END_MARK, "").trim();
          contText += "\n\n---\n_End of answer._";
        }

        newAnswer = `${item.answer}\n\n${contText || ""}`.trim();
        if (completed) {
          item.completed = true;
        }
      }
    }

    const finalText = (newAnswer || "(no output)").trim();
    item.answer = finalText.slice(0, 3500);
    inlineCache.set(key, item);

    await editInlineMessage(ctx, item.answer, key);
  } catch (e) {
    console.error(e);
    await ctx.answerCallbackQuery({ text: "Failed. Try again.", show_alert: true });
  }
}

bot.callbackQuery(/^inl_regen:/, async (ctx) => doInlineTransform(ctx, "regen"));
bot.callbackQuery(/^inl_short:/, async (ctx) => doInlineTransform(ctx, "short"));
bot.callbackQuery(/^inl_long:/, async (ctx) => doInlineTransform(ctx, "long"));
bot.callbackQuery(/^inl_cont:/, async (ctx) => doInlineTransform(ctx, "cont"));
bot.callbackQuery(/^inl_revert:/, async (ctx) => doInlineTransform(ctx, "revert"));

// Character new intro button
bot.callbackQuery(/^char_new_intro:(.+)$/, async (ctx) => {
  const character = ctx.match[1];
  const userId = ctx.from?.id;
  const model = ensureChosenModelValid(userId);
  const shortModel = model.split("/").pop();
  
  await ctx.answerCallbackQuery({ text: `Generating new ${character} intro...` });
  
  try {
    const introOut = await llmText({
      model,
      messages: [
        { role: "system", content: `You are ${character}. Introduce yourself in 1-2 sentences in your unique style, personality, and speech patterns. Be creative and stay completely in character. Don't say "I am [name]" directly - show your personality through how you speak. Make this introduction different from previous ones.` },
        { role: "user", content: "Introduce yourself briefly." },
      ],
      temperature: 1.0,
      max_tokens: 150,
    });
    
    const intro = (introOut || `*${character} appears*`).slice(0, 500);
    const newKey = makeId(6);
    
    // Cache the new intro
    inlineCache.set(newKey, {
      prompt: "[Character Introduction]",
      answer: intro,
      userId: String(userId),
      model,
      character,
      isIntro: true,
      createdAt: Date.now(),
    });
    setTimeout(() => inlineCache.delete(newKey), 30 * 60 * 1000);
    
    const formattedIntro = convertToTelegramHTML(intro);
    const escapedCharacter = escapeHTML(character);
    
    await ctx.editMessageText(
      `🎭 <b>${escapedCharacter}</b>\n\n${formattedIntro}\n\n<i>Reply to continue chatting! • via StarzAI</i>`,
      {
        parse_mode: "HTML",
        reply_markup: new InlineKeyboard()
          .text("🔄 New Intro", `char_new_intro:${character}`)
          .switchInlineCurrent(`✉️ Ask ${character.slice(0, 10)}`, `as ${character}: `),
      }
    );
  } catch (e) {
    console.error("Failed to generate new intro:", e);
    await ctx.answerCallbackQuery({ text: "Failed to generate intro. Try again!", show_alert: true });
  }
});

// =====================
// INLINE CACHE TTL CLEANUP
// =====================
setInterval(() => {
  const t = nowMs();
  const ttl = 30 * 60_000; // 30 min
  for (const [k, v] of inlineCache.entries()) {
    if (t - v.createdAt > ttl) inlineCache.delete(k);
  }
}, 5 * 60_000);

// Cleanup old inline sessions (older than 7 days)
setInterval(() => {
  const t = nowMs();
  const ttl = 7 * 24 * 60 * 60_000; // 7 days
  for (const [userId, session] of Object.entries(inlineSessionsDb.sessions)) {
    if (t - session.lastActive > ttl) {
      delete inlineSessionsDb.sessions[userId];
    }
  }
  saveInlineSessions();
}, 60 * 60_000); // Check every hour

// =====================
// WEBHOOK SERVER (Railway)
// =====================
const callback = webhookCallback(bot, "http", {
  timeoutMilliseconds: 120000, // 120 second timeout for long operations like image generation
  onTimeout: (ctx) => {
    console.log("⚠️ Request timeout, but continuing in background...");
  }
});

http
  .createServer(async (req, res) => {
    // Handle webhook
    if (req.method === "POST" && req.url === "/webhook") {
      try {
        // Process webhook without blocking other requests
        // This allows multiple users to be served concurrently
        callback(req, res).catch(e => {
          console.error("❌ Webhook processing error:", e);
        });
      } catch (e) {
        console.error(e);
        res.statusCode = 500;
        res.end("Webhook error");
      }
      return;
    }
    
    // Serve WebApp static files
    if (req.method === "GET" && req.url === "/webapp") {
      try {
        const webappPath = path.join(process.cwd(), "webapp", "index.html");
        const content = fs.readFileSync(webappPath, "utf8");
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.statusCode = 200;
        res.end(content);
      } catch (e) {
        console.error("WebApp serve error:", e);
        res.statusCode = 500;
        res.end("WebApp not found");
      }
      return;
    }
    
    res.statusCode = 200;
    res.end("OK");
  })
  .listen(PORT, async () => {
    console.log("Listening on", PORT);

    // Cache bot info (ID and username) for later use
    try {
      const me = await bot.api.getMe();
      BOT_ID = me.id;
      BOT_USERNAME = (me.username || "").toLowerCase();
      console.log(`Bot identity: @${BOT_USERNAME} (id=${BOT_ID})`);
    } catch (e) {
      console.error("Failed to fetch bot info:", e.message);
    }

    // Initialize storage - try Supabase first (permanent), then Telegram as fallback
    const supabaseLoaded = await loadFromSupabase();
    if (!supabaseLoaded) {
      await loadFromTelegram();
    }

    if (PUBLIC_URL) {
      const url = `${PUBLIC_URL.replace(/\/$/, "")}/webhook`;
      try {
        await bot.api.setWebhook(url);
        console.log("Webhook set to:", url);
      } catch (e) {
        console.error("Failed to set webhook:", e);
      }
    } else {
      console.warn("PUBLIC_URL not set; webhook not configured automatically.");
    }

    // Register bot commands for the "/" menu popup
    try {
      // Default commands for all users
      await bot.api.setMyCommands([
        { command: "start", description: "👋 Welcome & menu" },
        { command: "help", description: "📖 Show all features" },
        { command: "register", description: "✅ Register your account" },
        { command: "model", description: "🤖 Choose AI model" },
        { command: "whoami", description: "👤 Your profile & stats" },
        { command: "reset", description: "🗑️ Clear chat memory" },
      ]);
      console.log("Bot commands registered (default)");

      // Owner-only commands (private chats with owners)
      for (const ownerId of OWNER_IDS) {
        try {
          await bot.api.setMyCommands(
            [
              { command: "start", description: "👋 Welcome & menu" },
              { command: "help", description: "📖 Show all features" },
              { command: "register", description: "✅ Register your account" },
              { command: "model", description: "🤖 Choose AI model" },
              { command: "whoami", description: "👤 Your profile & stats" },
              { command: "reset", description: "🗑️ Clear chat memory" },
              { command: "status", description: "📊 Bot status & analytics" },
              { command: "info", description: "🔍 User info (info <userId>)" },
              { command: "grant", description: "🎁 Grant tier (grant <userId> <tier>)" },
              { command: "revoke", description: "❌ Revoke to free (revoke <userId>)" },
              { command: "ban", description: "🚫 Ban user (ban <userId> [reason])" },
              { command: "unban", description: "✅ Unban user (unban <userId> [reason])" },
              { command: "softban", description: "🚫 Softban user (softban <userId> [reason])" },
              { command: "warn", description: "⚠️ Warn user (warn <userId> [reason])" },
              { command: "clearwarns", description: "🧹 Clear warnings (clearwarns <userId> [reason])" },
              { command: "banlist", description: "📜 List banned users" },
              { command: "mute", description: "🔇 Mute user (mute <userId> <duration> [scope] [reason])" },
              { command: "unmute", description: "🔊 Unmute user (unmute <userId> [reason])" },
              { command: "mutelist", description: "🔇 List muted users" },
              { command: "ownerhelp", description: "📘 Owner help guide" },
              { command: "allow", description: "✅ Allow model (allow <userId> <model>)" },
              { command: "deny", description: "🚫 Deny model (deny <userId> <model>)" },
            ],
            { scope: { type: "chat", chat_id: Number(ownerId) } }
          );
        } catch (e) {
          console.error(`Failed to set owner commands for ${ownerId}:`, e.message);
        }
      }
      console.log("Owner commands registered");
    } catch (e) {
      console.error("Failed to register bot commands:", e);
    }
  });
