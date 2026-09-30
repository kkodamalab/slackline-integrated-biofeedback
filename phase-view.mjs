const finite = value => Number.isFinite(value);

/** Keep the relative-phase indicator present even while an estimate is unavailable. */
export function renderPhaseGauge({ valueElement, needleElement, phase }) {
  const value = phase?.valid && finite(phase.value) ? phase.value : null;
  valueElement.textContent = value == null ? '—' : `${value.toFixed(1)}°`;
  valueElement.closest('[role="meter"]')?.setAttribute('aria-valuenow', value == null ? '0' : String(value));
  if (needleElement) {
    needleElement.style.transform = `rotate(${value ?? 0}deg)`;
    needleElement.hidden = value == null;
  }
}

/** Draw the bounded display history, not the trial/export sample collection. */
export function drawPhaseChart(canvas, rows, pixelRatio = globalThis.devicePixelRatio || 1) {
  const width = Math.max(1, canvas.clientWidth * pixelRatio);
  const height = Math.max(1, canvas.clientHeight * pixelRatio);
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, width, height);
  if (rows.length < 2) return;

  const drawLine = (key, color, min, max) => {
    context.strokeStyle = color;
    context.lineWidth = 2 * pixelRatio;
    context.beginPath();
    let started = false;
    rows.forEach((row, index) => {
      const value = row[key];
      if (!finite(value)) { started = false; return; }
      const x = index / (rows.length - 1) * width;
      const y = (1 - (value - min) / (max - min)) * height;
      if (started) context.lineTo(x, y); else context.moveTo(x, y);
      started = true;
    });
    context.stroke();
  };

  drawLine('leftWristY', '#b8ff32', 0, 1);
  drawLine('rightWristY', '#59d6c7', 0, 1);
  drawLine('relativePhase', '#f3c969', -180, 180);
}
