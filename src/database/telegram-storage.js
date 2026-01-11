/**
 * database/telegram-storage.js
 * Auto-extracted from index.js
 */

// =====================
// TELEGRAM CHANNEL STORAGE
// Lines 719-755 from original index.js
// =====================

  
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

