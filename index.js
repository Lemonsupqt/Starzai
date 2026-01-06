import { Bot, InlineKeyboard, webhookCallback } from "grammy";
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

const MODEL_VISION = process.env.MODEL_VISION || ""; // optional

const OWNER_IDS = new Set(
  (process.env.OWNER_IDS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
);

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
// SIMPLE JSON STORAGE
// NOTE: Railway disk can reset on redeploy; later you can replace with Postgres/Redis.
// =====================
const DATA_DIR = process.env.DATA_DIR || ".data";
const USERS_FILE = path.join(DATA_DIR, "users.json");
const PREFS_FILE = path.join(DATA_DIR, "prefs.json");

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

const usersDb = readJson(USERS_FILE, { users: {} });
// usersDb.users[userId] = { role: "free"|"premium", allowedModels: [], registeredAt, username, firstName }

const prefsDb = readJson(PREFS_FILE, { userModel: {} });
// prefsDb.userModel[userId] = "modelId"

function saveUsers() {
  writeJson(USERS_FILE, usersDb);
}
function savePrefs() {
  writeJson(PREFS_FILE, prefsDb);
}

// =====================
// IN-MEMORY STATE
// =====================
const chatHistory = new Map(); // chatId -> [{role, content}...]
const inlineCache = new Map(); // key -> { prompt, answer, model, createdAt, userId }
const rate = new Map(); // userId -> { windowStartMs, count }

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
  if (!usersDb.users[id]) {
    usersDb.users[id] = {
      registeredAt: new Date().toISOString(),
      username: from?.username || null,
      firstName: from?.first_name || null,
      role: "free",
      tier: "free",
      model: DEFAULT_FREE_MODEL,
      allowedModels: [],
    };
    saveUsers();
  } else {
    // migration: if old users exist without tier
    if (!usersDb.users[id].tier) {
      usersDb.users[id].tier = usersDb.users[id].role || "free";
    }
    if (!usersDb.users[id].model) {
      usersDb.users[id].model = DEFAULT_FREE_MODEL;
    }
    saveUsers();
  }
  return usersDb.users[id];
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
// HISTORY
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

async function llmText({ model, messages, temperature = 0.7, max_tokens = 350 }) {
  try {
    const resp = await withTimeout(
      openai.chat.completions.create({
        model,
        messages,
        temperature,
        max_tokens,
      }),
      55000, // 55 second timeout (less than webhook timeout)
      `Model ${model} timed out`
    );
    return (resp?.choices?.[0]?.message?.content || "").trim();
  } catch (err) {
    console.error("LLM Error:", err.message);
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

async function telegramFileToBase64(fileUrl) {
  const r = await fetch(fileUrl);
  if (!r.ok) throw new Error("Failed to download image");
  const buf = Buffer.from(await r.arrayBuffer());
  return buf.toString("base64");
}

async function llmVisionReply({ chatId, userText, imageBase64, mime = "image/jpeg", model }) {
  if (!MODEL_VISION) {
    return "Vision is not enabled. Set MODEL_VISION on Railway to a vision-capable model id.";
  }

  const history = getHistory(chatId);
  const messages = [
    { role: "system", content: "You are a helpful multimodal assistant. Be concise." },
    ...history,
    {
      role: "user",
      content: [
        { type: "text", text: userText || "Describe this image." },
        { type: "image_url", image_url: { url: `data:${mime};base64,${imageBase64}` } },
      ],
    },
  ];

  const out = await llmText({ model, messages, temperature: 0.5, max_tokens: 350 });
  pushHistory(chatId, "user", userText || "[image]");
  pushHistory(chatId, "assistant", out);
  return out || "(no output)";
}

// =====================
// UI TEXT
// =====================
function helpText() {
  return [
    "✨ *StarzTechBot*",
    "",
    "• DM: just message me.",
    "• Groups: mention me (`@starztechbot`) or reply to my message.",
    "• Inline: type `@starztechbot <question>` in any chat.",
    "• Inline buttons: Regenerate / Shorter / Longer.",
    "• /register: create your account.",
    "• /model: choose models available to your plan.",
    "• /reset: clear memory for this chat.",
    "",
    "Owner-only:",
    "• /grant <userId> premium",
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
    .switchInline("Try inline", "yap explain black holes like I'm 12");
}

function inlineAnswerKeyboard(key) {
  return new InlineKeyboard()
    .text("🔁 Regenerate", `inl_regen:${key}`)
    .row()
    .text("✂️ Shorter", `inl_short:${key}`)
    .text("📈 Longer", `inl_long:${key}`);
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
  if (!u?.id) return ctx.reply("Couldn’t read your user id.");

  const existing = getUserRecord(u.id);
  if (existing) {
    return ctx.reply("✅ You’re already registered.", { reply_markup: helpKeyboard() });
  }

  registerUser(u);
  await ctx.reply("✅ Registered! Use /model to select models available to you.", {
    reply_markup: helpKeyboard(),
  });
});

bot.command("reset", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  chatHistory.delete(ctx.chat.id);
  await ctx.reply("Done. Memory cleared for this chat.");
});

bot.command("model", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;

  const u = ensureUser(ctx.from.id, ctx.from);
  const allowed = allModelsForTier(u.tier);
  const current = ensureChosenModelValid(ctx.from.id);

  if (!allowed.length) return ctx.reply("No models configured.");

  // Build buttons
  const rows = allowed.map((m) => [
    {
      text: `${m === current ? "✅ " : ""}${m}`,
      callback_data: `setmodel:${m}`,
    },
  ]);

  await ctx.reply(
    `Plan: ${u.tier}\nCurrent model: ${current}\nChoose:`,
    { reply_markup: { inline_keyboard: rows } }
  );
});

bot.command("whoami", async (ctx) => {
  const u = ensureUser(ctx.from.id, ctx.from);
  const model = ensureChosenModelValid(ctx.from.id);
  await ctx.reply(`Your userId: ${ctx.from.id}\nTier: ${u.tier}\nCurrent model: ${model}`);
});

// =====================
// OWNER COMMANDS
// =====================
bot.command("grant", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  if (!isOwner(ctx)) return ctx.reply("Owner only.");

  const parts = ctx.message.text.trim().split(/\s+/);
  const userId = parts[1];
  const tier = (parts[2] || "").toLowerCase();

  if (!userId || !["free", "premium", "ultra"].includes(tier)) {
    return ctx.reply("Usage: /grant <userId> <free|premium|ultra>");
  }

  const u = ensureUser(userId);
  u.tier = tier;
  u.role = tier; // keep role in sync for backwards compatibility
  // set default model for tier
  ensureChosenModelValid(userId);
  saveUsers();

  await ctx.reply(`Granted ${tier} to ${userId}.`);
});

