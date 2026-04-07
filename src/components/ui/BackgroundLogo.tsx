/**
 * BackgroundLogo.tsx  ← NEW FILE
 * src/components/ui/BackgroundLogo.tsx
 *
 * The Puzzlecraft "Pc" monogram rendered as a subtle orange watermark.
 * Place inside any page/section container with position:relative.
 *
 * Usage:
 *   import BackgroundLogo from "@/components/ui/BackgroundLogo";
 *
 *   // Right-side watermark (most common):
 *   <div className="relative overflow-hidden">
 *     <BackgroundLogo position="right" />
 *     ...page content...
 *   </div>
 *
 *   // Centered hero watermark:
 *   <div className="relative overflow-hidden">
 *     <BackgroundLogo position="center" size={320} />
 *     ...page content...
 *   </div>
 */

import { cn } from "@/lib/utils";

interface BackgroundLogoProps {
  /** Position within the parent container */
  position?: "right" | "left" | "center" | "bottom-right";
  /** Size in pixels (height = width). Default 280 */
  size?: number;
  /** Tailwind opacity class. Default opacity-[0.045] — very subtle */
  opacityClass?: string;
  className?: string;
}

/**
 * The "Pc" monogram as a clean SVG — recreated from the app icon.
 * Orange (#F97316) fill for the background watermark use case.
 * No black background (transparent) so it composites correctly on any surface.
 */
function PcMonogram({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      {/*
        P letterform: thick strokes, rounded corners.
        Matches the app icon proportions.
      */}
      {/* P vertical stem */}
      <rect x="14" y="14" width="18" height="72" rx="9" fill="#F97316" />
      {/* P bowl (top arc) */}
      <rect x="14" y="14" width="56" height="18" rx="9" fill="#F97316" />
      {/* P bowl (right side) */}
      <rect x="52" y="14" width="18" height="40" rx="9" fill="#F97316" />
      {/* P bowl (bottom connector) */}
      <rect x="14" y="44" width="56" height="18" rx="9" fill="#F97316" />

      {/*
        C letterform: inside the P bowl counter.
        Smaller, centered in the P's negative space.
      */}
      {/* C outer arc — made by subtracting a smaller circle */}
      <circle cx="52" cy="34" r="13" fill="#F97316" />
      {/* C inner cutout (the hole) */}
      <circle cx="52" cy="34" r="7" fill="transparent" />
      {/* C gap (the opening, right side) */}
      <rect x="57" y="27" width="12" height="14" fill="transparent" rx="0" />
    </svg>
  );
}

/**
 * Cleaner SVG approach: path-based Pc monogram
 * that matches the icon more precisely.
 */
function PcLogo({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      {/*
        P shape with rounded corners — approximating the app icon
        The P fills left ~60% of the space
      */}
      <path
        d="
          M 30 170
          L 30 30
          Q 30 20 40 20
          L 110 20
          Q 155 20 155 70
          Q 155 120 110 120
          L 65 120
          L 65 170
          Q 65 180 55 180
          L 40 180
          Q 30 180 30 170
          Z
        "
        fill="#F97316"
      />
      {/* P bowl interior cutout — creates the counter */}
      <path
        d="
          M 65 48
          L 105 48
          Q 122 48 122 70
          Q 122 92 105 92
          L 65 92
          Z
        "
        fill="transparent"
      />
      {/*
        C letterform — sits inside the P bowl counter
        Smaller rounded C shape
      */}
      <path
        d="
          M 118 62
          Q 110 40 87 40
          Q 64 40 64 67
          Q 64 94 87 94
          Q 110 94 118 72
          L 104 72
          Q 99 82 87 82
          Q 77 82 77 67
          Q 77 52 87 52
          Q 99 52 104 62
          Z
        "
        fill="#F97316"
      />
    </svg>
  );
}

export default function BackgroundLogo({
  position = "right",
  size = 280,
  opacityClass = "opacity-[0.045]",
  className,
}: BackgroundLogoProps) {
  const positionClasses = {
    right:         "absolute -right-16 top-1/2 -translate-y-1/2 pointer-events-none select-none",
    left:          "absolute -left-16 top-1/2 -translate-y-1/2 pointer-events-none select-none",
    center:        "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none",
    "bottom-right": "absolute -bottom-16 -right-16 pointer-events-none select-none",
  };

  return (
    <div
      className={cn(positionClasses[position], opacityClass, className)}
      aria-hidden
    >
      <PcLogo size={size} />
    </div>
  );
}
