/** Pixel transform shared by video presentation and every MediaPipe overlay. */
export function displayTransform(sourceWidth, sourceHeight, displayWidth, displayHeight, fit = 'contain') {
  if (![sourceWidth, sourceHeight, displayWidth, displayHeight].every(value => value > 0)) {
    return { scaleX: 0, scaleY: 0, offsetX: 0, offsetY: 0, drawnWidth: 0, drawnHeight: 0 };
  }
  if (fit === 'fill') return { scaleX: displayWidth / sourceWidth, scaleY: displayHeight / sourceHeight, offsetX: 0, offsetY: 0, drawnWidth: displayWidth, drawnHeight: displayHeight };
  const scale = fit === 'cover'
    ? Math.max(displayWidth / sourceWidth, displayHeight / sourceHeight)
    : Math.min(displayWidth / sourceWidth, displayHeight / sourceHeight);
  const drawnWidth = sourceWidth * scale, drawnHeight = sourceHeight * scale;
  return { scaleX: scale, scaleY: scale, offsetX: (displayWidth - drawnWidth) / 2, offsetY: (displayHeight - drawnHeight) / 2, drawnWidth, drawnHeight };
}

export function mapVideoPoint(point, sourceWidth, sourceHeight, displayWidth, displayHeight, fit = 'contain', mirror = false) {
  const transform = displayTransform(sourceWidth, sourceHeight, displayWidth, displayHeight, fit);
  const sourceX = (mirror ? 1 - point.x : point.x) * sourceWidth;
  return { x: transform.offsetX + sourceX * transform.scaleX, y: transform.offsetY + point.y * sourceHeight * transform.scaleY };
}

// Kept for callers from the original integration.
export const mapCover = (point, sw, sh, dw, dh, mirror = false) => mapVideoPoint(point, sw, sh, dw, dh, 'cover', mirror);

export function aspectRatioValue(value, customWidth = 16, customHeight = 9) {
  if (value === 'original') return null;
  if (value === 'custom') return customWidth > 0 && customHeight > 0 ? customWidth / customHeight : null;
  const [width, height] = String(value).split(':').map(Number);
  return width > 0 && height > 0 ? width / height : null;
}
