/**
 * utils/markdown.js
 * Auto-extracted from index.js
 */

// =====================
// MARKDOWN CONVERTER
// Lines 3464-3667 from original index.js
// =====================

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
    return `<a href="${url}">${trimmed}</a>`;
  });

  // Horizontal rules (--- or ***)
  result = result.replace(/^(---|\*\*\*|___)$/gm, '──────────');

  // Bullet points (- item or * item)
  result = result.replace(/^[-*]\s+(.+)$/gm, '• $1');

  // Numbered lists (1. item)
  result = result.replace(/^(\d+)\.\s+(.+)$/gm, '$1. $2');

  // Step 6: Restore code blocks and inline code
  inlineCode.forEach((code, i) => {
    result = result.replace(`@@INLINECODE_${i}@@`, code);
  });

  codeBlocks.forEach((code, i) => {
    result = result.replace(`@@CODEBLOCK_${i}@@`, code);
  });

  codeBlocksWithLang.forEach((code, i) => {
    result = result.replace(`@@CODEBLOCK_LANG_${i}@@`, code);
  });

  return result;
}

// Helper function to escape HTML special characters
function escapeHTML(text) {
  if (!text) return text;
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Split long DM/GC answers into a visible chunk and remaining text,
// avoiding cutting mid-word or mid-sentence where possible.
// We keep maxLen fairly conservative so that after Markdown -> HTML
// conversion we stay under Telegram's ~4096 character hard limit.
function splitAnswerForDM(full, maxLen = 2400) {
  if (!full) {
    return { visible: "", remaining: "", completed: true };
  }

  const trimmed = full.trim();
  if (trimmed.length <= maxLen) {
    return { visible: trimmed, remaining: "", completed: true };
  }

  let slice = trimmed.slice(0, maxLen);
  // Reuse tail trimming helper to avoid ugly mid-sentence endings
  const cleaned = trimIncompleteTail(slice);
  const visible = cleaned;
  const remaining = trimmed.slice(visible.length).trimStart();

  return {
    visible,
    remaining,
    completed: remaining.length === 0,
  };
}

// Escape special Markdown characters (for Telegram Markdown)
// NOTE: This is only used in a few legacy paths; most new flows use HTML via convertToTelegramHTML.
function escapeMarkdown(text) {
  if (!text) return text;
  return String(text)
    .replace(/\\/g, '\\\\')
    .replace(/\*/g, '\\*')
    .replace(/_/g, '\\_')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/~/g, '\\~')
    .replace(/`/g, '\\`')
    .replace(/>/g, '\\>')
    .replace(/#/g, '\\#')
    .replace(/\+/g, '\\+')
    .replace(/-/g, '\\-')
    .replace(/=/g, '\\=')
    .replace(/\|/g, '\\|')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/\./g, '\\.')
    .replace(/!/g, '\\!/'); 
}

// Trim incomplete tail of a long answer (avoid cutting mid-word or mid-sentence)
// Used for Blackhole continuation so we don't leave broken endings like "so it me"
function trimIncompleteTail(text, maxTail = 220) {
  if (!text) return text;
  const trimmed = text.trimEnd();
  if (!trimmed) return trimmed;

  const lastChar = trimmed[trimmed.length - 1];
  // If it already ends with sensible punctuation, leave it
  if (".?!)]\"'".includes(lastChar)) {
    return trimmed;
  }

  const start = Math.max(0, trimmed.length - maxTail);
  const tail = trimmed.slice(start);

  // Prefer to cut at a sentence boundary within the tail
  const lastDot = tail.lastIndexOf(".");
  const lastQ = tail.lastIndexOf("?");
  const lastEx = tail.lastIndexOf("!");
  const lastSentenceEnd = Math.max(lastDot, lastQ, lastEx);

  if (lastSentenceEnd !== -1) {
    return trimmed.slice(0, start + lastSentenceEnd + 1);
  }

  // Otherwise cut at last space to avoid half-words
  const lastSpace = tail.lastIndexOf(" ");
  if (lastSpace !== -1) {
    return trimmed.slice(0, start + lastSpace);
  }

  return trimmed;
}


