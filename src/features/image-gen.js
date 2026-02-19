/**
 * features/image-gen.js
 * Auto-extracted from index.js
 */

// =====================
// IMAGE GENERATION
// Lines 4956-6747 from original index.js
// =====================

      "_You have 2 minutes. After that, feedback mode will expire._",
    {
      parse_mode: "Markdown",
      reply_to_message_id: ctx.message?.message_id,
    }
  );
});

// /imagine - AI image generation (free, unlimited)
bot.command("imagine", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const u = ctx.from;
  if (!u?.id) return;
  
  ensureUser(u.id, u);
  
  // Activate group if used in group chat
  if (ctx.chat.type !== "private") {
    activateGroup(ctx.chat.id);
  }
  
  const text = ctx.message?.text || "";
  const prompt = text.replace(/^\/imagine\s*/i, "").trim();
  
  if (!prompt) {
    await ctx.reply(
      "🎨 *AI Image Generator*\n\n" +
      "Generate stunning images from text descriptions!\n\n" +
      "*Usage:*\n" +
      "`/imagine a cute cat in space`\n" +
      "`/imagine fantasy landscape with mountains`\n" +
      "`/imagine cyberpunk city at night`\n\n" +
      `_Powered by ${getRandomTagline()}_`,
      { parse_mode: "Markdown" }
    );
    return;
  }
  
  // Check if prompt is too long
  if (prompt.length > 500) {
    await ctx.reply("⚠️ Prompt is too long. Please keep it under 500 characters.");
    return;
  }
  
  // Send generating message
  const statusMsg = await ctx.reply(
    "🎨 *Generating image...*\n\n" +
    `Prompt: _${prompt.slice(0, 100)}${prompt.length > 100 ? '...' : ''}_\n\n` +
    "⏳ This may take 10-30 seconds...",
    { parse_mode: "Markdown" }
  );
  
  try {
    // URL encode the prompt
    const encodedPrompt = encodeURIComponent(prompt);
    
    // Build image generation URL with parameters
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true`;
    
    // Fetch the image
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);
    let response;
    try {
      response = await fetch(imageUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'StarzAI-Bot/1.0'
        },
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeoutId);
    }
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    // Get image as buffer
    const imageBuffer = Buffer.from(await response.arrayBuffer());
    
    // Send the image
    await ctx.replyWithPhoto(
      new InputFile(imageBuffer, "generated_image.jpg"),
      {
        caption: `🎨 *Generated Image*\n\n📝 Prompt: _${prompt}_\n\n✨ _Powered by ${getRandomTagline(prompt)}_`,
        parse_mode: "Markdown"
      }
    );
    
    // Delete the status message
    try {
      await ctx.api.deleteMessage(ctx.chat.id, statusMsg.message_id);
    } catch (e) {
      // Ignore deletion errors
    }
    
    // Track usage (save is batched automatically)
    const rec = getUserRecord(u.id);
    if (rec) {
      rec.messagesCount = (rec.messagesCount || 0) + 1;
      saveUsers(); // Batched save - won't block other requests
    }
    
    console.log(`[IMAGINE] User ${u.id} generated image: "${prompt.slice(0, 50)}"`);
    
  } catch (error) {
    console.error("Image generation error:", error);
    
    // Update status message with error
    try {
      await ctx.api.editMessageText(
        ctx.chat.id,
        statusMsg.message_id,
        "❌ *Image generation failed*\n\n" +
        "The service might be temporarily unavailable. Please try again in a moment.\n\n" +
        "_If the problem persists, use /feedback to report it._",
        { parse_mode: "Markdown" }
      );
    } catch (e) {
      // If edit fails, send new message
      await ctx.reply(
        "❌ *Image generation failed*\n\n" +
        "The service might be temporarily unavailable. Please try again in a moment.",
        { parse_mode: "Markdown" }
      );
    }
  }
});

// =====================
// IMAGE GENERATION
// =====================

// Funny rotating taglines with rarity tiers (hide the source!)
// Common (70%) - Items 1-40
// Rare (25%) - Items 41-80  
// Legendary (5%) - Items 81-100
const IMAGE_GEN_TAGLINES = {
  // COMMON (70%) - Lighthearted, punny, safe
  common: [
    "Ludicrous Minds™",
    "Definitely Not Magic™",
    "Fancy Math™",
    "Trust Us Bro™",
    "Vibes and Electricity™",
    "Buttons We Pressed™",
    "Trust The Process™",
    "Artistic Panic™",
    "Neural Nonsense™",
    "Creative Overconfidence™",
    "Image Wizardry™",
    "Pixels and Hope™",
    "Science, Probably™",
    "Pixel Perfect-ish™",
    "Dreams Rendered™",
    "Imagination.exe™",
    "Creativity.dll™",
    "The Cloud Did It™",
    "Certified Fresh Pixels™",
    "AI Goes Brrrr™",
    "Quantum Guesswork™",
    "Artisanal Pixels™",
    "Hand-Crafted by Robots™",
    "100% Organic AI™",
    "Made with Love and GPUs™",
    "Coffee and Code™",
    "Bits and Pieces™",
    "Technically Not Magic™",
    "Imagination Station™",
    "Hopes and Dreams™",
    "Pixel Sorcery™",
    "Digital Daydreams™",
    "Algorithmic Art™",
    "Computational Creativity™",
    "Binary Beauty™",
    "Silicon Dreams™",
    "Electric Imagination™",
    "Synthetic Visions™",
    "Automated Artistry™",
    "Machine Muses™"
  ],
  
  // RARE (25%) - Edgier, wittier, more memorable
  rare: [
    "Digital Voodoo™",
    "Chaos Engine™",
    "Questionable Genius™",
    "Hallucinations™",
    "High-Entropy™",
    "Visual Lies™",
    "Pattern Abuse™",
    "Controlled Chaos™",
    "Organized Madness™",
    "Beautiful Accidents™",
    "Calculated Randomness™",
    "Structured Nonsense™",
    "Elegant Confusion™",
    "Sophisticated Guessing™",
    "Professional Winging It™",
    "Expert Improvisation™",
    "Deliberate Mistakes™",
    "Intentional Glitches™",
    "Curated Chaos™",
    "Refined Randomness™",
    "Artful Errors™",
    "Graceful Failures™",
    "Productive Confusion™",
    "Creative Destruction™",
    "Constructive Chaos™",
    "Methodical Madness™",
    "Systematic Insanity™",
    "Logical Lunacy™",
    "Rational Absurdity™",
    "Sensible Nonsense™",
    "Reasonable Madness™",
    "Sane Insanity™",
    "Coherent Chaos™",
    "Orderly Disorder™",
    "Tidy Turbulence™",
    "Neat Entropy™",
    "Clean Confusion™",
    "Pure Pandemonium™",
    "Refined Ruckus™",
    "Polished Pandemonium™"
  ],
  
  // LEGENDARY (5%) - Dark, cryptic, mysterious
  legendary: [
    "Nothing Personal™",
    "Cold Truth™",
    "Inevitability™",
    "The Void™",
    "Silence™",
    "The Abyss Stares Back™",
    "Entropy Wins™",
    "Heat Death™",
    "The Final Answer™",
    "Oblivion™",
    "The Last Pixel™",
    "End of Line™",
    "NULL™",
    "undefined™",
    "404 Soul Not Found™",
    "The Machine Remembers™",
    "We Know™",
    "It Watches™",
    "The Algorithm Decides™",
    "Fate.exe™"
  ],
  
  // SPECIAL - Context-triggered taglines
  nsfw: [
    "Lewd Thoughts™",
    "Bonk™",
    "Down Bad™",
    "Horny Jail™",
    "Touch Grass™",
    "Sir This Is A Wendy's™",
    "FBI Open Up™",
    "Cultured™",
    "Man of Culture™",
    "Research Purposes™"
  ]
};

// NSFW keyword detection patterns
const NSFW_KEYWORDS = /\b(nsfw|nude|naked|sex|porn|hentai|lewd|erotic|xxx|boob|tit|ass|dick|cock|pussy|vagina|penis|breast|nipple|butt|thigh|bikini|lingerie|underwear|bra|panties|topless|bottomless|strip|seduc|horny|kinky|fetish|bondage|bdsm|dominat|submissive|spank|whip|latex|leather|corset|stockings|garter|cleavage|curvy|thicc|busty|milf|waifu|ahegao|ecchi)\b/i;

// Check if prompt contains NSFW content
function isNsfwPrompt(prompt) {
  return NSFW_KEYWORDS.test(prompt);
}

// Check if user should have safe mode enforced
// Free users: always safe mode (cannot disable)
// Premium/Ultra: can toggle safe mode
// Owners: unrestricted (safe mode always off)
function shouldEnforceSafeMode(userId) {
  const user = usersDb.users[String(userId)];
  if (!user) return true; // Default to safe
  
  const isOwnerUser = OWNER_IDS.has(String(userId));
  
  // Owners are unrestricted
  if (isOwnerUser) return false;
  
  // Free users always have safe mode
  if (user.tier === 'free') return true;
  
  // Premium/Ultra can toggle
  return user.imagePrefs?.safeMode !== false;
}

// Check if user can toggle safe mode (premium/ultra only)
function canToggleSafeMode(userId) {
  const user = usersDb.users[String(userId)];
  if (!user) return false;
  
  const isOwnerUser = OWNER_IDS.has(String(userId));
  if (isOwnerUser) return true; // Owners can always toggle (though it doesn't affect them)
  
  return user.tier === 'premium' || user.tier === 'ultra';
}

// Get a random tagline with rarity weighting
// Common: 70%, Rare: 25%, Legendary: 5%
// Special: NSFW prompts get special taglines
function getRandomTagline(prompt = '') {
  // Check for NSFW content first
  if (prompt && isNsfwPrompt(prompt)) {
    const nsfwTaglines = IMAGE_GEN_TAGLINES.nsfw;
    return nsfwTaglines[Math.floor(Math.random() * nsfwTaglines.length)];
  }
  
  const roll = Math.random() * 100;
  let tier;
  
  if (roll < 70) {
    tier = 'common';
  } else if (roll < 95) {
    tier = 'rare';
  } else {
    tier = 'legendary';
  }
  
  const taglines = IMAGE_GEN_TAGLINES[tier];
  return taglines[Math.floor(Math.random() * taglines.length)];
}

// Aspect ratio configurations
const IMG_ASPECT_RATIOS = {
  "1:1": { width: 768, height: 768, icon: "⬜", label: "Square" },
  "4:3": { width: 896, height: 672, icon: "🖼️", label: "Landscape" },
  "3:4": { width: 672, height: 896, icon: "📱", label: "Portrait" },
  "16:9": { width: 1024, height: 576, icon: "🎬", label: "Widescreen" },
  "9:16": { width: 576, height: 1024, icon: "📲", label: "Story" },
  "3:2": { width: 864, height: 576, icon: "📷", label: "Photo" }
};

// Store pending image prompts (userId -> { prompt, messageId, chatId })
const pendingImagePrompts = new Map();

// Helper function to generate image with Flux1schnell model
async function generateFluxImage(prompt, aspectRatio, userId, retryCount = 0) {
  const config = IMG_ASPECT_RATIOS[aspectRatio] || IMG_ASPECT_RATIOS["1:1"];
  
  // Flux1schnell is optimized for 4 steps
  const steps = 4;
  
  // Get the next available API key
  const apiKey = deapiKeyManager.getNextKey();
  if (!apiKey) {
    throw new Error("No DeAPI keys configured");
  }
  
  const keyId = deapiKeyManager.getKeyId(apiKey);
  console.log(`[IMG2/Flux] Using DeAPI key ${keyId} for user ${userId}`);
  
  try {
    // Submit image generation request
    const submitResponse = await fetch("https://api.deapi.ai/api/v1/client/txt2img", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        prompt: prompt,
        model: "Flux1schnell",
        width: config.width,
        height: config.height,
        steps: steps,
        seed: Math.floor(Math.random() * 4294967295),
        negative_prompt: ""
      })
    });
    
    if (!submitResponse.ok) {
      const errorText = await submitResponse.text();
      const error = new Error(`DeAPI submit error (${submitResponse.status}): ${errorText}`);
      
      const isQuotaError = submitResponse.status === 402 || 
                          submitResponse.status === 429 || 
                          errorText.toLowerCase().includes('credit') ||
                          errorText.toLowerCase().includes('quota') ||
                          errorText.toLowerCase().includes('limit');
      
      deapiKeyManager.recordFailure(apiKey, error);
      
      if (isQuotaError && retryCount < DEAPI_KEYS.length - 1) {
        console.log(`[IMG2/Flux] Key ${keyId} quota/credit error, trying next key...`);
        return generateFluxImage(prompt, aspectRatio, userId, retryCount + 1);
      }
      
      throw error;
    }
    
    const submitData = await submitResponse.json();
    const requestId = submitData?.data?.request_id;
    
    if (!requestId) {
      const error = new Error("No request_id returned from DeAPI");
      deapiKeyManager.recordFailure(apiKey, error);
      throw error;
    }
    
    console.log(`[IMG2/Flux] Submitted request ${requestId} for user ${userId} (${aspectRatio}) using key ${keyId}`);
    
    // Poll for result
    let imageUrl = null;
    let attempts = 0;
    const maxAttempts = 30;
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const statusResponse = await fetch(
        `https://api.deapi.ai/api/v1/client/request-status/${requestId}`,
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Accept": "application/json"
          }
        }
      );
      
      if (!statusResponse.ok) {
        attempts++;
        continue;
      }
      
      const statusData = await statusResponse.json();
      const status = statusData?.data?.status || statusData?.status;
      
      if (status === "done" || status === "completed" || status === "success") {
        imageUrl = statusData?.data?.result_url ||
                   statusData?.data?.result?.url ||
                   statusData?.data?.result?.image_url ||
                   statusData?.data?.url ||
                   statusData?.data?.image_url ||
                   statusData?.result?.url ||
                   (Array.isArray(statusData?.data?.result) ? statusData.data.result[0]?.url : null) ||
                   (Array.isArray(statusData?.data?.images) ? statusData.data.images[0] : null);
        console.log(`[IMG2/Flux] Found image URL: ${imageUrl ? imageUrl.slice(0, 100) + '...' : 'null'}`);
        break;
      } else if (status === "error" || status === "failed") {
        const error = new Error(statusData?.data?.error || statusData?.error || "Image generation failed");
        deapiKeyManager.recordFailure(apiKey, error);
        throw error;
      }
      
      attempts++;
    }
    
    if (!imageUrl) {
      const error = new Error("Timeout waiting for image generation");
      deapiKeyManager.recordFailure(apiKey, error);
      throw error;
    }
    
    // Download the image
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      const error = new Error(`Failed to download image: ${imageResponse.status}`);
      deapiKeyManager.recordFailure(apiKey, error);
      throw error;
    }
    
    // Success! Record it
    deapiKeyManager.recordSuccess(apiKey);
    console.log(`[IMG2/Flux] Successfully generated image using key ${keyId}`);
    
    return Buffer.from(await imageResponse.arrayBuffer());
    
  } catch (error) {
    if (retryCount < DEAPI_KEYS.length - 1 && 
        (error.message.includes('fetch') || 
         error.message.includes('network') ||
         error.message.includes('timeout'))) {
      console.log(`[IMG2/Flux] Network error, trying next key...`);
      return generateFluxImage(prompt, aspectRatio, userId, retryCount + 1);
    }
    throw error;
  }
}

