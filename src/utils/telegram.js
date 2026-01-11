/**
 * Telegram-specific Utility Functions
 */

/**
 * Convert Markdown to Telegram HTML format
 * AI outputs standard Markdown, but Telegram uses different syntax.
 */
export function convertToTelegramHTML(text) {
  if (!text) return "";
  
  let result = text;
  
  // Escape HTML entities first (except for ones we'll create)
  result = result
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  
  // Code blocks (```language\ncode```)
  result = result.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre><code class="language-${lang || 'text'}">${code.trim()}</code></pre>`;
  });
  
  // Inline code (`code`)
  result = result.replace(/`([^`]+)`/g, "<code>$1</code>");
  
  // Bold (**text** or __text__)
  result = result.replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
  result = result.replace(/__([^_]+)__/g, "<b>$1</b>");
  
  // Italic (*text* or _text_)
  result = result.replace(/\*([^*]+)\*/g, "<i>$1</i>");
  result = result.replace(/_([^_]+)_/g, "<i>$1</i>");
  
  // Strikethrough (~~text~~)
  result = result.replace(/~~([^~]+)~~/g, "<s>$1</s>");
  
  // Links [text](url)
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  
  // Blockquotes (> text)
  result = result.replace(/^&gt;\s?(.*)$/gm, "<blockquote>$1</blockquote>");
  
  // Clean up consecutive blockquotes
  result = result.replace(/<\/blockquote>\n<blockquote>/g, "\n");
  
  return result;
}

/**
 * Escape text for Telegram MarkdownV2
 */
export function escapeMarkdownV2(text) {
  if (!text) return "";
  return String(text).replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
}

/**
 * Safely answer an inline query (handles expired query errors)
 */
export async function safeAnswerInline(ctx, results, options = {}) {
  try {
    return await ctx.answerInlineQuery(results, { cache_time: 0, is_personal: true, ...options });
  } catch (e) {
    // Ignore "query is too old" errors - these are normal when AI takes too long
    if (e.description?.includes("query is too old") || e.description?.includes("query ID is invalid")) {
      console.log(`Inline query expired (normal for slow responses): ${e.description}`);
      return;
    }
    throw e;
  }
}

/**
 * Extract user display name from context
 */
export function getUserDisplayName(from) {
  if (!from) return "Unknown";
  if (from.first_name && from.last_name) {
    return `${from.first_name} ${from.last_name}`;
  }
  return from.first_name || from.username || "Unknown";
}

/**
 * Check if a chat is a group/supergroup
 */
export function isGroupChat(ctx) {
  const chatType = ctx.chat?.type;
  return chatType === "group" || chatType === "supergroup";
}

/**
 * Check if a chat is a private/DM chat
 */
export function isPrivateChat(ctx) {
  return ctx.chat?.type === "private";
}

/**
 * Get chat ID as string
 */
export function getChatId(ctx) {
  return String(ctx.chat?.id || "");
}

/**
 * Get user ID as string
 */
export function getUserId(ctx) {
  return String(ctx.from?.id || "");
}

/**
 * Split long text into chunks for Telegram's message limit
 * @param {string} text - Text to split
 * @param {number} maxLength - Maximum length per chunk (default: 4096)
 */
export function splitMessage(text, maxLength = 4096) {
  if (!text || text.length <= maxLength) return [text];
  
  const chunks = [];
  let remaining = text;
  
  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      chunks.push(remaining);
      break;
    }
    
    // Try to split at a newline
    let splitIndex = remaining.lastIndexOf("\n", maxLength);
    if (splitIndex === -1 || splitIndex < maxLength / 2) {
      // Try to split at a space
      splitIndex = remaining.lastIndexOf(" ", maxLength);
    }
    if (splitIndex === -1 || splitIndex < maxLength / 2) {
      // Force split at maxLength
      splitIndex = maxLength;
    }
    
    chunks.push(remaining.slice(0, splitIndex));
    remaining = remaining.slice(splitIndex).trim();
  }
  
  return chunks;
}
