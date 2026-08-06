# Barber Image Framing

Every barber retains the supplied portrait. Source and generated assets are stored under:

- `public/media/barbers/originals`
- `public/media/barbers/cards`
- `public/media/barbers/mobile`
- `public/media/barbers/booking`
- `public/media/barbers/tablet`
- `public/media/barbers/profiles`
- `public/media/barbers/desktop`
- `media-src/barbers/originals`

The typed `image.objectPosition` configuration in `src/lib/content/site.ts` defines separate focal positions for card, profile, mobile, and booking contexts. Public cards use a consistent 4:5 media ratio, fixed card geometry, fixed content regions, clamped biographies and specialties, and a fixed CTA row so image or copy differences do not alter card height.

Allowed processing is limited to EXIF orientation correction, focal cropping, conservative high-quality scaling, compression, and subtle sharpening. Faces, skin tone, tattoos, jewelry, hair, clothing, and expressions are not altered. Original JPEG files remain packaged separately from AVIF, WebP, and JPEG responsive derivatives.

The reproducible focal manifest is `media-src/barbers/portrait-framing.json`. The complete generated output inventory is `media-src/barbers/responsive-image-manifest.json`. The generator is `scripts/generate-barber-images.py`.
