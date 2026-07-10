const urlInput = document.getElementById('urlInput');
const fetchBtn = document.getElementById('fetchBtn');
const statusEl = document.getElementById('status');
const reelTrack = document.getElementById('reelTrack');
const resultEl = document.getElementById('result');
const thumbEl = document.getElementById('thumb');
const durationBadge = document.getElementById('durationBadge');
const titleEl = document.getElementById('videoTitle');
const metaEl = document.getElementById('videoMeta');
const formatsListEl = document.getElementById('formatsList');

function formatSize(bytes) {
  if (!bytes) return '';
  const mb = bytes / (1024 * 1024);
  return mb > 1000 ? `${(mb / 1024).toFixed(1)} GB` : `${mb.toFixed(1)} MB`;
}

function formatDuration(seconds) {
  if (!seconds) return '';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function setLoading(isLoading) {
  fetchBtn.disabled = isLoading;
  reelTrack.classList.toggle('active', isLoading);
}

async function fetchInfo() {
  const url = urlInput.value.trim();
  if (!url) {
    statusEl.textContent = 'Paste a link first.';
    statusEl.classList.add('error');
    return;
  }

  statusEl.classList.remove('error');
  statusEl.textContent = 'Reading source...';
  setLoading(true);
  resultEl.classList.add('hidden');

  try {
    const res = await fetch('/api/info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });

    const data = await res.json();

    if (!res.ok) {
      statusEl.textContent = data.error || 'Something went wrong.';
      statusEl.classList.add('error');
      return;
    }

    statusEl.textContent = 'Ready.';
    titleEl.textContent = data.title || 'Untitled clip';
    metaEl.textContent = data.uploader ? `@${data.uploader}` : 'Unknown source';
    thumbEl.src = data.thumbnail || '';
    durationBadge.textContent = formatDuration(data.duration);
    durationBadge.style.display = data.duration ? 'block' : 'none';

    formatsListEl.innerHTML = '';
    data.formats.forEach((f, i) => {
      const row = document.createElement('div');
      row.className = 'format-item';
      const label = f.hasAudio && f.hasVideo ? f.quality : (f.hasAudio ? 'Audio only' : f.quality);
      row.innerHTML = `
        <span class="format-index">${String(i + 1).padStart(2, '0')}</span>
        <div class="format-info">
          <div class="format-quality">${label}</div>
          <div class="format-detail">${f.ext.toUpperCase()}${f.filesize ? ' · ' + formatSize(f.filesize) : ''}</div>
        </div>
        <a href="/api/download?url=${encodeURIComponent(url)}&format_id=${encodeURIComponent(f.format_id)}">Get</a>
      `;
      formatsListEl.appendChild(row);
    });

    resultEl.classList.remove('hidden');
  } catch (err) {
    statusEl.textContent = 'Network error. Try again.';
    statusEl.classList.add('error');
  } finally {
    setLoading(false);
  }
}

fetchBtn.addEventListener('click', fetchInfo);
urlInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') fetchInfo();
});
