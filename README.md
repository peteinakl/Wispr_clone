# FlowType

**AI-powered voice-to-text dictation for any text field on any website.**

FlowType is a Chrome extension that enables seamless voice-to-text transcription using OpenAI's Whisper AI (via Replicate API) with optional Claude AI text refinement. Simply press a keyboard shortcut, speak, and watch your words appear in any text field—automatically refined and polished if you enable intelligence features.

![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)
![Chrome](https://img.shields.io/badge/chrome-91%2B-green.svg)

---

## ✨ Features

### Core Features
- **Universal Compatibility**: Works on most websites with standard text fields (Gmail, Slack, Notion, Reddit, etc.)
- **Simple Keyboard Shortcut**: Press `Cmd+Shift+Space` (Mac) or `Ctrl+Shift+Space` (Windows/Linux) to start/stop recording
- **Real-time Visual Feedback**: Beautiful floating indicator shows recording status with live duration counter
- **High-Quality Transcription**: Powered by OpenAI's Whisper large-v3 model via Replicate
- **Smart Text Insertion**: Preserves cursor position and works with input fields, textareas, and contenteditable elements

### Intelligence Features (Optional)
- **AI Text Refinement**: Optional Claude AI integration for polished, professional output
- **Filler Word Removal**: Automatically removes "um", "uh", "like", and other filler words
- **Smart Punctuation**: Improves punctuation and sentence structure
- **Writing Styles**: Choose from Professional, Casual, or Technical styles to match your context
- **Graceful Fallback**: Works perfectly with just Whisper if Claude API key is not configured

> **Note**: Does not currently support complex rich text editors like Google Docs or M365 Word Online. See [Known Limitations](#️-known-limitations) for details.

---

## 🚀 Quick Start

### Prerequisites

- **Chrome 91 or later** (for Manifest V3 ES modules support)
- **Replicate API key** (required - get one at [replicate.com/account/api-tokens](https://replicate.com/account/api-tokens))
- **Claude API key** (optional - get one at [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys))
- **Node.js 16+** and npm (for building)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/FlowType.git
   cd FlowType
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Build the extension:**
   ```bash
   npm run build
   ```

4. **Load in Chrome:**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable **Developer mode** (toggle in top-right)
   - Click **Load unpacked**
   - Select the `dist/` directory from this project
   - The FlowType extension should now appear in your extensions list

5. **Configure API Keys:**
   - Click the FlowType extension icon in your Chrome toolbar
   - Click **"Grant Microphone Access"** (opens a new tab)
   - Click **"Grant Microphone Access"** in the new tab and allow the permission
   - Return to the popup
   - Enter your Replicate API key (required)
   - Click **Save API Key**
   - *(Optional)* Scroll down to "Intelligence Features"
   - *(Optional)* Enter your Claude API key for text refinement
   - *(Optional)* Choose your preferred writing style (Professional/Casual/Technical)
   - *(Optional)* Click **Save Intelligence Settings**

---

## 📖 Usage

1. **Navigate to any webpage** with a text field (Gmail, Google Docs, Notion, etc.)
2. **Click into a text field** to focus it
3. **Press the keyboard shortcut**:
   - Mac: `Cmd + Shift + Space`
   - Windows/Linux: `Ctrl + Shift + Space`
4. **A floating indicator appears** in the bottom-right showing recording status
5. **Speak your text** clearly
6. **Press the shortcut again** to stop and transcribe
7. The transcribed text will be inserted at your cursor position

### Supported Text Fields

- `<input type="text">` elements
- `<textarea>` elements
- Standard `contenteditable` divs

### ✅ Confirmed Working Sites

- Gmail (compose, reply)
- Slack (messages, threads)
- Twitter/X (tweets, replies)
- Reddit (posts, comments)
- Notion (pages, databases)
- Discord (messages)
- Linear (issues, comments)
- GitHub (issues, comments, PRs)
- Most standard web forms and text inputs

### ⚠️ Known Limitations

**Does NOT work with complex rich text editors:**
- ❌ Google Docs
- ❌ Microsoft 365 Word Online
- ❌ Google Sheets (cells)

**Why?** These applications use custom-built editor frameworks with their own rendering engines, not standard HTML elements. They require deep integration with editor-specific APIs. FlowType works with ~90% of websites that use standard text inputs.

### Visual Feedback

The floating indicator shows these states:
- **Recording**: Red waveform animation with live duration counter
- **Processing**: Blue spinner while transcribing with Whisper (5-15 seconds)
- **Refining**: Purple spinner while Claude refines the text (2-5 seconds, only if Claude API key configured)
- **Error**: Red alert with error message

---

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

### Project Structure

```
├── public/                 # Static assets
│   ├── manifest.json       # Extension manifest
│   ├── icons/              # Extension icons
│   ├── permissions.html    # Microphone permission page
│   └── permissions.js      # Permission page logic
├── src/
│   ├── background/         # Service worker (orchestrator)
│   │   └── service-worker.ts
│   ├── content/            # Content scripts (page injection)
│   │   ├── content.ts
│   │   ├── floating-indicator.tsx
│   │   └── text-injector.ts
│   ├── offscreen/          # Offscreen document (audio recording)
│   │   ├── offscreen.html
│   │   └── offscreen.ts
│   ├── popup/              # Extension popup (settings)
│   │   ├── popup.html
│   │   ├── popup.tsx
│   │   └── popup.css
│   ├── lib/                # Core libraries
│   │   ├── api/            # API clients
│   │   │   ├── replicate-client.ts  # Whisper transcription
│   │   │   └── claude-client.ts     # Text refinement (Phase 2)
│   │   ├── audio/          # Audio recording
│   │   ├── services/       # Business logic
│   │   │   └── text-refinement.ts   # Claude refinement service
│   │   ├── storage/        # Chrome storage wrapper
│   │   └── types/          # TypeScript types
│   │       ├── messages.ts
│   │       └── settings.ts          # Intelligence settings (Phase 2)
│   └── shared/             # Shared utilities
│       ├── constants.ts
│       └── utils.ts
├── dist/                   # Build output (created by npm run build)
├── vite.config.ts          # Main Vite configuration
├── vite.content.config.ts  # Content script build config
├── tsconfig.json           # TypeScript configuration
└── package.json            # Dependencies and scripts
```

### Architecture

```
User presses shortcut
    ↓
Service Worker (receives keyboard command)
    ↓
Creates Offscreen Document (if needed)
    ↓
Offscreen: Requests microphone permission & starts MediaRecorder
    ↓
Service Worker → Content Script: Show floating indicator (RED waveform)
    ↓
User speaks and presses shortcut again
    ↓
Offscreen: Stops recording, returns audio blob as base64
    ↓
Service Worker: Sends audio to Replicate Whisper API
    ↓
Service Worker → Content Script: Update indicator (BLUE spinner "Processing")
    ↓
Service Worker: Polls for transcription result (60 attempts, 1s intervals)
    ↓
[If Claude API key configured]
    ↓
Service Worker → Content Script: Update indicator (PURPLE spinner "Refining")
    ↓
Service Worker: Sends transcription to Claude API for refinement
    ↓
Service Worker: Receives refined text (filler words removed, improved punctuation)
    ↓
[End conditional]
    ↓
Service Worker → Content Script: Send final text
    ↓
Content Script: Inserts text at saved cursor position
```

### After Making Changes

1. Run `npm run build` to rebuild
2. Go to `chrome://extensions/`
3. Click the reload icon on the FlowType extension
4. Test your changes

---

## 🐛 Troubleshooting

### Extension won't load
- Ensure you selected the `dist/` directory, not the project root
- Check that the build completed without errors
- Verify you're running Chrome 91+

### Microphone permission issues
1. **System Level (Mac)**:
   - System Settings → Privacy & Security → Microphone
   - Ensure "Google Chrome" is checked

2. **Browser Level**:
   - Open FlowType popup
   - Click "Grant Microphone Access"
   - A new tab will open
   - Click the button and allow permission when prompted

3. **If permission was denied**:
   - Go to `chrome://settings/content/microphone`
   - Check if `chrome-extension://` is blocked
   - Remove from blocked list and try again

### Recording not starting
- Verify microphone permission is granted (see above)
- Check service worker console: `chrome://extensions/` → "service worker" link
- Ensure no other app is using your microphone

### Text not inserting
- Make sure the text field is focused when you start recording
- Check that the field is editable (not disabled or readonly)
- Open page console (F12) to see content script logs

### Transcription errors
- Verify your Replicate API key is valid
- Check you have API credits: [replicate.com/account](https://replicate.com/account)
- Network issues: ensure you have internet connection

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

---

## 🎨 Design Features

### Premium Audio Equipment Aesthetic
- **JetBrains Mono** typography for technical precision
- **Dynamic waveform visualization** during recording
- **Refined glassmorphism** with backdrop blur effects
- **Smooth micro-interactions** and state transitions
- **Live duration counter** showing recording time

---

## 🔐 Privacy & Security

- **No data storage**: Audio is processed via Replicate API and immediately discarded
- **API keys stored locally**: Your Replicate and Claude API keys are stored only in Chrome's sync storage (encrypted by Chrome)
- **Microphone access**: Only active during recording sessions
- **Optional AI refinement**: Transcribed text sent to Claude API only if you configure a Claude API key
- **Data retention**:
  - Replicate: Audio processed and discarded immediately
  - Anthropic (Claude): API data not used for training, 30-day retention policy
- **Open source**: All code is available for review

---

## 🗺️ Roadmap

### ✅ Phase 1: Core Functionality (Complete)
- [x] Whisper AI transcription via Replicate API
- [x] Keyboard shortcut activation
- [x] Visual floating indicator with recording states
- [x] Universal text field compatibility
- [x] Smart cursor position preservation

### ✅ Phase 2: Intelligence (Complete)
- [x] Claude API integration for text refinement
- [x] Filler word removal ("um", "uh", "like")
- [x] Smart punctuation improvements
- [x] Multiple writing styles (professional, casual, technical)
- [x] Graceful fallback when Claude not configured

### Phase 3: Personalization (Future)
- [ ] Personal dictionary for custom terms
- [ ] Voice shortcuts (snippets)
- [ ] Style auto-detection by website
- [ ] Context-aware corrections

### Phase 4: Developer Features (Future)
- [ ] Developer mode for code dictation
- [ ] Syntax recognition (camelCase, snake_case)
- [ ] Code block formatting
- [ ] CLI command support

---

## 📝 Technical Details

### Technologies Used
- **TypeScript**: Type-safe code
- **React**: Popup UI
- **Vite**: Fast build system
- **Chrome Manifest V3**: Modern extension architecture
- **Replicate API**: Whisper large-v3 model for transcription
- **Anthropic Claude API**: Claude 3.5 Haiku for text refinement (optional)
- **MediaRecorder API**: Audio capture (16kHz, webm/opus)

### Browser Compatibility
- Chrome 91+ (requires Manifest V3 ES modules support)
- Chromium-based browsers with Manifest V3 support

### Audio Settings
- Sample rate: 16kHz (optimal for Whisper)
- Bitrate: 128kbps
- Codec: webm/opus
- Channels: Mono

---

## 📄 License

Apache 2.0

---

## 🙏 Credits

- **Whisper AI** by OpenAI (via Replicate)
- **Claude AI** by Anthropic (optional text refinement)
- **JetBrains Mono** font
- Built with **React**, **TypeScript**, and **Vite**

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📧 Support

For issues, questions, or feature requests, please open an issue on GitHub.

---

**Enjoy using FlowType!** 🎤✨
