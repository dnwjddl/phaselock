#!/usr/bin/env python
"""
Test PhaseLock on Physics-IQ benchmark samples.

Usage:
    python scripts/test_physics_iq.py \
        --descriptions_path path/to/descriptions.txt \
        --switch_frames_dir path/to/switch-frames \
        --max_samples 2
"""

import argparse
import os
import gc
import sys
from pathlib import Path

import torch
from diffusers import CogVideoXImageToVideoPipeline
from diffusers.utils import export_to_video, load_image

sys.path.insert(0, str(Path(__file__).parent.parent))
from phaselock import PhaseLockPipeline, set_seed


def load_physics_iq_data(descriptions_path: str, switch_frames_dir: str):
    with open(descriptions_path, 'r') as f:
        descriptions = [line.strip() for line in f.readlines() if line.strip()]
    
    image_files = sorted([
        f for f in os.listdir(switch_frames_dir) 
        if f.endswith('.jpg') or f.endswith('.png')
    ])
    
    data = []
    for i, img_file in enumerate(image_files):
        if i < len(descriptions):
            data.append({
                'index': i,
                'image_path': os.path.join(switch_frames_dir, img_file),
                'prompt': descriptions[i],
                'image_name': img_file
            })
    return data


def main():
    parser = argparse.ArgumentParser(description="Test PhaseLock on Physics-IQ")
    parser.add_argument(
        "--descriptions_path",
        type=str,
        required=True,
        help="Path to Physics-IQ descriptions.txt",
    )
    parser.add_argument(
        "--switch_frames_dir",
        type=str,
        required=True,
        help="Directory containing Physics-IQ switch-frame images",
    )
    parser.add_argument("--max_samples", type=int, default=2)
    parser.add_argument("--output_dir", type=str, default="test_outputs")
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--guidance_strength", type=float, default=0.05)
    args = parser.parse_args()
    
    set_seed(args.seed)
    os.makedirs(args.output_dir, exist_ok=True)
    
    data = load_physics_iq_data(args.descriptions_path, args.switch_frames_dir)
    samples = data[:args.max_samples]
    
    print(f"Testing PhaseLock on {len(samples)} Physics-IQ samples")
    print(f"Output directory: {args.output_dir}")
    print()
    
    print("Loading CogVideoX-5B-I2V...")
    pipe = PhaseLockPipeline.from_pretrained(
        "THUDM/CogVideoX-5B-I2V",
        CogVideoXImageToVideoPipeline,
        guidance_strength=args.guidance_strength,
        few_steps=2,
        full_steps=50,
        guide_start=0,
        guide_end=25,
    )
    print("Model loaded!\n")
    
    for i, sample in enumerate(samples):
        print(f"[{i+1}/{len(samples)}] {sample['image_name']}")
        print(f"  Prompt: {sample['prompt'][:80]}...")
        
        image = load_image(sample['image_path'])
        
        frames, few_frames = pipe(
            prompt=sample['prompt'],
            image=image,
            num_frames=49,
            guidance_scale=6.0,
            seed=args.seed,
            return_few_result=True,
        )
        
        output_name = sample['image_name'].replace('.jpg', '.mp4').replace('.png', '.mp4')
        output_path = os.path.join(args.output_dir, output_name)
        few_path = os.path.join(args.output_dir, f"few_{output_name}")
        
        export_to_video(frames, output_path, fps=8)
        export_to_video(few_frames, few_path, fps=8)
        
        print(f"  Saved: {output_path}")
        print(f"  Saved: {few_path}")
        print()
        
        torch.cuda.empty_cache()
        gc.collect()
    
    print("Test completed!")
    print(f"Results saved to: {args.output_dir}")


if __name__ == "__main__":
    main()