// Helper function to generate image with ZImageTurbo (with multi-key support)
async function generateDeAPIImage(prompt, aspectRatio, userId, retryCount = 0) {
  const config = IMG_ASPECT_RATIOS[aspectRatio] || IMG_ASPECT_RATIOS["1:1"];
  
  // Get user's custom steps (owner only feature)
  const user = usersDb.users[String(userId)];
  const isOwnerUser = OWNER_IDS.has(String(userId));
  const steps = (isOwnerUser && user?.imagePrefs?.steps) ? user.imagePrefs.steps : 8;
  
  // Get the next available API key
  const apiKey = deapiKeyManager.getNextKey();
  if (!apiKey) {
    throw new Error("No DeAPI keys configured");
  }
  
  const keyId = deapiKeyManager.getKeyId(apiKey);
  console.log(`[IMG] Using DeAPI key ${keyId} for user ${userId}`);
  
  try {
    // Step 1: Submit image generation request
    const submitResponse = await fetch("https://api.deapi.ai/api/v1/client/txt2img", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        prompt: prompt,
        model: "ZImageTurbo_INT8",
        width: config.width,
        height: config.height,
        steps: steps,
        seed: Math.floor(Math.random() * 4294967295),
        negative_prompt: "blur, low quality, distorted, ugly, deformed"
      })
    });
    
    if (!submitResponse.ok) {
      const errorText = await submitResponse.text();
      const error = new Error(`DeAPI submit error (${submitResponse.status}): ${errorText}`);
      
      // Check if it's a credit/quota error that should trigger failover
      const isQuotaError = submitResponse.status === 402 || 
                          submitResponse.status === 429 || 
                          errorText.toLowerCase().includes('credit') ||
                          errorText.toLowerCase().includes('quota') ||
                          errorText.toLowerCase().includes('limit');
      
      deapiKeyManager.recordFailure(apiKey, error);
      
      // Try next key if we have more keys and haven't exceeded retry limit
      if (isQuotaError && retryCount < DEAPI_KEYS.length - 1) {
        console.log(`[IMG] Key ${keyId} quota/credit error, trying next key...`);
        return generateDeAPIImage(prompt, aspectRatio, userId, retryCount + 1);
      }
      
      throw error;
    }
    
    const submitData = await submitResponse.json();
    const requestId = submitData?.data?.request_id;
    
    if (!requestId) {
      const error = new Error("No request_id returned from DeAPI");
      deapiKeyManager.recordFailure(apiKey, error);
      throw error;
    }
    
    console.log(`[IMG] Submitted request ${requestId} for user ${userId} (${aspectRatio}) using key ${keyId}`);
    
    // Step 2: Poll for result
    let imageUrl = null;
    let attempts = 0;
    const maxAttempts = 30;
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const statusResponse = await fetch(
        `https://api.deapi.ai/api/v1/client/request-status/${requestId}`,
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Accept": "application/json"
          }
        }
      );
      
      if (!statusResponse.ok) {
        attempts++;
        continue;
      }
      
      const statusData = await statusResponse.json();
      const status = statusData?.data?.status || statusData?.status;
      
      // Debug log to see actual response format
      if (attempts === 0 || status === "done" || status === "completed" || status === "error" || status === "failed") {
        console.log(`[IMG] Status check #${attempts + 1}: status=${status}, data=${JSON.stringify(statusData).slice(0, 500)}`);
      }
      
      if (status === "done" || status === "completed" || status === "success") {
        imageUrl = statusData?.data?.result_url ||
                   statusData?.data?.result?.url ||
                   statusData?.data?.result?.image_url ||
                   statusData?.data?.url ||
                   statusData?.data?.image_url ||
                   statusData?.result?.url ||
                   (Array.isArray(statusData?.data?.result) ? statusData.data.result[0]?.url : null) ||
                   (Array.isArray(statusData?.data?.images) ? statusData.data.images[0] : null);
        console.log(`[IMG] Found image URL: ${imageUrl ? imageUrl.slice(0, 100) + '...' : 'null'}`);
        break;
      } else if (status === "error" || status === "failed") {
        const error = new Error(statusData?.data?.error || statusData?.error || "Image generation failed");
        deapiKeyManager.recordFailure(apiKey, error);
        throw error;
      }
      
      attempts++;
    }
    
    if (!imageUrl) {
      const error = new Error("Timeout waiting for image generation");
      deapiKeyManager.recordFailure(apiKey, error);
      throw error;
    }
    
    // Step 3: Download the image
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      const error = new Error(`Failed to download image: ${imageResponse.status}`);
      deapiKeyManager.recordFailure(apiKey, error);
      throw error;
    }
    
    // Success! Record it
    deapiKeyManager.recordSuccess(apiKey);
    console.log(`[IMG] Successfully generated image using key ${keyId}`);
    
    return Buffer.from(await imageResponse.arrayBuffer());
    
  } catch (error) {
    // If this was a network/server error and we have more keys, try the next one
    if (retryCount < DEAPI_KEYS.length - 1 && 
        (error.message.includes('fetch') || 
         error.message.includes('network') ||
         error.message.includes('ECONNREFUSED') ||
         error.message.includes('timeout'))) {
      console.log(`[IMG] Key ${keyId} network error, trying next key...`);
      return generateDeAPIImage(prompt, aspectRatio, userId, retryCount + 1);
    }
    throw error;
  }
}

