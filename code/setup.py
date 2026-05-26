from setuptools import setup, find_packages

setup(
    name="phaselock",
    version="0.1.0",
    description="PhaseLock: Locking Motion Priors Before Visual Refinement Erases Them",
    long_description=open("README.md").read(),
    long_description_content_type="text/markdown",
    author="Anonymous",
    license="Apache-2.0",
    packages=find_packages(),
    python_requires=">=3.8",
    install_requires=[
        "torch>=2.0.0",
        "diffusers>=0.25.0",
        "transformers>=4.35.0",
        "accelerate>=0.25.0",
        "torchvision>=0.15.0",
        "pillow>=9.0.0",
        "numpy>=1.21.0",
    ],
    extras_require={
        "dev": [
            "pytest",
            "black",
            "isort",
        ],
    },
    classifiers=[
        "Development Status :: 3 - Alpha",
        "Intended Audience :: Science/Research",
        "License :: OSI Approved :: Apache Software License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Topic :: Scientific/Engineering :: Artificial Intelligence",
    ],
)
