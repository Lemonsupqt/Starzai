# ⚡ StarzAI - Telegram AI Bot

A powerful AI assistant bot for Telegram with multiple modes, persistent AI partners, and inline capabilities.

## 🌟 Features

### 💬 Chat Modes
- **DM Chat** - Direct conversation with AI
- **Group Chat** - Mention @starztechbot to get responses
- **Inline Mode** - Type `@starztechbot` anywhere for instant AI

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

### 🤝🏻 AI Partner
Create your personalized AI companion with:
- Custom name, personality, background, and speaking style
- Persistent chat memory (20 messages)
- Works in both DM and inline mode
- Commands: `/partner name`, `/partner personality`, `/partner background`, `/partner style`

### 🎭 Persona Mode
Set a custom personality for all DM responses:
- `/persona friendly teacher` - Sets AI personality
- `/persona reset` - Back to default

### 📊 Stats & History
- `/stats` - View your usage statistics
- `/history` - Recent prompts with quick re-use buttons

## 📋 Commands

### Basic Commands
| Command | Description |
|---------|-------------|
| `/start` | Welcome message |
| `/help` | Help menu |
| `/model` | Choose AI model |
| `/reset` | Clear chat memory |

### Feature Commands
| Command | Description |
|---------|-------------|
| `/partner` | Manage your AI partner |
| `/persona` | Set AI personality |
| `/stats` | Usage statistics |
| `/history` | Recent prompts |

### Owner Commands
| Command | Description |
|---------|-------------|
| `/status` | Bot status & stats |
| `/info <userId>` | User details |
| `/grant <userId> <tier>` | Grant tier (free/premium/ultra) |
| `/revoke <userId>` | Revoke to free tier |
| `/allow <userId> <model>` | Allow specific model |
| `/deny <userId> <model>` | Deny specific model |

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
DEFAULT_FREE_MODEL=model1
DEFAULT_PREMIUM_MODEL=model3
DEFAULT_ULTRA_MODEL=model5
```

**Storage (Optional but recommended):**
```
STORAGE_CHANNEL_ID=your_storage_channel_id
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
```

**Other:**
```
RATE_LIMIT_PER_MINUTE=12
MODEL_VISION=vision_model_id
```

## 💾 Data Persistence

StarzAI stores data in multiple layers:
1. **Supabase** (Primary) - Permanent cloud storage
2. **Telegram Channel** - Backup storage via document uploads
3. **Local Files** - Fallback for development

Data stored:
- User profiles and tiers
- Model preferences
- Inline sessions
- Partner data and chat history

## 📝 License

MIT License - Feel free to use and modify!

---

Made with ⚡ by StarzAI Team