// Parse natural language aspect ratio from prompt
function parseAspectRatioFromText(text) {
  const lower = text.toLowerCase();
  
  // Check for explicit ratio mentions
  if (/\b(16[:\-x]9|widescreen|wide|cinematic|movie)\b/.test(lower)) return "16:9";
  if (/\b(9[:\-x]16|story|stories|vertical|tall|tiktok|reels?)\b/.test(lower)) return "9:16";
  if (/\b(4[:\-x]3|landscape|horizontal)\b/.test(lower)) return "4:3";
  if (/\b(3[:\-x]4|portrait|mobile)\b/.test(lower)) return "3:4";
  if (/\b(3[:\-x]2|photo|photograph)\b/.test(lower)) return "3:2";
  if (/\b(1[:\-x]1|square)\b/.test(lower)) return "1:1";
  
  return null; // No ratio detected
}

// Clean prompt by removing ratio keywords
function cleanPromptFromRatio(prompt) {
  return prompt
    .replace(/\b(in\s+)?(16[:\-x]9|9[:\-x]16|4[:\-x]3|3[:\-x]4|3[:\-x]2|1[:\-x]1)\b/gi, '')
    .replace(/\b(in\s+)?(widescreen|wide|cinematic|movie|story|stories|vertical|tall|tiktok|reels?|landscape|horizontal|portrait|mobile|photo|photograph|square)\s*(ratio|format|mode)?\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// /img - AI image generation with smart aspect ratio detection
bot.command("img", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const u = ctx.from;
  if (!u?.id) return;
  
  const user = ensureUser(u.id, u);
  
  if (ctx.chat.type !== "private") {
    activateGroup(ctx.chat.id);
  }
  
  if (!deapiKeyManager.hasKeys()) {
    await ctx.reply(
      "⚠️ Image generation is not configured. Use /imagine instead for free image generation.",
      { parse_mode: "Markdown" }
    );
    return;
  }
  
  const text = ctx.message?.text || "";
  let rawPrompt = text.replace(/^\/img\s*/i, "").trim();
  
  if (!rawPrompt) {
    const defaultRatio = user.imagePrefs?.defaultRatio || "1:1";
    const defaultConfig = IMG_ASPECT_RATIOS[defaultRatio];
    await ctx.reply(
      "🎨 *AI Image Generator*\n\n" +
      "Create stunning images with AI!\n\n" +
      "*Usage:*\n" +
      "`/img a cute cat in space`\n" +
      "`/img a sunset in widescreen`\n" +
      "`/img portrait of a warrior`\n\n" +
      "*Smart Ratios:* Just mention it!\n" +
      "• _widescreen, cinematic, movie_ → 16:9\n" +
      "• _story, vertical, tiktok_ → 9:16\n" +
      "• _portrait, mobile_ → 3:4\n" +
      "• _landscape, horizontal_ → 4:3\n" +
      "• _square_ → 1:1\n\n" +
      `📌 *Your default:* ${defaultConfig?.icon || '⬜'} ${defaultConfig?.label || 'Square'}\n` +
      `_Use /imgset to change default_\n\n` +
      `_Powered by ${getRandomTagline()}_`,
      { parse_mode: "Markdown" }
    );
    return;
  }
  
  if (rawPrompt.length > 500) {
    await ctx.reply("⚠️ Prompt is too long. Please keep it under 500 characters.");
    return;
  }
  
  // Check NSFW content and safe mode
  if (isNsfwPrompt(rawPrompt) && shouldEnforceSafeMode(u.id)) {
    const tier = user.tier || 'free';
    let message = "🔒 *Safe Mode Active*\n\n" +
      "Your prompt contains content that isn't allowed in safe mode.\n\n";
    
    if (tier === 'free') {
      message += "_Free users have safe mode enabled by default._\n" +
        "Upgrade to Premium or Ultra to access unrestricted image generation.";
    } else {
      message += "_You can disable safe mode in_ /imgset _to generate this content._";
    }
    
    await ctx.reply(message, { parse_mode: "Markdown" });
    return;
  }
  
  // Try to detect aspect ratio from prompt
  const detectedRatio = parseAspectRatioFromText(rawPrompt);
  const cleanedPrompt = detectedRatio ? cleanPromptFromRatio(rawPrompt) : rawPrompt;
  const finalPrompt = cleanedPrompt || rawPrompt; // Fallback if cleaning removed everything
  
  // If ratio detected, generate immediately with that ratio
  if (detectedRatio) {
    const config = IMG_ASPECT_RATIOS[detectedRatio];
    const statusMsg = await ctx.reply(
      "🎨 *Generating your image...*\n\n" +
      `📝 _${finalPrompt.slice(0, 100)}${finalPrompt.length > 100 ? '...' : ''}_\n\n` +
      `📐 ${config.icon} ${config.label} (${detectedRatio})\n\n` +
      "⏳ Please wait 5-15 seconds...",
      { parse_mode: "Markdown" }
    );
    
    // Store for regenerate
    pendingImagePrompts.set(u.id, {
      prompt: finalPrompt,
      messageId: statusMsg.message_id,
      chatId: ctx.chat.id,
      lastAspectRatio: detectedRatio
    });
    
    try {
      const imageBuffer = await generateDeAPIImage(finalPrompt, detectedRatio, u.id);
      
      const actionButtons = [
        [
          { text: "🔄 Regenerate", callback_data: `img_regen:${detectedRatio}` },
          { text: "📐 Change Ratio", callback_data: "img_change_ar" }
        ],
        [
          { text: "✨ New Image", callback_data: "img_new" }
        ]
      ];
      
      await ctx.api.sendPhoto(
        ctx.chat.id,
        new InputFile(imageBuffer, "generated_image.jpg"),
        {
          caption: `🎨 *Generated Image*\n\n` +
                   `📝 _${finalPrompt.slice(0, 200)}${finalPrompt.length > 200 ? '...' : ''}_\n\n` +
                   `📐 ${config.icon} ${config.label}\n` +
                   `⚡ _Powered by ${getRandomTagline(finalPrompt)}_`,
          parse_mode: "Markdown",
          reply_markup: { inline_keyboard: actionButtons }
        }
      );
      
      try { await ctx.api.deleteMessage(ctx.chat.id, statusMsg.message_id); } catch (e) {}
      
      console.log(`[IMG] User ${u.id} generated image (${detectedRatio}, auto-detected): "${finalPrompt.slice(0, 50)}"`);
      return;
      
    } catch (error) {
      console.error("Image generation error:", error);
      try {
        await ctx.api.editMessageText(
          ctx.chat.id,
          statusMsg.message_id,
          "❌ *Image generation failed*\n\n" +
          `Error: ${error.message?.slice(0, 100) || 'Unknown error'}\n\n` +
          "Try again or use /imagine for free alternative.",
          {
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [
                [{ text: "🔄 Try Again", callback_data: `img_ar:${detectedRatio.replace(':', ':')}` }],
                [{ text: "❌ Cancel", callback_data: "img_cancel" }]
              ]
            }
          }
        );
      } catch (e) {
        await ctx.reply("❌ Image generation failed. Please try /imagine instead.");
      }
      return;
    }
  }
  
  // Use user's default ratio directly - no picker needed!
  const userDefault = user.imagePrefs?.defaultRatio || "1:1";
  const config = IMG_ASPECT_RATIOS[userDefault];
  
  const statusMsg = await ctx.reply(
    "🎨 *Generating your image...*\n\n" +
    `📝 _${finalPrompt.slice(0, 100)}${finalPrompt.length > 100 ? '...' : ''}_\n\n` +
    `📐 ${config.icon} ${config.label} (${userDefault})\n\n` +
    "⏳ Please wait 5-15 seconds...",
    { parse_mode: "Markdown" }
  );
  
  // Store for regenerate
  pendingImagePrompts.set(u.id, {
    prompt: finalPrompt,
    messageId: statusMsg.message_id,
    chatId: ctx.chat.id,
    lastAspectRatio: userDefault
  });
  
  try {
    const imageBuffer = await generateDeAPIImage(finalPrompt, userDefault, u.id);
    
    const actionButtons = [
      [
        { text: "🔄 Regenerate", callback_data: `img_regen:${userDefault}` },
        { text: "📐 Change Ratio", callback_data: "img_change_ar" }
      ],
      [
        { text: "✨ New Image", callback_data: "img_new" }
      ]
    ];
    
    await ctx.api.sendPhoto(
      ctx.chat.id,
      new InputFile(imageBuffer, "generated_image.jpg"),
      {
        caption: `🎨 *Generated Image*\n\n` +
                 `📝 _${finalPrompt.slice(0, 200)}${finalPrompt.length > 200 ? '...' : ''}_\n\n` +
                 `📐 ${config.icon} ${config.label}\n` +
                 `⚡ _Powered by ${getRandomTagline(finalPrompt)}_`,
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: actionButtons }
      }
    );
    
    try { await ctx.api.deleteMessage(ctx.chat.id, statusMsg.message_id); } catch (e) {}
    
    console.log(`[IMG] User ${u.id} generated image (${userDefault}, default): "${finalPrompt.slice(0, 50)}"`);
    
  } catch (error) {
    console.error("Image generation error:", error);
    try {
      await ctx.api.editMessageText(
        ctx.chat.id,
        statusMsg.message_id,
        "❌ *Image generation failed*\n\n" +
        `Error: ${error.message?.slice(0, 100) || 'Unknown error'}\n\n` +
        "Try again or use /imagine for free alternative.",
        {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [{ text: "🔄 Try Again", callback_data: `img_ar:${userDefault.replace(':', ':')}` }],
              [{ text: "❌ Cancel", callback_data: "img_cancel" }]
            ]
          }
        }
      );
    } catch (e) {
      await ctx.reply("❌ Image generation failed. Please try /imagine instead.");
    }
  }
});

