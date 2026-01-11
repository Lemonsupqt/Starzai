/**
 * Database Manager
 * Coordinates data persistence across multiple storage backends
 */

import { supabaseGet, supabaseSet, isSupabaseConfigured } from "./supabase.js";
import { saveToTelegram, loadFromTelegram, isTelegramStorageConfigured } from "./telegram-storage.js";
import { readJson, writeJson, getDataPath } from "./storage.js";

// =====================
// In-Memory Data Stores
// =====================

// Users database
export let usersDb = { users: {} };

// Preferences database
export let prefsDb = { groups: {} };

// Inline sessions database
export let inlineSessionsDb = { sessions: {} };

// Partners database
export let partnersDb = { partners: {} };

// Todos database
export let todosDb = { users: {} };

// Collaborative todos database
export let collabTodosDb = { lists: {} };

// =====================
// Save Queue System
// =====================

const saveQueue = new Map(); // dataType -> { timeout, priority }
const SAVE_DELAYS = {
  immediate: 0,
  high: 1000,      // 1 second
  normal: 5000,    // 5 seconds
  low: 30000       // 30 seconds
};

/**
 * Schedule a save operation with debouncing
 * @param {string} dataType - Type of data to save
 * @param {string} priority - Save priority (immediate, high, normal, low)
 */
export function scheduleSave(dataType, priority = 'normal') {
  const existing = saveQueue.get(dataType);
  
  // If there's already a higher priority save scheduled, don't override
  if (existing && SAVE_DELAYS[existing.priority] < SAVE_DELAYS[priority]) {
    return;
  }
  
  // Clear existing timeout
  if (existing?.timeout) {
    clearTimeout(existing.timeout);
  }
  
  const delay = SAVE_DELAYS[priority] || SAVE_DELAYS.normal;
  
  const timeout = setTimeout(async () => {
    saveQueue.delete(dataType);
    await performSave(dataType);
  }, delay);
  
  saveQueue.set(dataType, { timeout, priority });
}

/**
 * Perform the actual save operation
 * @param {string} dataType - Type of data to save
 */
async function performSave(dataType) {
  const data = getDataByType(dataType);
  if (!data) return;
  
  // Try Supabase first
  if (isSupabaseConfigured()) {
    const success = await supabaseSet(dataType, data);
    if (success) {
      console.log(`Saved ${dataType} to Supabase`);
      return;
    }
  }
  
  // Fall back to local file
  const filePath = getDataPath(`${dataType}.json`);
  writeJson(filePath, data);
  console.log(`Saved ${dataType} to local file`);
}

/**
 * Get data object by type
 * @param {string} dataType - Type of data
 */
function getDataByType(dataType) {
  switch (dataType) {
    case 'users': return usersDb;
    case 'prefs': return prefsDb;
    case 'inlineSessions': return inlineSessionsDb;
    case 'partners': return partnersDb;
    case 'todos': return todosDb;
    case 'collabTodos': return collabTodosDb;
    default: return null;
  }
}

// =====================
// Convenience Save Functions
// =====================

export function saveUsers(priority = 'normal') {
  scheduleSave('users', priority);
}

export function savePrefs(priority = 'normal') {
  scheduleSave('prefs', priority);
}

export function saveInlineSessions(priority = 'low') {
  scheduleSave('inlineSessions', priority);
}

export function savePartners(priority = 'normal') {
  scheduleSave('partners', priority);
}

export function saveTodos(priority = 'normal') {
  scheduleSave('todos', priority);
}

export function saveCollabTodos(priority = 'normal') {
  scheduleSave('collabTodos', priority);
}

// =====================
// Load Functions
// =====================

/**
 * Load all data from Supabase
 */
export async function loadFromSupabase() {
  if (!isSupabaseConfigured()) {
    console.log("No Supabase configured, skipping.");
    return false;
  }
  
  console.log("Loading data from Supabase...");
  
  try {
    const [users, prefs, sessions, todos, collabTodos, partners] = await Promise.all([
      supabaseGet("users"),
      supabaseGet("prefs"),
      supabaseGet("inlineSessions"),
      supabaseGet("todos"),
      supabaseGet("collabTodos"),
      supabaseGet("partners"),
    ]);
    
    if (users) {
      usersDb = users;
      console.log(`Loaded ${Object.keys(usersDb.users || {}).length} users from Supabase`);
    }
    if (prefs) {
      prefsDb = prefs;
      console.log(`Loaded prefs from Supabase`);
    }
    if (sessions) {
      inlineSessionsDb = sessions;
      console.log(`Loaded inline sessions from Supabase`);
    }
    if (todos) {
      todosDb = todos;
      console.log(`Loaded todos from Supabase`);
    }
    if (collabTodos) {
      collabTodosDb = collabTodos;
      console.log(`Loaded ${Object.keys(collabTodosDb.lists || {}).length} collab lists from Supabase`);
    }
    if (partners) {
      partnersDb = partners;
      console.log(`Loaded partners from Supabase`);
    }
    
    return true;
  } catch (e) {
    console.error("Failed to load from Supabase:", e.message);
    return false;
  }
}

/**
 * Load all data from local files
 */
export function loadFromLocalFiles() {
  console.log("Loading data from local files...");
  
  usersDb = readJson(getDataPath("users.json"), { users: {} });
  prefsDb = readJson(getDataPath("prefs.json"), { groups: {} });
  inlineSessionsDb = readJson(getDataPath("inlineSessions.json"), { sessions: {} });
  partnersDb = readJson(getDataPath("partners.json"), { partners: {} });
  todosDb = readJson(getDataPath("todos.json"), { users: {} });
  collabTodosDb = readJson(getDataPath("collabTodos.json"), { lists: {} });
  
  console.log(`Loaded ${Object.keys(usersDb.users || {}).length} users from local files`);
}

/**
 * Initialize database - load from best available source
 */
export async function initializeDatabase() {
  // Try Supabase first
  const supabaseLoaded = await loadFromSupabase();
  
  if (!supabaseLoaded) {
    // Fall back to local files
    loadFromLocalFiles();
  }
  
  return true;
}
