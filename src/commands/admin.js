/**
 * Admin/Owner Commands Module
 * Handles owner-only administrative commands
 */

import { isOwner, OWNER_IDS } from "../config/index.js";
import { 
  usersDb, 
  prefsDb, 
  saveUsers, 
  savePrefs 
} from "../database/manager.js";
import { 
  getUserRecord, 
  banUser, 
  unbanUser, 
  warnUser, 
  clearWarnings,
  muteUser,
  unmuteUser,
  grantTier,
  revokeTier
} from "../features/users.js";
import { getProviderStats } from "../llm/providers.js";
import { deapiKeyManager } from "../features/image-gen.js";
import { parseDurationToMs } from "../utils/helpers.js";

// =====================
// Owner Check Middleware
// =====================

function ownerOnly(handler) {
  return async (ctx) => {
    const userId = String(ctx.from?.id);
    if (!isOwner(userId)) {
      await ctx.reply("⛔ This command is owner-only.");
      return;
    }
    return handler(ctx);
  };
}

// =====================
// /status Command
// =====================

export function registerStatusCommand(bot) {
  bot.command("status", ownerOnly(async (ctx) => {
    const providerStatsData = getProviderStats();
    const deapiStats = deapiKeyManager.getStats();
    
    const userCount = Object.keys(usersDb.users || {}).length;
    const groupCount = Object.keys(prefsDb.groups || {}).length;
    
    let statusText = `
<b>🔧 Bot Status</b>

<b>Users:</b> ${userCount}
<b>Groups:</b> ${groupCount}

<b>LLM Providers:</b>
    `.trim();
    
    for (const [key, stats] of Object.entries(providerStatsData)) {
      const healthEmoji = stats.health === 'excellent' ? '🟢' : 
                         stats.health === 'good' ? '🟡' : 
                         stats.health === 'degraded' ? '🟠' : '🔴';
      statusText += `\n• ${stats.name}: ${healthEmoji} ${stats.enabled ? 'ON' : 'OFF'}`;
      statusText += `\n  Calls: ${stats.calls} | Success: ${stats.successRate}%`;
      if (stats.lastError) {
        statusText += `\n  Last error: ${stats.lastError.slice(0, 50)}`;
      }
    }
    
    statusText += `\n\n<b>Image Generation (DeAPI):</b>`;
    statusText += `\n• Keys: ${deapiStats.activeKeys}/${deapiStats.totalKeys} active`;
    statusText += `\n• Total generations: ${deapiKeyManager.totalImageGenerations}`;
    statusText += `\n• Success rate: ${deapiStats.totalCalls > 0 ? Math.round((deapiStats.totalSuccesses / deapiStats.totalCalls) * 100) : 100}%`;
    
    await ctx.reply(statusText, { parse_mode: "HTML" });
  }));
}

// =====================
// /grant Command
// =====================

export function registerGrantCommand(bot) {
  bot.command("grant", ownerOnly(async (ctx) => {
    const args = ctx.message?.text?.split(/\s+/).slice(1) || [];
    
    if (args.length < 2) {
      await ctx.reply("Usage: /grant <user_id> <tier>\nTiers: premium, ultra");
      return;
    }
    
    const [targetId, tier] = args;
    
    if (!["premium", "ultra"].includes(tier)) {
      await ctx.reply("Invalid tier. Use: premium, ultra");
      return;
    }
    
    grantTier(targetId, tier);
    await ctx.reply(`✅ Granted ${tier} tier to user ${targetId}`);
  }));
}

// =====================
// /revoke Command
// =====================

export function registerRevokeCommand(bot) {
  bot.command("revoke", ownerOnly(async (ctx) => {
    const args = ctx.message?.text?.split(/\s+/).slice(1) || [];
    
    if (args.length < 1) {
      await ctx.reply("Usage: /revoke <user_id>");
      return;
    }
    
    const targetId = args[0];
    revokeTier(targetId);
    await ctx.reply(`✅ Revoked tier from user ${targetId} (now free)`);
  }));
}

// =====================
// /ban Command
// =====================

export function registerBanCommand(bot) {
  bot.command("ban", ownerOnly(async (ctx) => {
    const args = ctx.message?.text?.split(/\s+/).slice(1) || [];
    
    if (args.length < 1) {
      await ctx.reply("Usage: /ban <user_id> [reason]");
      return;
    }
    
    const targetId = args[0];
    const reason = args.slice(1).join(" ") || null;
    
    if (OWNER_IDS.has(targetId)) {
      await ctx.reply("⛔ Cannot ban an owner.");
      return;
    }
    
    banUser(targetId, reason);
    await ctx.reply(`🔨 Banned user ${targetId}${reason ? `\nReason: ${reason}` : ""}`);
  }));
}

// =====================
// /unban Command
// =====================

export function registerUnbanCommand(bot) {
  bot.command("unban", ownerOnly(async (ctx) => {
    const args = ctx.message?.text?.split(/\s+/).slice(1) || [];
    
    if (args.length < 1) {
      await ctx.reply("Usage: /unban <user_id>");
      return;
    }
    
    const targetId = args[0];
    unbanUser(targetId);
    await ctx.reply(`✅ Unbanned user ${targetId}`);
  }));
}

