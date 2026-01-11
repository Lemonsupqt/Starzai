/**
 * llm/providers.js
 * Auto-extracted from index.js
 */

// =====================
// MULTI-PROVIDER LLM SYSTEM
// Lines 329-718 from original index.js
// =====================

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
  
  let callFunction;
  if (providerKey === 'github') {
    callFunction = callGitHubModels(options);
  } else if (providerKey === 'megallm') {
    callFunction = callMegaLLM(options);
  } else {
    throw new Error(`Unknown provider: ${providerKey}`);
  }

  return withTimeout(
    callFunction,
    timeout,
    `${provider.name} timed out after ${timeout/1000}s`
  );
}

// Fallback models for MegaLLM (DeepSeek/Qwen - unlimited usage)
const MEGALLM_FALLBACK_MODELS = {
  fast: 'deepseek-ai/deepseek-v3.1',               // Fast responses
  balanced: 'qwen/qwen3-next-80b-a3b-instruct',    // Good balance
  quality: 'deepseek-ai/deepseek-v3.1'             // Best quality
};

// Get appropriate fallback model based on the original model tier
function getFallbackModel(originalModel) {
  // Map original models to fallback tiers
  if (originalModel?.includes('nano') || originalModel?.includes('mini')) {
    return MEGALLM_FALLBACK_MODELS.fast;
  } else if (originalModel?.includes('chat') || originalModel?.includes('gpt-5-mini')) {
    return MEGALLM_FALLBACK_MODELS.balanced;
  } else {
    return MEGALLM_FALLBACK_MODELS.quality;
  }
}

// Main LLM call - uses intended provider with MegaLLM fallback on rate limit/errors
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


