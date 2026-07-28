"use client";

import { CinematicHero } from "@/components/hero/CinematicHero";
import { HomeAtmosphere } from "@/components/motion/HomeAtmosphere";
import { PostHeroExperience } from "@/components/home-experience/PostHeroExperience";

export default function Home() {
  return (
    <div className="relative text-[var(--color-bone)]">
      <HomeAtmosphere />
      <CinematicHero />
      <PostHeroExperience />
    </div>
  );
}
