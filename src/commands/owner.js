/**
 * commands/owner.js
 * Auto-extracted from index.js
 */

// =====================
// OWNER COMMANDS
// Lines 11234-12596 from original index.js
// =====================

// =====================
// OWNER COMMANDS
// =====================

// Bot status command
async function sendOwnerStatus(ctx) {
  const totalUsers = Object.keys(usersDb.users).length;
  const usersByTier = { free: 0, premium: 0, ultra: 0 };
  let totalMessages = 0;
  let totalInline = 0;
  let activeToday = 0;
  let activeWeek = 0;
  let bannedCount = 0;
  
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const weekMs = 7 * dayMs;
  
  for (const [, user] of Object.entries(usersDb.users)) {
    usersByTier[user.tier] = (usersByTier[user.tier] || 0) + 1;
    if (user.banned) {
      bannedCount++;
    }
    if (user.stats) {
      totalMessages += user.stats.totalMessages || 0;
      totalInline += user.stats.totalInlineQueries || 0;
      
      const lastActive = new Date(user.stats.lastActive).getTime();
      if (now - lastActive < dayMs) activeToday++;
      if (now - lastActive < weekMs) activeWeek++;
    }
  }
  
  const inlineSessions = Object.keys(inlineSessionsDb.sessions).length;
  const uptime = process.uptime();
  const uptimeStr = `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`;

  // Derive per-tier cooldowns from the same helper used by enforceCommandCooldown
  const freeCooldown = getCommandCooldownSecondsForTier("free");
  const premiumCooldown = getCommandCooldownSecondsForTier("premium");
  const ultraCooldown = getCommandCooldownSecondsForTier("ultra");
  const ownerCooldown = getCommandCooldownSecondsForTier("owner");

  const lines = [
    `📊 *Bot Status*`,
    ``,
    `⏱ *Uptime:* ${uptimeStr}`,
    `🖥 *Memory:* ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
    ``,
    `👥 *Users*`,
    `• Total: ${totalUsers}`,
    `• Free: ${usersByTier.free}`,
    `• Premium: ${usersByTier.premium}`,
    `• Ultra: ${usersByTier.ultra}`,
    `• Banned: ${bannedCount}`,
    ``,
    `💬 *Messages*`,
    `• Total messages: ${totalMessages}`,
    `• Inline queries: ${totalInline}`,
    `• Active today: ${activeToday}`,
    `• Active last 7 days: ${activeWeek}`,
    ``,
    `💾 *Inline Sessions:* ${inlineSessions}`,
    ``,
    `⚙️ *Rate limiting*`,
    `• Global: ${RATE_LIMIT_PER_MINUTE}/min`,
    `• Command cooldowns:`,
    `  - Free: ${freeCooldown}s`,
    `  - Premium: ${premiumCooldown}s`,
    `  - Ultra: ${ultraCooldown}s`,
    `  - Owners: ${ownerCooldown > 0 ? ownerCooldown + "s" : "none"}`,
  ];
  
  // Add Dev Status button for detailed API diagnostics
  const keyboard = new InlineKeyboard()
    .text("🔧 Dev Status", "dev_status");
  
  await ctx.reply(lines.join("\n"), { 
    parse_mode: "Markdown",
    reply_markup: keyboard
  });
}

bot.command("status", async (ctx) => {
  if (!isOwner(ctx)) return ctx.reply("🚫 Owner only.");
  await sendOwnerStatus(ctx);
});

// Alias: /gstat (global stats)
bot.command("gstat", async (ctx) => {
  if (!isOwner(ctx)) return ctx.reply("🚫 Owner only.");
  await sendOwnerStatus(ctx);
});

// Dev Status callback - detailed API diagnostics (owner only)
bot.callbackQuery("dev_status", async (ctx) => {
  const userId = ctx.from?.id;
  if (!OWNER_IDS.has(String(userId))) {
    return ctx.answerCallbackQuery({ text: "🚫 Owner only", show_alert: true });
  }
  
  await ctx.answerCallbackQuery({ text: "🔧 Loading diagnostics..." });
  
  try {
    // Get LLM provider stats
    const llmStats = getProviderStats();
  
  // Get DeAPI stats with balances
  const deapiStats = deapiKeyManager.hasKeys() 
    ? await deapiKeyManager.getStatsWithBalances() 
    : deapiKeyManager.getStats();
  
  const healthEmoji = {
    'excellent': '🟢',
    'good': '🟡',
    'degraded': '🟠',
    'critical': '🔴',
    'unknown': '⚪'
  };
  
  const lines = [
    `🔧 *Dev Status - API Diagnostics*`,
    ``,
    `🤖 *LLM Providers*`,
  ];
  
  // GitHub Models stats
  const github = llmStats.github;
  if (github) {
    lines.push(``);
    lines.push(`*GitHub Models* ${healthEmoji[github.health] || '⚪'}`);
    lines.push(`• Status: ${github.enabled ? '✅ Enabled' : '❌ Disabled'}`);
    lines.push(`• Calls: ${github.calls} (${github.successRate}% success)`);
    lines.push(`• Tokens: ${github.totalTokens.toLocaleString()}`);
    if (github.avgResponseTime > 0) {
      lines.push(`• Avg response: ${github.avgResponseTime}ms`);
    }
    if (github.lastUsed) {
      lines.push(`• Last used: ${new Date(github.lastUsed).toLocaleTimeString()}`);
    }
    if (github.lastError && github.health !== 'excellent') {
      lines.push(`• Last error: \`${github.lastError.slice(0, 50)}\``);
    }
  }
  
  // MegaLLM stats
  const megallm = llmStats.megallm;
  if (megallm) {
    lines.push(``);
    lines.push(`*MegaLLM* ${healthEmoji[megallm.health] || '⚪'}`);
    lines.push(`• Status: ${megallm.enabled ? '✅ Enabled' : '❌ Disabled'}`);
    lines.push(`• Calls: ${megallm.calls} (${megallm.successRate}% success)`);
    lines.push(`• Tokens: ${megallm.totalTokens.toLocaleString()}`);
    if (megallm.avgResponseTime > 0) {
      lines.push(`• Avg response: ${megallm.avgResponseTime}ms`);
    }
    if (megallm.lastUsed) {
      lines.push(`• Last used: ${new Date(megallm.lastUsed).toLocaleTimeString()}`);
    }
    if (megallm.lastError && megallm.health !== 'excellent') {
      lines.push(`• Last error: \`${megallm.lastError.slice(0, 50)}\``);
    }
  }
  
  // DeAPI Image Generation stats
  if (deapiStats.totalKeys > 0) {
    let totalBalance = 0;
    let balanceCount = 0;
    for (const key of deapiStats.keys) {
      if (key.balance !== null && key.balance !== undefined) {
        totalBalance += parseFloat(key.balance) || 0;
        balanceCount++;
      }
    }
    
    const overallHealth = deapiStats.disabledKeys === 0 ? 'excellent' : 
      (deapiStats.activeKeys > 0 ? 'degraded' : 'critical');
    
    lines.push(``);
    lines.push(`🎨 *Image Generation* ${healthEmoji[overallHealth]}`);
    lines.push(`• Keys: ${deapiStats.activeKeys}/${deapiStats.totalKeys} active`);
    if (balanceCount > 0) {
      lines.push(`• Total credits: 💰${totalBalance.toFixed(2)}`);
    }
    lines.push(`• Total generations: ${deapiKeyManager.totalImageGenerations}`);
    lines.push(`• Session calls: ${deapiStats.totalCalls} (${deapiStats.totalCalls > 0 ? Math.round((deapiStats.totalSuccesses / deapiStats.totalCalls) * 100) : 100}% success)`);
    
    // Individual key details
    if (deapiStats.keys.length > 0) {
      lines.push(``);
      lines.push(`*Key Details:*`);
      for (const key of deapiStats.keys) {
        const status = key.disabled ? '🔴' : '🟢';
        const balanceStr = key.balance !== null && key.balance !== undefined 
          ? `💰${parseFloat(key.balance).toFixed(2)}` 
          : '';
        lines.push(`${status} \`${key.id}\` ${balanceStr}`);
        lines.push(`   ${key.successRate}% • ${key.calls} calls`);
        if (key.disabled && key.disabledUntil) {
          const remaining = Math.ceil((key.disabledUntil - Date.now()) / 1000 / 60);
          lines.push(`   ⏳ Re-enables in ${remaining}m`);
        }
      }
    }
  } else {
    lines.push(``);
    lines.push(`🎨 *Image Generation:* ❌ Not configured`);
  }
  
  // System health summary
  const totalProviders = Object.keys(llmStats).length + (deapiStats.totalKeys > 0 ? 1 : 0);
  const healthyProviders = Object.values(llmStats).filter(s => s.enabled && (s.health === 'excellent' || s.health === 'good')).length
    + (deapiStats.activeKeys > 0 ? 1 : 0);
  
  lines.push(``);
  lines.push(`📊 *System Health:* ${healthyProviders}/${totalProviders} services healthy`);
  
  // Back button
  const keyboard = new InlineKeyboard()
    .text("⬅️ Back to Status", "back_to_status");
  
  try {
    await ctx.editMessageText(lines.join("\n"), { 
      parse_mode: "Markdown",
      reply_markup: keyboard
    });
  } catch (e) {
    // If edit fails, send new message
    await ctx.reply(lines.join("\n"), { 
      parse_mode: "Markdown",
      reply_markup: keyboard
    });
  }
  } catch (error) {
    console.error("Dev status error:", error);
    try {
      await ctx.reply(
        "❌ *Error loading diagnostics*\n\n" +
        `\`${error.message?.slice(0, 100) || 'Unknown error'}\`\n\n` +
        "Please try again.",
        { parse_mode: "Markdown" }
      );
    } catch (e) {
      // Ignore
    }
  }
});

