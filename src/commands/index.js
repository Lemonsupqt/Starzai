/**
 * Commands Module Index
 */

export * from './basic.js';
export * from './admin.js';

// Re-export registration functions
import { registerBasicCommands } from './basic.js';
import { registerAdminCommands } from './admin.js';

/**
 * Register all commands
 */
export function registerAllCommands(bot) {
  registerBasicCommands(bot);
  registerAdminCommands(bot);
}
