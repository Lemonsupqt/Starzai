/**
 * Music Service Module (Virex/JioSaavn)
 * ─────────────────────────────────────
 * Search & download music via JioSaavn API (powers Virex-Dev.in)
 * Free, no API key required.
 *
 * Features:
 *  - Song search with metadata (title, artist, album, year, duration, artwork)
 *  - Direct download URLs in 5 quality tiers (12–320kbps)
 *  - Song suggestions / related tracks
 */

const JIOSAAVN_BASE = "https://jiosavan-api2.vercel.app/api";

// ── Quality tiers ──
const QUALITY_MAP = {
  low: "96kbps",
  medium: "160kbps",
  high: "320kbps",
};

// ── Helpers ──
function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function pickArtwork(images, preferredSize = "500x500") {
  if (!images || !images.length) return null;
  const match = images.find((i) => i.quality === preferredSize);
  return match ? match.url : images[images.length - 1].url;
}

function pickDownloadUrl(downloadUrls, quality = "high") {
  if (!downloadUrls || !downloadUrls.length) return null;
  const target = QUALITY_MAP[quality] || "320kbps";
  const match = downloadUrls.find((d) => d.quality === target);
  // fallback to highest available
  return match ? match.url : downloadUrls[downloadUrls.length - 1].url;
}

function primaryArtist(artists) {
  if (!artists) return "Unknown";
  if (artists.primary && artists.primary.length) {
    return artists.primary.map((a) => a.name).join(", ");
  }
  if (artists.all && artists.all.length) {
    return artists.all.map((a) => a.name).join(", ");
  }
  return "Unknown";
}

function sanitizeSong(raw) {
  return {
    id: raw.id,
    name: raw.name || "Unknown",
    artist: primaryArtist(raw.artists),
    album: raw.album ? raw.album.name : "",
    year: raw.year || "",
    duration: raw.duration || 0,
    durationStr: formatDuration(raw.duration || 0),
    language: raw.language || "",
    artwork: pickArtwork(raw.image),
    downloadUrls: raw.downloadUrl || [],
    url: raw.url || "",
  };
}

// ── API Methods ──

/**
 * Search songs by query
 * @param {string} query - Search term
 * @param {number} limit - Max results (default 7)
 * @returns {Promise<{success: boolean, results: Array, total: number}>}
 */
async function searchSongs(query, limit = 7) {
  try {
    const url = `${JIOSAAVN_BASE}/search/songs?query=${encodeURIComponent(query)}&limit=${limit}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Search API returned ${res.status}`);
    const data = await res.json();
    if (!data.success || !data.data || !data.data.results) {
      return { success: false, results: [], total: 0 };
    }
    return {
      success: true,
      results: data.data.results.map(sanitizeSong),
      total: data.data.total || 0,
    };
  } catch (err) {
    console.error("[Music] Search error:", err.message);
    return { success: false, results: [], total: 0, error: err.message };
  }
}

/**
 * Get song suggestions/related tracks
 * @param {string} songId - JioSaavn song ID
 * @param {number} limit - Max suggestions
 * @returns {Promise<Array>}
 */
async function getSuggestions(songId, limit = 5) {
  try {
    const url = `${JIOSAAVN_BASE}/songs/${songId}/suggestions?limit=${limit}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.success || !data.data) return [];
    return (Array.isArray(data.data) ? data.data : []).map(sanitizeSong);
  } catch (err) {
    console.error("[Music] Suggestions error:", err.message);
    return [];
  }
}

/**
 * Get song by ID
 * @param {string} songId - JioSaavn song ID
 * @returns {Promise<object|null>}
 */
async function getSongById(songId) {
  try {
    const url = `${JIOSAAVN_BASE}/songs/${songId}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.success || !data.data || !data.data.length) return null;
    return sanitizeSong(data.data[0]);
  } catch (err) {
    console.error("[Music] GetSong error:", err.message);
    return null;
  }
}

/**
 * Download a song buffer from CDN
 * @param {string} downloadUrl - Direct CDN URL
 * @returns {Promise<Buffer|null>}
 */
async function downloadSongBuffer(downloadUrl) {
  try {
    const res = await fetch(downloadUrl);
    if (!res.ok) throw new Error(`Download returned ${res.status}`);
    const arrayBuf = await res.arrayBuffer();
    return Buffer.from(arrayBuf);
  } catch (err) {
    console.error("[Music] Download error:", err.message);
    return null;
  }
}

module.exports = {
  searchSongs,
  getSuggestions,
  getSongById,
  downloadSongBuffer,
  pickDownloadUrl,
  pickArtwork,
  formatDuration,
  QUALITY_MAP,
};
