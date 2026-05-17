/**
 * TrueAudioVisualizer
 *
 * Uses CSS keyframe animations on `scaleY` (GPU-composited transform) instead
 * of Framer Motion animating a `height` array.  This eliminates JS-driven
 * per-frame recalculations that caused stutter in the Electron/Chromium shell.
 *
 * `will-change: transform` is set via Tailwind's `will-change-transform`
 * utility so the browser promotes each bar to its own compositor layer.
 */

const BAR_COUNT = 8;

// Relative scale targets for each bar (range 0.15 – 1.0).
// Two keyframe stops (from → to) create a smooth "breathing" oscillation.
const BAR_PROFILES: Array<[number, number]> = [
  [0.25, 0.95],
  [0.35, 0.70],
  [0.20, 0.90],
  [0.45, 1.00],
  [0.25, 0.65],
  [0.20, 0.50],
  [0.15, 0.40],
  [0.10, 0.30],
];

// Duration base + per-bar offset keeps bars visually out of sync.
const BASE_DURATION_MS = 850;
const DURATION_STEP_MS = 70;

interface AudioVisualizerProps {
  color?: string;      // Tailwind bg class, e.g. "bg-green-500"
  maxHeight?: number;  // px height of the container
  compact?: boolean;   // vertically centred layout
}

export function TrueAudioVisualizer({
  color = 'bg-green-500',
  maxHeight = 16,
  compact = false,
}: AudioVisualizerProps) {
  return (
    <div
      className={`flex gap-0.5 ${compact ? 'items-center' : 'items-end'}`}
      style={{ height: maxHeight }}
    >
      {BAR_PROFILES.map(([minScale, maxScale], i) => {
        const duration = BASE_DURATION_MS + i * DURATION_STEP_MS;
        // The bar's natural (un-scaled) height is the max extent in pixels.
        const naturalHeight = Math.round(maxScale * maxHeight);
        // Scale at rest = minScale / maxScale so that scaleY(1) == naturalHeight.
        const scaleAtRest = minScale / maxScale;

        return (
          <div
            key={i}
            className={`w-0.5 rounded-full origin-bottom will-change-transform ${color}`}
            style={{
              height: naturalHeight,
              animation: `notchx-bar ${duration}ms ease-in-out infinite alternate`,
              '--scale-from': scaleAtRest,
              '--scale-to': 1,
            } as React.CSSProperties}
          />
        );
      })}
    </div>
  );
}
