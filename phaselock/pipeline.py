"""
PhaseLock Pipeline: High-level interface for video generation with motion prior guidance.

This module provides a clean wrapper around diffusion pipelines that implements
the two-stage PhaseLock framework:
    Stage 1: Motion Prior Extraction (K_few steps, typically 2)
    Stage 2: Guided Full Generation (K_full steps with Latent Delta Guidance)
"""

from typing import List, Optional, Tuple, Union
import gc

import torch
from PIL import Image

from .guidance import LatentDeltaGuidance, extract_motion_prior
from .utils import encode_video_to_latents


class PhaseLockPipeline:
    """
    Wrapper that adds PhaseLock capabilities to any video diffusion pipeline.
    
    PhaseLock operates by:
    1. Running few-step inference (2 steps) to capture motion priors
    2. Encoding the result to extract latent deltas
    3. Re-running full inference with guidance toward the motion prior
    
    This decouples physical consistency from visual refinement.
    """
    
    def __init__(
        self,
        pipe,
        few_steps: int = 2,
        full_steps: int = 50,
        guidance_strength: float = 0.05,
        guide_start: int = 0,
        guide_end: Optional[int] = None,
    ):
        """
        Initialize PhaseLock wrapper around a video diffusion pipeline.
        
        Args:
            pipe: Base diffusion pipeline (e.g., CogVideoXImageToVideoPipeline)
            few_steps: Number of steps for motion prior extraction (default: 2)
            full_steps: Number of steps for full generation (default: 50)
            guidance_strength: Initial guidance strength lambda_0 (default: 0.05)
            guide_start: Step to start guidance (default: 0)
            guide_end: Step to end guidance (default: full_steps // 2)
        """
        self.pipe = pipe
        self.few_steps = few_steps
        self.full_steps = full_steps
        self.guidance_strength = guidance_strength
        self.guide_start = guide_start
        self.guide_end = guide_end if guide_end is not None else full_steps // 2
        
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    
    def __call__(
        self,
        prompt: str,
        image: Optional[Image.Image] = None,
        num_frames: int = 49,
        guidance_scale: float = 6.0,
        seed: int = 42,
        return_few_result: bool = False,
    ) -> Union[List[Image.Image], Tuple[List[Image.Image], List[Image.Image]]]:
        """
        Generate video with PhaseLock motion guidance.
        
        Args:
            prompt: Text description of the video to generate
            image: Optional conditioning image (for I2V models)
            num_frames: Number of frames to generate
            guidance_scale: Classifier-free guidance scale
            seed: Random seed for reproducibility
            return_few_result: If True, also return the few-step inference result
            
        Returns:
            Generated video frames, optionally with few-step result if return_few_result=True
        """
        generator = torch.Generator(device=self.device).manual_seed(seed)
        
        few_kwargs = self._build_pipeline_kwargs(
            prompt=prompt,
            image=image,
            num_frames=num_frames,
            num_inference_steps=self.few_steps,
            guidance_scale=guidance_scale,
            generator=generator,
        )
        few_result = self.pipe(**few_kwargs).frames[0]
        
        few_latents = encode_video_to_latents(self.pipe, few_result, self.device)
        motion_prior = extract_motion_prior(few_latents)
        
        guidance_callback = LatentDeltaGuidance(
            motion_prior=motion_prior,
            guidance_strength=self.guidance_strength,
            guide_start=self.guide_start,
            guide_end=self.guide_end,
            total_steps=self.full_steps,
        )
        
        generator = torch.Generator(device=self.device).manual_seed(seed)
        
        full_kwargs = self._build_pipeline_kwargs(
            prompt=prompt,
            image=image,
            num_frames=num_frames,
            num_inference_steps=self.full_steps,
            guidance_scale=guidance_scale,
            generator=generator,
            callback_on_step_end=guidance_callback,
            callback_on_step_end_tensor_inputs=["latents"],
        )
        final_result = self.pipe(**full_kwargs).frames[0]
        
        del few_latents, motion_prior
        torch.cuda.empty_cache()
        gc.collect()
        
        if return_few_result:
            return final_result, few_result
        return final_result
    
    def _build_pipeline_kwargs(self, **kwargs) -> dict:
        """Build kwargs dict, filtering out None values."""
        return {k: v for k, v in kwargs.items() if v is not None}
    
    @classmethod
    def from_pretrained(
        cls,
        model_id: str,
        pipeline_class,
        torch_dtype: torch.dtype = torch.bfloat16,
        **phaselock_kwargs,
    ) -> "PhaseLockPipeline":
        """
        Load a diffusion pipeline and wrap it with PhaseLock.
        
        Args:
            model_id: HuggingFace model ID or local path
            pipeline_class: The diffusers pipeline class to use
            torch_dtype: Data type for model weights
            **phaselock_kwargs: Arguments passed to PhaseLockPipeline.__init__
            
        Returns:
            PhaseLockPipeline instance with loaded model
        """
        pipe = pipeline_class.from_pretrained(model_id, torch_dtype=torch_dtype)
        pipe.enable_model_cpu_offload()
        
        if hasattr(pipe, "vae"):
            pipe.vae.enable_slicing()
            pipe.vae.enable_tiling()
        
        return cls(pipe, **phaselock_kwargs)
