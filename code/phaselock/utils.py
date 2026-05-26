"""Utility functions for PhaseLock."""

import random
from typing import List

import numpy as np
import torch
import torchvision.transforms.functional as TF
from PIL import Image


def set_seed(seed: int) -> None:
    """Set random seeds for reproducibility across all libraries."""
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)


def encode_video_to_latents(
    pipe,
    frames: List[Image.Image],
    device: torch.device,
) -> torch.Tensor:
    """
    Encode video frames to latent space using the VAE encoder.
    
    This function converts a sequence of PIL Images to latent representations
    that can be used as motion priors for PhaseLock guidance.
    
    Args:
        pipe: Diffusion pipeline with VAE encoder
        frames: List of PIL Images representing video frames
        device: Target device for computation
        
    Returns:
        Latent tensor of shape (T_latent, C, H_latent, W_latent)
    """
    frame_tensors = torch.stack([TF.to_tensor(f) for f in frames]).to(device)
    frame_tensors = 2.0 * frame_tensors - 1.0
    
    video_tensor = frame_tensors.permute(1, 0, 2, 3).unsqueeze(0)
    
    with torch.no_grad():
        latent_dist = pipe.vae.encode(video_tensor.to(pipe.vae.dtype))
        latents = latent_dist.latent_dist.sample()
        latents = latents * pipe.vae.config.scaling_factor
    
    latents = latents.squeeze(0).permute(1, 0, 2, 3)
    
    return latents


def compute_latent_statistics(latents: torch.Tensor) -> dict:
    """Compute statistics for latent tensors (useful for debugging)."""
    return {
        "shape": tuple(latents.shape),
        "mean": latents.mean().item(),
        "std": latents.std().item(),
        "min": latents.min().item(),
        "max": latents.max().item(),
    }