bot.command("revoke", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  if (!isOwner(ctx)) return ctx.reply("Owner only.");

  const parts = ctx.message.text.trim().split(/\s+/);
  const userId = parts[1];
  if (!userId) return ctx.reply("Usage: /revoke <userId>");

  const u = ensureUser(userId);
  u.tier = "free";
  u.role = "free";
  ensureChosenModelValid(userId);
  saveUsers();

  await ctx.reply(`Reverted ${userId} to free.`);
});

bot.command("allow", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  if (!isOwner(ctx)) return ctx.reply("Owner only.");

  const parts = ctx.message.text.trim().split(/\s+/);
  const userId = parts[1];
  const modelId = parts.slice(2).join(" ");

  if (!userId || !modelId) return ctx.reply("Usage: /allow <userId> <modelId>");

  usersDb.users[userId] ||= {
    registeredAt: new Date().toISOString(),
    role: "free",
    allowedModels: [],
    username: null,
    firstName: null,
  };

  usersDb.users[userId].allowedModels ||= [];
  if (!usersDb.users[userId].allowedModels.includes(modelId)) {
    usersDb.users[userId].allowedModels.push(modelId);
    saveUsers();
  }

  await ctx.reply(`✅ Allowed ${modelId} for ${userId}`);
});

bot.command("deny", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  if (!isOwner(ctx)) return ctx.reply("Owner only.");

  const parts = ctx.message.text.trim().split(/\s+/);
  const userId = parts[1];
  const modelId = parts.slice(2).join(" ");

  if (!userId || !modelId) return ctx.reply("Usage: /deny <userId> <modelId>");

  const rec = usersDb.users[userId];
  if (!rec?.allowedModels?.length) return ctx.reply("No custom models set for that user.");

  rec.allowedModels = rec.allowedModels.filter((m) => m !== modelId);
  saveUsers();

  await ctx.reply(`✅ Removed ${modelId} from ${userId}`);
});

// =====================
// CALLBACKS: HELP / REGISTER / MODEL
// =====================
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

bot.callbackQuery("open_model", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;

  const u = ensureUser(ctx.from.id, ctx.from);
  const allowed = allModelsForTier(u.tier);
  const current = ensureChosenModelValid(ctx.from.id);

  if (!allowed.length) {
    await ctx.answerCallbackQuery({ text: "No models configured.", show_alert: true });
    return;
  }

  const rows = allowed.map((m) => [
    {
      text: `${m === current ? "✅ " : ""}${m}`,
      callback_data: `setmodel:${m}`,
    },
  ]);

  await ctx.answerCallbackQuery();
  await ctx.reply(
    `Plan: ${u.tier}\nCurrent model: ${current}\nChoose:`,
    { reply_markup: { inline_keyboard: rows } }
  );
});

