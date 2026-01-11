/**
 * utils/keyboards.js
 * Auto-extracted from index.js
 */

// =====================
// SETTINGS MENU KEYBOARDS
// Lines 4156-4289 from original index.js
// =====================

// =====================
// SETTINGS MENU KEYBOARDS (for editable inline message)
// =====================

// Main settings menu - shows model categories
function settingsMainKeyboard(userId) {
  const kb = new InlineKeyboard();
  const user = getUserRecord(userId);
  const tier = user?.tier || "free";
  
  kb.text("🆓 Free Models", "setmenu:free").row();
  
  if (tier === "premium" || tier === "ultra") {
    kb.text("⭐ Premium Models", "setmenu:premium").row();
  }
  
  if (tier === "ultra") {
    kb.text("💎 Ultra Models", "setmenu:ultra").row();
  }
  
  kb.text("❌ Close", "setmenu:close");
  
  return kb;
}

// Category submenu - shows models in a category with pagination (4 per page)
function settingsCategoryKeyboard(category, userId, currentModel, page = 0) {
  const kb = new InlineKeyboard();
  const user = getUserRecord(userId);
  const tier = user?.tier || "free";
  
  let models = [];
  if (category === "free") models = [...FREE_MODELS, ...GITHUB_FREE_MODELS];
  else if (category === "premium" && (tier === "premium" || tier === "ultra")) models = [...PREMIUM_MODELS, ...GITHUB_PREMIUM_MODELS];
  else if (category === "ultra" && tier === "ultra") models = [...ULTRA_MODELS, ...GITHUB_ULTRA_MODELS];
  
  const MODELS_PER_PAGE = 4;
  const totalPages = Math.ceil(models.length / MODELS_PER_PAGE);
  const startIdx = page * MODELS_PER_PAGE;
  const pageModels = models.slice(startIdx, startIdx + MODELS_PER_PAGE);
  
  // Show models (4 per page, 1 per row for clean mobile display)
  pageModels.forEach((m) => {
    const mShort = m.split("/").pop();
    const isSelected = m === currentModel;
    const label = isSelected ? `✅ ${mShort}` : mShort;
    kb.text(label, `setmodel:${m}`).row();
  });
  
  // Pagination row
  if (totalPages > 1) {
    const navRow = [];
    if (page > 0) {
      kb.text("◀️", `setpage:${category}:${page - 1}`);
    }
    kb.text(`${page + 1}/${totalPages}`, "noop");
    if (page < totalPages - 1) {
      kb.text("▶️", `setpage:${category}:${page + 1}`);
    }
    kb.row();
  }
  
  kb.text("⬅️ Back", "setmenu:back");
  
  return kb;
}



// Inline settings keyboard - shows model categories
function inlineSettingsCategoryKeyboard(sessionKey, userId) {
  const kb = new InlineKeyboard();
  const user = getUserRecord(userId);
  const tier = user?.tier || "free";
  
  // Show categories based on user tier
  kb.text("🆓 Free Models", `iset_cat:free:${sessionKey}`);
  kb.row();
  
  if (tier === "premium" || tier === "ultra") {
    kb.text("⭐ Premium Models", `iset_cat:premium:${sessionKey}`);
    kb.row();
  }
  
  if (tier === "ultra") {
    kb.text("💎 Ultra Models", `iset_cat:ultra:${sessionKey}`);
    kb.row();
  }
  
  return kb;
}

// Inline settings - model list for a category with pagination (4 per page)
function inlineSettingsModelKeyboard(category, sessionKey, userId, page = 0) {
  const kb = new InlineKeyboard();
  const user = getUserRecord(userId);
  const currentModel = user?.model || "";
  
  let models = [];
  if (category === "free") models = [...FREE_MODELS, ...GITHUB_FREE_MODELS];
  else if (category === "premium") models = [...PREMIUM_MODELS, ...GITHUB_PREMIUM_MODELS];
  else if (category === "ultra") models = [...ULTRA_MODELS, ...GITHUB_ULTRA_MODELS];
  
  const MODELS_PER_PAGE = 4;
  const totalPages = Math.ceil(models.length / MODELS_PER_PAGE);
  const startIdx = page * MODELS_PER_PAGE;
  const pageModels = models.slice(startIdx, startIdx + MODELS_PER_PAGE);
  
  // Show models (4 per page, 1 per row for clean mobile display)
  pageModels.forEach((m) => {
    const mShort = m.split("/").pop();
    const isSelected = m === currentModel;
    const label = isSelected ? `✅ ${mShort}` : mShort;
    kb.text(label, `iset_model:${m}:${sessionKey}`).row();
  });
  
  // Pagination row
  if (totalPages > 1) {
    if (page > 0) {
      kb.text("◀️", `iset_page:${category}:${page - 1}:${sessionKey}`);
    }
    kb.text(`${page + 1}/${totalPages}`, "noop");
    if (page < totalPages - 1) {
      kb.text("▶️", `iset_page:${category}:${page + 1}:${sessionKey}`);
    }
    kb.row();
  }
  
  // Back button
  kb.text("← Back", `iset_back:${sessionKey}`);
  
  return kb;
}