// Back to status callback
bot.callbackQuery("back_to_status", async (ctx) => {
  const userId = ctx.from?.id;
  if (!OWNER_IDS.has(String(userId))) {
    return ctx.answerCallbackQuery({ text: "🚫 Owner only", show_alert: true });
  }
  
  await ctx.answerCallbackQuery();
  
  // Rebuild status message
  const totalUsers = Object.keys(usersDb.users).length;
  const usersByTier = { free: 0, premium: 0, ultra: 0 };
  let totalMessages = 0;
  let totalInline = 0;
  let activeToday = 0;
  let activeWeek = 0;
  let bannedCount = 0;
  
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const weekMs = 7 * dayMs;
  
  for (const [, user] of Object.entries(usersDb.users)) {
    usersByTier[user.tier] = (usersByTier[user.tier] || 0) + 1;
    if (user.banned) bannedCount++;
    if (user.stats) {
      totalMessages += user.stats.totalMessages || 0;
      totalInline += user.stats.totalInlineQueries || 0;
      const lastActive = new Date(user.stats.lastActive).getTime();
      if (now - lastActive < dayMs) activeToday++;
      if (now - lastActive < weekMs) activeWeek++;
    }
  }
  
  const inlineSessions = Object.keys(inlineSessionsDb.sessions).length;
  const uptime = process.uptime();
  const uptimeStr = `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`;
  const freeCooldown = getCommandCooldownSecondsForTier("free");
  const premiumCooldown = getCommandCooldownSecondsForTier("premium");
  const ultraCooldown = getCommandCooldownSecondsForTier("ultra");
  const ownerCooldown = getCommandCooldownSecondsForTier("owner");

  const lines = [
    `📊 *Bot Status*`,
    ``,
    `⏱ *Uptime:* ${uptimeStr}`,
    `🖥 *Memory:* ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
    ``,
    `👥 *Users*`,
    `• Total: ${totalUsers}`,
    `• Free: ${usersByTier.free}`,
    `• Premium: ${usersByTier.premium}`,
    `• Ultra: ${usersByTier.ultra}`,
    `• Banned: ${bannedCount}`,
    ``,
    `💬 *Messages*`,
    `• Total messages: ${totalMessages}`,
    `• Inline queries: ${totalInline}`,
    `• Active today: ${activeToday}`,
    `• Active last 7 days: ${activeWeek}`,
    ``,
    `💾 *Inline Sessions:* ${inlineSessions}`,
    ``,
    `⚙️ *Rate limiting*`,
    `• Global: ${RATE_LIMIT_PER_MINUTE}/min`,
    `• Command cooldowns:`,
    `  - Free: ${freeCooldown}s`,
    `  - Premium: ${premiumCooldown}s`,
    `  - Ultra: ${ultraCooldown}s`,
    `  - Owners: ${ownerCooldown > 0 ? ownerCooldown + "s" : "none"}`,
  ];
  
  const keyboard = new InlineKeyboard()
    .text("🔧 Dev Status", "dev_status");
  
  try {
    await ctx.editMessageText(lines.join("\n"), { 
      parse_mode: "Markdown",
      reply_markup: keyboard
    });
  } catch (e) {
    await ctx.reply(lines.join("\n"), { 
      parse_mode: "Markdown",
      reply_markup: keyboard
    });
  }
});

// User info command
bot.command("info", async (ctx) => {
  if (!isOwner(ctx)) return ctx.reply("🚫 Owner only.");
  
  const args = (ctx.message?.text || "").split(/\s+/).slice(1);
  if (args.length < 1) return ctx.reply("Usage: /info &lt;userId&gt;");
  
  const [targetId] = args;
  const user = getUserRecord(targetId);
  
  if (!user) {
    return ctx.reply(`❌ User ${targetId} not found.`);
  }
  
  const stats = user.stats || {};
  const inlineSession = inlineSessionsDb.sessions[targetId];
  const now = Date.now();
  
  // Use HTML to avoid Markdown parsing issues with usernames
  const lines = [
    `👤 <b>User Info</b>`,
    ``,
    `🆔 ID: <code>${targetId}</code>`,
    `📛 Username: ${user.username ? "@" + escapeHTML(user.username) : "<i>not set</i>"}`,
    `👋 Name: ${escapeHTML(user.firstName) || "<i>not set</i>"}`,
    ``,
    `🎫 <b>Tier:</b> ${user.tier?.toUpperCase() || "FREE"}`,
    `🤖 <b>Model:</b> <code>${escapeHTML(user.model) || "default"}</code>`,
    `🚫 <b>Banned:</b> ${user.banned ? "YES" : "no"}`,
  ];

  if (user.banned) {
    if (user.bannedAt) {
      lines.push(`⏰ <b>Banned at:</b> ${new Date(user.bannedAt).toLocaleString()}`);
    }
    if (user.bannedBy) {
      lines.push(`👮 <b>Banned by:</b> <code>${escapeHTML(String(user.bannedBy))}</code>`);
    }
    if (user.banReason) {
      lines.push(`📄 <b>Reason:</b> ${escapeHTML(user.banReason)}`);
    }
    lines.push(``);
  }

  if (user.mute) {
    const m = user.mute;
    const scope = m.scope || "all";
    const until = m.until ? new Date(m.until).toLocaleString() : "unknown";
    const active = !m.until || now <= m.until;
    const status = active ? "ACTIVE" : "expired";
    lines.push(
      `🔇 <b>Mute:</b> ${status}`,
      `• Scope: ${escapeHTML(scope)}`,
      `• Until: ${escapeHTML(until)}`
    );
    if (m.reason) {
      lines.push(`• Reason: ${escapeHTML(m.reason)}`);
    }
    if (m.mutedBy) {
      lines.push(`• Muted by: <code>${escapeHTML(String(m.mutedBy))}</code>`);
    }
    lines.push(``);
  }

  if (Array.isArray(user.warnings) && user.warnings.length > 0) {
    const count = user.warnings.length;
    const last = user.warnings[user.warnings.length - 1] || {};
    lines.push(`⚠️ <b>Warnings:</b> ${count}`);
    if (last.reason) {
      lines.push(`• Last reason: ${escapeHTML(last.reason)}`);
    }
    if (last.at) {
      lines.push(`• Last at: ${new Date(last.at).toLocaleString()}`);
    }
    if (last.by) {
      lines.push(`• Last by: <code>${escapeHTML(String(last.by))}</code>`);
    }
    lines.push(``);
  }

  lines.push(
    `📊 &lt;b&gt;Usage Stats&lt;/b&gt;`,
    `• Messages: ${stats.totalMessages || 0}`,
    `• Inline queries: ${stats.totalInlineQueries || 0}`,
    `• Last model: ${escapeHTML(stats.lastModel) || "unknown"}`,
    `• Last active: ${stats.lastActive ? new Date(stats.lastActive).toLocaleString() : "unknown"}`,
    ``,
    `💬 &lt;b&gt;Inline Session&lt;/b&gt;`,
    `• History: ${inlineSession?.history?.length || 0} messages`,
    `• Model: ${escapeHTML(inlineSession?.model) || "none"}`,
    ``,
    `📅 Registered: ${user.registeredAt ? new Date(user.registeredAt).toLocaleString() : "unknown"}`,
    `🔑 Models: ${allModelsForTier(user.tier || "free").length} (${user.tier || "free"} tier)`,
  );
  
  await ctx.reply(lines.join("\n"), { parse_mode: "HTML" });
});

bot.command("grant", async (ctx) => {
  if (!isOwner(ctx)) return ctx.reply("🚫 Owner only.");

  const args = (ctx.message?.text || "").split(/\s+/).slice(1);
  if (args.length < 2) return ctx.reply("Usage: /grant <userId> <free|premium|ultra>");

  const [targetId, tierArg] = args;
  const tier = tierArg.toLowerCase();
  if (!["free", "premium", "ultra"].includes(tier)) {
    return ctx.reply("⚠️ Tier must be free, premium, or ultra.");
  }

  const rec = ensureUser(targetId);
  const currentTier = rec.tier || "free";
  
  // Check if user already has this tier
  if (currentTier === tier) {
    const tierEmoji = tier === "ultra" ? "💎" : tier === "premium" ? "⭐" : "🆓";
    return ctx.reply(`${tierEmoji} User ${targetId} is already ${tier.toUpperCase()}.`);
  }
  
  const oldTier = currentTier;
  const isUpgrade = ["free", "premium", "ultra"].indexOf(tier) > ["free", "premium", "ultra"].indexOf(oldTier);
  
  rec.tier = tier;
  rec.role = tier;
  saveUsers();

  const tierEmoji = tier === "ultra" ? "💎" : tier === "premium" ? "⭐" : "🆓";
  const arrow = isUpgrade ? "⬆️" : "⬇️";
  await ctx.reply(`${arrow} User ${targetId}: ${oldTier.toUpperCase()} → ${tierEmoji} ${tier.toUpperCase()}`);
  
  // Send congratulations message to the user if upgraded
  if (isUpgrade && (tier === "premium" || tier === "ultra")) {
    try {
      const congratsMsg = tier === "ultra" 
        ? [
            `🎉 *Congratulations!* 🎉`,
            ``,
            `You've been upgraded to 💎 *ULTRA* tier!`,
            ``,
            `✨ *New features unlocked:*`,
            `• Access to ALL models including GPT-5, Gemini 2.5 Pro, Grok 4.1`,
            `• Fastest response times`,
            `• Priority support`,
            ``,
            `Use /model to explore your new models!`,
          ].join("\n")
        : [
            `🎉 *Congratulations!* 🎉`,
            ``,
            `You've been upgraded to ⭐ *PREMIUM* tier!`,
            ``,
            `✨ *New features unlocked:*`,
            `• Access to premium models like Claude, GLM, Mistral`,
            `• Better response quality`,
            `• Priority support`,
            ``,
            `Use /model to explore your new models!`,
          ].join("\n");
      
      await bot.api.sendMessage(targetId, congratsMsg, { parse_mode: "Markdown" });
      await ctx.reply(`✅ Congratulations message sent to user.`);
    } catch (e) {
      console.error("Failed to send congrats:", e.message);
      await ctx.reply(`⚠️ Could not send message to user (they may need to start the bot first).`);
    }
  }
});

