/**
 * handlers/webapp.js
 * Auto-extracted from index.js
 */

// =====================
// WEBAPP DATA HANDLER
// Lines 13842-13969 from original index.js
// =====================

      });
    }
    
    await ctx.deleteMessage();
    
  } catch (error) {
    await ctx.editMessageText(
      `❌ Error: ${escapeHTML(error.message)}`,
      { parse_mode: 'HTML' }
    );
  }
});

// =====================
// CALLBACKS: UNIFIED MENU NAVIGATION
// =====================

// Back to main menu
bot.callbackQuery("menu_back", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  await ctx.answerCallbackQuery();
  
  try {
    await ctx.editMessageText(buildMainMenuMessage(ctx.from.id), {
      parse_mode: "Markdown",
      reply_markup: mainMenuKeyboard(ctx.from.id)
    });
  } catch (e) {
    // If edit fails (message unchanged), ignore
  }
});

// Features menu
bot.callbackQuery("menu_features", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  await ctx.answerCallbackQuery();
  
  const featuresText = [
    "🌟 *StarzAI Features*",
    "",
    "⚡ *AI Modes (Inline)*",
    "• ⭐ *Quark* (`q:`) - Lightning fast answers",
    "• 🗿🔬 *Blackhole* (`b:`) - Deep research & analysis",
    "• 💻 *Code* (`code:`) - Programming help & snippets",
    "• 🧠 *Explain* (`e:`) - Simple ELI5 explanations",
    "• 🎭 *Character* (`as:`) - Roleplay as any character",
    "• 📝 *Summarize* (`sum:`) - Condense long text",
    "",
    "🤝🏻 *AI Partner*",
    "Create your personalized AI companion!",
    "• Custom name, personality, background",
    "• Persistent chat memory",
    "• Works in DM and inline (`p:`)",
    "",
    "🎭 *Character Mode*",
    "Quick roleplay as existing characters!",
    "• `/char yoda` - Start as Yoda",
    "• `/char save yoda` - Save to favorites",
    "• `/char stop` - End character mode",
    "",
    "🎨 *AI Image Generator*",
    "Create stunning images from text!",
    "• `/img prompt` - Fast turbo model",
    "• `/img2 prompt` - Flux model (alt style)",
    "• `/imagine prompt` - Free alternative",
    "• Or just say: \"generate image of...\" or \"draw...\"",
    "• `/imgset` - Set default ratio & safe mode",
    "",
    "📊 *Stats*",
    "• /stats - Your usage statistics",
    "",
    "📋 *Task Manager*",
    "Advanced to-do list with priorities!",
    "• `/todo` - View your tasks",
    "• `/todo add task` - Quick add",
    "• Categories, due dates, streaks",
  ].join("\n");
  
  const kb = new InlineKeyboard()
    .text("📋 Tasks", "todo_list")
    .text("🎨 Image Settings", "menu_imgset")
    .row()
    .text("💳 Plans & Benefits", "menu_plans")
    .text("« Back to Menu", "menu_back");
  
  try {
    await ctx.editMessageText(featuresText, {
      parse_mode: "Markdown",
      reply_markup: kb
    });
  } catch (e) {
    // If edit fails, ignore
  }
});

// Image Settings menu (from Features)
bot.callbackQuery("menu_imgset", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  await ctx.answerCallbackQuery();
  
  const u = ctx.from;
  if (!u?.id) return;
  
  const user = ensureUser(u.id, u);
  const isOwnerUser = OWNER_IDS.has(String(u.id));
  
  const currentRatio = user.imagePrefs?.defaultRatio || "1:1";
  const currentConfig = IMG_ASPECT_RATIOS[currentRatio];
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

