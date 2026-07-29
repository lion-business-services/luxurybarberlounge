import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { join } from "node:path";

const root = process.cwd();

const requiredMedia = [
  "public/media/home/video/lounge-entry.mp4",
  "public/media/home/video/lounge-entry.webm",
  "public/media/home/video/lounge-entry-poster.webp",
  "public/media/home/video/lounge-entry-mobile.mp4",
  "public/media/home/video/lounge-entry-mobile-poster.webp",
  "public/hero/crest-reveal-mobile.mp4",
  "public/hero/crest-reveal-mobile-poster.webp",
  "public/media/home/interiors/lounge-gold.webp",
  "public/media/home/interiors/lounge-editorial.webp",
  "public/media/home/interiors/stations-round.webp",
  "public/media/home/interiors/stations-arched.webp",
  "public/media/home/tools/tools-tray.webp",
  "public/media/home/tools/tools-stand.webp",
  "public/media/home/tools/tools-pair.webp",
  "public/media/home/tools/tools-ornate.webp",
];

const barberSlugs = [
  "ruben-diaz-jr",
  "amaya-reyes",
  "adrian-cole",
  "mateo-cruz",
  "julian-vega",
  "elias-moreno",
  "nico-santos",
  "marcus-bennett",
  "andre-silva",
];

const protectedHeroHashes: Record<string, string> = {
  "src/components/hero/CinematicHero.tsx": "a83153477108ca6d3819b39ac689cfd368d037330112c48c6ea36d6684ccd779",
  "src/components/hero/assets.ts": "6905195b46ea458ec4686a7bbedb3a802f8841c190aba12b21b1e1af560c2ddc",
  "public/hero/craft-tools.webp": "2b9de178442d005c7affad270a3d55d02c7a19530a945d1a1f8d4054c6d3ee5f",
  "public/hero/crest-reveal-poster.webp": "c813fa9bca13b2c494c8b078b890ecb541d721b9789baf27c3a9c4057691e71e",
  "public/hero/crest-reveal.mp4": "1aad46d2c2cf2a398ae3d8e73712e3ff14e5ce60e9b88e76d6ced62deff023b2",
  "public/hero/lounge-chair.webp": "bdcd3c4fa17596a687a945a8543243a4db3857a8eb545a9ad52abf820d1e60f8",
  "public/hero/lounge-wall.webp": "f1ece0b311ffecc80e4836950050a693a8caaae4693187d86b7c1349cf1d411d",
  "public/hero/mirror-station.webp": "e7da008fac403917ba8737777b3c3334022c291f74f9f329d4836b1ff5b4802d",
  "public/hero/scene-advance.webp": "ef48dffc5669819e13bacbb75195c1bfec2e2c242e51d3b47183e701c2d196d9",
};

function sha256(relative: string) {
  return createHash("sha256").update(readFileSync(join(root, relative))).digest("hex");
}

test("post-hero cinematic media is packaged", () => {
  for (const relative of requiredMedia) {
    assert.equal(existsSync(join(root, relative)), true, `Missing ${relative}`);
  }
});

test("all nine barber portrait sets are packaged", () => {
  for (const slug of barberSlugs) {
    for (const relative of [
      `public/media/barbers/originals/${slug}.jpeg`,
      `public/media/barbers/cards/${slug}.webp`,
      `public/media/barbers/profiles/${slug}.webp`,
      `public/media/barbers/profiles/${slug}.avif`,
      `public/media/barbers/mobile/${slug}.webp`,
    ]) {
      assert.equal(existsSync(join(root, relative)), true, `Missing ${relative}`);
    }
  }
});

test("homepage preserves the approved hero before the new experience", () => {
  const source = readFileSync(join(root, "src/app/page.tsx"), "utf8");
  const hero = source.indexOf("<CinematicHero />");
  const postHero = source.indexOf("<PostHeroExperience />");
  assert.ok(hero >= 0, "CinematicHero must remain on the homepage");
  assert.ok(postHero > hero, "PostHeroExperience must begin after CinematicHero");
});

test("protected hero files remain byte-for-byte unchanged", () => {
  for (const [relative, expected] of Object.entries(protectedHeroHashes)) {
    assert.equal(sha256(relative), expected, `${relative} changed unexpectedly`);
  }
});

test("removed homepage sections and the old dead lounge interval are absent", () => {
  const postHero = readFileSync(join(root, "src/components/home-experience/PostHeroExperience.tsx"), "utf8");
  const copy = readFileSync(join(root, "src/components/home-experience/homeExperienceData.ts"), "utf8");
  const css = readFileSync(join(root, "src/components/home-experience/home-experience.module.css"), "utf8");
  const combined = `${postHero}\n${copy}`;
  for (const phrase of [
    "Start with the result. We shape the ritual.",
    "The Room and the Craft",
    "Trust is earned in the chair.",
    "BrandSignature",
    "function Confidence",
  ]) {
    assert.equal(combined.includes(phrase), false, `Removed content remains: ${phrase}`);
  }
  assert.equal(css.includes("min-height:300svh"), false, "Obsolete 300svh lounge spacer remains");
  assert.equal(postHero.includes("Make the chair yours."), false, "Final heading must remain centralized in data");
  assert.equal(copy.includes("Make the chair yours."), true, "New final conversion heading is missing");
});


test("homepage order prioritizes the real team and exactly one service showcase", () => {
  const source = readFileSync(join(root, "src/components/home-experience/PostHeroExperience.tsx"), "utf8");
  const barbers = source.indexOf("<BarberProfiles");
  const threshold = source.indexOf("<ThresholdScene");
  const services = source.indexOf("<SignatureServices");
  assert.ok(barbers >= 0 && barbers < threshold, "Real Barber team must lead the post-hero experience");
  assert.ok(threshold < services, "Brand threshold must precede the service row");
  assert.equal((source.match(/<SignatureServices/g) ?? []).length, 1, "Homepage must contain one service row");
});

test("mobile hero and concierge collision safeguards are present", () => {
  const hero = readFileSync(join(root, "src/components/hero/CinematicHero.tsx"), "utf8");
  const concierge = readFileSync(join(root, "src/components/public/ConciergeWidget.tsx"), "utf8");
  const css = readFileSync(join(root, "src/app/globals.css"), "utf8");
  assert.match(hero, /crest-reveal-mobile\.mp4/);
  assert.match(hero, /100svh|155svh/);
  assert.match(concierge, /scroll/);
  assert.match(css, /safe-area-inset-bottom/);
});