bot.command("revoke", async (ctx) => {
  if (!isOwner(ctx)) return ctx.reply("Owner only.");

  const args = (ctx.message?.text || "").split(/\s+/).slice(1);
  if (args.length < 1) return ctx.reply("Usage: /revoke <userId>");

  const [targetId] = args;
  const rec = ensureUser(targetId);
  rec.tier = "free";
  rec.role = "free";
  saveUsers();

  await ctx.reply(`User ${targetId} reverted to free.`);
});

bot.command("allow", async (ctx) => {
  if (!isOwner(ctx)) return ctx.reply("Owner only.");

  const args = (ctx.message?.text || "").split(/\s+/).slice(1);
  if (args.length < 2) return ctx.reply("Usage: /allow <userId> <modelId>");

  const [targetId, modelId] = args;
  const rec = ensureUser(targetId);
  if (!rec.allowedModels.includes(modelId)) rec.allowedModels.push(modelId);
  saveUsers();

  await ctx.reply(`Allowed model ${modelId} for user ${targetId}.`);
});

bot.command("deny", async (ctx) => {
  if (!isOwner(ctx)) return ctx.reply("Owner only.");

  const args = (ctx.message?.text || "").split(/\s+/).slice(1);
  if (args.length < 2) return ctx.reply("Usage: /deny <userId> <modelId>");

  const [targetId, modelId] = args;
  const rec = ensureUser(targetId);
  rec.allowedModels = rec.allowedModels.filter((m) => m !== modelId);
  saveUsers();

  await ctx.reply(`Denied model ${modelId} for user ${targetId}.`);
});

