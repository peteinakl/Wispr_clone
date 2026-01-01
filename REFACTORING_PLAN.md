# FlowType Refactoring Plan

## Overview
This document outlines a systematic refactoring plan to improve code efficiency, cleanliness, and maintainability without changing functionality.

**Guiding Principles:**
- No breaking changes to functionality
- Incremental, testable improvements
- Build and test after each phase
- Maintain backward compatibility

---

## Phase 1: Extract Constants (Magic Numbers) ⚡ Quick Win

**Impact**: High clarity gain, low effort
**Risk**: Very low
**Estimated time**: 15 minutes

### Changes:
1. **src/shared/constants.ts** - Add timing constants
2. **src/content/floating-indicator.tsx** - Replace magic numbers
3. **src/background/service-worker.ts** - Replace magic delays
4. **src/lib/api/replicate-client.ts** - Extract model version hash

### New Constants:
```typescript
// Timing constants
export const INITIALIZATION_DELAY_MS = 100;
export const FADE_OUT_DURATION_MS = 300;
export const ERROR_DISPLAY_DURATION_MS = 3000;
export const WAVEFORM_UPDATE_INTERVAL_MS = 150;
export const RECORDER_TIMESLICE_MS = 100;

// Replicate API
export const WHISPER_MODEL_VERSION_HASH = '4d50797290df275329f202e48c76360b3f22b08d28c196cbc54600319435f8d2';
```

---

## Phase 2: Extract Shared Utilities (DRY) 🔧

**Impact**: Reduces duplication, improves maintainability
**Risk**: Low (pure utility functions)
**Estimated time**: 30 minutes

### Changes:
1. **src/shared/utils.ts** - Add shared utilities:
   - `handleApiError(response: Response, context: string): Promise<never>`
   - `isEditableElement(element: Element): boolean`
   - `escapeHtml(text: string): string` (move from floating-indicator)

2. **src/lib/api/replicate-client.ts** - Use `handleApiError()`
3. **src/lib/api/claude-client.ts** - Use `handleApiError()`
4. **src/content/content.ts** - Use `isEditableElement()`
5. **src/content/text-injector.ts** - Use `isEditableElement()`
6. **src/content/floating-indicator.tsx** - Remove local `escapeHtml()`

---

## Phase 3: Break Up Long Functions 📐

**Impact**: Improves readability and testability
**Risk**: Medium (requires careful extraction)
**Estimated time**: 45 minutes

### 3A: Refactor service-worker.ts

#### Extract from `transcribeAudio()`:
```typescript
// New functions:
async function getTranscription(audioBlob: Blob): Promise<string>
async function applyRefinementIfAvailable(transcription: string): Promise<string>
async function notifyTranscriptionComplete(text: string): Promise<void>
```

#### Extract from `startRecording()`:
```typescript
// New functions:
async function validateActiveTab(): Promise<chrome.tabs.Tab>
async function initializeRecordingServices(tabId: number): Promise<void>
async function notifyRecordingStart(tabId: number): Promise<void>
```

### 3B: Refactor offscreen.ts

#### Extract from `handleStartRecording()`:
```typescript
function mapMediaErrorToMessage(error: DOMException): string
```

### 3C: Refactor floating-indicator.tsx

#### Extract from long methods:
```typescript
// Create generic state renderer
private showSpinnerState(
  status: string,
  substatus: string,
  spinnerClass: string,
  containerClass: string
): void
```

---

## Phase 4: Create Abstractions 🏗️

**Impact**: Reduces coupling, improves architecture
**Risk**: Medium-High (new classes, more testing needed)
**Estimated time**: 90 minutes

### 4A: Create AbstractApiClient

**File**: `src/lib/api/abstract-api-client.ts`

```typescript
export abstract class AbstractApiClient {
  protected apiKey: string;

  constructor(apiKey: string) {
    if (!apiKey) throw new Error('API key is required');
    this.apiKey = apiKey;
  }

  protected async handleResponse<T>(response: Response, context: string): Promise<T> {
    // Shared error handling logic
  }
}
```

Update ReplicateClient and ClaudeClient to extend AbstractApiClient.

### 4B: Create RecordingStateMachine

**File**: `src/lib/state/recording-state-machine.ts`

```typescript
export class RecordingStateMachine {
  private state: RecordingState = 'idle';

  transitionTo(newState: RecordingState): void
  canTransitionTo(newState: RecordingState): boolean
  getCurrentState(): RecordingState
  reset(): void
}
```

Replace manual state management in service-worker.ts.

### 4C: Create ContentScriptMessenger

**File**: `src/lib/messaging/content-script-messenger.ts`

```typescript
export class ContentScriptMessenger {
  constructor(private tabId: number) {}

  async notifyRecordingStarted(): Promise<void>
  async notifyRecordingStopped(): Promise<void>
  async notifyRefinementStarted(): Promise<void>
  async notifyTranscriptionComplete(text: string): Promise<void>
  async notifyError(error: string): Promise<void>
}
```

