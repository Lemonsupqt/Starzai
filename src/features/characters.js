/**
 * features/characters.js
 * Auto-extracted from index.js
 */

// =====================
// CHARACTER MODE MANAGEMENT
// Lines 2094-2238 from original index.js
// =====================


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

