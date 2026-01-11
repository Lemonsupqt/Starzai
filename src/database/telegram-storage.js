/**
 * Telegram Channel Storage Module
 * Backup storage using Telegram channel documents
 */

import { STORAGE_CHANNEL_ID } from "../config/index.js";
import { readJson, writeJson, getDataPath } from "./storage.js";

// Track message IDs for each data type in the storage channel
const STORAGE_IDS_FILE = getDataPath("storageIds.json");
let storageMessageIds = readJson(STORAGE_IDS_FILE, {
  users: null,
  prefs: null,
  inlineSessions: null,
  partners: null,
  todos: null,
  collabTodos: null,
});

/**
 * Check if Telegram storage is configured
 */
export function isTelegramStorageConfigured() {
  return !!STORAGE_CHANNEL_ID;
}

/**
 * Save storage message IDs to file
 */
export function saveStorageIds() {
  writeJson(STORAGE_IDS_FILE, storageMessageIds);
}

/**
 * Get storage message ID for a data type
 * @param {string} dataType - Type of data
 */
export function getStorageMessageId(dataType) {
  return storageMessageIds[dataType] || null;
}

/**
 * Set storage message ID for a data type
 * @param {string} dataType - Type of data
 * @param {number} messageId - Telegram message ID
 */
export function setStorageMessageId(dataType, messageId) {
  storageMessageIds[dataType] = messageId;
  saveStorageIds();
}

/**
 * Save data to Telegram channel
 * @param {object} bot - Grammy bot instance
 * @param {string} dataType - Type of data
 * @param {any} data - Data to save
 */
export async function saveToTelegram(bot, dataType, data) {
  if (!isTelegramStorageConfigured()) return false;
  
  try {
    const json = JSON.stringify(data);
    const blob = new Blob([json], { type: "application/json" });
    const buffer = Buffer.from(await blob.arrayBuffer());
    
    // Delete old message if exists
    const oldMsgId = getStorageMessageId(dataType);
    if (oldMsgId) {
      try {
        await bot.api.deleteMessage(STORAGE_CHANNEL_ID, oldMsgId);
      } catch {
        // Ignore deletion errors
      }
    }
    
    // Send new document
    const msg = await bot.api.sendDocument(STORAGE_CHANNEL_ID, {
      source: buffer,
      filename: `${dataType}.json`,
    }, {
      caption: `${dataType} backup - ${new Date().toISOString()}`,
    });
    
    setStorageMessageId(dataType, msg.message_id);
    console.log(`Saved ${dataType} to Telegram (msg ${msg.message_id})`);
    return true;
  } catch (e) {
    console.error(`Failed to save ${dataType} to Telegram:`, e.message);
    return false;
  }
}

/**
 * Load data from Telegram channel
 * @param {object} bot - Grammy bot instance
 * @param {string} dataType - Type of data
 */
export async function loadFromTelegram(bot, dataType) {
  if (!isTelegramStorageConfigured()) return null;
  
  const msgId = getStorageMessageId(dataType);
  if (!msgId) return null;
  
  try {
    // Get file info
    const file = await bot.api.getFile(msgId);
    const fileUrl = `https://api.telegram.org/file/bot${bot.token}/${file.file_path}`;
    
    // Download and parse
    const response = await fetch(fileUrl);
    if (!response.ok) return null;
    
    const data = await response.json();
    console.log(`Loaded ${dataType} from Telegram`);
    return data;
  } catch (e) {
    console.error(`Failed to load ${dataType} from Telegram:`, e.message);
    return null;
  }
}
