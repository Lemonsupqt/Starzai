/**
 * Inline Mode Handlers
 * Handles inline queries and inline results
 */

import { InlineKeyboard } from "grammy";
import { ensureUser, trackUsage, getUserTier } from "../features/users.js";
import { llmWithProviders } from "../llm/client.js";
import { getPartner, isPartnerActive, buildPartnerSystemPrompt, getPartnerChatHistory } from "../features/partners.js";
import { inlineSessionsDb, saveInlineSessions } from "../database/manager.js";
import { safeAnswerInline } from "../utils/telegram.js";
import { makeId, truncate } from "../utils/helpers.js";
import { DEFAULT_FREE_MODEL } from "../config/index.js";

// =====================
// Inline Mode Prefixes
// =====================

const INLINE_MODES = {
  "q:": { name: "Quark", emoji: "⭐", description: "Quick, concise answer", maxTokens: 150 },
  "b:": { name: "Blackhole", emoji: "🗿🔬", description: "Deep research", maxTokens: 500 },
  "code:": { name: "Code", emoji: "💻", description: "Programming help", maxTokens: 400 },
  "e:": { name: "Explain", emoji: "🧠", description: "Simple explanation", maxTokens: 300 },
  "sum:": { name: "Summarize", emoji: "📝", description: "Summarize text", maxTokens: 300 },
  "p:": { name: "Partner", emoji: "🤝", description: "AI Partner chat", maxTokens: 350 },
  "as ": { name: "Character", emoji: "🎭", description: "Roleplay as character", maxTokens: 350 },
};

// =====================
// Inline Query Parsing
// =====================

function parseInlineQuery(query) {
  const trimmed = query.trim();
  
  // Check for prefixes
  for (const [prefix, mode] of Object.entries(INLINE_MODES)) {
    if (trimmed.toLowerCase().startsWith(prefix)) {
      let prompt = trimmed.slice(prefix.length).trim();
      let character = null;
      
      // Special handling for "as [char]:" prefix
      if (prefix === "as ") {
        const colonIndex = prompt.indexOf(":");
        if (colonIndex > 0) {
          character = prompt.slice(0, colonIndex).trim();
          prompt = prompt.slice(colonIndex + 1).trim();
        }
      }
      
      return { mode: prefix, prompt, character, ...mode };
    }
  }
  
  // Default mode
  return { 
    mode: "default", 
    prompt: trimmed, 
    character: null,
    name: "Ask AI",
    emoji: "💬",
    description: "General AI response",
    maxTokens: 350
  };
}

// =====================
// System Prompts
// =====================

function getSystemPromptForMode(mode, character = null) {
  switch (mode) {
    case "q:":
      return "You are a quick-answer assistant. Provide brief, direct answers in 1-3 sentences. Be concise and helpful.";
    case "b:":
      return "You are a deep research assistant. Provide comprehensive, well-structured answers with details and context. Use markdown formatting.";
    case "code:":
      return "You are a programming assistant. Provide clean, working code with brief explanations. Use proper code blocks with language tags.";
    case "e:":
      return "You are an explanation assistant. Explain concepts simply as if to a beginner. Use analogies and examples.";
    case "sum:":
      return "You are a summarization assistant. Provide clear, concise summaries that capture the key points.";
    case "as ":
      return `You are roleplaying as ${character}. Stay completely in character throughout. Respond as ${character} would.`;
    default:
      return "You are a helpful AI assistant. Provide clear, accurate, and helpful responses.";
  }
}

// =====================
// Inline Session Storage
// =====================

function storeInlineSession(sessionId, data) {
  if (!inlineSessionsDb.sessions) inlineSessionsDb.sessions = {};
  inlineSessionsDb.sessions[sessionId] = {
    ...data,
    createdAt: Date.now()
  };
  
  // Cleanup old sessions (keep last 1000)
  const sessions = Object.entries(inlineSessionsDb.sessions);
  if (sessions.length > 1000) {
    const sorted = sessions.sort((a, b) => b[1].createdAt - a[1].createdAt);
    inlineSessionsDb.sessions = Object.fromEntries(sorted.slice(0, 1000));
  }
  
  saveInlineSessions();
}

function getInlineSession(sessionId) {
  return inlineSessionsDb.sessions?.[sessionId] || null;
}

// =====================
// Inline Query Handler
// =====================

