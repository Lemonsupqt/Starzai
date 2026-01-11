/**
 * utils/ui.js
 * Auto-extracted from index.js
 */

// =====================
// UI HELPERS + INLINE CHAT UI
// Lines 3751-4155 from original index.js
// =====================

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
      kb.text("↩️ Revert", `inl_revert:${key}`);
    }
    return kb;
  }

  const kb = new InlineKeyboard().switchInlineCurrent("💬 Reply", `c:${key}: `);
  if (canRegen) {
    kb.text("🔁 Regen", `inl_regen:${key}`);
  }

  // Shorter/Longer + Revert row (all non-summary modes)
  kb.row();
  if (canShort) kb.text("✂️ Shorter", `inl_short:${key}`);
  if (canLong) kb.text("📈 Longer", `inl_long:${key}`);
  if (showRevert) {
    if (!canShort && !canLong) kb.row();
    kb.text("↩️ Revert", `inl_revert:${key}`);
  }

  // Quark: no Continue or Ultra Summary (already one-shot)
  if (isQuark) {
    return kb;
  }

  // Continue / Ultra Summary buttons (mode-dependent)
  if (isBlackhole) {
    // For Blackhole, use inline mode so continuation/summary become new messages.
    if (!isCompleted) {
      kb.row().switchInlineCurrent("➡️ Continue", `bhcont ${key}`);
    } else if (isUltraUser) {
      // Once full analysis is done, offer Ultra Summary as a new inline message for Ultra users.
      kb.row().switchInlineCurrent("🧾 Ultra Summary", `ultrasum ${key}`);
    }
  } else if (isExplain || isCode) {
    // Explain & Code: callback-based continuation while incomplete.
    if (!isCompleted) {
      kb.row().text("➡️ Continue", `inl_cont:${key}`);
    } else if (isUltraUser) {
      // When fully revealed, provide Ultra Summary as a new inline message for Ultra users.
      kb.row().switchInlineCurrent("🧾 Ultra Summary", `ultrasum ${key}`);
    }
  } else {
    // Other modes (quick, research, chat, etc.): standard Continue while available.
    if (!isCompleted) {
      kb.row().text("➡️ Continue", `inl_cont:${key}`);
    }
  }

  return kb;
}

// =====================
// INLINE CHAT UI
// =====================
function formatInlineChatDisplay(session, userId) {
  const u = ensureUser(userId);
  const history = session.history || [];
  const model = session.model || ensureChosenModelValid(userId);
  
  let display = `🤖 *StarzAI Chat*\n`;
  display += `📊 Model: \`${model}\`\n`;
  display += `━━━━━━━━━━━━━━━\n\n`;
  
  if (history.length === 0) {
    display += `_No messages yet._\n_Type your message to start chatting!_`;
  } else {
    // Show last 4 exchanges (8 messages)
    const recentHistory = history.slice(-8);
    for (const msg of recentHistory) {
      if (msg.role === "user") {
        display += `👤 *You:* ${msg.content.slice(0, 200)}${msg.content.length > 200 ? "..." : ""}\n\n`;
      } else {
        display += `🤖 *AI:* ${msg.content.slice(0, 400)}${msg.content.length > 400 ? "..." : ""}\n\n`;
      }
    }
  }
  
  display += `\n━━━━━━━━━━━━━━━`;
  return display.slice(0, 3800);
}

function inlineChatKeyboard(sessionKey, hasHistory = false) {
  const kb = new InlineKeyboard();
  
  // Main action row
  kb.text("💬 Reply", `ichat_reply:${sessionKey}`)
    .text("🔄 Regen", `ichat_regen:${sessionKey}`);
  kb.row();
  
  // Secondary actions
  kb.text("🗑️ Clear", `ichat_clear:${sessionKey}`)
    .text("⚙️ Model", `ichat_model:${sessionKey}`);
  kb.row();
  
  // Switch inline to continue conversation
  kb.switchInlineCurrentChat("✏️ Type message...", "chat:");
  
  return kb;
}

function inlineModelSelectKeyboard(sessionKey, userId) {
  const u = ensureUser(userId);
  const session = getInlineSession(userId);
  const currentModel = session.model;
  const allowed = allModelsForTier(u.tier);
  
  const kb = new InlineKeyboard();
  
  // Show up to 6 models
  const models = allowed.slice(0, 6);
  for (let i = 0; i < models.length; i++) {
    const m = models[i];
    const isSelected = m === currentModel;
    kb.text(`${isSelected ? "✅ " : ""}${m.split("/").pop()}`, `ichat_setmodel:${sessionKey}:${m}`);
    if (i % 2 === 1) kb.row();
  }
  if (models.length % 2 === 1) kb.row();
  
  kb.text("« Back", `ichat_back:${sessionKey}`);
  
  return kb;
}




