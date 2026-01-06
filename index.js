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
    }
  }
}

async function saveToTelegram(dataType) {
  if (!STORAGE_CHANNEL_ID) {
    // Fallback to local file storage
    if (dataType === "users") writeJson(USERS_FILE, usersDb);
    if (dataType === "prefs") writeJson(PREFS_FILE, prefsDb);
    if (dataType === "inlineSessions") writeJson(INLINE_SESSIONS_FILE, inlineSessionsDb);
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
    
  } catch (e) {
    console.error(`Failed to save ${dataType} to Telegram:`, e.message);
    // Fallback to local storage
    if (dataType === "users") writeJson(USERS_FILE, usersDb);
    if (dataType === "prefs") writeJson(PREFS_FILE, prefsDb);
    if (dataType === "inlineSessions") writeJson(INLINE_SESSIONS_FILE, inlineSessionsDb);
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

// =====================
// IN-MEMORY STATE
// =====================
const chatHistory = new Map(); // chatId -> [{role, content}...]
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
    await ctx.answerInlineQuery(
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

function registerUser(from) {
  return ensureUser(from.id, from);
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
// UI HELPERS
// =====================
function helpText() {
  return [
    "*StarzTechBot* — AI assistant",
    "",
    "📌 *Commands*",
    "• /start — Welcome",
    "• /help — This message",
    "• /register — Register account",
    "• /model — Choose AI model",
    "• /whoami — Your info",
    "• /reset — Clear chat memory",
    "",
    "💬 *Inline Mode*",
    "Type @starztechbot in any chat for interactive AI!",
    "",
    "🔧 *Owner commands*",
    "• /status — Bot status & stats",
    "• /info <userId> — User details",
    "• /grant <userId> <free|premium|ultra>",
    "• /revoke <userId>",
    "• /allow <userId> <modelId>",
    "• /deny <userId> <modelId>",
  ].join("\n");
}

function helpKeyboard() {
  return new InlineKeyboard()
    .text("Features", "help_features")
    .row()
    .text("Register", "do_register")
    .text("Model", "open_model")
    .row()
    .text("Who am I", "do_whoami")
    .row()
    .switchInline("Try inline", "");
}

function inlineAnswerKeyboard(key) {
  return new InlineKeyboard()
    .text("🔁 Regenerate", `inl_regen:${key}`)
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
    display += `_No messages yet._\n_Anyone can tap 💬 Ask to start!_`;
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
  
  // Main action - Ask AI via callback (will DM user for input)
  kb.text("💬 Ask AI", `schat_ask:${chatKey}`);
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
    "Yo 👋\n\nUse me in DM, groups (mention me), or inline.\nTap Help to see features.",
    { reply_markup: helpKeyboard() }
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
  await ctx.reply(helpText(), { parse_mode: "Markdown", reply_markup: helpKeyboard() });
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

  const model = ensureChosenModelValid(u.id);
  const botInfo = await bot.api.getMe();
  const botUsername = botInfo.username?.toLowerCase() || "";

  // Group: only respond if mentioned
  if (chat.type !== "private") {
    const mentioned =
      text.toLowerCase().includes(`@${botUsername}`) ||
      ctx.message?.reply_to_message?.from?.id === botInfo.id;

    if (!mentioned) return;
  }

  // Check if user is replying to a specific message
  const replyToMsg = ctx.message?.reply_to_message;
  let replyContext = "";
  if (replyToMsg && replyToMsg.text) {
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

    const systemPrompt = replyContext
      ? "You are StarzTechBot, a helpful AI. The user is replying to a specific message in the conversation. Focus your response on that context. Answer clearly. Don't mention system messages."
      : "You are StarzTechBot, a helpful AI. Answer clearly. Don't mention system messages.";

    const userTextWithContext = replyContext + text;

    const out = await llmChatReply({
      chatId: chat.id,
      userText: userTextWithContext,
      systemPrompt,
      model,
    });

    // Mark response as sent to stop typing
    responseSent = true;
    if (typingInterval) clearInterval(typingInterval);

    // Track usage
    trackUsage(u.id, "message");

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    // Delete status message and send response
    if (statusMsg) {
      try {
        await ctx.api.deleteMessage(chat.id, statusMsg.message_id);
      } catch {}
    }

    // Add timing footer
    const response = `${out.slice(0, 3700)}\n\n_⚡ ${elapsed}s • ${model}_`;
    await ctx.reply(response, { parse_mode: "Markdown" });
  } catch (e) {
    console.error(e);
    responseSent = true;
    if (typingInterval) clearInterval(typingInterval);
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const isTimeout = e.message?.includes("timed out");
    
    // Delete status message
    if (statusMsg) {
      try {
        await ctx.api.deleteMessage(chat.id, statusMsg.message_id);
      } catch {}
    }

    const errMsg = isTimeout 
      ? `⏱️ Model *${model}* timed out after ${elapsed}s. Try /model to switch, or try again.`
      : `❌ Error after ${elapsed}s. Try again in a moment.`;
    await ctx.reply(errMsg, { parse_mode: "Markdown" });
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

    // Delete status message and send response
    try {
      await ctx.api.deleteMessage(chat.id, statusMsg.message_id);
    } catch {}

    // Add timing footer
    const response = `${out.slice(0, 3700)}\n\n_👁️ ${elapsed}s • ${model}_`;
    await ctx.reply(response, { parse_mode: "Markdown" });
  } catch (e) {
    console.error("Vision error:", e.message);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    
    // Delete status message
    if (statusMsg) {
      try {
        await ctx.api.deleteMessage(chat.id, statusMsg.message_id);
      } catch {}
    }

    const isTimeout = e.message?.includes("timed out");
    const errMsg = isTimeout
      ? `⏱️ Vision model *${model}* timed out after ${elapsed}s. Try /model to switch.`
      : `❌ Couldn't process image after ${elapsed}s. Try again or /model to switch.`;
    await ctx.reply(errMsg, { parse_mode: "Markdown" });
  }
});

// =====================
// INLINE MODE - INTERACTIVE CHAT
// =====================
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

  // Empty query - show main menu with all modes
  if (!q || q.length === 0) {
    console.log("Showing main menu (empty query)");
    const chatKey = makeId(8);
    const userName = ctx.from?.first_name || "User";
    const shortModel = model.split("/").pop();
    
    // Create session for Yap immediately so it's ready when user selects it
    createSharedChat(chatKey, userId, userName, model);
    
    const results = [
      {
        type: "article",
        id: `yap_start_${chatKey}`,
        title: "👥 Yap (Group Chat)",
        description: "Start a shared AI chat anyone can join",
        thumbnail_url: "https://img.icons8.com/fluency/96/conference-call.png",
        input_message_content: {
          message_text: `🤖 *StarzAI Yap*\n👥 1 participant • 📊 \`${shortModel}\`\n━━━━━━━━━━━━━━━\n\n_No messages yet._\n_Anyone can tap 💬 Ask to start!_\n\n━━━━━━━━━━━━━━━`,
          parse_mode: "Markdown",
        },
        reply_markup: sharedChatKeyboard(chatKey),
      },
      {
        type: "article",
        id: `nav_research_${sessionKey}`,
        title: "🔍 Research",
        description: "▶️ Tap button to enter topic",
        thumbnail_url: "https://img.icons8.com/fluency/96/search.png",
        input_message_content: { message_text: "_" },
        reply_markup: new InlineKeyboard().switchInlineCurrent("🔍 Enter Research Topic", "r "),
      },
      {
        type: "article",
        id: `nav_settings_${sessionKey}`,
        title: `⚙️ Settings (${shortModel})`,
        description: "▶️ Tap button to change model",
        thumbnail_url: "https://img.icons8.com/fluency/96/settings.png",
        input_message_content: { message_text: "_" },
        reply_markup: new InlineKeyboard().switchInlineCurrent("⚙️ View Models", "s "),
      },
      {
        type: "article",
        id: `hint_quick_${sessionKey}`,
        title: "⚡ Quick Answer",
        description: "Just type your question directly!",
        thumbnail_url: "https://img.icons8.com/fluency/96/chat.png",
        input_message_content: { message_text: `⚡ *Quick Answer*\n\nJust type any question to get a fast answer!\n\nExample: \`what is photosynthesis\``, parse_mode: "Markdown" },
      },
    ];

    return ctx.answerInlineQuery(results, { cache_time: 0, is_personal: true });
  }
  
  // Filter modes when user types partial text
  const qLower = q.toLowerCase();
  const shortModel = model.split("/").pop();
  
  // =====================
  // SHORT PREFIX HANDLERS - r, t, s for quick access
  // =====================
  
  // "r " or "r:" - Research shortcut
  if (qLower.startsWith("r ") || qLower.startsWith("r:")) {
    const topic = q.slice(2).trim();
    
    if (!topic) {
      return ctx.answerInlineQuery([
        {
          type: "article",
          id: `r_typing_${sessionKey}`,
          title: "✍️ Type your research topic...",
          description: "Example: r quantum computing",
          thumbnail_url: "https://img.icons8.com/fluency/96/search.png",
          input_message_content: { message_text: "_" },
          reply_markup: new InlineKeyboard().switchInlineCurrent("← Back to Menu", ""),
        },
      ], { cache_time: 0, is_personal: true });
    }
    
    // Get research answer - must be fast for inline queries (Telegram has ~10s timeout)
    try {
      const out = await llmText({
        model,
        messages: [
          { role: "system", content: "You are a research assistant. Give a concise but informative answer in 2-3 paragraphs. Be direct." },
          { role: "user", content: `Briefly explain: ${topic}` },
        ],
        temperature: 0.7,
        max_tokens: 400,
        timeout: 8000,  // Must be fast for inline
        retries: 0,  // No retries for inline - need speed
      });
      
      const answer = (out || "No results").slice(0, 2000);
      
      return ctx.answerInlineQuery([
        {
          type: "article",
          id: `r_send_${makeId(6)}`,
          title: `✉️ Send: ${topic.slice(0, 35)}`,
          description: `🔍 ${answer.slice(0, 80)}...`,
          thumbnail_url: "https://img.icons8.com/fluency/96/send.png",
          input_message_content: {
            message_text: `🔍 *Research: ${topic}*\n\n${answer}\n\n_via StarzAI • ${shortModel}_`,
            parse_mode: "Markdown",
          },
        },
      ], { cache_time: 0, is_personal: true });
    } catch (e) {
      return ctx.answerInlineQuery([
        {
          type: "article",
          id: `r_err_${sessionKey}`,
          title: "⚠️ Taking too long...",
          description: "Try a simpler topic",
          thumbnail_url: "https://img.icons8.com/fluency/96/error.png",
          input_message_content: { message_text: "_" },
        },
      ], { cache_time: 0, is_personal: true });
    }
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
    
    return ctx.answerInlineQuery(results, { cache_time: 0, is_personal: true });
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
      return ctx.answerInlineQuery([
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
    
    return ctx.answerInlineQuery(results, { cache_time: 0, is_personal: true });
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
      
      return ctx.answerInlineQuery([
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
      return ctx.answerInlineQuery([
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
    return ctx.answerInlineQuery([
      {
        type: "article",
        id: `yap_start_${chatKey}`,  // IMPORTANT: Must match chosen_inline_result handler
        title: "👥 Start Yap Session",
        description: "Anyone in this chat can talk to AI together!",
        thumbnail_url: "https://img.icons8.com/fluency/96/conference-call.png",
        input_message_content: {
          message_text: `🤖 *StarzAI Yap*\n👥 1 participant • 📊 \`${model.split("/").pop()}\`\n━━━━━━━━━━━━━━━\n\n_No messages yet._\n_Anyone can tap 💬 Ask to start!_\n\n━━━━━━━━━━━━━━━`,
          parse_mode: "Markdown",
        },
        reply_markup: sharedChatKeyboard(chatKey),
      },
    ], { cache_time: 0, is_personal: true });
  }
  
  // NOTE: yap:chatKey:message inline query was removed because it creates duplicate messages
  // Instead, users tap "💬 Ask AI" button which DMs them for input, then edits the ORIGINAL message
  
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
    
    return ctx.answerInlineQuery(results, { cache_time: 0, is_personal: true });
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
      return ctx.answerInlineQuery([
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
    
    return ctx.answerInlineQuery(results, { cache_time: 0, is_personal: true });
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
      
      return ctx.answerInlineQuery([
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
      return ctx.answerInlineQuery([
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
      return ctx.answerInlineQuery([
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
      
      return ctx.answerInlineQuery([
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
      return ctx.answerInlineQuery([
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
        
        return ctx.answerInlineQuery(results, { cache_time: 0, is_personal: true });
      }
      
      // Show typing hint
      return ctx.answerInlineQuery([
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
      
      return ctx.answerInlineQuery([
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
      return ctx.answerInlineQuery([
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
      return ctx.answerInlineQuery([
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
      
      return ctx.answerInlineQuery([
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
      return ctx.answerInlineQuery([
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
      return ctx.answerInlineQuery([
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
      
      return ctx.answerInlineQuery([
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
      return ctx.answerInlineQuery([
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
  // First, immediately show a "loading" option so user sees something
  const loadingKey = makeId(6);
  
  // Use Promise.race to either get the answer or timeout gracefully
  const getAnswer = async () => {
    try {
      const out = await llmText({
        model,
        messages: [
          { role: "system", content: "Answer compactly and clearly. Prefer <= 900 characters." },
          { role: "user", content: q },
        ],
        temperature: 0.7,
        max_tokens: 240,
        timeout: 10000, // 10s timeout for inline
        retries: 0, // No retries for inline - need to be fast
      });
      return { success: true, answer: (out || "(no output)").slice(0, 3500) };
    } catch (e) {
      console.error("Inline LLM error:", e.message);
      return { success: false, error: e.message };
    }
  };
  
  const result = await getAnswer();
  
  if (result.success) {
    const answer = result.answer;
    const key = makeId(6);
    inlineCache.set(key, {
      prompt: q,
      answer,
      model,
      createdAt: nowMs(),
      userId: String(userId),
    });

    const results = [
      {
        type: "article",
        id: key,
        title: `⚡ ${q.slice(0, 40)}`,
        description: answer.slice(0, 90),
        input_message_content: { message_text: `❓ *${q}*\n\n${answer}`, parse_mode: "Markdown" },
        reply_markup: inlineAnswerKeyboard(key),
      },
    ];

    trackUsage(userId, "inline");
    await ctx.answerInlineQuery(results, { cache_time: 0, is_personal: true });
  } else {
    const isTimeout = result.error?.includes("timed out");
    const shortModel = model.split("/").pop();
    await ctx.answerInlineQuery(
      [
        {
          type: "article",
          id: "err_inline",
          title: isTimeout ? `⏱️ ${shortModel} is slow` : "⚠️ Error",
          description: isTimeout ? "Try gpt-4o-mini for faster results" : "Try again",
          input_message_content: { 
            message_text: isTimeout 
              ? `⏱️ Model \`${shortModel}\` is slow.\n\nTry using \`gpt-4o-mini\` for faster inline answers!\n\nUse /model in DM to switch.`
              : "⚠️ Request failed. Try again!",
            parse_mode: "Markdown"
          },
        },
      ],
      { cache_time: 1, is_personal: true }
    );
  }
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
  
});

// =====================
// INLINE BUTTON ACTIONS (Legacy)
// =====================
async function editInlineMessage(ctx, newText, key) {
  await ctx.editMessageText(newText.slice(0, 3500), {
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
