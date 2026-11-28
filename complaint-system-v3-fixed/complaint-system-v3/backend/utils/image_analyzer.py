"""AI-Generated Image Analyzer using EXIF & PNG metadata inspection via Pillow."""

from __future__ import annotations

import os
import re
from pathlib import Path
from typing import Any

from PIL import ExifTags, Image

AI_SIGNATURES = [
    "comfyui",
    "stable diffusion",
    "dall-e",
    "dall·e",
    "midjourney",
    "adobe firefly",
    "bing image creator",
    "novelai",
    "automatic1111",
    "invoke ai",
    "invokeai",
    "dreamstudio",
    "leonardo.ai",
    "lexica",
    "craiyon",
    "deep dream",
    "nightcafe",
    "artbreeder",
    "stability ai",
]


def analyze_image(file_path: str | Path) -> dict[str, Any]:
    """Analyze an image file for AI-generation indicators via EXIF/metadata."""
    try:
        path_str = str(file_path)
        if not re.search(r"\.(jpg|jpeg|png|gif|webp|tiff?)$", path_str, re.IGNORECASE):
            return {"isAiGenerated": False, "reason": "Not an image file"}

        if not os.path.exists(path_str):
            return {"isAiGenerated": False, "reason": "File not found"}

        with Image.open(path_str) as img:
            width, height = img.size
            metadata_values: list[str] = []

            # Inspect PNG/info metadata chunks (e.g., Stable Diffusion parameters, Software)
            for key, val in (img.info or {}).items():
                key_lower = str(key).lower()
                val_str = str(val)
                if key_lower in ("parameters", "prompt", "workflow"):
                    val_lower = val_str.lower()
                    if (
                        "steps:" in val_lower
                        or "sampler:" in val_lower
                        or "cfg scale:" in val_lower
                        or key_lower in ("prompt", "workflow")
                    ):
                        return {
                            "isAiGenerated": True,
                            "reason": "EXIF contains Stable Diffusion generation parameters",
                        }
                metadata_values.append(val_str.lower())

            # Inspect EXIF tags
            exif_dict: dict[str, Any] = {}
            try:
                raw_exif = img.getexif()
                if raw_exif:
                    for tag_id, value in raw_exif.items():
                        tag_name = ExifTags.TAGS.get(tag_id, str(tag_id))
                        exif_dict[str(tag_name)] = value
            except Exception:
                exif_dict = {}

            for field in (
                "Software",
                "Artist",
                "ImageDescription",
                "UserComment",
                "XPComment",
                "XPSubject",
                "Copyright",
            ):
                if field in exif_dict and exif_dict[field]:
                    metadata_values.append(str(exif_dict[field]).lower())

            # Also check XMP packet if embedded in info
            if "xmp" in img.info:
                metadata_values.append(str(img.info["xmp"]).lower())

            for value in metadata_values:
                for signature in AI_SIGNATURES:
                    if signature in value:
                        return {
                            "isAiGenerated": True,
                            "reason": f'EXIF metadata contains AI tool signature: "{signature}"',
                        }

            # Heuristic: high-resolution (>4MP) image with EXIF present but zero camera fields
            megapixels = (width * height) / 1_000_000
            has_camera = any(
                exif_dict.get(k)
                for k in (
                    "Make",
                    "Model",
                    "LensModel",
                    "FocalLength",
                    "ExposureTime",
                    "FNumber",
                    "ISOSpeedRatings",
                )
            )
            if exif_dict and megapixels > 4 and not has_camera:
                return {
                    "isAiGenerated": True,
                    "reason": f"High resolution image ({megapixels:.1f}MP) with no camera EXIF data",
                }

        return {"isAiGenerated": False, "reason": "No AI indicators detected"}
    except Exception as exc:
        print(f"Image analysis error: {exc}")
        return {"isAiGenerated": False, "reason": "Analysis error — treating as authentic"}
