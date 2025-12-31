import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { StorageManager } from '@/lib/storage/storage-manager';
import './popup.css';

function Popup() {
  const [apiKey, setApiKey] = useState('');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [micPermission, setMicPermission] = useState<'unknown' | 'granted' | 'denied'>('unknown');
  const [checkingMic, setCheckingMic] = useState(false);

  // Load existing API key and check microphone permission on mount
  useEffect(() => {
    loadApiKey();
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
        </p>
      </div>
    </div>
  );
}

// Mount React app
const root = createRoot(document.getElementById('root')!);
root.render(<Popup />);
