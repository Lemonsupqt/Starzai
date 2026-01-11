/**
 * Common Utility Functions
 */

import crypto from "crypto";

/**
 * Get current timestamp in milliseconds
 */
export function nowMs() {
  return Date.now();
}

/**
 * Generate a random ID string
 * @param {number} bytes - Number of random bytes (default: 6)
 */
export function makeId(bytes = 6) {
  return crypto.randomBytes(bytes).toString("hex");
}

/**
 * Parse human duration strings like "10m", "2h", "1d" or plain minutes ("30")
 * @param {string} input - Duration string
 * @returns {number|null} Duration in milliseconds or null if invalid
 */
export function parseDurationToMs(input) {
  if (!input) return null;
  const trimmed = String(input).trim().toLowerCase();

  const unitMatch = trimmed.match(/^(\d+)([smhd])$/);
  let value;
  let unit;

  if (unitMatch) {
    value = Number(unitMatch[1]);
    unit = unitMatch[2];
  } else if (/^\d+$/.test(trimmed)) {
    value = Number(trimmed);
    unit = "m"; // default to minutes
  } else {
    return null;
  }

  if (!Number.isFinite(value) || value <= 0) return null;

  const multipliers = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return value * multipliers[unit];
}

/**
 * Escape HTML special characters
 * @param {string} text - Text to escape
 */
export function escapeHTML(text) {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Truncate text to a maximum length with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 */
export function truncate(text, maxLength) {
  if (!text || text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}

/**
 * Sleep for a specified duration
 * @param {number} ms - Duration in milliseconds
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Wrap a promise with a timeout
 * @param {Promise} promise - Promise to wrap
 * @param {number} ms - Timeout in milliseconds
 * @param {string} message - Error message on timeout
 */
export function withTimeout(promise, ms, message = "Operation timed out") {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error(message)), ms)
    )
  ]);
}

/**
 * Format a date for display
 * @param {Date|string|number} date - Date to format
 */
export function formatDate(date) {
  const d = new Date(date);
  return d.toISOString().slice(0, 19).replace("T", " ");
}

/**
 * Format bytes to human readable string
 * @param {number} bytes - Number of bytes
 */
export function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * Deep clone an object
 * @param {object} obj - Object to clone
 */
export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Check if a value is empty (null, undefined, empty string, empty array, empty object)
 * @param {any} value - Value to check
 */
export function isEmpty(value) {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value).length === 0;
  return false;
}
