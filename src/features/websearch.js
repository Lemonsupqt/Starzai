/**
 * features/websearch.js
 * Auto-extracted from index.js
 */

// =====================
// WEB SEARCH
// Lines 2768-3463 from original index.js
// =====================

// =====================
// WEB SEARCH - Multi-Engine Integration
// =====================

// SearXNG instances (free, open source meta search)
const SEARXNG_INSTANCES = [
  'https://search.ononoki.org',
  'https://searx.work',
  'https://search.bus-hit.me',
  'https://searx.tuxcloud.net',
  'https://search.mdosch.de',
  'https://searx.be',
  'https://search.sapti.me',
  'https://searx.tiekoetter.com'
];

// DuckDuckGo Instant Answer API (free, no key needed)
async function duckDuckGoSearch(query) {
  try {
    // DDG Instant Answer API - gives quick facts
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'StarzAI-Bot/1.0' },
      timeout: 8000
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    const results = [];
    
    // Abstract (main answer)
    if (data.Abstract) {
      results.push({
        title: data.Heading || query,
        url: data.AbstractURL || '',
        content: data.Abstract,
        engine: 'DuckDuckGo'
      });
    }
    
    // Related topics
    if (data.RelatedTopics) {
      for (const topic of data.RelatedTopics.slice(0, 4)) {
        if (topic.Text && topic.FirstURL) {
          results.push({
            title: topic.Text.split(' - ')[0] || 'Related',
            url: topic.FirstURL,
            content: topic.Text,
            engine: 'DuckDuckGo'
          });
        }
      }
    }
    
    if (results.length > 0) {
      return {
        success: true,
        results: results,
        query: query,
        instance: 'DuckDuckGo'
      };
    }
    return null;
  } catch (e) {
    console.log('DDG search error:', e.message);
    return null;
  }
}

// DuckDuckGo HTML scraping fallback (more comprehensive results)
async function duckDuckGoScrape(query, numResults = 5) {
  try {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 10000
    });
    
    if (!response.ok) return null;
    
    const html = await response.text();
    const results = [];
    
    // Parse results using regex (simple extraction)
    const resultRegex = /<a rel=\"nofollow\" class=\"result__a\" href=\"([^\"]+)\">([^<]+)<\/a>[\s\S]*?<a class=\"result__snippet\"[^>]*>([^<]*)<\/a>/g;
    let match;
    
    while ((match = resultRegex.exec(html)) !== null && results.length < numResults) {
      const [, url, title, snippet] = match;
      if (url && title) {
        results.push({
          title: title.trim(),
          url: url.startsWith('//') ? 'https:' + url : url,
          content: snippet?.trim() || 'No description',
          engine: 'DuckDuckGo'
        });
      }
    }
    
    if (results.length > 0) {
      return {
        success: true,
        results: results,
        query: query,
        instance: 'DuckDuckGo'
      };
    }
    return null;
  } catch (e) {
    console.log('DDG scrape error:', e.message);
    return null;
  }
}

// SearXNG search
async function searxngSearch(query, numResults = 5) {
  const errors = [];
  
  // Shuffle instances to distribute load
  const shuffled = [...SEARXNG_INSTANCES].sort(() => Math.random() - 0.5);
  
  for (const instance of shuffled) {
    try {
      const url = `${instance}/search?q=${encodeURIComponent(query)}&format=json&engines=google,bing,duckduckgo`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json'
        },
        timeout: 8000
      });
      
      if (!response.ok) {
        errors.push(`${instance}: HTTP ${response.status}`);
        continue;
      }
      
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        return {
          success: true,
          results: data.results.slice(0, numResults).map(r => ({
            title: r.title || 'No title',
            url: r.url || '',
            content: r.content || r.snippet || 'No description',
            engine: r.engine || 'SearXNG'
          })),
          query: query,
          instance: instance
        };
      }
    } catch (e) {
      errors.push(`${instance}: ${e.message}`);
    }
  }
  
  return { success: false, errors };
}

