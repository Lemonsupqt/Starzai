/**
 * LLM Provider Configuration and Management
 */

import { MEGALLM_API_KEY, GITHUB_PAT } from "../config/index.js";

// =====================
// Provider Registry
// =====================

export const LLM_PROVIDERS = {
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
    cost: 0.00001,
    endpoint: 'https://models.github.ai/inference/chat/completions'
  },
  megallm: {
    name: 'MegaLLM',
    priority: 2,  // Fallback
    enabled: !!MEGALLM_API_KEY,
    models: {},
    cost: 0.001,
    endpoint: 'https://ai.megallm.io/v1'
  }
};

// Fallback models for MegaLLM
export const MEGALLM_FALLBACK_MODELS = {
  fast: 'deepseek-ai/deepseek-v3.1',
  balanced: 'qwen/qwen3-next-80b-a3b-instruct',
  quality: 'deepseek-ai/deepseek-v3.1'
};

// =====================
// Provider Statistics
// =====================

export const providerStats = {
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

/**
 * Record a provider API call
 */
export function recordProviderCall(provider, success, tokens = 0, responseTime = 0, error = null) {
  const stats = providerStats[provider];
  if (!stats) return;
  
  stats.calls++;
  stats.lastUsed = Date.now();
  
  if (success) {
    stats.successes++;
    stats.totalTokens += tokens;
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

/**
 * Get provider health status
 */
export function getProviderHealth(stats) {
  if (stats.calls === 0) return 'unknown';
  const successRate = (stats.successes / stats.calls) * 100;
  const recentError = stats.lastErrorTime && (Date.now() - stats.lastErrorTime) < 5 * 60 * 1000;
  
  if (successRate >= 95 && !recentError) return 'excellent';
  if (successRate >= 80) return 'good';
  if (successRate >= 50) return 'degraded';
  return 'critical';
}

/**
 * Get all provider statistics
 */
export function getProviderStats() {
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

/**
 * Get enabled providers sorted by priority
 */
export function getEnabledProviders() {
  return Object.entries(LLM_PROVIDERS)
    .filter(([_, provider]) => provider.enabled)
    .sort(([_, a], [__, b]) => a.priority - b.priority)
    .map(([key, provider]) => ({ key, ...provider }));
}

/**
 * Detect provider from model name
 */
export function getProviderForModel(model) {
  if (!model) return 'megallm';
  
  if (model.startsWith('openai/') || 
      model.startsWith('anthropic/') || 
      model.startsWith('google/') ||
      model.startsWith('microsoft/')) {
    return 'github';
  }
  
  return 'megallm';
}

/**
 * Get appropriate fallback model based on the original model tier
 */
export function getFallbackModel(originalModel) {
  if (originalModel?.includes('nano') || originalModel?.includes('mini')) {
    return MEGALLM_FALLBACK_MODELS.fast;
  } else if (originalModel?.includes('chat') || originalModel?.includes('gpt-5-mini')) {
    return MEGALLM_FALLBACK_MODELS.balanced;
  } else {
    return MEGALLM_FALLBACK_MODELS.quality;
  }
}
