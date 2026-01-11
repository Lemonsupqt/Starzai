/**
 * utils/keyboards.js
 * Auto-extracted from index.js
 */

// =====================
// SETTINGS MENU KEYBOARDS
// Lines 4156-4289 from original index.js
// =====================

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



// =====================
// SETTINGS MENU KEYBOARDS (for editable inline message)
// =====================

// Main settings menu - shows model categories
function settingsMainKeyboard(userId) {
  const kb = new InlineKeyboard();
  const user = getUserRecord(userId);
  const tier = user?.tier || "free";

