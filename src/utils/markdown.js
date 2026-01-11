/**
 * utils/markdown.js
 * Auto-extracted from index.js
 */

// =====================
// MARKDOWN CONVERTER
// Lines 3464-3667 from original index.js
// =====================

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

// =====================
// MARKDOWN CONVERTER - AI output to Telegram HTML format
// =====================
// AI outputs standard Markdown, but Telegram uses different syntax.
// We convert to HTML format which is most reliable and supports:
// - <b>bold</b>
// - <i>italic</i>
// - <u>underline</u>
// - <s>strikethrough</s>
// - <code>inline code</code>
// - <pre>code blocks</pre>
// - <pre><code class="language-xxx">syntax highlighted code</code></pre>
// - <blockquote>quotes</blockquote>
// - <a href="url">links</a>
function convertToTelegramHTML(text) {
  if (!text) return text;

  let result = String(text);

  // Step 1: Protect and convert code blocks with language (```python ... ```)
  const codeBlocksWithLang = [];
  result = result.replace(/```(\w+)\n([\s\S]*?)```/g, (match, lang, code) => {
    const escapedCode = escapeHTML(code.trim());
    codeBlocksWithLang.push(`<pre><code class="language-${lang}">${escapedCode}</code></pre>`);
    return `@@CODEBLOCK_LANG_${codeBlocksWithLang.length - 1}@@`;
  });

  // Step 2: Protect and convert code blocks without language (``` ... ```)
  const codeBlocks = [];
  result = result.replace(/```([\s\S]*?)```/g, (match, code) => {
    const escapedCode = escapeHTML(code.trim());
    codeBlocks.push(`<pre>${escapedCode}</pre>`);
    return `@@CODEBLOCK_${codeBlocks.length - 1}@@`;
  });

  // Step 3: Protect and convert inline code (`...`)
  const inlineCode = [];
  result = result.replace(/`([^`]+)`/g, (match, code) => {
    const escapedCode = escapeHTML(code);
    inlineCode.push(`<code>${escapedCode}</code>`);
    return `@@INLINECODE_${inlineCode.length - 1}@@`;
  });

  // Step 4: Escape remaining HTML special characters
  result = escapeHTML(result);

  // Step 5: Convert Markdown to HTML

  // Headers (# Header) -> bold
  result = result.replace(/^#{1,6}\s*(.+)$/gm, '<b>$1</b>');

  // Bold + Italic (***text*** or ___text___)
  result = result.replace(/\*\*\*([^*]+)\*\*\*/g, '<b><i>$1</i></b>');
  result = result.replace(/___([^_]+)___/g, '<b><i>$1</i></b>');

  // Bold (**text** or __text__)
  result = result.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  result = result.replace(/__([^_]+)__/g, '<b>$1</b>');

  // Italic (*text* or _text_)
  result = result.replace(/(?<!\w)\*([^*\n]+)\*(?!\w)/g, '<i>$1</i>');
  result = result.replace(/(?<!\w)_([^_\n]+)_(?!\w)/g, '<i>$1</i>');

  // Strikethrough (~~text~~)
  result = result.replace(/~~([^~]+)~~/g, '<s>$1</s>');

  // Block quotes (> text)
  // At this point '>' has been escaped to '&gt;' by escapeHTML, so we match that.
  result = result.replace(/^&gt;\s*(.+)$/gm, '<blockquote>$1</blockquote>');
  // Merge consecutive blockquotes
  result = result.replace(/<\/blockquote>\n<blockquote>/g, '\n');

  // Links [text](url)
  // If the link text is purely numeric (e.g. "1"), render it as a bracketed citation "[1]".
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, label, url) => {
    const trimmed = String(label).trim();
    if (/^\d+$/.test(trimmed)) {
      return `<a href="${url}">[${trimmed}]</a>`;
    }

