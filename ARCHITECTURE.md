# StarzAI Bot Architecture

## Overview

StarzAI is a feature-rich Telegram AI assistant bot with 20,000+ lines of production code. This document explains the codebase structure and provides guidance for future development.

## File Structure

```
Starzai/
├── index.js              # Main entry point (20K+ lines, production)
├── package.json          # Dependencies and scripts
├── ARCHITECTURE.md       # This file
├── README.md             # Project overview
├── webapp/               # Telegram Mini App
│   └── index.html        # WebApp interface
├── scripts/              # Development utilities
│   ├── modularize.js     # Code analysis script
│   └── extract-modules.js # Module extraction script
└── src/                  # Reference modules (extracted sections)
    ├── config/           # Environment and configuration
    ├── llm/              # LLM providers and helpers
    ├── database/         # Storage backends
    ├── state/            # In-memory state management
    ├── middleware/       # Rate limiting, anti-spam, access control
    ├── features/         # Core features (users, partners, todos, etc.)
    ├── utils/            # Utilities (markdown, UI, keyboards)
    ├── commands/         # Bot commands
    ├── handlers/         # Message and callback handlers
    └── server/           # Webhook server
```

## Architecture Decisions

### Why Single File (index.js)?

The bot currently uses a single-file architecture for these reasons:

1. **Shared State**: Many functions share in-memory state (caches, sessions, rate limiters)
2. **Cross-References**: Functions call each other across what would be module boundaries
3. **Deployment Simplicity**: Single file deploys easily on Railway
4. **Production Stability**: The current code works perfectly in production

### The src/ Reference Modules

The `src/` folder contains the same code split into logical modules. These serve as:

1. **Navigation Aid**: Find code faster by browsing organized folders
2. **Documentation**: Understand which code belongs to which feature
3. **Migration Path**: When modifying a section heavily, you can properly modularize it

**Important**: The `src/` modules are NOT imported by `index.js`. They are reference copies.

## Code Sections

### Configuration (Lines 62-366)
- Environment variables
- API keys (MegaLLM, GitHub, DeAPI, Supabase)
- Model tier definitions (Free, Premium, Ultra)
- DeAPI multi-key manager

### Core Systems (Lines 367-1210)
- Bot initialization (Grammy)
- Multi-provider LLM system (GitHub Models primary, MegaLLM fallback)
- Telegram channel storage (backup persistence)
- Supabase storage (primary database)
- In-memory state (caches, sessions)

### Middleware (Lines 1211-2062)
- Rate limiting (per-user, per-minute)
- Anti-spam detection
- Group activation system (dormant mode)
- Concurrent processing
- Ban/mute middleware

### Features (Lines 2063-15360)
- User management and tiers
- Partner AI companion system
- Character roleplay mode
- Inline sessions
- LLM helpers (text, vision, streaming)
- Web search (SearXNG, DuckDuckGo, Parallel API)
- Image generation (DeAPI)
- Todo system (personal + collaborative)
- Video summarization

### Utilities (Lines 3515-4340, 11143-11284)
- Markdown to Telegram HTML converter
- Parallel Extract API
- UI helpers (menus, messages)
- Keyboard builders
- Model category helpers

### Commands (Lines 4341-12647)
- Basic commands (/start, /help, /model, /reset, etc.)
- Owner commands (/grant, /ban, /status, /info, etc.)

### Handlers (Lines 8957-20382)
- Callback handlers (menus, settings, todos)
- Message handlers (DM, groups, photos, videos)
- Inline mode handlers
- WebApp data handler

### Server (Lines 20383-20511)
- Webhook server for Railway deployment

## Adding New Features

### For Small Features (< 200 lines)
Add directly to `index.js` in the appropriate section. Update the TOC if adding a new section.

### For Large Features (> 200 lines)

