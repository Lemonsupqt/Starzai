/**
 * llm/bot.js
 * Auto-extracted from index.js
 */

// =====================
// BOT + LLM
// Lines 316-328 from original index.js
// =====================

// =====================
// BOT + LLM
// =====================
const bot = new Bot(BOT_TOKEN);

let BOT_ID = null;
let BOT_USERNAME = "";

const openai = new OpenAI({
  baseURL: "https://ai.megallm.io/v1",
  apiKey: MEGALLM_API_KEY,
});