// /img2 - Flux1schnell image generation (alternative model)
bot.command("img2", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  if (!(await enforceCommandCooldown(ctx))) return;
  
  const u = ctx.from;
  if (!u?.id) return;
  
  const user = ensureUser(u.id, u);
  
  if (!deapiKeyManager.hasKeys()) {
    await ctx.reply(
      "⚠️ Image generation is not configured. Use /imagine instead for free image generation.",
      { parse_mode: "Markdown" }
    );
    return;
  }
  
  const rawPrompt = ctx.message?.text?.replace(/^\/img2\s*/i, "").trim();
  
  if (!rawPrompt) {
    await ctx.reply(
      "🎨 *Flux Image Generator*\n\n" +
      "Generate images using the Flux model (alternative style).\n\n" +
      "*Usage:* `/img2 <prompt>`\n\n" +
      "*Example:*\n" +
      "`/img2 cyberpunk city at night`\n" +
      "`/img2 portrait of a warrior`\n\n" +
      `_Powered by ${getRandomTagline()}_`,
      { parse_mode: "Markdown" }
    );
    return;
  }
  
  if (rawPrompt.length > 500) {
    await ctx.reply("⚠️ Prompt too long. Please keep it under 500 characters.");
    return;
  }
  
  const finalPrompt = rawPrompt;
  
  // Check NSFW content and safe mode
  if (isNsfwPrompt(finalPrompt) && shouldEnforceSafeMode(u.id)) {
    const tier = user.tier || 'free';
    if (tier === 'free') {
      await ctx.reply(
        "🔒 *Safe Mode Active*\n\n" +
        "Your prompt contains content that isn't allowed in safe mode.\n\n" +
        "_Free users have safe mode enabled by default._\n" +
        "Upgrade to Premium or Ultra to access unrestricted image generation.",
        { parse_mode: "Markdown" }
      );
    } else {
      await ctx.reply(
        "🔒 *Safe Mode Active*\n\n" +
        "Your prompt contains content that isn't allowed in safe mode.\n\n" +
        "_You can disable safe mode in /imgset to generate this content._",
        { parse_mode: "Markdown" }
      );
    }
    return;
  }
  
  // Use user's default ratio directly
  const userDefault = user.imagePrefs?.defaultRatio || "1:1";
  const config = IMG_ASPECT_RATIOS[userDefault];
  
  const statusMsg = await ctx.reply(
    "🎨 *Generating with Flux...*\n\n" +
    `📝 _${finalPrompt.slice(0, 100)}${finalPrompt.length > 100 ? '...' : ''}_\n\n` +
    `📐 ${config.icon} ${config.label} (${userDefault})\n\n` +
    "⏳ Please wait 5-15 seconds...",
    { parse_mode: "Markdown" }
  );
  
  // Store for regenerate
  pendingImagePrompts.set(u.id, {
    prompt: finalPrompt,
    messageId: statusMsg.message_id,
    chatId: ctx.chat.id,
    lastAspectRatio: userDefault,
    model: 'flux'
  });
  
  try {
    const imageBuffer = await generateFluxImage(finalPrompt, userDefault, u.id);
    
    const actionButtons = [
      [
        { text: "🔄 Regenerate", callback_data: `img2_regen:${userDefault}` },
        { text: "📐 Change Ratio", callback_data: "img2_change_ar" }
      ],
      [
        { text: "✨ New Image", callback_data: "img2_new" }
      ]
    ];
    
    await ctx.api.sendPhoto(
      ctx.chat.id,
      new InputFile(imageBuffer, "flux_image.jpg"),
      {
        caption: `🎨 *Flux Generated Image*\n\n` +
                 `📝 _${finalPrompt.slice(0, 200)}${finalPrompt.length > 200 ? '...' : ''}_\n\n` +
                 `📐 ${config.icon} ${config.label}\n` +
                 `⚡ _Powered by ${getRandomTagline(finalPrompt)}_`,
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: actionButtons }
      }
    );
    
    try { await ctx.api.deleteMessage(ctx.chat.id, statusMsg.message_id); } catch (e) {}
    
    console.log(`[IMG2/Flux] User ${u.id} generated image (${userDefault}): "${finalPrompt.slice(0, 50)}"`);
    
  } catch (error) {
    console.error("Flux image generation error:", error);
    try {
      await ctx.api.editMessageText(
        ctx.chat.id,
        statusMsg.message_id,
        "❌ *Image generation failed*\n\n" +
        `Error: ${error.message?.slice(0, 100) || 'Unknown error'}\n\n` +
        "Try /img for the standard model or /imagine for free alternative.",
        {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [{ text: "🔄 Try Again", callback_data: `img2_ar:${userDefault.replace(':', ':')}` }],
              [{ text: "❌ Cancel", callback_data: "img_cancel" }]
            ]
          }
        }
      );
    } catch (e) {
      await ctx.reply("❌ Image generation failed. Please try /img or /imagine instead.");
    }
  }
});