1. **Create a module in src/**:
```javascript
// src/features/my-feature.js
export function myFeatureFunction() {
  // Implementation
}
```

2. **Import at the top of index.js**:
```javascript
import { myFeatureFunction } from './src/features/my-feature.js';
```

3. **Use in index.js**:
```javascript
bot.command("myfeature", async (ctx) => {
  await myFeatureFunction(ctx);
});
```

4. **Update package.json** if needed for new dependencies.

## Super Utilities (27 Features)

The bot includes a comprehensive utilities module (`src/features/super-utilities.js`) with:

### Downloads
- `/dl` or `/download` - YouTube, TikTok, Instagram, Twitter, Spotify, SoundCloud
- Auto-detection: Just paste a link in DM and bot offers download options

### Music
- `/lyrics Artist - Song` - Get song lyrics

### Movies/TV
- `/movie title` - Search movies (TMDB)
- `/tv title` - Search TV shows

### Utilities
- `/qr text` - Generate QR code
- `/short url` - Shorten URL (TinyURL)
- `/currency 100 USD EUR` - Convert currency
- `/weather city` - Get weather
- `/translate text` - Translate text
- `/convert 100 km mi` - Convert units

### Knowledge
- `/wiki topic` - Wikipedia summary
- `/define word` - Dictionary definition
- `/fact` - Random fact
- `/today` - This day in history

### Fun
- `/quote` - Random inspirational quote
- `/quotify` - Reply to message to make quote image
- `/truth` - Truth question
- `/dare` - Dare challenge
- `/wyr` - Would you rather
- `/roast` - Roast generator
- `/pickup` - Pickup lines

### Dev Tools
- `/run language\ncode` - Run code (50+ languages via Piston)

### Media
- `/wallpaper query` - Search HD wallpapers

## Key Patterns

### User Tier System
```javascript
// Tiers: "free", "premium", "ultra", "owner"
const user = getUserRecord(userId);
const tier = user?.tier || "free";
```

### Rate Limiting
```javascript
if (!(await enforceRateLimit(ctx))) return;
if (!(await enforceCommandCooldown(ctx))) return;
```

### LLM Calls
```javascript
// Simple text generation
const response = await llmText({ model, messages, temperature, max_tokens });

// With provider fallback
const result = await llmWithProviders({ model, messages, ... });

// Vision (images)
const response = await llmTextVision({ model, messages, ... });
```

### Storage
```javascript
// Save user data
saveUsers();  // Persists to Supabase + Telegram channel

// Save preferences
savePrefs();

// Save inline sessions
saveInlineSessions();
```

### Telegram Responses
```javascript
// HTML format (preferred)
await ctx.reply(convertToTelegramHTML(text), { parse_mode: "HTML" });

// With keyboard
await ctx.reply(text, { 
  parse_mode: "Markdown",
  reply_markup: new InlineKeyboard().text("Button", "callback_data")
});
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| BOT_TOKEN | Yes | Telegram bot token |
| MEGALLM_API_KEY | Yes | MegaLLM API key |
| GITHUB_PAT | No | GitHub PAT for GitHub Models |
| PUBLIC_URL | Yes | Railway public URL |
| SUPABASE_URL | Yes | Supabase project URL |
| SUPABASE_KEY | Yes | Supabase anon key |
| STORAGE_CHANNEL_ID | No | Telegram channel for backup |
| OWNER_IDS | Yes | Comma-separated owner user IDs |
| DEAPI_KEYS | No | DeAPI keys for image generation |
| PARALLEL_API_KEY | No | Parallel AI search API key |
| FEEDBACK_CHAT_ID | No | Chat ID for feedback forwarding |

## Development Workflow

1. **Create a branch**: `git checkout -b feature/my-feature`
2. **Make changes**: Edit `index.js` or create modules in `src/`
3. **Test locally**: `npm run dev` (requires environment variables)
4. **Commit**: `git commit -m "Add: my feature"`
5. **Push**: `git push origin feature/my-feature`
6. **Test on Railway**: Deploy the branch for testing
7. **Merge**: After testing, merge to main

## Performance Considerations

- **Rate Limiting**: 30 requests/minute per user by default
- **Cooldowns**: Commands have per-tier cooldowns
- **Caching**: Inline results cached with TTL
- **Concurrent Processing**: Multiple users handled in parallel
- **Provider Fallback**: GitHub Models → MegaLLM → Fallback models

## Troubleshooting

### Bot Not Responding
1. Check Railway logs for errors
2. Verify environment variables are set
3. Check rate limit status

### LLM Errors
1. Check provider status (GitHub Models, MegaLLM)
2. Verify API keys are valid
3. Check model names in environment variables

### Storage Issues
1. Verify Supabase connection
2. Check Telegram channel permissions
3. Review storage channel message IDs

## Future Improvements

1. **Gradual Modularization**: When heavily modifying a section, extract it properly
2. **Test Suite**: Add unit tests for critical functions
3. **Type Safety**: Consider migrating to TypeScript
4. **Documentation**: Add JSDoc comments to major functions
