# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Shortcuts (AI 任意门) is a Chrome browser extension that provides users with quick access to multiple AI websites including ChatGPT, DeepSeek, Gemini, Claude, and others. The extension supports both English and Chinese languages with automatic switching based on browser locale.

## Architecture

### Core Components

**Extension Structure:**
- `manifest.json` - Chrome extension manifest (v3)
- `background.js` - Service worker handling extension lifecycle and declarative net request rules
- `popup/` - Extension popup interface for quick AI access
- `options/` - Extension settings page for site configuration
- `iframe/` - Side panel mode with multi-column AI site layout
- `content-scripts/` - Injected scripts for various interaction modes
- `config/` - Site configurations and global settings

**Key Files:**
- `config/defaultSites.js` - Default AI site configurations with iframe support flags
- `config/config.js` - Global configuration including production/development console logging
- `config/rules.json` - Declarative net request rules for iframe embedding

### AI Site Configuration

Each AI site in `defaultSites.js` has these properties:
- `name` - Display name
- `url` - Site URL
- `enabled` - Whether site is active
- `supportUrlQuery` - Whether query can be appended to URL
- `supportIframe` - Whether site works in iframe
- `hidden` - Whether to hide from UI
- `description` - Site description

### User Interaction Modes

1. **Selection Search** - Text selection triggers AI search dialog
2. **Float Button** - Persistent floating button on all pages
3. **Context Menu** - Right-click menu integration
4. **Search Engine Integration** - Button appears near search results
5. **Side Panel Mode** - Multi-column iframe layout for comparing AI responses
6. **Popup Mode** - Extension icon popup for quick access

### Content Script Injection

The extension injects different scripts based on URL patterns:
- AI sites get `iframe/inject.js` for iframe compatibility
- All URLs get selection and float button functionality
- Search engines get specialized integration scripts

### Storage and Configuration

Uses `chrome.storage.sync` for:
- Site configurations
- User preferences (column layout, enabled features)
- Button configuration settings

### Internationalization

Supports English and Chinese through Chrome i18n API:
- `_locales/en/messages.json`
- `_locales/zh_CN/messages.json`

## Development Commands

**No build system required** - This is a vanilla JavaScript Chrome extension.

### Testing the Extension

1. Load unpacked extension in Chrome:
   - Open `chrome://extensions/`
   - Enable Developer mode
   - Click "Load unpacked" and select project directory

2. Test different modes:
   - Visit any webpage to test float button and selection
   - Search on Google/Baidu to test search engine integration
   - Click extension icon to test popup
   - Open side panel to test iframe mode

### Configuration Changes

- Modify `config/defaultSites.js` to add/remove AI sites
- Update `manifest.json` content_scripts matches for new AI sites
- Set `CONFIG.IS_PRODUCTION = true` in `config/config.js` before release

### iframe Compatibility

Sites that don't support iframe embedding require:
- Adding URL to `config/rules.json` for header modification
- Setting `supportIframe: false` in site configuration
- Using tab-based opening instead of iframe

### Debugging

Development mode logs include `[MultiAI]` prefix. Check:
- Browser console on content pages
- Extension service worker console
- Extension popup/options page consoles

### Release Process

1. Set `CONFIG.IS_PRODUCTION = true`
2. Update version in `manifest.json`
3. Test all interaction modes
4. Package extension for Chrome Web Store