# PhaseLock — Project Page

Research project page for *Physics in 2-Steps: Locking Motion Priors Before Visual Refinement Erases Them* (ICML 2026).

## Local preview

Browsers block `fetch('data/videos.json')` when opening `index.html` via `file://`. Serve the folder over HTTP:

```bash
cd project_page
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploying to `phaselock.github.io`

1. Create a new GitHub organization named **`phaselock`** (github.com → Settings → New organization, free plan).
2. In that org, create a repo named **`phaselock.github.io`** (exact match — this makes it the org root site).
3. Push this folder to the repo:

   ```bash
   cd project_page
   git init -b main
   git add .
   git commit -m "Initial project page"
   git remote add origin https://github.com/phaselock/phaselock.github.io.git
   git push -u origin main
   ```

4. In the repo, go to **Settings → Pages** and confirm the source is `main` branch, `/` root. The site is live at <https://phaselock.github.io/> within ~1 minute.

## Things to fill in later

- Replace the 6 `<a href="#" class="author">` links in `index.html` with each author's homepage / Google Scholar URL.
- Replace the four **Coming soon** buttons in the hero (Paper / arXiv / Code / Gallery) once links are public.
- Swap in more highlight pairs: download the mp4s to `videos/highlights/{phygenbench,physics-iq}/` and flip the entry in `data/videos.json` to use the local path (see `HIGHLIGHT_LOCAL` mapping in the generator).
- Expand the **Method** section — currently a placeholder.
- (Optional) Add a **Results** section with Physics-IQ / PhyGenBench tables and the per-scenario analysis from Appendix G.1.

## Structure

```
project_page/
├── index.html
├── static/
│   ├── css/style.css
│   └── js/gallery.js
├── data/videos.json          # benchmark → { highlights[], remote[] }
└── videos/
    └── highlights/
        ├── phygenbench/      # 4 pairs (8 mp4s) — bundled
        └── physics-iq/       # 4 pairs (8 mp4s) — bundled
```

Remote pairs stream from `https://phaselock-physical-video.github.io/samples/...` (CORS-enabled), so the repo stays lightweight (~8 MB) while the full gallery is still reachable via the **Load remaining pairs** button.
