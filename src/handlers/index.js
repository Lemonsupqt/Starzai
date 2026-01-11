/**
 * Handlers Module Index
 */

export * from './inline.js';
export * from './callbacks.js';
export * from './messages.js';

// Re-export registration functions
import { registerInlineHandler, registerInlineCallbacks } from './inline.js';
import { registerAllCallbacks } from './callbacks.js';
import { registerMessageHandler, clearChatHistory } from './messages.js';

/**
 * Register all handlers
 */
export function registerAllHandlers(bot) {
  registerInlineHandler(bot);
  registerInlineCallbacks(bot);
  registerAllCallbacks(bot);
  registerMessageHandler(bot);
}

export { clearChatHistory };
