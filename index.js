import { Bot, InlineKeyboard, InputFile, webhookCallback } from "grammy";
import http from "http";
import OpenAI from "openai";
import crypto from "crypto";
import fs from "fs";
import path from "path";

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

if (!BOT_TOKEN) throw new Error("Missing BOT_TOKEN");
if (!MEGALLM_API_KEY) throw new Error("Missing MEGALLM_API_KEY");

// =====================
// BOT + LLM
// =====================
const bot = new Bot(BOT_TOKEN);

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
let prefsDb = readJson(PREFS_FILE, { userModel: {} });
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

// Active inline message tracking (for editing)
const activeInlineMessages = new Map(); // sessionKey -> inline_message_id

// Pending shared chat input (user clicked Ask AI, waiting for their message)
const pendingSharedInput = new Map(); // oderId -> { chatKey, userName, inlineMessageId, timestamp }

// =====================
// SHARED INLINE CHAT SESSIONS
// These are keyed by inline_message_id so multiple users can participate
// =====================
const sharedChatSessions = new Map(); // chatKey -> { history: [], model, createdBy, createdAt, participants: Set }

function getSharedChat(chatKey) {
  return sharedChatSessions.get(chatKey) || null;
}

function createSharedChat(chatKey, creatorId, creatorName, model) {
  const session = {
    history: [],
    model: model,
    createdBy: creatorId,
    createdByName: creatorName,
    createdAt: Date.now(),
    participants: new Set([String(creatorId)]),
    lastActive: Date.now(),
    inlineMessageId: null, // Will be set when message is sent
  };
  sharedChatSessions.set(chatKey, session);
  return session;
}

function setSharedChatInlineMessageId(chatKey, inlineMessageId) {
  const session = sharedChatSessions.get(chatKey);
  if (session) {
    session.inlineMessageId = inlineMessageId;
  }
}

function addToSharedChat(chatKey, userId, userName, role, content) {
  const session = sharedChatSessions.get(chatKey);
  if (!session) return null;
  
  session.participants.add(String(userId));
  session.history.push({ 
    role, 
    content, 
    userId: String(userId),
    userName: userName || "User",
    timestamp: Date.now()
  });
  
  // Keep last 30 messages
  while (session.history.length > 30) session.history.shift();
  session.lastActive = Date.now();
  
  return session;
}

function clearSharedChat(chatKey) {
  const session = sharedChatSessions.get(chatKey);
  if (session) {
    session.history = [];
    session.lastActive = Date.now();
  }
  return session;
}

// Clean up old shared sessions (older than 1 hour)
setInterval(() => {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  for (const [key, session] of sharedChatSessions) {
    if (session.lastActive < oneHourAgo) {
      sharedChatSessions.delete(key);
    }
  }
}, 10 * 60 * 1000); // Check every 10 minutes

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
  const r = checkRateLimit(ctx);
  if (r.ok) return true;

  const msg = `Rate limit hit. Try again in ~${r.waitSec}s.`;

  if (ctx.inlineQuery) {
    await safeAnswerInline(ctx,
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
      // Usage stats
      stats: {
        totalMessages: 0,
        totalInlineQueries: 0,
        totalTokensUsed: 0,
        lastActive: new Date().toISOString(),
        lastModel: defaultModel,
      },
      // Recent prompts history (max 10)
      history: [],
      // Saved characters for quick roleplay (max 10)
      savedCharacters: [],
      // Active character mode for DM/GC
      activeCharacter: null,
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
    saveUsers();
  }
  return usersDb.users[id];
}

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

// Add prompt to user's history (max 10 recent)
function addToHistory(userId, prompt, mode = "default") {
  const u = ensureUser(userId);
  if (!u.history) u.history = [];
  
  // Add to beginning (most recent first)
  u.history.unshift({
    prompt: prompt.slice(0, 100),
    mode,
    timestamp: Date.now(),
  });
  
  // Keep only last 10
  if (u.history.length > 10) u.history = u.history.slice(0, 10);
  saveUsers();
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
  const systemPrompt = "You are StarzAI, a helpful and friendly AI assistant. Be concise but thorough. Use emojis occasionally to be engaging. Keep responses under 800 characters for inline display.";
  
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
  
  let result = text;
  
  // Escape HTML special characters first (but not in code blocks)
  // We'll handle code blocks separately
  
  // Step 1: Protect and convert code blocks with language (```python ... ```)
  const codeBlocksWithLang = [];
  result = result.replace(/```(\w+)\n([\s\S]*?)```/g, (match, lang, code) => {
    // Escape HTML in code
    const escapedCode = escapeHTML(code.trim());
    codeBlocksWithLang.push(`<pre><code class="language-${lang}">${escapedCode}</code></pre>`);
    return `__CODEBLOCK_LANG_${codeBlocksWithLang.length - 1}__`;
  });
  
  // Step 2: Protect and convert code blocks without language (``` ... ```)
  const codeBlocks = [];
  result = result.replace(/```([\s\S]*?)```/g, (match, code) => {
    const escapedCode = escapeHTML(code.trim());
    codeBlocks.push(`<pre>${escapedCode}</pre>`);
    return `__CODEBLOCK_${codeBlocks.length - 1}__`;
  });
  
  // Step 3: Protect and convert inline code (`...`)
  const inlineCode = [];
  result = result.replace(/`([^`]+)`/g, (match, code) => {
    const escapedCode = escapeHTML(code);
    inlineCode.push(`<code>${escapedCode}</code>`);
    return `__INLINECODE_${inlineCode.length - 1}__`;
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
  // Be careful with underscores in words like snake_case
  result = result.replace(/(?<!\w)\*([^*\n]+)\*(?!\w)/g, '<i>$1</i>');
  result = result.replace(/(?<!\w)_([^_\n]+)_(?!\w)/g, '<i>$1</i>');
  
  // Strikethrough (~~text~~)
  result = result.replace(/~~([^~]+)~~/g, '<s>$1</s>');
  
  // Block quotes (> text)
  result = result.replace(/^&gt;\s*(.+)$/gm, '<blockquote>$1</blockquote>');
  // Merge consecutive blockquotes
  result = result.replace(/<\/blockquote>\n<blockquote>/g, '\n');
  
  // Links [text](url)
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  
  // Horizontal rules (--- or ***)
  result = result.replace(/^(---|\*\*\*|___)$/gm, '\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500');
  
  // Bullet points (- item or * item)
  result = result.replace(/^[\-\*]\s+(.+)$/gm, '• $1');
  
  // Numbered lists (1. item)
  result = result.replace(/^(\d+)\.\s+(.+)$/gm, '$1. $2');
  
  // Step 6: Restore code blocks and inline code
  inlineCode.forEach((code, i) => {
    result = result.replace(`__INLINECODE_${i}__`, code);
  });
  
  codeBlocks.forEach((code, i) => {
    result = result.replace(`__CODEBLOCK_${i}__`, code);
  });
  
  codeBlocksWithLang.forEach((code, i) => {
    result = result.replace(`__CODEBLOCK_LANG_${i}__`, code);
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
    "• /history — Recent prompts",
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
    "• /status, /info, /grant, /revoke",
  ].join("\n");
}

function helpKeyboard() {
  return new InlineKeyboard()
    .text("🌟 Features", "help_features")
    .text("⚙️ Model", "open_model")
    .row()
    .text("🤝🏻 Partner", "open_partner")
    .text("📊 Stats", "do_stats")
    .row()
    .text("🎭 Character", "open_char")
    .text("📝 Register", "do_register")
    .row()
    .switchInline("⚡ Try Inline", "");
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
    "👥 *Groups* - Mention @starztechbot",
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
  }
  
  return kb;
}

function inlineAnswerKeyboard(key) {
  return new InlineKeyboard()
    .switchInlineCurrent("💬 Reply", `c:${key}: `)
    .text("🔁 Regen", `inl_regen:${key}`)
    .row()
    .text("✂️ Shorter", `inl_short:${key}`)
    .text("📈 Longer", `inl_long:${key}`);
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
// SHARED CHAT UI (Multi-user inline chat)
// =====================
const MESSAGES_PER_PAGE = 6;

function formatSharedChatDisplay(session, page = -1) {
  const history = session.history || [];
  const model = session.model || "gpt-4o-mini";
  const participantCount = session.participants?.size || 1;
  
  // Calculate total pages
  const totalPages = Math.max(1, Math.ceil(history.length / MESSAGES_PER_PAGE));
  
  // -1 means last page (default)
  if (page === -1 || page > totalPages) page = totalPages;
  if (page < 1) page = 1;
  
  let display = `🤖 *StarzAI Yap*\n`;
  display += `👥 ${participantCount} participant${participantCount > 1 ? "s" : ""} • 📊 \`${model.split("/").pop()}\``;
  
  // Show page indicator if multiple pages
  if (totalPages > 1) {
    display += ` • 📄 ${page}/${totalPages}`;
  }
  display += `\n━━━━━━━━━━━━━━━\n\n`;
  
  if (history.length === 0) {
    display += `_No messages yet._\n_Reply to this message to chat!_`;
  } else {
    // Get messages for this page
    const startIdx = (page - 1) * MESSAGES_PER_PAGE;
    const endIdx = startIdx + MESSAGES_PER_PAGE;
    const pageHistory = history.slice(startIdx, endIdx);
    
    for (const msg of pageHistory) {
      if (msg.role === "user") {
        const name = msg.userName || "User";
        display += `👤 *${name}:* ${msg.content.slice(0, 150)}${msg.content.length > 150 ? "..." : ""}\n\n`;
      } else {
        display += `🤖 *AI:* ${msg.content.slice(0, 300)}${msg.content.length > 300 ? "..." : ""}\n\n`;
      }
    }
  }
  
  display += `━━━━━━━━━━━━━━━`;
  return display.slice(0, 3800);
}

