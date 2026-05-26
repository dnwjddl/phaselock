#!/usr/bin/env python
"""
Compare PhaseLock vs Baseline

This example generates the same video with and without PhaseLock
to demonstrate the improvement in physical consistency.
"""

import torch
from diffusers import CogVideoXImageToVideoPipeline
from diffusers.utils import export_to_video, load_image

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from phaselock import PhaseLockPipeline, set_seed


def generate_baseline(pipe, image, prompt, seed=42):
    """Generate video without PhaseLock (baseline)."""
    generator = torch.Generator(device="cuda").manual_seed(seed)
    result = pipe(
        prompt=prompt,
        image=image,
        num_frames=49,
        num_inference_steps=50,
        guidance_scale=6.0,
        generator=generator,
    ).frames[0]
    return result


def generate_phaselock(phaselock_pipe, image, prompt, seed=42):
    """Generate video with PhaseLock."""
    return phaselock_pipe(
        prompt=prompt,
        image=image,
        num_frames=49,
        guidance_scale=6.0,
        seed=seed,
    )


def main():
    set_seed(42)
    
    print("Loading CogVideoX-5B-I2V...")
    base_pipe = CogVideoXImageToVideoPipeline.from_pretrained(
        "THUDM/CogVideoX-5B-I2V",
        torch_dtype=torch.bfloat16
    )
    base_pipe.enable_model_cpu_offload()
    base_pipe.vae.enable_slicing()
    base_pipe.vae.enable_tiling()
    
    phaselock_pipe = PhaseLockPipeline(
        base_pipe,
        guidance_strength=0.05,
        few_steps=2,
        full_steps=50,
    )
    
    image = load_image("path/to/your/image.jpg")
    prompt = "A glass of water being tilted, causing water to spill out"
    
    print("Generating baseline...")
    baseline_frames = generate_baseline(base_pipe, image, prompt)
    export_to_video(baseline_frames, "comparison_baseline.mp4", fps=8)
    
    print("Generating with PhaseLock...")
    phaselock_frames = generate_phaselock(phaselock_pipe, image, prompt)
    export_to_video(phaselock_frames, "comparison_phaselock.mp4", fps=8)
    
    print("\nResults saved:")
    print("  - comparison_baseline.mp4 (without PhaseLock)")
    print("  - comparison_phaselock.mp4 (with PhaseLock)")
    print("\nCompare the physical consistency of water motion in both videos!")


if __name__ == "__main__":
    main()
