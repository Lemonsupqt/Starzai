/**
 * llm/bot.js
 * Auto-extracted from index.js
 */

// =====================
// BOT + LLM
// Lines 316-328 from original index.js
// =====================

      scheduleSave('imageStats', 'normal');
    }
  },
  
  // Record a failed API call
  recordFailure(key, error) {
    const keyId = this.getKeyId(key);
    const stats = this.keyStats.get(keyId);
    if (stats) {
      stats.calls++;
      stats.failures++;
      stats.lastUsed = Date.now();
      stats.lastError = error?.message || String(error);