// Handle img2 regenerate
bot.callbackQuery(/^img2_regen:(.+):(.+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const u = ctx.from;
  if (!u?.id) return;
  
  const pending = pendingImagePrompts.get(u.id);
  if (!pending) {
    await ctx.answerCallbackQuery({ text: "Session expired. Please use /img2 again.", show_alert: true });
    return;
  }
  
  const match = ctx.callbackQuery.data.match(/^img2_regen:(.+):(.+)$/);
  const aspectRatio = match ? `${match[1]}:${match[2]}` : pending.lastAspectRatio || "1:1";
  const config = IMG_ASPECT_RATIOS[aspectRatio];
  
  await ctx.answerCallbackQuery({ text: "🔄 Regenerating..." });
  
  try {
    const imageBuffer = await generateFluxImage(pending.prompt, aspectRatio, u.id);
    
    const actionButtons = [
      [
        { text: "🔄 Regenerate", callback_data: `img2_regen:${aspectRatio}` },
        { text: "📐 Change Ratio", callback_data: "img2_change_ar" }
      ],
      [
        { text: "✨ New Image", callback_data: "img2_new" }
      ]
    ];
    
    await ctx.api.sendPhoto(
      ctx.chat.id,
      new InputFile(imageBuffer, "flux_image.jpg"),
      {
        caption: `🎨 *Flux Regenerated Image*\n\n` +
                 `📝 _${pending.prompt.slice(0, 200)}..._\n\n` +
                 `📐 ${config.icon} ${config.label}\n` +
                 `⚡ _Powered by ${getRandomTagline(pending.prompt)}_`,
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: actionButtons }
      }
    );
    
    console.log(`[IMG2/Flux] User ${u.id} regenerated image`);
    
  } catch (error) {
    console.error("Flux regenerate error:", error);
    await ctx.answerCallbackQuery({ text: `❌ Failed: ${error.message?.slice(0, 50)}`, show_alert: true });
  }
});

// Handle img2 change aspect ratio
bot.callbackQuery("img2_change_ar", async (ctx) => {
  const u = ctx.from;
  if (!u?.id) return;
  
  const pending = pendingImagePrompts.get(u.id);
  if (!pending) {
    await ctx.answerCallbackQuery({ text: "Session expired. Please use /img2 again.", show_alert: true });
    return;
  }
  
  await ctx.answerCallbackQuery();
  
  const currentRatio = pending.lastAspectRatio || "1:1";
  
  const aspectButtons = [
    [
      { text: `${currentRatio === "1:1" ? "✅ " : ""}⬜ Square`, callback_data: `img2_ar:1:1` },
      { text: `${currentRatio === "4:3" ? "✅ " : ""}🖼️ Landscape`, callback_data: `img2_ar:4:3` },
      { text: `${currentRatio === "3:4" ? "✅ " : ""}📱 Portrait`, callback_data: `img2_ar:3:4` }
    ],
    [
      { text: `${currentRatio === "16:9" ? "✅ " : ""}🎬 Widescreen`, callback_data: `img2_ar:16:9` },
      { text: `${currentRatio === "9:16" ? "✅ " : ""}📲 Story`, callback_data: `img2_ar:9:16` },
      { text: `${currentRatio === "3:2" ? "✅ " : ""}📷 Photo`, callback_data: `img2_ar:3:2` }
    ],
    [
      { text: "❌ Cancel", callback_data: "img_cancel" }
    ]
  ];
  
  await ctx.reply(
    "🎨 *Change Aspect Ratio (Flux)*\n\n" +
    `📝 _${pending.prompt.slice(0, 100)}${pending.prompt.length > 100 ? '...' : ''}_\n\n` +
    "Select new ratio:",
    {
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: aspectButtons }
    }
  );
});