Replace direct chrome.tabs.sendMessage calls in service-worker.ts.

---

## Phase 5: Improve TypeScript Types 📘

**Impact**: Catches bugs at compile time, improves IDE support
**Risk**: Low (type-only changes)
**Estimated time**: 30 minutes

### Changes:

1. **src/shared/type-guards.ts** (NEW)
```typescript
export function isError(e: unknown): e is Error
export function isDOMException(e: unknown): e is DOMException
export function isEditableHTMLElement(element: Element): element is HTMLInputElement | HTMLTextAreaElement
```

2. **src/lib/types/messages.ts**
```typescript
// Add discriminated union
export type AnyMessage =
  | StartRecordingMessage
  | StopRecordingMessage
  | RecordingStartedMessage
  | RecordingStoppedMessage
  | RefinementStartedMessage
  | TranscriptionCompleteMessage
  | TranscriptionErrorMessage;
```

3. **src/background/service-worker.ts**
```typescript
// Replace any with proper types
function handleMessage(
  message: AnyMessage,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: any) => void
): void | boolean
```

4. **src/lib/types/settings.ts**
```typescript
// Add readonly to constants
export const WRITING_STYLE_PROMPTS: Readonly<Record<WritingStyle, string>> = { ... } as const;
```

5. **src/offscreen/offscreen.ts**
```typescript
// Add explicit return type
interface RecordingResponse {
  success: boolean;
  audioData?: string;
  mimeType?: string;
  error?: string;
}

async function handleStartRecording(): Promise<RecordingResponse>
async function handleStopRecording(): Promise<RecordingResponse>
```

---

## Phase 6: Standardize Error Handling 🚨

**Impact**: Improves reliability and user experience
**Risk**: Medium (changes error flow)
**Estimated time**: 45 minutes

### Changes:

1. **src/lib/error-handling/error-handler.ts** (NEW)
```typescript
export class ErrorHandler {
  static async handleRecordingError(
    error: unknown,
    context: string,
    notifyUser: boolean = true
  ): Promise<void> {
    // Log error
    console.error(`[${context}]`, error);

    // Extract message
    const message = isError(error) ? error.message : String(error);

    // Notify user if requested
    if (notifyUser && currentTabId) {
      await notifyError(message);
    }

    // Reset state
    recordingState = 'idle';
    currentTabId = null;
  }
}
```

2. Update all try-catch blocks to use ErrorHandler
3. Add finally blocks for cleanup
4. Standardize error messages in constants

---

## Testing Strategy

### After Each Phase:
1. Run `npm run build` - ensure no build errors
2. Run `npm run type-check` - ensure TypeScript is happy
3. Reload extension in Chrome
4. Test basic flow: Record → Stop → Text appears
5. Test error cases: Invalid API key, network failure

### Final Integration Testing:
- [ ] Test with Whisper only (no Claude key)
- [ ] Test with Whisper + Claude (all 3 styles)
- [ ] Test error scenarios (invalid keys, network issues)
- [ ] Test on multiple websites (Gmail, Slack, Reddit)
- [ ] Test keyboard shortcut on chrome:// pages (should show error)
- [ ] Verify all indicator states (recording, processing, refining)
- [ ] Check service worker logs for cleaner output

---

## Implementation Order (Recommended)

1. ✅ **Phase 1** - Extract constants (quick win, no risk)
2. ✅ **Phase 2** - Extract shared utilities (low risk, high value)
3. ⚠️ **Phase 5** - Improve TypeScript types (catches issues before phase 3/4)
4. ⚠️ **Phase 3** - Break up long functions (medium risk, high readability gain)
5. ⚠️ **Phase 6** - Standardize error handling (improves reliability)
6. 🔴 **Phase 4** - Create abstractions (highest risk, test thoroughly)

**Note**: Phases marked with 🔴 require extra caution and testing.

---

## Rollback Plan

If any phase introduces issues:
1. `git stash` or `git reset --hard` to previous commit
2. Review changes more carefully
3. Implement in smaller increments
4. Add more console logs for debugging

---

## Success Metrics

- ✅ No functionality changes (all tests pass)
- ✅ Reduced line count in long functions (target: <40 lines per function)
- ✅ Zero magic numbers remaining
- ✅ DRY violations eliminated (error handling, element checking)
- ✅ Stronger TypeScript types (no `any` in critical paths)
- ✅ Build time unchanged or improved
- ✅ Extension performance unchanged or improved

---

## Post-Refactoring Cleanup

1. Remove `REFACTORING_PLAN.md` (or keep for documentation)
2. Update `CLAUDE.md` with new architecture patterns
3. Update `README.md` if any developer instructions changed
4. Create commit: "Refactor: Improve code organization and type safety"
