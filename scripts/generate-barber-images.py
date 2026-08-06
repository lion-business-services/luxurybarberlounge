#!/usr/bin/env python3
"""Generate authentic responsive barber derivatives from the preserved originals.

No generative enhancement is used. Processing is limited to EXIF orientation,
4:5 focal cropping, Lanczos resizing, and a subtle unsharp mask after resize.
"""
from __future__ import annotations

import json
import shutil
from pathlib import Path
from PIL import Image, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public" / "media" / "barbers"
SOURCE = PUBLIC / "originals"
ARCHIVE = ROOT / "media-src" / "barbers" / "originals"

FOCAL = {
    "ruben-diaz-jr": (0.50, 0.24),
    "angelica-aquino": (0.50, 0.20),
    "hommy-rivera": (0.50, 0.24),
    "barber-los": (0.50, 0.18),
    "jose": (0.50, 0.18),
    "elvis": (0.50, 0.16),
    "alfredo-hernandez-pollo": (0.50, 0.18),
    "russ-hawkins": (0.50, 0.20),
    "daniel-penalo": (0.50, 0.16),
}

OUTPUTS = {
    "cards": (720, 900),
    "mobile": (540, 675),
    "booking": (640, 800),
    "tablet": (960, 1200),
    "profiles": (1200, 1500),
    "desktop": (1200, 1500),
}

FORMATS = {
    "webp": {"format": "WEBP", "quality": 90, "method": 6},
    "avif": {"format": "AVIF", "quality": 82, "speed": 6},
    "jpg": {"format": "JPEG", "quality": 91, "optimize": True, "progressive": True},
}


def render(source: Image.Image, size: tuple[int, int], focal: tuple[float, float]) -> Image.Image:
    image = ImageOps.fit(source, size, method=Image.Resampling.LANCZOS, centering=focal)
    return image.filter(ImageFilter.UnsharpMask(radius=0.6, percent=45, threshold=4))


def main() -> None:
    ARCHIVE.mkdir(parents=True, exist_ok=True)
    manifest: dict[str, object] = {
        "version": "2026-08-06-ruben-release",
        "method": "authentic-source focal crop, Lanczos resize, subtle sharpening; no generative enhancement",
        "aspectRatio": "4:5",
        "outputs": OUTPUTS,
        "barbers": [],
    }
    framing: dict[str, object] = {
        "version": "2026-08-06-ruben-release",
        "method": "EXIF orientation, authentic-source 4:5 focal crop, Lanczos resize, subtle sharpening",
        "faceChangesAllowed": False,
        "outputs": {
            name: {"width": size[0], "height": size[1], "formats": list(FORMATS)}
            for name, size in OUTPUTS.items()
        },
        "portraits": [],
    }

    for source_path in sorted(SOURCE.glob("*.jpeg")):
        slug = source_path.stem
        if slug not in FOCAL:
            continue
        shutil.copy2(source_path, ARCHIVE / source_path.name)
        with Image.open(source_path) as opened:
            source = ImageOps.exif_transpose(opened).convert("RGB")
            entry = {
                "slug": slug,
                "source": str(source_path.relative_to(ROOT)),
                "sourceWidth": source.width,
                "sourceHeight": source.height,
                "focalPoint": {"x": FOCAL[slug][0], "y": FOCAL[slug][1]},
                "derivatives": {},
            }
            framing_entry = {
                "slug": slug,
                "source": str(source_path.relative_to(ROOT)),
                "sourceWidth": source.width,
                "sourceHeight": source.height,
                "safeFocalPoint": {"x": FOCAL[slug][0], "y": FOCAL[slug][1]},
                "objectPosition": {
                    "card": f"{FOCAL[slug][0] * 100:.0f}% {FOCAL[slug][1] * 100:.0f}%",
                    "mobile": f"{FOCAL[slug][0] * 100:.0f}% {FOCAL[slug][1] * 100:.0f}%",
                    "booking": f"{FOCAL[slug][0] * 100:.0f}% {FOCAL[slug][1] * 100:.0f}%",
                    "profile": f"{FOCAL[slug][0] * 100:.0f}% {FOCAL[slug][1] * 100:.0f}%",
                    "desktop": f"{FOCAL[slug][0] * 100:.0f}% {FOCAL[slug][1] * 100:.0f}%",
                },
            }
            for group, size in OUTPUTS.items():
                target_dir = PUBLIC / group
                target_dir.mkdir(parents=True, exist_ok=True)
                image = render(source, size, FOCAL[slug])
                group_files: dict[str, str] = {}
                for extension, options in FORMATS.items():
                    target = target_dir / f"{slug}.{extension}"
                    image.save(target, **options)
                    group_files[extension] = str(target.relative_to(ROOT))
                entry["derivatives"][group] = {
                    "width": size[0],
                    "height": size[1],
                    "files": group_files,
                }
            manifest["barbers"].append(entry)
            framing["portraits"].append(framing_entry)

    manifest_path = ROOT / "media-src" / "barbers" / "responsive-image-manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    framing_path = ROOT / "media-src" / "barbers" / "portrait-framing.json"
    framing_path.write_text(json.dumps(framing, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Generated derivatives for {len(manifest['barbers'])} barbers")


if __name__ == "__main__":
    main()
