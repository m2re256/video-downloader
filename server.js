const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const https = require('https');
const { execFile } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const BIN_DIR = path.join(__dirname, 'bin');
const YTDLP_PATH = path.join(BIN_DIR, 'yt-dlp');
const YTDLP_URL = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp';

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        downloadFile(response.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download yt-dlp: HTTP ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function ensureYtDlp() {
  if (!fs.existsSync(BIN_DIR)) fs.mkdirSync(BIN_DIR, { recursive: true });
  if (!fs.existsSync(YTDLP_PATH)) {
    console.log('Downloading yt-dlp binary...');
    await downloadFile(YTDLP_URL, YTDLP_PATH);
    fs.chmodSync(YTDLP_PATH, 0o755);
    console.log('yt-dlp binary ready.');
  }
}

function runYtDlp(args) {
  return new Promise((resolve, reject) => {
    execFile(YTDLP_PATH, args, { maxBuffer: 1024 * 1024 * 50 }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || error.message));
        return;
      }
      resolve(stdout);
    });
  });
}

function isValidUrl(str) {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}

app.post('/api/info', async (req, res) => {
  const { url } = req.body;

  if (!url || !isValidUrl(url)) {
    return res.status(400).json({ error: 'Please provide a valid URL.' });
  }

  try {
    const stdout = await runYtDlp(['--dump-single-json', '--no-warnings', '--no-check-certificates', url]);
    const info = JSON.parse(stdout);

    const formats = (info.formats || [])
      .filter(f => f.url && (f.vcodec !== 'none' || f.acodec !== 'none'))
      .map(f => ({
        format_id: f.format_id,
        ext: f.ext,
        quality: f.format_note || f.resolution || (f.acodec !== 'none' && f.vcodec === 'none' ? 'audio only' : 'unknown'),
        filesize: f.filesize || f.filesize_approx || null,
        hasAudio: f.acodec !== 'none',
        hasVideo: f.vcodec !== 'none',
      }));

    res.json({
      title: info.title,
      thumbnail: info.thumbnail,
      duration: info.duration,
      uploader: info.uploader,
      formats,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch video info. The link may be unsupported, private, or region-locked.' });
  }
});

app.get('/api/download', async (req, res) => {
  const { url, format_id } = req.query;

  if (!url || !isValidUrl(url)) {
    return res.status(400).json({ error: 'Please provide a valid URL.' });
  }

  try {
    res.setHeader('Content-Disposition', 'attachment; filename="video.mp4"');

    const { spawn } = require('child_process');
    const args = ['-f', format_id || 'best', '-o', '-', url];
    const subprocess = spawn(YTDLP_PATH, args);

    subprocess.stdout.pipe(res);

    subprocess.stderr.on('data', () => {});
    subprocess.on('error', (err) => {
      console.error(err);
      if (!res.headersSent) res.status(500).end('Download failed.');
    });
  } catch (err) {
    console.error(err);
    if (!res.headersSent) res.status(500).json({ error: 'Download failed.' });
  }
});

ensureYtDlp()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to set up yt-dlp:', err);
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT} (yt-dlp setup failed)`);
    });
  });
