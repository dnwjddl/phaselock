from typing import Dict, Any, Optional
import torch


class LatentDeltaGuidance:
    """
    Applies Latent Delta Guidance to transfer motion priors from few-step inference
    to high-fidelity generation.
    
    The guidance works by computing the difference between:
    - few_delta: Frame differences from 2-step few-step inference (motion prior)
    - current_delta: Frame differences from current denoising trajectory
    
    The residual is injected into subsequent frames to align their temporal
    evolution with the physically consistent motion prior.
    
    Args:
        motion_prior: Pre-computed motion prior tensor of shape (T-1, C, H, W)
                     representing frame-to-frame latent deltas from few-step inference
        guidance_strength: Initial guidance strength lambda_0 (default: 0.05)
        guide_start: Denoising step to start guidance (default: 0)
        guide_end: Denoising step to end guidance (default: K_full/2)
        total_steps: Total number of denoising steps (default: 50)
    """
    
    def __init__(
        self,
        motion_prior: torch.Tensor,
        guidance_strength: float = 0.05,
        guide_start: int = 0,
        guide_end: int = 25,
        total_steps: int = 50,
    ):
        self.motion_prior = motion_prior
        self.guidance_strength = guidance_strength
        self.guide_start = guide_start
        self.guide_end = guide_end
        self.total_steps = total_steps
        
        self._validate_inputs()
    
    def _validate_inputs(self):
        if self.guide_end <= self.guide_start:
            raise ValueError(
                f"guide_end ({self.guide_end}) must be greater than "
                f"guide_start ({self.guide_start})"
            )
        if self.guidance_strength < 0:
            raise ValueError(
                f"guidance_strength must be non-negative, got {self.guidance_strength}"
            )
    
    def compute_schedule(self, step_index: int) -> float:
        """
        Compute guidance strength at current step using linear decay schedule.
        
        The schedule ensures strong adherence to motion prior during early steps
        (when global layout is forming) and gradually relaxes to allow texture
        refinement in later steps.
        
        Args:
            step_index: Current denoising step (0-indexed)
            
        Returns:
            Current guidance strength (0 if outside guidance interval)
        """
        if step_index < self.guide_start or step_index >= self.guide_end:
            return 0.0
        
        progress = (step_index - self.guide_start) / (self.guide_end - self.guide_start)
        return self.guidance_strength * (1.0 - progress)
    
    def __call__(
        self,
        pipe,
        step_index: int,
        timestep: torch.Tensor,
        callback_kwargs: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Apply guidance at each denoising step.
        
        This method is called by the diffusers pipeline at each step via
        callback_on_step_end mechanism.
        
        Args:
            pipe: The diffusion pipeline (unused but required by callback signature)
            step_index: Current denoising step
            timestep: Current timestep tensor
            callback_kwargs: Dictionary containing 'latents' tensor
            
        Returns:
            Updated callback_kwargs with guided latents
        """
        current_strength = self.compute_schedule(step_index)
        if current_strength == 0.0:
            return callback_kwargs
        
        latents = callback_kwargs.get("latents")
        if latents is None:
            return callback_kwargs
        
        guided_latents = self._apply_guidance(latents, current_strength)
        callback_kwargs["latents"] = guided_latents
        
        return callback_kwargs
    
    def _apply_guidance(
        self, 
        latents: torch.Tensor, 
        strength: float
    ) -> torch.Tensor:
        """
        Apply latent delta guidance to current latents.
        
        Algorithm:
            1. Compute current motion: M = z[2:F] - z[1:F-1]
            2. Compute guidance signal: G = M_prior - M
            3. Update subsequent frames: z[2:F] += lambda * G
            (First frame is anchor and remains unmodified)
        
        Args:
            latents: Current latent tensor of shape (B, T, C, H, W)
            strength: Current guidance strength
            
        Returns:
            Guided latent tensor
        """
        B, T, C, H, W = latents.shape
        
        current_motion = latents[:, 1:] - latents[:, :-1]
        
        motion_prior = self.motion_prior.to(latents.device, latents.dtype)
        motion_prior = motion_prior.unsqueeze(0).expand(B, -1, -1, -1, -1)
        
        guidance_signal = motion_prior - current_motion
        
        guided_latents = latents.clone()
        guided_latents[:, 1:] = latents[:, 1:] + strength * guidance_signal
        
        return guided_latents


def extract_motion_prior(few_latents: torch.Tensor) -> torch.Tensor:
    """
    Extract motion prior from few-step inference latents using the Latent Delta Operator.
    
    The Latent Delta Operator T(z) captures local temporal dynamics while being
    invariant to time-independent features (e.g., static background):
        T(z) = z[2:F] - z[1:F-1]
    
    Args:
        few_latents: Latent sequence from few-step inference, shape (T, C, H, W)
        
    Returns:
        Motion prior tensor of shape (T-1, C, H, W)
    """
    return few_latents[1:] - few_latents[:-1]
