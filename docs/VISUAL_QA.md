# Visual Barber-Card QA

The eight active barber portraits were verified as a single mapped set after identity correction. The labeled contact sheet is stored at `docs/qa/barber-portrait-contact-sheet.webp`.

## Verified presentation rules

- Card derivatives are exactly 720 x 900 pixels.
- Mobile derivatives are exactly 540 x 720 pixels.
- Profile WebP and AVIF derivatives are exactly 1200 x 1500 pixels.
- All active public cards use the same 4:5 portrait area and fixed card/content geometry.
- The normalized working canvas is 512 x 512 pixels with a target face height of 175 pixels and target eye line of 130 pixels.
- Each portrait keeps its original person-to-file mapping.
- No face, expression, skin tone, tattoos, jewelry, hairstyle, or clothing was generated or altered.
- Dark-background extension, responsive cropping, and compression were used only to create consistent framing.

## Identity order shown in the contact sheet

1. Angelica Aquino
2. Hommy Rivera
3. Barber Lo's
4. Jose
5. Elvis
6. Alfredo Hernandez (Pollo)
7. Russ Hawkins
8. Daniel Penalo

Browser-level screenshot comparison at every requested viewport still requires a dependency-complete local or Vercel Preview build. The packaged source includes the fixed geometry, focal metadata, responsive assets, and automated content checks needed for that final rendered pass.
