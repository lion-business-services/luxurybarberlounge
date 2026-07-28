import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { join } from "node:path";

const root = process.cwd();

const requiredMedia = [
  "public/media/home/video/lounge-entry.mp4",
  "public/media/home/video/lounge-entry.webm",
  "public/media/home/video/lounge-entry-poster.webp",
  "public/media/home/interiors/lounge-gold.webp",
  "public/media/home/interiors/lounge-editorial.webp",
  "public/media/home/interiors/stations-round.webp",
  "public/media/home/interiors/stations-arched.webp",
  "public/media/home/tools/tools-tray.webp",
  "public/media/home/tools/tools-stand.webp",
  "public/media/home/tools/tools-pair.webp",
  "public/media/home/tools/tools-ornate.webp",
  "public/media/home/brand/brand-cards.webp",
  "public/media/home/atmosphere/lounge-decanter.webp",
];

test("post-hero cinematic media is packaged", () => {
  for (const relative of requiredMedia) {
    assert.equal(existsSync(join(root, relative)), true, `Missing ${relative}`);
  }
});

test("homepage preserves the approved hero before the new experience", () => {
  const source = readFileSync(join(root, "src/app/page.tsx"), "utf8");
  const hero = source.indexOf("<CinematicHero />");
  const postHero = source.indexOf("<PostHeroExperience />");
  assert.ok(hero >= 0, "CinematicHero must remain on the homepage");
  assert.ok(postHero > hero, "PostHeroExperience must begin after CinematicHero");
});
