/**
 * utils/parallel-api.js
 * Auto-extracted from index.js
 */

// =====================
// PARALLEL EXTRACT API
// Lines 3668-3750 from original index.js
// =====================

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

