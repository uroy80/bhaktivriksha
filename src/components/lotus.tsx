import { cn } from "@/lib/utils";

/**
 * The temple's lotus brand assets:
 *  - LotusLogo: the digital-painting lotus, used as the app mark/logo.
 *  - LotusHero: the hand-drawn lotus-on-a-lily-pad, a decorative illustration.
 * Plain <img> keeps CSS sizing trivial for these small/decorative brand assets.
 */

export function LotusLogo({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/lotus/mark.png"
      alt="Sadhana Companion"
      className={cn("select-none object-contain", className)}
      draggable={false}
    />
  );
}

export function LotusHero({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/lotus/hero.png"
      alt=""
      aria-hidden
      className={cn("pointer-events-none select-none object-contain", className)}
      draggable={false}
    />
  );
}
