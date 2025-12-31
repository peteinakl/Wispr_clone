// Permissions page JavaScript
const requestBtn = document.getElementById('requestBtn');
const statusEl = document.getElementById('status');

requestBtn.addEventListener('click', async () => {
  requestBtn.disabled = true;
  requestBtn.textContent = 'Requesting permission...';
  statusEl.textContent = '';
  statusEl.className = 'status';

  try {
    console.log('[Permissions] Requesting microphone access...');

    // Request microphone permission - this WILL show a prompt in a tab
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    console.log('[Permissions] Permission granted!');

    // Stop the stream immediately - we just needed permission
    stream.getTracks().forEach(track => track.stop());

    // Show success
    statusEl.className = 'status success';
    statusEl.innerHTML = `
      <svg class="success-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <div>✓ Microphone access granted!</div>
      <div class="close-message">You can close this tab now.</div>
    `;

    requestBtn.textContent = 'Permission Granted';

    // Auto-close after 2 seconds
    setTimeout(() => {
      window.close();
    }, 2000);

  } catch (error) {
    console.error('[Permissions] Permission denied:', error);

    statusEl.className = 'status error';

    if (error.name === 'NotAllowedError') {
      statusEl.textContent = '❌ Permission denied. Please click "Allow" when prompted, or check your browser/system settings.';
    } else if (error.name === 'NotFoundError') {
      statusEl.textContent = '❌ No microphone found. Please connect a microphone and try again.';
    } else {
      statusEl.textContent = `❌ Error: ${error.message}`;
    }

    requestBtn.disabled = false;
    requestBtn.textContent = 'Try Again';
  }
});

console.log('[Permissions] Page loaded, button ready');
