import dynamic from "next/dynamic";
import { CinematicHero } from "@/components/hero/CinematicHero";
import { HomeAtmosphere } from "@/components/motion/HomeAtmosphere";

const PostHeroExperience = dynamic(
  () => import("@/components/home-experience/PostHeroExperience"),
  {
    loading: () => (
      <section
        aria-label="Luxury Barber Lounge experience"
        className="relative min-h-[70svh] overflow-hidden border-t border-[var(--color-brass)]/10 bg-[var(--color-ink)] px-6 py-24 sm:px-10 lg:px-16"
      >
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_70%_25%,rgba(193,143,44,0.12),transparent_38%)]" />
        <div className="relative mx-auto flex min-h-[48svh] max-w-6xl items-end">
          <div className="max-w-2xl">
            <p className="mb-5 text-[11px] font-semibold tracking-[0.34em] text-[var(--color-brass)] uppercase">
              Step Into Distinction
            </p>
            <h2 className="font-display text-4xl leading-[0.98] text-[var(--color-bone)] sm:text-6xl">
              An elevated grooming experience, crafted for distinction.
            </h2>
          </div>
        </div>
      </section>
    ),
  },
);

export default function Home() {
  return (
    <div className="relative text-[var(--color-bone)]">
      <HomeAtmosphere />
      <CinematicHero />
      <PostHeroExperience />
    </div>
  );
}