bot.command("allowgroup", async (ctx) => {
  if (!isOwner(ctx)) return ctx.reply("🚫 Owner only.");

  const args = (ctx.message?.text || "").split(/\s+/).slice(1);
  if (args.length < 1) {
    return ctx.reply("Usage: /allowgroup <chatId> [note]");
  }

  const [chatIdRaw, ...noteParts] = args;
  const chatId = chatIdRaw.trim();
  const note = noteParts.join(" ").trim() || null;

  if (!chatId) {
    return ctx.reply("Usage: /allowgroup <chatId> [note]");
  }

  setGroupAuthorization(chatId, true, {
    note,
    addedBy: ctx.from?.id || null,
  });

  await ctx.reply(
    `✅ Group ${chatId} authorized.` + (note ? `\nNote: ${note}` : "")
  );
});

// Alias: /add <chatId> <note>  (owner-facing shorthand)
bot.command("add", async (ctx) => {
  if (!isOwner(ctx)) return ctx.reply("🚫 Owner only.");

  const args = (ctx.message?.text || "").split(/\s+/).slice(1);
  if (args.length < 1) {
    return ctx.reply("Usage: /add <chatId> [note]");
  }

  const [chatIdRaw, ...noteParts] = args;
  const chatId = chatIdRaw.trim();
  const note = noteParts.join(" ").trim() || null;

  if (!chatId) {
    return ctx.reply("Usage: /add <chatId> [note]");
  }

  setGroupAuthorization(chatId, true, {
    note,
    addedBy: ctx.from?.id || null,
  });

  await ctx.reply(
    `✅ Group ${chatId} authorized.` + (note ? `\nNote: ${note}` : "")
  );
});

bot.command("denygroup", async (ctx) => {
  if (!isOwner(ctx)) return ctx.reply("🚫 Owner only.");

  const args = (ctx.message?.text || "").split(/\s+/).slice(1);
  if (args.length < 1) {
    return ctx.reply("Usage: /denygroup <chatId> [reason]");
  }

  const [chatIdRaw, ...reasonParts] = args;
  const chatId = chatIdRaw.trim();
  const reason = reasonParts.join(" ").trim() || null;

  if (!chatId) {
    return ctx.reply("Usage: /denygroup <chatId> [reason]");
  }

  setGroupAuthorization(chatId, false, {
    note: reason,
    addedBy: ctx.from?.id || null,
  });

  await ctx.reply(
    `🚫 Group ${chatId} blocked.` + (reason ? `\nReason: ${reason}` : "")
  );
});

// Alias: /rem <chatId> <reason>  (owner-facing shorthand)
bot.command("rem", async (ctx) => {
  if (!isOwner(ctx)) return ctx.reply("🚫 Owner only.");

  const args = (ctx.message?.text || "").split(/\s+/).slice(1);
  if (args.length < 1) {
    return ctx.reply("Usage: /rem <chatId> [reason]");
  }

  const [chatIdRaw, ...reasonParts] = args;
  const chatId = chatIdRaw.trim();
  const reason = reasonParts.join(" ").trim() || null;

  if (!chatId) {
    return ctx.reply("Usage: /rem <chatId> [reason]");
  }

  setGroupAuthorization(chatId, false, {
    note: reason,
    addedBy: ctx.from?.id || null,
  });

  await ctx.reply(
    `🚫 Group ${chatId} blocked.` + (reason ? `\nReason: ${reason}` : "")
  );
});

