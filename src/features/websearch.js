/**
 * Web Search Module
 * Multi-engine web search integration
 */

import { PARALLEL_API_KEY } from "../config/index.js";

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

// =====================
// Search Engines
// =====================

/**
 * DuckDuckGo Instant Answer API
 */
async function duckDuckGoSearch(query) {
  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'StarzAI-Bot/1.0' },
      timeout: 8000
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    const results = [];
    
    if (data.Abstract) {
      results.push({
        title: data.Heading || query,
        url: data.AbstractURL || '',
        content: data.Abstract,
        engine: 'DuckDuckGo'
      });
    }
    
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

/**
 * DuckDuckGo HTML scraping fallback
 */
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

/**
 * SearXNG search
 */
async function searxngSearch(query, numResults = 5) {
  const errors = [];
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

/**
 * Parallel.ai Search API
 */
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
        error: `HTTP ${response.status}: ${text.slice(0, 200) || "Unknown error"}`,
        query,
        status: response.status,
      };
    }

    const data = await response.json();
    const rawResults = Array.isArray(data.results) ? data.results : [];

    const results = rawResults.slice(0, numResults).map((r) => {
      const excerpts = Array.isArray(r.excerpts)
        ? r.excerpts.join("\n\n")
        : (typeof r.excerpts === "string" ? r.excerpts : "");
      return {
        title: r.title || r.url || "No title",
        url: r.url || "",
        content: excerpts || "No description",
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

// =====================
// Main Search Function
// =====================

/**
 * Main web search - tries multiple sources
 */
export async function webSearch(query, numResults = 5) {
  // Prefer Parallel.ai Search API if configured
  if (PARALLEL_API_KEY) {
    const parallelResult = await parallelWebSearch(query, numResults);
    if (parallelResult.success && parallelResult.results?.length > 0) {
      return parallelResult;
    }
  }

  // Try SearXNG first (best results)
  const searxResult = await searxngSearch(query, numResults);
  if (searxResult.success) return searxResult;
  
  // Try DuckDuckGo scrape
  const ddgScrape = await duckDuckGoScrape(query, numResults);
  if (ddgScrape) return ddgScrape;
  
  // Try DuckDuckGo Instant Answer API
  const ddgInstant = await duckDuckGoSearch(query);
  if (ddgInstant) return ddgInstant;
  
  return {
    success: false,
    error: 'All search engines unavailable. Try again later.',
    query: query
  };
}

// =====================
// Search Result Formatting
// =====================

/**
 * Format search results for AI context
 */
export function formatSearchResultsForAI(searchResult) {
  if (!searchResult.success || !searchResult.results) {
    return "No search results available.";
  }
  
  let context = "Web Search Results:\n\n";
  
  searchResult.results.forEach((r, i) => {
    context += `[${i + 1}] ${r.title}\n`;
    context += `URL: ${r.url}\n`;
    context += `${r.content}\n\n`;
  });
  
  return context;
}

/**
 * Build sources HTML for display
 */
export function buildWebsearchSourcesHtml(searchResult, userId) {
  if (!searchResult.success || !searchResult.results) {
    return "";
  }
  
  let html = "\n\n<b>Sources:</b>\n";
  
  searchResult.results.forEach((r, i) => {
    const domain = new URL(r.url).hostname.replace('www.', '');
    html += `[${i + 1}] <a href="${r.url}">${domain}</a>\n`;
  });
  
  return html;
}