function getSharedChatPageCount(session) {
  const history = session?.history || [];
  return Math.max(1, Math.ceil(history.length / MESSAGES_PER_PAGE));
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

function sharedChatKeyboard(chatKey, page = -1, totalPages = 1) {
  const kb = new InlineKeyboard();
  
  // -1 means last page
  if (page === -1) page = totalPages;
  
  // Page navigation (only if multiple pages)
  if (totalPages > 1) {
    if (page > 1) {
      kb.text("◀️ Prev", `schat_page:${chatKey}:${page - 1}`);
    }
    kb.text(`📄 ${page}/${totalPages}`, `schat_noop`);
    if (page < totalPages) {
      kb.text("Next ▶️", `schat_page:${chatKey}:${page + 1}`);
    }
    kb.row();
  }
  
  // Main action - Ask AI via inline query
  kb.switchInlineCurrent("💬 Reply", `yap:${chatKey}: `);
  kb.text("🔁 Regen", `schat_regen:${chatKey}`);
  kb.row();
  
  // Secondary actions
  kb.text("🔄 Refresh", `schat_refresh:${chatKey}`)
    .text("🗑️ Clear", `schat_clear:${chatKey}`);
  
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

  await ctx.reply(
    `⚡ *Welcome to StarzAI!*\n\n💬 *DM* - Chat directly with AI\n👥 *Groups* - Mention @starztechbot\n⌨️ *Inline* - Type @starztechbot anywhere\n\n🌟 *Features:*\n• Multiple AI modes (Quark, Blackhole, Code...)\n• 🤝🏻 AI Partner with persistent memory\n• 🎭 Character roleplay\n• 📊 Usage stats & history\n\n_Tap Features below to learn more!_`,
    { parse_mode: "Markdown", reply_markup: helpKeyboard() }
  );
});

bot.command("help", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  await ctx.reply(helpText(), { parse_mode: "Markdown", reply_markup: helpKeyboard() });
});

bot.command("register", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;

  const u = ctx.from;
  if (!u?.id) return ctx.reply("Could not get your user info.");

  if (getUserRecord(u.id)) {
    return ctx.reply("✅ You're already registered.", { reply_markup: helpKeyboard() });
  }

  registerUser(u);
  await ctx.reply("✅ Registered! Use /model to choose models.", { reply_markup: helpKeyboard() });
});

bot.command("reset", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  chatHistory.delete(ctx.chat.id);
  await ctx.reply("Done. Memory cleared for this chat.");
});

// /stats - Show user usage statistics
bot.command("stats", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
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
  
  await ctx.reply(statsMsg, { parse_mode: "Markdown" });
});

// /persona - Set custom AI personality
bot.command("persona", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  const u = ctx.from;
  if (!u?.id) return;
  
  const user = ensureUser(u.id, u);
  const args = ctx.message.text.split(" ").slice(1).join(" ").trim();
  
  if (!args) {
    // Show current persona and help
    const currentPersona = user.persona || "Default (helpful AI assistant)";
    return ctx.reply(
      `🎭 *Custom Persona*\n\nCurrent: _${currentPersona}_\n\n*Usage:*\n\`/persona friendly teacher\`\n\`/persona sarcastic comedian\`\n\`/persona wise philosopher\`\n\`/persona reset\` - Back to default\n\n_Your persona affects all AI responses!_`,
      { parse_mode: "Markdown" }
    );
  }
  
  if (args.toLowerCase() === "reset") {
    delete user.persona;
    saveUsers();
    return ctx.reply("✅ Persona reset to default helpful AI assistant!");
  }
  
  // Set new persona
  user.persona = args.slice(0, 100); // Limit to 100 chars
  saveUsers();
  
  await ctx.reply(`✅ *Persona set!*\n\nAI will now respond as: _${user.persona}_\n\n_Use \`/persona reset\` to go back to default._`, { parse_mode: "Markdown" });
});

// /history - Show recent prompts and allow quick re-use
bot.command("history", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  const u = ctx.from;
  if (!u?.id) return;
  
  const user = getUserRecord(u.id);
  if (!user || !user.history || user.history.length === 0) {
    return ctx.reply("📜 *No history yet!*\n\nYour recent inline queries will appear here.\n\n_Try using @starztechbot in any chat!_", { parse_mode: "Markdown" });
  }
  
  const modeEmojis = {
    quark: "⭐",
    blackhole: "🗿🔬",
    code: "💻",
    explain: "🧠",
    character: "🎭",
    summarize: "📝",
    default: "⚡",
  };
  
  let historyText = "📜 *Recent Prompts*\n\n";
  user.history.forEach((item, i) => {
    const emoji = modeEmojis[item.mode] || "⚡";
    const timeAgo = getTimeAgo(item.timestamp);
    historyText += `${i + 1}. ${emoji} _${item.prompt}_\n   ⏰ ${timeAgo}\n\n`;
  });
  
  historyText += "_Tap a button to re-use a prompt!_";
  
  // Create buttons for quick re-use (first 5)
  const keyboard = new InlineKeyboard();
  user.history.slice(0, 5).forEach((item, i) => {
    const prefix = item.mode === "quark" ? "q: " : 
                   item.mode === "blackhole" ? "b: " :
                   item.mode === "code" ? "code: " :
                   item.mode === "explain" ? "e: " :
                   item.mode === "summarize" ? "sum: " : "";
    keyboard.switchInlineCurrent(`${i + 1}. ${item.prompt.slice(0, 15)}...`, `${prefix}${item.prompt}`);
    if (i % 2 === 1) keyboard.row();
  });
  
  await ctx.reply(historyText, { parse_mode: "Markdown", reply_markup: keyboard });
});