bot.command("grouplist", async (ctx) => {
  if (!isOwner(ctx)) return ctx.reply("🚫 Owner only.");

  ensurePrefsGroups();
  const entries = Object.entries(prefsDb.groups || {});
  if (entries.length === 0) {
    return ctx.reply("No groups recorded yet.");
  }

  const max = 50;
  const lines = ["🏘 *Groups (first 50)*", ""];
  for (const [id, g] of entries.slice(0, max)) {
    const status = g.allowed ? "✅ allowed" : "🚫 blocked";
    const title = g.title ? escapeMarkdown(g.title) : "_no title_";
    const note = g.note ? ` — ${escapeMarkdown(g.note)}` : "";
    lines.push(`• \`${id}\` – ${title} (${status})${note}`);
  }
  if (entries.length > max) {
    lines.push("", `...and ${entries.length - max} more.`, "");
  }

  await ctx.reply(lines.join("\n"), { parse_mode: "Markdown" });
});

// Alias: /glist  (owner-facing shorthand)
bot.command("glist", async (ctx) => {
  if (!isOwner(ctx)) return ctx.reply("🚫 Owner only.");

  ensurePrefsGroups();
  const entries = Object.entries(prefsDb.groups || {});
  if (entries.length === 0) {
    return ctx.reply("No groups recorded yet.");
  }

  const max = 50;
  const lines = ["🏘 *Groups (first 50)*", ""];
  for (const [id, g] of entries.slice(0, max)) {
    const status = g.allowed ? "✅ allowed" : "🚫 blocked";
    const title = g.title ? escapeMarkdown(g.title) : "_no title_";
    const note = g.note ? ` — ${escapeMarkdown(g.note)}` : "";
    lines.push(`• \`${id}\` – ${title} (${status})${note}`);
  }
  if (entries.length > max) {
    lines.push("", `...and ${entries.length - max} more.`, "");
  }

  await ctx.reply(lines.join("\n"), { parse_mode: "Markdown" });
});

bot.command("ban", async (ctx) => {
  if (!isOwner(ctx)) return ctx.reply("🚫 Owner only.");

  const args = (ctx.message?.text || "").split(/\s+/).slice(1);
  if (args.length < 1) return ctx.reply("Usage: /ban <userId> [reason]");

  const [targetId, ...reasonParts] = args;
  const reason = reasonParts.join(" ").trim();
  const targetIdStr = String(targetId);

  if (OWNER_IDS.has(targetIdStr)) {
    return ctx.reply("⚠️ Cannot ban an owner.");
  }

  const rec = ensureUser(targetIdStr);
  if (rec.banned) {
    return ctx.reply(`User ${targetIdStr} is already banned.`);
  }

  rec.banned = true;
  rec.bannedAt = new Date().toISOString();
  rec.bannedBy = String(ctx.from?.id || "");
  rec.banReason = reason || null;
  saveUsers();

  let msg = `🚫 User ${targetIdStr} has been banned.`;
  if (reason) msg += ` Reason: ${reason}`;
  await ctx.reply(msg);

  // Notify the banned user (if they have started the bot)
  try {
    const reasonLine = reason ? `\n\n*Reason:* ${escapeMarkdown(reason)}` : "";
    const contactLine =
      "\n\nIf you believe this is a mistake, you can share feedback using the button below.";
    const bannedMsg = [
      "🚫 *You have been banned from using StarzAI.*",
      reasonLine,
      contactLine,
    ].join("");

    const replyMarkup =
      FEEDBACK_CHAT_ID
        ? new InlineKeyboard().text("💡 Feedback", "menu_feedback")
        : undefined;

    await bot.api.sendMessage(targetIdStr, bannedMsg, {
      parse_mode: "Markdown",
      reply_markup: replyMarkup,
    });
  } catch (e) {
    // User might not have started the bot; ignore send error
  }
});

bot.command("unban", async (ctx) => {
  if (!isOwner(ctx)) return ctx.reply("🚫 Owner only.");

  const args = (ctx.message?.text || "").split(/\s+/).slice(1);
  if (args.length < 1) return ctx.reply("Usage: /unban <userId> [reason]");

  const [targetId, ...reasonParts] = args;
  const reason = reasonParts.join(" ").trim();
  const targetIdStr = String(targetId);
  const rec = ensureUser(targetIdStr);

  if (!rec.banned) {
    return ctx.reply(`User ${targetIdStr} is not banned.`);
  }

  rec.banned = false;
  delete rec.bannedAt;
  delete rec.bannedBy;
  delete rec.banReason;
  saveUsers();

  let ownerMsg = `✅ User ${targetIdStr} has been unbanned.`;
  if (reason) ownerMsg += ` Reason: ${reason}`;
  await ctx.reply(ownerMsg);

  // Notify the unbanned user
  try {
    const reasonLine = reason ? `\n\n*Reason:* ${escapeMarkdown(reason)}` : "";
    const baseLine = "✅ *You have been unbanned on StarzAI.*";
    const tailLine = "\n\nYou can use the bot again. Please follow the rules to avoid future bans.";
    const unbannedMsg = [baseLine, reasonLine, tailLine].join("");

    await bot.api.sendMessage(targetIdStr, unbannedMsg, { parse_mode: "Markdown" });
  } catch (e) {
    // User might not have started the bot; ignore send error
  }
});

function applyMuteToUser(targetIdStr, durationMs, scope, reason, mutedById) {
  const rec = ensureUser(targetIdStr);
  const now = Date.now();
  const until = now + durationMs;

  const muteData = {
    until,
    scope,
    reason: reason || null,
    mutedBy: mutedById ? String(mutedById) : "",
    createdAt: new Date(now).toISOString(),
  };

  if (scope === "tier") {
    muteData.previousTier = rec.tier;
    if (rec.tier !== "free") {
      rec.tier = "free";
      rec.role = "free";
    }
  }

  rec.mute = muteData;
  saveUsers();

  return { rec, until };
}

const WARN_SOFTBAN_THRESHOLD = 3;
const WARN_SOFTBAN_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

function extractUserIdFromFeedbackId(feedbackId) {
  if (!feedbackId || typeof feedbackId !== "string") return null;
  const match = feedbackId.match(/^FB-(\d+)-/);
  if (!match) return null;
  return match[1];
}