// =====================
// /warn Command
// =====================

export function registerWarnCommand(bot) {
  bot.command("warn", ownerOnly(async (ctx) => {
    const args = ctx.message?.text?.split(/\s+/).slice(1) || [];
    
    if (args.length < 1) {
      await ctx.reply("Usage: /warn <user_id> [reason]");
      return;
    }
    
    const targetId = args[0];
    const reason = args.slice(1).join(" ") || null;
    
    const warnCount = warnUser(targetId, reason);
    await ctx.reply(`⚠️ Warned user ${targetId} (${warnCount} warnings)${reason ? `\nReason: ${reason}` : ""}`);
  }));
}

// =====================
// /clearwarns Command
// =====================

export function registerClearWarnsCommand(bot) {
  bot.command(["clearwarns", "cw"], ownerOnly(async (ctx) => {
    const args = ctx.message?.text?.split(/\s+/).slice(1) || [];
    
    if (args.length < 1) {
      await ctx.reply("Usage: /clearwarns <user_id>");
      return;
    }
    
    const targetId = args[0];
    clearWarnings(targetId);
    await ctx.reply(`✅ Cleared warnings for user ${targetId}`);
  }));
}

// =====================
// /mute Command
// =====================

export function registerMuteCommand(bot) {
  bot.command("mute", ownerOnly(async (ctx) => {
    const args = ctx.message?.text?.split(/\s+/).slice(1) || [];
    
    if (args.length < 2) {
      await ctx.reply("Usage: /mute <user_id> <duration> [reason]\nDuration: 10m, 1h, 1d, etc.");
      return;
    }
    
    const [targetId, durationStr, ...reasonParts] = args;
    const durationMs = parseDurationToMs(durationStr);
    
    if (!durationMs) {
      await ctx.reply("Invalid duration. Use: 10m, 1h, 1d, etc.");
      return;
    }
    
    const reason = reasonParts.join(" ") || null;
    muteUser(targetId, durationMs, 'all', reason);
    
    await ctx.reply(`🔇 Muted user ${targetId} for ${durationStr}${reason ? `\nReason: ${reason}` : ""}`);
  }));
}

// =====================
// /unmute Command
// =====================

export function registerUnmuteCommand(bot) {
  bot.command("unmute", ownerOnly(async (ctx) => {
    const args = ctx.message?.text?.split(/\s+/).slice(1) || [];
    
    if (args.length < 1) {
      await ctx.reply("Usage: /unmute <user_id>");
      return;
    }
    
    const targetId = args[0];
    unmuteUser(targetId);
    await ctx.reply(`🔊 Unmuted user ${targetId}`);
  }));
}

// =====================
// /banlist Command
// =====================

export function registerBanlistCommand(bot) {
  bot.command("banlist", ownerOnly(async (ctx) => {
    const banned = Object.entries(usersDb.users || {})
      .filter(([_, u]) => u.banned)
      .map(([id, u]) => `• ${id}${u.username ? ` (@${u.username})` : ""}${u.banReason ? `: ${u.banReason}` : ""}`);
    
    if (banned.length === 0) {
      await ctx.reply("No banned users.");
      return;
    }
    
    await ctx.reply(`<b>🔨 Banned Users (${banned.length}):</b>\n${banned.join("\n")}`, { parse_mode: "HTML" });
  }));
}

// =====================
// /ownerhelp Command
// =====================

export function registerOwnerHelpCommand(bot) {
  bot.command("ownerhelp", ownerOnly(async (ctx) => {
    const helpText = `
<b>🔧 Owner Commands</b>

<b>User Management:</b>
/grant &lt;id&gt; &lt;tier&gt; - Grant tier
/revoke &lt;id&gt; - Revoke tier
/ban &lt;id&gt; [reason] - Ban user
/unban &lt;id&gt; - Unban user
/warn &lt;id&gt; [reason] - Warn user
/clearwarns &lt;id&gt; - Clear warnings
/mute &lt;id&gt; &lt;duration&gt; - Mute user
/unmute &lt;id&gt; - Unmute user
/banlist - List banned users

<b>Group Management:</b>
/allowgroup &lt;id&gt; - Allow group
/denygroup &lt;id&gt; - Deny group
/grouplist - List groups

<b>System:</b>
/status - Bot status
/gstat - Global statistics
    `.trim();
    
    await ctx.reply(helpText, { parse_mode: "HTML" });
  }));
}

// =====================
// Register All Admin Commands
// =====================

export function registerAdminCommands(bot) {
  registerStatusCommand(bot);
  registerGrantCommand(bot);
  registerRevokeCommand(bot);
  registerBanCommand(bot);
  registerUnbanCommand(bot);
  registerWarnCommand(bot);
  registerClearWarnsCommand(bot);
  registerMuteCommand(bot);
  registerUnmuteCommand(bot);
  registerBanlistCommand(bot);
  registerOwnerHelpCommand(bot);
}