// External Search API (web search + extraction in one call)
// Note: we intentionally do not expose the underlying provider name in user-facing text.
async function parallelWebSearch(query, numResults = 5) {
  if (!PARALLEL_API_KEY) {
    return { success: false, error: 'Search API key not configured', query };
  }

  try {
    const response = await fetch('https://api.parallel.ai/v1beta/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': PARALLEL_API_KEY,
        'parallel-beta': 'search-extract-2025-10-10',
      },
      body: JSON.stringify({
        objective: query,
        mode: 'one-shot',
        max_results: numResults,
        excerpts: {
          max_chars_per_result: 1500,
        },
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      console.log('External web search HTTP error:', response.status, text.slice(0, 500));
      return {
        success: false,
        error: `HTTP ${response.status}: ${text.slice(0, 200) || "Unknown error from search API"}`,
        query,
        status: response.status,
      };
    }

    const data = await response.json();
    const rawResults = Array.isArray(data.results) ? data.results : [];

    const results = rawResults.slice(0, numResults).map((r) => {
      const excerpts =
        Array.isArray(r.excerpts)
          ? r.excerpts.join("\n\n")
          : (typeof r.excerpts === "string" ? r.excerpts : "");
      const content = excerpts || "";
      return {
        title: r.title || r.url || "No title",
        url: r.url || "",
        content: content || "No description",
        engine: "external-search",
      };
    });

    return {
      success: true,
      results,
      query,
      instance: 'external-search',
    };
  } catch (e) {
    console.log('External web search error:', e.message);
    return {
      success: false,
      error: e.message || 'External web search failed',
      query,
    };
  }
}

// Main web search function - tries multiple sources
async function webSearch(query, numResults = 5) {
  // Prefer Parallel.ai Search API if configured
  if (PARALLEL_API_KEY) {
    const parallelResult = await parallelWebSearch(query, numResults);
    if (parallelResult.success && parallelResult.results && parallelResult.results.length > 0) {
      return parallelResult;
    }
  }

  // Try SearXNG first (best results, uses Google/Bing)
  const searxResult = await searxngSearch(query, numResults);
  if (searxResult.success) return searxResult;
  
  // Try DuckDuckGo scrape (comprehensive)
  const ddgScrape = await duckDuckGoScrape(query, numResults);
  if (ddgScrape) return ddgScrape;
  
  // Try DuckDuckGo Instant Answer API (quick facts)
  const ddgInstant = await duckDuckGoSearch(query);
  if (ddgInstant) return ddgInstant;
  
  return {
    success: false,
    error: 'All search engines unavailable. Try again later.',
    query: query
  };
}

// Check if a message is asking about time/date
function isTimeQuery(text) {
  const lowerText = text.toLowerCase();
  const timePatterns = [
    /what('s|\s+is)\s+(the\s+)?time/i,
    /current\s+time/i,
    /time\s+(now|right now|in|at)/i,
    /what\s+time\s+is\s+it/i,
    /tell\s+(me\s+)?the\s+time/i,
    /what('s|\s+is)\s+(the\s+)?(date|day)/i,
    /today('s)?\s+date/i,
    /what\s+day\s+is\s+(it|today)/i
  ];
  return timePatterns.some(pattern => pattern.test(lowerText));
}

// Extract timezone/location from time query
// Comprehensive mapping of countries, cities, and timezone abbreviations
function extractTimezone(text) {
  const lowerText = text.toLowerCase();
  
  // Comprehensive timezone mappings - ordered by specificity (longer matches first)
  // Format: [searchTerm, IANA timezone, displayName]
  const timezones = [
    // Multi-word locations (check these first)
    ['new york', 'America/New_York', 'New York'],
    ['los angeles', 'America/Los_Angeles', 'Los Angeles'],
    ['hong kong', 'Asia/Hong_Kong', 'Hong Kong'],
    ['new zealand', 'Pacific/Auckland', 'New Zealand'],
    ['south africa', 'Africa/Johannesburg', 'South Africa'],
    ['south korea', 'Asia/Seoul', 'South Korea'],
    ['north korea', 'Asia/Pyongyang', 'North Korea'],
    ['saudi arabia', 'Asia/Riyadh', 'Saudi Arabia'],
    ['sri lanka', 'Asia/Colombo', 'Sri Lanka'],
    ['costa rica', 'America/Costa_Rica', 'Costa Rica'],
    ['puerto rico', 'America/Puerto_Rico', 'Puerto Rico'],
    ['el salvador', 'America/El_Salvador', 'El Salvador'],
    ['united kingdom', 'Europe/London', 'United Kingdom'],
    ['united states', 'America/New_York', 'United States (Eastern)'],
    ['united arab emirates', 'Asia/Dubai', 'UAE'],
    
    // European countries
    ['poland', 'Europe/Warsaw', 'Poland'],
    ['warsaw', 'Europe/Warsaw', 'Warsaw'],
    ['germany', 'Europe/Berlin', 'Germany'],
    ['berlin', 'Europe/Berlin', 'Berlin'],
    ['france', 'Europe/Paris', 'France'],
    ['paris', 'Europe/Paris', 'Paris'],
    ['spain', 'Europe/Madrid', 'Spain'],
    ['madrid', 'Europe/Madrid', 'Madrid'],
    ['barcelona', 'Europe/Madrid', 'Barcelona'],
    ['italy', 'Europe/Rome', 'Italy'],
    ['rome', 'Europe/Rome', 'Rome'],
    ['milan', 'Europe/Rome', 'Milan'],
    ['netherlands', 'Europe/Amsterdam', 'Netherlands'],
    ['amsterdam', 'Europe/Amsterdam', 'Amsterdam'],
    ['belgium', 'Europe/Brussels', 'Belgium'],
    ['brussels', 'Europe/Brussels', 'Brussels'],
    ['switzerland', 'Europe/Zurich', 'Switzerland'],
    ['zurich', 'Europe/Zurich', 'Zurich'],
    ['austria', 'Europe/Vienna', 'Austria'],
    ['vienna', 'Europe/Vienna', 'Vienna'],
    ['sweden', 'Europe/Stockholm', 'Sweden'],
    ['stockholm', 'Europe/Stockholm', 'Stockholm'],
    ['norway', 'Europe/Oslo', 'Norway'],
    ['oslo', 'Europe/Oslo', 'Oslo'],
    ['denmark', 'Europe/Copenhagen', 'Denmark'],
    ['copenhagen', 'Europe/Copenhagen', 'Copenhagen'],
    ['finland', 'Europe/Helsinki', 'Finland'],
    ['helsinki', 'Europe/Helsinki', 'Helsinki'],
    ['portugal', 'Europe/Lisbon', 'Portugal'],
    ['lisbon', 'Europe/Lisbon', 'Lisbon'],
    ['greece', 'Europe/Athens', 'Greece'],
    ['athens', 'Europe/Athens', 'Athens'],
    ['turkey', 'Europe/Istanbul', 'Turkey'],
    ['istanbul', 'Europe/Istanbul', 'Istanbul'],
    ['ukraine', 'Europe/Kiev', 'Ukraine'],
    ['kyiv', 'Europe/Kiev', 'Kyiv'],
    ['kiev', 'Europe/Kiev', 'Kiev'],
    ['czech', 'Europe/Prague', 'Czech Republic'],
    ['prague', 'Europe/Prague', 'Prague'],
    ['hungary', 'Europe/Budapest', 'Hungary'],
    ['budapest', 'Europe/Budapest', 'Budapest'],
    ['romania', 'Europe/Bucharest', 'Romania'],
    ['bucharest', 'Europe/Bucharest', 'Bucharest'],
    ['ireland', 'Europe/Dublin', 'Ireland'],
    ['dublin', 'Europe/Dublin', 'Dublin'],
    ['scotland', 'Europe/London', 'Scotland'],
    ['wales', 'Europe/London', 'Wales'],
    ['england', 'Europe/London', 'England'],
    ['london', 'Europe/London', 'London'],
    ['uk', 'Europe/London', 'UK'],
    ['russia', 'Europe/Moscow', 'Russia'],
    ['moscow', 'Europe/Moscow', 'Moscow'],
    
    // Asian countries
    ['india', 'Asia/Kolkata', 'India'],
    ['mumbai', 'Asia/Kolkata', 'Mumbai'],
    ['delhi', 'Asia/Kolkata', 'Delhi'],
    ['bangalore', 'Asia/Kolkata', 'Bangalore'],
    ['kolkata', 'Asia/Kolkata', 'Kolkata'],
    ['chennai', 'Asia/Kolkata', 'Chennai'],
    ['japan', 'Asia/Tokyo', 'Japan'],
    ['tokyo', 'Asia/Tokyo', 'Tokyo'],
    ['osaka', 'Asia/Tokyo', 'Osaka'],
    ['china', 'Asia/Shanghai', 'China'],
    ['beijing', 'Asia/Shanghai', 'Beijing'],
    ['shanghai', 'Asia/Shanghai', 'Shanghai'],
    ['korea', 'Asia/Seoul', 'South Korea'],
    ['seoul', 'Asia/Seoul', 'Seoul'],
    ['singapore', 'Asia/Singapore', 'Singapore'],
    ['malaysia', 'Asia/Kuala_Lumpur', 'Malaysia'],
    ['kuala lumpur', 'Asia/Kuala_Lumpur', 'Kuala Lumpur'],
    ['thailand', 'Asia/Bangkok', 'Thailand'],
    ['bangkok', 'Asia/Bangkok', 'Bangkok'],
    ['vietnam', 'Asia/Ho_Chi_Minh', 'Vietnam'],
    ['hanoi', 'Asia/Ho_Chi_Minh', 'Hanoi'],
    ['indonesia', 'Asia/Jakarta', 'Indonesia'],
    ['jakarta', 'Asia/Jakarta', 'Jakarta'],
    ['philippines', 'Asia/Manila', 'Philippines'],
    ['manila', 'Asia/Manila', 'Manila'],
    ['pakistan', 'Asia/Karachi', 'Pakistan'],
    ['karachi', 'Asia/Karachi', 'Karachi'],
    ['bangladesh', 'Asia/Dhaka', 'Bangladesh'],
    ['dhaka', 'Asia/Dhaka', 'Dhaka'],
    ['nepal', 'Asia/Kathmandu', 'Nepal'],
    ['kathmandu', 'Asia/Kathmandu', 'Kathmandu'],
    ['iran', 'Asia/Tehran', 'Iran'],
    ['tehran', 'Asia/Tehran', 'Tehran'],
    ['iraq', 'Asia/Baghdad', 'Iraq'],
    ['baghdad', 'Asia/Baghdad', 'Baghdad'],
    ['israel', 'Asia/Jerusalem', 'Israel'],
    ['jerusalem', 'Asia/Jerusalem', 'Jerusalem'],
    ['tel aviv', 'Asia/Jerusalem', 'Tel Aviv'],
    ['dubai', 'Asia/Dubai', 'Dubai'],
    ['uae', 'Asia/Dubai', 'UAE'],
    ['qatar', 'Asia/Qatar', 'Qatar'],
    ['doha', 'Asia/Qatar', 'Doha'],
    ['kuwait', 'Asia/Kuwait', 'Kuwait'],
    ['bahrain', 'Asia/Bahrain', 'Bahrain'],
    ['oman', 'Asia/Muscat', 'Oman'],
    ['riyadh', 'Asia/Riyadh', 'Riyadh'],
    ['taiwan', 'Asia/Taipei', 'Taiwan'],
    ['taipei', 'Asia/Taipei', 'Taipei'],
    
    // Americas
    ['usa', 'America/New_York', 'USA (Eastern)'],
    ['america', 'America/New_York', 'USA (Eastern)'],
    ['nyc', 'America/New_York', 'New York'],
    ['boston', 'America/New_York', 'Boston'],
    ['miami', 'America/New_York', 'Miami'],
    ['washington', 'America/New_York', 'Washington DC'],
    ['chicago', 'America/Chicago', 'Chicago'],
    ['dallas', 'America/Chicago', 'Dallas'],
    ['houston', 'America/Chicago', 'Houston'],
    ['denver', 'America/Denver', 'Denver'],
    ['phoenix', 'America/Phoenix', 'Phoenix'],
    ['seattle', 'America/Los_Angeles', 'Seattle'],
    ['san francisco', 'America/Los_Angeles', 'San Francisco'],
    ['california', 'America/Los_Angeles', 'California'],
    ['canada', 'America/Toronto', 'Canada (Eastern)'],
    ['toronto', 'America/Toronto', 'Toronto'],
    ['vancouver', 'America/Vancouver', 'Vancouver'],
    ['montreal', 'America/Montreal', 'Montreal'],
    ['mexico', 'America/Mexico_City', 'Mexico'],
    ['mexico city', 'America/Mexico_City', 'Mexico City'],
    ['brazil', 'America/Sao_Paulo', 'Brazil'],
    ['sao paulo', 'America/Sao_Paulo', 'São Paulo'],
    ['rio', 'America/Sao_Paulo', 'Rio de Janeiro'],
    ['argentina', 'America/Argentina/Buenos_Aires', 'Argentina'],
    ['buenos aires', 'America/Argentina/Buenos_Aires', 'Buenos Aires'],
    ['chile', 'America/Santiago', 'Chile'],
    ['santiago', 'America/Santiago', 'Santiago'],
    ['colombia', 'America/Bogota', 'Colombia'],
    ['bogota', 'America/Bogota', 'Bogotá'],
    ['peru', 'America/Lima', 'Peru'],
    ['lima', 'America/Lima', 'Lima'],
    ['venezuela', 'America/Caracas', 'Venezuela'],
    ['caracas', 'America/Caracas', 'Caracas'],
    ['cuba', 'America/Havana', 'Cuba'],
    ['havana', 'America/Havana', 'Havana'],
    ['jamaica', 'America/Jamaica', 'Jamaica'],
    ['panama', 'America/Panama', 'Panama'],
    
    // Oceania
    ['australia', 'Australia/Sydney', 'Australia (Sydney)'],
    ['sydney', 'Australia/Sydney', 'Sydney'],
    ['melbourne', 'Australia/Melbourne', 'Melbourne'],
    ['brisbane', 'Australia/Brisbane', 'Brisbane'],
    ['perth', 'Australia/Perth', 'Perth'],
    ['auckland', 'Pacific/Auckland', 'Auckland'],
    ['fiji', 'Pacific/Fiji', 'Fiji'],
    ['hawaii', 'Pacific/Honolulu', 'Hawaii'],
    ['honolulu', 'Pacific/Honolulu', 'Honolulu'],
    
    // Africa
    ['egypt', 'Africa/Cairo', 'Egypt'],
    ['cairo', 'Africa/Cairo', 'Cairo'],
    ['nigeria', 'Africa/Lagos', 'Nigeria'],
    ['lagos', 'Africa/Lagos', 'Lagos'],
    ['kenya', 'Africa/Nairobi', 'Kenya'],
    ['nairobi', 'Africa/Nairobi', 'Nairobi'],
    ['morocco', 'Africa/Casablanca', 'Morocco'],
    ['casablanca', 'Africa/Casablanca', 'Casablanca'],
    ['johannesburg', 'Africa/Johannesburg', 'Johannesburg'],
    ['cape town', 'Africa/Johannesburg', 'Cape Town'],
    ['ethiopia', 'Africa/Addis_Ababa', 'Ethiopia'],
    ['ghana', 'Africa/Accra', 'Ghana'],
    ['accra', 'Africa/Accra', 'Accra'],
    
    // Timezone abbreviations (less specific, check last)
    ['ist', 'Asia/Kolkata', 'India (IST)'],
    ['pst', 'America/Los_Angeles', 'Pacific Time'],
    ['pdt', 'America/Los_Angeles', 'Pacific Time'],
    ['mst', 'America/Denver', 'Mountain Time'],
    ['mdt', 'America/Denver', 'Mountain Time'],
    ['cst', 'America/Chicago', 'Central Time'],
    ['cdt', 'America/Chicago', 'Central Time'],
    ['est', 'America/New_York', 'Eastern Time'],
    ['edt', 'America/New_York', 'Eastern Time'],
    ['gmt', 'Europe/London', 'GMT'],
    ['bst', 'Europe/London', 'UK'],
    ['cet', 'Europe/Paris', 'Central European Time'],
    ['cest', 'Europe/Paris', 'Central European Time'],
    ['eet', 'Europe/Athens', 'Eastern European Time'],
    ['jst', 'Asia/Tokyo', 'Japan (JST)'],
    ['kst', 'Asia/Seoul', 'Korea (KST)'],
    ['aest', 'Australia/Sydney', 'Australia (AEST)'],
    ['aedt', 'Australia/Sydney', 'Australia (AEDT)'],
    ['nzst', 'Pacific/Auckland', 'New Zealand'],
    ['utc', 'UTC', 'UTC'],
  ];
  
  // Check each timezone mapping (order matters - more specific first)
  for (const [key, tz, displayName] of timezones) {
    if (lowerText.includes(key)) {
      return { timezone: tz, location: displayName };
    }
  }
  
  return null;
}

// Get formatted time response
function getTimeResponse(text, messageDate) {
  const tzInfo = extractTimezone(text);
  const now = messageDate ? new Date(messageDate * 1000) : new Date();
  
  let timezone = 'UTC';
  let locationName = 'UTC';
  
  if (tzInfo) {
    timezone = tzInfo.timezone;
    locationName = tzInfo.location;
  }
  
  try {
    const options = {
      timeZone: timezone,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    };
    
    const formatter = new Intl.DateTimeFormat('en-US', options);
    const formatted = formatter.format(now);
    
    // Also get just time and date separately
    const timeOnly = now.toLocaleTimeString('en-US', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hour12: true });
    const dateOnly = now.toLocaleDateString('en-US', { timeZone: timezone, weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    
    return {
      isTimeQuery: true,
      response: `🕐 <b>${timeOnly}</b> in ${locationName}\n📅 ${dateOnly}`,
      timezone: timezone,
      location: locationName
    };
  } catch (e) {
    return {
      isTimeQuery: true,
      response: `🕐 Current UTC time: ${now.toUTCString()}`,
      timezone: 'UTC',
      location: 'UTC'
    };
  }
}

// Check if a message needs web search (current events, news, real-time info)
function needsWebSearch(text) {
  const lowerText = text.toLowerCase();
  
  // Don't web search for time queries - we handle those directly
  if (isTimeQuery(text)) return false;
  
  // Keywords that suggest need for current/real-time info
  const searchTriggers = [
    'latest', 'recent', 'current', 'today', 'yesterday', 'this week', 'this month',
    'news', 'update', 'happening', 'going on',
    'price of', 'stock price', 'weather in', 'score of',
    'who won', 'who is winning', 'election',
    'released', 'announced', 'launched',
    '2024', '2025', '2026',
    'search for', 'look up', 'find out', 'google'
  ];
  
  return searchTriggers.some(trigger => lowerText.includes(trigger));
}

// Format search results for AI context
function formatSearchResultsForAI(searchResult) {
  if (!searchResult.success) {
    return `[Web search failed: ${searchResult.error}]`;
  }
  
  let context = `[Web Search Results for \"${searchResult.query}\"]:\\n\\n`;
  searchResult.results.forEach((r, i) => {
    context += `${i + 1}. ${r.title}\\n`;
    context += `   URL: ${r.url}\\n`;
    context += `   ${r.content}\\n\\n`;
  });
  
  return context;
}

// Decide how many sources to show in websearch based on user tier / ownership
function getWebsearchSourceLimit(userId, totalResults) {
  const idStr = String(userId);
  if (OWNER_IDS.has(idStr)) return totalResults; // owners see all sources
  
  const user = getUserRecord(idStr);
  const tier = user?.tier || "free";
  let limit = 2; // default for free
  
  if (tier === "premium") limit = 5;
  else if (tier === "ultra") limit = 7;
  
  return Math.min(totalResults, limit);
}

// Build HTML-formatted sources list with clickable titles (one line, like: Sources: Title1, Title2)
function buildWebsearchSourcesHtml(searchResult, userId) {
  if (!searchResult || !searchResult.success || !Array.isArray(searchResult.results) || searchResult.results.length === 0) {
    return "";
  }

  const total = searchResult.results.length;
  const limit = getWebsearchSourceLimit(userId, total);
  if (!limit) return "";

  const parts = [];
  for (let i = 0; i < limit; i++) {
    const r = searchResult.results[i];
    const url = r.url || "";
    const title = escapeHTML(r.title || url || `Source ${i + 1}`);

    if (url) {
      parts.push(`<a href="${url}">${title}</a>`);
    } else {
      parts.push(title);
    }
  }

  let html = "\n\n<b>Sources:</b> " + parts.join(", ");
  const idStr = String(userId);
  if (limit < total && !OWNER_IDS.has(idStr)) {
    html += ` <i>(showing ${limit} of ${total})</i>`;
  }
  html += "\n";

  return html;
}

// Build inline-specific sources list that uses [1], [2] style clickable indices
function buildWebsearchSourcesInlineHtml(searchResult, userId) {
  if (!searchResult || !searchResult.success || !Array.isArray(searchResult.results) || searchResult.results.length === 0) {
    return "";
  }

  const total = searchResult.results.length;
  const limit = getWebsearchSourceLimit(userId, total);
  if (!limit) return "";

  const parts = [];
  for (let i = 0; i < limit; i++) {
    const r = searchResult.results[i];
    const url = r.url || "";
    const label = `[${i + 1}]`;

    if (url) {
      parts.push(`<a href="${url}">${label}</a>`);
    } else {
      parts.push(label);
    }
  }

  let html = "\n\n<b>Sources:</b> " + parts.join(", ");
  const idStr = String(userId);
  if (limit < total && !OWNER_IDS.has(idStr)) {
    html += ` <i>(showing ${limit} of ${total})</i>`;
  }
  html += "\n";

  return html;
}

// Turn numeric citations into [1], [2] form and make them clickable links to result URLs.
function linkifyWebsearchCitations(text, searchResult) {
  if (!text || !searchResult || !Array.isArray(searchResult.results) || searchResult.results.length === 0) {
    return text;
  }

  const total = searchResult.results.length;

  // First, normalize bare numeric citations like " 1." or " 2" into "[1]" / "[2]"
  text = text.replace(/(\s)(\d+)(?=(?:[)\].,!?;:]\s|[)\].,!?;:]?$|\s|$))/g, (match, space, numStr) => {
    const idx = parseInt(numStr, 10);
    if (!idx || idx < 1 || idx > total) return match;
    return `${space}[${idx}]`;
  });

  // Then, convert [1], [2] into Markdown links so convertToTelegramHTML renders them as <a href="...">[1]</a>
  return text.replace(/\[(\d+)\](?!\()/g, (match, numStr) => {
    const idx = parseInt(numStr, 10);
    if (!idx || idx < 1 || idx > total) return match;
    const r = searchResult.results[idx - 1];
    if (!r || !r.url) return match;
    return `[${idx}](${r.url})`;
  });
}