bot.command("warn", async (ctx) => {
  if (!isOwner(ctx)) return ctx.reply("🚫 Owner only.");

  const args = (ctx.message?.text || "").split(/\s+/).slice(1);
  if (args.length < 1) return ctx.reply("Usage: /warn <userId> [reason]");

  const [targetId, ...reasonParts] = args;
  const targetIdStr = String(targetId);
  const reason = reasonParts.join(" ").trim();

  if (OWNER_IDS.has(targetIdStr)) {
    return ctx.reply("⚠️ Cannot warn an owner.");
  }

  const rec = ensureUser(targetIdStr);
  if (!Array.isArray(rec.warnings)) rec.warnings = [];

  const warnEntry = {
    at: new Date().toISOString(),
    reason: reason || null,
    by: String(ctx.from?.id || ""),
  };
  rec.warnings.push(warnEntry);
  saveUsers();

  const totalWarnings = rec.warnings.length;

  let ownerMsg = `⚠️ Warning added for user ${targetIdStr}. Total warnings: ${totalWarnings}.`;
  if (reason) ownerMsg += ` Reason: ${reason}`;
  await ctx.reply(ownerMsg);

  // Auto softban on repeated warnings if not already banned/muted
  let autoSoftbanApplied = false;
  let autoSoftbanUntil = null;

  if (totalWarnings >= WARN_SOFTBAN_THRESHOLD && !rec.banned && !rec.mute) {
    const autoReason = reason
      ? `${reason} (auto-temporary mute after ${totalWarnings} warnings)`
      : `Auto-temporary mute after ${totalWarnings} warnings`;

    const { until } = applyMuteToUser(
      targetIdStr,
      WARN_SOFTBAN_DURATION_MS,
      "all",
      autoReason,
      ctx.from?.id
    );
    autoSoftbanApplied = true;
    autoSoftbanUntil = until;

    const humanUntil = new Date(until).toLocaleString();
    await ctx.reply(
      `🔇 Auto softban applied to user ${targetIdStr} for 24h (total mute). Ends at: ${humanUntil}.`
    );
  }

  // Notify user
  try {
    const reasonLine = reason ? `\n\n*Reason:* ${escapeMarkdown(reason)}` : "";
    const countLine = `\n\n*Total warnings:* ${totalWarnings}`;
    let extra = "";

    if (autoSoftbanApplied && autoSoftbanUntil) {
      const softbanUntilStr = new Date(autoSoftbanUntil).toLocaleString();
      extra =
        `\n\n🔇 *Temporary mute applied due to repeated warnings.*` +
        `\n_Mute ends at: ${escapeMarkdown(softbanUntilStr)}_`;
    }

    const msg =
      `⚠️ *You have received a warning on StarzAI.*` +
      reasonLine +
      countLine +
      extra;

    const replyMarkup =
      FEEDBACK_CHAT_ID
        ? new InlineKeyboard().text("💡 Feedback", "menu_feedback")
        : undefined;

    await bot.api.sendMessage(targetIdStr, msg, {
      parse_mode: "Markdown",
      reply_markup: replyMarkup,
    });
  } catch (e) {
    // ignore
  }
});

bot.command("clearwarns", async (ctx) => {
  if (!isOwner(ctx)) return ctx.reply("🚫 Owner only.");

  const args = (ctx.message?.text || "").split(/\s+/).slice(1);
  if (args.length < 1) return ctx.reply("Usage: /clearwarns <userId> [reason]");

  const [targetId, ...reasonParts] = args;
  const targetIdStr = String(targetId);
  const reason = reasonParts.join(" ").trim();

  if (OWNER_IDS.has(targetIdStr)) {
    return ctx.reply("⚠️ Cannot clear warnings for an owner.");
  }

  const rec = ensureUser(targetIdStr);
  if (!Array.isArray(rec.warnings) || rec.warnings.length === 0) {
    return ctx.reply(`User ${targetIdStr} has no warnings.`);
  }

  const count = rec.warnings.length;
  rec.warnings = [];
  saveUsers();

  let ownerMsg = `🧹 Cleared ${count} warnings for user ${targetIdStr}.`;
  if (reason) ownerMsg += ` Reason: ${reason}`;
  await ctx.reply(ownerMsg);

  try {
    const reasonLine = reason ? `\n\n*Reason:* ${escapeMarkdown(reason)}` : "";
    const msg = `🧹 *Your warnings on StarzAI have been cleared.*${reasonLine}`;
    await bot.api.sendMessage(targetIdStr, msg, { parse_mode: "Markdown" });
  } catch (e) {
    // ignore
  }
});

// Alias: /cw -> same as /clearwarns
bot.command("cw", async (ctx) => {
  if (!isOwner(ctx)) return ctx.reply("🚫 Owner only.");

  const args = (ctx.message?.text || "").split(/\s+/).slice(1);
  if (args.length < 1) return ctx.reply("Usage: /cw <userId> [reason]");

  const [targetId, ...reasonParts] = args;
  const targetIdStr = String(targetId);
  const reason = reasonParts.join(" ").trim();

  if (OWNER_IDS.has(targetIdStr)) {
    return ctx.reply("⚠️ Cannot clear warnings for an owner.");
  }

  const rec = ensureUser(targetIdStr);
  if (!Array.isArray(rec.warnings) || rec.warnings.length === 0) {
    return ctx.reply(`User ${targetIdStr} has no warnings.`);
  }

  const count = rec.warnings.length;
  rec.warnings = [];
  saveUsers();

  let ownerMsg = `🧹 Cleared ${count} warnings for user ${targetIdStr}.`;
  if (reason) ownerMsg += ` Reason: ${reason}`;
  await ctx.reply(ownerMsg);

  try {
    const reasonLine = reason ? `\n\n*Reason:* ${escapeMarkdown(reason)}` : "";
    const msg = `🧹 *Your warnings on StarzAI have been cleared.*${reasonLine}`;
    await bot.api.sendMessage(targetIdStr, msg, { parse_mode: "Markdown" });
  } catch (e) {
    // ignore
  }
});

