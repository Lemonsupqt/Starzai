/**
 * middleware/group-activation.js
 * Auto-extracted from index.js
 */

// =====================
// GROUP ACTIVATION SYSTEM
// Lines 1546-1580 from original index.js
// =====================

// =====================
// GROUP ACTIVATION SYSTEM
// =====================
// Bot is dormant by default in groups. Activates for 2 minutes after command/mention.
// During active window, responds to all messages. Goes dormant after inactivity.

function activateGroup(chatId) {
  const id = String(chatId);
  groupActiveUntil.set(id, Date.now() + GROUP_ACTIVE_DURATION);
}

function deactivateGroup(chatId) {
  const id = String(chatId);
  groupActiveUntil.delete(id);
}

function isGroupActive(chatId) {
  const id = String(chatId);
  const until = groupActiveUntil.get(id);
  if (!until) return false;
  if (Date.now() > until) {
    groupActiveUntil.delete(id); // Clean up expired
    return false;
  }
  return true;
}

function getGroupActiveRemaining(chatId) {
  const id = String(chatId);
  const until = groupActiveUntil.get(id);
  if (!until) return 0;
  const remaining = until - Date.now();
  return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
}


