# Barber Image Mapping

This internal record maps the owner-supplied `Barbers Photos(1).zip` archive to the centralized temporary profile records. Only Rubén Diaz, Jr. is verified by name. The other public-facing names are polished temporary identifiers and must be replaced after owner confirmation. The website intentionally does not label them as placeholders.

| Uploaded file | Current profile slug | Current display name | Verification status |
| --- | --- | --- | --- |
| `1.png` | `ruben-diaz-jr` | Rubén Diaz, Jr. | Owner identity verified |
| `2.png` | `adrian-cole` | Adrian Cole | Temporary identity, owner approval required |
| `3.png` | `amaya-reyes` | Amaya Reyes | Temporary identity, owner approval required |
| `4.png` | `andre-silva` | Andre Silva | Temporary identity, owner approval required |
| `5.png` | `marcus-bennett` | Marcus Bennett | Temporary identity, owner approval required |
| `6.png` | `nico-santos` | Nico Santos | Temporary identity, owner approval required |
| `7.png` | `elias-moreno` | Elias Moreno | Temporary identity, owner approval required |
| `8.png` | `julian-vega` | Julian Vega | Temporary identity, owner approval required |
| `9.png` | `mateo-cruz` | Mateo Cruz | Temporary identity, owner approval required |

## Source preservation

- The exact uploaded 512×512 PNG files are stored under `media-src/barbers/uploaded-square/`.
- Higher-resolution owner-supplied source photographs already present in the approved project remain under `public/media/barbers/originals/` because the release regression suite protects them.
- Delivery derivatives are under `public/media/barbers/cards/`, `profiles/`, and `mobile/`.
- Per-breakpoint focal positions live in `src/lib/content/site.ts`.

Do not change a face, skin tone, tattoo, jewelry item, expression, clothing, or body shape. Only non-destructive exposure, crop, format, and focal-position work is permitted.
