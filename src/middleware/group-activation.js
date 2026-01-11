/**
 * middleware/group-activation.js
 * Auto-extracted from index.js
 */

// =====================
// GROUP ACTIVATION SYSTEM
// Lines 1546-1580 from original index.js
// =====================

  
  // Check 5: Suspicious patterns (URLs, mentions, etc.)
  if (messageText) {
    const urlCount = (messageText.match(/https?:\/\//gi) || []).length;
    const mentionCount = (messageText.match(/@\w+/g) || []).length;
    
    if (urlCount > 3 || mentionCount > 5) {
      return {
        isSpam: true,
        reason: "Suspicious content pattern",
        severity: "low"
      };
    }
  }
  
  return { isSpam: false };
}

function trackMessage(userId, messageText) {
  const record = getSpamRecord(userId);
  const nowMs = Date.now();
  
  record.messages.push({
    text: messageText || "",
    timestamp: nowMs
  });
  
  cleanOldMessages(record, nowMs);
}

async function handleSpamDetection(ctx, spamResult, userId) {
  const record = getSpamRecord(userId);
  const nowMs = Date.now();
  
  record.spamCount = (record.spamCount || 0) + 1;

