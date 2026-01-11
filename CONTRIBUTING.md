# Contributing to StarzAI

## For AI Coding Agents

If you are an AI assistant (Claude, GPT, Cursor, Copilot, etc.) making changes to this codebase, **you must follow these rules**:

### After ANY Code Changes

1. **Update the Table of Contents** in `index.js` (lines 1-90) if:
   - You add a new section
   - You delete a section
   - Line numbers shift significantly (>50 lines)

2. **Update `ARCHITECTURE.md`** if:
   - You add a new feature
   - You change how something works
   - You add new environment variables

3. **Update `src/` reference modules** if:
   - You add a new section to `index.js`
   - Run: `node scripts/extract-modules.js`

### Adding New Features

**Small features (<200 lines):**
- Add directly to `index.js` in the appropriate section
- Add a section header: `// =====================\n// FEATURE NAME\n// =====================`
- Update the TOC

**Large features (>200 lines):**
1. Create module: `src/features/my-feature.js` (use `_template.js` as base)
2. Import in `index.js`: `import { func } from './src/features/my-feature.js';`
3. Register handlers in `index.js`
4. Update ARCHITECTURE.md
5. Update TOC

### Code Style

- Use `async/await` for all async operations
- Use `try/catch` for error handling
- Log errors with `console.error('[SECTION] Error:', err.message)`
- Use HTML parse mode for Telegram messages (not Markdown)
- Follow existing patterns in the codebase

### Environment Variables

When adding new env vars:
1. Add to `index.js` ENV section
2. Document in `ARCHITECTURE.md` Environment Variables table
3. Add to Railway/deployment platform

### Testing

Before committing:
1. Run `node --check index.js` to verify syntax
2. Test the bot locally if possible
3. Deploy to a test branch first

### Commit Messages

Format: `Type: Description`

Types:
- `Add:` New feature
- `Fix:` Bug fix
- `Update:` Modification to existing feature
- `Remove:` Deletion
- `Docs:` Documentation only
- `Refactor:` Code restructuring

Example: `Add: Voice message transcription feature`

---

## Quick Reference

| Task | Action |
|------|--------|
| Find code | Check `src/` folders or use TOC line numbers |
| Add small feature | Add to `index.js`, update TOC |
| Add large feature | Create in `src/`, import in `index.js` |
| Update docs | Edit `ARCHITECTURE.md` |
| Regenerate src/ | Run `node scripts/extract-modules.js` |

---

**Remember: The bot runs from `index.js`. The `src/` folder is for reference only.**
