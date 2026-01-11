/**
 * Environment Configuration
 * Centralizes all environment variable parsing and validation
 */

// Helper to parse comma-separated environment variables
function parseCsvEnv(name, fallback = "") {
  const raw = (process.env[name] ?? fallback).trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

// =====================
// Core Bot Configuration
// =====================
export const BOT_TOKEN = process.env.BOT_TOKEN;
export const PUBLIC_URL = process.env.PUBLIC_URL;
export const PORT = Number(process.env.PORT || 3000);

// =====================
// API Keys
// =====================
export const MEGALLM_API_KEY = process.env.MEGALLM_API_KEY;
export const GITHUB_PAT = process.env.GITHUB_PAT || "";
export const PARALLEL_API_KEY = process.env.PARALLEL_API_KEY || "";

// DeAPI Keys (supports multiple for load balancing)
const DEAPI_KEYS_RAW = process.env.DEAPI_KEY || "";
export const DEAPI_KEYS = DEAPI_KEYS_RAW
  .split(",")
  .map(k => k.trim())
  .filter(Boolean);

// =====================
// Owner Configuration
// =====================
export const OWNER_IDS = new Set(
  (process.env.OWNER_IDS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
);

// =====================
// Storage Configuration
// =====================
export const STORAGE_CHANNEL_ID = process.env.STORAGE_CHANNEL_ID || "";
export const SUPABASE_URL = process.env.SUPABASE_URL || "";
export const SUPABASE_KEY = process.env.SUPABASE_KEY || "";
export const FEEDBACK_CHAT_ID = process.env.FEEDBACK_CHAT_ID || "";
export const DATA_DIR = process.env.DATA_DIR || ".data";

// =====================
// Model Configuration
// =====================

// MegaLLM Models
export const FREE_MODELS = parseCsvEnv("FREE_MODELS");
export const PREMIUM_MODELS = parseCsvEnv("PREMIUM_MODELS");
export const ULTRA_MODELS = parseCsvEnv("ULTRA_MODELS");

// GitHub Models
export const GITHUB_FREE_MODELS = parseCsvEnv("GITHUB_FREE_MODELS", "openai/gpt-4.1-nano,openai/gpt-5-nano");
export const GITHUB_PREMIUM_MODELS = parseCsvEnv("GITHUB_PREMIUM_MODELS", "openai/gpt-5-mini,openai/gpt-5");
export const GITHUB_ULTRA_MODELS = parseCsvEnv("GITHUB_ULTRA_MODELS", "openai/gpt-5-chat");

// Default Models
export const DEFAULT_FREE_MODEL = (process.env.DEFAULT_FREE_MODEL || FREE_MODELS[0] || "").trim();
export const DEFAULT_PREMIUM_MODEL = (process.env.DEFAULT_PREMIUM_MODEL || PREMIUM_MODELS[0] || DEFAULT_FREE_MODEL || "").trim();
export const DEFAULT_ULTRA_MODEL = (process.env.DEFAULT_ULTRA_MODEL || ULTRA_MODELS[0] || DEFAULT_PREMIUM_MODEL || DEFAULT_FREE_MODEL || "").trim();

// Vision Model (optional)
export const MODEL_VISION = process.env.MODEL_VISION || "";

// =====================
// Rate Limiting
// =====================
export const RATE_LIMIT_PER_MINUTE = Number(process.env.RATE_LIMIT_PER_MINUTE || 30);

// Per-tier cooldowns (in seconds)
export const TIER_COOLDOWNS = {
  owner: 0,
  ultra: 10,
  premium: 30,
  free: 60
};

// =====================
// Group Settings
// =====================
export const GROUP_ACTIVE_DURATION = 2 * 60 * 1000; // 2 minutes in ms

// =====================
// Helper Functions
// =====================

/**
 * Get all models available for a given tier
 */
export function allModelsForTier(tier) {
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

/**
 * Check if a user ID is an owner
 */
export function isOwner(userId) {
  return OWNER_IDS.has(String(userId));
}

// =====================
// Validation
// =====================
export function validateEnv() {
  const errors = [];
  
  if (!BOT_TOKEN) errors.push("Missing BOT_TOKEN");
  if (!MEGALLM_API_KEY) errors.push("Missing MEGALLM_API_KEY");
  
  if (!GITHUB_PAT) {
    console.warn("⚠️  GITHUB_PAT not set - GitHub Models will be unavailable");
  }
  
  if (errors.length > 0) {
    throw new Error(`Environment validation failed:\n${errors.join("\n")}`);
  }
}
