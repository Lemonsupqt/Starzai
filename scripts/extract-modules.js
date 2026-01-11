/**
 * Module Extractor Script
 * Extracts sections from index.js into organized module files
 * Preserves all code exactly as-is
 */

import fs from 'fs';
import path from 'path';

const INDEX_PATH = './index.js';
const SRC_DIR = './src';

// Read the entire index.js
const content = fs.readFileSync(INDEX_PATH, 'utf-8');
const lines = content.split('\n');

// Module mapping - which sections go into which files
// Format: { outputFile: [{ start: lineNum, end: lineNum, name: 'section name' }] }
const moduleMap = {
  // Config
  'config/env.js': [
    { start: 1, end: 315, name: 'ENV and DeAPI' }
  ],
  
  // LLM
  'llm/bot.js': [
    { start: 316, end: 328, name: 'BOT + LLM' }
  ],
  'llm/providers.js': [
    { start: 329, end: 718, name: 'MULTI-PROVIDER LLM SYSTEM' }
  ],
  'llm/client.js': [
    { start: 2287, end: 2299, name: 'HISTORY' },
    { start: 2300, end: 2767, name: 'LLM HELPERS + VIDEO PROCESSING' }
  ],
  
  // Database
  'database/telegram-storage.js': [
    { start: 719, end: 755, name: 'TELEGRAM CHANNEL STORAGE' }
  ],
  'database/supabase.js': [
    { start: 756, end: 1066, name: 'SUPABASE STORAGE' }
  ],
  
  // State
  'state/index.js': [
    { start: 1067, end: 1159, name: 'IN-MEMORY STATE' }
  ],
  
  // Middleware
  'middleware/rate-limit.js': [
    { start: 1160, end: 1281, name: 'RATE LIMIT' }
  ],
  'middleware/anti-spam.js': [
    { start: 1282, end: 1545, name: 'ANTI-SPAM SYSTEM' }
  ],
  'middleware/group-activation.js': [
    { start: 1546, end: 1580, name: 'GROUP ACTIVATION SYSTEM' }
  ],
  'middleware/access-control.js': [
    { start: 1732, end: 2011, name: 'CONCURRENT PROCESSING + BAN/MUTE MIDDLEWARE' }
  ],
  
  // Features
  'features/users.js': [
    { start: 1581, end: 1731, name: 'USER + ACCESS CONTROL' }
  ],
  'features/partners.js': [
    { start: 2012, end: 2093, name: 'PARTNER MANAGEMENT' }
  ],
  'features/characters.js': [
    { start: 2094, end: 2238, name: 'CHARACTER MODE MANAGEMENT' }
  ],
  'features/inline-sessions.js': [
    { start: 2239, end: 2286, name: 'INLINE SESSION MANAGEMENT' }
  ],
  'features/websearch.js': [
    { start: 2768, end: 3463, name: 'WEB SEARCH' }
  ],
  'features/image-gen.js': [
    { start: 4956, end: 6747, name: 'IMAGE GENERATION' }
  ],
  'features/todo.js': [
    { start: 6748, end: 7482, name: 'ADVANCED TODO SYSTEM' }
  ],
  'features/collab-todo.js': [
    { start: 7483, end: 8905, name: 'COLLABORATIVE TODO SYSTEM' }
  ],
  'features/video.js': [
    { start: 14889, end: 15309, name: 'VIDEO SUMMARIZATION' }
  ],
  
  // Utils
  'utils/markdown.js': [
    { start: 3464, end: 3667, name: 'MARKDOWN CONVERTER' }
  ],
  'utils/parallel-api.js': [
    { start: 3668, end: 3750, name: 'PARALLEL EXTRACT API' }
  ],
  'utils/ui.js': [
    { start: 3751, end: 4155, name: 'UI HELPERS + INLINE CHAT UI' }
  ],
  'utils/keyboards.js': [
    { start: 4156, end: 4289, name: 'SETTINGS MENU KEYBOARDS' }
  ],
  'utils/model-helpers.js': [
    { start: 11092, end: 11233, name: 'MODEL CATEGORY HELPERS' }
  ],
  
  // Commands
  'commands/basic.js': [
    { start: 4290, end: 4955, name: 'COMMANDS' }
  ],
  'commands/owner.js': [
    { start: 11234, end: 12596, name: 'OWNER COMMANDS' }
  ],
  
  // Handlers - Callbacks
  'handlers/callbacks/menu.js': [
    { start: 12597, end: 13122, name: 'CALLBACKS: UNIFIED MENU NAVIGATION' }
  ],
  'handlers/callbacks/legacy.js': [
    { start: 13123, end: 13331, name: 'CALLBACKS: LEGACY' }
  ],
  'handlers/callbacks/inline-chat.js': [
    { start: 13332, end: 13511, name: 'INLINE CHAT CALLBACKS' }
  ],
  'handlers/callbacks/settings.js': [
    { start: 13512, end: 13694, name: 'SETTINGS MENU + SHARED CHAT CALLBACKS' }
  ],
  'handlers/callbacks/inline-settings.js': [
    { start: 13695, end: 13841, name: 'INLINE SETTINGS CALLBACKS' }
  ],
  'handlers/callbacks/todo.js': [
    { start: 8906, end: 9833, name: 'INLINE TODO CALLBACK HANDLERS' }
  ],
  'handlers/callbacks/collab-todo.js': [
    { start: 9834, end: 11091, name: 'COLLABORATIVE TODO CALLBACKS' }
  ],
  
  // Handlers - Other
  'handlers/webapp.js': [
    { start: 13842, end: 13969, name: 'WEBAPP DATA HANDLER' }
  ],
  'handlers/messages.js': [
    { start: 13970, end: 14732, name: 'DM / GROUP TEXT' },
    { start: 14733, end: 14888, name: 'PHOTO HANDLER' }
  ],
  'handlers/inline/mode.js': [
    { start: 15310, end: 18193, name: 'INLINE MODE - INTERACTIVE CHAT' }
  ],
  'handlers/inline/chosen.js': [
    { start: 18194, end: 19865, name: 'CHOSEN INLINE RESULT' }
  ],
  'handlers/inline/buttons.js': [
    { start: 19866, end: 20331, name: 'INLINE BUTTON ACTIONS + CACHE CLEANUP' }
  ],
  
  // Server
  'server/webhook.js': [
    { start: 20332, end: 20462, name: 'WEBHOOK SERVER' }
  ]
};

