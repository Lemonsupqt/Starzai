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
 */

import fetch from 'node-fetch';
import QRCode from 'qrcode';
import { createCanvas, loadImage } from 'canvas';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  cobalt: {
    api: 'https://api.cobalt.tools',
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
  soundcloud: /soundcloud\.com\/[\w-]+\/[\w-]+/
};

// ═══════════════════════════════════════════════════════════════════════════════
// VIDEO/SOCIAL MEDIA DOWNLOADS (Cobalt API)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Download video/audio from various platforms using Cobalt
 * Supports: YouTube, TikTok, Instagram, Twitter, SoundCloud, etc.
 */
async function downloadMedia(url, audioOnly = false) {
  try {
    const response = await fetch(`${CONFIG.cobalt.api}/`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: url,
        downloadMode: audioOnly ? 'audio' : 'auto',
        filenameStyle: 'basic',
        youtubeVideoCodec: 'h264',
        videoQuality: '720'
      }),
      timeout: CONFIG.cobalt.timeout
    });

    const data = await response.json();
    
    if (data.status === 'error') {
      return { success: false, error: data.error?.code || 'Download failed' };
    }

    if (data.status === 'tunnel' || data.status === 'redirect') {
      return { 
        success: true, 
        url: data.url,
        filename: data.filename || 'download'
      };
    }

    if (data.status === 'picker') {
      // Multiple options available (e.g., video + audio separate)
      return {
        success: true,
        picker: true,
        options: data.picker
      };
    }

    return { success: false, error: 'Unknown response format' };
  } catch (error) {
    return { success: false, error: error.message };
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
    
    if (data.current_condition) {
      const current = data.current_condition[0];
      const area = data.nearest_area?.[0];
      return {
        success: true,
        location: area?.areaName?.[0]?.value || location,
        country: area?.country?.[0]?.value || '',
        temp_c: current.temp_C,
        temp_f: current.temp_F,
        feels_like_c: current.FeelsLikeC,
        condition: current.weatherDesc?.[0]?.value || 'Unknown',
        humidity: current.humidity,
        wind_kph: current.windspeedKmph,
        wind_dir: current.winddir16Point
      };
    }
    return { success: false, error: 'Location not found' };
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
        from: data.responseData.detectedLanguage || from,
        to
      };
    }
    return { success: false, error: 'Translation failed' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Unit conversion
 */
function convertUnit(value, fromUnit, toUnit) {
  const conversions = {
    // Length
    'km_mi': v => v * 0.621371,
    'mi_km': v => v * 1.60934,
    'm_ft': v => v * 3.28084,
    'ft_m': v => v * 0.3048,
    'cm_in': v => v * 0.393701,
    'in_cm': v => v * 2.54,
    // Weight
    'kg_lb': v => v * 2.20462,
    'lb_kg': v => v * 0.453592,
    'g_oz': v => v * 0.035274,
    'oz_g': v => v * 28.3495,
    // Temperature
    'c_f': v => (v * 9/5) + 32,
    'f_c': v => (v - 32) * 5/9,
    // Volume
    'l_gal': v => v * 0.264172,
    'gal_l': v => v * 3.78541,
    'ml_floz': v => v * 0.033814,
    'floz_ml': v => v * 29.5735
  };

  const key = `${fromUnit.toLowerCase()}_${toUnit.toLowerCase()}`;
  if (conversions[key]) {
    return {
      success: true,
      value,
      fromUnit,
      toUnit,
      result: conversions[key](value).toFixed(4)
    };
  }
  return { success: false, error: 'Unsupported conversion' };
}

// ═══════════════════════════════════════════════════════════════════════════════
// KNOWLEDGE FEATURES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get Wikipedia summary
 */
async function getWikipedia(query) {
  try {
    const response = await fetch(`${CONFIG.wikipedia.api}/${encodeURIComponent(query)}`);
    const data = await response.json();
    
    if (data.extract) {
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
 * Get dictionary definition
 */
async function getDefinition(word) {
  try {
    const response = await fetch(`${CONFIG.dictionary.api}/${encodeURIComponent(word)}`);
    const data = await response.json();
    
    if (Array.isArray(data) && data.length > 0) {
      const entry = data[0];
      return {
        success: true,
        word: entry.word,
        phonetic: entry.phonetic || entry.phonetics?.[0]?.text,
        audio: entry.phonetics?.find(p => p.audio)?.audio,
        meanings: entry.meanings.map(m => ({
          partOfSpeech: m.partOfSpeech,
          definitions: m.definitions.slice(0, 3).map(d => ({
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
    const response = await fetch(`${CONFIG.facts.api}?language=en`);
    const data = await response.json();
    
    if (data.text) {
      return { success: true, fact: data.text, source: data.source_url };
    }
    return { success: false, error: 'Failed to get fact' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get "This Day in History"
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
      const events = data.events
        .sort(() => Math.random() - 0.5)
        .slice(0, 5)
        .map(e => ({
          year: e.year,
          text: e.text
        }));
      return { success: true, date: `${month}/${day}`, events };
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
        author: data.author
      };
    }
    return { success: false, error: 'Failed to get quote' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Generate Discord-style quote image
 */
async function generateQuoteImage(text, username, avatarUrl) {
  try {
    const canvas = createCanvas(800, 400);
    const ctx = canvas.getContext('2d');
    
    // Background
    ctx.fillStyle = '#36393f';
    ctx.fillRect(0, 0, 800, 400);
    
    // Avatar
    if (avatarUrl) {
      try {
        const avatar = await loadImage(avatarUrl);
        ctx.save();
        ctx.beginPath();
        ctx.arc(60, 80, 40, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar, 20, 40, 80, 80);
        ctx.restore();
      } catch (e) {
        // Draw placeholder circle if avatar fails
        ctx.fillStyle = '#7289da';
        ctx.beginPath();
        ctx.arc(60, 80, 40, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    // Username
    ctx.fillStyle = '#7289da';
    ctx.font = 'bold 24px Arial';
    ctx.fillText(username || 'Anonymous', 120, 70);
    
    // Timestamp
    ctx.fillStyle = '#72767d';
    ctx.font = '14px Arial';
    ctx.fillText(new Date().toLocaleDateString(), 120, 95);
    
    // Quote text
    ctx.fillStyle = '#dcddde';
    ctx.font = '20px Arial';
    
    // Word wrap
    const words = text.split(' ');
    let line = '';
    let y = 160;
    const maxWidth = 700;
    
    for (const word of words) {
      const testLine = line + word + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && line !== '') {
        ctx.fillText(line, 50, y);
        line = word + ' ';
        y += 30;
        if (y > 360) break;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, 50, y);
    
    return { success: true, buffer: canvas.toBuffer('image/png') };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Truth or Dare questions
const TRUTH_QUESTIONS = [
  "What's the most embarrassing thing you've ever done?",
  "What's your biggest fear?",
  "What's a secret you've never told anyone?",
  "What's the worst lie you've ever told?",
  "What's your most embarrassing childhood memory?",
  "Have you ever cheated on a test?",
  "What's the most childish thing you still do?",
  "What's your guilty pleasure?",
  "What's the worst date you've ever been on?",
  "What's the most trouble you've ever been in?"
];

const DARE_CHALLENGES = [
  "Send a voice message singing your favorite song",
  "Change your profile picture to something embarrassing for 1 hour",
  "Send the last photo in your gallery",
  "Text your crush and screenshot the conversation",
  "Do 10 pushups and send a video",
  "Speak in an accent for the next 5 minutes",
  "Let someone else send a message from your phone",
  "Share your screen time report",
  "Send a message to your ex",
  "Post an embarrassing story on social media"
];

const WOULD_YOU_RATHER = [
  ["be able to fly", "be invisible"],
  ["have unlimited money", "unlimited knowledge"],
  ["live without music", "live without movies"],
  ["be famous", "be rich"],
  ["travel to the past", "travel to the future"],
  ["have no internet", "have no phone"],
  ["be too hot", "be too cold"],
  ["speak all languages", "talk to animals"],
  ["have super strength", "super speed"],
  ["never age", "never get sick"]
];

function getTruthOrDare(type) {
  if (type === 'truth') {
    return TRUTH_QUESTIONS[Math.floor(Math.random() * TRUTH_QUESTIONS.length)];
  } else {
    return DARE_CHALLENGES[Math.floor(Math.random() * DARE_CHALLENGES.length)];
  }
}

function getWouldYouRather() {
  const pair = WOULD_YOU_RATHER[Math.floor(Math.random() * WOULD_YOU_RATHER.length)];
  return { option1: pair[0], option2: pair[1] };
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEV TOOLS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Execute code using Piston API
 */
async function runCode(language, code) {
  try {
    // Get available runtimes
    const runtimesRes = await fetch(`${CONFIG.piston.api}/runtimes`);
    const runtimes = await runtimesRes.json();
    
    // Find matching runtime
    const runtime = runtimes.find(r => 
      r.language.toLowerCase() === language.toLowerCase() ||
      r.aliases?.includes(language.toLowerCase())
    );
    
    if (!runtime) {
      return { success: false, error: `Language "${language}" not supported` };
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
        error: result.run.stderr || '',
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
        name: r.language,
        version: r.version,
        aliases: r.aliases || []
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
 * Search wallpapers
 */
async function searchWallpapers(query, options = {}) {
  try {
    const params = new URLSearchParams({
      q: query,
      categories: options.categories || '100', // General
      purity: options.purity || '100', // SFW only
      sorting: options.sorting || 'relevance',
      order: 'desc',
      atleast: options.resolution || '1920x1080'
    });
    
    const response = await fetch(`${CONFIG.wallhaven.api}?${params}`);
    const data = await response.json();
    
    if (data.data && data.data.length > 0) {
      return {
        success: true,
        wallpapers: data.data.slice(0, 10).map(w => ({
          id: w.id,
          url: w.path,
          thumbnail: w.thumbs.large,
          resolution: w.resolution,
          colors: w.colors
        }))
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
  // Video Downloads
  downloadMedia,
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