bot.callbackQuery(/^(set_model|setmodel):(.+)$/i, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;

  const model = ctx.match[2];
  const u = ensureUser(ctx.from.id, ctx.from);
  const allowed = allModelsForTier(u.tier);

  if (!allowed.includes(model)) {
    await ctx.answerCallbackQuery({ text: "Not allowed for your plan.", show_alert: true });
    return;
  }

  u.model = model;
  saveUsers();
  await ctx.answerCallbackQuery({ text: `Switched to ${model}` });
  
  // Optional: refresh message
  try {
    await ctx.editMessageText(`Plan: ${u.tier}\nCurrent model: ${model}\nChoose:`, {
      reply_markup: {
        inline_keyboard: allowed.map((m) => [
          { text: `${m === model ? "✅ " : ""}${m}`, callback_data: `setmodel:${m}` },
        ]),
      },
    });
  } catch {
    // Message unchanged or too old
  }
});

// =====================
// DM + GROUP TEXT
// =====================
bot.on("message:text", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;

  const text = ctx.message.text?.trim() || "";
  const chat = ctx.chat;
  const u = ctx.from;

  const isGroup = chat.type === "group" || chat.type === "supergroup";
  const mentioned = text.includes(`@${ctx.me.username}`);
  const isReplyToBot = ctx.message.reply_to_message?.from?.id === ctx.me.id;

  if (isGroup && !(mentioned || isReplyToBot)) return;

  if (!u?.id) return;

  // auto-register (public-friendly)
  if (!getUserRecord(u.id)) registerUser(u);

  const cleaned = text.replaceAll(`@${ctx.me.username}`, "").trim() || "Hey!";
  const model = ensureChosenModelValid(u.id);

  const systemPrompt =
    "You are StarzTechBot. Be helpful, practical, and concise. If the user asks for code, provide runnable code. If unclear, ask one short question.";

  try {
    await ctx.replyWithChatAction("typing");
    const out = await llmChatReply({
      chatId: chat.id,
      userText: cleaned,
      systemPrompt,
      model,
    });
    await ctx.reply(out.slice(0, 3800));
  } catch (e) {
    console.error("Chat error:", e.message);
    const errMsg = e.message?.includes("timed out")
      ? `Model ${model} is slow right now. Try /model to switch, or try again.`
      : "Error talking to the model. Try again in a moment.";
    await ctx.reply(errMsg);
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

  try {
    await ctx.replyWithChatAction("typing");

    const caption = (ctx.message.caption || "").trim();
    const photos = ctx.message.photo;
    const best = photos[photos.length - 1];
    const file = await ctx.api.getFile(best.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;
    const b64 = await telegramFileToBase64(fileUrl);

    const model = MODEL_VISION || ensureChosenModelValid(u.id);

    const out = await llmVisionReply({
      chatId: chat.id,
      userText: caption || "What’s in this image? Answer clearly.",
      imageBase64: b64,
      mime: "image/jpeg",
      model,
    });

    await ctx.reply(out.slice(0, 3800));
  } catch (e) {
    console.error(e);
    await ctx.reply("I couldn’t process that image. If this keeps happening, set MODEL_VISION.");
  }
});

// =====================
// INLINE MODE (AI + BUTTONS)
// =====================
bot.on("inline_query", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;

  const q = (ctx.inlineQuery.query || "").trim();
  const userId = ctx.from?.id;

  if (!q) {
    return ctx.answerInlineQuery(
      [
        {
          type: "article",
          id: "help_inline",
          title: "Ask StarzTechBot (AI)",
          input_message_content: {
            message_text: "Type: @starztechbot <question> to get an AI reply here.",
          },
          description: "Example: @starztechbot yap write a 2-day gym plan",
        },
      ],
      { cache_time: 1, is_personal: true }
    );
  }

  if (!userId) return;

  // auto-register
  if (!getUserRecord(userId)) registerUser(ctx.from);

  const model = ensureChosenModelValid(userId);

  try {
    // Inline must be fast: compact answer
    const out = await llmText({
      model,
      messages: [
        { role: "system", content: "Answer compactly and clearly. Prefer <= 900 characters." },
        { role: "user", content: q },
      ],
      temperature: 0.7,
      max_tokens: 240,
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
        title: "AI answer",
        description: answer.slice(0, 90),
        input_message_content: { message_text: answer },
        reply_markup: inlineAnswerKeyboard(key),
      },
    ];

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
// INLINE BUTTON ACTIONS
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
  });