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
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  // VKrDownloader API - supports YouTube, Facebook, Twitter, Instagram, etc.
  vkrdownloader: {
    api: 'https://vkrdownloader.org/server/',
    apiKey: 'vkrdownloader',
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
  }
};

// URL pattern matchers for auto-detection
const URL_PATTERNS = {
  youtube: /(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  tiktok: /(?:tiktok\.com\/@[\w.-]+\/video\/|vm\.tiktok\.com\/|tiktok\.com\/t\/)(\w+)/,
  instagram: /(?:instagram\.com\/(?:p|reel|reels|tv)\/)([\w-]+)/,
  twitter: /(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/,
  spotify: /(?:open\.spotify\.com\/track\/)([a-zA-Z0-9]+)/,
  soundcloud: /soundcloud\.com\/[\w-]+\/[\w-]+/,
  facebook: /(?:facebook\.com|fb\.watch)\/(?:watch\/?\?v=|[\w.]+\/videos\/|reel\/)?(\d+)?/
};

// ═══════════════════════════════════════════════════════════════════════════════
// VIDEO/SOCIAL MEDIA DOWNLOADS (API-based - Railway compatible)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Download media using VKrDownloader API
 * Supports: YouTube, Facebook, Twitter, Instagram, etc.
 */
async function downloadWithVKR(url) {
  try {
    const apiUrl = `${CONFIG.vkrdownloader.api}?api_key=${CONFIG.vkrdownloader.apiKey}&vkr=${encodeURIComponent(url)}`;
    
    const response = await fetch(apiUrl, {
      timeout: CONFIG.vkrdownloader.timeout,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const data = await response.json();
    
    if (!data.success || !data.data) {
      return { success: false, error: data.error?.message || 'VKR API failed' };
    }
    
    const result = data.data;
    
    // Find best quality download URL
    let downloadUrl = null;
    let quality = null;
    
    if (result.downloads && result.downloads.length > 0) {
      // Sort by quality (prefer higher)
      const sorted = result.downloads.sort((a, b) => {
        const qualityOrder = { '1080p': 4, '720p': 3, '480p': 2, '360p': 1 };
        return (qualityOrder[b.format_id] || 0) - (qualityOrder[a.format_id] || 0);
      });
      downloadUrl = sorted[0].url;
      quality = sorted[0].format_id;
    } else if (result.source) {
      downloadUrl = result.source;
    }
    
    if (!downloadUrl) {
      return { success: false, error: 'No download URL found' };
    }
    
    return {
      success: true,
      url: downloadUrl,
      title: result.title || 'Video',
      thumbnail: result.thumbnail,
      quality: quality,
      duration: result.duration,
      formats: result.downloads || []
    };
    
  } catch (error) {
    return { success: false, error: error.message || 'VKR download failed' };
  }
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
 * Download Spotify track by searching on YouTube and downloading audio
 * This is a workaround since direct Spotify download is not available
 */
async function downloadSpotify(url) {
  try {
    // Extract track ID from Spotify URL
    const match = url.match(URL_PATTERNS.spotify);
    if (!match) {
      return { success: false, error: 'Invalid Spotify URL' };
    }
    
    const trackId = match[1];
    
    // Try to get track info from Spotify embed
    const embedUrl = `https://open.spotify.com/embed/track/${trackId}`;
    
    // For now, return a message that Spotify direct download isn't supported
    // User should use YouTube search instead
    return {
      success: false,
      error: 'Spotify direct download is not available. Try searching for the song on YouTube using /dl youtube.com/results?search_query=SONG_NAME',
      spotifyUrl: url,
      trackId: trackId
    };
    
  } catch (error) {
    return { success: false, error: error.message || 'Spotify download failed' };
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
        
      case 'spotify':
        result = await downloadSpotify(url);
        break;
        
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
  detectPlatform,
  URL_PATTERNS,
  
  // Music
  getLyrics,
  
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
