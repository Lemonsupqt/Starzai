/**
 * StarzAI Bot - Main Entry Point
 * Modular Telegram Bot with Multi-Provider LLM Support
 * 
 * @version 2.0.0
 * @author StarzTech
 */

import { Bot, webhookCallback } from "grammy";
import http from "http";

// =====================
// Configuration
// =====================
import { 
  BOT_TOKEN, 
  PUBLIC_URL, 
  PORT,
  validateEnv 
} from "./config/index.js";

// =====================
// Database
// =====================
import { initializeDatabase } from "./database/index.js";

// =====================
// Middleware
// =====================
import { 
  accessControlMiddleware, 
  groupActivityMiddleware 
} from "./middleware/index.js";

// =====================
// Commands
// =====================
import { registerAllCommands } from "./commands/index.js";

// =====================
// Handlers
// =====================
import { registerAllHandlers } from "./handlers/index.js";

// =====================
// Bot Initialization
// =====================

async function main() {
  console.log("🚀 Starting StarzAI Bot...");
  
  // Validate environment
  try {
    validateEnv();
    console.log("✅ Environment validated");
  } catch (error) {
    console.error("❌ Environment validation failed:", error.message);
    process.exit(1);
  }
  
  // Initialize database
  console.log("📦 Initializing database...");
  await initializeDatabase();
  console.log("✅ Database initialized");
  
  // Create bot instance
  const bot = new Bot(BOT_TOKEN);
  console.log("🤖 Bot instance created");
  
  // =====================
  // Register Middleware
  // =====================
  
  // Access control (ban check, rate limiting)
  bot.use(accessControlMiddleware());
  
  // Group activity management
  bot.use(groupActivityMiddleware());
  
  console.log("🔒 Middleware registered");
  
  // =====================
  // Register Commands
  // =====================
  
  registerAllCommands(bot);
  console.log("📝 Commands registered");
  
  // =====================
  // Register Handlers
  // =====================
  
  registerAllHandlers(bot);
  console.log("🎯 Handlers registered");
  
  // =====================
  // Error Handling
  // =====================
  
  bot.catch((err) => {
    const ctx = err.ctx;
    console.error(`Error while handling update ${ctx.update.update_id}:`);
    console.error(err.error);
  });
  
  // =====================
  // Start Bot
  // =====================
  
  if (PUBLIC_URL) {
    // Webhook mode
    console.log(`🌐 Starting in webhook mode on port ${PORT}...`);
    
    const handleUpdate = webhookCallback(bot, "http");
    
    const server = http.createServer(async (req, res) => {
      if (req.method === "POST" && req.url === "/webhook") {
        try {
          await handleUpdate(req, res);
        } catch (error) {
          console.error("Webhook error:", error);
          res.statusCode = 500;
          res.end("Internal Server Error");
        }
      } else if (req.method === "GET" && req.url === "/health") {
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }));
      } else {
        res.statusCode = 200;
        res.end("StarzAI Bot is running!");
      }
    });
    
    server.listen(PORT, "0.0.0.0", async () => {
      console.log(`✅ Server listening on port ${PORT}`);
      
      // Set webhook
      const webhookUrl = `${PUBLIC_URL}/webhook`;
      try {
        await bot.api.setWebhook(webhookUrl, {
          drop_pending_updates: false,
          allowed_updates: ["message", "callback_query", "inline_query", "chosen_inline_result"]
        });
        console.log(`✅ Webhook set to: ${webhookUrl}`);
      } catch (error) {
        console.error("❌ Failed to set webhook:", error.message);
      }
    });
    
  } else {
    // Polling mode (for development)
    console.log("🔄 Starting in polling mode...");
    
    await bot.api.deleteWebhook();
    await bot.start({
      drop_pending_updates: true,
      onStart: (botInfo) => {
        console.log(`✅ Bot started as @${botInfo.username}`);
      }
    });
  }
}

// =====================
// Run
// =====================

main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
