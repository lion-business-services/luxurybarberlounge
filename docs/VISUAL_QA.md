# Visual Barber-Card QA

The nine active barber portraits are maintained as one mapped set after Ruben integration and identity correction. The labeled contact sheet is stored at `docs/qa/barber-portrait-contact-sheet-ruben.webp`.

## Verified asset rules

- Card derivatives are exactly 720 × 900 pixels.
- Mobile derivatives are exactly 540 × 675 pixels.
- Booking derivatives are exactly 640 × 800 pixels.
- Tablet derivatives are exactly 960 × 1200 pixels.
- Profile and desktop derivatives are exactly 1200 × 1500 pixels.
- AVIF, WebP, and JPEG versions exist for every responsive context.
- All public cards use the same 4:5 portrait area and fixed card/content geometry.
- Each portrait keeps its correct person-to-file mapping.
- No face, expression, skin tone, tattoo, jewelry, hairstyle, uniform, or clothing was generated or changed.
- Focal cropping, conservative scaling, compression, and subtle sharpening are the only image-processing operations.

## Identity order shown in the contact sheet

1. Rubén Diaz, Jr.
2. Angelica Aquino
3. Hommy Rivera
4. Barber Lo's
5. Jose
6. Elvis
7. Alfredo Hernandez (Pollo)
8. Russ Hawkins
9. Daniel Penalo

Browser-level comparison at every requested viewport requires a dependency-complete local or Vercel Preview build. The packaged source includes fixed geometry, focal metadata, responsive assets, and automated file/dimension validation for that rendered pass.
