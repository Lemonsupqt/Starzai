/**
 * AI Partner Management Module
 * Handles personalized AI companions with persistent chat history
 */

import { partnersDb, savePartners } from "../database/manager.js";

// In-memory partner chat history
const partnerChatHistory = new Map(); // userId -> [{role, content}...]

// =====================
// Partner CRUD Operations
// =====================

/**
 * Get a partner record
 */
export function getPartner(userId) {
  const id = String(userId);
  return partnersDb.partners[id] || null;
}

/**
 * Set/update partner data
 */
export function setPartner(userId, partnerData) {
  const id = String(userId);
  if (!partnersDb.partners[id]) {
    partnersDb.partners[id] = {
      name: null,
      personality: null,
      background: null,
      style: null,
      createdAt: Date.now(),
      chatHistory: [],
      active: false,
    };
  }
  Object.assign(partnersDb.partners[id], partnerData, { updatedAt: Date.now() });
  savePartners();
  return partnersDb.partners[id];
}

/**
 * Clear/delete a partner
 */
export function clearPartner(userId) {
  const id = String(userId);
  delete partnersDb.partners[id];
  partnerChatHistory.delete(id);
  savePartners();
}

/**
 * Check if user has a partner
 */
export function hasPartner(userId) {
  return !!getPartner(userId);
}

/**
 * Check if partner is active
 */
export function isPartnerActive(userId) {
  const partner = getPartner(userId);
  return partner?.active || false;
}

/**
 * Activate partner
 */
export function activatePartner(userId) {
  const partner = getPartner(userId);
  if (partner) {
    partner.active = true;
    savePartners();
  }
  return partner;
}

/**
 * Deactivate partner
 */
export function deactivatePartner(userId) {
  const partner = getPartner(userId);
  if (partner) {
    partner.active = false;
    savePartners();
  }
  return partner;
}

// =====================
// Partner Chat History
// =====================

/**
 * Get partner chat history
 */
export function getPartnerChatHistory(userId) {
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

/**
 * Add a message to partner chat history
 */
export function addPartnerMessage(userId, role, content) {
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

/**
 * Clear partner chat history
 */
export function clearPartnerChat(userId) {
  const id = String(userId);
  partnerChatHistory.delete(id);
  const partner = getPartner(userId);
  if (partner) {
    partner.chatHistory = [];
    savePartners();
  }
}

// =====================
// Partner System Prompt
// =====================

/**
 * Build system prompt for partner mode
 */
export function buildPartnerSystemPrompt(partner) {
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

// =====================
// Partner Validation
// =====================

/**
 * Check if partner is fully configured
 */
export function isPartnerConfigured(userId) {
  const partner = getPartner(userId);
  return partner && partner.name;
}

/**
 * Get partner configuration status
 */
export function getPartnerStatus(userId) {
  const partner = getPartner(userId);
  if (!partner) {
    return { configured: false, active: false, name: null };
  }
  
  return {
    configured: !!partner.name,
    active: partner.active || false,
    name: partner.name,
    personality: partner.personality,
    background: partner.background,
    style: partner.style,
    messageCount: partner.chatHistory?.length || 0
  };
}