// Handle img2 aspect ratio selection
bot.callbackQuery(/^img2_ar:(.+):(.+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const u = ctx.from;
  if (!u?.id) return;
  
  const pending = pendingImagePrompts.get(u.id);
  if (!pending) {
    await ctx.answerCallbackQuery({ text: "Session expired. Please use /img2 again.", show_alert: true });
    return;
  }
  
  const match = ctx.callbackQuery.data.match(/^img2_ar:(.+):(.+)$/);
  const aspectRatio = match ? `${match[1]}:${match[2]}` : "1:1";
  const config = IMG_ASPECT_RATIOS[aspectRatio];
  
  await ctx.answerCallbackQuery({ text: `🎨 Generating with ${config.label}...` });
  
  // Update pending with new ratio
  pending.lastAspectRatio = aspectRatio;
  
  try {
    // Delete the ratio selection message
    try { await ctx.deleteMessage(); } catch (e) {}
    
    const imageBuffer = await generateFluxImage(pending.prompt, aspectRatio, u.id);
    
    const actionButtons = [
      [
        { text: "🔄 Regenerate", callback_data: `img2_regen:${aspectRatio}` },
        { text: "📐 Change Ratio", callback_data: "img2_change_ar" }
      ],
      [
        { text: "✨ New Image", callback_data: "img2_new" }
      ]
    ];
    
    await ctx.api.sendPhoto(
      ctx.chat.id,
      new InputFile(imageBuffer, "flux_image.jpg"),
      {
        caption: `🎨 *Flux Generated Image*\n\n` +
                 `📝 _${pending.prompt.slice(0, 200)}${pending.prompt.length > 200 ? '...' : ''}_\n\n` +
                 `📐 ${config.icon} ${config.label}\n` +
                 `⚡ _Powered by ${getRandomTagline(pending.prompt)}_`,
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: actionButtons }
      }
    );
    
    console.log(`[IMG2/Flux] User ${u.id} generated image with new ratio (${aspectRatio})`);
    
  } catch (error) {
    console.error("Flux image generation error:", error);
    await ctx.reply(`❌ Image generation failed: ${error.message?.slice(0, 100)}`);
  }
});

// Handle img2 new image
bot.callbackQuery("img2_new", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply(
    "🎨 *New Flux Image*\n\n" +
    "Send me a new prompt with /img2:\n\n" +
    "`/img2 your prompt here`",
    { parse_mode: "Markdown" }
  );
});

// Handle aspect ratio selection
bot.callbackQuery(/^img_ar:(.+):(.+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const u = ctx.from;
  if (!u?.id) return;
  
  const pending = pendingImagePrompts.get(u.id);
  if (!pending) {
    await ctx.answerCallbackQuery({ text: "Session expired. Please use /img again.", show_alert: true });
    return;
  }
  
  const match = ctx.callbackQuery.data.match(/^img_ar:(.+):(.+)$/);
  const aspectRatio = match ? `${match[1]}:${match[2]}` : "1:1";
  const config = IMG_ASPECT_RATIOS[aspectRatio] || IMG_ASPECT_RATIOS["1:1"];
  
  await ctx.answerCallbackQuery();
  
  // Update message to show generating status
  try {
    await ctx.api.editMessageText(
      pending.chatId,
      pending.messageId,
      "🎨 *Generating your image...*\n\n" +
      `📝 _${pending.prompt.slice(0, 100)}${pending.prompt.length > 100 ? '...' : ''}_\n\n` +
      `📐 ${config.icon} ${config.label} (${aspectRatio})\n\n` +
      "⏳ Please wait 5-15 seconds...",
      { parse_mode: "Markdown" }
    );
  } catch (e) {
    // Ignore edit errors
  }
  
  try {
    const imageBuffer = await generateDeAPIImage(pending.prompt, aspectRatio, u.id);
    
    // Create action buttons for the generated image
    const actionButtons = [
      [
        { text: "🔄 Regenerate", callback_data: `img_regen:${aspectRatio}` },
        { text: "📐 Change Ratio", callback_data: "img_change_ar" }
      ],
      [
        { text: "✨ New Image", callback_data: "img_new" }
      ]
    ];
    
    // Send the image
    await ctx.api.sendPhoto(
      pending.chatId,
      new InputFile(imageBuffer, "generated_image.jpg"),
      {
        caption: `🎨 *Generated Image*\n\n` +
                 `📝 _${pending.prompt.slice(0, 200)}${pending.prompt.length > 200 ? '...' : ''}_\n\n` +
                 `📐 ${config.icon} ${config.label}\n` +
                 `⚡ _Powered by ${getRandomTagline(pending.prompt)}_`,
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: actionButtons }
      }
    );
    
    // Delete the selection message
    try {
      await ctx.api.deleteMessage(pending.chatId, pending.messageId);
    } catch (e) {
      // Ignore
    }
    
    // Update pending with last used aspect ratio (for regenerate)
    pendingImagePrompts.set(u.id, {
      ...pending,
      lastAspectRatio: aspectRatio,
      messageId: null
    });
    
    // Track usage
    const rec = getUserRecord(u.id);
    if (rec) {
      rec.messagesCount = (rec.messagesCount || 0) + 1;
      saveUsers();
    }
    
    console.log(`[IMG] User ${u.id} generated image (${aspectRatio}): "${pending.prompt.slice(0, 50)}"`);
    
  } catch (error) {
    console.error("DeAPI image generation error:", error);
    
    try {
      await ctx.api.editMessageText(
        pending.chatId,
        pending.messageId,
        "❌ *Image generation failed*\n\n" +
        `Error: ${error.message?.slice(0, 100) || 'Unknown error'}\n\n` +
        "Try again or use /imagine for free alternative.",
        {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [{ text: "🔄 Try Again", callback_data: `img_ar:${aspectRatio.replace(':', ':')}` }],
              [{ text: "❌ Cancel", callback_data: "img_cancel" }]
            ]
          }
        }
      );
    } catch (e) {
      await ctx.reply("❌ Image generation failed. Please try /imagine instead.");
    }
  }
});

// Handle regenerate with same settings
bot.callbackQuery(/^img_regen:(.+):(.+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const u = ctx.from;
  if (!u?.id) return;
  
  const pending = pendingImagePrompts.get(u.id);
  if (!pending?.prompt) {
    await ctx.answerCallbackQuery({ text: "Session expired. Please use /img again.", show_alert: true });
    return;
  }
  
  const match = ctx.callbackQuery.data.match(/^img_regen:(.+):(.+)$/);
  const aspectRatio = match ? `${match[1]}:${match[2]}` : pending.lastAspectRatio || "1:1";
  const config = IMG_ASPECT_RATIOS[aspectRatio] || IMG_ASPECT_RATIOS["1:1"];
  
  await ctx.answerCallbackQuery({ text: "🔄 Regenerating..." });
  
  // Send a new generating message
  const statusMsg = await ctx.reply(
    "🔄 *Regenerating image...*\n\n" +
    `📝 _${pending.prompt.slice(0, 100)}..._\n` +
    `📐 ${config.icon} ${config.label}\n\n` +
    "⏳ Please wait...",
    { parse_mode: "Markdown" }
  );
  
  try {
    const imageBuffer = await generateDeAPIImage(pending.prompt, aspectRatio, u.id);
    
    const actionButtons = [
      [
        { text: "🔄 Regenerate", callback_data: `img_regen:${aspectRatio}` },
        { text: "📐 Change Ratio", callback_data: "img_change_ar" }
      ],
      [
        { text: "✨ New Image", callback_data: "img_new" }
      ]
    ];
    
    await ctx.replyWithPhoto(
      new InputFile(imageBuffer, "generated_image.jpg"),
      {
        caption: `🎨 *Regenerated Image*\n\n` +
                 `📝 _${pending.prompt.slice(0, 200)}..._\n\n` +
                 `📐 ${config.icon} ${config.label}\n` +
                 `⚡ _Powered by ${getRandomTagline(pending.prompt)}_`,
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: actionButtons }
      }
    );
    
    try {
      await ctx.api.deleteMessage(ctx.chat.id, statusMsg.message_id);
    } catch (e) {}
    
    const rec = getUserRecord(u.id);
    if (rec) {
      rec.messagesCount = (rec.messagesCount || 0) + 1;
      saveUsers();
    }
    
  } catch (error) {
    console.error("DeAPI regenerate error:", error);
    try {
      await ctx.api.editMessageText(
        ctx.chat.id,
        statusMsg.message_id,
        "❌ Regeneration failed. Please try again.",
        { parse_mode: "Markdown" }
      );
    } catch (e) {}
  }
});

