# PhaseLock: Physics in 2-Steps

**Locking Motion Priors Before Visual Refinement Erases Them**

WEBSITE: https://dnwjddl.github.io/phaselock/

[![License](https://img.shields.io/badge/License-Apache%202.0-green.svg)](LICENSE)

## Overview

PhaseLock is a **training-free** framework that significantly improves the physical consistency of video diffusion models. Our key insight: a 2-step generation often exhibits *better* physical consistency than a 50-step output from the same model.

### Key Findings

- **Phase erosion**: Motion dynamics are 8.5x more sensitive to phase corruption than magnitude, yet the refinement process progressively destroys this critical component
- **Motion priors in few-step inference**: Physical knowledge is captured in the first 2 steps but gets overwritten during visual refinement
- **Latent Delta Guidance**: Constraining frame-to-frame latent differences implicitly locks phase evolution without explicit FFT operations

### Results

| Model | Baseline | + PhaseLock | Improvement |
|-------|----------|-------------|-------------|
| CogVideoX-5B | 30.82 | 36.0 | +5.2% |
| LTX-Video | 31.50 | 37.1 | +5.6% |
| WAN 2.1 | 29.20 | 37.0 | +7.8% |

*Physics-IQ benchmark scores*

### Efficiency

- **Time overhead**: 1.06x (vs. 5x+ for reward-based methods)
- **Memory overhead**: 1.02x
- **No external models required**
- **No gradient computation**

## Installation

```bash
git clone https://github.com/dnwjddl/phaselock.git
cd phaselock/code
pip install -r requirements.txt
```

## Quick Start

### Python API

```python
from diffusers import CogVideoXImageToVideoPipeline
from diffusers.utils import load_image
from phaselock import PhaseLockPipeline

# Load model with PhaseLock wrapper
pipe = PhaseLockPipeline.from_pretrained(
    "THUDM/CogVideoX-5B-I2V",
    CogVideoXImageToVideoPipeline,
    guidance_strength=0.05,  # lambda_0
    few_steps=2,             # K_few
    full_steps=50,           # K_full
)

# Generate video
image = load_image("path/to/image.jpg")
frames = pipe(
    prompt="A ball rolling down a slope and bouncing",
    image=image,
    seed=42,
)

# Save result
from diffusers.utils import export_to_video
export_to_video(frames, "output.mp4", fps=8)
```

### Command Line

```bash
# Image-to-Video generation
python scripts/inference.py \
    --prompt "A pendulum swinging back and forth" \
    --image path/to/pendulum.jpg \
    --output pendulum.mp4

# With custom parameters
python scripts/inference.py \
    --prompt "Water being poured into a glass" \
    --image glass.jpg \
    --output water.mp4 \
    --guidance_strength 0.05 \
    --few_steps 2 \
    --full_steps 50

# Baseline comparison (PhaseLock disabled)
python scripts/inference.py \
    --prompt "A ball bouncing" \
    --image ball.jpg \
    --output baseline.mp4 \
    --no_phaselock
```

## Algorithm

PhaseLock operates in two stages:

### Stage 1: Motion Prior Extraction

```
z_few = Denoise(z_T, prompt, K_few=2)
M_prior = z_few[2:F] - z_few[1:F-1]  # Latent Delta Operator
```

### Stage 2: Latent Delta Guidance

```
for k in range(K_full):
    z = DenoisingStep(z, model, prompt)
    
    if k_start <= k < k_end:
        M_current = z[2:F] - z[1:F-1]
        G = M_prior - M_current
        lambda_k = lambda_0 * (1 - (k - k_start) / (k_end - k_start))
        z[2:F] += lambda_k * G
```

## Hyperparameters

| Parameter | Symbol | Default | Description |
|-----------|--------|---------|-------------|
| `few_steps` | K_few | 2 | Steps for motion prior extraction |
| `full_steps` | K_full | 50 | Steps for full generation |
| `guidance_strength` | λ₀ | 0.05 | Initial guidance strength |
| `guide_start` | k_start | 0 | Step to start guidance |
| `guide_end` | k_end | K_full/2 | Step to end guidance |

### Tuning Guidelines

- **guidance_strength**: Start with 0.05. Increase for more physical consistency, decrease if artifacts appear
- **few_steps**: Keep at 2 (optimal per ablation study)
- **guide_end**: K_full/2 balances physics preservation with texture refinement

## Project Structure

```
PhaseLock/
├── phaselock/
│   ├── __init__.py          # Package exports
│   ├── guidance.py          # LatentDeltaGuidance implementation
│   ├── pipeline.py          # PhaseLockPipeline wrapper
│   └── utils.py             # Utility functions
├── scripts/
│   └── inference.py         # CLI inference script
├── configs/
│   └── default.yaml         # Default hyperparameters
├── examples/                 # Example notebooks and scripts
├── requirements.txt
└── README.md
```

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

This work builds upon the excellent [diffusers](https://github.com/huggingface/diffusers) library and [CogVideoX](https://github.com/THUDM/CogVideo) model.
