/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                         STARZAI SUPER UTILITIES MODULE                        ║
 * ║                    27 Features: Downloads, Utilities, Fun & More              ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 * 
 * Features included:
 * - Video Downloads: YouTube, TikTok, Instagram, Twitter
 * - Music: Spotify/Deezer download, Lyrics
 * - Movies: Info, Trailers, Where to Watch, Recommendations
 * - Utilities: QR, URL Shortener, Currency, Weather, Translate, OCR, TTS
 * - Knowledge: Wikipedia, Image Search, Dictionary, Facts, History
 * - Fun: Quotes, Truth or Dare, Would You Rather, Roast, Pickup Lines
 * - Dev: Code Runner
 * - Media: Wallpapers
 * 
 * UPDATED: Now uses API-based downloads instead of yt-dlp for Railway compatibility
 */

import fetch from 'node-fetch';
import QRCode from 'qrcode';
import { createCanvas, loadImage } from 'canvas';
import fs from 'fs';
import path from 'path';
import os from 'os';

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Decode HTML entities in a string
 * @param {string} text - Text with HTML entities
 * @returns {string} Decoded text
 */
function decodeHTMLEntities(text) {
  if (!text) return '';
  return text
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#34;/g, '"')
    .replace(/&#x22;/g, '"')
    .replace(/&nbsp;/g, ' ');
}

/**
 * Sanitize filename for safe file system usage
 * @param {string} name - Original filename
 * @returns {string} Sanitized filename
 */
function sanitizeFilename(name) {
  if (!name) return 'audio';
  return decodeHTMLEntities(name)
    .replace(/[<>:"/\\|?*]/g, '') // Remove invalid chars
    .replace(/\s+/g, ' ')          // Normalize spaces
    .trim()
    .slice(0, 100);                // Limit length
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  // Hugging Face Space yt-dlp API (Primary - self-hosted)
  hfspace: {
    // Replace with your HF Space URL after deployment
    api: process.env.HF_YTDLP_API || 'https://YOUR-USERNAME-starzai-ytdlp-api.hf.space',
    apiKey: process.env.HF_YTDLP_KEY || '',
    timeout: 120000  // 2 minutes for downloads
  },
  // Fallback APIs (if HF Space is down)
  downloader: {
    primary: 'https://social-media-video-downloader.p.rapidapi.com/smvd/get/all',
    fallbacks: [
      'https://all-media-downloader1.p.rapidapi.com/download',
      'https://youtube-video-download-info.p.rapidapi.com/dl'
    ],
    timeout: 60000
  },
  // TikWM API for TikTok
  tikwm: {
    api: 'https://www.tikwm.com/api/',
    timeout: 30000
  },
  // SSSTik API for TikTok (backup)
  ssstik: {
    api: 'https://ssstik.io',
    timeout: 30000
  },
  // Loader.to for audio/Spotify
  loaderto: {
    api: 'https://loader.to/ajax/download.php',
    timeout: 60000
  },
  tmdb: {
    api: 'https://api.themoviedb.org/3',
    key: process.env.TMDB_API_KEY || ''
  },
  weather: {
    api: 'https://wttr.in'
  },
  currency: {
    api: 'https://api.exchangerate-api.com/v4/latest'
  },
  translate: {
    api: 'https://api.mymemory.translated.net/get'
  },
  dictionary: {
    api: 'https://api.dictionaryapi.dev/api/v2/entries/en'
  },
  wikipedia: {
    api: 'https://en.wikipedia.org/api/rest_v1/page/summary'
  },
  // piston API is dead (whitelist-only since Feb 2026) — now using Godbolt + Wandbox
  lyrics: {
    api: 'https://api.lyrics.ovh/v1',
    lrclib: 'https://lrclib.net/api'
  },
  quotes: {
    api: 'https://api.quotable.io/random'
  },
  facts: {
    api: 'https://uselessfacts.jsph.pl/api/v2/facts/random'
  },
  wallhaven: {
    api: 'https://wallhaven.cc/api/v1/search'
  },
  // JioSaavn API for music downloads (free, 320kbps quality)
  // Multiple endpoints for fallback
  jiosaavn: {
    apis: [
      'https://jiosavan-api2.vercel.app',               // Primary - Virex (most reliable)
      'https://jiosaavn-api-privatecvc2.vercel.app',    // Fallback 1
      'https://saavn.dev/api',                          // Fallback 2
      'https://jiosaavn-api.vercel.app'                 // Fallback 3
    ],
    timeout: 30000
  }
};

// URL pattern matchers for auto-detection
const URL_PATTERNS = {
  // Video platforms
  youtube: /(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  tiktok: /(?:tiktok\.com\/@[\w.-]+\/video\/|vm\.tiktok\.com\/|tiktok\.com\/t\/)(\w+)/,
  instagram: /(?:instagram\.com\/(?:p|reel|reels|tv)\/)([\ w-]+)/,
  twitter: /(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/,
  facebook: /(?:facebook\.com|fb\.watch)\/(?:watch\/\?v=|[\w.]+\/videos\/|reel\/)?(\d+)?/,
  
  // Music platforms (for auto-detection)
  spotify: /(?:open\.spotify\.com\/(?:track|album|playlist)\/)([a-zA-Z0-9]+)/,
  jiosaavn: /(?:jiosaavn\.com\/song\/[\w-]+\/)([a-zA-Z0-9_-]+)/,
  soundcloud: /soundcloud\.com\/([\w-]+\/[\w-]+)/,
  deezer: /(?:deezer\.com\/(?:\w+\/)?track\/)([0-9]+)/,
  applemusic: /(?:music\.apple\.com\/\w+\/album\/[\w-]+\/)([0-9]+)/
};

// ═══════════════════════════════════════════════════════════════════════════════
// VIDEO/SOCIAL MEDIA DOWNLOADS (API-based - Railway compatible)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Download media using HF Space yt-dlp API (primary) with fallbacks
 * Supports: YouTube, Facebook, Twitter, Instagram, TikTok, etc.
 */
async function downloadWithVKR(url, audioOnly = false) {
  const errors = [];
  
  // DEBUG: Log HF Space config
  console.log('[Download] HF_YTDLP_API:', CONFIG.hfspace.api);
  console.log('[Download] Will use HF Space:', !!(CONFIG.hfspace.api && !CONFIG.hfspace.api.includes('YOUR-USERNAME')));
  
  // PRIMARY: Try HF Space yt-dlp API (self-hosted, most reliable)
  if (CONFIG.hfspace.api && !CONFIG.hfspace.api.includes('YOUR-USERNAME')) {
    try {
      console.log('[Download] Calling HF Space API...');
      const hfResult = await tryHFSpace(url, audioOnly);
      console.log('[Download] HF Space result:', hfResult.success ? 'SUCCESS' : hfResult.error);
      if (hfResult.success) return hfResult;
      errors.push(`HFSpace: ${hfResult.error}`);
    } catch (e) {
      console.error('[Download] HF Space exception:', e.message);
      errors.push(`HFSpace: ${e.message}`);
    }
  } else {
    console.log('[Download] HF Space skipped - not configured');
  }
  
  // FALLBACK 1: Try TikWM for TikTok
  if (url.includes('tiktok.com') || url.includes('vm.tiktok.com')) {
    try {
      const tikwmResult = await downloadTikTok(url);
      if (tikwmResult.success) return tikwmResult;
      errors.push(`TikWM: ${tikwmResult.error}`);
    } catch (e) {
      errors.push(`TikWM: ${e.message}`);
    }
  }
  
  // FALLBACK 2: Try other free APIs
  try {
    const dlpandaResult = await tryDlPanda(url);
    if (dlpandaResult.success) return dlpandaResult;
    errors.push(`DlPanda: ${dlpandaResult.error}`);
  } catch (e) {
    errors.push(`DlPanda: ${e.message}`);
  }
  
  // Log all errors for debugging
  console.log('[Download] All methods failed. Errors:', errors.join('; '));
  
  return { 
    success: false, 
    error: errors.length > 0 
      ? `Download failed: ${errors.join(', ')}`
      : 'Download failed. Please make sure your HF Space is deployed and configured.\n\nSet HF_YTDLP_API in Railway environment variables.' 
  };
}

/**
 * Try HF Space yt-dlp API
 */
async function tryHFSpace(url, audioOnly = false) {
  const apiUrl = `${CONFIG.hfspace.api}/download`;
  
  const response = await fetch(apiUrl, {
    method: 'POST',
    timeout: CONFIG.hfspace.timeout,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'StarzAI-Bot/2.0'
    },
    body: JSON.stringify({
      url: url,
      audio_only: audioOnly,
      api_key: CONFIG.hfspace.apiKey || undefined
    })
  });
  
  const text = await response.text();
  
  // Check if response is HTML (error page)
  if (text.startsWith('<!') || text.startsWith('<html')) {
    return { success: false, error: 'HF Space returned HTML - may be starting up' };
  }
  
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    return { success: false, error: 'Invalid JSON from HF Space' };
  }
  
  if (!data.success) {
    return { success: false, error: data.error || 'HF Space download failed' };
  }
  
  // Build full URL for the file
  const fileUrl = data.url.startsWith('http') 
    ? data.url 
    : `${CONFIG.hfspace.api}${data.url}`;
  
  return {
    success: true,
    url: fileUrl,
    title: data.title || 'Downloaded Video',
    author: data.author || null,
    duration: data.duration || null,
    thumbnail: data.thumbnail || null,
    filesize: data.filesize || null,
    type: audioOnly ? 'audio' : 'video'
  };
}

/**
 * Try DlPanda API
 */
async function tryDlPanda(url) {
  const apiUrl = `https://dlpanda.com/api?url=${encodeURIComponent(url)}&token=G7eRpMaa`;
  
  const response = await fetch(apiUrl, {
    timeout: 30000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json'
    }
  });
  
  const text = await response.text();
  
  // Check if response is HTML (error page)
  if (text.startsWith('<!') || text.startsWith('<html')) {
    return { success: false, error: 'API returned HTML instead of JSON' };
  }
  
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    return { success: false, error: 'Invalid JSON response' };
  }
  
  if (!data || data.error) {
    return { success: false, error: data?.error || 'API error' };
  }
  
  // Find video URL from response
  let videoUrl = null;
  let title = data.title || 'Video';
  let thumbnail = data.thumbnail || null;
  
  if (data.medias && data.medias.length > 0) {
    // Sort by quality, prefer mp4
    const videos = data.medias.filter(m => m.videoAvailable || m.extension === 'mp4');
    if (videos.length > 0) {
      // Get highest quality
      const sorted = videos.sort((a, b) => (b.quality || 0) - (a.quality || 0));
      videoUrl = sorted[0].url;
    }
  } else if (data.url) {
    videoUrl = data.url;
  }
  
  if (!videoUrl) {
    return { success: false, error: 'No video URL in response' };
  }
  
  // Validate URL is actually a video (not a webpage)
  if (!videoUrl.includes('.mp4') && !videoUrl.includes('.webm') && !videoUrl.includes('video')) {
    // Try to verify it's a direct video link
    try {
      const headResp = await fetch(videoUrl, { method: 'HEAD', timeout: 5000 });
      const contentType = headResp.headers.get('content-type') || '';
      if (!contentType.includes('video') && !contentType.includes('octet-stream')) {
        return { success: false, error: 'URL is not a direct video link' };
      }
    } catch (e) {
      // If HEAD fails, still try to use the URL
    }
  }
  
  return {
    success: true,
    url: videoUrl,
    title: title,
    thumbnail: thumbnail,
    author: data.author || null
  };
}

/**
 * Try SaveServ API
 */
async function trySaveServ(url) {
  const apiUrl = `https://api.saveservall.xyz/api/ajaxSearch`;
  
  const response = await fetch(apiUrl, {
    method: 'POST',
    timeout: 30000,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    },
    body: `q=${encodeURIComponent(url)}&vt=home`
  });
  
  const text = await response.text();
  
  if (text.startsWith('<!') || text.startsWith('<html')) {
    return { success: false, error: 'API returned HTML' };
  }
  
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    return { success: false, error: 'Invalid JSON' };
  }
  
  if (data.status !== 'ok' || !data.links) {
    return { success: false, error: data.mess || 'API error' };
  }
  
  // Find best video link
  const videoLinks = data.links.filter(l => l.type === 'mp4' || l.type === 'video');
  if (videoLinks.length === 0) {
    return { success: false, error: 'No video links found' };
  }
  
  const best = videoLinks[0];
  
  return {
    success: true,
    url: best.url,
    title: data.title || 'Video',
    thumbnail: data.thumbnail || null,
    quality: best.quality || null
  };
}

