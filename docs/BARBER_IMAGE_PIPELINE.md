# Barber Image Pipeline

## Purpose

Every barber, including Rubén Diaz, Jr., is delivered through one repeatable responsive-image system while preserving the authentic photograph and approved composition.

## Source preservation

Original photographs are stored in `public/media/barbers/originals/` and copied to `media-src/barbers/originals/`. The generation script never overwrites the source image.

## Generator

Run:

```bash
python3 scripts/generate-barber-images.py
```

The script uses EXIF-aware orientation, a focal 4:5 crop, high-quality Lanczos resizing, and conservative sharpening. It does not generate faces, change skin tone, remove tattoos or jewelry, alter clothing, fabricate detail, or apply beauty filtering.

## Outputs

For every barber slug, the pipeline creates AVIF, WebP, and JPEG derivatives:

| Context | Dimensions |
|---|---:|
| Card | 720 × 900 |
| Mobile | 540 × 675 |
| Booking | 640 × 800 |
| Tablet | 960 × 1200 |
| Profile | 1200 × 1500 |
| Desktop | 1200 × 1500 |

The complete machine-readable output list is `media-src/barbers/responsive-image-manifest.json`. Focal positions are centralized in `media-src/barbers/portrait-framing.json` and mirrored in `src/lib/content/site.ts`.

## Resolution limits

The generator never invents facial detail. Where a source is smaller than an ideal retina target, it uses conservative scaling and preserves the authentic image. Ruben's supplied portrait is 1067 × 1600, sufficient for the 1200 × 1500 profile derivative with only modest scaling on one axis after crop.
