/**
 * database/supabase.js
 * Auto-extracted from index.js
 */

// =====================
// SUPABASE STORAGE
// Lines 756-1066 from original index.js
// =====================

async function llmWithProviders({ model, messages, temperature = 0.7, max_tokens = 350, retries = 2, timeout = 15000, preferredProvider = null }) {
  const providers = getEnabledProviders();
  
  if (providers.length === 0) {
    throw new Error('No LLM providers available');
  }

  // Auto-detect provider from model name
  const targetProvider = preferredProvider || getProviderForModel(model);
  console.log(`[LLM] Using provider: ${targetProvider} for model: ${model}`);
  
  // Find the target provider
  const provider = providers.find(p => p.key === targetProvider);
  
  if (!provider) {
    throw new Error(`Provider '${targetProvider}' is not available or not configured`);
  }

  // Try the intended provider with retries
  let lastError = null;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    providerStats[provider.key].calls++;
    
    try {
      console.log(`[LLM] ${provider.name} attempt ${attempt + 1}/${retries + 1} with model: ${model}...`);
      
      const result = await callProviderWithTimeout(
        provider.key,
        { model, messages, temperature, max_tokens },
        timeout
      );
      
      providerStats[provider.key].successes++;
      console.log(`[LLM] ✅ Success with ${provider.name}`);
      
      return { content: result, provider: provider.key };
    } catch (error) {
      providerStats[provider.key].failures++;
      lastError = error;
      console.error(`[LLM] ❌ ${provider.name} attempt ${attempt + 1} failed:`, error.message);
      
      // Only retry on timeout errors within the same provider
      if (!error.message?.includes('timed out') && !error.message?.includes('timeout')) {
        break; // Don't retry on non-timeout errors, go to fallback
      }
      
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 1000)); // Wait 1s before retry
      }
    }
  }

  // Primary provider failed - try MegaLLM fallback with DeepSeek/Qwen (unlimited usage)
  const megallmProvider = providers.find(p => p.key === 'megallm');
  
  if (megallmProvider && targetProvider !== 'megallm') {
    const fallbackModel = getFallbackModel(model);
    console.log(`[LLM] ⚡ Falling back to MegaLLM with ${fallbackModel}...`);
    
    // Cap max_tokens at 400 for nano/mini models to keep responses concise
    const fallbackMaxTokens = (model?.toLowerCase().includes('nano') || model?.toLowerCase().includes('mini')) 
      ? Math.min(max_tokens, 400) 
      : max_tokens;
    
    providerStats.megallm.calls++;
    
    try {
      const result = await callProviderWithTimeout(
        'megallm',
        { model: fallbackModel, messages, temperature, max_tokens: fallbackMaxTokens },
        timeout
      );
      
      providerStats.megallm.successes++;
      console.log(`[LLM] ✅ Fallback success with MegaLLM (${fallbackModel})`);
      
      return { content: result, provider: 'megallm', fallback: true, fallbackModel };
    } catch (fallbackError) {
      providerStats.megallm.failures++;
      console.error(`[LLM] ❌ MegaLLM fallback also failed:`, fallbackError.message);
    }
  }

  // All providers failed
  throw lastError || new Error(`All providers failed for model: ${model}`);
}

// =====================
// TELEGRAM CHANNEL STORAGE
// Persists data in a Telegram channel - survives redeployments!
// =====================
const DATA_DIR = process.env.DATA_DIR || ".data";
const USERS_FILE = path.join(DATA_DIR, "users.json");
const PREFS_FILE = path.join(DATA_DIR, "prefs.json");
const INLINE_SESSIONS_FILE = path.join(DATA_DIR, "inline_sessions.json");
const PARTNERS_FILE = path.join(DATA_DIR, "partners.json");
const TODOS_FILE = path.join(DATA_DIR, "todos.json");
const COLLAB_TODOS_FILE = path.join(DATA_DIR, "collab_todos.json");

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}
ensureDir();

function readJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}
function writeJson(file, obj) {
  fs.writeFileSync(file, JSON.stringify(obj, null, 2), "utf8");
}

// Initialize with local fallback (will be overwritten by Supabase/Telegram data on startup)
let usersDb = readJson(USERS_FILE, { users: {} });
let prefsDb = readJson(PREFS_FILE, { userModel: {}, groups: {} });
let inlineSessionsDb = readJson(INLINE_SESSIONS_FILE, { sessions: {} });
let partnersDb = readJson(PARTNERS_FILE, { partners: {} });
let todosDb = readJson(TODOS_FILE, { todos: {} });
let collabTodosDb = readJson(COLLAB_TODOS_FILE, { lists: {}, userLists: {} });

// =====================
// SUPABASE STORAGE (Primary - permanent persistence)
// =====================
async function supabaseGet(key) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/bot_data?key=eq.${key}&select=value`, {
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.length > 0 ? data[0].value : null;
  } catch (e) {
    console.error(`Supabase GET ${key} error:`, e.message);
    return null;
  }
}

async function supabaseSet(key, value) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return false;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/bot_data`, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates",
      },
      body: JSON.stringify({
        key,
        value,
        updated_at: new Date().toISOString(),
      }),
    });
    return res.ok;
  } catch (e) {
    console.error(`Supabase SET ${key} error:`, e.message);
    return false;
  }
}

