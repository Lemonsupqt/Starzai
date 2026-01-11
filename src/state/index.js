/**
 * state/index.js
 * Auto-extracted from index.js
 */

// =====================
// IN-MEMORY STATE
// Lines 1067-1159 from original index.js
// =====================

    if (dataType === "users") {
      data = usersDb;
      label = "📊 USERS_DATA";
    } else if (dataType === "prefs") {
      data = prefsDb;
      label = "⚙️ PREFS_DATA";
    } else if (dataType === "inlineSessions") {
      data = inlineSessionsDb;
      label = "💬 INLINE_SESSIONS";
    } else if (dataType === "partners") {
      data = partnersDb;
      label = "🤝🏻 PARTNERS_DATA";
    } else if (dataType === "todos") {
      data = todosDb;
      label = "📋 TODOS_DATA";
    } else if (dataType === "collabTodos") {
      data = collabTodosDb;
      label = "👥 COLLAB_TODOS_DATA";
    } else {
      return;
    }
    
    const jsonStr = JSON.stringify(data);
    
    // Always use document upload - more reliable and no size/formatting issues
    const buffer = Buffer.from(jsonStr, "utf8");
    const inputFile = new InputFile(buffer, `${dataType}.json`);
    
    if (storageMessageIds[dataType]) {
      // Delete old message and send new one (can't edit documents)
      try {
        await bot.api.deleteMessage(STORAGE_CHANNEL_ID, storageMessageIds[dataType]);
      } catch (e) {
        // Ignore delete errors
      }
    }
    
    const msg = await bot.api.sendDocument(STORAGE_CHANNEL_ID, inputFile, {
      caption: `${label} | Updated: ${new Date().toISOString()}`,
    });
    storageMessageIds[dataType] = msg.message_id;
    saveStorageIds(); // Persist message ID so we can delete it after restart
    console.log(`Saved ${dataType} to Telegram (msg_id: ${msg.message_id})`);
    
    // Also save locally as backup
    if (dataType === "users") writeJson(USERS_FILE, usersDb);
    if (dataType === "prefs") writeJson(PREFS_FILE, prefsDb);
    if (dataType === "inlineSessions") writeJson(INLINE_SESSIONS_FILE, inlineSessionsDb);
    if (dataType === "partners") writeJson(PARTNERS_FILE, partnersDb);
    if (dataType === "todos") writeJson(TODOS_FILE, todosDb);
    if (dataType === "collabTodos") writeJson(COLLAB_TODOS_FILE, collabTodosDb);
    
  } catch (e) {
    console.error(`Failed to save ${dataType} to Telegram:`, e.message);
    // Fallback to local storage
    if (dataType === "users") writeJson(USERS_FILE, usersDb);
    if (dataType === "prefs") writeJson(PREFS_FILE, prefsDb);
    if (dataType === "inlineSessions") writeJson(INLINE_SESSIONS_FILE, inlineSessionsDb);
    if (dataType === "partners") writeJson(PARTNERS_FILE, partnersDb);
    if (dataType === "todos") writeJson(TODOS_FILE, todosDb);
    if (dataType === "collabTodos") writeJson(COLLAB_TODOS_FILE, collabTodosDb);
  }
}

async function loadFromTelegram() {
  if (!STORAGE_CHANNEL_ID) {
    console.log("No STORAGE_CHANNEL_ID set, using local storage only.");
    return;
  }
  
  console.log("Loading data from Telegram storage channel...");
  
  try {
    // Verify channel access
    const chat = await bot.api.getChat(STORAGE_CHANNEL_ID);
    console.log(`Storage channel verified: ${chat.title || chat.id}`);
    
    // Search for recent messages with our data files
    // We need to find the most recent users.json, prefs.json, and inline_sessions.json
    const dataTypes = ["users", "prefs", "inlineSessions"];
    const labels = {
      users: "📊 USERS_DATA",
      prefs: "⚙️ PREFS_DATA",
      inlineSessions: "💬 INLINE_SESSIONS"
    };
    
    // Get recent messages from channel (search last 50 messages)
    // Note: We can't search, so we'll rely on pinned messages or just use local + save
    // For now, let's just verify and use local files, but ensure we save properly
    
    console.log("Telegram storage ready. Using local files as primary, syncing to Telegram.");
    console.log(`Loaded users: ${Object.keys(usersDb.users || {}).length}`);
    