bot.command("softban", async (ctx) => {
  if (!isOwner(ctx)) return ctx.reply("🚫 Owner only.");

  const args = (ctx.message?.text || "").split(/\s+/).slice(1);
  if (args.length < 1) return ctx.reply("Usage: /softban <userId> [reason]");

  const [targetId, ...reasonParts] = args;
  const targetIdStr = String(targetId);
  const reason = reasonParts.join(" ").trim();

  if (OWNER_IDS.has(targetIdStr)) {
    return ctx.reply("⚠️ Cannot softban an owner.");
  }

  const rec = ensureUser(targetIdStr);
  if (rec.banned) {
    return ctx.reply(`User ${targetIdStr} is already banned.`);
  }

  const { until } = applyMuteToUser(
    targetIdStr,
    WARN_SOFTBAN_DURATION_MS,
    "all",
    reason || null,
    ctx.from?.id
  );

  const humanUntil = new Date(until).toLocaleString();
  let ownerMsg = `🚫 Softban applied to user ${targetIdStr} for 24h (total mute).`;
  ownerMsg += `\nUntil: ${humanUntil}`;
  if (reason) ownerMsg += `\nReason: ${reason}`;
  await ctx.reply(ownerMsg);

  // Notify user
  try {
    const reasonLine = reason ? `\n\n*Reason:* ${escapeMarkdown(reason)}` : "";
    const untilLine = `\n\n_Ban ends at: ${escapeMarkdown(humanUntil)}_`;
    const msg =
      "🚫 *You have received a temporary soft ban on StarzAI.*" +
      reasonLine +
      "\n\nYou are temporarily blocked from using the bot." +
      untilLine;

    const replyMarkup =
      FEEDBACK_CHAT_ID
        ? new InlineKeyboard().text("💡 Feedback", "menu_feedback")
        : undefined;

    await bot.api.sendMessage(targetIdStr, msg, {
      parse_mode: "Markdown",
      reply_markup: replyMarkup,
    });
  } catch (e) {
    // ignore
  }
});

// Alias: /sban -> same as /softban
bot.command("sban", async (ctx) => {
  if (!isOwner(ctx)) return ctx.reply("🚫 Owner only.");

  const args = (ctx.message?.text || "").split(/\s+/).slice(1);
  if (args.length < 1) return ctx.reply("Usage: /sban <userId> [reason]");

  const [targetId, ...reasonParts] = args;
  const targetIdStr = String(targetId);
  const reason = reasonParts.join(" ").trim();

  if (OWNER_IDS.has(targetIdStr)) {
    return ctx.reply("⚠️ Cannot softban an owner.");
  }

  const rec = ensureUser(targetIdStr);
  if (rec.banned) {
    return ctx.reply(`User ${targetIdStr} is already banned.`);
  }

  const { until } = applyMuteToUser(
    targetIdStr,
    WARN_SOFTBAN_DURATION_MS,
    "all",
    reason || null,
    ctx.from?.id
  );

  const humanUntil = new Date(until).toLocaleString();
  let ownerMsg = `🚫 Softban applied to user ${targetIdStr} for 24h (total mute).`;
  ownerMsg += `\nUntil: ${humanUntil}`;
  if (reason) ownerMsg += `\nReason: ${reason}`;
  await ctx.reply(ownerMsg);

  // Notify user
  try {
    const reasonLine = reason ? `\n\n*Reason:* ${escapeMarkdown(reason)}` : "";
    const untilLine = `\n\n_Ban ends at: ${escapeMarkdown(humanUntil)}_`;
    const msg =
      "🚫 *You have received a temporary soft ban on StarzAI.*" +
      reasonLine +
      "\n\nYou are temporarily blocked from using the bot." +
      untilLine;

    const replyMarkup =
      FEEDBACK_CHAT_ID
        ? new InlineKeyboard().text("💡 Feedback", "menu_feedback")
        : undefined;

    await bot.api.sendMessage(targetIdStr, msg, {
      parse_mode: "Markdown",
      reply_markup: replyMarkup,
    });
  } catch (e) {
    // ignore
  }
});

bot.command("mute", async (ctx) => {
  if (!isOwner(ctx)) return ctx.reply("🚫 Owner only.");

  const args = (ctx.message?.text || "").split(/\s+/).slice(1);
  if (args.length < 2) {
    return ctx.reply(
      "Usage: /mute <userId> <duration> [scope] [reason]\n\n" +
      "duration examples: 10m, 2h, 1d, 30 (minutes)\n" +
      "scope: all, dm, group, inline, tier (default: all)"
    );
  }

  const [targetId, durationRaw, scopeOrReason, ...rest] = args;
  const targetIdStr = String(targetId);

  if (OWNER_IDS.has(targetIdStr)) {
    return ctx.reply("⚠️ Cannot mute an owner.");
  }

  const durationMs = parseDurationToMs(durationRaw);
  if (!durationMs) {
    return ctx.reply("Invalid duration. Use formats like 10m, 2h, 1d, 60 (minutes).");
  }

  let scope = "all";
  let reason = "";

  const possibleScope = (scopeOrReason || "").toLowerCase();
  const validScopes = new Set(["all", "dm", "group", "inline", "tier"]);
  if (possibleScope && validScopes.has(possibleScope)) {
    scope = possibleScope;
    reason = rest.join(" ").trim();
  } else {
    reason = [scopeOrReason, ...rest].filter(Boolean).join(" ").trim();
  }

  const { until } = applyMuteToUser(
    targetIdStr,
    durationMs,
    scope,
    reason || null,
    ctx.from?.id
  );

  const humanUntil = new Date(until).toLocaleString();
  let ownerMsg = `🔇 User ${targetIdStr} muted for ${durationRaw} (scope: ${scope}).`;
  ownerMsg += `\nUntil: ${humanUntil}`;
  if (reason) ownerMsg += `\nReason: ${reason}`;
  await ctx.reply(ownerMsg);

  // Notify muted user
  try {
    const scopeText =
      scope === "all"
        ? "everywhere"
        : scope === "dm"
        ? "in direct messages"
        : scope === "group"
        ? "in groups"
        : scope === "inline"
        ? "in inline mode"
        : "for premium/paid features";
    const reasonLine = reason ? `\n\n*Reason:* ${escapeMarkdown(reason)}` : "";
    const untilLine = `\n\n_Mute ends at: ${escapeMarkdown(humanUntil)}_`;
    const baseLine = `🔇 *You have been muted on StarzAI* (${scopeText}).`;
    const mutedMsg = [baseLine, reasonLine, untilLine].join("");

    const replyMarkup =
      FEEDBACK_CHAT_ID
        ? new InlineKeyboard().text("💡 Feedback", "menu_feedback")
        : undefined;

    await bot.api.sendMessage(targetIdStr, mutedMsg, {
      parse_mode: "Markdown",
      reply_markup: replyMarkup,
    });
  } catch (e) {
    // User might not have started the bot; ignore
  }
});

