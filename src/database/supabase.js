/**
 * Supabase Storage Module
 * Primary persistent storage using Supabase
 */

import { SUPABASE_URL, SUPABASE_KEY } from "../config/index.js";

/**
 * Check if Supabase is configured
 */
export function isSupabaseConfigured() {
  return !!(SUPABASE_URL && SUPABASE_KEY);
}

/**
 * Get data from Supabase
 * @param {string} key - Data key to retrieve
 */
export async function supabaseGet(key) {
  if (!isSupabaseConfigured()) return null;
  
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/bot_data?key=eq.${key}&select=value`, {
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
      },
    });
    
    if (!res.ok) return null;
    const data = await res.json();
    return data.length > 0 ? data[0].value : null;
  } catch (e) {
    console.error(`Supabase GET ${key} error:`, e.message);
    return null;
  }
}

/**
 * Set data in Supabase
 * @param {string} key - Data key
 * @param {any} value - Data value
 */
export async function supabaseSet(key, value) {
  if (!isSupabaseConfigured()) return false;
  
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/bot_data`, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates",
      },
      body: JSON.stringify({
        key,
        value,
        updated_at: new Date().toISOString(),
      }),
    });
    return res.ok;
  } catch (e) {
    console.error(`Supabase SET ${key} error:`, e.message);
    return false;
  }
}

/**
 * Delete data from Supabase
 * @param {string} key - Data key to delete
 */
export async function supabaseDelete(key) {
  if (!isSupabaseConfigured()) return false;
  
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/bot_data?key=eq.${key}`, {
      method: "DELETE",
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
      },
    });
    return res.ok;
  } catch (e) {
    console.error(`Supabase DELETE ${key} error:`, e.message);
    return false;
  }
}
