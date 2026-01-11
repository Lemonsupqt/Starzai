/**
 * llm/client.js
 * Auto-extracted from index.js
 */

// =====================
// HISTORY
// Lines 2287-2299 from original index.js
// =====================

  
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

// =====================
// LLM HELPERS + VIDEO PROCESSING
// Lines 2300-2767 from original index.js
// =====================

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

async function llmText({ model, messages, temperature = 0.7, max_tokens = 350, retries = 2, timeout: customTimeout = null, useProviderSystem = true }) {
  // NEW: Use multi-provider system with automatic fallback
  if (useProviderSystem) {
    try {
      const result = await llmWithProviders({
        model,
        messages,
        temperature,
        max_tokens,
        retries,
        timeout: customTimeout || 15000
      });
      return result.content;
    } catch (err) {
      console.error('[LLM] All providers failed:', err.message);
      throw err;
    }
  }
  
  // FALLBACK: Original single-provider logic (for backward compatibility)
  const defaultTimeouts = [15000, 20000, 30000];
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
      
      if (attempt === retries) {
        throw err;
      }
      
      if (!err.message?.includes("timed out")) {
        throw err;
      }
      
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

// Detect if a model is a "thinking" model that needs more tokens
// Note: GPT-5-nano/mini are NOT thinking models - they're fast models
// Only include models that actually do chain-of-thought reasoning
function isThinkingModel(model) {
  if (!model) return false;
  const m = model.toLowerCase();
  
  // Explicitly exclude fast/nano/mini models even if they have "gpt-5" in name
  if (m.includes('nano') || m.includes('mini')) return false;
  
  return m.includes('gemini-2.5-pro') ||   // Gemini Pro does thinking, Flash doesn't
         m.includes('deepseek-r1') || 
         m.includes('thinking') || 
         m.includes('reasoning') ||
         m.includes('kimi-k2-thinking') ||
         m.includes('o1-') ||           // OpenAI o1 models
         m.includes('o3-') ||           // OpenAI o3 models
         m.includes('grok-4.1-fast-reasoning') ||  // Grok reasoning
         m.includes('claude-opus-4-1'); // Claude Opus 4.1
}

// Get appropriate max_tokens based on model type
function getMaxTokensForModel(model, baseTokens = 400) {
  // Thinking models need 3-4x more tokens to output reasoning + response
  if (isThinkingModel(model)) {
    return Math.max(baseTokens * 4, 1600); // At least 1600 for thinking models
  }
  return baseTokens;
}

// Smart detection: Does this response appear incomplete and need continuation?
// Returns true if the response seems cut off or incomplete
function responseNeedsContinuation(text, maxTokensUsed = 400) {
  if (!text || typeof text !== 'string') return false;
  
  const trimmed = text.trim();
  const len = trimmed.length;
  
  // Very short responses (under 300 chars) are almost always complete
  // e.g., "I'm doing great, thanks for asking! How can I help you?"
  // Increased from 200 to 300 to catch more casual responses
  if (len < 300) return false;
  
  // Medium responses (300-600 chars) need clear incompleteness signals
  // Don't show Continue just because it's medium length
  if (len < 600) {
    // Only show Continue if there's a clear incomplete signal
    const clearIncomplete = /[,:]\.\.\.?\s*$|\band\s*$|\bor\s*$|\bthe\s*$|```[a-z]*\s*$/i.test(trimmed);
    if (!clearIncomplete) return false;
  }
  
  // Check for explicit completion signals (model said it's done)
  const completionSignals = [
    /\?\s*$/,                           // Ends with a question (asking user)
    /!\s*$/,                            // Ends with exclamation (complete thought)
    /\.\s*$/,                           // Ends with period (complete sentence)
    /let me know[.!]?\s*$/i,            // "Let me know" = waiting for user
    /help you[.!?]?\s*$/i,              // "How can I help you?" = complete
    /any questions[.!?]?\s*$/i,         // Offering to answer more = complete
    /feel free to ask[.!]?\s*$/i,       // Inviting questions = complete
    /hope (this|that) helps[.!]?\s*$/i, // Conclusion phrase
    /good luck[.!]?\s*$/i,              // Sign-off phrase
    /:\)\s*$/,                          // Ends with smiley = casual complete
    /\u{1F44D}|\u{1F44B}|\u{1F60A}/u,   // Ends with emoji (thumbs up, wave, smile)
  ];
  
  for (const signal of completionSignals) {
    if (signal.test(trimmed)) {
      // Short-to-medium responses with completion signals are complete
      if (len < 800) return false;
    }
  }
  
  // Check for incompleteness signals
  const incompleteSignals = [
    /[,:]\s*$/,                         // Ends with comma or colon (mid-list/mid-thought)
    /\.\.\.\.?\s*$/,                    // Ends with ellipsis (trailing off)
    /\band\s*$/i,                       // Ends with "and" (mid-sentence)
    /\bor\s*$/i,                        // Ends with "or" (mid-sentence)
    /\bthe\s*$/i,                       // Ends with "the" (mid-sentence)
    /\bto\s*$/i,                        // Ends with "to" (mid-sentence)
    /\bfor\s*$/i,                       // Ends with "for" (mid-sentence)
    /\bwith\s*$/i,                      // Ends with "with" (mid-sentence)
    /\bin\s*$/i,                        // Ends with "in" (mid-sentence)
    /\bis\s*$/i,                        // Ends with "is" (mid-sentence)
    /\bare\s*$/i,                       // Ends with "are" (mid-sentence)
    /\bthat\s*$/i,                      // Ends with "that" (mid-sentence)
    /\bwhich\s*$/i,                     // Ends with "which" (mid-sentence)
    /\d+\.\s*$/,                        // Ends with numbered list item start (e.g., "3. ")
    /^\s*[-*•]\s*$/m,                   // Has empty bullet point
    /```[a-z]*\s*$/i,                   // Ends with unclosed code block
  ];
  
  for (const signal of incompleteSignals) {
    if (signal.test(trimmed)) {
      return true; // Definitely incomplete
    }
  }
  
  // Check for numbered/bulleted lists that might be cut off
  // If we see "1." and "2." but the response is long, it might have more items
  const hasNumberedList = /\n\s*\d+\.\s+/g.test(trimmed);
  const hasBulletList = /\n\s*[-*•]\s+/g.test(trimmed);
  
  if ((hasNumberedList || hasBulletList) && len > 1200) {
    // Long list-based response - might have more items
    // But only if it doesn't end with a conclusion
    const lastLine = trimmed.split('\n').pop()?.trim() || '';
    if (!/^(In summary|Overall|In conclusion|To summarize|That's|These are)/i.test(lastLine)) {
      return true;
    }
  }
  
  // If response is very long (approaching token limit) and doesn't have clear ending
  // Rough estimate: 1 token ≈ 4 chars, so 400 tokens ≈ 1600 chars
  const estimatedTokens = len / 4;
  const tokenLimitRatio = estimatedTokens / maxTokensUsed;
  
  if (tokenLimitRatio > 0.85) {
    // Response used 85%+ of token budget - likely hit the limit
    // Check if it ends mid-sentence
    const lastChar = trimmed.slice(-1);
    if (!/[.!?)"]/.test(lastChar)) {
      return true; // Doesn't end with sentence-ending punctuation
    }
  }
  
  // Default: assume complete if none of the above triggered
  return false;
}

async function llmChatReply({ chatId, userText, systemPrompt, model }) {
  const history = getHistory(chatId);
  const messages = [
    { role: "system", content: systemPrompt },
    ...history,
    { role: "user", content: userText },
  ];

  // Use higher max_tokens for thinking models
  const maxTokens = getMaxTokensForModel(model, 400);
  
  const out = await llmText({ model, messages, temperature: 0.7, max_tokens: maxTokens });
  pushHistory(chatId, "user", userText);
  pushHistory(chatId, "assistant", out);
  return out || "(no output)";
}

// Inline chat LLM - uses inline session history
async function llmInlineChatReply({ userId, userText, model }) {
  const session = getInlineSession(userId);
  const systemPrompt =
    "You are StarzTechBot, a friendly AI assistant. " +
    "Give concise, direct answers (under 800 characters). " +
    "Don't advertise features or suggest commands.";

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

