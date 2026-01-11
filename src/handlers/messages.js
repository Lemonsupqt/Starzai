/**
 * Message Handlers
 * Handles regular text messages and AI responses
 */

import { ensureUser, trackUsage, getUserTier } from "../features/users.js";
import { llmWithProviders } from "../llm/client.js";
import { 
  getPartner, 
  isPartnerActive, 
  buildPartnerSystemPrompt, 
  getPartnerChatHistory,
  addPartnerMessage 
} from "../features/partners.js";
import { 
  hasActiveCharacter, 
  getActiveCharacter, 
  buildCharacterSystemPrompt,
  getCharacterChatHistory,
  addCharacterMessage
} from "../features/characters.js";
import { convertToTelegramHTML, isGroupChat, getUserId, getChatId } from "../utils/telegram.js";
import { isGroupActive, activateGroup } from "../middleware/rate-limit.js";
import { DEFAULT_FREE_MODEL } from "../config/index.js";
import { saveUsers } from "../database/manager.js";

// =====================
// Chat History (In-Memory)
// =====================

const chatHistory = new Map(); // `${userId}_${chatId}` -> [{role, content}...]

function getChatHistory(userId, chatId) {
  const key = `${userId}_${chatId}`;
  return chatHistory.get(key) || [];
}

function addToChatHistory(userId, chatId, role, content) {
  const key = `${userId}_${chatId}`;
  let history = getChatHistory(userId, chatId);
  
  history.push({ role, content });
  
  // Keep last 20 messages
  if (history.length > 20) {
    history = history.slice(-20);
  }
  
  chatHistory.set(key, history);
  return history;
}

function clearChatHistory(userId, chatId) {
  const key = `${userId}_${chatId}`;
  chatHistory.delete(key);
}

// Export for /reset command
export { clearChatHistory };

// =====================
// Message Processing
// =====================

async function processMessage(ctx, messageText) {
  const userId = getUserId(ctx);
  const chatId = getChatId(ctx);
  const user = ensureUser(userId, ctx.from);
  
  trackUsage(userId, "message");
  
  // Determine mode: Partner, Character, or Default
  let systemPrompt = "You are a helpful AI assistant. Provide clear, accurate, and helpful responses. Use markdown formatting when appropriate.";
  let history = [];
  let mode = "default";
  
  // Check for active partner
  if (isPartnerActive(userId)) {
    const partner = getPartner(userId);
    if (partner) {
      systemPrompt = buildPartnerSystemPrompt(partner);
      history = getPartnerChatHistory(userId);
      mode = "partner";
    }
  }
  
  // Check for active character (overrides partner in specific chat)
  if (hasActiveCharacter(userId, chatId)) {
    const character = getActiveCharacter(userId, chatId);
    if (character) {
      systemPrompt = buildCharacterSystemPrompt(character.name);
      history = getCharacterChatHistory(userId, chatId);
      mode = "character";
    }
  }
  
  // Default mode - use regular chat history
  if (mode === "default") {
    history = getChatHistory(userId, chatId);
  }
  
  // Build messages array
  const messages = [
    { role: "system", content: systemPrompt },
    ...history.slice(-10), // Last 10 messages for context
    { role: "user", content: messageText }
  ];
  
  // Get user's model
  const model = user.model || DEFAULT_FREE_MODEL;
  
  // Send typing indicator
  await ctx.replyWithChatAction("typing");
  
  try {
    // Call LLM
    const response = await llmWithProviders({
      model,
      messages,
      max_tokens: 500,
      timeout: 20000
    });
    
    if (!response) {
      throw new Error("Empty response from AI");
    }
    
    // Store in appropriate history
    if (mode === "partner") {
      addPartnerMessage(userId, "user", messageText);
      addPartnerMessage(userId, "assistant", response);
    } else if (mode === "character") {
      addCharacterMessage(userId, chatId, "user", messageText);
      addCharacterMessage(userId, chatId, "assistant", response);
    } else {
      addToChatHistory(userId, chatId, "user", messageText);
      addToChatHistory(userId, chatId, "assistant", response);
    }
    
    // Update user stats
    user.stats.lastModel = model;
    user.stats.lastActive = new Date().toISOString();
    saveUsers('low');
    
    // Convert to Telegram HTML and send
    const htmlResponse = convertToTelegramHTML(response);
    
    await ctx.reply(htmlResponse, {
      parse_mode: "HTML",
      reply_to_message_id: ctx.message?.message_id
    });
    
  } catch (error) {
    console.error("Message processing error:", error.message);
    
    await ctx.reply(`❌ Error: ${error.message || "Failed to get AI response"}`, {
      reply_to_message_id: ctx.message?.message_id
    });
  }
}

// =====================
// Message Handler Registration
// =====================

export function registerMessageHandler(bot) {
  // Handle text messages
  bot.on("message:text", async (ctx) => {
    const text = ctx.message?.text || "";
    
    // Skip commands
    if (text.startsWith("/")) return;
    
    // Group chat handling
    if (isGroupChat(ctx)) {
      const chatId = getChatId(ctx);
      const botUsername = ctx.me?.username;
      
      // Check if bot is mentioned or replied to
      const isMentioned = text.includes(`@${botUsername}`);
      const isReplyToBot = ctx.message?.reply_to_message?.from?.id === ctx.me?.id;
      
      // If group is not active, only respond to mentions/replies
      if (!isGroupActive(chatId)) {
        if (!isMentioned && !isReplyToBot) {
          return; // Ignore message
        }
        // Activate group on mention/reply
        activateGroup(chatId);
      }
      
      // Remove bot mention from text
      const cleanText = text.replace(new RegExp(`@${botUsername}`, 'gi'), '').trim();
      
      if (cleanText) {
        await processMessage(ctx, cleanText);
      }
      return;
    }
    
    // Private chat - process directly
    await processMessage(ctx, text);
  });
  
  // Handle photo messages with caption
  bot.on("message:photo", async (ctx) => {
    const caption = ctx.message?.caption;
    
    if (caption && !caption.startsWith("/")) {
      // For now, just process the caption as text
      // Vision support can be added later
      await processMessage(ctx, caption);
    }
  });
}
