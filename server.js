const express = require('express');
const cors = require('cors');
const path = require('path');
const ytdlp = require('yt-dlp-exec');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Basic URL sanity check
function isValidUrl(str) {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}

// Get video info + available formats
app.post('/api/info', async (req, res) => {
  const { url } = req.body;

  if (!url || !isValidUrl(url)) {
    return res.status(400).json({ error: 'Please provide a valid URL.' });
  }

  try {
    const info = await ytdlp(url, {
      dumpSingleJson: true,
      noWarnings: true,
      noCheckCertificates: true,
      preferFreeFormats: true,
    });

    // Filter and simplify formats — keep ones with a direct URL and either video or audio
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

// Stream the actual download to the user
app.get('/api/download', async (req, res) => {
  const { url, format_id } = req.query;

  if (!url || !isValidUrl(url)) {
    return res.status(400).json({ error: 'Please provide a valid URL.' });
  }

  try {
    res.setHeader('Content-Disposition', 'attachment; filename="video.mp4"');

    const subprocess = ytdlp.exec(url, {
      format: format_id || 'best',
      output: '-', // stream to stdout
    });

    subprocess.stdout.pipe(res);

    subprocess.on('error', (err) => {
      console.error(err);
      if (!res.headersSent) res.status(500).end('Download failed.');
    });
  } catch (err) {
    console.error(err);
    if (!res.headersSent) res.status(500).json({ error: 'Download failed.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
