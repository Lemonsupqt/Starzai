# StarzAI Bot - Modular Architecture

## Overview

StarzAI has been refactored from a single 20,000+ line file into a clean, modular architecture. This makes the codebase easier to maintain, test, and extend.

## Directory Structure

```
src/
├── index.js              # Main entry point
├── config/
│   ├── index.js          # Config exports
│   └── env.js            # Environment variables & validation
├── database/
│   ├── index.js          # Database exports
│   ├── manager.js        # Main database manager
│   ├── storage.js        # Local file storage
│   ├── supabase.js       # Supabase integration
│   └── telegram-storage.js # Telegram channel backup
├── utils/
│   ├── index.js          # Utils exports
│   ├── helpers.js        # Common utility functions
│   └── telegram.js       # Telegram-specific utilities
├── llm/
│   ├── index.js          # LLM exports
│   ├── providers.js      # Provider configuration & stats
│   └── client.js         # LLM API client
├── features/
│   ├── index.js          # Features exports
│   ├── users.js          # User management
│   ├── partners.js       # AI Partner feature
│   ├── characters.js     # Character mode
│   ├── websearch.js      # Web search integration
│   └── image-gen.js      # Image generation (DeAPI)
├── middleware/
│   ├── index.js          # Middleware exports
│   └── rate-limit.js     # Rate limiting & access control
├── commands/
│   ├── index.js          # Commands exports
│   ├── basic.js          # Basic commands (/start, /help, etc.)
│   └── admin.js          # Admin/owner commands
└── handlers/
    ├── index.js          # Handlers exports
    ├── inline.js         # Inline mode handlers
    ├── callbacks.js      # Callback query handlers
    └── messages.js       # Message handlers
```

## Running the Bot

### Using the new modular structure:
```bash
npm start
# or
node src/index.js
```

### Using the legacy single-file version:
```bash
npm run start:legacy
# or
node index.js
```

### Development mode (with auto-reload):
```bash
npm run dev
```

## Module Descriptions

### Config (`src/config/`)
- Centralizes all environment variable parsing
- Provides validation for required configuration
- Exports helper functions for tier-based model access

### Database (`src/database/`)
- **manager.js**: Coordinates data persistence across backends
- **supabase.js**: Primary cloud storage
- **telegram-storage.js**: Backup storage via Telegram channel
- **storage.js**: Local file fallback

### LLM (`src/llm/`)
- **providers.js**: Provider registry, statistics, and health tracking
- **client.js**: Unified API client with automatic fallback

### Features (`src/features/`)
- **users.js**: User registration, tiers, bans, warnings
- **partners.js**: AI Partner creation and chat history
- **characters.js**: Character mode and roleplay
- **websearch.js**: Multi-engine web search
- **image-gen.js**: DeAPI image generation with key rotation

### Middleware (`src/middleware/`)
- **rate-limit.js**: Per-user rate limiting, cooldowns, spam detection

### Commands (`src/commands/`)
- **basic.js**: /start, /help, /whoami, /stats, /info
- **admin.js**: Owner-only commands for user management

### Handlers (`src/handlers/`)
- **inline.js**: Inline query processing
- **callbacks.js**: Button click handlers
- **messages.js**: Regular message processing

## Benefits of Modular Architecture

1. **Maintainability**: Each module has a single responsibility
2. **Testability**: Modules can be tested in isolation
3. **Readability**: Smaller files are easier to understand
4. **Extensibility**: New features can be added without touching core code
5. **Collaboration**: Multiple developers can work on different modules
6. **Debugging**: Easier to locate and fix issues

## Migration Notes

- The original `index.js` is preserved for backward compatibility
- Use `npm run start:legacy` to run the old version
- All functionality has been preserved in the modular version
- Some features may need additional commands to be migrated

## Adding New Features

1. Create a new file in `src/features/` for the feature logic
2. Export functions from `src/features/index.js`
3. Create command handlers in `src/commands/`
4. Register commands in `src/commands/index.js`
5. Add any necessary callback handlers in `src/handlers/callbacks.js`
