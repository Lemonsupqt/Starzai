/**
 * server/webhook.js
 * Auto-extracted from index.js
 */

// =====================
// WEBHOOK SERVER
// Lines 20332-20462 from original index.js
// =====================

// =====================
// WEBHOOK SERVER (Railway)
// =====================
const callback = webhookCallback(bot, "http", {
  timeoutMilliseconds: 120000, // 120 second timeout for long operations like image generation
  onTimeout: (ctx) => {
    console.log("⚠️ Request timeout, but continuing in background...");
  }
});

http
  .createServer(async (req, res) => {
    // Handle webhook
    if (req.method === "POST" && req.url === "/webhook") {
      try {
        // Process webhook without blocking other requests
        // This allows multiple users to be served concurrently
        callback(req, res).catch(e => {
          console.error("❌ Webhook processing error:", e);
        });
      } catch (e) {
        console.error(e);
        res.statusCode = 500;
        res.end("Webhook error");
      }
      return;
    }
    
    // Serve WebApp static files
    if (req.method === "GET" && req.url === "/webapp") {
      try {
        const webappPath = path.join(process.cwd(), "webapp", "index.html");
        const content = fs.readFileSync(webappPath, "utf8");
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.statusCode = 200;
        res.end(content);
      } catch (e) {
        console.error("WebApp serve error:", e);
        res.statusCode = 500;
        res.end("WebApp not found");
      }
      return;
    }
    
    res.statusCode = 200;
    res.end("OK");
  })
  .listen(PORT, async () => {
    console.log("Listening on", PORT);

    // Cache bot info (ID and username) for later use
    try {
      const me = await bot.api.getMe();
      BOT_ID = me.id;
      BOT_USERNAME = (me.username || "").toLowerCase();
      console.log(`Bot identity: @${BOT_USERNAME} (id=${BOT_ID})`);
    } catch (e) {
      console.error("Failed to fetch bot info:", e.message);
    }

    // Initialize storage - try Supabase first (permanent), then Telegram as fallback
    const supabaseLoaded = await loadFromSupabase();
    if (!supabaseLoaded) {
      await loadFromTelegram();
    }

    if (PUBLIC_URL) {
      const url = `${PUBLIC_URL.replace(/\/$/, "")}/webhook`;
      try {
        await bot.api.setWebhook(url);
        console.log("Webhook set to:", url);
      } catch (e) {
        console.error("Failed to set webhook:", e);
      }
    } else {
      console.warn("PUBLIC_URL not set; webhook not configured automatically.");
    }

    // Register bot commands for the "/" menu popup
    try {
      // Default commands for all users
      await bot.api.setMyCommands([
        { command: "start", description: "👋 Welcome & menu" },
        { command: "help", description: "📖 Show all features" },
        { command: "register", description: "✅ Register your account" },
        { command: "model", description: "🤖 Choose AI model" },
        { command: "whoami", description: "👤 Your profile & stats" },
        { command: "reset", description: "🗑️ Clear chat memory" },
      ]);
      console.log("Bot commands registered (default)");

      // Owner-only commands (private chats with owners)
      for (const ownerId of OWNER_IDS) {
        try {
          await bot.api.setMyCommands(
            [
              { command: "start", description: "👋 Welcome & menu" },
              { command: "help", description: "📖 Show all features" },
              { command: "register", description: "✅ Register your account" },
              { command: "model", description: "🤖 Choose AI model" },
              { command: "whoami", description: "👤 Your profile & stats" },
              { command: "reset", description: "🗑️ Clear chat memory" },
              { command: "status", description: "📊 Bot status & analytics" },
              { command: "info", description: "🔍 User info (info <userId>)" },
              { command: "grant", description: "🎁 Grant tier (grant <userId> <tier>)" },
              { command: "revoke", description: "❌ Revoke to free (revoke <userId>)" },
              { command: "ban", description: "🚫 Ban user (ban <userId> [reason])" },
              { command: "unban", description: "✅ Unban user (unban <userId> [reason])" },
              { command: "softban", description: "🚫 Softban user (softban <userId> [reason])" },
              { command: "warn", description: "⚠️ Warn user (warn <userId> [reason])" },
              { command: "clearwarns", description: "🧹 Clear warnings (clearwarns <userId> [reason])" },
              { command: "banlist", description: "📜 List banned users" },
              { command: "mute", description: "🔇 Mute user (mute <userId> <duration> [scope] [reason])" },
              { command: "unmute", description: "🔊 Unmute user (unmute <userId> [reason])" },
              { command: "mutelist", description: "🔇 List muted users" },
              { command: "ownerhelp", description: "📘 Owner help guide" },
              { command: "allow", description: "✅ Allow model (allow <userId> <model>)" },
              { command: "deny", description: "🚫 Deny model (deny <userId> <model>)" },
            ],
            { scope: { type: "chat", chat_id: Number(ownerId) } }
          );
        } catch (e) {
          console.error(`Failed to set owner commands for ${ownerId}:`, e.message);
        }
      }
      console.log("Owner commands registered");
    } catch (e) {
      console.error("Failed to register bot commands:", e);
    }
  });


