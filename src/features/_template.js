/**
 * Feature Template
 * 
 * Copy this file and rename it for your new feature.
 * Example: src/features/my-feature.js
 * 
 * USAGE:
 * 1. Copy this file: cp _template.js my-feature.js
 * 2. Implement your feature functions
 * 3. Export the functions you need
 * 4. Import in index.js: import { myFunction } from './src/features/my-feature.js';
 * 5. Use in your bot handlers
 */

// =====================
// IMPORTS
// =====================
// Import what you need from index.js by adding exports there first,
// or import from other modules in src/

// Example: If you need the bot instance, you'll need to pass it as a parameter
// Example: If you need user functions, import from users.js (after it's properly modularized)

// =====================
// CONSTANTS
// =====================
// Define feature-specific constants here

const FEATURE_NAME = "MyFeature";
const DEFAULT_CONFIG = {
  enabled: true,
  maxItems: 100,
};

// =====================
// STATE
// =====================
// Feature-specific in-memory state (if needed)
// Note: For persistence, use the main storage functions from index.js

const featureCache = new Map();

// =====================
// HELPER FUNCTIONS
// =====================
// Internal helper functions (not exported)

function validateInput(input) {
  if (!input || typeof input !== 'string') {
    return { valid: false, error: 'Invalid input' };
  }
  return { valid: true };
}

// =====================
// MAIN FUNCTIONS
// =====================
// Export the functions you want to use in index.js

/**
 * Initialize the feature
 * Call this from index.js startup if needed
 */
export function initFeature() {
  console.log(`[${FEATURE_NAME}] Initialized`);
  return true;
}

/**
 * Main feature function
 * @param {object} ctx - Grammy context
 * @param {string} input - User input
 * @returns {Promise<object>} Result object
 */
export async function processFeature(ctx, input) {
  const validation = validateInput(input);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  try {
    // Your feature logic here
    const result = {
      success: true,
      data: `Processed: ${input}`,
    };

    // Cache if needed
    featureCache.set(ctx.from.id, result);

    return result;
  } catch (error) {
    console.error(`[${FEATURE_NAME}] Error:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Get cached data for a user
 * @param {number} userId - Telegram user ID
 * @returns {object|null} Cached data or null
 */
export function getFeatureCache(userId) {
  return featureCache.get(userId) || null;
}

/**
 * Clear feature cache for a user
 * @param {number} userId - Telegram user ID
 */
export function clearFeatureCache(userId) {
  featureCache.delete(userId);
}

// =====================
// COMMAND HANDLER (Optional)
// =====================
// If your feature has a dedicated command, you can define the handler here
// Then register it in index.js: bot.command("myfeature", myFeatureCommand);

/**
 * Command handler for /myfeature
 * @param {object} ctx - Grammy context
 */
export async function myFeatureCommand(ctx) {
  const input = ctx.message.text.replace(/^\/myfeature\s*/i, '').trim();
  
  if (!input) {
    return ctx.reply(
      `🔧 <b>${FEATURE_NAME}</b>\n\n` +
      `Usage: <code>/myfeature [input]</code>\n\n` +
      `Example: <code>/myfeature hello world</code>`,
      { parse_mode: 'HTML' }
    );
  }

  const result = await processFeature(ctx, input);
  
  if (result.success) {
    return ctx.reply(`✅ ${result.data}`, { parse_mode: 'HTML' });
  } else {
    return ctx.reply(`❌ Error: ${result.error}`, { parse_mode: 'HTML' });
  }
}

// =====================
// CALLBACK HANDLER (Optional)
// =====================
// If your feature has callback buttons, define handlers here
// Then register in index.js: bot.callbackQuery(/^myfeature_/, myFeatureCallback);

/**
 * Callback handler for myfeature_* buttons
 * @param {object} ctx - Grammy context
 */
export async function myFeatureCallback(ctx) {
  const data = ctx.callbackQuery.data;
  const action = data.replace('myfeature_', '');

  await ctx.answerCallbackQuery();

  switch (action) {
    case 'action1':
      // Handle action1
      break;
    case 'action2':
      // Handle action2
      break;
    default:
      console.log(`[${FEATURE_NAME}] Unknown callback: ${action}`);
  }
}
