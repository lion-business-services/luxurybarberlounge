/**
 * Hero asset registry.
 *
 * `present: false` entries are optional slots. The hero renders correctly
 * without them — nothing broken, no placeholder boxes. Drop a matching file at
 * the documented path and flip the flag to bring the layer in.
 */

export type HeroAsset = {
  src: string;
  /** Set true only once the file actually exists in /public. */
  present: boolean;
  width: number;
  height: number;
  alt: string;
};

/** Logo depth planes, derived from the official transparent crest. */
export const crestLayers = {
  ring: "/brand/layers/ring.png",
  crest: "/brand/layers/crest.png",
  crown: "/brand/layers/crownplate.png",
  flourish: "/brand/layers/flourish.png",
  lounge: "/brand/layers/lounge.png",
} as const;

export const CREST_ASPECT = 1100 / 1108;

/** Room photography, supplied by the shop. */
export const roomAssets = {
  chair: {
    src: "/hero/lounge-chair.webp",
    present: true,
    width: 1376,
    height: 768,
    alt: "",
  } satisfies HeroAsset,
  wall: {
    src: "/hero/lounge-wall.webp",
    present: true,
    width: 2000,
    height: 1116,
    alt: "",
  } satisfies HeroAsset,
<<<<<<< HEAD
  tools: {
    src: "/hero/craft-tools.webp",
    present: true,
    width: 1800,
    height: 1005,
    alt: "",
  } satisfies HeroAsset,
  mirror: {
    src: "/hero/mirror-station.webp",
    present: true,
    width: 1800,
    height: 1005,
    alt: "",
  } satisfies HeroAsset,
  advance: {
    src: "/hero/scene-advance.webp",
    present: true,
    width: 1800,
    height: 1005,
    alt: "",
  } satisfies HeroAsset,
};

/**
 * Ambient reveal loop for scene 1. Desktop-only, muted, poster-backed;
 * the component pauses it offscreen and never mounts it on touch or
 * reduced-motion. 536 KB h264, 7.25 s seamless loop.
 */
export const revealVideo = {
  src: "/hero/crest-reveal.mp4",
  poster: "/hero/crest-reveal-poster.webp",
} as const;

/**
=======
};

/**
>>>>>>> 512ce6a1fef0d79792bb3b6f9743a21f3b8d49f4
 * Optional transparent tool cut-outs. None exist yet.
 * To enable: add the file, set `present: true`. Nothing else needs to change.
 */
export const toolAssets: HeroAsset[] = [
  { src: "/hero/scissors.webp", present: false, width: 600, height: 600, alt: "" },
  { src: "/hero/clippers.webp", present: false, width: 600, height: 600, alt: "" },
  { src: "/hero/razor.webp", present: false, width: 600, height: 600, alt: "" },
  { src: "/hero/comb.webp", present: false, width: 600, height: 600, alt: "" },
  { src: "/hero/brush.webp", present: false, width: 600, height: 600, alt: "" },
];

export const availableTools = toolAssets.filter((t) => t.present);