/**
 * Try YT1s API for YouTube
 */
async function tryYt1s(url) {
  // Extract video ID
  const videoIdMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (!videoIdMatch) {
    return { success: false, error: 'Invalid YouTube URL' };
  }
  
  const videoId = videoIdMatch[1];
  
  // Try y2mate-style API
  const apiUrl = `https://yt1s.com/api/ajaxSearch/index`;
  
  const response = await fetch(apiUrl, {
    method: 'POST',
    timeout: 30000,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    },
    body: `q=https://www.youtube.com/watch?v=${videoId}&vt=mp4`
  });
  
  const text = await response.text();
  
  if (text.startsWith('<!') || text.startsWith('<html')) {
    return { success: false, error: 'API returned HTML' };
  }
  
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    return { success: false, error: 'Invalid JSON' };
  }
  
  if (data.status !== 'ok') {
    return { success: false, error: data.mess || 'API error' };
  }
  
  // This API typically requires a second request to convert
  // For now, return error to try other APIs
  return { success: false, error: 'Conversion required (not implemented)' };
}

/**
 * Download TikTok video using TikWM API
 */
async function downloadTikTok(url) {
  try {
    // Try TikWM API first
    const tikwmUrl = `${CONFIG.tikwm.api}?url=${encodeURIComponent(url)}`;
    
    const response = await fetch(tikwmUrl, {
      timeout: CONFIG.tikwm.timeout,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const data = await response.json();
    
    if (data.code === 0 && data.data) {
      const videoData = data.data;
      return {
        success: true,
        url: videoData.play || videoData.wmplay,
        title: videoData.title || 'TikTok Video',
        thumbnail: videoData.cover || videoData.origin_cover,
        author: videoData.author?.nickname || 'Unknown',
        music: videoData.music_info?.play,
        duration: videoData.duration,
        type: videoData.images ? 'slideshow' : 'video',
        images: videoData.images || null
      };
    }
    
    // Fallback to VKR if TikWM fails
    return await downloadWithVKR(url);
    
  } catch (error) {
    // Try VKR as fallback
    try {
      return await downloadWithVKR(url);
    } catch (e) {
      return { success: false, error: error.message || 'TikTok download failed' };
    }
  }
}

/**
 * Download music from Spotify/Deezer/Apple Music by searching on JioSaavn
 * This searches for the track and returns a download link from JioSaavn
 */
async function downloadSpotify(url) {
  try {
    // Try to extract track info from Spotify oEmbed API
    let searchQuery = '';
    
    if (url.includes('spotify.com')) {
      try {
        const oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`;
        const response = await fetch(oembedUrl, { timeout: 10000 });
        const data = await response.json();
        if (data.title) {
          // Title format is usually "Song Name" or "Song Name - Artist"
          searchQuery = data.title;
        }
      } catch (e) {
        // If oEmbed fails, try to extract from URL
        const trackMatch = url.match(/track\/([a-zA-Z0-9]+)/);
        if (trackMatch) {
          searchQuery = trackMatch[1]; // Use track ID as fallback
        }
      }
    } else if (url.includes('deezer.com')) {
      const trackMatch = url.match(/track\/([0-9]+)/);
      if (trackMatch) {
        searchQuery = `deezer track ${trackMatch[1]}`;
      }
    } else if (url.includes('music.apple.com')) {
      // Apple Music URLs contain song name in path
      const pathMatch = url.match(/album\/([\w-]+)\//);
      if (pathMatch) {
        searchQuery = pathMatch[1].replace(/-/g, ' ');
      }
    }
    
    if (!searchQuery) {
      return { 
        success: false, 
        error: 'Could not extract song info from URL. Try using /music command with the song name instead.',
        isMusic: true
      };
    }
    
    // Search on JioSaavn
    const searchResult = await searchMusic(searchQuery, 1);
    
    if (!searchResult.success || !searchResult.songs?.length) {
      return { 
        success: false, 
        error: `Song not found on JioSaavn. Try /music ${searchQuery}`,
        isMusic: true,
        searchQuery: searchQuery
      };
    }
    
    // Get full song details
    const songId = searchResult.songs[0].id;
    const songResult = await getSongById(songId);
    
    if (!songResult.success || !songResult.song?.downloadUrl) {
      return { 
        success: false, 
        error: 'Could not get download link. Try /music command.',
        isMusic: true
      };
    }
    
    const song = songResult.song;
    
    return {
      success: true,
      type: 'audio',
      url: song.downloadUrl,
      title: song.name,
      author: song.artist,
      album: song.album,
      duration: song.duration,
      quality: song.quality,
      thumbnail: song.image,
      isMusic: true
    };
    
  } catch (error) {
    return { success: false, error: error.message || 'Music download failed', isMusic: true };
  }
}

/**
 * Main download function - routes to appropriate API based on platform
 */
async function downloadMedia(url, audioOnly = false) {
  const platform = detectPlatform(url);
  
  try {
    let result;
    
    switch (platform) {
      case 'tiktok':
        result = await downloadTikTok(url);
        break;
      
      // Music platforms - route to JioSaavn search
      case 'spotify':
      case 'deezer':
      case 'applemusic':
      case 'jiosaavn':
        result = await downloadSpotify(url);
        break;
      
      // Video platforms
      case 'youtube':
      case 'instagram':
      case 'twitter':
      case 'facebook':
      case 'soundcloud':
      default:
        result = await downloadWithVKR(url);
        break;
    }
    
    return result;
    
  } catch (error) {
    return { success: false, error: error.message || 'Download failed' };
  }
}

/**
 * Detect platform from URL
 */
function detectPlatform(url) {
  for (const [platform, pattern] of Object.entries(URL_PATTERNS)) {
    if (pattern.test(url)) {
      return platform;
    }
  }
  return null;
}

/**
 * Clean up downloaded file after sending (legacy function for compatibility)
 * Note: With API-based downloads, this is mostly a no-op since we use URLs directly
 */
function cleanupDownload(filePath) {
  // Early return if filePath is undefined, null, or not a string
  if (!filePath || typeof filePath !== 'string') {
    return;
  }
  
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (e) {
    // Ignore cleanup errors
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MUSIC FEATURES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get lyrics for a song
 */
async function getLyrics(artist, title) {
  // Try LRCLIB first (better results, has synced lyrics)
  try {
    const lrcResult = await searchLyricsLRCLIB(artist && title ? `${artist} ${title}` : (artist || title));
    if (lrcResult.success) return lrcResult;
  } catch (e) { /* fall through to lyrics.ovh */ }
  
  // Fallback to lyrics.ovh (requires exact artist/title)
  if (artist && title) {
    try {
      const response = await fetch(`${CONFIG.lyrics.api}/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`);
      const data = await response.json();
      if (data.lyrics) {
        return { success: true, lyrics: data.lyrics, trackName: title, artistName: artist };
      }
    } catch (e) { /* no fallback left */ }
  }
  
  return { success: false, error: 'Lyrics not found' };
}

/**
 * Search lyrics via LRCLIB API (free, unlimited, no API key)
 * @param {string} query - Search query (any combination of artist, title, etc.)
 * @returns {Promise<Object>} Lyrics result
 */
async function searchLyricsLRCLIB(query) {
  try {
    const response = await fetch(
      `${CONFIG.lyrics.lrclib}/search?q=${encodeURIComponent(query)}`,
      { headers: { 'User-Agent': 'Starzai v1.0 (https://github.com/Lemonsupqt/Starzai)' } }
    );
    if (!response.ok) return { success: false, error: `LRCLIB API error: ${response.status}` };
    
    const results = await response.json();
    if (!results.length) return { success: false, error: 'No lyrics found' };
    
    // Find the best result (prefer one with plain lyrics)
    const best = results.find(r => r.plainLyrics) || results[0];
    
    return {
      success: true,
      lyrics: best.plainLyrics || '',
      syncedLyrics: best.syncedLyrics || '',
      trackName: best.trackName || '',
      artistName: best.artistName || '',
      albumName: best.albumName || '',
      duration: best.duration || 0,
      instrumental: best.instrumental || false,
      allResults: results.slice(0, 10), // Keep top 10 for "other versions"
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Search for songs using JioSaavn API with fallback endpoints
 * @param {string} query - Search query (song name, artist, etc.)
 * @param {number} limit - Number of results to return (default: 10)
 * @returns {Promise<Object>} Search results with song details
 */
async function searchMusic(query, limit = 10) {
  const apis = CONFIG.jiosaavn.apis || ['https://jiosaavn-api-privatecvc2.vercel.app'];
  let lastError = null;
  
  for (const apiBase of apis) {
    try {
      const response = await fetch(
        `${apiBase}/search/songs?query=${encodeURIComponent(query)}&limit=${limit}`,
        { timeout: CONFIG.jiosaavn.timeout }
      );
      
      if (!response.ok) continue;
      
      const data = await response.json();
      
      // Handle different API response formats
      let results = data.data?.results || data.results || [];
      
      if (!results.length) continue;
      
      const songs = results.map(song => {
        // Decode HTML entities in all text fields
        // Handle different API response structures
        const rawName = song.name || song.title || '';
        const rawArtist = song.primaryArtists || 
                          song.artists?.primary?.map(a => a.name).join(', ') || 
                          song.artist || 'Unknown';
        const rawAlbum = song.album?.name || song.album || 'Unknown';
        
        const cleanName = decodeHTMLEntities(rawName);
        const cleanArtist = decodeHTMLEntities(rawArtist);
        const cleanAlbum = decodeHTMLEntities(rawAlbum);
        
        // Get image URL (handle different formats)
        let imageUrl = '';
        if (Array.isArray(song.image)) {
          const img = song.image.find(i => i.quality === '500x500' || i.link?.includes('500x500'));
          imageUrl = img?.url || img?.link || song.image[song.image.length - 1]?.url || song.image[song.image.length - 1]?.link || '';
        } else if (typeof song.image === 'string') {
          imageUrl = song.image;
        }
        
        // Extract best download URL directly
        let bestDownloadUrl = null;
        let bestQuality = 'Unknown';
        const dlUrls = song.downloadUrl || [];
        if (dlUrls.length > 0) {
          const best = dlUrls.find(d => d.quality === '320kbps') ||
                       dlUrls.find(d => d.quality === '160kbps') ||
                       dlUrls.find(d => d.quality === '96kbps') ||
                       dlUrls[dlUrls.length - 1];
          bestDownloadUrl = best?.link || best?.url || null;
          bestQuality = best?.quality || 'Unknown';
        }
        
        return {
          id: song.id,
          name: cleanName,
          artist: cleanArtist,
          album: cleanAlbum,
          year: song.year || '',
          duration: song.duration ? formatDuration(parseInt(song.duration)) : '',
          language: song.language || '',
          hasLyrics: song.hasLyrics === 'true' || song.hasLyrics === true || false,
          image: imageUrl,
          downloadUrl: bestDownloadUrl,
          quality: bestQuality,
          filename: sanitizeFilename(`${cleanArtist} - ${cleanName}`)
        };
      });
      
      return { success: true, songs, apiUsed: apiBase };
    } catch (error) {
      lastError = error;
      console.log(`JioSaavn API ${apiBase} failed: ${error.message}`);
      continue;
    }
  }
  
  return { success: false, error: lastError?.message || 'All JioSaavn APIs failed' };
}

/**
 * Get song details and download URL by ID with fallback APIs
 * @param {string} songId - JioSaavn song ID
 * @returns {Promise<Object>} Song details with download URLs
 */
async function getSongById(songId) {
  const apis = CONFIG.jiosaavn.apis || ['https://jiosaavn-api-privatecvc2.vercel.app'];
  let lastError = null;
  
  for (const apiBase of apis) {
    try {
      const response = await fetch(
        `${apiBase}/songs/${songId}`,
        { timeout: CONFIG.jiosaavn.timeout }
      );
      
      if (!response.ok) continue;
      
      const data = await response.json();
      
      // Handle different API response formats
      let songData = data.data?.[0] || data.data || data;
      if (!songData || !songData.id) continue;
      
      const song = songData;
      
      // Get the highest quality download URL (320kbps preferred)
      const downloadUrls = song.downloadUrl || [];
      const bestQuality = downloadUrls.find(d => d.quality === '320kbps' || d.quality === '320') ||
                          downloadUrls.find(d => d.quality === '160kbps' || d.quality === '160') ||
                          downloadUrls.find(d => d.quality === '96kbps' || d.quality === '96') ||
                          downloadUrls[downloadUrls.length - 1];
      
      // Decode HTML entities and sanitize metadata
      // Handle different API response structures
      const rawName = song.name || song.title || '';
      const rawArtist = song.primaryArtists || 
                        song.artists?.primary?.map(a => a.name).join(', ') || 
                        song.artist || 'Unknown';
      const rawAlbum = song.album?.name || song.album || 'Unknown';
      
      const cleanName = decodeHTMLEntities(rawName);
      const cleanArtist = decodeHTMLEntities(rawArtist);
      const cleanAlbum = decodeHTMLEntities(rawAlbum);
      
      // Generate clean filename for the audio file
      const cleanFilename = sanitizeFilename(`${cleanArtist} - ${cleanName}`);
      
      // Get image URL (handle different formats)
      let imageUrl = '';
      if (Array.isArray(song.image)) {
        const img = song.image.find(i => i.quality === '500x500' || i.link?.includes('500x500'));
        imageUrl = img?.url || img?.link || song.image[song.image.length - 1]?.url || song.image[song.image.length - 1]?.link || '';
      } else if (typeof song.image === 'string') {
        imageUrl = song.image;
      }
      
      return {
        success: true,
        song: {
          id: song.id,
          name: cleanName,
          artist: cleanArtist,
          album: cleanAlbum,
          year: song.year || '',
          duration: song.duration ? formatDuration(parseInt(song.duration)) : '',
          language: song.language || '',
          hasLyrics: song.hasLyrics === 'true' || song.hasLyrics === true || false,
          image: imageUrl,
          downloadUrl: bestQuality?.url || bestQuality?.link || null,
          quality: bestQuality?.quality || 'Unknown',
          allQualities: downloadUrls,
          filename: cleanFilename
        },
        apiUsed: apiBase
      };
    } catch (error) {
      lastError = error;
      console.log(`JioSaavn API ${apiBase} failed for song ${songId}: ${error.message}`);
      continue;
    }
  }
  
  return { success: false, error: lastError?.message || 'All JioSaavn APIs failed' };
}

/**
 * Download music by search query - searches and returns the best match
 * @param {string} query - Song name or "artist - song" format
 * @returns {Promise<Object>} Download result with URL
 */
async function downloadMusic(query) {
  try {
    // First search for the song
    const searchResult = await searchMusic(query, 5);
    
    if (!searchResult.success || !searchResult.songs?.length) {
      return { success: false, error: 'No songs found for your query' };
    }
    
    const firstSong = searchResult.songs[0];
    console.log(`[Music] Found: ${firstSong.name} by ${firstSong.artist}, URL: ${firstSong.downloadUrl ? 'YES' : 'NO'}`);
    
    // URL is now pre-extracted in searchMusic
    let downloadUrl = firstSong.downloadUrl;
    let quality = firstSong.quality || 'Unknown';
    
    // Fallback to getSongById if no URL
    if (!downloadUrl) {
      console.log(`[Music] No URL from search, trying getSongById...`);
      const songResult = await getSongById(firstSong.id);
      if (songResult.success && songResult.song?.downloadUrl) {
        downloadUrl = songResult.song.downloadUrl;
        quality = songResult.song.quality || 'Unknown';
      }
    }
    
    if (!downloadUrl) {
      return { success: false, error: 'Download URL not available for this song' };
    }
    
    console.log(`[Music] Final URL: ${downloadUrl.substring(0, 50)}...`);
    
    return {
      success: true,
      type: 'audio',
      url: downloadUrl,
      title: firstSong.name,
      author: firstSong.artist,
      album: firstSong.album,
      duration: firstSong.duration,
      quality: quality,
      thumbnail: firstSong.image,
      filename: firstSong.filename,
      allResults: searchResult.songs // Include other results for selection
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Helper function to format duration in seconds to mm:ss
 */
function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOVIE/TV FEATURES (TMDB API)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Search for movies or TV shows
 */
async function searchMedia(query, type = 'multi') {
  try {
    if (!CONFIG.tmdb.key) {
      return { success: false, error: 'TMDB API key not configured' };
    }
    
    const response = await fetch(
      `${CONFIG.tmdb.api}/search/${type}?api_key=${CONFIG.tmdb.key}&query=${encodeURIComponent(query)}`
    );
    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      return { success: true, results: data.results.slice(0, 5) };
    }
    return { success: false, error: 'No results found' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get movie/TV details with recommendations
 */
async function getMediaDetails(id, type = 'movie') {
  try {
    if (!CONFIG.tmdb.key) {
      return { success: false, error: 'TMDB API key not configured' };
    }
    
    const [details, recommendations, watchProviders] = await Promise.all([
      fetch(`${CONFIG.tmdb.api}/${type}/${id}?api_key=${CONFIG.tmdb.key}`).then(r => r.json()),
      fetch(`${CONFIG.tmdb.api}/${type}/${id}/recommendations?api_key=${CONFIG.tmdb.key}`).then(r => r.json()),
      fetch(`${CONFIG.tmdb.api}/${type}/${id}/watch/providers?api_key=${CONFIG.tmdb.key}`).then(r => r.json())
    ]);
    
    return {
      success: true,
      details,
      recommendations: recommendations.results?.slice(0, 5) || [],
      watchProviders: watchProviders.results || {}
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get movie trailers
 */
async function getTrailers(id, type = 'movie') {
  try {
    if (!CONFIG.tmdb.key) {
      return { success: false, error: 'TMDB API key not configured' };
    }
    
    const response = await fetch(
      `${CONFIG.tmdb.api}/${type}/${id}/videos?api_key=${CONFIG.tmdb.key}`
    );
    const data = await response.json();
    
    const trailers = data.results?.filter(v => v.type === 'Trailer' && v.site === 'YouTube') || [];
    return { success: true, trailers };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FEATURES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate QR code
 */
async function generateQR(text, options = {}) {
  try {
    // Optimized settings for large data (up to ~4,000 characters)
    // - PNG format for lossless quality
    // - 4096x4096 ULTRA-HIGH resolution for maximum scannability
    // - Error correction Level L (Low) for less density with large data
    // - Larger margin for better scanning
    const qrBuffer = await QRCode.toBuffer(text, {
      errorCorrectionLevel: options.errorCorrectionLevel || 'L', // Low for large data
      type: 'png', // Lossless format
      margin: options.margin || 4, // Larger margin for better scanning
      width: options.width || 4096, // Ultra-high resolution (4096x4096) for maximum scannability
      quality: 1.0, // Maximum quality
      color: {
        dark: options.dark || '#000000',
        light: options.light || '#ffffff'
      }
    });
    return { success: true, buffer: qrBuffer };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Scan QR code from image
 *
 * Uses jsQR with a second high-contrast fallback pass to better handle
 * stylized / art-mode QR codes and Telegram-compressed images.
 */
async function scanQR(imageBuffer) {
  try {
    const jsQR = (await import('jsqr')).default;
    const { createCanvas, loadImage } = await import('canvas');
    
    // Load image
    const img = await loadImage(imageBuffer);
    const width = img.width;
    const height = img.height;

    // First pass: raw image
    let canvas = createCanvas(width, height);
    let ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, width, height);
    let imageData = ctx.getImageData(0, 0, width, height);

    let code = jsQR(imageData.data, imageData.width, imageData.height);
    if (code && code.data) {
      return { success: true, data: code.data };
    }

    // Second pass: grayscale + adaptive threshold to boost contrast
    // This helps with dot-style and art-mode QRs that phone scanners can read
    // but jsQR struggles with due to compression noise.
    canvas = createCanvas(width, height);
    ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, width, height);
    imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // Compute average luminance
    let sumLum = 0;
    const len = data.length / 4;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      sumLum += lum;
    }
    const avgLum = sumLum / len;
    // Slightly bias threshold darker so dots become solid
    const threshold = avgLum * 0.95;

    // Apply threshold
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      const v = lum > threshold ? 255 : 0;
      data[i] = v;
      data[i + 1] = v;
      data[i + 2] = v;
      data[i + 3] = 255;
    }

    ctx.putImageData(imageData, 0, 0);
    const highContrast = ctx.getImageData(0, 0, width, height);
    code = jsQR(highContrast.data, highContrast.width, highContrast.height);

    if (code && code.data) {
      return { success: true, data: code.data };
    }

    return { success: false, error: 'No QR code found in image' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Shorten URL using TinyURL
 */
async function shortenURL(url) {
  try {
    const response = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`);
    const shortUrl = await response.text();
    
    if (shortUrl.startsWith('http')) {
      return { success: true, shortUrl };
    }
    return { success: false, error: 'Failed to shorten URL' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Convert currency
 */
async function convertCurrency(amount, from, to) {
  try {
    const response = await fetch(`${CONFIG.currency.api}/${from.toUpperCase()}`);
    const data = await response.json();
    
    if (data.rates && data.rates[to.toUpperCase()]) {
      const rate = data.rates[to.toUpperCase()];
      const converted = amount * rate;
      return {
        success: true,
        amount,
        from: from.toUpperCase(),
        to: to.toUpperCase(),
        rate,
        converted: converted.toFixed(2)
      };
    }
    return { success: false, error: 'Invalid currency code' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get weather for a location
 */
async function getWeather(location) {
  try {
    const response = await fetch(`${CONFIG.weather.api}/${encodeURIComponent(location)}?format=j1`);
    const data = await response.json();
    
    if (data.current_condition && data.current_condition[0]) {
      const current = data.current_condition[0];
      const area = data.nearest_area?.[0];
      
      return {
        success: true,
        location: area?.areaName?.[0]?.value || location,
        country: area?.country?.[0]?.value || '',
        temperature: {
          celsius: current.temp_C,
          fahrenheit: current.temp_F
        },
        feelsLike: {
          celsius: current.FeelsLikeC,
          fahrenheit: current.FeelsLikeF
        },
        condition: current.weatherDesc?.[0]?.value || 'Unknown',
        humidity: current.humidity,
        windSpeed: current.windspeedKmph,
        windDirection: current.winddir16Point,
        visibility: current.visibility,
        uvIndex: current.uvIndex,
        precipitation: current.precipMM
      };
    }
    return { success: false, error: 'Weather data not found' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Translate text
 */
async function translateText(text, from = 'auto', to = 'en') {
  try {
    const langPair = from === 'auto' ? `|${to}` : `${from}|${to}`;
    const response = await fetch(
      `${CONFIG.translate.api}?q=${encodeURIComponent(text)}&langpair=${langPair}`
    );
    const data = await response.json();
    
    if (data.responseStatus === 200 && data.responseData) {
      return {
        success: true,
        original: text,
        translated: data.responseData.translatedText,
        from: from,
        to: to
      };
    }
    return { success: false, error: 'Translation failed' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Convert units
 */
function convertUnit(value, fromUnit, toUnit) {
  const conversions = {
    // Length
    'm_ft': v => v * 3.28084,
    'ft_m': v => v / 3.28084,
    'km_mi': v => v * 0.621371,
    'mi_km': v => v / 0.621371,
    'cm_in': v => v * 0.393701,
    'in_cm': v => v / 0.393701,
    
    // Weight
    'kg_lb': v => v * 2.20462,
    'lb_kg': v => v / 2.20462,
    'g_oz': v => v * 0.035274,
    'oz_g': v => v / 0.035274,
    
    // Temperature
    'c_f': v => (v * 9/5) + 32,
    'f_c': v => (v - 32) * 5/9,
    'c_k': v => v + 273.15,
    'k_c': v => v - 273.15,
    
    // Volume
    'l_gal': v => v * 0.264172,
    'gal_l': v => v / 0.264172,
    'ml_floz': v => v * 0.033814,
    'floz_ml': v => v / 0.033814
  };
  
  const key = `${fromUnit.toLowerCase()}_${toUnit.toLowerCase()}`;
  
  if (conversions[key]) {
    return {
      success: true,
      original: value,
      converted: conversions[key](value).toFixed(4),
      from: fromUnit,
      to: toUnit
    };
  }
  
  return { success: false, error: 'Unsupported unit conversion' };
}

// ═══════════════════════════════════════════════════════════════════════════════
// KNOWLEDGE FEATURES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get Wikipedia summary
 */
async function getWikipedia(query) {
  try {
    const response = await fetch(
      `${CONFIG.wikipedia.api}/${encodeURIComponent(query)}`,
      { headers: { 'Accept': 'application/json' } }
    );
    const data = await response.json();
    
    if (data.title && data.extract) {
      return {
        success: true,
        title: data.title,
        extract: data.extract,
        thumbnail: data.thumbnail?.source,
        url: data.content_urls?.desktop?.page
      };
    }
    return { success: false, error: 'Article not found' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get word definition
 */
async function getDefinition(word) {
  try {
    const response = await fetch(`${CONFIG.dictionary.api}/${encodeURIComponent(word)}`);
    const data = await response.json();
    
    if (Array.isArray(data) && data[0]) {
      const entry = data[0];
      return {
        success: true,
        word: entry.word,
        phonetic: entry.phonetic || entry.phonetics?.[0]?.text,
        audio: entry.phonetics?.find(p => p.audio)?.audio,
        meanings: entry.meanings?.map(m => ({
          partOfSpeech: m.partOfSpeech,
          definitions: m.definitions?.slice(0, 3).map(d => ({
            definition: d.definition,
            example: d.example
          }))
        }))
      };
    }
    return { success: false, error: 'Word not found' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get random fact
 */
async function getRandomFact() {
  try {
    const response = await fetch(CONFIG.facts.api);
    const data = await response.json();
    
    if (data.text) {
      return { success: true, fact: data.text, source: data.source };
    }
    return { success: false, error: 'Could not fetch fact' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get this day in history
 */
async function getThisDayInHistory() {
  try {
    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();
    
    const response = await fetch(
      `https://en.wikipedia.org/api/rest_v1/feed/onthisday/events/${month}/${day}`
    );
    const data = await response.json();
    
    if (data.events && data.events.length > 0) {
      // Get 5 random events
      const shuffled = data.events.sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, 5);
      
      return {
        success: true,
        date: `${month}/${day}`,
        events: selected.map(e => ({
          year: e.year,
          text: e.text
        }))
      };
    }
    return { success: false, error: 'No events found' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUN FEATURES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get random quote
 */
async function getRandomQuote() {
  try {
    const response = await fetch(CONFIG.quotes.api);
    const data = await response.json();
    
    if (data.content) {
      return {
        success: true,
        quote: data.content,
        author: data.author,
        tags: data.tags
      };
    }
    return { success: false, error: 'Could not fetch quote' };
  } catch (error) {
    // Fallback quotes
    const fallbackQuotes = [
      { quote: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
      { quote: "Innovation distinguishes between a leader and a follower.", author: "Steve Jobs" },
      { quote: "Stay hungry, stay foolish.", author: "Steve Jobs" },
      { quote: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
      { quote: "It is during our darkest moments that we must focus to see the light.", author: "Aristotle" }
    ];
    const random = fallbackQuotes[Math.floor(Math.random() * fallbackQuotes.length)];
    return { success: true, ...random };
  }
}

/**
 * Generate quote image
 */
async function generateQuoteImage(quote, author) {
  try {
    const width = 800;
    const height = 400;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#667eea');
    gradient.addColorStop(1, '#764ba2');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // Quote text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Word wrap
    const words = quote.split(' ');
    const lines = [];
    let currentLine = '';
    const maxWidth = width - 100;
    
    for (const word of words) {
      const testLine = currentLine + word + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && currentLine !== '') {
        lines.push(currentLine.trim());
        currentLine = word + ' ';
      } else {
        currentLine = testLine;
      }
    }
    lines.push(currentLine.trim());
    
    // Draw quote
    const lineHeight = 40;
    const startY = (height - lines.length * lineHeight) / 2 - 20;
    
    ctx.fillText('"', 50, startY - 20);
    lines.forEach((line, i) => {
      ctx.fillText(line, width / 2, startY + i * lineHeight);
    });
    ctx.fillText('"', width - 50, startY + (lines.length - 1) * lineHeight + 20);
    
    // Author
    ctx.font = 'italic 20px Arial';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillText(`— ${author}`, width / 2, startY + lines.length * lineHeight + 40);
    
    return { success: true, buffer: canvas.toBuffer('image/png') };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get truth or dare
 */
async function getTruthOrDare(type = 'truth') {
  const truths = [
    "What's the most embarrassing thing you've ever done?",
    "What's a secret you've never told anyone?",
    "What's the biggest lie you've ever told?",
    "What's your biggest fear?",
    "What's the most childish thing you still do?",
    "What's the worst date you've ever been on?",
    "What's the most trouble you've ever been in?",
    "What's your guilty pleasure?",
    "What's the weirdest dream you've ever had?",
    "What's something you've done that you're proud of but never told anyone?"
  ];
  
  const dares = [
    "Do your best impression of a celebrity",
    "Sing the chorus of your favorite song",
    "Do 10 jumping jacks right now",
    "Talk in an accent for the next 3 messages",
    "Send a funny selfie to the group",
    "Tell a joke (it has to be funny!)",
    "Do your best dance move",
    "Speak only in questions for the next 5 minutes",
    "Give a compliment to everyone in the chat",
    "Share the last photo in your camera roll"
  ];
  
  const list = type === 'truth' ? truths : dares;
  const selected = list[Math.floor(Math.random() * list.length)];
  
  return { success: true, type, challenge: selected };
}

/**
 * Get would you rather
 */
async function getWouldYouRather() {
  const questions = [
    { optionA: "Be able to fly", optionB: "Be invisible" },
    { optionA: "Live without music", optionB: "Live without movies" },
    { optionA: "Be famous", optionB: "Be rich" },
    { optionA: "Have unlimited money", optionB: "Have unlimited time" },
    { optionA: "Know how you die", optionB: "Know when you die" },
    { optionA: "Be able to read minds", optionB: "Be able to see the future" },
    { optionA: "Live in the past", optionB: "Live in the future" },
    { optionA: "Have no internet", optionB: "Have no air conditioning" },
    { optionA: "Be a genius but ugly", optionB: "Be beautiful but average intelligence" },
    { optionA: "Never use social media again", optionB: "Never watch TV again" }
  ];
  
  const selected = questions[Math.floor(Math.random() * questions.length)];
  return { success: true, ...selected };
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEV TOOLS — Dual Provider: Godbolt (primary) + Wandbox (fallback)
// ═══════════════════════════════════════════════════════════════════════════════

// Godbolt compiler IDs for each language
const GODBOLT_COMPILERS = {
  'python': { id: 'python312', lang: 'python', name: 'Python 3.12' },
  'javascript': { id: 'v8trunk', lang: 'javascript', name: 'V8 (trunk)' },
  'c': { id: 'cg141', lang: 'c', name: 'GCC 14.1' },
  'c++': { id: 'g141', lang: 'c++', name: 'G++ 14.1' },
  'go': { id: 'gltip', lang: 'go', name: 'Go (tip)' },
  'rust': { id: 'r1820', lang: 'rust', name: 'Rust 1.82.0' },
  'java': { id: 'java2400', lang: 'java', name: 'JDK 24' },
  'kotlin': { id: 'kotlinc2010', lang: 'kotlin', name: 'Kotlin 2.0.10' },
  'swift': { id: 'swift60', lang: 'swift', name: 'Swift 6.0' },
  'csharp': { id: 'dotnet901csharp', lang: 'csharp', name: 'C# .NET 9' },
  'typescript': { id: 'tsc_0_0_26_gc', lang: 'typescript', name: 'TS Native' },
  'haskell': { id: 'ghc9101', lang: 'haskell', name: 'GHC 9.10.1' },
  'ruby': { id: 'ruby341', lang: 'ruby', name: 'Ruby 3.4.1' },
  'perl': { id: 'perl542', lang: 'perl', name: 'Perl 5.42' },
  'scala': { id: 'scalac351', lang: 'scala', name: 'Scala 3.5.1' },
  'dart': { id: 'dart340', lang: 'dart', name: 'Dart 3.4.0' },
  'nim': { id: 'nim226', lang: 'nim', name: 'Nim 2.2.6' },
  'zig': { id: 'zigtrunk', lang: 'zig', name: 'Zig (trunk)' },
  'crystal': { id: 'crystal1133', lang: 'crystal', name: 'Crystal 1.13.3' },
  'ocaml': { id: 'ocaml520', lang: 'ocaml', name: 'OCaml 5.2.0' },
  'd': { id: 'dmd21091', lang: 'd', name: 'DMD 2.109.1' },
  'pascal': { id: 'fpc322', lang: 'pascal', name: 'FPC 3.2.2' },
  'fortran': { id: 'gfortran141', lang: 'fortran', name: 'GFortran 14.1' },
};

// Wandbox compiler IDs (fallback)
const WANDBOX_COMPILERS = {
  'python': { compiler: 'cpython-3.12.7', name: 'CPython 3.12.7' },
  'javascript': { compiler: 'nodejs-20.17.0', name: 'Node.js 20.17' },
  'c': { compiler: 'gcc-head-c', name: 'GCC HEAD (C)' },
  'c++': { compiler: 'gcc-head', name: 'GCC HEAD (C++)' },
  'go': { compiler: 'go-1.23.2', name: 'Go 1.23.2' },
  'rust': { compiler: 'rust-1.82.0', name: 'Rust 1.82.0' },
  'java': { compiler: 'openjdk-jdk-22+36', name: 'OpenJDK 22' },
  'csharp': { compiler: 'mono-6.12.0.199', name: 'Mono 6.12' },
  'ruby': { compiler: 'ruby-3.4.1', name: 'Ruby 3.4.1' },
  'perl': { compiler: 'perl-5.42.0', name: 'Perl 5.42' },
  'swift': { compiler: 'swift-6.0.1', name: 'Swift 6.0.1' },
  'haskell': { compiler: 'ghc-9.10.1', name: 'GHC 9.10.1' },
  'scala': { compiler: 'scala-3.5.1', name: 'Scala 3.5.1' },
  'lua': { compiler: 'lua-5.4.7', name: 'Lua 5.4.7' },
  'php': { compiler: 'php-8.3.12', name: 'PHP 8.3' },
  'nim': { compiler: 'nim-2.2.6', name: 'Nim 2.2.6' },
  'crystal': { compiler: 'crystal-1.13.3', name: 'Crystal 1.13.3' },
  'erlang': { compiler: 'erlang-27.1', name: 'Erlang 27.1' },
  'elixir': { compiler: 'elixir-1.17.3', name: 'Elixir 1.17.3' },
  'ocaml': { compiler: 'ocaml-5.2.0', name: 'OCaml 5.2.0' },
  'd': { compiler: 'dmd-2.109.1', name: 'DMD 2.109.1' },
  'pascal': { compiler: 'fpc-3.2.2', name: 'FPC 3.2.2' },
  'bash': { compiler: 'bash', name: 'Bash' },
  'sql': { compiler: 'sqlite-3.46.1', name: 'SQLite 3.46' },
  'typescript': { compiler: 'typescript-5.6.2', name: 'TypeScript 5.6' },
  'kotlin': { compiler: 'kotlinc-2.0.10', name: 'Kotlin 2.0.10' },
  'groovy': { compiler: 'groovy-4.0.23', name: 'Groovy 4.0' },
  'julia': { compiler: 'julia-1.10.5', name: 'Julia 1.10.5' },
  'r': { compiler: 'r-4.4.1', name: 'R 4.4.1' },
  'zig': { compiler: 'zig-head', name: 'Zig HEAD' },
};

// Language alias map
const LANG_ALIASES = {
  'py': 'python', 'py3': 'python', 'python3': 'python',
  'js': 'javascript', 'node': 'javascript', 'nodejs': 'javascript',
  'ts': 'typescript', 'deno': 'typescript',
  'cpp': 'c++', 'cc': 'c++', 'cxx': 'c++',
  'cs': 'csharp', 'c#': 'csharp',
  'rb': 'ruby', 'rs': 'rust',
  'sh': 'bash', 'shell': 'bash',
  'pl': 'perl', 'kt': 'kotlin',
  'hs': 'haskell', 'ex': 'elixir', 'exs': 'elixir',
  'jl': 'julia', 'ml': 'ocaml',
  'pas': 'pascal', 'f90': 'fortran', 'f95': 'fortran',
  'sc': 'scala', 'groov': 'groovy',
};

/**
 * Resolve a language input to a canonical language name.
 */
function resolveRuntime(input) {
  const q = input.toLowerCase().trim();
  // Direct match
  if (GODBOLT_COMPILERS[q] || WANDBOX_COMPILERS[q]) return q;
  // Alias match
  if (LANG_ALIASES[q]) return LANG_ALIASES[q];
  // Partial match
  const all = new Set([...Object.keys(GODBOLT_COMPILERS), ...Object.keys(WANDBOX_COMPILERS)]);
  for (const lang of all) {
    if (lang.startsWith(q)) return lang;
  }
  return null;
}

/**
 * Execute code via Godbolt Compiler Explorer API
 */
async function runViaGodbolt(language, code, stdin = '') {
  const compiler = GODBOLT_COMPILERS[language];
  if (!compiler) return null;

  const payload = {
    source: code,
    options: {
      userArguments: '',
      executeParameters: { args: '', stdin: stdin || '' },
      compilerOptions: { executorRequest: true },
      filters: { execute: true }
    }
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch(`https://godbolt.org/api/compiler/${compiler.id}/compile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const data = await res.json();

    // Check for build errors
    if (data.buildResult && data.buildResult.code !== 0) {
      const errLines = (data.buildResult.stderr || []).map(l => l.text).join('\n');
      return {
        success: true,
        language: language,
        version: compiler.name,
        output: '',
        stderr: errLines || 'Compilation failed',
        exitCode: data.buildResult.code,
        compileError: true,
        provider: 'Godbolt'
      };
    }

    if (data.didExecute) {
      const stdout = (data.stdout || []).map(l => l.text).join('\n');
      const stderr = (data.stderr || []).map(l => l.text).join('\n');
      return {
        success: true,
        language: language,
        version: compiler.name,
        output: stdout,
        stderr: stderr,
        exitCode: data.code || 0,
        execTime: data.execTime,
        provider: 'Godbolt'
      };
    }

    // Didn't execute — might be a compile-only language on Godbolt
    return null;
  } catch (e) {
    clearTimeout(timeout);
    return null; // fallback to Wandbox
  }
}

/**
 * Execute code via Wandbox API (fallback)
 */
async function runViaWandbox(language, code, stdin = '') {
  const compiler = WANDBOX_COMPILERS[language];
  if (!compiler) return null;

  const payload = {
    code: code,
    compiler: compiler.compiler,
    save: false
  };
  if (stdin) payload.stdin = stdin;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch('https://wandbox.org/api/compile.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const data = await res.json();

    // Check for compiler errors
    if (data.compiler_error && data.compiler_error.trim()) {
      return {
        success: true,
        language: language,
        version: compiler.name,
        output: '',
        stderr: data.compiler_error,
        exitCode: parseInt(data.status) || 1,
        compileError: true,
        provider: 'Wandbox'
      };
    }

    return {
      success: true,
      language: language,
      version: compiler.name,
      output: data.program_output || '',
      stderr: data.program_error || '',
      exitCode: parseInt(data.status) || 0,
      provider: 'Wandbox'
    };
  } catch (e) {
    clearTimeout(timeout);
    return null;
  }
}

/**
 * Run code with automatic provider fallback: Godbolt → Wandbox
 */
async function runCode(language, code, options = {}) {
  try {
    const resolved = resolveRuntime(language);
    if (!resolved) {
      const all = new Set([...Object.keys(GODBOLT_COMPILERS), ...Object.keys(WANDBOX_COMPILERS)]);
      const langs = [...all].sort();
      return {
        success: false,
        error: `Language "${language}" not found.\n\nSupported (${langs.length}): ${langs.join(', ')}`
      };
    }

    const stdin = options.stdin || '';

    // Try Godbolt first
    let result = await runViaGodbolt(resolved, code, stdin);
    if (result) return result;

    // Fallback to Wandbox
    result = await runViaWandbox(resolved, code, stdin);
    if (result) return result;

    return { success: false, error: `Both execution providers failed for ${resolved}. Please try again later.` };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get supported programming languages
 */
function getSupportedLanguages() {
  const all = new Set([...Object.keys(GODBOLT_COMPILERS), ...Object.keys(WANDBOX_COMPILERS)]);
  const languages = [...all].sort().map(lang => {
    const gb = GODBOLT_COMPILERS[lang];
    const wb = WANDBOX_COMPILERS[lang];
    return {
      language: lang,
      version: gb ? gb.name : wb ? wb.name : lang,
      aliases: Object.entries(LANG_ALIASES).filter(([, v]) => v === lang).map(([k]) => k)
    };
  });
  return { success: true, languages };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CODE AUTO-FIX ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Auto-fix common code mistakes per language.
 * Returns { fixedCode, fixes[] } where fixes describes what was changed.
 */
function autoFixCode(language, code) {
  const fixes = [];
  let fixed = code;

  if (language === 'python') {
    // Fix Print → print, Input → input, True/False caps
    const pyFuncs = [
      [/\bPrint\s*\(/g, 'print(', 'Print→print'],
      [/\bInput\s*\(/g, 'input(', 'Input→input'],
      [/\bLen\s*\(/g, 'len(', 'Len→len'],
      [/\bRange\s*\(/g, 'range(', 'Range→range'],
      [/\bStr\s*\(/g, 'str(', 'Str→str'],
      [/\bInt\s*\(/g, 'int(', 'Int→int'],
      [/\bFloat\s*\(/g, 'float(', 'Float→float'],
      [/\bType\s*\(/g, 'type(', 'Type→type'],
      [/\bList\s*\(/g, 'list(', 'List→list'],
    ];
    for (const [pat, rep, desc] of pyFuncs) {
      if (pat.test(fixed)) {
        fixed = fixed.replace(pat, rep);
        fixes.push(desc);
      }
    }
    // Fix smart quotes → regular quotes
    if (/[\u201C\u201D]/.test(fixed)) {
      fixed = fixed.replace(/[\u201C\u201D]/g, '"');
      fixes.push('smart quotes→regular quotes');
    }
    if (/[\u2018\u2019]/.test(fixed)) {
      fixed = fixed.replace(/[\u2018\u2019]/g, "'");
      fixes.push('smart apostrophes→regular');
    }
  }

  if (language === 'javascript' || language === 'typescript') {
    // Fix Console.log → console.log, Document → document
    const jsFixes = [
      [/\bConsole\.log\s*\(/g, 'console.log(', 'Console.log→console.log'],
      [/\bConsole\.error\s*\(/g, 'console.error(', 'Console.error→console.error'],
      [/\bConsole\.warn\s*\(/g, 'console.warn(', 'Console.warn→console.warn'],
      [/\bDocument\./g, 'document.', 'Document→document'],
      [/\bMath\.random\s*\(\)/g, 'Math.random()', null], // Math is correct
    ];
    for (const [pat, rep, desc] of jsFixes) {
      if (desc && pat.test(fixed)) {
        fixed = fixed.replace(pat, rep);
        fixes.push(desc);
      }
    }
    // Fix smart quotes
    if (/[\u201C\u201D]/.test(fixed)) {
      fixed = fixed.replace(/[\u201C\u201D]/g, '"');
      fixes.push('smart quotes→regular quotes');
    }
    if (/[\u2018\u2019]/.test(fixed)) {
      fixed = fixed.replace(/[\u2018\u2019]/g, "'");
      fixes.push('smart apostrophes→regular');
    }
    // Missing semicolons at end of lines (simple heuristic)
    const lines = fixed.split('\n');
    let semiFixed = 0;
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (trimmed && !trimmed.endsWith(';') && !trimmed.endsWith('{') && !trimmed.endsWith('}') &&
          !trimmed.endsWith(',') && !trimmed.endsWith('(') && !trimmed.endsWith(':') &&
          !trimmed.startsWith('//') && !trimmed.startsWith('/*') && !trimmed.startsWith('*') &&
          !trimmed.startsWith('if') && !trimmed.startsWith('else') && !trimmed.startsWith('for') &&
          !trimmed.startsWith('while') && !trimmed.startsWith('function') && !trimmed.startsWith('class') &&
          !trimmed.startsWith('import') && !trimmed.startsWith('export') && !trimmed.startsWith('return') &&
          !trimmed.startsWith('const ') && !trimmed.startsWith('let ') && !trimmed.startsWith('var ') &&
          /^[a-zA-Z_$].*[)"'`\]\d]$/.test(trimmed)) {
        lines[i] = lines[i] + ';';
        semiFixed++;
      }
    }
    if (semiFixed > 0) {
      fixed = lines.join('\n');
      fixes.push(`added ${semiFixed} missing semicolon${semiFixed > 1 ? 's' : ''}`);
    }
  }

  if (language === 'c' || language === 'c++') {
    // Fix Int → int, Void → void, Char → char, Float → float, Double → double
    const cFixes = [
      [/\bInt\b(?!\s*\.)/g, 'int', 'Int→int'],
      [/\bVoid\b/g, 'void', 'Void→void'],
      [/\bChar\b(?!\s*\.)/g, 'char', 'Char→char'],
      [/\bFloat\b(?!\s*\.)/g, 'float', 'Float→float'],
      [/\bDouble\b(?!\s*\.)/g, 'double', 'Double→double'],
      [/\bReturn\b/g, 'return', 'Return→return'],
      [/\bPrintf\s*\(/g, 'printf(', 'Printf→printf'],
      [/\bScanf\s*\(/g, 'scanf(', 'Scanf→scanf'],
      [/\bMain\s*\(/g, 'main(', 'Main→main'],
    ];
    for (const [pat, rep, desc] of cFixes) {
      if (pat.test(fixed)) {
        fixed = fixed.replace(pat, rep);
        fixes.push(desc);
      }
    }
    // Fix smart quotes
    if (/[\u201C\u201D]/.test(fixed)) {
      fixed = fixed.replace(/[\u201C\u201D]/g, '"');
      fixes.push('smart quotes→regular quotes');
    }
    if (/[\u2018\u2019]/.test(fixed)) {
      fixed = fixed.replace(/[\u2018\u2019]/g, "'");
      fixes.push('smart apostrophes→regular');
    }
    // Fix #Include → #include
    if (/#Include\b/g.test(fixed)) {
      fixed = fixed.replace(/#Include\b/g, '#include');
      fixes.push('#Include→#include');
    }
  }

  if (language === 'java') {
    // Fix common Java caps issues
    const javaFixes = [
      [/\bstring\b(?=\s+\w)/g, 'String', 'string→String'],
      [/\bSystem\.Out\./gi, 'System.out.', 'System.Out→System.out'],
      [/\bsystem\.out\./g, 'System.out.', 'system→System'],
      [/\bPublic\b/g, 'public', 'Public→public'],
      [/\bStatic\b/g, 'static', 'Static→static'],
      [/\bClass\b(?=\s+\w)/g, 'class', 'Class→class'],
    ];
    for (const [pat, rep, desc] of javaFixes) {
      if (pat.test(fixed)) {
        fixed = fixed.replace(pat, rep);
        fixes.push(desc);
      }
    }
    // Fix smart quotes
    if (/[\u201C\u201D]/.test(fixed)) {
      fixed = fixed.replace(/[\u201C\u201D]/g, '"');
      fixes.push('smart quotes→regular quotes');
    }
  }

  // Universal fixes for all languages
  // Fix en-dash/em-dash used as minus
  if (/[\u2013\u2014]/.test(fixed)) {
    fixed = fixed.replace(/[\u2013\u2014]/g, '-');
    fixes.push('em/en dash→minus sign');
  }
  // Fix non-breaking spaces
  if (/\u00A0/.test(fixed)) {
    fixed = fixed.replace(/\u00A0/g, ' ');
    fixes.push('non-breaking spaces→regular spaces');
  }
  // Fix fullwidth characters (common from mobile keyboards)
  if (/[\uFF08\uFF09\uFF1B\uFF1A\uFF0C]/.test(fixed)) {
    fixed = fixed.replace(/\uFF08/g, '(').replace(/\uFF09/g, ')').replace(/\uFF1B/g, ';').replace(/\uFF1A/g, ':').replace(/\uFF0C/g, ',');
    fixes.push('fullwidth→ASCII punctuation');
  }

  return { fixedCode: fixed, fixes };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CODE TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════════

const CODE_TEMPLATES = {
  python: {
    hello: 'print("Hello, World!")',
    input: 'name = input("Enter your name: ")\nprint(f"Hello, {name}!")',
    loop: 'for i in range(10):\n    print(f"Number: {i}")',
    function: 'def greet(name):\n    return f"Hello, {name}!"\n\nprint(greet("World"))',
    class: 'class Animal:\n    def __init__(self, name, sound):\n        self.name = name\n        self.sound = sound\n\n    def speak(self):\n        return f"{self.name} says {self.sound}!"\n\ndog = Animal("Dog", "Woof")\nprint(dog.speak())',
    fibonacci: 'def fib(n):\n    a, b = 0, 1\n    for _ in range(n):\n        print(a, end=" ")\n        a, b = b, a + b\n\nfib(20)',
    sort: 'arr = [64, 34, 25, 12, 22, 11, 90]\nprint(f"Original: {arr}")\narr.sort()\nprint(f"Sorted: {arr}")',
    api: 'import urllib.request\nimport json\n\nurl = "https://api.github.com"\nwith urllib.request.urlopen(url) as response:\n    data = json.loads(response.read())\n    print(json.dumps(data, indent=2))',
  },
  javascript: {
    hello: 'console.log("Hello, World!");',
    array: 'const nums = [1, 2, 3, 4, 5];\nconst doubled = nums.map(n => n * 2);\nconst sum = nums.reduce((a, b) => a + b, 0);\nconsole.log("Doubled:", doubled);\nconsole.log("Sum:", sum);',
    async: 'async function fetchData() {\n  const response = await fetch("https://api.github.com");\n  const data = await response.json();\n  console.log(JSON.stringify(data, null, 2));\n}\nfetchData();',
    class: 'class Calculator {\n  constructor() { this.result = 0; }\n  add(n) { this.result += n; return this; }\n  sub(n) { this.result -= n; return this; }\n  mul(n) { this.result *= n; return this; }\n  get() { return this.result; }\n}\n\nconst calc = new Calculator();\nconsole.log(calc.add(10).mul(2).sub(5).get());',
    fibonacci: 'function* fibonacci() {\n  let [a, b] = [0, 1];\n  while (true) {\n    yield a;\n    [a, b] = [b, a + b];\n  }\n}\n\nconst fib = fibonacci();\nfor (let i = 0; i < 15; i++) {\n  process.stdout.write(fib.next().value + " ");\n}',
  },
  c: {
    hello: '#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}',
    input: '#include <stdio.h>\n\nint main() {\n    int a, b;\n    printf("Enter two numbers: ");\n    scanf("%d %d", &a, &b);\n    printf("Sum: %d\\n", a + b);\n    return 0;\n}',
    sort: '#include <stdio.h>\n\nvoid bubbleSort(int arr[], int n) {\n    for (int i = 0; i < n-1; i++)\n        for (int j = 0; j < n-i-1; j++)\n            if (arr[j] > arr[j+1]) {\n                int temp = arr[j];\n                arr[j] = arr[j+1];\n                arr[j+1] = temp;\n            }\n}\n\nint main() {\n    int arr[] = {64, 34, 25, 12, 22, 11, 90};\n    int n = sizeof(arr)/sizeof(arr[0]);\n    bubbleSort(arr, n);\n    printf("Sorted: ");\n    for (int i = 0; i < n; i++) printf("%d ", arr[i]);\n    return 0;\n}',
  },
  'c++': {
    hello: '#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, World!" << endl;\n    return 0;\n}',
    vector: '#include <iostream>\n#include <vector>\n#include <algorithm>\nusing namespace std;\n\nint main() {\n    vector<int> v = {5, 3, 8, 1, 9, 2};\n    sort(v.begin(), v.end());\n    for (int x : v) cout << x << " ";\n    cout << endl;\n    return 0;\n}',
  },
  java: {
    hello: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}',
    class: 'public class Main {\n    static class Person {\n        String name;\n        int age;\n        Person(String name, int age) {\n            this.name = name;\n            this.age = age;\n        }\n        String greet() {\n            return "Hi, I\'m " + name + ", age " + age;\n        }\n    }\n\n    public static void main(String[] args) {\n        Person p = new Person("Alice", 25);\n        System.out.println(p.greet());\n    }\n}',
  },
  go: {
    hello: 'package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello, World!")\n}',
    goroutine: 'package main\n\nimport (\n    "fmt"\n    "sync"\n)\n\nfunc main() {\n    var wg sync.WaitGroup\n    for i := 0; i < 5; i++ {\n        wg.Add(1)\n        go func(id int) {\n            defer wg.Done()\n            fmt.Printf("Goroutine %d running\\n", id)\n        }(i)\n    }\n    wg.Wait()\n    fmt.Println("All done!")\n}',
  },
  rust: {
    hello: 'fn main() {\n    println!("Hello, World!");\n}',
    ownership: 'fn main() {\n    let s1 = String::from("hello");\n    let s2 = s1.clone();\n    println!("s1 = {}, s2 = {}", s1, s2);\n\n    let v = vec![1, 2, 3, 4, 5];\n    let sum: i32 = v.iter().sum();\n    println!("Sum of {:?} = {}", v, sum);\n}',
  },
};

function getCodeTemplate(language, templateName) {
  const lang = resolveRuntime(language);
  if (!lang || !CODE_TEMPLATES[lang]) {
    return { success: false, error: `No templates available for ${language}` };
  }
  const templates = CODE_TEMPLATES[lang];
  if (templateName && templates[templateName]) {
    return { success: true, language: lang, name: templateName, code: templates[templateName] };
  }
  // Return list of available templates
  return {
    success: true,
    language: lang,
    templates: Object.keys(templates).map(k => ({ name: k, preview: templates[k].split('\n')[0] }))
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MEDIA FEATURES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Search wallpapers from Wallhaven
 */
async function searchWallpapers(query, options = {}) {
  try {
    const params = new URLSearchParams({
      q: query,
      categories: options.categories || '111',
      purity: options.purity || '100',
      sorting: options.sorting || 'relevance',
      order: options.order || 'desc',
      page: options.page || 1
    });
    
    const response = await fetch(`${CONFIG.wallhaven.api}?${params}`);
    const data = await response.json();
    
    if (data.data && data.data.length > 0) {
      return {
        success: true,
        wallpapers: data.data.slice(0, 10).map(w => ({
          id: w.id,
          url: w.path,
          thumbnail: w.thumbs?.large || w.thumbs?.original,
          resolution: w.resolution,
          colors: w.colors,
          category: w.category,
          purity: w.purity
        })),
        meta: data.meta
      };
    }
    return { success: false, error: 'No wallpapers found' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // Downloads
  downloadMedia,
  downloadWithVKR,
  downloadTikTok,
  downloadSpotify,
  cleanupDownload,
  detectPlatform,
  URL_PATTERNS,
  
  // Music
  getLyrics,
  searchLyricsLRCLIB,
  searchMusic,
  getSongById,
  downloadMusic,
  
  // Movies/TV
  searchMedia,
  getMediaDetails,
  getTrailers,
  
  // Utilities
  generateQR,
  scanQR,
  shortenURL,
  convertCurrency,
  getWeather,
  translateText,
  convertUnit,
  
  // Knowledge
  getWikipedia,
  getDefinition,
  getRandomFact,
  getThisDayInHistory,
  
  // Fun
  getRandomQuote,
  generateQuoteImage,
  getTruthOrDare,
  getWouldYouRather,
  
  // Dev Tools
  runCode,
  resolveRuntime,
  getSupportedLanguages,
  autoFixCode,
  getCodeTemplate,
  CODE_TEMPLATES,
  
  // Media
  searchWallpapers,
  
  // Config
  CONFIG
};
