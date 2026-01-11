/**
 * middleware/rate-limit.js
 * Auto-extracted from index.js
 */

// =====================
// RATE LIMIT
// Lines 1160-1281 from original index.js
// =====================

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


