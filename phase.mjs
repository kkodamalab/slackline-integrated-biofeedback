const TAU = Math.PI * 2;
export const wrapDegrees = value => ((value + 180) % 360 + 360) % 360 - 180;

/** Calculate a direction without treating the -180/180 boundary as a discontinuity. */
export function circularMeanDegrees(values, options = {}) {
  const clean = values.filter(Number.isFinite);
  if (!clean.length) return { valid: false, reason: '有効な相対位相がありません', resultantLength: 0 };
  const sin = clean.reduce((sum, value) => sum + Math.sin(value * Math.PI / 180), 0);
  const cos = clean.reduce((sum, value) => sum + Math.cos(value * Math.PI / 180), 0);
  const resultantLength = Math.hypot(sin, cos) / clean.length;
  const minResultantLength = options.minResultantLength ?? 0.1;
  if (resultantLength < minResultantLength) return { valid: false, reason: '平均方向が不安定です', resultantLength };
  return { valid: true, value: wrapDegrees(Math.atan2(sin, cos) * 180 / Math.PI), resultantLength };
}

function interpolate(samples, start, step, count) {
  let j = 0;
  return Array.from({ length: count }, (_, i) => {
    const t = start + i * step;
    while (j + 1 < samples.length && samples[j + 1].time < t) j++;
    const a = samples[j], b = samples[Math.min(j + 1, samples.length - 1)];
    if (!a || !b || t < a.time || t > b.time || b.time === a.time) return a?.value ?? null;
    return a.value + (b.value - a.value) * (t - a.time) / (b.time - a.time);
  });
}

function analyticPhase(values) {
  const n = values.length;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const x = values.map(v => v - mean);
  const spectrum = Array.from({ length: n }, (_, k) => {
    let re = 0, im = 0;
    for (let j = 0; j < n; j++) { const q = -TAU * k * j / n; re += x[j] * Math.cos(q); im += x[j] * Math.sin(q); }
    const gain = k === 0 || (n % 2 === 0 && k === n / 2) ? 1 : k < n / 2 ? 2 : 0;
    return { re: re * gain / n, im: im * gain / n };
  });
  return x.map((_, j) => {
    let re = 0, im = 0;
    for (let k = 0; k < n; k++) { const q = TAU * k * j / n; re += spectrum[k].re * Math.cos(q) - spectrum[k].im * Math.sin(q); im += spectrum[k].re * Math.sin(q) + spectrum[k].im * Math.cos(q); }
    return Math.atan2(im, re);
  });
}

/** Resample irregular, monotonic observations before a discrete Hilbert transform. */
export function relativePhase(observations, options = {}) {
  const minSamples = options.minSamples ?? 32, minAmplitude = options.minAmplitude ?? 0.015;
  const clean = observations.filter(x => Number.isFinite(x.time) && Number.isFinite(x.left) && Number.isFinite(x.right)).sort((a, b) => a.time - b.time);
  if (clean.length < minSamples || clean.length / Math.max(1, observations.length) < 0.7) return { valid: false, reason: clean.length < minSamples ? '解析窓が短すぎます' : '欠損が多すぎます' };
  const intervals = clean.slice(1).map((x, i) => x.time - clean[i].time).filter(x => x > 0).sort((a, b) => a - b);
  const step = intervals[Math.floor(intervals.length / 2)];
  if (!step) return { valid: false, reason: '時刻情報が不正です' };
  const count = Math.min(256, Math.floor((clean.at(-1).time - clean[0].time) / step) + 1);
  if (count < minSamples) return { valid: false, reason: '解析窓が短すぎます' };
  const start = clean.at(-1).time - step * (count - 1);
  const left = interpolate(clean.map(x => ({ time: x.time, value: x.left })), start, step, count);
  const right = interpolate(clean.map(x => ({ time: x.time, value: x.right })), start, step, count);
  const amplitude = values => Math.sqrt(values.reduce((s, x) => s + (x - values.reduce((a,b)=>a+b,0)/values.length) ** 2, 0) / values.length);
  if (amplitude(left) < minAmplitude || amplitude(right) < minAmplitude) return { valid: false, reason: '運動振幅が不足しています' };
  const lp = analyticPhase(left), rp = analyticPhase(right);
  const degrees = lp.map((x, i) => wrapDegrees((x - rp[i]) * 180 / Math.PI));
  // The FFT Hilbert estimate wraps at both window edges. Use a short circular
  // mean just inside the newest edge while retaining the full series for plots.
  const stable = degrees.slice(Math.max(0, count - 30), Math.max(1, count - 8));
  const value = Math.atan2(stable.reduce((s,x)=>s+Math.sin(x*Math.PI/180),0),stable.reduce((s,x)=>s+Math.cos(x*Math.PI/180),0))*180/Math.PI;
  return { valid: true, value, degrees, left, right, times: left.map((_, i) => start + i * step), sampleInterval: step };
}