// /partner - Manage your AI partner
bot.command("partner", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  const u = ctx.from;
  if (!u?.id) return;
  
  const args = ctx.message.text.split(" ").slice(1);
  const subcommand = args[0]?.toLowerCase();
  const value = args.slice(1).join(" ").trim();
  
  const partner = getPartner(u.id);
  
  // No subcommand - show partner setup with checklist buttons
  if (!subcommand) {
    return ctx.reply(
      buildPartnerSetupMessage(partner),
      { parse_mode: "Markdown", reply_markup: buildPartnerKeyboard(partner) }
    );
  }
  
  // Subcommands
  switch (subcommand) {
    case "name":
      if (!value) return ctx.reply("❌ Please provide a name: `/partner name Luna`", { parse_mode: "Markdown" });
      setPartner(u.id, { name: value.slice(0, 50) });
      return ctx.reply(`✅ Partner name set to: *${value.slice(0, 50)}*`, { parse_mode: "Markdown" });
      
    case "personality":
      if (!value) return ctx.reply("❌ Please provide personality traits: `/partner personality cheerful, witty, caring`", { parse_mode: "Markdown" });
      setPartner(u.id, { personality: value.slice(0, 200) });
      return ctx.reply(`✅ Partner personality set to: _${value.slice(0, 200)}_`, { parse_mode: "Markdown" });
      
    case "background":
      if (!value) return ctx.reply("❌ Please provide a background: `/partner background A mysterious traveler from another dimension`", { parse_mode: "Markdown" });
      setPartner(u.id, { background: value.slice(0, 300) });
      return ctx.reply(`✅ Partner background set to: _${value.slice(0, 300)}_`, { parse_mode: "Markdown" });
      
    case "style":
      if (!value) return ctx.reply("❌ Please provide a speaking style: `/partner style speaks softly with poetic phrases`", { parse_mode: "Markdown" });
      setPartner(u.id, { style: value.slice(0, 200) });
      return ctx.reply(`✅ Partner speaking style set to: _${value.slice(0, 200)}_`, { parse_mode: "Markdown" });
      
    case "chat":
      if (!partner?.name) {
        return ctx.reply("❌ Please set up your partner first! Use `/partner name [name]` to start.", { parse_mode: "Markdown" });
      }
      setPartner(u.id, { active: true });
      return ctx.reply(`🤝🏻 *Partner mode activated!*\n\n${partner.name} is now ready to chat. Just send messages and they'll respond in character.\n\n_Use \`/partner stop\` to end the conversation._`, { parse_mode: "Markdown" });
      
    case "stop":
      if (partner) {
        setPartner(u.id, { active: false });
      }
      return ctx.reply("⏹ Partner mode deactivated. Normal AI responses resumed.");
      
    case "clearchat":
      clearPartnerChat(u.id);
      return ctx.reply("🗑 Partner chat history cleared. Starting fresh!");
      
    case "clear":
    case "delete":
      clearPartner(u.id);
      return ctx.reply("❌ Partner deleted. Use `/partner` to create a new one.", { parse_mode: "Markdown" });
      
    default:
      return ctx.reply(
        `❓ Unknown subcommand: \`${subcommand}\`\n\n*Available:* name, personality, background, style, chat, stop, clearchat, clear`,
        { parse_mode: "Markdown" }
      );
  }
});

// /char - Quick character mode for DM/GC
bot.command("char", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
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
      ? `🎭 <b>Active Character:</b> ${escapeHTML(activeChar.name)}\n\n`
      : "🎭 <b>No active character</b>\n\n";
    
    const savedList = savedChars.length > 0
      ? `💾 <b>Saved Characters:</b>\n${savedChars.map((c, i) => `${i + 1}. ${escapeHTML(c)}`).join("\n")}\n\n`
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
    ].join("\n");
    
    return ctx.reply(helpText, { 
      parse_mode: "HTML",
      reply_markup: buildCharacterKeyboard(savedChars, activeChar)
    });
  }
  
  // Subcommands
  switch (subcommand) {
    case "save": {
      if (!value) return ctx.reply("❌ Please provide a character name: `/char save yoda`", { parse_mode: "Markdown" });
      const result = saveCharacter(u.id, value);
      const emoji = result.success ? "✅" : "❌";
      return ctx.reply(`${emoji} ${result.message}`);
    }
    
    case "list": {
      if (savedChars.length === 0) {
        return ctx.reply("💾 *No saved characters yet!*\n\nUse `/char save [name]` to save one.", { parse_mode: "Markdown" });
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
      return ctx.reply(`⏹ Character mode stopped. ${activeChar.name} has left the chat.\n\n_Normal AI responses resumed._`, { parse_mode: "Markdown" });
    }
    
    default: {
      // Assume it's a character name to activate
      const characterName = args.join(" ").trim();
      if (!characterName) {
        return ctx.reply("❌ Please provide a character name: `/char yoda`", { parse_mode: "Markdown" });
      }
      
      setActiveCharacter(u.id, chat.id, characterName);
      
      const chatType = chat.type === "private" ? "DM" : "group";
      return ctx.reply(
        `🎭 *${characterName}* is now active in this ${chatType}!\n\nJust send messages and they'll respond in character.\n\n_Use \`/char stop\` to end._`,
        { parse_mode: "Markdown" }
      );
    }
  }
});

// /default - Stop character mode and return to normal AI
bot.command("default", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  const u = ctx.from;
  const chat = ctx.chat;
  if (!u?.id) return;
  
  const activeChar = getActiveCharacter(u.id, chat.id);
  
  if (!activeChar) {
    return ctx.reply("✅ Already in default mode. No active character.");
  }
  
  clearActiveCharacter(u.id, chat.id);
  return ctx.reply(`⏹ <b>${escapeHTML(activeChar.name)}</b> has left the chat.\n\n<i>Normal AI responses resumed.</i>`, { parse_mode: "HTML" });
});

// Build character selection keyboard
function buildCharacterKeyboard(savedChars, activeChar) {
  const keyboard = new InlineKeyboard();
  
  // Add saved character buttons (2 per row)
  for (let i = 0; i < savedChars.length; i += 2) {
    const char1 = savedChars[i];
    const isActive1 = activeChar?.name?.toLowerCase() === char1.toLowerCase();
    keyboard.text(`${isActive1 ? "✅ " : "🎭 "} ${char1}`, `char_activate:${char1}`);
    
    if (savedChars[i + 1]) {
      const char2 = savedChars[i + 1];
      const isActive2 = activeChar?.name?.toLowerCase() === char2.toLowerCase();
      keyboard.text(`${isActive2 ? "✅ " : "🎭 "} ${char2}`, `char_activate:${char2}`);
    }
    keyboard.row();
  }
  
  // Add stop button if character is active
  if (activeChar) {
    keyboard.text("⏹ Stop Character", "char_stop");
  }
  
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
    ? `🎭 <b>Active Character:</b> ${escapeHTML(activeChar.name)}\n\n`
    : "🎭 <b>No active character</b>\n\n";
  
  const savedList = savedChars.length > 0
    ? `💾 <b>Saved Characters:</b>\n${savedChars.map((c, i) => `${i + 1}. ${escapeHTML(c)}`).join("\n")}\n\n`
    : "";
  
  const helpText = [
    statusText,
    savedList,
    "<b>Commands:</b>",
    "• /char yoda - Start as Yoda",
    "• /char save yoda - Save character",
    "• /char list - Show saved",
    "• /char stop or /default - Stop",
    "",
    "<i>Tap a character button to start!</i>",
  ].join("\n");
  
  await ctx.reply(helpText, { 
    parse_mode: "HTML",
    reply_markup: buildCharacterKeyboard(savedChars, activeChar)
  });
});

