import { cn } from "@/lib/utils";

/**
 * Devotional imagery used across the app in place of generic symbols:
 *  - KrishnaImage: Lord Krishna playing the flute (transparent illustration)
 *  - PrabhupadaPortrait: Srila Prabhupada, the founder-acharya (circular photo)
 *  - PrabhupadaPhoto: the full seated photograph (framed)
 * Plain <img> keeps CSS sizing simple for these decorative brand assets.
 */

export function KrishnaImage({ className, priority }: { className?: string; priority?: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/devotional/krishna.png"
      alt="Lord Sri Krishna playing the flute"
      className={cn("select-none object-contain", className)}
      draggable={false}
      {...(priority ? { fetchPriority: "high" as const } : {})}
    />
  );
}

export function PrabhupadaPortrait({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/devotional/prabhupada-portrait.png"
      alt="His Divine Grace A.C. Bhaktivedanta Swami Prabhupada"
      className={cn("select-none rounded-full object-cover", className)}
      draggable={false}
    />
  );
}

export function PrabhupadaPhoto({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/devotional/prabhupada.jpg"
      alt="His Divine Grace A.C. Bhaktivedanta Swami Prabhupada"
      className={cn("select-none object-cover", className)}
      draggable={false}
    />
  );
}
