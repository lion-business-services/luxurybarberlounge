# Barber Image Framing

Every barber retains the supplied portrait. Renamed derivatives are stored under:

- `public/media/barbers/originals`
- `public/media/barbers/cards`
- `public/media/barbers/mobile`
- `public/media/barbers/profiles`
- `media-src/barbers/uploaded-square`

The typed `image.objectPosition` configuration in `src/lib/content/site.ts` defines separate focal positions for card, profile, mobile, and booking contexts. Public cards use a consistent 4:5 media ratio, fixed card geometry, fixed content regions, clamped biographies/specialties, and a fixed CTA row so portrait or copy differences do not alter card height.

Allowed processing is limited to non-destructive crop positioning, compression, responsive derivatives, and subtle technical image normalization. Faces, skin tone, tattoos, jewelry, hair, clothing, and expressions are not altered. Original JPEG files remain packaged separately from WebP and AVIF derivatives.

The reproducible framing manifest is `media-src/barbers/portrait-framing.json`. The normalized working images are retained in `media-src/barbers/normalized`. The active set targets a 175-pixel face height and a 130-pixel eye line on a 512-pixel normalized source canvas before responsive derivatives are produced. These measurements standardize presentation without synthesizing or retouching facial features.
