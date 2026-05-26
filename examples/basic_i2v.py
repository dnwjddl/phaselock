#!/usr/bin/env python
"""
Basic Image-to-Video Generation with PhaseLock

This example demonstrates the simplest usage of PhaseLock for generating
physically consistent videos from a single image.
"""

import torch
from diffusers import CogVideoXImageToVideoPipeline
from diffusers.utils import export_to_video, load_image

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from phaselock import PhaseLockPipeline


def main():
    pipe = PhaseLockPipeline.from_pretrained(
        "THUDM/CogVideoX-5B-I2V",
        CogVideoXImageToVideoPipeline,
        guidance_strength=0.05,
        few_steps=2,
        full_steps=50,
    )
    
    image = load_image("https://example.com/ball.jpg")  # Replace with your image
    
    frames = pipe(
        prompt="A red ball rolling down a wooden ramp and bouncing on the floor",
        image=image,
        num_frames=49,
        guidance_scale=6.0,
        seed=42,
    )
    
    export_to_video(frames, "ball_rolling.mp4", fps=8)
    print("Generated: ball_rolling.mp4")


if __name__ == "__main__":
    main()