// Partner callback handlers - Setup field buttons
const pendingPartnerInput = new Map(); // userId -> { field, messageId }

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
  await ctx.reply(
    buildPartnerSetupMessage(partner),
    { parse_mode: "Markdown", reply_markup: buildPartnerKeyboard(partner) }
  );
});

bot.callbackQuery("do_stats", async (ctx) => {
  await ctx.answerCallbackQuery();
  const u = ctx.from;
  const userRecord = getUserRecord(u.id);
  
  if (!userRecord) {
    return ctx.reply("❌ Not registered yet. Use /register first.");
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
  
  await ctx.reply(stats, { parse_mode: "Markdown" });
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
    row.push({
      text: `${m1 === currentModel ? "✅ " : ""}${m1}`,
      callback_data: `setmodel:${m1}`,
    });
    
    if (models[i + 1]) {
      const m2 = models[i + 1];
      row.push({
        text: `${m2 === currentModel ? "✅ " : ""}${m2}`,
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

  const u = ensureUser(ctx.from.id, ctx.from);
  const current = ensureChosenModelValid(ctx.from.id);

  await ctx.reply(
    `👤 Plan: *${u.tier.toUpperCase()}*\n🤖 Current: \`${current}\`\n\nSelect a category:`,
    { parse_mode: "Markdown", reply_markup: modelCategoryKeyboard(u.tier) }
  );
});

bot.command("whoami", async (ctx) => {
  const u = ensureUser(ctx.from.id, ctx.from);
  const model = ensureChosenModelValid(ctx.from.id);
  const stats = u.stats || {};
  
  const lines = [
    `👤 *Your Profile*`,
    ``,
    `🆔 User ID: \`${ctx.from.id}\``,
    `📛 Username: ${u.username ? "@" + u.username : "_not set_"}`,
    `👋 Name: ${u.firstName || "_not set_"}`,
    ``,
    `🎫 *Tier:* ${u.tier.toUpperCase()}`,
    `🤖 *Model:* \`${model}\``,
    ``,
    `📊 *Usage Stats*`,
    `• Messages: ${stats.totalMessages || 0}`,
    `• Inline queries: ${stats.totalInlineQueries || 0}`,
    `• Last active: ${stats.lastActive ? new Date(stats.lastActive).toLocaleString() : "_unknown_"}`,
    ``,
    `📅 Registered: ${u.registeredAt ? new Date(u.registeredAt).toLocaleDateString() : "_unknown_"}`,
  ];
  
  await ctx.reply(lines.join("\n"), { parse_mode: "Markdown" });
});

// =====================
// OWNER COMMANDS
// =====================

// Bot status command
bot.command("status", async (ctx) => {
  if (!isOwner(ctx)) return ctx.reply("🚫 Owner only.");
  
  const totalUsers = Object.keys(usersDb.users).length;
  const usersByTier = { free: 0, premium: 0, ultra: 0 };
  let totalMessages = 0;
  let totalInline = 0;
  let activeToday = 0;
  let activeWeek = 0;
  
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const weekMs = 7 * dayMs;
  
  for (const [id, user] of Object.entries(usersDb.users)) {
    usersByTier[user.tier] = (usersByTier[user.tier] || 0) + 1;
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
    ``,
    `📈 *Activity*`,
    `• Active today: ${activeToday}`,
    `• Active this week: ${activeWeek}`,
    `• Total messages: ${totalMessages}`,
    `• Total inline queries: ${totalInline}`,
    ``,
    `💬 *Sessions*`,
    `• Inline chat sessions: ${inlineSessions}`,
    `• Active DM chats: ${chatHistory.size}`,
    `• Inline cache entries: ${inlineCache.size}`,
    ``,
    `⚙️ *Config*`,
    `• Free models: ${FREE_MODELS.length}`,
    `• Premium models: ${PREMIUM_MODELS.length}`,
    `• Ultra models: ${ULTRA_MODELS.length}`,
    `• Rate limit: ${RATE_LIMIT_PER_MINUTE}/min`,
  ];
  
  await ctx.reply(lines.join("\n"), { parse_mode: "Markdown" });
});

// User info command
bot.command("info", async (ctx) => {
  if (!isOwner(ctx)) return ctx.reply("🚫 Owner only.");
  
  const args = (ctx.message?.text || "").split(/\s+/).slice(1);
  if (args.length < 1) return ctx.reply("Usage: /info <userId>");
  
  const [targetId] = args;
  const user = getUserRecord(targetId);
  
  if (!user) {
    return ctx.reply(`❌ User ${targetId} not found.`);
  }
  
  const stats = user.stats || {};
  const inlineSession = inlineSessionsDb.sessions[targetId];
  
  const lines = [
    `👤 *User Info*`,
    ``,
    `🆔 ID: \`${targetId}\``,
    `📛 Username: ${user.username ? "@" + user.username : "_not set_"}`,
    `👋 Name: ${user.firstName || "_not set_"}`,
    ``,
    `🎫 *Tier:* ${user.tier?.toUpperCase() || "FREE"}`,
    `🤖 *Current Model:* \`${user.model || "_default_"}\``,
    ``,
    `📊 *Usage Stats*`,
    `• Total messages: ${stats.totalMessages || 0}`,
    `• Inline queries: ${stats.totalInlineQueries || 0}`,
    `• Last model used: ${stats.lastModel || "_unknown_"}`,
    `• Last active: ${stats.lastActive ? new Date(stats.lastActive).toLocaleString() : "_unknown_"}`,
    ``,
    `💬 *Inline Session*`,
    `• History length: ${inlineSession?.history?.length || 0} messages`,
    `• Session model: ${inlineSession?.model || "_none_"}`,
    ``,
    `📅 Registered: ${user.registeredAt ? new Date(user.registeredAt).toLocaleString() : "_unknown_"}`,
    `🔑 Allowed models: ${allModelsForTier(user.tier || "free").length} (${user.tier || "free"} tier)`,
  ];
  
  await ctx.reply(lines.join("\n"), { parse_mode: "Markdown" });
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

// =====================
// CALLBACKS: HELP / REGISTER / MODEL
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
    "📊 *Stats & History*",
    "• /stats - Your usage statistics",
    "• /history - Recent prompts with quick re-use",
    "",
    "📡 *Multi-Platform*",
    "• DM - Direct chat with AI",
    "• Groups - Mention @starztechbot",
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
      `${categoryTitle(category)} Models\n🤖 Current: \`${current}\`\n\nSelect a model:`,
      { parse_mode: "Markdown", reply_markup: modelListKeyboard(category, current, u.tier) }
    );
  } catch {
    // If edit fails, send new message
    await ctx.reply(
      `${categoryTitle(category)} Models\n🤖 Current: \`${current}\`\n\nSelect a model:`,
      { parse_mode: "Markdown", reply_markup: modelListKeyboard(category, current, u.tier) }
    );
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
      `👤 Plan: *${u.tier.toUpperCase()}*\n🤖 Current: \`${current}\`\n\nSelect a category:`,
      { parse_mode: "Markdown", reply_markup: modelCategoryKeyboard(u.tier) }
    );
  } catch {
    // If edit fails, send new message
    await ctx.reply(
      `👤 Plan: *${u.tier.toUpperCase()}*\n🤖 Current: \`${current}\`\n\nSelect a category:`,
      { parse_mode: "Markdown", reply_markup: modelCategoryKeyboard(u.tier) }
    );
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
    // Show success message with back to categories option
    await ctx.editMessageText(
      `✅ Switched to *${modelId}*\n\n👤 Plan: *${u.tier.toUpperCase()}*`,
      { 
        parse_mode: "Markdown", 
        reply_markup: { 
          inline_keyboard: [[{ text: "← Back to Models", callback_data: "model_back" }]] 
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

// Page navigation (doesn't count towards rate limit - it's just navigation)
bot.callbackQuery(/^schat_page:(.+):(\d+)$/, async (ctx) => {
  
  const parts = ctx.callbackQuery.data.split(":");
  const chatKey = parts[1];
  const page = parseInt(parts[2], 10);
  
  const session = getSharedChat(chatKey);
  if (!session) {
    return ctx.answerCallbackQuery({ text: "Chat expired. Start a new one!", show_alert: true });
  }
  
  const totalPages = getSharedChatPageCount(session);
  await ctx.answerCallbackQuery({ text: `Page ${page}/${totalPages}` });
  
  try {
    await ctx.editMessageText(
      formatSharedChatDisplay(session, page),
      { 
        parse_mode: "Markdown",
        reply_markup: sharedChatKeyboard(chatKey, page, totalPages)
      }
    );
  } catch {
    // Message unchanged
  }
});

// Noop for page indicator button (doesn't count towards rate limit)
bot.callbackQuery(/^schat_noop$/, async (ctx) => {
  await ctx.answerCallbackQuery();
});

// Ask AI - DM user for input, then update the original inline message
bot.callbackQuery(/^schat_ask:(.+)$/, async (ctx) => {
  const chatKey = ctx.callbackQuery.data.split(":")[1];
  const session = getSharedChat(chatKey);
  const userId = ctx.from?.id;
  const userName = ctx.from?.first_name || "User";
  
  if (!session) {
    return ctx.answerCallbackQuery({ text: "Chat expired. Start a new one!", show_alert: true });
  }
  
  await ctx.answerCallbackQuery({ text: "Check your DM with the bot!" });
  
  // Store pending input state
  pendingSharedInput.set(String(userId), {
    chatKey,
    userName,
    inlineMessageId: session.inlineMessageId,
    timestamp: Date.now()
  });
  
  // DM the user
  try {
    await bot.api.sendMessage(
      userId,
      `💬 *Group Chat Input*\n\nType your message for the Yap chat:\n\n_Your message will appear in the group chat and AI will respond!_`,
      { parse_mode: "Markdown" }
    );
  } catch (e) {
    console.error("Failed to DM user for schat_ask:", e.message);
    // User might not have started the bot
    await ctx.answerCallbackQuery({ 
      text: "Please start a chat with @starztechbot first!", 
      show_alert: true 
    });
  }
});

// Refresh shared chat display (shows last page)
bot.callbackQuery(/^schat_refresh:(.+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const chatKey = ctx.callbackQuery.data.split(":")[1];
  const session = getSharedChat(chatKey);
  
  if (!session) {
    return ctx.answerCallbackQuery({ text: "Chat expired. Start a new one!", show_alert: true });
  }
  
  const totalPages = getSharedChatPageCount(session);
  await ctx.answerCallbackQuery({ text: "Refreshed! 🔄" });
  
  try {
    await ctx.editMessageText(
      formatSharedChatDisplay(session, -1), // -1 = last page
      { 
        parse_mode: "Markdown",
        reply_markup: sharedChatKeyboard(chatKey, -1, totalPages)
      }
    );
  } catch {
    // Message unchanged
  }
});

// Clear shared chat
bot.callbackQuery(/^schat_clear:(.+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const chatKey = ctx.callbackQuery.data.split(":")[1];
  const session = clearSharedChat(chatKey);
  
  if (!session) {
    return ctx.answerCallbackQuery({ text: "Chat expired. Start a new one!", show_alert: true });
  }
  
  await ctx.answerCallbackQuery({ text: "Chat cleared! 🗑️" });
  
  try {
    await ctx.editMessageText(
      formatSharedChatDisplay(session, 1),
      { 
        parse_mode: "Markdown",
        reply_markup: sharedChatKeyboard(chatKey, 1, 1)
      }
    );
  } catch {
    // ignore
  }
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
  if (!(await enforceRateLimit(ctx))) return;

  const chat = ctx.chat;
  const u = ctx.from;
  const text = (ctx.message?.text || "").trim();
  const messageId = ctx.message?.message_id;

  if (!text || !u?.id) return;

  // Ignore commands
  if (text.startsWith("/")) return;
  
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
  
  // Check if this is a reply to a Yap message (via @starztechbot)
  // But NOT if it's a character message (starts with 🎭) or user has active character
  const replyTo = ctx.message?.reply_to_message;
  const isCharacterMessage = replyTo?.text?.startsWith("🎭");
  
  if (replyTo && replyTo.via_bot?.username === "starztechbot" && !isCharacterMessage && !userHasActiveChar) {
    // This is a reply to a Yap! Find the session by checking the message content
    const yapText = replyTo.text || "";
    
    // Look for a Yap session that matches this chat
    // We need to find the chatKey from the inline message
    // For now, search all sessions for one with matching inlineMessageId or recent activity
    let foundChatKey = null;
    let foundSession = null;
    
    for (const [chatKey, session] of sharedChats.entries()) {
      // Check if this session was recently active (within 1 hour)
      const lastActivity = session.history?.length > 0 
        ? session.history[session.history.length - 1].timestamp 
        : session.createdAt;
      
      if (Date.now() - lastActivity < 60 * 60 * 1000) {
        // Check if the message looks like a Yap
        if (yapText.includes("StarzAI Yap")) {
          foundChatKey = chatKey;
          foundSession = session;
          break;
        }
      }
    }
    
    if (foundSession && foundSession.inlineMessageId) {
      const userName = u.first_name || "User";
      
      // Add user message to session
      addSharedChatMessage(foundChatKey, userName, text);
      addSharedChatParticipant(foundChatKey, userName);
      
      // Delete the reply message to keep chat clean (optional)
      try {
        await ctx.deleteMessage();
      } catch (e) {
        // Can't delete in some chats, that's ok
      }
      
      // Update Yap with "thinking..."
      const totalPages = getSharedChatPageCount(foundSession);
      try {
        await bot.api.editMessageTextInline(
          foundSession.inlineMessageId,
          formatSharedChatDisplay(foundSession, -1) + "\n\n_🤖 AI is thinking..._",
          { 
            parse_mode: "Markdown",
            reply_markup: sharedChatKeyboard(foundChatKey, -1, totalPages)
          }
        );
      } catch (e) {
        console.error("Failed to update Yap:", e.message);
      }
      
      // Get AI response
      try {
        const yapModel = foundSession.model || ensureChosenModelValid(u.id);
        const messages = [
          { role: "system", content: "You are StarzAI in a chat. Be friendly, helpful, and concise." },
          ...foundSession.history.slice(-10).map(m => ({
            role: m.role,
            content: m.role === "user" ? `${m.userName}: ${m.content}` : m.content
          }))
        ];
        
        const aiResponse = await llmText({
          model: yapModel,
          messages,
          temperature: 0.7,
          max_tokens: 500,
        });
        
        // Add AI response to session
        addSharedChatMessage(foundChatKey, "AI", aiResponse, "assistant");
        
        // Update Yap with response
        const updatedSession = getSharedChat(foundChatKey);
        const newTotalPages = getSharedChatPageCount(updatedSession);
        
        await bot.api.editMessageTextInline(
          foundSession.inlineMessageId,
          formatSharedChatDisplay(updatedSession, -1),
          { 
            parse_mode: "Markdown",
            reply_markup: sharedChatKeyboard(foundChatKey, -1, newTotalPages)
          }
        );
        
      } catch (e) {
        console.error("Yap AI error:", e.message);
        // Show error in Yap
        try {
          await bot.api.editMessageTextInline(
            foundSession.inlineMessageId,
            formatSharedChatDisplay(foundSession, -1) + "\n\n_⚠️ AI response failed_",
            { 
              parse_mode: "Markdown",
              reply_markup: sharedChatKeyboard(foundChatKey, -1, totalPages)
            }
          );
        } catch {}
      }
      
      return; // Don't process as regular message
    }
  }
  
  // Check if user has pending shared chat input
  const pendingInput = pendingSharedInput.get(String(u.id));
  if (pendingInput && chat.type === "private") {
    // Clear the pending state
    pendingSharedInput.delete(String(u.id));
    
    // Check if not expired (5 min timeout)
    if (Date.now() - pendingInput.timestamp < 5 * 60 * 1000) {
      const { chatKey, userName, inlineMessageId } = pendingInput;
      const session = getSharedChat(chatKey);
      
      if (session) {
        // Check if we have the inline message ID
        const msgId = inlineMessageId || session.inlineMessageId;
        
        if (!msgId) {
          await ctx.reply(`⚠️ Session found but message ID missing. The Yap message may have been deleted. Start a new Yap session!`);
          return;
        }
        
        // Add user message to session
        addToSharedChat(chatKey, u.id, userName, "user", text);
        
        // Acknowledge in DM
        await ctx.reply(`✅ Message sent to group chat! Getting AI response...`);
        
        // Get AI response with streaming
        try {
          const yapModel = session.model || ensureChosenModelValid(u.id);
          const messages = [
            { role: "system", content: "You are StarzAI in a group chat. Multiple users may talk to you. Be friendly, helpful, and concise. Max 500 chars." },
            ...session.history.slice(-8).map(m => ({
              role: m.role,
              content: m.role === "user" ? `${m.userName}: ${m.content}` : m.content
            }))
          ];
          
          // Use streaming for real-time updates
          const aiResponse = await llmTextStream({
            model: yapModel,
            messages,
            temperature: 0.7,
            max_tokens: 400,
            onChunk: async (partialText) => {
              // Update the inline message with partial response
              const tempSession = { ...session, history: [...session.history, { role: "assistant", content: partialText + "█", userName: "AI", userId: "0" }] };
              const totalPages = Math.max(1, Math.ceil(tempSession.history.length / MESSAGES_PER_PAGE));
              try {
                await bot.api.editMessageTextInline(
                  msgId,
                  formatSharedChatDisplay(tempSession, -1),
                  {
                    parse_mode: "Markdown",
                    reply_markup: sharedChatKeyboard(chatKey, -1, totalPages),
                  }
                );
              } catch (e) {
                // Ignore edit errors (message unchanged, rate limit, etc)
              }
            },
          });
          
          // Add final AI response to session
          addToSharedChat(chatKey, 0, "AI", "assistant", aiResponse);
          
          // Final update with complete response
          const updatedSession = getSharedChat(chatKey);
          const totalPages = getSharedChatPageCount(updatedSession);
          
          await bot.api.editMessageTextInline(
            msgId,
            formatSharedChatDisplay(updatedSession, -1),
            {
              parse_mode: "Markdown",
              reply_markup: sharedChatKeyboard(chatKey, -1, totalPages),
            }
          );
          
          await ctx.reply(`✅ AI responded! Check the group chat.`);
        } catch (e) {
          console.error("Shared chat AI error:", e.message);
          await ctx.reply(`⚠️ AI is slow. Your message was added - tap Refresh in the group chat!`);
          
          // Still update the message to show user's message
          try {
            const updatedSession = getSharedChat(chatKey);
            const totalPages = getSharedChatPageCount(updatedSession);
            await bot.api.editMessageTextInline(
              msgId,
              formatSharedChatDisplay(updatedSession, -1) + `\n\n⏳ _Getting AI response..._`,
              {
                parse_mode: "Markdown",
                reply_markup: sharedChatKeyboard(chatKey, -1, totalPages),
              }
            );
          } catch {}
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
          `✅ *${field.charAt(0).toUpperCase() + field.slice(1)}* updated!\n\n` + buildPartnerSetupMessage(partner),
          { parse_mode: "Markdown", reply_markup: buildPartnerKeyboard(partner) }
        );
        return;
      }
    }
  }

  const model = ensureChosenModelValid(u.id);
  const botInfo = await bot.api.getMe();
  const botUsername = botInfo.username?.toLowerCase() || "";

  // Group: respond to ALL messages (no mention required)
  // Bot now works like DM in group chats

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
    // Send initial processing status
    statusMsg = await ctx.reply(`⏳ Processing with *${model}*...`, { parse_mode: "Markdown" });

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
      
      if (persona) {
        systemPrompt = replyContext
          ? `You are StarzTechBot with the personality of: ${persona}. The user is replying to a specific message. Focus on that context. Stay in character. Answer clearly.`
          : `You are StarzTechBot with the personality of: ${persona}. Stay in character throughout your response. Answer clearly.`;
      } else {
        systemPrompt = replyContext
          ? "You are StarzTechBot, a helpful AI. The user is replying to a specific message in the conversation. Focus your response on that context. Answer clearly. Don't mention system messages."
          : "You are StarzTechBot, a helpful AI. Answer clearly. Don't mention system messages.";
      }

      const userTextWithContext = replyContext + text;

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
        await ctx.reply(response, { parse_mode: "HTML" });
      }
    } else {
      await ctx.reply(response, { parse_mode: "HTML" });
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
        await ctx.reply(errMsg, { parse_mode: "HTML" });
      }
    } else {
      await ctx.reply(errMsg, { parse_mode: "HTML" });
    }
  }
});

// =====================
// PHOTO (DM only, optional)
// =====================
bot.on("message:photo", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;

  const chat = ctx.chat;
  const u = ctx.from;
  if (chat.type !== "private") return;
  if (!u?.id) return;

  if (!getUserRecord(u.id)) registerUser(u);

  const model = ensureChosenModelValid(u.id);
  const startTime = Date.now();
  let statusMsg = null;

  try {
    // Send initial processing status for images
    statusMsg = await ctx.reply(`🖼️ Analyzing image with *${model}*...`, { parse_mode: "Markdown" });

    // Keep typing indicator active
    const typingInterval = setInterval(() => {
      ctx.replyWithChatAction("typing").catch(() => {});
    }, 4000);
    await ctx.replyWithChatAction("typing");

    const caption = (ctx.message.caption || "").trim();
    const photos = ctx.message.photo;
    const best = photos[photos.length - 1];
    const file = await ctx.api.getFile(best.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;
    const b64 = await telegramFileToBase64(fileUrl);

    const out = await llmVisionReply({
      chatId: chat.id,
      userText: caption || "What's in this image? Describe it clearly.",
      imageBase64: b64,
      mime: "image/jpeg",
      model,
    });

    clearInterval(typingInterval);

    // Track usage
    trackUsage(u.id, "message");

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    // Edit status message with response (cleaner than delete+send)
    // Convert AI output to Telegram HTML format
    const formattedOutput = convertToTelegramHTML(out.slice(0, 3700));
    const response = `${formattedOutput}\n\n<i>👁️ ${elapsed}s • ${model}</i>`;
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
    
    // Edit status message with error (cleaner than delete+send)
    const isTimeout = e.message?.includes("timed out");
    const errMsg = isTimeout
      ? `⏱️ Vision model <b>${model}</b> timed out after ${elapsed}s. Try /model to switch.`
      : `❌ Couldn't process image after ${elapsed}s. Try again or /model to switch.`;
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
      "",
      "_Tap a button or type directly!_",
    ].join("\n");
    
    const results = [
      {
        type: "article",
        id: `ask_ai_${sessionKey}`,
        title: "⚡ Ask AI",
        description: "Quick • Deep • Code • Explain • Character • Summarize",
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
          .switchInlineCurrent("🎭 Character", "as ")
          .switchInlineCurrent("📝 Summarize", "sum: ")
          .row()
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
          .url("💬 @supqts", "https://t.me/supqts")
          .url("⭐ @SoulStarXd", "https://t.me/SoulStarXd")
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
  
  // "yap" filter - show only yap option (starting new yap)
  if (qLower === "yap" || (qLower.startsWith("yap ") && !qLower.includes(":"))) {
    const chatKey = makeId(8);
    const userName = ctx.from?.first_name || "User";
    // Create session immediately so it's ready
    createSharedChat(chatKey, userId, userName, model);
    return safeAnswerInline(ctx, [
      {
        type: "article",
        id: `yap_start_${chatKey}`,  // IMPORTANT: Must match chosen_inline_result handler
        title: "👥 Start Yap Session",
        description: "Anyone in this chat can talk to AI together!",
        thumbnail_url: "https://img.icons8.com/fluency/96/conference-call.png",
        input_message_content: {
          message_text: `🤖 *StarzAI Yap*\n👥 1 participant • 📊 \`${model.split("/").pop()}\`\n━━━━━━━━━━━━━━━\n\n_No messages yet._\n_Reply to this message to chat!_\n\n━━━━━━━━━━━━━━━`,
          parse_mode: "Markdown",
        },
        reply_markup: sharedChatKeyboard(chatKey),
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
    
    // Wait for AI response, then show send button (works in private DMs)
    const replyKey = makeId(6);
    const replyShortModel = model.split("/").pop();
    
    try {
      // Build conversation history
      const messages = [
        { role: "system", content: "You are a helpful AI assistant. Continue the conversation naturally. Keep responses concise." },
      ];
      
      // Add history if available
      if (cached.history && cached.history.length > 0) {
        for (const msg of cached.history.slice(-6)) {
          messages.push({ role: msg.role, content: msg.content });
        }
      } else {
        // Fallback to prompt/answer
        messages.push({ role: "user", content: cached.prompt });
        messages.push({ role: "assistant", content: cached.answer });
      }
      
      // Add new user message
      messages.push({ role: "user", content: userMessage });
      
      const out = await llmText({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 500,
        timeout: 15000,
        retries: 1,
      });
      
      const answer = (out || "I couldn't generate a response.").slice(0, 2000);
      
      // Store new conversation state for future replies
      inlineCache.set(replyKey, {
        prompt: userMessage,
        answer,
        userId: String(userId),
        model,
        history: [
          ...(cached.history || [{ role: "user", content: cached.prompt }, { role: "assistant", content: cached.answer }]),
          { role: "user", content: userMessage },
          { role: "assistant", content: answer },
        ].slice(-10),  // Keep last 10 messages
        timestamp: Date.now(),
      });
      
      // Schedule cleanup
      setTimeout(() => inlineCache.delete(replyKey), 30 * 60 * 1000);
      
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `reply_${replyKey}`,
          title: `✉️ ${userMessage.slice(0, 40)}`,
          description: answer.slice(0, 80),
          thumbnail_url: "https://img.icons8.com/fluency/96/send.png",
          input_message_content: {
            message_text: `❓ *${userMessage}*\n\n${answer}\n\n_via StarzAI • ${replyShortModel}_`,
            parse_mode: "Markdown",
          },
          reply_markup: inlineAnswerKeyboard(replyKey),
        },
      ], { cache_time: 0, is_personal: true });
      
    } catch (e) {
      console.error("Reply error:", e.message);
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `reply_err_${replyKey}`,
          title: `✉️ ${userMessage.slice(0, 40)}`,
          description: "⚠️ Model is slow. Try again.",
          thumbnail_url: "https://img.icons8.com/fluency/96/error.png",
          input_message_content: {
            message_text: `❓ *${userMessage}*\n\n⚠️ _Model is slow right now. Please try again._\n\n_via StarzAI_`,
            parse_mode: "Markdown",
          },
        },
      ], { cache_time: 0, is_personal: true });
    }
  }
  
  // yap:chatKey: message - User is typing a message for the Yap
  if (qLower.startsWith("yap:") && q.includes(": ")) {
    const parts = q.split(": ");
    const chatKeyPart = parts[0].split(":")[1]; // Get chatKey from "yap:chatKey"
    const userMessage = parts.slice(1).join(": ").trim();
    
    const session = getSharedChat(chatKeyPart);
    
    if (!session) {
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `yap_expired_${sessionKey}`,
          title: "⚠️ Session Expired",
          description: "Start a new Yap session",
          thumbnail_url: "https://img.icons8.com/fluency/96/error.png",
          input_message_content: { message_text: "_" },
        },
      ], { cache_time: 0, is_personal: true });
    }
    
    if (!userMessage) {
      // Show typing hint
      return safeAnswerInline(ctx, [
        {
          type: "article",
          id: `yap_typing_${sessionKey}`,
          title: "✍️ Type your message...",
          description: "Your message will be added to the Yap",
          thumbnail_url: "https://img.icons8.com/fluency/96/chat.png",
          input_message_content: { message_text: "_" },
        },
      ], { cache_time: 0, is_personal: true });
    }
    
    // User has typed a message - show send button
    const userName = ctx.from?.first_name || "User";
    
    return safeAnswerInline(ctx, [
      {
        type: "article",
        id: `yap_send_${chatKeyPart}_${makeId(4)}`,
        title: `✉️ Send: ${userMessage.slice(0, 40)}${userMessage.length > 40 ? "..." : ""}`,
        description: `Tap to send your message to the Yap`,
        thumbnail_url: "https://img.icons8.com/fluency/96/send.png",
        input_message_content: { 
          message_text: `💬 *${userName}:* ${userMessage}`,
          parse_mode: "Markdown"
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
    
    // Store for Reply/Regen/Shorter/Longer buttons
    inlineCache.set(quickKey, {
      prompt: q,
      answer,
      userId: String(userId),
      model,
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
  
  // Store inlineMessageId for yap_start results AND create session
  if (resultId.startsWith("yap_start_")) {
    const chatKey = resultId.replace("yap_start_", "");
    
    // Create session if it doesn't exist
    let session = getSharedChat(chatKey);
    if (!session) {
      const model = ensureChosenModelValid(userId);
      session = createSharedChat(chatKey, userId, userName, model);
      console.log(`Created new Yap session: chatKey=${chatKey}`);
    }
    
    // Store the inline message ID
    if (inlineMessageId) {
      setSharedChatInlineMessageId(chatKey, inlineMessageId);
      console.log(`Stored inlineMessageId for chatKey=${chatKey}: ${inlineMessageId}`);
    }
    return;
  }
  
  // Handle yap_send - user sent a message to the Yap
  if (resultId.startsWith("yap_send_")) {
    // Extract chatKey from "yap_send_CHATKEY_RANDOM"
    const parts = resultId.split("_");
    const chatKey = parts[2]; // yap_send_CHATKEY_xxxx
    
    const session = getSharedChat(chatKey);
    if (!session) {
      console.log(`Yap session not found for chatKey=${chatKey}`);
      return;
    }
    
    // Get the user's message from the inline query
    const query = ctx.chosenInlineResult.query || "";
    // Query format: "yap:chatKey: message"
    const messageParts = query.split(": ");
    const userMessage = messageParts.slice(1).join(": ").trim();
    
    if (!userMessage) {
      console.log("No message found in query");
      return;
    }
    
    console.log(`Yap message from ${userName}: ${userMessage}`);
    
    // Add user message to session
    addSharedChatMessage(chatKey, userName, userMessage);
    
    // Add user as participant
    addSharedChatParticipant(chatKey, userName);
    
    // Get the inline message ID for the original Yap
    const yapInlineMessageId = session.inlineMessageId;
    
    if (!yapInlineMessageId) {
      console.log("No inlineMessageId stored for Yap");
      return;
    }
    
    // Update the Yap message to show "Thinking..."
    try {
      const totalPages = getSharedChatPageCount(session);
      await bot.api.editMessageTextInline(
        yapInlineMessageId,
        formatSharedChatDisplay(session, -1) + "\n\n_🤖 AI is thinking..._",
        { 
          parse_mode: "Markdown",
          reply_markup: sharedChatKeyboard(chatKey, -1, totalPages)
        }
      );
    } catch (e) {
      console.error("Failed to update Yap with thinking:", e.message);
    }
    
    // Get AI response
    try {
      const model = session.model || "openrouter/quasar-alpha";
      
      // Build conversation history for context
      const messages = [
        { role: "system", content: "You are a helpful AI assistant in a group chat. Keep responses concise and friendly. Multiple users may be chatting with you." },
      ];
      
      // Add recent history (last 10 messages)
      const recentHistory = (session.history || []).slice(-10);
      for (const msg of recentHistory) {
        if (msg.role === "user") {
          messages.push({ role: "user", content: `${msg.userName}: ${msg.content}` });
        } else {
          messages.push({ role: "assistant", content: msg.content });
        }
      }
      
      const aiResponse = await llmText({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 500,
      });
      
      // Add AI response to session
      addSharedChatMessage(chatKey, "AI", aiResponse, "assistant");
      
      // Update the Yap message with the response
      const updatedSession = getSharedChat(chatKey);
      const totalPages = getSharedChatPageCount(updatedSession);
      
      await bot.api.editMessageTextInline(
        yapInlineMessageId,
        formatSharedChatDisplay(updatedSession, -1),
        { 
          parse_mode: "Markdown",
          reply_markup: sharedChatKeyboard(chatKey, -1, totalPages)
        }
      );
      
      console.log(`Yap updated with AI response for chatKey=${chatKey}`);
      
    } catch (e) {
      console.error("Failed to get AI response for Yap:", e.message);
      
      // Update Yap to show error
      try {
        const totalPages = getSharedChatPageCount(session);
        await bot.api.editMessageTextInline(
          yapInlineMessageId,
          formatSharedChatDisplay(session, -1) + "\n\n_⚠️ AI response failed_",
          { 
            parse_mode: "Markdown",
            reply_markup: sharedChatKeyboard(chatKey, -1, totalPages)
          }
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
      const out = await llmText({
        model,
        messages: [
          { role: "system", content: "You are a helpful AI assistant. Continue the conversation naturally." },
          { role: "user", content: cached.prompt },
          { role: "assistant", content: cached.answer },
          { role: "user", content: userMessage },
        ],
        temperature: 0.7,
        max_tokens: 500,
      });
      
      const answer = (out || "I couldn't generate a response.").slice(0, 2000);
      const newKey = makeId(6);
      const shortModel = model.split("/").pop();
      
      // Store new conversation state for future replies
      inlineCache.set(newKey, {
        prompt: userMessage,
        answer,
        userId: pending.userId,
        model,
        history: [
          { role: "user", content: cached.prompt },
          { role: "assistant", content: cached.answer },
          { role: "user", content: userMessage },
          { role: "assistant", content: answer },
        ],
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
      
      // Store for Reply/Regen/Shorter/Longer buttons
      inlineCache.set(newKey, {
        prompt,
        answer,
        userId: pending.userId,
        model,
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
          { role: "system", content: "You are a research expert. Provide comprehensive, well-structured analysis with multiple perspectives. Include key facts, implications, and nuances. Use bullet points for clarity when appropriate." },
          { role: "user", content: `Provide deep analysis on: ${prompt}` },
        ],
        temperature: 0.7,
        max_tokens: 800,
      });
      
      const answer = (out || "No results").slice(0, 3000);
      const newKey = makeId(6);
      
      // Store for Regen/Shorter/Longer buttons
      inlineCache.set(newKey, {
        prompt,
        answer,
        userId: pending.userId,
        model,
        createdAt: Date.now(),
      });
      setTimeout(() => inlineCache.delete(newKey), 30 * 60 * 1000);
      
      // Track in history
      addToHistory(pending.userId, prompt, "blackhole");
      
      // Convert and update
      const formattedAnswer = convertToTelegramHTML(answer);
      const escapedPrompt = escapeHTML(prompt);
      
      await bot.api.editMessageTextInline(
        inlineMessageId,
        `🗿🔬 <b>Blackhole Analysis: ${escapedPrompt}</b>\n\n${formattedAnswer}\n\n<i>via StarzAI • Blackhole • ${shortModel}</i>`,
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
          { role: "system", content: "You are a research assistant. Give a concise but informative answer in 2-3 paragraphs. Be direct." },
          { role: "user", content: `Briefly explain: ${prompt}` },
        ],
        temperature: 0.7,
        max_tokens: 400,
      });
      
      const answer = (out || "No results").slice(0, 2000);
      const newKey = makeId(6);
      
      // Store for Regen/Shorter/Longer buttons
      inlineCache.set(newKey, {
        prompt,
        answer,
        userId: pending.userId,
        model,
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
        `🔍 <b>Research: ${escapedPrompt}</b>\n\n${formattedAnswer}\n\n<i>via StarzAI • ${shortModel}</i>`,
        { 
          parse_mode: "HTML",
          reply_markup: inlineAnswerKeyboard(newKey)
        }
      );
      console.log(`Research updated with AI response`);
      
    } catch (e) {
      console.error("Failed to get Research response:", e.message);
      const escapedPrompt = escapeHTML(prompt);
      try {
        await bot.api.editMessageTextInline(
          inlineMessageId,
          `🔍 <b>Research: ${escapedPrompt}</b>\n\n⚠️ <i>Error getting response. Try again!</i>\n\n<i>via StarzAI</i>`,
          { parse_mode: "HTML" }
        );
      } catch {}
    }
    
    // Clean up pending
    inlineCache.delete(`r_pending_${rKey}`);
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
          { role: "system", content: "You are an expert programmer. Provide clear, working code with brief explanations. Use proper code formatting with language tags. Focus on best practices and clean code." },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 600,
      });
      
      const answer = (out || "No code").slice(0, 2500);
      const newKey = makeId(6);
      
      inlineCache.set(newKey, {
        prompt,
        answer,
        userId: pending.userId,
        model,
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
      
      const answer = (out || "No explanation").slice(0, 1500);
      const newKey = makeId(6);
      
      inlineCache.set(newKey, {
        prompt,
        answer,
        userId: pending.userId,
        model,
        createdAt: Date.now(),
      });
      setTimeout(() => inlineCache.delete(newKey), 30 * 60 * 1000);
      
      addToHistory(pending.userId, prompt, "explain");
      
      const formattedAnswer = convertToTelegramHTML(answer);
      const escapedPrompt = escapeHTML(prompt);
      
      await bot.api.editMessageTextInline(
        inlineMessageId,
        `🧠 <b>Explain: ${escapedPrompt}</b>\n\n${formattedAnswer}\n\n<i>via StarzAI • Explain • ${shortModel}</i>`,
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
    }

    if (mode === "short") {
      newAnswer = await llmText({
        model: item.model,
        messages: [
          { role: "system", content: "Rewrite the answer to be shorter while keeping key details." },
          { role: "user", content: `PROMPT:\n${item.prompt}\n\nANSWER:\n${item.answer}` },
        ],
        temperature: 0.5,
        max_tokens: 200,
      });
    }

    if (mode === "long") {
      newAnswer = await llmText({
        model: item.model,
        messages: [
          { role: "system", content: "Expand the answer with more detail, structure, and examples if useful." },
          { role: "user", content: `PROMPT:\n${item.prompt}\n\nANSWER:\n${item.answer}` },
        ],
        temperature: 0.7,
        max_tokens: 420,
      });
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
