/**
 * utils/ui.js
 * Auto-extracted from index.js
 */

// =====================
// UI HELPERS + INLINE CHAT UI
// Lines 3751-4155 from original index.js
// =====================

    .replace(/\|/g, '\\|')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/\./g, '\\.')
    .replace(/!/g, '\\!/'); 
}

// Trim incomplete tail of a long answer (avoid cutting mid-word or mid-sentence)
// Used for Blackhole continuation so we don't leave broken endings like "so it me"
function trimIncompleteTail(text, maxTail = 220) {
  if (!text) return text;
  const trimmed = text.trimEnd();
  if (!trimmed) return trimmed;

  const lastChar = trimmed[trimmed.length - 1];
  // If it already ends with sensible punctuation, leave it
  if (".?!)]\"'".includes(lastChar)) {
    return trimmed;
  }

  const start = Math.max(0, trimmed.length - maxTail);
  const tail = trimmed.slice(start);

  // Prefer to cut at a sentence boundary within the tail
  const lastDot = tail.lastIndexOf(".");
  const lastQ = tail.lastIndexOf("?");
  const lastEx = tail.lastIndexOf("!");
  const lastSentenceEnd = Math.max(lastDot, lastQ, lastEx);

  if (lastSentenceEnd !== -1) {
    return trimmed.slice(0, start + lastSentenceEnd + 1);
  }

  // Otherwise cut at last space to avoid half-words
  const lastSpace = tail.lastIndexOf(" ");
  if (lastSpace !== -1) {
    return trimmed.slice(0, start + lastSpace);
  }

  return trimmed;
}

