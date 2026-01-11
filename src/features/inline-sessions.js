/**
 * features/inline-sessions.js
 * Auto-extracted from index.js
 */

// =====================
// INLINE SESSION MANAGEMENT
// Lines 2239-2286 from original index.js
// =====================

  }
  
  // Max 10 saved characters
  if (u.savedCharacters.length >= 10) {
    return { success: false, message: "Max 10 characters! Remove one first." };
  }
  
  u.savedCharacters.push(characterName.trim());
  saveUsers();
  return { success: true, message: `Saved ${characterName}!` };
}

function removeCharacter(userId, characterName) {
  const u = ensureUser(userId);
  if (!u.savedCharacters) return { success: false, message: "No saved characters!" };
  
  const normalizedName = characterName.trim().toLowerCase();
  const index = u.savedCharacters.findIndex(c => c.toLowerCase() === normalizedName);
  
  if (index === -1) {
    return { success: false, message: "Character not found!" };
  }
  
  u.savedCharacters.splice(index, 1);
  saveUsers();
  return { success: true, message: `Removed ${characterName}!` };
}

function setActiveCharacter(userId, chatId, characterName) {
  const u = ensureUser(userId);
  const chatKey = String(chatId);
  
  if (!u.activeCharacter) u.activeCharacter = {};
  
  if (characterName) {
    u.activeCharacter[chatKey] = {
      name: characterName,
      activatedAt: Date.now(),
    };
  } else {
    delete u.activeCharacter[chatKey];
  }
  saveUsers();
}

function getActiveCharacter(userId, chatId) {
  const u = ensureUser(userId);
  if (!u.activeCharacter) return null;

