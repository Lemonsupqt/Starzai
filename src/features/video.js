/**
 * features/video.js
 * Auto-extracted from index.js
 */

// =====================
// VIDEO SUMMARIZATION
// Lines 14889-15309 from original index.js
// =====================

// =====================
// VIDEO SUMMARIZATION
// =====================
bot.on("message:video", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const chat = ctx.chat;
  const u = ctx.from;
  if (!u?.id) return;
  
  // Anti-spam check
  const caption = ctx.message?.caption || "";
  if (!(await checkAntiSpam(ctx, caption))) return;
  
  // Feedback handling for video + caption (DM only)
  const feedbackHandled = await handleFeedbackIfActive(ctx, { caption });
  if (feedbackHandled) return;

  // In groups: only process if replying to bot or group is active
  if (chat.type !== "private") {
    const isReplyToBot = BOT_ID && ctx.message?.reply_to_message?.from?.id === BOT_ID;
    const groupActive = isGroupActive(chat.id);
    
    if (!isReplyToBot && !groupActive) {
      return; // Ignore videos in groups unless replying to bot or group is active
    }
    
    // Activate group on interaction
    if (isReplyToBot) {
      activateGroup(chat.id);
    }
  }

  if (!getUserRecord(u.id)) registerUser(u);

  const model = ensureChosenModelValid(u.id);
  const startTime = Date.now();
  let statusMsg = null;
  let tempDir = null;

  try {
    // Check video size (limit to 20MB)
    const video = ctx.message.video;
    if (video.file_size > 20 * 1024 * 1024) {
      return ctx.reply("⚠️ Video too large! Please send videos under 20MB.");
    }

    statusMsg = await ctx.reply(`🎬 <b>Processing video...</b>\n\n⏳ Downloading...`, { parse_mode: "HTML" });

    // Keep typing indicator active
    const typingInterval = setInterval(() => {
      ctx.replyWithChatAction("typing").catch(() => {});
    }, 4000);
    await ctx.replyWithChatAction("typing");

    // Download video
    const file = await ctx.api.getFile(video.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;
    const { tempDir: td, videoPath } = await downloadTelegramVideo(fileUrl);
    tempDir = td;

    // Update status
    await ctx.api.editMessageText(chat.id, statusMsg.message_id, 
      `🎬 <b>Processing video...</b>\n\n✅ Downloaded\n⏳ Extracting frames...`, 
      { parse_mode: "HTML" }
    ).catch(() => {});

    // Extract frames - more frames for better context
    const videoDuration = video.duration || 10;
    const frameCount = Math.min(Math.max(Math.ceil(videoDuration / 2), 5), 15); // 1 frame per 2 seconds, min 5, max 15
    let { frames, duration, error: frameError } = await extractVideoFrames(videoPath, tempDir, frameCount);
    
    // Fallback: use Telegram's video thumbnail if ffmpeg failed
    if (frames.length === 0 && video.thumb) {
      console.log("[VIDEO] Using Telegram thumbnail as fallback");
      try {
        const thumbFile = await ctx.api.getFile(video.thumb.file_id);
        const thumbUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${thumbFile.file_path}`;
        const thumbB64 = await telegramFileToBase64(thumbUrl);
        frames = [{ timestamp: "0.0", base64: thumbB64 }];
        duration = video.duration || 0;
      } catch (thumbErr) {
        console.error("[VIDEO] Thumbnail fallback failed:", thumbErr.message);
      }
    }

    // Update status
    await ctx.api.editMessageText(chat.id, statusMsg.message_id, 
      `🎬 <b>Processing video...</b>\n\n✅ Downloaded\n✅ ${frames.length > 0 ? `Got ${frames.length} frame(s)` : "No frames (using thumbnail)"}\n⏳ Transcribing audio...`, 
      { parse_mode: "HTML" }
    ).catch(() => {});

    // Extract and transcribe audio (skip if ffmpeg not available)
    let transcript = null;
    let hasAudio = false;
    if (!frameError || !frameError.includes("ffmpeg not installed")) {
      const audioResult = await extractAndTranscribeAudio(videoPath, tempDir);
      transcript = audioResult.transcript;
      hasAudio = audioResult.hasAudio;
    }

    // Update status
    await ctx.api.editMessageText(chat.id, statusMsg.message_id, 
      `🎬 <b>Processing video...</b>\n\n✅ Downloaded\n✅ Extracted ${frames.length} frames\n✅ Audio ${hasAudio ? (transcript ? "transcribed" : "detected (no speech)") : "not found"}\n⏳ Analyzing with AI...`, 
      { parse_mode: "HTML" }
    ).catch(() => {});

    // Build prompt for AI
    const caption = (ctx.message.caption || "").trim();
    const hasQuestion = caption && (caption.includes("?") || /^(who|what|where|when|why|how|is|are|can|does|did|explain|tell|describe|identify)/i.test(caption));
    
    let userPrompt = caption || "What's happening in this video? Describe the content.";
    
    // Add transcript context if available
    if (transcript) {
      userPrompt += `\n\n[Audio transcript]: ${transcript.slice(0, 1500)}`;
    }

    // Build messages with multiple frames
    const imageContents = frames.map((f, i) => ({
      type: "image_url",
      image_url: { url: `data:image/jpeg;base64,${f.base64}` }
    }));

    // Context-aware system prompt - emphasize accuracy over speculation
    let systemPrompt = `You are analyzing a ${duration.toFixed(1)}s video through ${frames.length} sequential frame(s) taken at regular intervals. `;
    
    // Core instruction: be accurate, don't hallucinate
    systemPrompt += `\n\nIMPORTANT RULES:
- ONLY describe what you can actually SEE in the frames
- DO NOT make up or guess things that aren't visible
- If you're unsure about something, say "appears to be" or "possibly"
- If you can't identify something, say so honestly
- Focus on observable facts: people, objects, actions, text, setting\n\n`;
    
    if (transcript) {
      systemPrompt += "Audio transcript is provided - use it to understand context, identify speech, music, or sounds. ";
    }
    if (hasQuestion) {
      systemPrompt += "Answer the user's specific question based ONLY on what you can see/hear. If you can't answer from the video, say so.";
    } else if (caption) {
      systemPrompt += "Respond to the user's message based on what you observe in the video.";
    } else {
      systemPrompt += "Describe what's happening: the setting, people/characters, actions, any visible text, and notable details. Be specific and factual.";
    }

    const messages = [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          { type: "text", text: userPrompt },
          ...imageContents
        ]
      }
    ];

    const out = await llmText({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 800,
    });

    clearInterval(typingInterval);

    // Track usage
    trackUsage(u.id, "message");

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    // Build response - cleaner format
    let response = convertToTelegramHTML(out.slice(0, 3500));
    response += `\n\n<i>🎬 ${elapsed}s • ${escapeHTML(model)}</i>`;

    await ctx.api.editMessageText(chat.id, statusMsg.message_id, response, { parse_mode: "HTML" });

  } catch (e) {
    console.error("Video processing error:", e.message);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    
    const errMsg = `❌ Couldn't process video after ${elapsed}s.\n\nError: ${escapeHTML(e.message?.slice(0, 100) || "Unknown error")}`;
    if (statusMsg) {
      try {
        await ctx.api.editMessageText(chat.id, statusMsg.message_id, errMsg, { parse_mode: "HTML" });
      } catch {
        await ctx.reply(errMsg, { parse_mode: "HTML" });
      }
    } else {
      await ctx.reply(errMsg, { parse_mode: "HTML" });
    }
  } finally {
    // Clean up temp files
    if (tempDir) {
      cleanupTempDir(tempDir);
    }
  }
});

// Video notes (round videos) - treat as photos using thumbnail
bot.on("message:video_note", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const chat = ctx.chat;
  const u = ctx.from;
  if (!u?.id) return;
  
  // Anti-spam check
  if (!(await checkAntiSpam(ctx, "video_note"))) return;
  
  // In groups: only process if replying to bot or group is active
  if (chat.type !== "private") {
    const isReplyToBot = BOT_ID && ctx.message?.reply_to_message?.from?.id === BOT_ID;
    const groupActive = isGroupActive(chat.id);
    const hasActiveChar = !!getActiveCharacter(u.id, chat.id)?.name;
    
    if (!isReplyToBot && !groupActive && !hasActiveChar) {
      return;
    }
  }
  
  // Use the video note thumbnail as an image
  const videoNote = ctx.message.video_note;
  if (videoNote.thumb) {
    try {
      const thumbFile = await ctx.api.getFile(videoNote.thumb.file_id);
      const thumbUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${thumbFile.file_path}`;
      const b64 = await telegramFileToBase64(thumbUrl);
      
      const model = ensureChosenModelValid(u.id);
      const caption = "What's in this video note?";
      
      const statusMsg = await ctx.reply(`📹 Analyzing video note...`, { parse_mode: "HTML" });
      
      const out = await llmVision({
        chatId: chat.id,
        userText: caption,
        imageBase64: b64,
        mime: "image/jpeg",
        model,
      });
      
      const response = `📹 <b>Video Note</b>\n\n${convertToTelegramHTML(out.slice(0, 3500))}`;
      await ctx.api.editMessageText(chat.id, statusMsg.message_id, response, { parse_mode: "HTML" });
    } catch (e) {
      console.error("Video note error:", e.message);
      await ctx.reply("❌ Couldn't process video note.");
    }
  }
});

// Animations/GIFs
bot.on("message:animation", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const chat = ctx.chat;
  const u = ctx.from;
  if (!u?.id) return;
  
  // Anti-spam check
  const caption = ctx.message?.caption || "";
  if (!(await checkAntiSpam(ctx, caption))) return;
  
  // In groups: only process if replying to bot or group is active or has character
  if (chat.type !== "private") {
    const isReplyToBot = BOT_ID && ctx.message?.reply_to_message?.from?.id === BOT_ID;
    const groupActive = isGroupActive(chat.id);
    const hasActiveChar = !!getActiveCharacter(u.id, chat.id)?.name;
    
    if (!isReplyToBot && !groupActive && !hasActiveChar) {
      return;
    }
    
    if (isReplyToBot) {
      activateGroup(chat.id);
    }
  }
  
  if (!getUserRecord(u.id)) registerUser(u);
  
  const animation = ctx.message.animation;
  const model = ensureChosenModelValid(u.id);
  const startTime = Date.now();
  
  // Check for character mode
  const activeChar = getActiveCharacter(u.id, chat.id);
  const replyToMsg = ctx.message?.reply_to_message;
  let replyCharacter = null;
  
  if (replyToMsg?.text) {
    const charMatch = replyToMsg.text.match(/^🎭 \*?([^*\n]+)\*?\n/);
    if (charMatch && replyToMsg.from?.is_bot) {
      replyCharacter = charMatch[1].trim();
    }
  }
  
  const effectiveCharacter = replyCharacter || activeChar?.name;
  const isCharacterMode = !!effectiveCharacter;
  
  let statusMsg = null;
  let tempDir = null;
  
  try {
    let modeLabel = "";
    let statusText = `🎬 Analyzing GIF...`;
    
    if (isCharacterMode) {
      modeLabel = `🎭 <b>${escapeHTML(effectiveCharacter)}</b>\n\n`;
      statusText = `🎭 ${escapeHTML(effectiveCharacter)} is looking at the GIF...`;
    }
    
    statusMsg = await ctx.reply(statusText, { parse_mode: "HTML" });
    
    // Download the actual GIF file
    const file = await ctx.api.getFile(animation.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;
    
    // Try to extract frames using ffmpeg
    let frames = [];
    let duration = animation.duration || 3;
    
    try {
      const { tempDir: td, videoPath } = await downloadTelegramVideo(fileUrl);
      tempDir = td;
      const result = await extractVideoFrames(videoPath, tempDir, 4);
      frames = result.frames;
      if (result.duration > 0) duration = result.duration;
    } catch (dlErr) {
      console.log("[GIF] Frame extraction failed, trying thumbnail:", dlErr.message);
    }
    
    // Fallback to thumbnail if frame extraction failed
    if (frames.length === 0 && animation.thumb) {
      try {
        const thumbFile = await ctx.api.getFile(animation.thumb.file_id);
        const thumbUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${thumbFile.file_path}`;
        const thumbB64 = await telegramFileToBase64(thumbUrl);
        frames = [{ timestamp: "0.0", base64: thumbB64 }];
      } catch (thumbErr) {
        console.error("[GIF] Thumbnail fallback failed:", thumbErr.message);
      }
    }
    
    if (frames.length === 0) {
      return ctx.api.editMessageText(chat.id, statusMsg.message_id, "⚠️ Couldn't extract frames from GIF.", { parse_mode: "HTML" });
    }
    
    // Build image contents for AI
    const imageContents = frames.map(f => ({
      type: "image_url",
      image_url: { url: `data:image/jpeg;base64,${f.base64}` }
    }));
    
    // Context-aware prompt
    const hasQuestion = caption && (caption.includes("?") || /^(who|what|where|when|why|how|is|are|can|does|did|explain|tell|describe|identify)/i.test(caption));
    let userPrompt = caption || "What's in this GIF? Describe what's happening.";
    
    let out;
    if (isCharacterMode) {
      const systemPrompt = buildCharacterSystemPrompt(effectiveCharacter);
      out = await llmText({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: caption || "React to this GIF" },
              ...imageContents
            ]
          }
        ],
        temperature: 0.85,
        max_tokens: 500,
      });
    } else {
      let gifSystemPrompt = `You are analyzing a ${duration}s GIF/animation through ${frames.length} sequential frame(s).\n\nIMPORTANT: Only describe what you can actually SEE. Don't guess or make things up. If it's a meme, describe the visual elements and any text. If you recognize a person/character, name them. If unsure, say so.\n\n`;
      if (hasQuestion) {
        gifSystemPrompt += "Answer the user's specific question based on what you see.";
      } else if (caption) {
        gifSystemPrompt += "Respond to the user's message based on what you observe.";
      } else {
        gifSystemPrompt += "Describe: the scene, any people/characters, actions, visible text, and if it's a meme/joke, explain it.";
      }
      
      out = await llmText({
        model,
        messages: [
          { role: "system", content: gifSystemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: userPrompt },
              ...imageContents
            ]
          }
        ],
        temperature: 0.7,
        max_tokens: 500,
      });
    }
    
    trackUsage(u.id, "message");
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    
    const response = `${modeLabel}${convertToTelegramHTML(out.slice(0, 3500))}\n\n<i>🎬 ${elapsed}s • ${escapeHTML(model)}</i>`;
    await ctx.api.editMessageText(chat.id, statusMsg.message_id, response, { parse_mode: "HTML" });
    
  } catch (e) {
    console.error("Animation error:", e.message);
    const errMsg = `❌ Couldn't process GIF: ${escapeHTML(e.message?.slice(0, 50) || "Unknown error")}`;
    if (statusMsg) {
      await ctx.api.editMessageText(chat.id, statusMsg.message_id, errMsg, { parse_mode: "HTML" }).catch(() => {});
    } else {
      await ctx.reply(errMsg, { parse_mode: "HTML" });
    }
  } finally {
    if (tempDir) cleanupTempDir(tempDir);
  }
});


