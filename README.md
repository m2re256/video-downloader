# Video Downloader

A simple web app that fetches video download links from a URL using `yt-dlp`.

## Run locally

1. Install [Node.js](https://nodejs.org) (v18+).
2. Open a terminal in this folder and run:
   ```
   npm install
   npm start
   ```
3. Open `http://localhost:3000` in your browser.

## Deploy for free (Render.com)

1. Push this folder to a new GitHub repository.
2. Go to [render.com](https://render.com) → New → Web Service.
3. Connect your GitHub repo.
4. Settings:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free
5. Deploy. Render will give you a public URL like `https://yourapp.onrender.com`.

Render's free tier works well here because it runs a persistent Node process (needed for `yt-dlp`), unlike static hosts like Vercel/Netlify which won't run the backend.

## Alternative: Railway.app

Same idea — connect your repo, Railway auto-detects Node, deploys with a free trial tier.

## Important notes

- This uses `yt-dlp-exec`, which downloads the `yt-dlp` binary automatically on `npm install`.
- Supported sites: YouTube, Instagram, TikTok, Twitter/X, Facebook, and hundreds more — see the [yt-dlp supported sites list](https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md).
- **Legal note:** downloading content from most platforms violates their Terms of Service, and copyrighted content downloading can create legal exposure for you as the site operator. Consider restricting this to content you have rights to, or content the platform explicitly allows downloading.
- Free hosting tiers "sleep" after inactivity — the first request after idle time will be slow (10–30s) while the server wakes up.
- `yt-dlp` needs regular updates since platforms change their internals often; run `npm update yt-dlp-exec` periodically.
