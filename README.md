# PhaseLock

This repository hosts the PhaseLock project page and official code release for **Physics in 2-Steps: Locking Motion Priors Before Visual Refinement Erases Them**.

## Links

- Project page: https://dnwjddl.github.io/phaselock/
- Code release: [`code/`](code/)

## Repository Layout

```text
.
├── index.html              # GitHub Pages project page
├── static/, data/, videos/ # Project page assets
└── code/                   # PhaseLock source code, scripts, configs, examples
```

## Code

Install and run the code from the `code/` directory:

```bash
cd code
pip install -r requirements.txt
```

See [`code/README.md`](code/README.md) for usage examples and implementation details.

## Website Preview

Serve the repository root over HTTP:

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

Opening `index.html` directly with `file://` can block loading `data/videos.json`.
