# FlowType Chrome Extension - Setup Guide

## ✅ Build Complete!

Your FlowType Chrome extension has been successfully built and is ready to use.

### ⚠️ Chrome Version Requirement
This extension uses ES modules (Manifest V3 modern format) and requires **Chrome 91 or later**. Make sure you're running a recent version of Chrome.

## 📦 Installation

### 1. Load the Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the `dist/` directory from this project: `/Users/petermangin/Wispr_clone/dist`
5. The FlowType extension should now appear in your extensions list

### 2. Grant Microphone Permission

**IMPORTANT: This must be done before first use**

1. Click the FlowType extension icon in your Chrome toolbar
2. In the popup, you'll see a "Microphone Access" section
3. Click **"Grant Microphone Access"** button
4. A new tab will open with a permission request page
5. Click **"Grant Microphone Access"** button on that page
6. Chrome will show a microphone permission prompt - Click **"Allow"**
7. The tab will auto-close and return to the popup
8. You should see "Microphone access granted" with a green checkmark

### 3. Configure Your API Key

1. In the FlowType popup (if not still open, click the extension icon again)
2. Enter your Replicate API key (get one at [replicate.com/account/api-tokens](https://replicate.com/account/api-tokens))
3. Click **Save API Key**
4. You should see a green "Saved" confirmation

## 🎤 Using FlowType

### Quick Start

1. **Navigate to any webpage** with a text field (Gmail, Google Docs, Notion, Slack, etc.)
2. **Click into a text field** to focus it
3. **Press the keyboard shortcut**:
   - Mac: `Cmd + Shift + Space`
   - Windows/Linux: `Ctrl + Shift + Space`
4. **A floating indicator appears** in the bottom-right showing recording status
5. **Speak your text**
6. **Press the shortcut again** to stop and transcribe
7. The transcribed text will be inserted at your cursor position

### Supported Text Fields

- `<input type="text">` elements
- `<textarea>` elements
- `contenteditable` divs (Google Docs, Notion, etc.)

### Visual Feedback

The floating indicator shows three states:
- **Recording**: Red waveform animation with live duration counter
- **Processing**: Blue spinner while transcribing
- **Error**: Red alert with error message

## 🛠️ Development

### Build Commands

```bash
# Development mode (watch for changes)
npm run dev

# Production build
npm run build

# Type checking
npm run type-check
```

### After Making Changes

1. Run `npm run build` to rebuild
2. Go to `chrome://extensions/`
3. Click the reload icon on the FlowType extension
4. Test your changes

## 🐛 Troubleshooting

### Extension won't load
- Make sure you selected the `dist/` directory, not the project root
- Check that the build completed without errors

### API key not saving
- Open the extension popup and check the browser console (F12)
- Verify you have a valid Replicate API key

### Microphone permission issues

**If you see "Permission dismissed" errors:**

1. **System Level (Mac)**:
   - Open System Settings → Privacy & Security → Microphone
   - Ensure "Google Chrome" is checked/enabled
   - If not listed, grant permission first by using the Grant Microphone Access flow

2. **Browser Level**:
   - Click the FlowType extension icon
   - Click "Grant Microphone Access" (opens new tab)
   - In the new tab, click "Grant Microphone Access" button
   - Chrome will show permission prompt - click "Allow"

3. **If permission was previously denied**:
   - Go to `chrome://settings/content/microphone`
   - Look for entries starting with `chrome-extension://`
   - If FlowType is in "Blocked", remove it
   - Then use the "Grant Microphone Access" flow again

### Recording not starting
- Verify microphone permission is granted (see above)
- Check service worker console: `chrome://extensions/` → click "service worker"
- Ensure no other app is using your microphone
- Check that the offscreen document was created (check service worker console)

### Text not inserting
- Make sure the text field is focused when you start recording
- Check that the field is editable (not disabled or readonly)
- Open the page console (F12) to see content script logs

### Debugging

**Service Worker logs:**
1. Go to `chrome://extensions/`
2. Click "service worker" link under FlowType
3. Opens DevTools for background script

**Content Script logs:**
1. Right-click on any webpage → Inspect
2. Open Console tab
3. Look for `[Content]` prefixed messages

**Popup logs:**
1. Right-click extension icon → Inspect popup
2. Opens DevTools for popup

## 📋 Architecture Overview

```
User presses shortcut
    ↓
Service Worker receives command
    ↓
Creates Offscreen Document (for mic access)
    ↓
Starts MediaRecorder
    ↓
Shows floating indicator in content script
    ↓
User speaks and presses shortcut again
    ↓
Stops recording, gets audio blob
    ↓
Sends to Replicate Whisper API
    ↓
Polls for transcription result
    ↓
Inserts text at cursor position
```

## 🎨 Design Features

### Premium Audio Equipment Aesthetic
- **JetBrains Mono** typography for technical precision
- **Dynamic waveform visualization** during recording
- **Refined glassmorphism** with backdrop blur
- **Smooth micro-interactions** and state transitions
- **Live duration counter** showing recording time

### Keyboard Shortcut Display
- Realistic mechanical keyboard key styling
- Hover effects that lift the keys
- Proper spacing and shadows

## 📝 File Structure

```
dist/
├── manifest.json          # Extension manifest
├── icons/                 # Extension icons
├── service-worker.js      # Background orchestrator
├── content.js            # Content script (page injection)
├── offscreen.js          # Audio recording handler
├── popup.js              # Settings popup
├── src/
│   ├── popup/popup.html  # Popup HTML
│   └── offscreen/offscreen.html  # Offscreen HTML
├── assets/               # CSS and other assets
└── chunks/               # Code split chunks
```

## 🚀 Next Steps

### Phase 2: Intelligence (Future Enhancement)
- Claude API integration for text refinement
- Filler word removal ("um", "uh", "like")
- Auto-punctuation improvements
- Multiple writing styles (professional, casual, technical)

### Phase 3: Personalization (Future Enhancement)
- Personal dictionary for custom terms
- Voice shortcuts (snippets)
- Style auto-detection by website
- Context-aware corrections

### Phase 4: Developer Features (Future Enhancement)
- Developer mode for code dictation
- Syntax recognition (camelCase, snake_case)
- Code block formatting
- CLI command support

## 📄 License

Apache 2.0

## 🙏 Credits

- **Whisper AI** by OpenAI (via Replicate)
- **JetBrains Mono** font
- Built with **React**, **TypeScript**, and **Vite**

---

**Enjoy using FlowType!** 🎤✨
