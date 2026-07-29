# Performance Audit

Completed controls include:

- dynamic post-hero loading
- responsive image derivatives and focal metadata
- mobile H.264 video variants and posters
- WebM/MP4 sources where available
- offscreen and hidden-document pausing
- adaptive motion tiers
- one coordinated Lenis owner
- no GSAP overlap
- no custom cursor on touch/portal/reduced/low-power tiers
- reduced blur, particles, perspective, and pin duration on constrained devices
- server/client boundary isolation
- portal pagination/table-ready architecture
- public assets kept below the repository validator’s delivery limit
- no copied cross-platform `node_modules` in release ZIP

Run `npm run validate:performance` and a clean production build. Browser Lighthouse values must be measured against the deployed build rather than invented in a report, a surprisingly popular corporate sport.
