/**
 * llm/providers.js
 * Auto-extracted from index.js
 */

// =====================
// MULTI-PROVIDER LLM SYSTEM
// Lines 329-718 from original index.js
// =====================

      stats.consecutiveFailures++;
      
      // Disable key temporarily after 3 consecutive failures
      if (stats.consecutiveFailures >= 3) {
        stats.disabled = true;
        stats.disabledUntil = Date.now() + (5 * 60 * 1000); // 5 minute cooldown
        console.warn(`[DeAPI] Disabled key ${keyId} for 5 minutes after ${stats.consecutiveFailures} consecutive failures`);
      }
    }
  },
  
  // Fetch balance for a specific key
  async fetchBalance(key) {
    try {
      const response = await fetch('https://api.deapi.ai/api/v1/client/balance', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${key}`,
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        console.warn(`[DeAPI] Failed to fetch balance for key ${this.getKeyId(key)}: ${response.status}`);
        return null;
      }
      
      const data = await response.json();
      // Handle various response formats
      const balance = data?.data?.balance ?? data?.balance ?? data?.credits ?? data?.data?.credits ?? null;
      return balance;
    } catch (error) {
      console.warn(`[DeAPI] Error fetching balance for key ${this.getKeyId(key)}:`, error.message);
      return null;
    }
  },
  
  // Fetch balances for all keys
  async fetchAllBalances() {
    const balances = new Map();
    
    for (const key of DEAPI_KEYS) {
      const keyId = this.getKeyId(key);
      const balance = await this.fetchBalance(key);
      balances.set(keyId, balance);
      
      // Update stats with balance
      const stats = this.keyStats.get(keyId);
      if (stats) {
        stats.balance = balance;
        stats.balanceUpdatedAt = Date.now();
      }
    }
    
    return balances;
  },
  
  // Get stats for owner status command
  getStats() {
    const result = {
      totalKeys: DEAPI_KEYS.length,
      activeKeys: 0,
      disabledKeys: 0,
      totalCalls: 0,
      totalSuccesses: 0,
      totalFailures: 0,
      keys: []
    };
    
    for (const [keyId, stats] of this.keyStats.entries()) {
      if (stats.disabled) {
        result.disabledKeys++;
      } else {
        result.activeKeys++;
      }
      result.totalCalls += stats.calls;
      result.totalSuccesses += stats.successes;
      result.totalFailures += stats.failures;
      
      result.keys.push({
        id: keyId,
        ...stats,
        successRate: stats.calls > 0 ? Math.round((stats.successes / stats.calls) * 100) : 100
      });
    }
    
    return result;
  },
  
  // Get stats with fresh balances (async version)
  async getStatsWithBalances() {
    // Fetch fresh balances
    await this.fetchAllBalances();
    return this.getStats();
  },
  
  // Check if any keys are available
  hasKeys() {
    return DEAPI_KEYS.length > 0;
  }
};

// Initialize the key manager
deapiKeyManager.init();

// Legacy compatibility - returns first key or empty string
const DEAPI_KEY = DEAPI_KEYS[0] || "";

if (!BOT_TOKEN) throw new Error("Missing BOT_TOKEN");
if (!MEGALLM_API_KEY) throw new Error("Missing MEGALLM_API_KEY");
if (!GITHUB_PAT) console.warn("⚠️  GITHUB_PAT not set - GitHub Models will be unavailable");

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

// =====================
// MULTI-PROVIDER LLM SYSTEM
// =====================

// Provider statistics with enhanced tracking
const providerStats = {
  github: { 
    calls: 0, 
    successes: 0, 
    failures: 0, 
    totalTokens: 0,
    lastUsed: null,
    lastError: null,
    lastErrorTime: null,
    avgResponseTime: 0,
    responseTimeCount: 0
  },
  megallm: { 
    calls: 0, 
    successes: 0, 
    failures: 0, 
    totalTokens: 0,
    lastUsed: null,
    lastError: null,
    lastErrorTime: null,
    avgResponseTime: 0,
    responseTimeCount: 0
  }
};

// Helper functions for provider stats
function recordProviderCall(provider, success, tokens = 0, responseTime = 0, error = null) {
  const stats = providerStats[provider];
  if (!stats) return;
  
  stats.calls++;
  stats.lastUsed = Date.now();
  
  if (success) {
    stats.successes++;
    stats.totalTokens += tokens;
    // Update rolling average response time
    if (responseTime > 0) {
      stats.avgResponseTime = ((stats.avgResponseTime * stats.responseTimeCount) + responseTime) / (stats.responseTimeCount + 1);
      stats.responseTimeCount++;
    }
  } else {
    stats.failures++;
    stats.lastError = error?.message || String(error);
    stats.lastErrorTime = Date.now();
  }
}

function getProviderStats() {
  const result = {};
  for (const [key, stats] of Object.entries(providerStats)) {
    const provider = LLM_PROVIDERS[key];
    result[key] = {
      name: provider?.name || key,
      enabled: provider?.enabled || false,
      calls: stats.calls,
      successes: stats.successes,
      failures: stats.failures,
      successRate: stats.calls > 0 ? Math.round((stats.successes / stats.calls) * 100) : 100,
      totalTokens: stats.totalTokens,
      avgResponseTime: Math.round(stats.avgResponseTime),
      lastUsed: stats.lastUsed,
      lastError: stats.lastError,
      lastErrorTime: stats.lastErrorTime,
      health: getProviderHealth(stats)
    };
  }
  return result;
}

function getProviderHealth(stats) {
  if (stats.calls === 0) return 'unknown';
  const successRate = (stats.successes / stats.calls) * 100;
  const recentError = stats.lastErrorTime && (Date.now() - stats.lastErrorTime) < 5 * 60 * 1000;
  
  if (successRate >= 95 && !recentError) return 'excellent';
  if (successRate >= 80) return 'good';
  if (successRate >= 50) return 'degraded';
  return 'critical';
}

// Provider registry - easy to add more providers!
const LLM_PROVIDERS = {
  github: {
    name: 'GitHub Models',
    priority: 1,  // Lower = higher priority (try first)
    enabled: !!GITHUB_PAT,
    models: {
      fast: 'openai/gpt-5-nano',
      balanced: 'openai/gpt-4.1-nano', 
      quality: 'openai/gpt-5-mini'
    },
    defaultModel: 'openai/gpt-5-nano',
    cost: 0.00001,  // per token unit
    endpoint: 'https://models.github.ai/inference/chat/completions'
  },
  megallm: {
    name: 'MegaLLM',
    priority: 2,  // Fallback
    enabled: !!MEGALLM_API_KEY,
    models: {},  // Uses existing model system
    cost: 0.001,  // estimate per query
    endpoint: 'https://ai.megallm.io/v1'
  }
};

// Get enabled providers sorted by priority
function getEnabledProviders() {
  return Object.entries(LLM_PROVIDERS)
    .filter(([_, provider]) => provider.enabled)
    .sort(([_, a], [__, b]) => a.priority - b.priority)
    .map(([key, provider]) => ({ key, ...provider }));
}

// Detect provider from model name
function getProviderForModel(model) {
  if (!model) return 'megallm';
  
  // GitHub Models use format: "provider/model-name"
  if (model.startsWith('openai/') || 
      model.startsWith('anthropic/') || 
      model.startsWith('google/') ||
      model.startsWith('microsoft/')) {
    return 'github';
  }
  
  // Default to MegaLLM for all other models
  return 'megallm';
}

// Each provider uses its own model naming - no translation needed
// GitHub Models: "openai/gpt-4.1-nano", "openai/gpt-5-nano", "openai/gpt-5-mini", etc.
// MegaLLM: "gpt-4o", "gpt-4o-mini", etc.

// Clean response from thinking tokens and artifacts
// Properly handles thinking models by extracting actual response content
function cleanLLMResponse(text) {
  if (!text) return '';
  
  let cleaned = text;
  
  // Handle thinking models that wrap entire response in thinking tags
  // Extract content AFTER the thinking block, or content OUTSIDE thinking blocks
  
  // Pattern 1: <think>...</think> followed by actual response
  const thinkMatch = cleaned.match(/<think>[\s\S]*?<\/think>([\s\S]*)/i);
  if (thinkMatch && thinkMatch[1]?.trim()) {
    cleaned = thinkMatch[1];
  } else {
    // Just remove thinking blocks if there's content outside them
    cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, '');
  }
  
  // Pattern 2: <thinking>...</thinking> followed by actual response
  const thinkingMatch = cleaned.match(/<thinking>[\s\S]*?<\/thinking>([\s\S]*)/i);
  if (thinkingMatch && thinkingMatch[1]?.trim()) {
    cleaned = thinkingMatch[1];
  } else {
    cleaned = cleaned.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '');
  }
  
  // Pattern 3: Some models use **Thinking:** or similar headers
  // Remove thinking sections that start with headers
  cleaned = cleaned.replace(/\*\*(?:Thinking|Reasoning|Analysis):\*\*[\s\S]*?(?=\*\*(?:Response|Answer|Output):\*\*|$)/gi, '');
  cleaned = cleaned.replace(/\*\*(?:Response|Answer|Output):\*\*/gi, ''); // Remove the header itself
  
  // Pattern 4: Chinese thinking markers
  // 思考过程：... 回答：...
  const chineseThinkMatch = cleaned.match(/[思考过程分析]+[:：][\s\S]*?[回答结果输出]+[:：]([\s\S]*)/i);
  if (chineseThinkMatch && chineseThinkMatch[1]?.trim()) {
    cleaned = chineseThinkMatch[1];
  }
  
  // Remove remaining Chinese thinking phrases mixed with English
  cleaned = cleaned.replace(/I'm[\u4e00-\u9fff]+ing[^.!?]*/gi, '');
  cleaned = cleaned.replace(/[\u4e00-\u9fff]+ing\s*(about|your|the|this)[^.!?]*/gi, '');
  
  // Remove standalone thinking status lines (but not if they're the only content)
  const statusLinePattern = /^.*?(thinking|reasoning|\u601d\u8003|\u8003\u8651)\s*(in progress|about|\.\.\.).*$/gim;
  const withoutStatus = cleaned.replace(statusLinePattern, '');
  if (withoutStatus.trim()) {
    cleaned = withoutStatus;
  }
  
  // Remove lines that are just "..." or similar
  cleaned = cleaned.replace(/^\s*\.{3,}\s*$/gm, '');
  
  // Clean up multiple newlines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  
  return cleaned.trim();
}

// GitHub Models API call
async function callGitHubModels({ model, messages, temperature = 0.7, max_tokens = 350 }) {
  if (!GITHUB_PAT) {
    throw new Error('GitHub PAT not configured');
  }

  // Note: Some GitHub Models (gpt-5-nano, gpt-5-mini, gpt-5) only support default temperature (1.0)
  // We omit temperature parameter to use the default value
  const response = await fetch(LLM_PROVIDERS.github.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GITHUB_PAT}`,
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28'
    },
    body: JSON.stringify({
      model: model || LLM_PROVIDERS.github.defaultModel,
      messages,
      // temperature omitted - uses model default (required for gpt-5-nano, gpt-5-mini, gpt-5)
      max_completion_tokens: max_tokens  // GitHub Models uses max_completion_tokens, not max_tokens
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GitHub Models API error (${response.status}): ${error}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  
  if (!content) {
    throw new Error('No content in GitHub Models response');
  }

  return cleanLLMResponse(content.trim());
}

// MegaLLM API call (wrapper for existing openai client)
async function callMegaLLM({ model, messages, temperature = 0.7, max_tokens = 350 }) {
  const resp = await openai.chat.completions.create({
    model,
    messages,
    temperature,
    max_tokens,
  });
  const rawContent = (resp?.choices?.[0]?.message?.content || "").trim();
  
  // Debug: Log raw response for thinking models
  if (model.includes('gemini') || model.includes('thinking') || model.includes('deepseek-r1')) {
    console.log(`[LLM DEBUG] Raw response (first 500 chars): ${rawContent.slice(0, 500)}`);
  }
  
  const cleaned = cleanLLMResponse(rawContent);
  
  // Debug: Log if cleaning resulted in empty output
  if (rawContent && !cleaned) {
    console.log(`[LLM DEBUG] Cleaning removed all content! Raw length: ${rawContent.length}`);
    console.log(`[LLM DEBUG] Raw content: ${rawContent.slice(0, 1000)}`);
  }
  
  return cleaned;
}

// Provider call wrapper with timeout
async function callProviderWithTimeout(providerKey, options, timeout) {
  const provider = LLM_PROVIDERS[providerKey];

