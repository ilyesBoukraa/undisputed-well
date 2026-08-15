/**
 * Pure point-sampling for the login page's topographic-contour background.
 * Separated from the rendering component so the wave math is unit-testable
 * without mounting anything, and so the "seamless loop" property (each
 * line's period evenly divides VIEWBOX_WIDTH, so x=0 and x=WIDTH sample the
 * same y) is a fact about data, not about a component snapshot.
 */

export const VIEWBOX_WIDTH = 1200;
export const VIEWBOX_HEIGHT = 420;

interface ContourLineConfig {
  /** Wave period in px — must evenly divide VIEWBOX_WIDTH for a seamless loop. */
  period: number;
  amplitude: number;
  baseY: number;
  phase: number;
  opacity: number;
}

// Track 1 — primary band: wider amplitude sweep, higher base opacity.
export const CONTOUR_TRACK_1: readonly ContourLineConfig[] = [
  { period: 600, amplitude: 26, baseY: 60, phase: 0.0, opacity: 0.85 },
  { period: 400, amplitude: 34, baseY: 110, phase: 1.1, opacity: 0.75 },
  { period: 300, amplitude: 20, baseY: 165, phase: 0.4, opacity: 0.65 },
  { period: 600, amplitude: 40, baseY: 215, phase: 2.3, opacity: 0.55 },
  { period: 400, amplitude: 24, baseY: 270, phase: 0.8, opacity: 0.7 },
  { period: 240, amplitude: 30, baseY: 320, phase: 1.7, opacity: 0.45 },
  { period: 300, amplitude: 18, baseY: 370, phase: 2.9, opacity: 0.35 },
];

// Track 2 — secondary band, drifts the opposite direction and sparser.
export const CONTOUR_TRACK_2: readonly ContourLineConfig[] = [
  { period: 400, amplitude: 22, baseY: 40, phase: 0.6, opacity: 0.55 },
  { period: 300, amplitude: 28, baseY: 100, phase: 2.0, opacity: 0.45 },
  { period: 600, amplitude: 18, baseY: 155, phase: 1.3, opacity: 0.6 },
  { period: 240, amplitude: 32, baseY: 210, phase: 0.2, opacity: 0.35 },
  { period: 400, amplitude: 20, baseY: 265, phase: 2.6, opacity: 0.5 },
  { period: 300, amplitude: 26, baseY: 330, phase: 1.0, opacity: 0.3 },
];

/** Samples one wavy line as an SVG `points` string for a `<polyline>`. */
export function samplePolylinePoints(config: ContourLineConfig, segments = 120): string {
  const points: string[] = [];
  for (let i = 0; i <= segments; i += 1) {
    const x = (VIEWBOX_WIDTH * i) / segments;
    const y = config.baseY + config.amplitude * Math.sin((2 * Math.PI * x) / config.period + config.phase);
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return points.join(" ");
}