// Create directories
const dirs = new Set();
for (const file of Object.keys(moduleMap)) {
  const dir = path.dirname(file);
  if (dir !== '.') dirs.add(dir);
}

for (const dir of dirs) {
  const fullPath = path.join(SRC_DIR, dir);
  fs.mkdirSync(fullPath, { recursive: true });
  console.log(`Created directory: ${fullPath}`);
}

// Extract modules
let totalExtracted = 0;
for (const [file, sections] of Object.entries(moduleMap)) {
  const fullPath = path.join(SRC_DIR, file);
  
  let moduleContent = `/**\n * ${file}\n * Auto-extracted from index.js\n */\n\n`;
  
  for (const section of sections) {
    const sectionLines = lines.slice(section.start - 1, section.end);
    moduleContent += `// =====================\n`;
    moduleContent += `// ${section.name}\n`;
    moduleContent += `// Lines ${section.start}-${section.end} from original index.js\n`;
    moduleContent += `// =====================\n\n`;
    moduleContent += sectionLines.join('\n');
    moduleContent += '\n\n';
    
    const lineCount = section.end - section.start + 1;
    totalExtracted += lineCount;
  }
  
  fs.writeFileSync(fullPath, moduleContent);
  const totalLines = sections.reduce((sum, s) => sum + (s.end - s.start + 1), 0);
  console.log(`Extracted: ${file} (${totalLines} lines)`);
}

console.log(`\n=== EXTRACTION COMPLETE ===`);
console.log(`Total lines extracted: ${totalExtracted}`);
console.log(`Original file: ${lines.length} lines`);
console.log(`Coverage: ${((totalExtracted / lines.length) * 100).toFixed(1)}%`);

// Create index files for each directory
const indexFiles = {
  'config/index.js': `export * from './env.js';`,
  'llm/index.js': `export * from './bot.js';\nexport * from './providers.js';\nexport * from './client.js';`,
  'database/index.js': `export * from './telegram-storage.js';\nexport * from './supabase.js';`,
  'state/index.js': `// State is already in index.js`,
  'middleware/index.js': `export * from './rate-limit.js';\nexport * from './anti-spam.js';\nexport * from './group-activation.js';\nexport * from './access-control.js';`,
  'features/index.js': `export * from './users.js';\nexport * from './partners.js';\nexport * from './characters.js';\nexport * from './inline-sessions.js';\nexport * from './websearch.js';\nexport * from './image-gen.js';\nexport * from './todo.js';\nexport * from './collab-todo.js';\nexport * from './video.js';`,
  'utils/index.js': `export * from './markdown.js';\nexport * from './parallel-api.js';\nexport * from './ui.js';\nexport * from './keyboards.js';\nexport * from './model-helpers.js';`,
  'commands/index.js': `export * from './basic.js';\nexport * from './owner.js';`,
  'handlers/index.js': `// Handler registrations`,
  'handlers/callbacks/index.js': `export * from './menu.js';\nexport * from './legacy.js';\nexport * from './inline-chat.js';\nexport * from './settings.js';\nexport * from './inline-settings.js';\nexport * from './todo.js';\nexport * from './collab-todo.js';`,
  'handlers/inline/index.js': `export * from './mode.js';\nexport * from './chosen.js';\nexport * from './buttons.js';`,
  'server/index.js': `export * from './webhook.js';`
};

console.log('\n=== Creating index files ===');
for (const [file, content] of Object.entries(indexFiles)) {
  const fullPath = path.join(SRC_DIR, file);
  // Don't overwrite state/index.js since it has actual content
  if (file === 'state/index.js') continue;
  fs.writeFileSync(fullPath, content + '\n');
  console.log(`Created: ${file}`);
}

console.log('\n=== DONE ===');
console.log('Modules extracted to ./src/');
console.log('Note: These are raw extractions. Imports/exports need to be added manually.');
