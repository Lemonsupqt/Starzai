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

const RATE_LIMIT_PER_MINUTE = Number(process.env.RATE_LIMIT_PER_MINUTE || 12);

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

// Initialize with local fallback (will be overwritten by Telegram data on startup)
let usersDb = readJson(USERS_FILE, { users: {} });
let prefsDb = readJson(PREFS_FILE, { userModel: {} });
let inlineSessionsDb = readJson(INLINE_SESSIONS_FILE, { sessions: {} });

// Track message IDs for each data type in the storage channel
let storageMessageIds = {
  users: null,
  prefs: null,
  inlineSessions: null,
};

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
    await saveToTelegram(dataType);
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
  
  console.log("Initializing Telegram storage channel...");
  
  try {
    // Verify channel access by getting chat info
    const chat = await bot.api.getChat(STORAGE_CHANNEL_ID);
    console.log(`Storage channel verified: ${chat.title || chat.id}`);
    console.log("Telegram storage ready. Data will be saved to channel on changes.");
    console.log("Using local files as primary data source, Telegram as backup/sync.");
    
  } catch (e) {
    console.error("Failed to access storage channel:", e.message);
    console.log("Make sure:");
    console.log("  1. STORAGE_CHANNEL_ID is correct (should be -100XXXXXXXXXX)");
    console.log("  2. Bot is admin in the storage channel");
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
  };
  sharedChatSessions.set(chatKey, session);
  return session;
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
function formatSharedChatDisplay(session) {
  const history = session.history || [];
  const model = session.model || "gpt-4o-mini";
  const participantCount = session.participants?.size || 1;
  
  let display = `🤖 *StarzAI Group Chat*\n`;
  display += `👥 ${participantCount} participant${participantCount > 1 ? "s" : ""} • 📊 \`${model.split("/").pop()}\`\n`;
  display += `━━━━━━━━━━━━━━━\n\n`;
  
  if (history.length === 0) {
    display += `_No messages yet._\n_Anyone can tap 💬 Ask to start!_`;
  } else {
    // Show last 6 messages
    const recentHistory = history.slice(-6);
    for (const msg of recentHistory) {
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

function sharedChatKeyboard(chatKey) {
  const kb = new InlineKeyboard();
  
  // Main action - anyone can ask
  kb.text("💬 Ask AI", `schat_ask:${chatKey}`);
  kb.row();
  
  // Secondary actions
  kb.text("🔄 Refresh", `schat_refresh:${chatKey}`)
    .text("🗑️ Clear", `schat_clear:${chatKey}`);
  
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
    `🔑 Allowed models: ${user.allowedModels?.length ? user.allowedModels.join(", ") : "_none_"}`,
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
// =====================

// Track pending input requests
const pendingSharedInput = new Map(); // odlUserId -> { chatKey, inline_message_id }

// Ask AI in shared chat
bot.callbackQuery(/^schat_ask:(.+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const userId = ctx.from?.id;
  const userName = ctx.from?.first_name || "User";
  if (!userId) return ctx.answerCallbackQuery({ text: "Error", show_alert: true });
  
  const chatKey = ctx.callbackQuery.data.split(":")[1];
  
  // Get or create the shared session
  let session = getSharedChat(chatKey);
  if (!session) {
    // Create new session with this user's model
    const model = ensureChosenModelValid(userId);
    session = createSharedChat(chatKey, userId, userName, model);
  }
  
  // Store pending input request
  pendingSharedInput.set(String(userId), {
    chatKey,
    inlineMessageId: ctx.callbackQuery.inline_message_id,
  });
  
  await ctx.answerCallbackQuery({ 
    text: "Type your message and send it to me in DM!",
    show_alert: true 
  });
  
  // Send DM to user asking for input
  try {
    await ctx.api.sendMessage(userId, 
      `💬 *Group Chat Input*\n\nType your message for the group AI chat:\n\n_Send any message and it will appear in the group chat!_`,
      { 
        parse_mode: "Markdown",
        reply_markup: new InlineKeyboard().text("❌ Cancel", `schat_cancel:${chatKey}`)
      }
    );
  } catch (e) {
    console.error("Could not DM user:", e.message);
    await ctx.answerCallbackQuery({ 
      text: "Start a DM with me first! Send /start to @starztechbot",
      show_alert: true 
    });
  }
});

// Cancel pending input
bot.callbackQuery(/^schat_cancel:(.+)$/, async (ctx) => {
  const userId = ctx.from?.id;
  if (userId) {
    pendingSharedInput.delete(String(userId));
  }
  await ctx.answerCallbackQuery({ text: "Cancelled" });
  try {
    await ctx.deleteMessage();
  } catch {}
});

// Refresh shared chat display
bot.callbackQuery(/^schat_refresh:(.+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const chatKey = ctx.callbackQuery.data.split(":")[1];
  const session = getSharedChat(chatKey);
  
  if (!session) {
    return ctx.answerCallbackQuery({ text: "Chat expired. Start a new one!", show_alert: true });
  }
  
  await ctx.answerCallbackQuery({ text: "Refreshed! 🔄" });
  
  try {
    await ctx.editMessageText(
      formatSharedChatDisplay(session),
      { 
        parse_mode: "Markdown",
        reply_markup: sharedChatKeyboard(chatKey)
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
      formatSharedChatDisplay(session),
      { 
        parse_mode: "Markdown",
        reply_markup: sharedChatKeyboard(chatKey)
      }
    );
  } catch {
    // ignore
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
  
  // Check if user has pending shared chat input (only in private chat)
  if (chat.type === "private") {
    const pending = pendingSharedInput.get(String(u.id));
    if (pending) {
      pendingSharedInput.delete(String(u.id));
      
      // Process shared chat message
      const { chatKey, inlineMessageId } = pending;
      let session = getSharedChat(chatKey);
      
      if (!session) {
        const model = ensureChosenModelValid(u.id);
        session = createSharedChat(chatKey, u.id, u.first_name || "User", model);
      }
      
      const userName = u.first_name || "User";
      
      // Add user message to shared chat
      addToSharedChat(chatKey, u.id, userName, "user", text);
      
      // Send confirmation
      await ctx.reply(`✅ Sent to group chat! Getting AI response...`);
      
      try {
        // Get AI response
        const model = session.model || "gpt-4o-mini";
        const messages = [
          { role: "system", content: "You are StarzAI, a helpful assistant in a group chat. Multiple users may be talking to you. Be friendly and helpful. Keep responses concise." },
          ...session.history.slice(-10).map(m => ({
            role: m.role,
            content: m.role === "user" ? `${m.userName}: ${m.content}` : m.content
          }))
        ];
        
        const aiResponse = await llmText({
          model,
          messages,
          temperature: 0.7,
          max_tokens: 500,
        });
        
        // Add AI response to shared chat
        addToSharedChat(chatKey, 0, "AI", "assistant", aiResponse);
        
        // Update the inline message
        if (inlineMessageId) {
          try {
            await bot.api.editMessageTextInline(
              inlineMessageId,
              formatSharedChatDisplay(session),
              { 
                parse_mode: "Markdown",
                reply_markup: sharedChatKeyboard(chatKey)
              }
            );
          } catch (e) {
            console.error("Could not update inline message:", e.message);
          }
        }
        
        await ctx.reply(`🤖 AI responded! Check the group chat.`);
      } catch (e) {
        console.error("Shared chat AI error:", e);
        await ctx.reply(`❌ AI error. Try again!`);
      }
      
      return; // Don't process as regular message
    }
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

  if (!userId) return;

  // Auto-register
  if (!getUserRecord(userId)) registerUser(ctx.from);

  const session = getInlineSession(userId);
  const model = session.model || ensureChosenModelValid(userId);
  const sessionKey = makeId(6);

  // Empty query - show main menu
  if (!q) {
    // Create a unique chat key for shared sessions
    const chatKey = makeId(8);
    const userName = ctx.from?.first_name || "User";
    
    const results = [
      {
        type: "article",
        id: `group_${chatKey}`,
        title: "👥 Start Group Chat",
        description: "Anyone in this chat can talk to AI!",
        thumbnail_url: "https://img.icons8.com/fluency/96/conference-call.png",
        input_message_content: {
          message_text: `🤖 *StarzAI Group Chat*\n👥 1 participant • 📊 \`${model.split("/").pop()}\`\n━━━━━━━━━━━━━━━\n\n_No messages yet._\n_Anyone can tap 💬 Ask to start!_\n\n━━━━━━━━━━━━━━━`,
          parse_mode: "Markdown",
        },
        reply_markup: sharedChatKeyboard(chatKey),
      },
      {
        type: "article",
        id: `chat_${sessionKey}`,
        title: "💬 My AI Chat",
        description: session.history.length > 0 
          ? `Continue chat (${session.history.length} messages)` 
          : "Personal conversation",
        thumbnail_url: "https://img.icons8.com/fluency/96/chat.png",
        input_message_content: {
          message_text: formatInlineChatDisplay(session, userId),
          parse_mode: "Markdown",
        },
        reply_markup: inlineChatKeyboard(sessionKey, session.history.length > 0),
      },
      {
        type: "article",
        id: `model_${sessionKey}`,
        title: `⚙️ Model: ${model.split("/").pop()}`,
        description: "Tap to change model",
        thumbnail_url: "https://img.icons8.com/fluency/96/settings.png",
        input_message_content: {
          message_text: `⚙️ *Model Settings*\n\nCurrent: \`${model}\`\n\nUse /model in DM to change.`,
          parse_mode: "Markdown",
        },
      },
    ];

    return ctx.answerInlineQuery(results, { cache_time: 0, is_personal: true });
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

  // Regular query - quick one-shot answer (legacy behavior) + chat option
  try {
    // Quick answer - use shorter timeout for inline (Telegram has ~15s limit)
    const out = await llmText({
      model,
      messages: [
        { role: "system", content: "Answer compactly and clearly. Prefer <= 900 characters." },
        { role: "user", content: q },
      ],
      temperature: 0.7,
      max_tokens: 240,
      timeout: 12000, // 12s timeout for inline queries
      retries: 1, // Only 1 retry for inline
    });

    const answer = (out || "(no output)").slice(0, 3500);

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
        title: "⚡ Quick Answer",
        description: answer.slice(0, 90),
        input_message_content: { message_text: answer },
        reply_markup: inlineAnswerKeyboard(key),
      },
      {
        type: "article",
        id: `addtochat_${sessionKey}`,
        title: "💬 Add to Chat",
        description: "Add this Q&A to your chat history",
        input_message_content: {
          message_text: `❓ *Question:* ${q}\n\n💡 *Answer:* ${answer}`,
          parse_mode: "Markdown",
        },
        reply_markup: new InlineKeyboard()
          .switchInlineCurrentChat("💬 Continue chat...", "chat:"),
      },
    ];

    // Track inline usage
    trackUsage(userId, "inline");

    await ctx.answerInlineQuery(results, { cache_time: 0, is_personal: true });
  } catch (e) {
    console.error("Inline error:", e.message);
    const isTimeout = e.message?.includes("timed out");
    await ctx.answerInlineQuery(
      [
        {
          type: "article",
          id: "err_inline",
          title: isTimeout ? "Model slow" : "Bot error",
          input_message_content: { 
            message_text: isTimeout 
              ? `Model ${model} is slow. Try again or use /model to switch.`
              : "Model call failed. Try again in a moment." 
          },
          description: isTimeout ? "Try a different model" : "Temporary issue",
        },
      ],
      { cache_time: 1, is_personal: true }
    );
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

    // Initialize Telegram storage
    await loadFromTelegram();

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
