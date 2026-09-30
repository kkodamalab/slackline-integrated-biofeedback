import { wrapDegrees } from './phase.mjs';

export const phasePercent = value => (wrapDegrees(value) + 180) / 360 * 100;

export function phaseStatus(result) {
  if (result?.valid && Number.isFinite(result.value)) {
    return { value: `${result.value.toFixed(1)}°`, status: '算出中' };
  }
  return { value: '--', status: result?.reason ? `算出不能：${result.reason}` : '算出待ち' };
}

/** Split wrapped phase traces so a +/-180 degree crossing is never joined. */
export function phaseSegments(samples) {
  const segments = [];
  let current = [];
  for (const sample of samples) {
    const valid = Number.isFinite(sample?.time) && Number.isFinite(sample?.value);
    if (!valid || (current.length && Math.abs(sample.value - current.at(-1).value) > 180)) {
      if (current.length) segments.push(current);
      current = [];
    }
    if (valid) current.push(sample);
  }
  if (current.length) segments.push(current);
  return segments;
}

export function targetBands(target, tolerance) {
  const points = Array.from({ length: 361 }, (_, i) => i - 180)
    .filter(value => Math.abs(wrapDegrees(value - target)) <= tolerance);
  if (!points.length) return [];
  const bands = [];
  let start = points[0], previous = points[0];
  for (const value of points.slice(1)) {
    if (value !== previous + 1) { bands.push([start, previous]); start = value; }
    previous = value;
  }
  bands.push([start, previous]);
  return bands;
}
