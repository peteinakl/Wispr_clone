/**
 * Floating Recording Indicator
 * Premium audio equipment aesthetic with dynamic waveform visualization
 */

export class FloatingIndicator {
  private container: HTMLDivElement | null = null;
  private styleElement: HTMLStyleElement | null = null;
  private waveformBars: HTMLDivElement[] = [];
  private animationFrame: number | null = null;

  /**
   * Show indicator in recording state with waveform animation
   */
  show(): void {
    if (this.container) return;

    this.injectStyles();
    this.createContainer();
    this.startWaveformAnimation();

    this.container!.innerHTML = `
      <div class="flowtype-indicator-content">
        <div class="flowtype-waveform">
          ${Array.from({ length: 5 }, (_, i) => `
            <div class="flowtype-wave-bar" style="animation-delay: ${i * 0.1}s"></div>
          `).join('')}
        </div>
        <div class="flowtype-text">
          <span class="flowtype-status">RECORDING</span>
          <span class="flowtype-duration" id="flowtype-duration">0:00</span>
        </div>
      </div>
    `;

    // Cache waveform bars for animation
    this.waveformBars = Array.from(
      this.container!.querySelectorAll('.flowtype-wave-bar')
    );

    // Start duration counter
    this.startDurationCounter();

    // Trigger entrance animation
    requestAnimationFrame(() => {
      this.container!.classList.add('flowtype-visible');
    });
  }

  /**
   * Show processing state with spinner
   */
  showProcessing(): void {
    if (!this.container) return;

    this.stopWaveformAnimation();
    this.stopDurationCounter();

    this.container.innerHTML = `
      <div class="flowtype-indicator-content">
        <div class="flowtype-spinner">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="9" stroke-width="2.5" />
          </svg>
        </div>
        <div class="flowtype-text">
          <span class="flowtype-status">PROCESSING</span>
        </div>
      </div>
    `;

    this.container.classList.add('flowtype-processing');
  }

  /**
   * Show refining state with spinner
   */
  showRefining(): void {
    if (!this.container) return;

    this.stopWaveformAnimation();
    this.stopDurationCounter();

    this.container.innerHTML = `
      <div class="flowtype-indicator-content">
        <div class="flowtype-spinner flowtype-spinner-refining">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="9" stroke-width="2.5" />
          </svg>
        </div>
        <div class="flowtype-text">
          <span class="flowtype-status">REFINING</span>
          <span class="flowtype-substatus">Applying intelligence...</span>
        </div>
      </div>
    `;

    this.container.classList.remove('flowtype-processing');
    this.container.classList.add('flowtype-refining');
  }

  /**
   * Show error state with message
   */
  showError(message: string): void {
    if (!this.container) {
      this.createContainer();
    }

    this.stopWaveformAnimation();
    this.stopDurationCounter();

    this.container!.innerHTML = `
      <div class="flowtype-indicator-content">
        <div class="flowtype-error-icon">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/>
            <path d="M12 8v4m0 4h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </div>
        <div class="flowtype-text">
          <span class="flowtype-status">ERROR</span>
          <span class="flowtype-message">${this.escapeHtml(message)}</span>
        </div>
      </div>
    `;

    this.container!.classList.add('flowtype-visible', 'flowtype-error');
  }

  /**
   * Hide indicator with fade-out animation
   */
  hide(): void {
    if (!this.container) return;

    this.stopWaveformAnimation();
    this.stopDurationCounter();

    this.container.classList.remove('flowtype-visible');

    // Remove after animation completes
    setTimeout(() => {
      if (this.container) {
        this.container.remove();
        this.container = null;
      }
      if (this.styleElement) {
        this.styleElement.remove();
        this.styleElement = null;
      }
      this.waveformBars = [];
    }, 300);
  }

  /**
   * Create container element
   */
  private createContainer(): void {
    this.container = document.createElement('div');
    this.container.id = 'flowtype-indicator';
    this.container.className = 'flowtype-indicator';
    document.body.appendChild(this.container);
  }

  /**
   * Inject styles dynamically
   */
  private injectStyles(): void {
    if (this.styleElement) return;

    this.styleElement = document.createElement('style');
    this.styleElement.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&display=swap');

      .flowtype-indicator {
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 2147483647;

        /* Refined glassmorphism */
        background: rgba(26, 26, 26, 0.85);
        backdrop-filter: blur(20px) saturate(180%);
        -webkit-backdrop-filter: blur(20px) saturate(180%);

        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 16px;
        padding: 16px 20px;

        /* Sophisticated shadows */
        box-shadow:
          0 8px 32px rgba(0, 0, 0, 0.4),
          0 2px 8px rgba(0, 0, 0, 0.2),
          inset 0 1px 0 rgba(255, 255, 255, 0.05);

        /* Entrance animation */
        opacity: 0;
        transform: translateY(20px) scale(0.95);
        transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                    transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);

        font-family: 'JetBrains Mono', 'Monaco', 'Courier New', monospace;
        color: #ffffff;
      }

      .flowtype-indicator.flowtype-visible {
        opacity: 1;
        transform: translateY(0) scale(1);
      }

      .flowtype-indicator.flowtype-error {
        background: rgba(220, 38, 38, 0.15);
        border-color: rgba(220, 38, 38, 0.3);
      }

