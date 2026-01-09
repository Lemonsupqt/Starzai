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

const FREE_MODELS = parseCsvEnv("FREE_MODELS");
const PREMIUM_MODELS = parseCsvEnv("PREMIUM_MODELS");
const ULTRA_MODELS = parseCsvEnv("ULTRA_MODELS"); // optional, can be empty

const DEFAULT_FREE_MODEL =
  (process.env.DEFAULT_FREE_MODEL || FREE_MODELS[0] || "").trim();
const DEFAULT_PREMIUM_MODEL =
  (process.env.DEFAULT_PREMIUM_MODEL || PREMIUM_MODELS[0] || DEFAULT_FREE_MODEL || "").trim();
const DEFAULT_ULTRA_MODEL =
  (process.env.DEFAULT_ULTRA_MODEL || ULTRA_MODELS[0] || DEFAULT_PREMIUM_MODEL || DEFAULT_FREE_MODEL || "").trim();

function allModelsForTier(tier) {
  if (tier === "ultra") return [...FREE_MODELS, ...PREMIUM_MODELS, ...ULTRA_MODELS];
  if (tier === "premium") return [...FREE_MODELS, ...PREMIUM_MODELS];
  return [...FREE_MODELS];
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

if (!BOT_TOKEN) throw new Error("Missing BOT_TOKEN");
if (!MEGALLM_API_KEY) throw new Error("Missing MEGALLM_API_KEY");

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
// TELEGRAM CHANNEL STORAGE
// Persists data in a Telegram channel - survives redeployments!
// =====================
const DATA_DIR = process.env.DATA_DIR || ".data";
const USERS_FILE = path.join(DATA_DIR, "users.json");
const PREFS_FILE = path.join(DATA_DIR, "prefs.json");
const INLINE_SESSIONS_FILE = path.join(DATA_DIR, "inline_sessions.json");
const PARTNERS_FILE = path.join(DATA_DIR, "partners.json");

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
    const [users, prefs, sessions] = await Promise.all([
      supabaseGet("users"),
      supabaseGet("prefs"),
      supabaseGet("inlineSessions"),
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

function scheduleSave(dataType) {
  pendingSaves.add(dataType);
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    flushSaves();
  }, 2000); // Wait 2 seconds before saving to batch changes
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
    
  } catch (e) {
    console.error(`Failed to save ${dataType} to Telegram:`, e.message);
    // Fallback to local storage
    if (dataType === "users") writeJson(USERS_FILE, usersDb);
    if (dataType === "prefs") writeJson(PREFS_FILE, prefsDb);
    if (dataType === "inlineSessions") writeJson(INLINE_SESSIONS_FILE, inlineSessionsDb);
    if (dataType === "partners") writeJson(PARTNERS_FILE, partnersDb);
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

function saveUsers() {
  scheduleSave("users");
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

// =====================
// IN-MEMORY STATE
// =====================
const chatHistory = new Map(); // chatId -> [{role, content}...]
const partnerChatHistory = new Map(); // oderId -> [{role, content}...] - separate history for partner mode
const inlineCache = new Map(); // key -> { prompt, answer, model, createdAt, userId }
const rate = new Map(); // userId -> { windowStartMs, count }
const groupActiveUntil = new Map(); // chatId -> timestamp when bot becomes dormant
const GROUP_ACTIVE_DURATION = 2 * 60 * 1000; // 2 minutes in ms

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
    saveUsers();
  }
  return usersDb.users[id];
}

// Check if a user is banned
function isUserBanned(userId) {
  const rec = getUserRecord(userId);
  return !!rec?.banned;
}

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

async function llmText({ model, messages, temperature = 0.7, max_tokens = 350, retries = 2, timeout: customTimeout = null }) {
  // Use custom timeout if provided, otherwise use progressive timeouts
  const defaultTimeouts = [25000, 35000, 50000]; // Progressive timeouts: 25s, 35s, 50s
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
      
      // If it's the last attempt, throw the error
      if (attempt === retries) {
        throw err;
      }
      
      // If it's not a timeout, don't retry (e.g., auth error, invalid model)
      if (!err.message?.includes("timed out")) {
        throw err;
      }
      
      // Wait a bit before retrying
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

async function llmChatReply({ chatId, userText, systemPrompt, model }) {
  const history = getHistory(chatId);
  const messages = [
    { role: "system", content: systemPrompt },
    ...history,
    { role: "user", content: userText },
  ];

  const out = await llmText({ model, messages, temperature: 0.7, max_tokens: 350 });
  pushHistory(chatId, "user", userText);
  pushHistory(chatId, "assistant", out);
  return out || "(no output)";
}

// Inline chat LLM - uses inline session history
async function llmInlineChatReply({ userId, userText, model }) {
  const session = getInlineSession(userId);
  const systemPrompt =
    "You are StarzTechBot (@starztechbot), the AI assistant behind the StarzAI Telegram bot, currently responding in inline mode. " +
    "Provide concise but helpful answers (ideally under 800 characters) suitable to appear inside other chats. " +
    "Be friendly and clear, and avoid mentioning system prompts or internal implementation.";

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

// Parallel AI Search API (web search + extraction in one call)
async function parallelWebSearch(query, numResults = 5) {
  if (!PARALLEL_API_KEY) {
    return { success: false, error: 'Parallel API key not configured', query };
  }

  try {
    const response = await fetch('https://api.parallel.ai/v1beta/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': PARALLEL_API_KEY,
        // Search API is also beta; use the documented header for search/extract.
        'parallel-beta': 'search-extract-2025-10-10',
      },
      body: JSON.stringify({
        objective: query,
        mode: 'one-shot',           // richer, single-shot answers
        max_results: numResults,    // upper bound on results
        excerpts: {
          max_chars_per_result: 1500,
        },
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      console.log('Parallel web search HTTP error:', response.status, text.slice(0, 500));
      return {
        success: false,
        error: `HTTP ${response.status}: ${text.slice(0, 200) || "Unknown error from Parallel Search API"}`,
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
        engine: "Parallel.ai",
      };
    });

    return {
      success: true,
      results,
      query,
      instance: 'Parallel.ai',
    };
  } catch (e) {
    console.log('Parallel web search error:', e.message);
    return {
      success: false,
      error: e.message || 'Parallel web search failed',
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
function extractTimezone(text) {
  const lowerText = text.toLowerCase();
  
  // Common timezone mappings
  const timezones = {
    'india': 'Asia/Kolkata',
    'ist': 'Asia/Kolkata',
    'indian': 'Asia/Kolkata',
    'new york': 'America/New_York',
    'nyc': 'America/New_York',
    'est': 'America/New_York',
    'los angeles': 'America/Los_Angeles',
    'la': 'America/Los_Angeles',
    'pst': 'America/Los_Angeles',
    'london': 'Europe/London',
    'uk': 'Europe/London',
    'gmt': 'Europe/London',
    'tokyo': 'Asia/Tokyo',
    'japan': 'Asia/Tokyo',
    'jst': 'Asia/Tokyo',
    'dubai': 'Asia/Dubai',
    'uae': 'Asia/Dubai',
    'singapore': 'Asia/Singapore',
    'sydney': 'Australia/Sydney',
    'australia': 'Australia/Sydney',
    'paris': 'Europe/Paris',
    'france': 'Europe/Paris',
    'berlin': 'Europe/Berlin',
    'germany': 'Europe/Berlin',
    'moscow': 'Europe/Moscow',
    'russia': 'Europe/Moscow',
    'beijing': 'Asia/Shanghai',
    'china': 'Asia/Shanghai',
    'hong kong': 'Asia/Hong_Kong',
    'utc': 'UTC',
    'cst': 'America/Chicago',
    'chicago': 'America/Chicago',
    'toronto': 'America/Toronto',
    'canada': 'America/Toronto'
  };
  
  for (const [key, tz] of Object.entries(timezones)) {
    if (lowerText.includes(key)) {
      return { timezone: tz, location: key.charAt(0).toUpperCase() + key.slice(1) };
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
// =====================

// Extract and clean content from specific URLs using Parallel.ai Extract API
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
    .text("📊 Stats", "menu_stats")
    .row()
    .text("🎭 Character", "menu_char")
    .text(webSearchIcon, "toggle_websearch")
    .row()
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

// Category submenu - shows models in a category
function settingsCategoryKeyboard(category, userId, currentModel) {
  const kb = new InlineKeyboard();
  const user = getUserRecord(userId);
  const tier = user?.tier || "free";
  
  let models = [];
  if (category === "free") models = FREE_MODELS;
  else if (category === "premium" && (tier === "premium" || tier === "ultra")) models = PREMIUM_MODELS;
  else if (category === "ultra" && tier === "ultra") models = ULTRA_MODELS;
  
  // Show models (max 8 per page for now)
  models.slice(0, 8).forEach((m, i) => {
    const mShort = m.split("/").pop();
    const isSelected = m === currentModel;
    const label = isSelected ? `✅ ${mShort}` : mShort;
    kb.text(label, `setmodel:${m}`).row();
  });
  
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

// Inline settings - model list for a category
function inlineSettingsModelKeyboard(category, sessionKey, userId) {
  const kb = new InlineKeyboard();
  const user = getUserRecord(userId);
  const currentModel = user?.model || "";
  
  let models = [];
  if (category === "free") models = FREE_MODELS;
  else if (category === "premium") models = PREMIUM_MODELS;
  else if (category === "ultra") models = ULTRA_MODELS;
  
  // Add model buttons (2 per row)
  for (let i = 0; i < models.length; i += 2) {
    const m1 = models[i];
    const m2 = models[i + 1];
    const shortName1 = m1.split("/").pop();
    const label1 = m1 === currentModel ? `✅ ${shortName1}` : shortName1;
    
    if (m2) {
      const shortName2 = m2.split("/").pop();
      const label2 = m2 === currentModel ? `✅ ${shortName2}` : shortName2;
      kb.text(label1, `iset_model:${m1}:${sessionKey}`).text(label2, `iset_model:${m2}:${sessionKey}`);
    } else {
      kb.text(label1, `iset_model:${m1}:${sessionKey}`);
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

// /extract command - Extract content from a specific URL using Parallel.ai
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
      "The bot fetches the page via Parallel.ai Extract API, pulls the important content,",
      "and (optionally) answers your question about it."
    ].join("\\n");
    return ctx.reply(help, {
      parse_mode: "HTML",
      reply_to_message_id: ctx.message?.message_id,
    });
  }

  if (!PARALLEL_API_KEY) {
    return ctx.reply(
      "⚠️ Extract API is not configured yet. Set <code>PARALLEL_API_KEY</code> in env to enable it.",
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

    let response = `🧲 <b>Extracted from:</b> <a href="${escapeHTML(url)}">${safeTitle}</a>\\n\\n`;
    response += convertToTelegramHTML((answer || "").slice(0, 3500));
    response += `\\n\\n<i>🔗 via Parallel Extract • ${elapsed}s • ${escapeHTML(model)}</i>`;

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
function modelListKeyboard(category, currentModel, userTier) {
  const rows = [];
  let models = [];
  
  if (category === "free") {
    models = FREE_MODELS;
  } else if (category === "premium" && (userTier === "premium" || userTier === "ultra")) {
    models = PREMIUM_MODELS;
  } else if (category === "ultra" && userTier === "ultra") {
    models = ULTRA_MODELS;
  }
  
  // Add model buttons (2 per row for cleaner look)
  for (let i = 0; i < models.length; i += 2) {
    const row = [];
    const m1 = models[i];
    const short1 = m1.split("/").pop();
    row.push({
      text: `${m1 === currentModel ? "✅ " : ""}${short1}`,
      callback_data: `setmodel:${m1}`,
    });
    
    if (models[i + 1]) {
      const m2 = models[i + 1];
      const short2 = m2.split("/").pop();
      row.push({
        text: `${m2 === currentModel ? "✅ " : ""}${short2}`,
        callback_data: `setmodel:${m2}`,
      });
    }
    rows.push(row);
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
    `👤 Plan: *${u.tier.toUpperCase()}*\\n🤖 Current: \`${current}\`\\n\\nSelect a category:`,
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
  
  await ctx.reply(lines.join("\n"), { parse_mode: "Markdown" });
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
    "📊 *Stats*",
    "• /stats - Your usage statistics",
  ].join("\n");
  
  const kb = new InlineKeyboard()
    .text("💳 Plans & Benefits", "menu_plans")
    .row()
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

// Register menu
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
          `${timeResult.response}\\n\\n⚡ ${elapsed}s`,
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
      const wantsSearch = userRecord?.webSearch || needsWebSearch(text);
      if (wantsSearch) {
        const quota = consumeWebsearchQuota(u.id);
        if (quota.allowed) {
          try {
            await ctx.api.editMessageText(
              chat.id,
              statusMsg.message_id,
              `🔍 Searching the web for current info...`,
              { parse_mode: "HTML" }
            ).catch(() => {});
            
            const searchResult = await webSearch(text, 3);
            if (searchResult.success) {
              searchContext = "\n\n" + formatSearchResultsForAI(searchResult);
              modeLabel = "🌐 ";
            }
            
            await ctx.api.editMessageText(
              chat.id,
              statusMsg.message_id,
              `⏳ Processing with <b>${model}</b>...`,
              { parse_mode: "HTML" }
            ).catch(() => {});
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
        "You are StarzTechBot (@starztechbot), the AI assistant behind the StarzAI Telegram bot. " +
        "You chat with users in direct messages and group chats on Telegram. " +
        "Be friendly, clear, and reasonably concise while staying helpful. " +
        "Avoid mentioning system prompts or internal implementation.";

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

      // Add search context instruction if we have search results
      if (searchContext) {
        systemPrompt +=
          " You have access to real-time web search results below. Use them to provide accurate, up-to-date information. Cite sources when relevant.";
      }

      systemPrompt +=
        " When genuinely helpful, you may briefly mention that users can change models with /model or use inline mode by typing @starztechbot with prefixes like q:, b:, code:, e:, as, sum, or p:.";

      const userTextWithContext = replyContext + (extractContext || "") + text + searchContext;

      out = await llmChatReply({
        chatId: chat.id,
        userText: userTextWithContext,
        systemPrompt,
        model,
      });
    }

    // Mark response as sent to stop typing
    responseSent = true;
    if (typingInterval) clearInterval(typingInterval);

    // Track usage
    trackUsage(u.id, "message");

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    // Edit status message with response (cleaner than delete+send)
    // Convert AI output from standard Markdown to Telegram HTML format
    const rawOutput = (out && out.trim()) ? out.slice(0, 3600) : "<i>I couldn't generate a response. Try rephrasing or switch models with /model</i>";
    const formattedOutput = convertToTelegramHTML(rawOutput);
    
    // Convert mode label to HTML format
    const htmlModeLabel = modeLabel ? modeLabel.replace(/\*([^*]+)\*/g, '<b>$1</b>').replace(/_([^_]+)_/g, '<i>$1</i>') : '';
    
    const response = `${htmlModeLabel}${formattedOutput}\n\n<i>⚡ ${elapsed}s • ${model}</i>`;
    if (statusMsg) {
      try {
        await ctx.api.editMessageText(chat.id, statusMsg.message_id, response, { parse_mode: "HTML" });
      } catch (editErr) {
        // Fallback to new message if edit fails
        await ctx.reply(response, {
          parse_mode: "HTML",
          reply_to_message_id: msg.message_id,
        });
      }
    } else {
      await ctx.reply(response, {
        parse_mode: "HTML",
        reply_to_message_id: msg.message_id,
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
      ? `⏱️ Model &lt;b&gt;${model}&lt;/b&gt; timed out after ${elapsed}s. Try /model to switch, or try again.`
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

  // Empty query - show main menu with Ask AI card and Settings/Help
  if (!q || q.length === 0) {
    console.log("Showing main menu (empty query)");
    const shortModel = model.split("/").pop();
    
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
          .switchInlineCurrent("🗿 Blackhole", "b: ")
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
  // Wait for AI response, then show send button (works in private DMs and groups)
  const quickKey = makeId(6);
  const quickShortModel = model.split("/").pop();
  
  try {
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
  if (resultId.startsWith("bh_start_")) {
    const bhKey = resultId.replace("bh_start_", "");
    const pending = inlineCache.get(`bh_pending_${bhKey}`);
    
    if (!pending || !inlineMessageId) {
      console.log(`Blackhole pending not found or no inlineMessageId: bhKey=${bhKey}`);
      return;
    }
    
    const { prompt, model, shortModel } = pending;
    console.log(`Processing Blackhole: ${prompt}`);
    
    try {
      const out = await llmText({
        model,
        messages: [
          {
            role: "system",
            content:
              "You are a research expert. Provide comprehensive, well-structured analysis with multiple perspectives. Include key facts, implications, and nuances. Use headings, bullet points, and quote blocks (lines starting with '>') for key takeaways. Format your answer in clean Markdown. When you have fully covered the topic and there is nothing essential left to add, end your answer with a line containing only END_OF_BLACKHOLE.",
          },
          { role: "user", content: `Provide deep analysis on: ${prompt}` },
        ],
        temperature: 0.7,
        max_tokens: 800,
      });

      const END_MARK = "END_OF_BLACKHOLE";
      let raw = out || "No results";
      let completed = false;

      if (raw.includes(END_MARK)) {
        completed = true;
        raw = raw.replace(END_MARK, "").trim();
        raw += "\n\n---\n_End of Blackhole analysis._";
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
        createdAt: Date.now(),
      });
      setTimeout(() => inlineCache.delete(newKey), 30 * 60 * 1000);
      
      // Track in history
      addToHistory(pending.userId, prompt, "blackhole");
      
      // Convert and update
      const formattedAnswer = convertToTelegramHTML(answer);
      const escapedPrompt = escapeHTML(prompt);
      const partLabel = completed ? "Part 1 – final" : "Part 1";
      
      await bot.api.editMessageTextInline(
        inlineMessageId,
        `🗿🔬 <b>Blackhole Analysis (${partLabel}): ${escapedPrompt}</b>\n\n${formattedAnswer}\n\n<i>via StarzAI • Blackhole • ${shortModel}</i>`,
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
        continuation += "\n\n---\n_End of Blackhole analysis._";
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

      await bot.api.editMessageTextInline(
        inlineMessageId,
        `🗿🔬 <b>Blackhole Analysis (${partLabel}): ${escapedPrompt}</b>\n\n${formattedAnswer}\n\n<i>via StarzAI • Blackhole • ${shortModel}</i>`,
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
  if (resultId.startsWith("q_start_")) {
    const qKey = resultId.replace("q_start_", "");
    const pending = inlineCache.get(`q_pending_${qKey}`);
    
    if (!pending || !inlineMessageId) {
      console.log(`Quark pending not found or no inlineMessageId: qKey=${qKey}`);
      return;
    }
    
    const { prompt, model, shortModel } = pending;
    console.log(`Processing Quark: ${prompt}`);
    
    try {
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
  timeoutMilliseconds: 60000, // 60 second timeout for webhook responses
});

http
  .createServer(async (req, res) => {
    // Handle webhook
    if (req.method === "POST" && req.url === "/webhook") {
      try {
        await callback(req, res);
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