// =====================
// PARALLEL EXTRACT API
// Extract and clean content from specific URLs using an external Extract API.
// NOTE: We intentionally avoid naming the provider in user-visible text for privacy.
async function parallelExtractUrls(urls) {
  if (!PARALLEL_API_KEY) {
    return {
      success: false,
      error: "Parallel API key not configured",
      urls,
    };
  }

  const urlList = Array.isArray(urls) ? urls.filter(Boolean) : [urls].filter(Boolean);
  if (!urlList.length) {
    return {
      success: false,
      error: "No URLs provided",
      urls: [],
    };
  }

  try {
    const res = await fetch("https://api.parallel.ai/v1beta/extract", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": PARALLEL_API_KEY,
        // Official beta header for Extract API as per docs:
        // "valid values are: search-extract-2025-10-10"
        "parallel-beta": "search-extract-2025-10-10",
      },
      // Match the minimal shape shown in the official Python example:
      // urls + simple boolean excerpts/full_content flags.
      body: JSON.stringify({
        urls: urlList,
        excerpts: true,
        full_content: true,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.log("Parallel extract HTTP error:", res.status, text.slice(0, 500));
      return {
        success: false,
        error: `HTTP ${res.status}: ${text.slice(0, 200) || "Unknown error from Parallel Extract API"}`,
        urls: urlList,
        status: res.status,
      };
    }

    const data = await res.json();
    const results = Array.isArray(data.results) ? data.results : [];

    const mapped = results.map((r) => {
      const excerpts =
        Array.isArray(r.excerpts)
          ? r.excerpts.join("\n\n")
          : (typeof r.excerpts === "string" ? r.excerpts : "");
      const content = excerpts || r.full_content || "";
      return {
        url: r.url || "",
        title: r.title || (r.url || "No title"),
        content: content || "No content extracted",
      };
    });

    return {
      success: true,
      results: mapped,
      urls: urlList,
    };
  } catch (e) {
    console.log("Parallel extract error:", e.message);
    return {
      success: false,
      error: e.message || "Parallel extract failed",
      urls: Array.isArray(urls) ? urls : [urls],
    };
  }
}

// =====================
// UI HELPERS
// =====================
function helpText() {
  return [
    "⚡ *StarzAI* — Your AI Assistant",
    "",
    "📌 *Basic Commands*",
    "• /start — Welcome message",
    "• /help — This help menu",
    "• /model — Choose AI model",
    "• /reset — Clear chat memory",
    "",
    "🌟 *Feature Commands*",
    "• /partner — Create your AI companion",
    "• /char — Quick character roleplay",
    "• /persona — Set AI personality",
    "• /stats — Your usage statistics",
    "• /search — Web search (raw results)",
    "• /websearch — AI web search with summary",
    FEEDBACK_CHAT_ID ? "• /feedback — Send feedback to the StarzAI team" : "",
    "",
    "🕐 *Time & Date*",
    "• Ask things like: `what's the time in Tokyo?`, `current date in London`",
    "",
    "⌨️ *Inline Modes* (type @starztechbot)",
    "• `q:` — ⭐ Quark (quick answers)",
    "• `b:` — 🗿🔬 Blackhole (deep research)",
    "• `code:` — 💻 Code help",
    "• `e:` — 🧠 Explain (ELI5)",
    "• `as [char]:` — 🎭 Character roleplay",
    "• `sum:` — 📝 Summarize text",
    "• `p:` — 🤝🏻 Partner chat",
    "",
    "🔧 *Owner commands*",
    "• /status, /info, /grant, /revoke, /ban, /unban, /softban, /warn, /clearwarns, /banlist, /mute, /unmute, /mutelist, /ownerhelp",
  ]
    .filter(Boolean)
    .join("\n");
}

// Main menu message builder
function buildMainMenuMessage(userId) {
  const u = getUserRecord(userId);
  const model = ensureChosenModelValid(userId);
  const tier = u?.tier?.toUpperCase() || "FREE";
  const shortModel = model.split("/").pop();
  
  return [
    "⚡ *StarzAI* — Your AI Assistant",
    "",
    `👤 *Tier:* ${tier}  •  🤖 *Model:* \`${shortModel}\``,
    "",
    "━━━━━━━━━━━━━━━━━━━━━━",
    "",
    "💬 *DM* — Chat directly with AI",
    "👥 *Groups* — Say \"Starz\" / \"StarzAI\" or reply to the bot",
    "⌨️ *Inline* — Type @starztechbot anywhere",
    "",
    "━━━━━━━━━━━━━━━━━━━━━━",
    "",
    "_Tap a button below to explore!_",
  ].join("\n");
}

// Main menu keyboard
function mainMenuKeyboard(userId) {
  const user = getUserRecord(userId);
  const webSearchIcon = user?.webSearch ? "🌐 Web: ON" : "🔍 Web: OFF";
  
  const kb = new InlineKeyboard()
    .text("🌟 Features", "menu_features")
    .text("⚙️ Model", "menu_model")
    .row()
    .text("🤝🏻 Partner", "menu_partner")
    .text("📋 Tasks", "todo_list")
    .row()
    .text("🎭 Character", "menu_char")
    .text("📊 Stats", "menu_stats")
    .row()
    .text(webSearchIcon, "toggle_websearch")
    .switchInline("⚡ Try Inline", "");

  if (FEEDBACK_CHAT_ID) {
    kb.row().text("💡 Feedback", "menu_feedback");
  }

  return kb;
}

// Back button keyboard
function backToMainKeyboard() {
  return new InlineKeyboard().text("« Back to Menu", "menu_back");
}

// Legacy helpKeyboard for compatibility
function helpKeyboard(userId) {
  return mainMenuKeyboard(userId);
}

// Beautiful inline help card
function buildInlineHelpCard() {
  return [
    "✨ *StarzAI - Your AI Assistant* ✨",
    "",
    "━━━━━━━━━━━━━━━━━━━━━━",
    "🌟 *FEATURES*",
    "━━━━━━━━━━━━━━━━━━━━━━",
    "",
    "⚡ *AI Modes*",
    "• ⭐ Quark - Lightning fast answers",
    "• 🗿🔬 Blackhole - Deep research",
    "• 💻 Code - Programming help",
    "• 🧠 Explain - Simple explanations",
    "• 🎭 Character - Fun roleplay",
    "• 📝 Summarize - Condense text",
    "",
    "🤝🏻 *AI Partner*",
    "Create your custom AI companion!",
    "",
    "🎭 *Character Mode*",
    "Quick roleplay as any character",
    "",
    "━━━━━━━━━━━━━━━━━━━━━━",
    "📖 *HOW TO USE*",
    "━━━━━━━━━━━━━━━━━━━━━━",
    "",
    "💬 *DM* - Just send a message!",
    "👥 *Groups* - Say \"Starz\" / \"StarzAI\" or reply to the bot",
    "⌨️ *Inline* - Type @starztechbot anywhere",
    "",
    "━━━━━━━━━━━━━━━━━━━━━━",
    "⌨️ *INLINE MODES*",
    "━━━━━━━━━━━━━━━━━━━━━━",
    "",
    "`q:` → ⭐ Quark (quick)",
    "`b:` → 🗿🔬 Blackhole (deep)",
    "`code:` → 💻 Code help",
    "`e:` → 🧠 Explain (ELI5)",
    "`as [char]:` → 🎭 Character",
    "`sum:` → 📝 Summarize",
    "`p:` → 🤝🏻 Partner chat",
    "",
    "━━━━━━━━━━━━━━━━━━━━━━",
    "",
    "💖 *Thank you for using StarzAI!*",
  ].join("\n");
}

// Partner setup helpers
function buildPartnerSetupMessage(partner) {
  if (!partner) {
    return [
      "🤝🏻 *Create Your AI Partner*",
      "",
      "Set up a personalized AI companion!",
      "Tap the buttons below to configure:",
      "",
      "⬜ *Name* - Not set",
      "⬜ *Personality* - Not set",
      "⬜ *Background* - Not set",
      "⬜ *Style* - Not set",
      "",
      "_Tap a button to set each field_",
    ].join("\n");
  }
  
  const status = partner.active ? "🟢 Active" : "⚪ Inactive";
  const chatCount = getPartnerChatHistory(partner.userId || 0)?.length || 0;
  
  const nameStatus = partner.name ? `✅ *Name:* ${partner.name}` : "⬜ *Name* - Not set";
  const persStatus = partner.personality ? `✅ *Personality:* ${partner.personality.slice(0, 40)}${partner.personality.length > 40 ? "..." : ""}` : "⬜ *Personality* - Not set";
  const bgStatus = partner.background ? `✅ *Background:* ${partner.background.slice(0, 40)}${partner.background.length > 40 ? "..." : ""}` : "⬜ *Background* - Not set";
  const styleStatus = partner.style ? `✅ *Style:* ${partner.style.slice(0, 40)}${partner.style.length > 40 ? "..." : ""}` : "⬜ *Style* - Not set";
  
  return [
    `🤝🏻 *Your AI Partner* ${status}`,
    "",
    nameStatus,
    persStatus,
    bgStatus,
    styleStatus,
    "",
    `💬 *Chat history:* ${chatCount} messages`,
    "",
    "_Tap buttons to edit or start chatting_",
  ].join("\n");
}

function buildPartnerKeyboard(partner) {
  const kb = new InlineKeyboard();
  
  // Setup buttons row 1
  kb.text(partner?.name ? `✏️ Name` : `➕ Name`, "partner_set_name")
    .text(partner?.personality ? `✏️ Personality` : `➕ Personality`, "partner_set_personality");
  kb.row();
  
  // Setup buttons row 2
  kb.text(partner?.background ? `✏️ Background` : `➕ Background`, "partner_set_background")
    .text(partner?.style ? `✏️ Style` : `➕ Style`, "partner_set_style");
  kb.row();
  
  // Action buttons
  if (partner?.name) {
    kb.text(partner?.active ? "⏹ Stop Chat" : "💬 Start Chat", partner?.active ? "partner_stop" : "partner_chat");
    kb.text("🗑 Clear Chat", "partner_clearchat");
    kb.row();
    kb.text("❌ Delete Partner", "partner_delete");
    kb.row();
  }
  
  // Add back to main menu button
  kb.text("« Back to Menu", "menu_back");
  
  return kb;
}

function inlineAnswerKeyboard(key) {
  const item = inlineCache.get(key);
  const mode = item?.mode || "default";
  const isBlackhole = mode === "blackhole";
  const isQuark = mode === "quark";
  const isSummarize = mode === "summarize";
  const isExplain = mode === "explain";
  const isCode = mode === "code";
  const isCompleted = Boolean(item?.completed);

  const user = item?.userId ? getUserRecord(item.userId) : null;
  const tier = user?.tier || "free";
  const isUltraUser = tier === "ultra";
  const isPremiumUser = tier === "premium";

  const originalAnswer = item?.originalAnswer;
  const hasOriginal = typeof originalAnswer === "string" && originalAnswer.length > 0;
  const transformed = hasOriginal && item?.answer !== originalAnswer;

  const shortCount = typeof item?.shortCount === "number" ? item.shortCount : 0;
  const longCount = typeof item?.longCount === "number" ? item.longCount : 0;
  const transformsUsed = typeof item?.transformsUsed === "number" ? item.transformsUsed : 0;
  const shortLongLocked = !!item?.shortLongLocked;

  // Regen limits per tier (per answer)
  const regenCount = typeof item?.regenCount === "number" ? item.regenCount : 0;
  let maxRegen = 1;
  if (isUltraUser) maxRegen = 3;
  else if (isPremiumUser) maxRegen = 2;
  const canRegen = regenCount < maxRegen;

  let canShort = false;
  let canLong = false;

  if (isUltraUser) {
    // Ultra: up to 2 Shorter and 2 Longer per answer
    canShort = shortCount < 2;
    canLong = longCount < 2;
  } else if (isPremiumUser) {
    // Premium: up to 2 transforms total (any combination)
    const remaining = Math.max(0, 2 - transformsUsed);
    canShort = remaining > 0;
    canLong = remaining > 0;
  } else {
    // Free: 1 transform total per answer
    canShort = !shortLongLocked && transformsUsed === 0;
    canLong = !shortLongLocked && transformsUsed === 0;
  }

  const showRevert = hasOriginal && transformed;

  // Ultra Summary results themselves: special, simpler controls
  if (isSummarize) {
    const kb = new InlineKeyboard().switchInlineCurrent("💬 Reply", `c:${key}: `);
    if (canRegen) {
      kb.text("🔁 Regen", `inl_regen:${key}`);
    }

    kb.row();
    if (canShort) kb.text("✂️ More concise", `inl_short:${key}`);
    if (canLong) kb.text("📚 More detail", `inl_long:${key}`);
    if (showRevert) {
      if (!canShort && !canLong) kb.row();