      .flowtype-indicator.flowtype-processing {
        background: rgba(59, 130, 246, 0.15);
        border-color: rgba(59, 130, 246, 0.3);
      }

      .flowtype-indicator.flowtype-refining {
        background: rgba(139, 92, 246, 0.15);
        border-color: rgba(139, 92, 246, 0.3);
      }

      .flowtype-indicator-content {
        display: flex;
        align-items: center;
        gap: 14px;
        min-width: 200px;
      }

      /* Waveform visualization */
      .flowtype-waveform {
        display: flex;
        align-items: center;
        gap: 3px;
        height: 24px;
      }

      .flowtype-wave-bar {
        width: 3px;
        background: #ef4444;
        border-radius: 2px;
        animation: flowtype-wave 1.2s ease-in-out infinite;
        box-shadow: 0 0 8px rgba(239, 68, 68, 0.4);
      }

      .flowtype-wave-bar:nth-child(1) { animation-delay: 0s; }
      .flowtype-wave-bar:nth-child(2) { animation-delay: 0.1s; }
      .flowtype-wave-bar:nth-child(3) { animation-delay: 0.2s; }
      .flowtype-wave-bar:nth-child(4) { animation-delay: 0.1s; }
      .flowtype-wave-bar:nth-child(5) { animation-delay: 0s; }

      @keyframes flowtype-wave {
        0%, 100% {
          height: 8px;
          opacity: 0.6;
        }
        50% {
          height: 24px;
          opacity: 1;
        }
      }

      /* Spinner */
      .flowtype-spinner {
        width: 24px;
        height: 24px;
        animation: flowtype-spin 1s linear infinite;
      }

      .flowtype-spinner svg {
        width: 100%;
        height: 100%;
      }

      .flowtype-spinner circle {
        fill: none;
        stroke: #3b82f6;
        stroke-dasharray: 56.5;
        stroke-dashoffset: 14.125;
        stroke-linecap: round;
        filter: drop-shadow(0 0 6px rgba(59, 130, 246, 0.5));
      }

      .flowtype-spinner-refining circle {
        stroke: #8b5cf6;
        filter: drop-shadow(0 0 6px rgba(139, 92, 246, 0.5));
      }

      @keyframes flowtype-spin {
        to {
          transform: rotate(360deg);
        }
      }

      /* Error icon */
      .flowtype-error-icon {
        width: 24px;
        height: 24px;
        color: #ef4444;
        filter: drop-shadow(0 0 6px rgba(239, 68, 68, 0.4));
      }

      .flowtype-error-icon svg {
        width: 100%;
        height: 100%;
      }

      /* Text content */
      .flowtype-text {
        display: flex;
        flex-direction: column;
        gap: 2px;
        flex: 1;
      }

      .flowtype-status {
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        opacity: 0.7;
      }

      .flowtype-substatus {
        font-size: 10px;
        font-weight: 400;
        color: rgba(255, 255, 255, 0.6);
        letter-spacing: 0.05em;
        margin-top: 2px;
      }

      .flowtype-duration {
        font-size: 14px;
        font-weight: 400;
        letter-spacing: 0.05em;
        color: #ffffff;
        opacity: 0.9;
      }

      .flowtype-message {
        font-size: 11px;
        font-weight: 400;
        color: rgba(255, 255, 255, 0.8);
        line-height: 1.4;
      }

      /* Hover interaction */
      .flowtype-indicator:hover {
        background: rgba(26, 26, 26, 0.95);
        border-color: rgba(255, 255, 255, 0.15);
        box-shadow:
          0 12px 48px rgba(0, 0, 0, 0.5),
          0 4px 12px rgba(0, 0, 0, 0.3),
          inset 0 1px 0 rgba(255, 255, 255, 0.08);
        transform: translateY(-2px);
      }

      /* Responsive adjustments */
      @media (max-width: 768px) {
        .flowtype-indicator {
          bottom: 16px;
          right: 16px;
        }
      }
    `;

    document.head.appendChild(this.styleElement);
  }

  /**
   * Start waveform animation with random variations
   */
  private startWaveformAnimation(): void {
    const animate = () => {
      this.waveformBars.forEach((bar, index) => {
        const baseHeight = 8 + Math.random() * 16;
        const randomDelay = Math.random() * 0.3;
        bar.style.height = `${baseHeight}px`;
        bar.style.animationDelay = `${randomDelay}s`;
      });

      this.animationFrame = requestAnimationFrame(() => {
        setTimeout(animate, 150);
      });
    };

    animate();
  }

  /**
   * Stop waveform animation
   */
  private stopWaveformAnimation(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  /**
   * Start recording duration counter
   */
  private durationInterval: number | null = null;
  private startTime: number = 0;

  private startDurationCounter(): void {
    this.startTime = Date.now();
    this.updateDuration();

    this.durationInterval = window.setInterval(() => {
      this.updateDuration();
    }, 1000);
  }

  /**
   * Update duration display
   */
  private updateDuration(): void {
    const durationElement = document.getElementById('flowtype-duration');
    if (!durationElement) return;

    const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    durationElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Stop duration counter
   */
  private stopDurationCounter(): void {
    if (this.durationInterval) {
      clearInterval(this.durationInterval);
      this.durationInterval = null;
    }
  }

  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
