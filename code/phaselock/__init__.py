# Copyright 2025 PhaseLock Authors
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""
PhaseLock: Physics in 2-Steps - Locking Motion Priors Before Visual Refinement Erases Them

A training-free framework that locks motion dynamics to few-step inference priors for 
physically consistent video generation.
"""

from .guidance import LatentDeltaGuidance
from .pipeline import PhaseLockPipeline
from .utils import encode_video_to_latents, set_seed

__version__ = "0.1.0"
__all__ = [
    "LatentDeltaGuidance",
    "PhaseLockPipeline", 
    "encode_video_to_latents",
    "set_seed",
]
