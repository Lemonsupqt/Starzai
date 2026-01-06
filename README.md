# StarzTechBot (Telegram AI Inline Bot)

## Features
- DM + Group chat AI replies (mention bot in groups)
- Inline AI answers: type @starztechbot <question> in any chat
- Inline buttons: Regenerate / Shorter / Longer
- /register + /help
- /model switcher (model list depends on your plan: FREE vs PREMIUM)
- Owner commands: /grant /revoke /allow /deny

## Railway env vars
Required:
- BOT_TOKEN
- MEGALLM_API_KEY
- PUBLIC_URL
- OWNER_IDS

Models:
- FREE_MODELS
- PREMIUM_MODELS
- DEFAULT_FREE_MODEL (optional)
- DEFAULT_PREMIUM_MODEL (optional)

Other:
- RATE_LIMIT_PER_MINUTE (optional, default 12)
- MODEL_VISION (optional)
