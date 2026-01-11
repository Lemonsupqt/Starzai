/**
 * llm/client.js
 * Auto-extracted from index.js
 */

// =====================
// HISTORY
// Lines 2287-2299 from original index.js
// =====================

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
// LLM HELPERS + VIDEO PROCESSING
// Lines 2300-2767 from original index.js
// =====================

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

async function telegramFileToBase64(fileUrl) {
  const resp = await fetch(fileUrl);
  const buf = await resp.arrayBuffer();
  return Buffer.from(buf).toString("base64");
}

// =====================
// VIDEO PROCESSING UTILITIES
// =====================

// Download video from Telegram and save to temp file
async function downloadTelegramVideo(fileUrl) {
  const tempDir = `/tmp/starzai_video_${Date.now()}`;
  await execAsync(`mkdir -p ${tempDir}`);
  const videoPath = `${tempDir}/video.mp4`;
  
  const resp = await fetch(fileUrl);
  const buf = await resp.arrayBuffer();
  fs.writeFileSync(videoPath, Buffer.from(buf));
  
  return { tempDir, videoPath };
}

// Extract key frames from video (5 frames evenly distributed)
async function extractVideoFrames(videoPath, tempDir, numFrames = 5) {
  try {
    // Check if ffprobe exists
    try {
      await execAsync('which ffprobe');
    } catch {
      console.error("ffprobe not found - ffmpeg not installed");
      return { frames: [], duration: 0, error: "ffmpeg not installed" };
    }
    
    // Get video duration
    console.log(`[VIDEO] Getting duration for: ${videoPath}`);
    const { stdout: durationOut, stderr: durationErr } = await execAsync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}" 2>&1`
    );
    console.log(`[VIDEO] Duration output: ${durationOut}, stderr: ${durationErr}`);
    const duration = parseFloat(durationOut.trim()) || 10;
    
    // Extract frames at intervals
    const frames = [];
    const interval = duration / (numFrames + 1);
    
    for (let i = 1; i <= numFrames; i++) {
      const timestamp = interval * i;
      const framePath = `${tempDir}/frame_${i}.jpg`;
      
      console.log(`[VIDEO] Extracting frame ${i} at ${timestamp}s`);
      try {
        await execAsync(
          `ffmpeg -ss ${timestamp} -i "${videoPath}" -vframes 1 -q:v 2 "${framePath}" -y 2>&1`,
          { timeout: 30000 }
        );
      } catch (frameErr) {
        console.error(`[VIDEO] Frame ${i} extraction failed:`, frameErr.message);
        continue;
      }
      
      // Read frame as base64
      if (fs.existsSync(framePath)) {
        const frameData = fs.readFileSync(framePath);
        frames.push({
          timestamp: timestamp.toFixed(1),
          base64: frameData.toString("base64")
        });
        console.log(`[VIDEO] Frame ${i} extracted successfully`);
      }
    }
    
    console.log(`[VIDEO] Total frames extracted: ${frames.length}`);
    return { frames, duration };
  } catch (e) {
    console.error("Frame extraction error:", e.message, e.stack);
    return { frames: [], duration: 0, error: e.message };
  }
}

// Extract and transcribe audio from video
async function extractAndTranscribeAudio(videoPath, tempDir) {
  try {
    const audioPath = `${tempDir}/audio.mp3`;
    
    // Extract audio
    await execAsync(
      `ffmpeg -i "${videoPath}" -vn -acodec libmp3lame -q:a 4 "${audioPath}" -y 2>/dev/null`
    );
    
    if (!fs.existsSync(audioPath)) {
      return { transcript: null, hasAudio: false };
    }
    
    // Check if audio file has content (not silent)
    const stats = fs.statSync(audioPath);
    if (stats.size < 1000) {
      return { transcript: null, hasAudio: false };
    }
    
    // Use manus-speech-to-text for transcription
    try {
      const { stdout } = await execAsync(`manus-speech-to-text "${audioPath}"`, { timeout: 60000 });
      const transcript = stdout.trim();
      return { transcript: transcript || null, hasAudio: true };
    } catch (e) {
      console.error("Transcription error:", e.message);
      return { transcript: null, hasAudio: true };
    }
  } catch (e) {
    console.error("Audio extraction error:", e.message);
    return { transcript: null, hasAudio: false };
  }
}

// Clean up temp directory
async function cleanupTempDir(tempDir) {
  try {
    await execAsync(`rm -rf "${tempDir}"`);
  } catch (e) {
    console.error("Cleanup error:", e.message);
  }
}


