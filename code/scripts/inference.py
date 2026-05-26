#!/usr/bin/env python
"""
PhaseLock Inference Script

Generate physically consistent videos using PhaseLock's Latent Delta Guidance.

Usage:
    python scripts/inference.py \
        --prompt "A ball rolling down a slope" \
        --image path/to/image.jpg \
        --output output.mp4

    # Text-to-Video (T2V) mode:
    python scripts/inference.py \
        --prompt "A pendulum swinging back and forth" \
        --output pendulum.mp4 \
        --mode t2v
"""

import argparse
import sys
from pathlib import Path

import torch
from diffusers import CogVideoXImageToVideoPipeline, CogVideoXPipeline
from diffusers.utils import export_to_video, load_image

sys.path.insert(0, str(Path(__file__).parent.parent))
from phaselock import PhaseLockPipeline, set_seed


SUPPORTED_MODELS = {
    "cogvideox-5b-i2v": ("THUDM/CogVideoX-5B-I2V", CogVideoXImageToVideoPipeline),
    "cogvideox-5b": ("THUDM/CogVideoX-5B", CogVideoXPipeline),
}


def parse_args():
    parser = argparse.ArgumentParser(
        description="Generate videos with PhaseLock motion guidance",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    
    parser.add_argument(
        "--prompt", 
        type=str, 
        required=True,
        help="Text description of the video to generate"
    )
    parser.add_argument(
        "--image", 
        type=str, 
        default=None,
        help="Path to conditioning image (for I2V mode)"
    )
    parser.add_argument(
        "--output", 
        type=str, 
        default="output.mp4",
        help="Output video path"
    )
    
    parser.add_argument(
        "--model", 
        type=str, 
        default="cogvideox-5b-i2v",
        choices=list(SUPPORTED_MODELS.keys()),
        help="Model to use for generation"
    )
    parser.add_argument(
        "--mode",
        type=str,
        default="i2v",
        choices=["i2v", "t2v"],
        help="Generation mode: i2v (image-to-video) or t2v (text-to-video)"
    )
    
    parser.add_argument("--num_frames", type=int, default=49)
    parser.add_argument("--guidance_scale", type=float, default=6.0)
    parser.add_argument("--fps", type=int, default=8)
    parser.add_argument("--seed", type=int, default=42)
    
    parser.add_argument(
        "--few_steps", 
        type=int, 
        default=2,
        help="Number of few-step inference steps for motion prior extraction"
    )
    parser.add_argument(
        "--full_steps", 
        type=int, 
        default=50,
        help="Number of full inference steps"
    )
    parser.add_argument(
        "--guidance_strength",
        type=float,
        default=0.05,
        help="Motion guidance strength (lambda_0)"
    )
    parser.add_argument(
        "--guide_start",
        type=int,
        default=0,
        help="Step to start motion guidance"
    )
    parser.add_argument(
        "--guide_end",
        type=int,
        default=None,
        help="Step to end motion guidance (default: full_steps // 2)"
    )
    
    parser.add_argument(
        "--save_few",
        action="store_true",
        help="Also save the few-step inference result"
    )
    parser.add_argument(
        "--no_phaselock",
        action="store_true",
        help="Disable PhaseLock (run baseline)"
    )
    
    return parser.parse_args()


def main():
    args = parse_args()
    set_seed(args.seed)
    
    if args.mode == "i2v" and args.image is None:
        print("Error: --image is required for I2V mode")
        sys.exit(1)
    
    model_key = args.model if args.mode == "i2v" else "cogvideox-5b"
    model_id, pipeline_class = SUPPORTED_MODELS[model_key]
    
    print(f"Loading model: {model_id}")
    
    if args.no_phaselock:
        pipe = pipeline_class.from_pretrained(model_id, torch_dtype=torch.bfloat16)
        pipe.enable_model_cpu_offload()
        pipe.vae.enable_slicing()
        pipe.vae.enable_tiling()
        
        generator = torch.Generator(device="cuda").manual_seed(args.seed)
        kwargs = {
            "prompt": args.prompt,
            "num_frames": args.num_frames,
            "num_inference_steps": args.full_steps,
            "guidance_scale": args.guidance_scale,
            "generator": generator,
        }
        if args.image:
            kwargs["image"] = load_image(args.image)
        
        print("Running baseline inference (PhaseLock disabled)...")
        result = pipe(**kwargs).frames[0]
    else:
        guide_end = args.guide_end if args.guide_end else args.full_steps // 2
        
        phaselock_pipe = PhaseLockPipeline.from_pretrained(
            model_id,
            pipeline_class,
            few_steps=args.few_steps,
            full_steps=args.full_steps,
            guidance_strength=args.guidance_strength,
            guide_start=args.guide_start,
            guide_end=guide_end,
        )
        
        image = load_image(args.image) if args.image else None
        
        print(f"Running PhaseLock inference...")
        print(f"  Few steps: {args.few_steps}")
        print(f"  Full steps: {args.full_steps}")
        print(f"  Guidance strength: {args.guidance_strength}")
        print(f"  Guide interval: [{args.guide_start}, {guide_end})")
        
        output = phaselock_pipe(
            prompt=args.prompt,
            image=image,
            num_frames=args.num_frames,
            guidance_scale=args.guidance_scale,
            seed=args.seed,
            return_few_result=args.save_few,
        )
        
        if args.save_few:
            result, few_result = output
            few_path = args.output.replace(".mp4", "_few.mp4")
            export_to_video(few_result, few_path, fps=args.fps)
            print(f"Saved few-step result: {few_path}")
        else:
            result = output
    
    export_to_video(result, args.output, fps=args.fps)
    print(f"Saved: {args.output}")


if __name__ == "__main__":
    main()