// Handle change aspect ratio
bot.callbackQuery("img_change_ar", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const u = ctx.from;
  if (!u?.id) return;
  
  const pending = pendingImagePrompts.get(u.id);
  if (!pending?.prompt) {
    await ctx.answerCallbackQuery({ text: "Session expired. Please use /img again.", show_alert: true });
    return;
  }
  
  await ctx.answerCallbackQuery();
  
  const aspectButtons = [
    [
      { text: "⬜ Square", callback_data: `img_ar:1:1` },
      { text: "🖼️ Landscape", callback_data: `img_ar:4:3` },
      { text: "📱 Portrait", callback_data: `img_ar:3:4` }
    ],
    [
      { text: "🎬 Widescreen", callback_data: `img_ar:16:9` },
      { text: "📲 Story", callback_data: `img_ar:9:16` },
      { text: "📷 Photo", callback_data: `img_ar:3:2` }
    ],
    [
      { text: "❌ Cancel", callback_data: "img_cancel" }
    ]
  ];
  
  const msg = await ctx.reply(
    "📐 *Change Aspect Ratio*\n\n" +
    `📝 _${pending.prompt.slice(0, 150)}..._\n\n` +
    "Select a new format:",
    {
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: aspectButtons }
    }
  );
  
  pendingImagePrompts.set(u.id, {
    ...pending,
    messageId: msg.message_id,
    chatId: ctx.chat.id
  });
});

// Handle new image request
bot.callbackQuery("img_new", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply(
    "✨ *New Image*\n\n" +
    "Send a new prompt with:\n" +
    "`/img your description here`",
    { parse_mode: "Markdown" }
  );
});

// Handle cancel
bot.callbackQuery("img_cancel", async (ctx) => {
  const u = ctx.from;
  if (u?.id) {
    pendingImagePrompts.delete(u.id);
  }
  
  await ctx.answerCallbackQuery({ text: "Cancelled" });
  
  try {
    await ctx.deleteMessage();
  } catch (e) {
    try {
      await ctx.editMessageText("❌ Cancelled");
    } catch (e2) {}
  }
});

// /imgset - Configure image generation preferences
bot.command("imgset", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const u = ctx.from;
  if (!u?.id) return;
  
  const user = ensureUser(u.id, u);
  const currentRatio = user.imagePrefs?.defaultRatio || "1:1";
  const currentConfig = IMG_ASPECT_RATIOS[currentRatio];
  const isOwnerUser = OWNER_IDS.has(String(u.id));
  
  const text = ctx.message?.text || "";
  const args = text.replace(/^\/imgset\s*/i, "").trim().toLowerCase();
  
  // Handle steps setting (owner only)
  if (args.startsWith("steps ") && isOwnerUser) {
    const stepsValue = parseInt(args.replace("steps ", "").trim());
    if (isNaN(stepsValue) || stepsValue < 1 || stepsValue > 50) {
      await ctx.reply("⚠️ Steps must be between 1 and 50.");
      return;
    }
    user.imagePrefs = user.imagePrefs || {};
    user.imagePrefs.steps = stepsValue;
    saveUsers();
    await ctx.reply(`✅ Image generation steps set to *${stepsValue}*\n\n_Higher steps = better quality but slower_`, { parse_mode: "Markdown" });
    return;
  }
  
  // Handle safe mode toggle (premium/ultra only)
  if (args === "safe on" || args === "safe off" || args === "nsfw on" || args === "nsfw off") {
    if (!canToggleSafeMode(u.id)) {
      await ctx.reply(
        "🔒 *Safe Mode Toggle*\n\n" +
        "This feature is only available for *Premium* and *Ultra* users.\n\n" +
        "Free users have safe mode enabled by default to keep things family-friendly.",
        { parse_mode: "Markdown" }
      );
      return;
    }
    
    const enableSafe = args === "safe on" || args === "nsfw off";
    user.imagePrefs = user.imagePrefs || {};
    user.imagePrefs.safeMode = enableSafe;
    saveUsers();
    
    if (enableSafe) {
      await ctx.reply("✅ *Safe Mode Enabled*\n\nNSFW content will be blocked.", { parse_mode: "Markdown" });
    } else {
      await ctx.reply("🔓 *Safe Mode Disabled*\n\nNSFW content is now allowed.\n\n_Please use responsibly._", { parse_mode: "Markdown" });
    }
    return;
  }
  
  // Handle ratio setting
  const ratioMap = {
    "square": "1:1", "1:1": "1:1",
    "landscape": "4:3", "4:3": "4:3",
    "portrait": "3:4", "3:4": "3:4",
    "widescreen": "16:9", "16:9": "16:9", "wide": "16:9",
    "story": "9:16", "9:16": "9:16", "vertical": "9:16",
    "photo": "3:2", "3:2": "3:2"
  };
  
  if (args && ratioMap[args]) {
    const newRatio = ratioMap[args];
    const newConfig = IMG_ASPECT_RATIOS[newRatio];
    user.imagePrefs = user.imagePrefs || {};
    user.imagePrefs.defaultRatio = newRatio;
    saveUsers();
    await ctx.reply(
      `✅ Default aspect ratio set to ${newConfig.icon} *${newConfig.label}* (${newRatio})\n\n` +
      `Now when you use /img without specifying a ratio, it will use this!`,
      { parse_mode: "Markdown" }
    );
    return;
  }
  
  // Show settings menu
  const currentSafeMode = shouldEnforceSafeMode(u.id);
  const canToggle = canToggleSafeMode(u.id);
  
  const buttons = [
    [
      { text: `${currentRatio === "1:1" ? "✅ " : ""}⬜ Square`, callback_data: "imgset_ratio:1:1" },
      { text: `${currentRatio === "4:3" ? "✅ " : ""}🖼️ Landscape`, callback_data: "imgset_ratio:4:3" },
      { text: `${currentRatio === "3:4" ? "✅ " : ""}📱 Portrait`, callback_data: "imgset_ratio:3:4" }
    ],
    [
      { text: `${currentRatio === "16:9" ? "✅ " : ""}🎬 Widescreen`, callback_data: "imgset_ratio:16:9" },
      { text: `${currentRatio === "9:16" ? "✅ " : ""}📲 Story`, callback_data: "imgset_ratio:9:16" },
      { text: `${currentRatio === "3:2" ? "✅ " : ""}📷 Photo`, callback_data: "imgset_ratio:3:2" }
    ]
  ];
  
  // Add safe mode toggle button for premium/ultra users
  if (canToggle) {
    buttons.push([
      { 
        text: currentSafeMode ? "🔒 Safe Mode: ON (tap to disable)" : "🔓 Safe Mode: OFF (tap to enable)", 
        callback_data: currentSafeMode ? "imgset_safe:off" : "imgset_safe:on" 
      }
    ]);
  }
  
  let settingsText = `⚙️ *Image Settings*\n\n` +
    `📐 *Default Ratio:* ${currentConfig?.icon || '⬜'} ${currentConfig?.label || 'Square'} (${currentRatio})\n\n` +
    `Select a new default ratio:`;
  
  // Show safe mode status
  if (isOwnerUser) {
    settingsText += `\n\n🔓 *Safe Mode:* OFF _(owners unrestricted)_`;
  } else if (user.tier === 'free') {
    settingsText += `\n\n🔒 *Safe Mode:* ON _(always on for free users)_`;
  } else {
    settingsText += `\n\n${currentSafeMode ? '🔒' : '🔓'} *Safe Mode:* ${currentSafeMode ? 'ON' : 'OFF'}`;
  }
  
  // Show steps setting for owners
  if (isOwnerUser) {
    const currentSteps = user.imagePrefs?.steps || 8;
    settingsText += `\n\n🔧 *Steps:* ${currentSteps} _(owner only)_\n` +
      `Use \`/imgset steps [1-50]\` to change`;
  }
  
  await ctx.reply(settingsText, {
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: buttons }
  });
});

