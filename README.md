# PhaseLock

Official code and project page for **Physics in 2-Steps: Locking Motion Priors Before Visual Refinement Erases Them**.

PhaseLock is a training-free inference method for video diffusion models. It first runs a few-step generation to extract a motion prior, then uses latent delta guidance during full denoising to preserve that motion while visual details are refined.

## Repository Layout

```text
phaselock/              # Python package
configs/                # Default inference configuration
examples/               # Minimal usage examples
scripts/                # Command-line inference and evaluation scripts
index.html              # GitHub Pages project page
static/, data/, videos/ # Project page assets
```

Generated videos and local experiment outputs are intentionally ignored by Git. Keep outputs under `output/` or `test_outputs/`.

## Installation

```bash
git clone https://github.com/dnwjddl/phaselock.git
cd phaselock
pip install -e .
```

For the package dependencies only:

```bash
pip install -r requirements.txt
```

## Quick Start

Image-to-video generation with PhaseLock:

```bash
python scripts/inference.py \
  --prompt "A red ball rolling down a wooden ramp and bouncing on the floor" \
  --image path/to/image.jpg \
  --output output/ball_rolling.mp4
```

Text-to-video generation:

```bash
python scripts/inference.py \
  --mode t2v \
  --prompt "A pendulum swinging back and forth" \
  --output output/pendulum.mp4
```

Run the baseline without PhaseLock:

```bash
python scripts/inference.py \
  --prompt "A red ball rolling down a wooden ramp and bouncing on the floor" \
  --image path/to/image.jpg \
  --output output/baseline.mp4 \
  --no_phaselock
```

## Python API

```python
from diffusers import CogVideoXImageToVideoPipeline
from diffusers.utils import export_to_video, load_image

from phaselock import PhaseLockPipeline

pipe = PhaseLockPipeline.from_pretrained(
    "THUDM/CogVideoX-5B-I2V",
    CogVideoXImageToVideoPipeline,
    few_steps=2,
    full_steps=50,
    guidance_strength=0.05,
)

image = load_image("path/to/image.jpg")
frames = pipe(
    prompt="A red ball rolling down a wooden ramp and bouncing on the floor",
    image=image,
    num_frames=49,
    guidance_scale=6.0,
    seed=42,
)

export_to_video(frames, "output/ball_rolling.mp4", fps=8)
```

## Project Page

This repository also serves the project page at:

```text
https://dnwjddl.github.io/phaselock/
```

To preview it locally, serve the repository root over HTTP. Opening `index.html` directly through `file://` can block `fetch('data/videos.json')`.

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

Remote gallery pairs stream from `https://phaselock-physical-video.github.io/samples/...` so the repository stays lightweight while the full gallery remains available from the page.

## Citation

Citation information will be added here when the paper metadata is finalized.