async function loadFromSupabase() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.log("No Supabase configured, skipping.");
    return false;
  }
  
  console.log("Loading data from Supabase...");
  
  try {
    const [users, prefs, sessions, imageStats, todos, collabTodos] = await Promise.all([
      supabaseGet("users"),
      supabaseGet("prefs"),
      supabaseGet("inlineSessions"),
      supabaseGet("imageStats"),
      supabaseGet("todos"),
      supabaseGet("collabTodos"),
    ]);
    
    if (users) {
      usersDb = users;
      console.log(`Loaded ${Object.keys(usersDb.users || {}).length} users from Supabase`);
    }
    if (prefs) {
      prefsDb = prefs;
      console.log(`Loaded prefs from Supabase`);
    }
    if (sessions) {
      inlineSessionsDb = sessions;
      console.log(`Loaded inline sessions from Supabase`);
    }
    if (imageStats) {
      deapiKeyManager.loadStats(imageStats);
    }
    if (todos) {
      todosDb = todos;
      console.log(`Loaded todos from Supabase`);
    }
    if (collabTodos) {
      collabTodosDb = collabTodos;
      console.log(`Loaded ${Object.keys(collabTodosDb.lists || {}).length} collab lists from Supabase`);
    }
    
    return true;
  } catch (e) {
    console.error("Failed to load from Supabase:", e.message);
    return false;
  }
}

async function saveToSupabase(dataType) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return false;
  
  let data;
  if (dataType === "users") data = usersDb;
  else if (dataType === "prefs") data = prefsDb;
  else if (dataType === "inlineSessions") data = inlineSessionsDb;
  else if (dataType === "partners") data = partnersDb;
  else if (dataType === "imageStats") data = deapiKeyManager.getPersistentStats();
  else if (dataType === "todos") data = todosDb;
  else if (dataType === "collabTodos") data = collabTodosDb;
  else return false;
  
  const success = await supabaseSet(dataType, data);
  if (success) {
    console.log(`Saved ${dataType} to Supabase`);
  }
  return success;
}

// Track message IDs for each data type in the storage channel
// Persist to file so we can delete old messages after restart
const STORAGE_IDS_FILE = path.join(DATA_DIR, "storageIds.json");
let storageMessageIds = readJson(STORAGE_IDS_FILE, {
  users: null,
  prefs: null,
  inlineSessions: null,
});

function saveStorageIds() {
  writeJson(STORAGE_IDS_FILE, storageMessageIds);
}

// Debounce saves to avoid hitting Telegram rate limits
let saveTimeout = null;
let pendingSaves = new Set();

function scheduleSave(dataType, priority = 'normal') {
  pendingSaves.add(dataType);
  if (saveTimeout) clearTimeout(saveTimeout);
  
  // Priority-based save delays for better performance
  // High priority: 2 seconds (critical data like user records)
  // Normal priority: 5 seconds (stats, preferences)
  // Low priority: 10 seconds (analytics, non-critical)
  const delay = priority === 'high' ? 2000 : 
                priority === 'normal' ? 5000 : 10000;
  
  saveTimeout = setTimeout(() => {
    // Don't await - let saves happen in background without blocking requests
    flushSaves().catch(err => {
      console.error("❌ Background save error:", err);
    });
  }, delay);
}

async function flushSaves() {
  if (pendingSaves.size === 0) return;
  const toSave = [...pendingSaves];
  pendingSaves.clear();
  
  for (const dataType of toSave) {
    // Try Supabase first (permanent), then Telegram as backup
    const supabaseOk = await saveToSupabase(dataType);
    if (!supabaseOk) {
      // Fall back to Telegram channel storage
      await saveToTelegram(dataType);
    } else {
      // Also save locally as backup
      if (dataType === "users") writeJson(USERS_FILE, usersDb);
      if (dataType === "prefs") writeJson(PREFS_FILE, prefsDb);
      if (dataType === "inlineSessions") writeJson(INLINE_SESSIONS_FILE, inlineSessionsDb);
      if (dataType === "partners") writeJson(PARTNERS_FILE, partnersDb);
      if (dataType === "todos") writeJson(TODOS_FILE, todosDb);
    }
  }
}

async function saveToTelegram(dataType) {
  if (!STORAGE_CHANNEL_ID) {
    // Fallback to local file storage
    if (dataType === "users") writeJson(USERS_FILE, usersDb);
    if (dataType === "prefs") writeJson(PREFS_FILE, prefsDb);
    if (dataType === "inlineSessions") writeJson(INLINE_SESSIONS_FILE, inlineSessionsDb);
    if (dataType === "partners") writeJson(PARTNERS_FILE, partnersDb);
    if (dataType === "todos") writeJson(TODOS_FILE, todosDb);
    if (dataType === "collabTodos") writeJson(COLLAB_TODOS_FILE, collabTodosDb);
    return;
  }
  
  try {
    let data, label;