// Handle imgset ratio selection
bot.callbackQuery(/^imgset_ratio:(.+):(.+)$/, async (ctx) => {
  const u = ctx.from;
  if (!u?.id) return;
  
  const user = ensureUser(u.id, u);
  const match = ctx.callbackQuery.data.match(/^imgset_ratio:(.+):(.+)$/);
  const newRatio = match ? `${match[1]}:${match[2]}` : "1:1";
  const newConfig = IMG_ASPECT_RATIOS[newRatio];
  
  user.imagePrefs = user.imagePrefs || {};
  user.imagePrefs.defaultRatio = newRatio;
  saveUsers();
  
  await ctx.answerCallbackQuery({ text: `✅ Default set to ${newConfig.label}` });
  
  // Update the message with new selection
  const isOwnerUser = OWNER_IDS.has(String(u.id));
  
  const currentSafeMode = shouldEnforceSafeMode(u.id);
  const canToggle = canToggleSafeMode(u.id);
  
  const buttons = [
    [
      { text: `${newRatio === "1:1" ? "✅ " : ""}⬜ Square`, callback_data: "imgset_ratio:1:1" },
      { text: `${newRatio === "4:3" ? "✅ " : ""}🖼️ Landscape`, callback_data: "imgset_ratio:4:3" },
      { text: `${newRatio === "3:4" ? "✅ " : ""}📱 Portrait`, callback_data: "imgset_ratio:3:4" }
    ],
    [
      { text: `${newRatio === "16:9" ? "✅ " : ""}🎬 Widescreen`, callback_data: "imgset_ratio:16:9" },
      { text: `${newRatio === "9:16" ? "✅ " : ""}📲 Story`, callback_data: "imgset_ratio:9:16" },
      { text: `${newRatio === "3:2" ? "✅ " : ""}📷 Photo`, callback_data: "imgset_ratio:3:2" }
    ]
  ];
  
  // Add safe mode toggle button for premium/ultra users
  if (canToggle) {
    buttons.push([
      { 
        text: currentSafeMode ? "🔒 Safe Mode: ON (tap to disable)" : "🔓 Safe Mode: OFF (tap to enable)", 
        callback_data: currentSafeMode ? "imgset_safe:off" : "imgset_safe:on" 
      }
    ]);
  }
  
  // Add back to features button (if came from menu)
  buttons.push([
    { text: "« Back to Features", callback_data: "menu_features" }
  ]);
  
  let settingsText = `🎨 *Image Settings*\n\n` +
    `📐 *Default Ratio:* ${newConfig.icon} ${newConfig.label} (${newRatio}) ✅\n\n` +
    `Select your default aspect ratio for /img:`;
  
  // Show safe mode status
  if (isOwnerUser) {
    settingsText += `\n\n🔓 *Safe Mode:* OFF _(owners unrestricted)_`;
  } else if (user.tier === 'free') {
    settingsText += `\n\n🔒 *Safe Mode:* ON _(always on for free users)_`;
  } else {
    settingsText += `\n\n${currentSafeMode ? '🔒' : '🔓'} *Safe Mode:* ${currentSafeMode ? 'ON' : 'OFF'}`;
  }
  
  if (isOwnerUser) {
    const currentSteps = user.imagePrefs?.steps || 8;
    settingsText += `\n\n🔧 *Steps:* ${currentSteps} _(owner only)_\n` +
      `Use \`/imgset steps [1-50]\` to change`;
  }
  
  settingsText += `\n\n_Your default is saved! Use /img to generate images._`;
  
  try {
    await ctx.editMessageText(settingsText, {
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: buttons }
    });
  } catch (e) {}
});

// Handle safe mode toggle
bot.callbackQuery(/^imgset_safe:(on|off)$/, async (ctx) => {
  const u = ctx.from;
  if (!u?.id) return;
  
  const user = ensureUser(u.id, u);
  const match = ctx.callbackQuery.data.match(/^imgset_safe:(on|off)$/);
  const enableSafe = match?.[1] === 'on';
  
  // Check if user can toggle
  if (!canToggleSafeMode(u.id)) {
    await ctx.answerCallbackQuery({ 
      text: "🔒 Safe mode toggle requires Premium or Ultra", 
      show_alert: true 
    });
    return;
  }
  
  user.imagePrefs = user.imagePrefs || {};
  user.imagePrefs.safeMode = enableSafe;
  saveUsers();
  
  await ctx.answerCallbackQuery({ 
    text: enableSafe ? "🔒 Safe mode enabled" : "🔓 Safe mode disabled" 
  });
  
  // Update the message
  const isOwnerUser = OWNER_IDS.has(String(u.id));
  const currentRatio = user.imagePrefs?.defaultRatio || "1:1";
  const currentConfig = IMG_ASPECT_RATIOS[currentRatio];
  const currentSafeMode = shouldEnforceSafeMode(u.id);
  
  const buttons = [
    [
      { text: `${currentRatio === "1:1" ? "✅ " : ""}⬜ Square`, callback_data: "imgset_ratio:1:1" },
      { text: `${currentRatio === "4:3" ? "✅ " : ""}🖼️ Landscape`, callback_data: "imgset_ratio:4:3" },
      { text: `${currentRatio === "3:4" ? "✅ " : ""}📱 Portrait`, callback_data: "imgset_ratio:3:4" }
    ],
    [
      { text: `${currentRatio === "16:9" ? "✅ " : ""}🎬 Widescreen`, callback_data: "imgset_ratio:16:9" },
      { text: `${currentRatio === "9:16" ? "✅ " : ""}📲 Story`, callback_data: "imgset_ratio:9:16" },
      { text: `${currentRatio === "3:2" ? "✅ " : ""}📷 Photo`, callback_data: "imgset_ratio:3:2" }
    ],
    [
      { 
        text: currentSafeMode ? "🔒 Safe Mode: ON (tap to disable)" : "🔓 Safe Mode: OFF (tap to enable)", 
        callback_data: currentSafeMode ? "imgset_safe:off" : "imgset_safe:on" 
      }
    ],
    [
      { text: "« Back to Features", callback_data: "menu_features" }
    ]
  ];
  
  let settingsText = `🎨 *Image Settings*\n\n` +
    `📐 *Default Ratio:* ${currentConfig?.icon || '⬜'} ${currentConfig?.label || 'Square'} (${currentRatio})\n\n` +
    `Select your default aspect ratio for /img:`;
  
  // Show safe mode status
  if (isOwnerUser) {
    settingsText += `\n\n🔓 *Safe Mode:* OFF _(owners unrestricted)_`;
  } else if (user.tier === 'free') {
    settingsText += `\n\n🔒 *Safe Mode:* ON _(always on for free users)_`;
  } else {
    settingsText += `\n\n${currentSafeMode ? '🔒' : '🔓'} *Safe Mode:* ${currentSafeMode ? 'ON' : 'OFF'}`;
  }
  
  if (isOwnerUser) {
    const currentSteps = user.imagePrefs?.steps || 8;
    settingsText += `\n\n🔧 *Steps:* ${currentSteps} _(owner only)_\n` +
      `Use \`/imgset steps [1-50]\` to change`;
  }
  
  try {
    await ctx.editMessageText(settingsText, {
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: buttons }
    });
  } catch (e) {}
});

// Feedback button in main menu or moderation messages
bot.callbackQuery("menu_feedback", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;

  if (!FEEDBACK_CHAT_ID) {
    await ctx.answerCallbackQuery({
      text: "Feedback is not configured yet.",
      show_alert: true,
    });
    return;
  }

  const chatType = ctx.chat?.type;
  if (chatType !== "private") {
    await ctx.answerCallbackQuery({
      text: "Open a private chat with @starztechbot to send feedback.",
      show_alert: true,
    });
    return;
  }

  const u = ctx.from;
  if (!u?.id) {
    await ctx.answerCallbackQuery({ text: "No user ID.", show_alert: true });
    return;
  }

  // Infer context from the message text (ban/mute/softban/warn/general)
  const msgText = ctx.callbackQuery.message?.text || "";
  let source = "general";
  if (msgText.includes("You have been banned from using StarzAI")) {
    source = "ban";
  } else if (msgText.includes("You have been muted on StarzAI")) {
    source = "mute";
  } else if (msgText.includes("temporary soft ban on StarzAI")) {
    source = "softban";
  } else if (msgText.includes("You have received a warning on StarzAI")) {
    source = "warn";
  }

  pendingFeedback.set(String(u.id), { createdAt: Date.now(), source });


