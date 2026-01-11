/**
 * LLM Client Module
 * Handles API calls to different LLM providers
 */

import OpenAI from "openai";
import { MEGALLM_API_KEY, GITHUB_PAT } from "../config/index.js";
import { withTimeout } from "../utils/helpers.js";
import { 
  LLM_PROVIDERS, 
  getEnabledProviders, 
  getProviderForModel,
  getFallbackModel,
  recordProviderCall,
  providerStats
} from "./providers.js";

// Initialize OpenAI client for MegaLLM
export const openai = new OpenAI({
  apiKey: MEGALLM_API_KEY,
  baseURL: LLM_PROVIDERS.megallm.endpoint,
});

// =====================
// Response Cleaning
// =====================

/**
 * Clean response from thinking tokens and artifacts
 */
export function cleanLLMResponse(text) {
  if (!text) return '';
  
  let cleaned = text;
  
  // Handle thinking models that wrap entire response in thinking tags
  const thinkMatch = cleaned.match(/<think>[\s\S]*?<\/think>([\s\S]*)/i);
  if (thinkMatch && thinkMatch[1]?.trim()) {
    cleaned = thinkMatch[1];
  } else {
    cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, '');
  }
  
  // Pattern 2: <thinking>...</thinking>
  const thinkingMatch = cleaned.match(/<thinking>[\s\S]*?<\/thinking>([\s\S]*)/i);
  if (thinkingMatch && thinkingMatch[1]?.trim()) {
    cleaned = thinkingMatch[1];
  } else {
    cleaned = cleaned.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '');
  }
  
  // Pattern 3: **Thinking:** headers
  cleaned = cleaned.replace(/\*\*(?:Thinking|Reasoning|Analysis):\*\*[\s\S]*?(?=\*\*(?:Response|Answer|Output):\*\*|$)/gi, '');
  cleaned = cleaned.replace(/\*\*(?:Response|Answer|Output):\*\*/gi, '');
  
  // Pattern 4: Chinese thinking markers
  const chineseThinkMatch = cleaned.match(/[思考过程分析]+[:：][\s\S]*?[回答结果输出]+[:：]([\s\S]*)/i);
  if (chineseThinkMatch && chineseThinkMatch[1]?.trim()) {
    cleaned = chineseThinkMatch[1];
  }
  
  // Remove remaining Chinese thinking phrases
  cleaned = cleaned.replace(/I'm[\u4e00-\u9fff]+ing[^.!?]*/gi, '');
  cleaned = cleaned.replace(/[\u4e00-\u9fff]+ing\s*(about|your|the|this)[^.!?]*/gi, '');
  
  // Remove standalone thinking status lines
  const statusLinePattern = /^.*?(thinking|reasoning|\u601d\u8003|\u8003\u8651)\s*(in progress|about|\.\.\.).*$/gim;
  const withoutStatus = cleaned.replace(statusLinePattern, '');
  if (withoutStatus.trim()) {
    cleaned = withoutStatus;
  }
  
  // Remove lines that are just "..."
  cleaned = cleaned.replace(/^\s*\.{3,}\s*$/gm, '');
  
  // Clean up multiple newlines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  
  return cleaned.trim();
}

// =====================
// Provider API Calls
// =====================

/**
 * Call GitHub Models API
 */
export async function callGitHubModels({ model, messages, temperature = 0.7, max_tokens = 350 }) {
  if (!GITHUB_PAT) {
    throw new Error('GitHub PAT not configured');
  }

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
      max_completion_tokens: max_tokens
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

/**
 * Call MegaLLM API
 */
export async function callMegaLLM({ model, messages, temperature = 0.7, max_tokens = 350 }) {
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

/**
 * Provider call wrapper with timeout
 */
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

// =====================
// Main LLM Interface
// =====================

/**
 * Main LLM call - uses intended provider with fallback
 */
export async function llmWithProviders({ 
  model, 
  messages, 
  temperature = 0.7, 
  max_tokens = 350, 
  retries = 2, 
  timeout = 15000, 
  preferredProvider = null 
}) {
  const providers = getEnabledProviders();
  
  if (providers.length === 0) {
    throw new Error('No LLM providers available');
  }

  // Auto-detect provider from model name
  const targetProvider = preferredProvider || getProviderForModel(model);
  console.log(`[LLM] Using provider: ${targetProvider} for model: ${model}`);
  
  const provider = providers.find(p => p.key === targetProvider);
  
  if (!provider) {
    throw new Error(`Provider '${targetProvider}' is not available or not configured`);
  }

  // Try the intended provider with retries
  let lastError = null;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    providerStats[provider.key].calls++;
    
    try {
      const startTime = Date.now();
      const result = await callProviderWithTimeout(provider.key, {
        model,
        messages,
        temperature,
        max_tokens
      }, timeout);
      
      const responseTime = Date.now() - startTime;
      recordProviderCall(provider.key, true, 0, responseTime);
      
      return result;
    } catch (error) {
      lastError = error;
      recordProviderCall(provider.key, false, 0, 0, error);
      console.error(`[LLM] ${provider.name} attempt ${attempt + 1} failed:`, error.message);
      
      // Check if it's a rate limit error
      const isRateLimit = error.message?.includes('rate') || 
                          error.message?.includes('429') ||
                          error.message?.includes('quota');
      
      if (isRateLimit && provider.key === 'github') {
        // Fall back to MegaLLM with a fallback model
        console.log('[LLM] Rate limited, falling back to MegaLLM...');
        const fallbackModel = getFallbackModel(model);
        
        try {
          const result = await callMegaLLM({
            model: fallbackModel,
            messages,
            temperature,
            max_tokens
          });
          recordProviderCall('megallm', true);
          return result;
        } catch (fallbackError) {
          recordProviderCall('megallm', false, 0, 0, fallbackError);
          console.error('[LLM] Fallback also failed:', fallbackError.message);
        }
      }
    }
  }
  
  throw lastError || new Error('All LLM attempts failed');
}

/**
 * Simple text completion helper
 */
export async function llmText(options) {
  return llmWithProviders(options);
}

/**
 * Vision-capable LLM call
 */
export async function llmVision({ model, messages, imageUrl, prompt, max_tokens = 500 }) {
  const visionMessages = [
    ...messages,
    {
      role: "user",
      content: [
        { type: "text", text: prompt },
        { type: "image_url", image_url: { url: imageUrl } }
      ]
    }
  ];
  
  return llmWithProviders({
    model,
    messages: visionMessages,
    max_tokens,
    timeout: 30000 // Longer timeout for vision
  });
}
