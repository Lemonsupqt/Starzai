# StarzAI Feature API Research

## Video/Social Media Downloads

### Cobalt.tools (PRIMARY - All-in-one)
Supports: bilibili, bluesky, dailymotion, facebook, instagram, loom, ok, pinterest, newgrounds, reddit, rutube, snapchat, soundcloud, streamable, tiktok, tumblr, twitch clips, twitter, vimeo, vk, xiaohongshu

**API Endpoint:** `https://api.cobalt.tools/`
- Free, open source
- No API key needed for public instance
- Supports video + audio extraction
- Can self-host for unlimited use

### Alternative: yt-dlp (for YouTube specifically)
- Node.js wrapper: `youtube-dl-exec` or `ytdl-core`
- Handles YouTube, many other sites
- Run locally on Railway

---

## Music

### Spotify/Deezer Download
- Use Cobalt for direct links
- Or: spotdl (Python) / spotify-dl for Spotify
- Deezer: deemix API (grey area)

### Lyrics
- **Genius API** - Free tier available, needs API key
- **lyrics.ovh** - Free, no key needed
- **Musixmatch API** - Free tier limited

---

## Movies & TV

### TMDB API (The Movie Database)
- Free API key
- Movie/TV info, posters, trailers, recommendations
- Where to watch (JustWatch integration)
- 1000 requests/day free

### OMDB API
- Free tier: 1000/day
- IMDb data

---

## Utilities

### QR Code
- **qrcode** npm package - Generate locally, free, unlimited
- **jsQR** - Read QR from images

### URL Shortener
- **TinyURL** - `https://tinyurl.com/api-create.php?url=URL` - No key, unlimited
- **is.gd** - `https://is.gd/create.php?format=simple&url=URL`

### Currency Converter
- **ExchangeRate-API** - Free tier 1500/month
- **Fixer.io** - Free tier 100/month
- **Open Exchange Rates** - Free tier 1000/month

### Weather
- **OpenWeatherMap** - Free tier 1000/day
- **wttr.in** - Free, no key, simple API

### Translate
- **LibreTranslate** - Free, self-hostable
- **MyMemory API** - Free tier 1000/day
- **Google Translate** (unofficial) - Free but risky

### OCR
- Use existing vision AI model (already have)

### Text to Speech
- **Google TTS** - Free via gtts library
- **Edge TTS** - Free, Microsoft voices

---

## Knowledge

### Wikipedia
- **Wikipedia API** - Free, unlimited
- `https://en.wikipedia.org/api/rest_v1/page/summary/TITLE`

### Image Search
- **Unsplash API** - Free tier 50/hour
- **Pexels API** - Free, 200/hour
- **Google Custom Search** - 100/day free

### Dictionary
- **Free Dictionary API** - `https://api.dictionaryapi.dev/api/v2/entries/en/WORD`
- No key needed, unlimited

### Random Facts
- **Useless Facts API** - Free
- **Numbers API** - Free

### This Day in History
- **Wikipedia On This Day** - Free
- **History API** - Various free options

---

## Fun & Social

### Quote Generator
- **Quotable API** - Free, no key
- **ZenQuotes** - Free

### Discord-style Quote Image
- Generate locally with canvas/sharp
- Free, unlimited

### Truth or Dare / Would You Rather
- Built-in database or free APIs
- **Truth or Dare API** - Free

### Roast/Pickup Lines
- Use existing LLM (already have)
- Or: Evil Insult API, Pickup Lines API

---

## Dev Tools

### Code Runner
- **Piston API** - Free, 50+ languages
- `https://emkc.org/api/v2/piston/execute`
- No key needed

---

## Media

### Wallpapers
- **Wallhaven API** - Free, no key for SFW
- **Unsplash** - Free tier
- **Pexels** - Free

---

## Implementation Priority

1. **Cobalt Integration** - Covers YouTube, TikTok, Instagram, Twitter, SoundCloud
2. **TMDB** - Movies, TV, trailers, recommendations
3. **Utilities** - QR, URL, Currency, Weather, Translate (all free/easy)
4. **Knowledge** - Wikipedia, Dictionary, Facts (all free)
5. **Fun** - Quotes, Games (mostly built-in or LLM)
6. **Code Runner** - Piston API
7. **Music** - Lyrics via Genius/lyrics.ovh