export function registerInlineHandler(bot) {
  bot.on("inline_query", async (ctx) => {
    const userId = String(ctx.from?.id);
    const query = ctx.inlineQuery?.query || "";
    
    ensureUser(userId, ctx.from);
    trackUsage(userId, "inline");
    
    // Empty query - show mode options
    if (!query.trim()) {
      const results = Object.entries(INLINE_MODES).map(([prefix, mode], index) => ({
        type: "article",
        id: `mode_${index}`,
        title: `${mode.emoji} ${mode.name}`,
        description: `Type: ${prefix}your question`,
        input_message_content: {
          message_text: `💡 Use: @starztechbot ${prefix}your question`,
          parse_mode: "HTML"
        }
      }));
      
      await safeAnswerInline(ctx, results, {
        button: {
          text: "📖 How to use inline mode",
          start_parameter: "inline_help"
        }
      });
      return;
    }
    
    // Parse the query
    const parsed = parseInlineQuery(query);
    
    // Need at least some prompt
    if (!parsed.prompt || parsed.prompt.length < 2) {
      await safeAnswerInline(ctx, [{
        type: "article",
        id: "typing",
        title: `${parsed.emoji} ${parsed.name}`,
        description: "Keep typing your question...",
        input_message_content: {
          message_text: "Please type your question after the prefix.",
          parse_mode: "HTML"
        }
      }]);
      return;
    }
    
    try {
      // Build messages
      const messages = [];
      let systemPrompt = getSystemPromptForMode(parsed.mode, parsed.character);
      
      // Partner mode - use partner context
      if (parsed.mode === "p:") {
        const partner = getPartner(userId);
        if (partner && isPartnerActive(userId)) {
          systemPrompt = buildPartnerSystemPrompt(partner);
          const history = getPartnerChatHistory(userId);
          messages.push(...history.slice(-6)); // Last 6 messages for context
        }
      }
      
      messages.unshift({ role: "system", content: systemPrompt });
      messages.push({ role: "user", content: parsed.prompt });
      
      // Get user's model
      const user = ensureUser(userId);
      const model = user.model || DEFAULT_FREE_MODEL;
      
      // Call LLM
      const response = await llmWithProviders({
        model,
        messages,
        max_tokens: parsed.maxTokens,
        timeout: 12000
      });
      
      if (!response) {
        throw new Error("Empty response from AI");
      }
      
      // Store session for context retrieval
      const sessionId = makeId(8);
      storeInlineSession(sessionId, {
        userId,
        prompt: parsed.prompt,
        response,
        mode: parsed.mode,
        character: parsed.character
      });
      
      // Build result
      const title = truncate(parsed.prompt, 50);
      const description = truncate(response, 100);
      
      const resultText = `<b>${parsed.emoji} ${parsed.name}</b>\n\n<b>Q:</b> ${parsed.prompt}\n\n<b>A:</b> ${response}\n\n<i>via @starztechbot</i>`;
      
      const keyboard = new InlineKeyboard()
        .text("🔄 Regenerate", `inline_regen_${sessionId}`)
        .text("💬 Continue", `inline_continue_${sessionId}`);
      
      await safeAnswerInline(ctx, [{
        type: "article",
        id: sessionId,
        title: `${parsed.emoji} ${title}`,
        description: description,
        input_message_content: {
          message_text: resultText,
          parse_mode: "HTML"
        },
        reply_markup: keyboard
      }]);
      
    } catch (error) {
      console.error("Inline query error:", error.message);
      
      await safeAnswerInline(ctx, [{
        type: "article",
        id: "error",
        title: "❌ Error",
        description: error.message || "Failed to get response",
        input_message_content: {
          message_text: `❌ Error: ${error.message || "Failed to get AI response"}`,
          parse_mode: "HTML"
        }
      }]);
    }
  });
}

// =====================
// Inline Callback Handlers
// =====================

export function registerInlineCallbacks(bot) {
  // Regenerate inline response
  bot.callbackQuery(/^inline_regen_(.+)$/, async (ctx) => {
    const sessionId = ctx.match[1];
    const session = getInlineSession(sessionId);
    
    if (!session) {
      await ctx.answerCallbackQuery({ text: "Session expired", show_alert: true });
      return;
    }
    
    await ctx.answerCallbackQuery({ text: "Regenerating..." });
    
    try {
      const parsed = parseInlineQuery(session.mode + session.prompt);
      const systemPrompt = getSystemPromptForMode(session.mode, session.character);
      
      const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: session.prompt }
      ];
      
      const user = ensureUser(session.userId);
      const model = user.model || DEFAULT_FREE_MODEL;
      
      const response = await llmWithProviders({
        model,
        messages,
        max_tokens: parsed.maxTokens,
        timeout: 12000
      });
      
      // Update session
      session.response = response;
      storeInlineSession(sessionId, session);
      
      const resultText = `<b>${parsed.emoji} ${parsed.name}</b>\n\n<b>Q:</b> ${session.prompt}\n\n<b>A:</b> ${response}\n\n<i>via @starztechbot (regenerated)</i>`;
      
      await ctx.editMessageText(resultText, { parse_mode: "HTML" });
      
    } catch (error) {
      await ctx.answerCallbackQuery({ text: `Error: ${error.message}`, show_alert: true });
    }
  });
  
  // Continue conversation
  bot.callbackQuery(/^inline_continue_(.+)$/, async (ctx) => {
    const sessionId = ctx.match[1];
    const session = getInlineSession(sessionId);
    
    if (!session) {
      await ctx.answerCallbackQuery({ text: "Session expired. Start a new query.", show_alert: true });
      return;
    }
    
    await ctx.answerCallbackQuery({ text: "Reply to this message to continue the conversation!" });
  });
}
