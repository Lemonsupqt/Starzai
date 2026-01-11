# ⚡ StarzAI - Telegram AI Bot

A powerful 20K+ line AI assistant bot for Telegram with multi-provider LLM support, persistent AI partners, image generation, task management, and inline capabilities.

## 🌟 Features

### 💬 Chat Modes
- **DM Chat** - Direct conversation with AI
- **Group Chat** - Say "Starz" / "StarzAI" or reply to the bot
- **Inline Mode** - Type `@starztechbot` anywhere for instant AI
- **Time & Date** - Ask "what's the time in Tokyo?" or "today's date in London"

### ⚡ AI Modes (Inline)
| Mode | Prefix | Description |
|------|--------|-------------|
| ⭐ Quark | `q:` | Lightning fast, concise answers |
| 🗿🔬 Blackhole | `b:` | Deep research & comprehensive analysis |
| 💻 Code | `code:` | Programming help & code snippets |
| 🧠 Explain | `e:` | Simple ELI5 explanations |
| 🎭 Character | `as [char]:` | Roleplay as any character |
| 📝 Summarize | `sum:` | Condense long text |
| 🤝🏻 Partner | `p:` | Chat with your AI companion |

### 🤖 Multi-Provider LLM System
- **GitHub Models** - Primary provider (GPT-4.1, GPT-5 series)
- **MegaLLM** - Fallback provider with automatic failover
- **Smart Routing** - Automatic provider selection based on availability
- **Thinking Models** - Support for reasoning models with extended tokens

### 🤝🏻 AI Partner
Create your personalized AI companion with:
- Custom name, personality, background, and speaking style
- Persistent chat memory (20 messages)
- Works in both DM and inline mode

### 🎨 Image Generation
- **DeAPI Integration** - ZImageTurbo model
- **Multi-key Support** - Load balancing across multiple API keys
- **Auto-failover** - Switches keys on errors
- **Customizable** - Aspect ratios, styles, and more

### 📋 Task Management
- **Personal Todos** - Create, edit, complete tasks
- **Collaborative Todos** - Share task lists with others
- **Inline Integration** - Manage tasks from anywhere

### 🔍 Web Search
- **Multi-engine** - SearXNG, DuckDuckGo, Parallel API
- **AI Summaries** - Get synthesized answers with sources
- **Auto-fallback** - Tries multiple engines if one fails

### 🎬 Media Processing
- **Image Analysis** - Vision models for image understanding
- **Video Summarization** - Extract frames and transcribe audio
- **Photo Support** - Process images in DM and groups

## 📋 Commands

### Basic Commands
| Command | Description |
|---------|-------------|
| `/start` | Welcome message & main menu |
| `/help` | Help menu |
| `/model` | Choose AI model |
| `/reset` | Clear chat memory |
| `/stats` | Usage statistics |

### Feature Commands
| Command | Description |
|---------|-------------|
| `/partner` | Manage your AI partner |
| `/char` | Quick character roleplay |
| `/persona` | Set AI personality |
| `/search` | Web search (raw results) |
| `/websearch` | Web search with AI summary |
| `/feedback` | Send feedback to the team |

### Owner Commands
| Command | Description |
|---------|-------------|
| `/status` | Bot status & provider health |
| `/info <userId>` | User details |
| `/grant <userId> <tier>` | Grant tier (free/premium/ultra) |
| `/revoke <userId>` | Revoke to free tier |
| `/ban` / `/unban` | Ban management |
| `/mute` / `/unmute` | Mute management |
| `/allowgroup` / `/denygroup` | Group authorization |
| `/ownerhelp` | Full owner command guide |

## 🏗️ Architecture

```
Starzai/
├── index.js           # Main bot code (20K+ lines)
├── ARCHITECTURE.md    # Detailed documentation
├── CONTRIBUTING.md    # Guidelines for developers/AI agents
├── .manus             # Instructions for Manus AI
├── src/               # Reference modules (for navigation)
│   ├── config/        # Environment & configuration
│   ├── llm/           # LLM providers & helpers
│   ├── database/      # Storage backends
│   ├── middleware/    # Rate limiting, anti-spam
│   ├── features/      # Core features
│   ├── commands/      # Bot commands
│   ├── handlers/      # Message & callback handlers
│   └── server/        # Webhook server
└── scripts/           # Development utilities
```

> **Note:** The `src/` folder contains reference modules for code navigation. The bot runs from `index.js`.

## 🚀 Deployment

### Railway Environment Variables

**Required:**
```
BOT_TOKEN=your_telegram_bot_token
MEGALLM_API_KEY=your_megallm_api_key
PUBLIC_URL=your_railway_url
OWNER_IDS=comma_separated_user_ids
```

**Models:**
```
FREE_MODELS=model1,model2
PREMIUM_MODELS=model3,model4
ULTRA_MODELS=model5,model6
GITHUB_PAT=your_github_pat  # For GitHub Models
```

**Storage:**
```
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
STORAGE_CHANNEL_ID=your_storage_channel_id
```

**Optional:**
```
DEAPI_KEYS=key1,key2,key3  # Image generation
PARALLEL_API_KEY=key       # Enhanced web search
FEEDBACK_CHAT_ID=chat_id   # Feedback forwarding
```

## 👥 User Tiers

| Tier | Rate Limit | Cooldown | Features |
|------|------------|----------|----------|
| Free | 30/min | 60s | Basic models, 2 web sources |
| Premium | 30/min | 30s | Premium models, 5 web sources |
| Ultra | 30/min | 10s | All models, 7 web sources, Ultra Summary |
| Owner | Unlimited | None | Full access, admin commands |

## 💾 Data Persistence

StarzAI stores data in multiple layers:
1. **Supabase** (Primary) - Permanent cloud storage
2. **Telegram Channel** - Backup storage via document uploads
3. **Local Files** - Fallback for development

## 📝 License

MIT License - Feel free to use and modify!

---

Made with ⚡ by Lemonsupqt