bot.command("unmute", async (ctx) => {
  if (!isOwner(ctx)) return ctx.reply("🚫 Owner only.");

  const args = (ctx.message?.text || "").split(/\s+/).slice(1);
  if (args.length < 1) return ctx.reply("Usage: /unmute <userId> [reason]");

  const [targetId, ...reasonParts] = args;
  const reason = reasonParts.join(" ").trim();
  const targetIdStr = String(targetId);
  const rec = ensureUser(targetIdStr);

  if (!rec.mute) {
    return ctx.reply(`User ${targetIdStr} is not muted.`);
  }

  if (rec.mute.scope === "tier" && rec.mute.previousTier && rec.tier === "free") {
    rec.tier = rec.mute.previousTier;
    rec.role = rec.mute.previousTier;
  }

  delete rec.mute;
  saveUsers();

  let ownerMsg = `🔊 User ${targetIdStr} has been unmuted.`;
  if (reason) ownerMsg += ` Reason: ${reason}`;
  await ctx.reply(ownerMsg);

  try {
    const reasonLine = reason ? `\n\n*Reason:* ${escapeMarkdown(reason)}` : "";
    const msg = `🔊 *Your mute on StarzAI has been lifted.*${reasonLine}`;
    await bot.api.sendMessage(targetIdStr, msg, { parse_mode: "Markdown" });
  } catch (e) {
    // User might not have started the bot; ignore
  }
});

bot.command("banlist", async (ctx) => {
  if (!isOwner(ctx)) return ctx.reply("🚫 Owner only.");

  const entries = Object.entries(usersDb.users || {}).filter(
    ([, u]) => u.banned
  );

  if (entries.length === 0) {
    return ctx.reply("✅ No banned users currently.");
  }

  const max = 50;
  const subset = entries.slice(0, max);
  const lines = [
    `🚫 <b>Banned users</b> (${entries.length})`,
    "",
  ];

  subset.forEach(([id, u], idx) => {
    const username = u.username ? "@" + escapeHTML(u.username) : "<i>no username</i>";
    const name = u.firstName ? escapeHTML(u.firstName) : "<i>no name</i>";
    const bannedAt = u.bannedAt ? new Date(u.bannedAt).toLocaleString() : "unknown";
    const reasonText = u.banReason ? escapeHTML(u.banReason.slice(0, 80)) : "none";
    lines.push(
      `${idx + 1}. <code>${id}</code> – ${username} (${name})`,
      `   ⏰ ${bannedAt} • Reason: ${reasonText}`,
      ""
    );
  });

  if (entries.length > max) {
    lines.push(
      `... and ${entries.length - max} more. Use /info &lt;userId&gt; for details.`
    );
  }

  await ctx.reply(lines.join("\n"), { parse_mode: "HTML" });
});

bot.command("mutelist", async (ctx) => {
  if (!isOwner(ctx)) return ctx.reply("🚫 Owner only.");

  const entries = Object.entries(usersDb.users || {}).filter(
    ([, u]) => u.mute
  );

  if (entries.length === 0) {
    return ctx.reply("✅ No muted users currently.");
  }

  const max = 50;
  const subset = entries.slice(0, max);
  const lines = [
    `🔇 <b>Muted users</b> (${entries.length})`,
    "",
  ];

  subset.forEach(([id, u], idx) => {
    const m = u.mute;
    const scope = m.scope || "all";
    const until = m.until ? new Date(m.until).toLocaleString() : "unknown";
    const reasonText = m.reason ? escapeHTML(m.reason.slice(0, 80)) : "none";
    const username = u.username ? "@" + escapeHTML(u.username) : "<i>no username</i>";
    const name = u.firstName ? escapeHTML(u.firstName) : "<i>no name</i>";
    lines.push(
      `${idx + 1}. <code>${id}</code> – ${username} (${name})`,
      `   🎯 Scope: ${escapeHTML(scope)} • Until: ${escapeHTML(until)} • Reason: ${reasonText}`,
      ""
    );
  });

  if (entries.length > max) {
    lines.push(
      `... and ${entries.length - max} more. Use /info &lt;userId&gt; for details.`
    );
  }

  await ctx.reply(lines.join("\n"), { parse_mode: "HTML" });
});

bot.command("ownerhelp", async (ctx) => {
  if (!isOwner(ctx)) return ctx.reply("🚫 Owner only.");

  const text = [
    "📘 StarzAI Owner Guide",
    "",
    "👤 User info & status",
    "",
    "• /info <userId> — full user info (tier, bans, mutes, warnings, stats)",
    "• /gstat — global bot stats",
    "",
    "🎫 Tiers & access",
    "",
    "• /grant <userId> <tier>,",
    "• /revoke <userId>",
    "• /allow <userId> <model>,",
    "• /deny <userId> <model>",
    "",
    "🏘 Group authorization",
    "",
    "• /add <chatId> note — authorize a group to use the bot",
    "• /rem <chatId> reason — block a group from using the bot",
    "• /glist — list known groups and their auth status",
    "",
    "🚫 Bans",
    "",
    "• /ban <userId> reason",
    "• /unban <userId> reason",
    "• /sban <userId> reason — 24h total mute",
    "• /banlist — list banned users",
    "",
    "🔇 Mutes",
    "",
    "• /mute <userId> <duration> scope reason",
    "• /unmute <userId> reason",
    "• /mutelist",
    "  scope: all, dm, group, inline, tier",
    "",
    "⚠️ Warnings",
    "",
    "• /warn <userId> reason — auto softban at 3 warnings",
    "• /cw <userId> reason — reset warnings",
    "",
    "💡 Feedback",
    "",
    "• /feedback — user-side command (button in menu)",
    "• /f <feedbackId> <text> — reply to feedback sender",
    "",
    "•Owners cannot be banned, muted, or warned.",
  ]
    .filter(Boolean)
    .join("\n");

  await ctx.reply(text, {
    reply_to_message_id: ctx.message?.message_id,
  });
});


