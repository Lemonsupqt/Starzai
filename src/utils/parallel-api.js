/**
 * utils/parallel-api.js
 * Auto-extracted from index.js
 */

// =====================
// PARALLEL EXTRACT API
// Lines 3668-3750 from original index.js
// =====================

// =====================
// PARALLEL EXTRACT API
// Extract and clean content from specific URLs using an external Extract API.
// NOTE: We intentionally avoid naming the provider in user-visible text for privacy.
async function parallelExtractUrls(urls) {
  if (!PARALLEL_API_KEY) {
    return {
      success: false,
      error: "Parallel API key not configured",
      urls,
    };
  }

  const urlList = Array.isArray(urls) ? urls.filter(Boolean) : [urls].filter(Boolean);
  if (!urlList.length) {
    return {
      success: false,
      error: "No URLs provided",
      urls: [],
    };
  }

  try {
    const res = await fetch("https://api.parallel.ai/v1beta/extract", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": PARALLEL_API_KEY,
        // Official beta header for Extract API as per docs:
        // "valid values are: search-extract-2025-10-10"
        "parallel-beta": "search-extract-2025-10-10",
      },
      // Match the minimal shape shown in the official Python example:
      // urls + simple boolean excerpts/full_content flags.
      body: JSON.stringify({
        urls: urlList,
        excerpts: true,
        full_content: true,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.log("Parallel extract HTTP error:", res.status, text.slice(0, 500));
      return {
        success: false,
        error: `HTTP ${res.status}: ${text.slice(0, 200) || "Unknown error from Parallel Extract API"}`,
        urls: urlList,
        status: res.status,
      };
    }

    const data = await res.json();
    const results = Array.isArray(data.results) ? data.results : [];

    const mapped = results.map((r) => {
      const excerpts =
        Array.isArray(r.excerpts)
          ? r.excerpts.join("\n\n")
          : (typeof r.excerpts === "string" ? r.excerpts : "");
      const content = excerpts || r.full_content || "";
      return {
        url: r.url || "",
        title: r.title || (r.url || "No title"),
        content: content || "No content extracted",
      };
    });

    return {
      success: true,
      results: mapped,
      urls: urlList,
    };
  } catch (e) {
    console.log("Parallel extract error:", e.message);
    return {
      success: false,
      error: e.message || "Parallel extract failed",
      urls: Array.isArray(urls) ? urls : [urls],
    };
  }
}


