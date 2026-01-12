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
  piston: {
    api: 'https://emkc.org/api/v2/piston'
  },
  lyrics: {
    api: 'https://api.lyrics.ovh/v1'
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
  jiosaavn: {
    api: 'https://saavn.sumit.co/api',
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
  try {
    const response = await fetch(`${CONFIG.lyrics.api}/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`);
    const data = await response.json();
    
    if (data.lyrics) {
      return { success: true, lyrics: data.lyrics };
    }
    return { success: false, error: 'Lyrics not found' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Search for songs using JioSaavn API
 * @param {string} query - Search query (song name, artist, etc.)
 * @param {number} limit - Number of results to return (default: 10)
 * @returns {Promise<Object>} Search results with song details
 */
async function searchMusic(query, limit = 10) {
  try {
    const response = await fetch(
      `${CONFIG.jiosaavn.api}/search/songs?query=${encodeURIComponent(query)}&limit=${limit}`,
      { timeout: CONFIG.jiosaavn.timeout }
    );
    const data = await response.json();
    
    if (!data.success || !data.data?.results?.length) {
      return { success: false, error: 'No songs found' };
    }
    
    const songs = data.data.results.map(song => {
      // Decode HTML entities in all text fields
      const cleanName = decodeHTMLEntities(song.name);
      const cleanArtist = decodeHTMLEntities(song.artists?.primary?.map(a => a.name).join(', ') || 'Unknown');
      const cleanAlbum = decodeHTMLEntities(song.album?.name || 'Unknown');
      
      return {
        id: song.id,
        name: cleanName,
        artist: cleanArtist,
        album: cleanAlbum,
        year: song.year || '',
        duration: song.duration ? formatDuration(song.duration) : '',
        language: song.language || '',
        hasLyrics: song.hasLyrics || false,
        image: song.image?.find(i => i.quality === '500x500')?.url || 
               song.image?.find(i => i.quality === '150x150')?.url || '',
        downloadUrl: song.downloadUrl || [],
        filename: sanitizeFilename(`${cleanArtist} - ${cleanName}`)
      };
    });
    
    return { success: true, songs };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get song details and download URL by ID
 * @param {string} songId - JioSaavn song ID
 * @returns {Promise<Object>} Song details with download URLs
 */
async function getSongById(songId) {
  try {
    const response = await fetch(
      `${CONFIG.jiosaavn.api}/songs/${songId}`,
      { timeout: CONFIG.jiosaavn.timeout }
    );
    const data = await response.json();
    
    if (!data.success || !data.data?.length) {
      return { success: false, error: 'Song not found' };
    }
    
    const song = data.data[0];
    
    // Get the highest quality download URL (320kbps preferred)
    const downloadUrls = song.downloadUrl || [];
    const bestQuality = downloadUrls.find(d => d.quality === '320kbps') ||
                        downloadUrls.find(d => d.quality === '160kbps') ||
                        downloadUrls.find(d => d.quality === '96kbps') ||
                        downloadUrls[0];
    
    // Decode HTML entities and sanitize metadata
    const cleanName = decodeHTMLEntities(song.name);
    const cleanArtist = decodeHTMLEntities(song.artists?.primary?.map(a => a.name).join(', ') || 'Unknown');
    const cleanAlbum = decodeHTMLEntities(song.album?.name || 'Unknown');
    
    // Generate clean filename for the audio file
    const cleanFilename = sanitizeFilename(`${cleanArtist} - ${cleanName}`);
    
    return {
      success: true,
      song: {
        id: song.id,
        name: cleanName,
        artist: cleanArtist,
        album: cleanAlbum,
        year: song.year || '',
        duration: song.duration ? formatDuration(song.duration) : '',
        language: song.language || '',
        hasLyrics: song.hasLyrics || false,
        image: song.image?.find(i => i.quality === '500x500')?.url || 
               song.image?.find(i => i.quality === '150x150')?.url || '',
        downloadUrl: bestQuality?.url || null,
        quality: bestQuality?.quality || 'Unknown',
        allQualities: downloadUrls,
        filename: cleanFilename
      }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
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
    
    // Get the first (best match) song's full details
    const songId = searchResult.songs[0].id;
    const songResult = await getSongById(songId);
    
    if (!songResult.success) {
      return { success: false, error: 'Could not fetch song details' };
    }
    
    const song = songResult.song;
    
    if (!song.downloadUrl) {
      return { success: false, error: 'Download URL not available for this song' };
    }
    
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
    const qrBuffer = await QRCode.toBuffer(text, {
      errorCorrectionLevel: 'M',
      type: 'png',
      margin: 2,
      width: options.width || 300,
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
// DEV TOOLS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Run code using Piston API
 */
async function runCode(language, code) {
  try {
    const languageMap = {
      'js': 'javascript',
      'javascript': 'javascript',
      'py': 'python',
      'python': 'python',
      'java': 'java',
      'cpp': 'c++',
      'c++': 'c++',
      'c': 'c',
      'go': 'go',
      'rust': 'rust',
      'ruby': 'ruby',
      'php': 'php',
      'swift': 'swift',
      'kotlin': 'kotlin',
      'ts': 'typescript',
      'typescript': 'typescript'
    };
    
    const lang = languageMap[language.toLowerCase()];
    if (!lang) {
      return { success: false, error: 'Unsupported language' };
    }
    
    // Get runtime info
    const runtimesResponse = await fetch(`${CONFIG.piston.api}/runtimes`);
    const runtimes = await runtimesResponse.json();
    
    const runtime = runtimes.find(r => r.language === lang);
    if (!runtime) {
      return { success: false, error: `Runtime for ${lang} not found` };
    }
    
    // Execute code
    const response = await fetch(`${CONFIG.piston.api}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: runtime.language,
        version: runtime.version,
        files: [{ content: code }]
      })
    });
    
    const result = await response.json();
    
    if (result.run) {
      return {
        success: true,
        language: runtime.language,
        version: runtime.version,
        output: result.run.stdout || '',
        stderr: result.run.stderr || '',
        exitCode: result.run.code
      };
    }
    
    return { success: false, error: result.message || 'Execution failed' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get supported programming languages
 */
async function getSupportedLanguages() {
  try {
    const response = await fetch(`${CONFIG.piston.api}/runtimes`);
    const runtimes = await response.json();
    
    return {
      success: true,
      languages: runtimes.map(r => ({
        language: r.language,
        version: r.version,
        aliases: r.aliases
      }))
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
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
  searchMusic,
  getSongById,
  downloadMusic,
  
  // Movies/TV
  searchMedia,
  getMediaDetails,
  getTrailers,
  
  // Utilities
  generateQR,
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
  getSupportedLanguages,
  
  // Media
  searchWallpapers,
  
  // Config
  CONFIG
};
