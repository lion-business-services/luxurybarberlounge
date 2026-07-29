# Source media (not served)

Original production masters are kept outside `public/` so browsers and the CDN cannot request unnecessarily large source files.

- `home/video/lounge-entry-source.mp4`: original threshold film. Delivery encodes remain in `public/media/home/video/lounge-entry.{mp4,webm}` with a WebP poster.
- `brand/logo-uploaded-2026.png`: original owner-supplied logo master.
- `brand/logo-official-transparent.png`: full transparent PNG master.
- `brand/lbl-logo-full.png`: full-resolution logo layer retained for future export work. The live CSS mask uses the optimized WebP derivative.

Do not reference files in this directory from runtime code. Create a responsive derivative under `public/` first.
