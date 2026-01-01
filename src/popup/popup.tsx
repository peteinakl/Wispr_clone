import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { StorageManager } from '@/lib/storage/storage-manager';
import { WritingStyle } from '@/lib/types/settings';
import './popup.css';

function Popup() {
  const [apiKey, setApiKey] = useState('');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [micPermission, setMicPermission] = useState<'unknown' | 'granted' | 'denied'>('unknown');
  const [checkingMic, setCheckingMic] = useState(false);
  const [claudeApiKey, setClaudeApiKey] = useState('');
  const [writingStyle, setWritingStyle] = useState<WritingStyle>(WritingStyle.PROFESSIONAL);
  const [claudeSaved, setClaudeSaved] = useState(false);

  // Load existing API key and check microphone permission on mount
  useEffect(() => {
    loadApiKey();
    loadIntelligenceSettings();
    checkMicrophonePermission();
  }, []);

  async function loadApiKey() {
    try {
      const key = await StorageManager.getApiKey();
      if (key) {
        setApiKey(key);
      }
    } catch (err) {
      console.error('Failed to load API key:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadIntelligenceSettings() {
    try {
      const claudeKey = await StorageManager.getClaudeApiKey();
      const style = await StorageManager.getWritingStyle();
      if (claudeKey) setClaudeApiKey(claudeKey);
      setWritingStyle(style);
    } catch (err) {
      console.error('Failed to load intelligence settings:', err);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    // Validate input
    if (!apiKey.trim()) {
      setError('API key is required');
      return;
    }

    if (apiKey.length < 10) {
      setError('API key appears to be invalid');
      return;
    }

    try {
      await StorageManager.setApiKey(apiKey.trim());
      setSaved(true);

      // Reset saved state after 2 seconds
      setTimeout(() => {
        setSaved(false);
      }, 2000);
    } catch (err) {
      setError('Failed to save API key');
      console.error('Save error:', err);
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setApiKey(e.target.value);
    setError('');
  }

  async function handleSaveClaude(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!claudeApiKey.trim()) {
      setError('Claude API key is required');
      return;
    }

    try {
      await StorageManager.setClaudeApiKey(claudeApiKey.trim());
      await StorageManager.setWritingStyle(writingStyle);
      setClaudeSaved(true);
      setTimeout(() => setClaudeSaved(false), 2000);
    } catch (err) {
      setError('Failed to save Claude settings');
      console.error('Save error:', err);
    }
  }

  async function checkMicrophonePermission() {
    try {
      // Check if microphone permission query is supported
      if (navigator.permissions && navigator.permissions.query) {
        const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        setMicPermission(result.state === 'granted' ? 'granted' : 'unknown');

        // Listen for permission changes
        result.onchange = () => {
          setMicPermission(result.state === 'granted' ? 'granted' : result.state === 'denied' ? 'denied' : 'unknown');
        };
      }
    } catch (err) {
      console.log('Permission query not supported, will request on use');
    }
  }

  async function requestMicrophonePermission() {
    setCheckingMic(true);
    setError('');

    try {
      // Open permission page in a new tab (popups can't show getUserMedia prompts)
      const permissionsUrl = chrome.runtime.getURL('permissions.html');
      await chrome.tabs.create({ url: permissionsUrl });

      console.log('[Popup] Opened permissions page in new tab');

      // Recheck permission after a short delay
      setTimeout(() => {
        checkMicrophonePermission();
        setCheckingMic(false);
      }, 1000);

    } catch (err) {
      console.error('[Popup] Failed to open permissions page:', err);
      setError('Failed to open permissions page');
      setCheckingMic(false);
    }
  }

  return (
    <div className="popup-container">
      {/* Header with logo area */}
      <div className="popup-header">
        <div className="logo-section">
          <div className="logo-icon">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="12" cy="12" r="3" fill="currentColor"/>
            </svg>
          </div>
          <div className="logo-text">
            <h1>FlowType</h1>
            <span className="version">v0.1.0</span>
          </div>
        </div>
      </div>

      {/* Configuration section */}
      <div className="popup-section">
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label htmlFor="api-key">
              <span className="label-text">Replicate API Key</span>
              <span className="label-badge">Required</span>
            </label>
            <input
              id="api-key"
              type="password"
              value={apiKey}
              onChange={handleInputChange}
              placeholder="r8_•••••••••••••••••••••••••"
              disabled={loading}
              className={error ? 'error' : ''}
              autoComplete="off"
            />
            {error && <span className="error-message">{error}</span>}
            <p className="help-text">
              Get your API key from{' '}
              <a
                href="https://replicate.com/account/api-tokens"
                target="_blank"
                rel="noopener noreferrer"
              >
                replicate.com
              </a>
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || !apiKey.trim()}
            className={saved ? 'saved' : ''}
          >
            {saved ? (
              <>
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5"
                        strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Saved
              </>
            ) : (
              'Save API Key'
            )}
          </button>
        </form>
      </div>

      {/* Intelligence Settings Section */}
      <div className="popup-section intelligence-section">
        <h2 className="section-heading">
          Intelligence Features
          <span className="badge-new">Phase 2</span>
        </h2>
        <form onSubmit={handleSaveClaude}>
          <div className="form-group">
            <label htmlFor="claude-api-key">
              <span className="label-text">Claude API Key</span>
              <span className="label-badge">Optional</span>
            </label>
            <input
              id="claude-api-key"
              type="password"
              value={claudeApiKey}
              onChange={(e) => setClaudeApiKey(e.target.value)}
              placeholder="sk-ant-api03-••••••••••••••••"
              disabled={loading}
              autoComplete="off"
            />
            <p className="help-text">
              Enables smart text refinement.{' '}
              <a
                href="https://console.anthropic.com/settings/keys"
                target="_blank"
                rel="noopener noreferrer"
              >
                Get your key
              </a>
            </p>
          </div>

          <div className="form-group">
            <label htmlFor="writing-style">
              <span className="label-text">Writing Style</span>
            </label>
            <select
              id="writing-style"
              value={writingStyle}
              onChange={(e) => setWritingStyle(e.target.value as WritingStyle)}
              disabled={loading || !claudeApiKey}
            >
              <option value={WritingStyle.PROFESSIONAL}>Professional</option>
              <option value={WritingStyle.CASUAL}>Casual</option>
              <option value={WritingStyle.TECHNICAL}>Technical</option>
            </select>
            <p className="help-text">
              Choose how your transcribed text should be refined
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || !claudeApiKey.trim()}
            className={claudeSaved ? 'saved' : ''}
          >
            {claudeSaved ? (
              <>
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5"
                        strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Saved
              </>
            ) : (
              'Save Intelligence Settings'
            )}
          </button>
        </form>

        {/* Feature list */}
        <div className="feature-list">
          <div className="feature-item">
            <svg className="feature-icon" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none"/>
              <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2"
                    fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Removes filler words (um, uh, like)</span>
          </div>
          <div className="feature-item">
            <svg className="feature-icon" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none"/>
              <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2"
                    fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Improved punctuation</span>
          </div>
          <div className="feature-item">
            <svg className="feature-icon" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none"/>
              <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2"
                    fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Style-matched writing</span>
          </div>
        </div>
      </div>

      {/* Microphone permission section */}
      <div className="popup-section">
        <div className="form-group">
          <label>
            <span className="label-text">Microphone Access</span>
            {micPermission === 'granted' && (
              <span className="label-badge granted">Granted</span>
            )}
            {micPermission === 'denied' && (
              <span className="label-badge denied">Denied</span>
            )}
          </label>

          {micPermission === 'granted' ? (
            <div className="permission-status granted">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5"
                      strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Microphone access granted</span>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={requestMicrophonePermission}
                disabled={checkingMic}
                className="secondary"
              >
                {checkingMic ? 'Checking...' : 'Grant Microphone Access'}
              </button>
              <p className="help-text">
                Required for voice recording. Click to grant permission.
              </p>
            </>
          )}
        </div>
      </div>

      {/* Instructions section */}
      <div className="popup-section instructions">
        <h2>Quick Start</h2>
        <div className="instruction-item">
          <span className="step-number">1</span>
          <div className="step-content">
            <p>Focus any text field on any webpage</p>
          </div>
        </div>
        <div className="instruction-item">
          <span className="step-number">2</span>
          <div className="step-content">
            <p>Press the keyboard shortcut to start recording</p>
            <div className="keyboard-shortcut">
              <kbd>⌘</kbd>
              <kbd>⇧</kbd>
              <kbd>Space</kbd>
            </div>
          </div>
        </div>
        <div className="instruction-item">
          <span className="step-number">3</span>
          <div className="step-content">
            <p>Speak your text, then press the shortcut again to transcribe</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="popup-footer">
        <p>
          Powered by <strong>Whisper AI</strong>
          {claudeApiKey && <> & <strong>Claude</strong></>}
        </p>
      </div>
    </div>
  );
}

// Mount React app
const root = createRoot(document.getElementById('root')!);
root.render(<Popup />);
