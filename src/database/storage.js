/**
 * File-based Storage Utilities
 * Handles local JSON file storage as fallback
 */

import fs from "fs";
import path from "path";
import { DATA_DIR } from "../config/index.js";

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

/**
 * Read JSON from a file
 * @param {string} filePath - Path to the JSON file
 * @param {any} fallback - Fallback value if file doesn't exist
 */
export function readJson(filePath, fallback = {}) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, "utf8"));
    }
  } catch (e) {
    console.error(`Error reading ${filePath}:`, e.message);
  }
  return fallback;
}

/**
 * Write JSON to a file
 * @param {string} filePath - Path to the JSON file
 * @param {any} data - Data to write
 */
export function writeJson(filePath, data) {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (e) {
    console.error(`Error writing ${filePath}:`, e.message);
    return false;
  }
}

/**
 * Get the full path for a data file
 * @param {string} filename - Name of the file
 */
export function getDataPath(filename) {
  return path.join(DATA_DIR, filename);
}
