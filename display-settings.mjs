export const DEFAULT_DISPLAY = Object.freeze({ aspect: 'original', fit: 'contain', customWidth: 16, customHeight: 9 });
export const DEFAULT_OVERLAY = Object.freeze({ skeletonColor: '#59d6c7', skeletonWidth: 3, jointColor: '#ffffff', jointSize: 3, axisColor: '#f3c969' });

export function synchronizeDisplays(display, applyToBoth) {
  const A = { ...DEFAULT_DISPLAY, ...display.A };
  return { A, B: applyToBoth ? { ...A } : { ...DEFAULT_DISPLAY, ...display.B } };
}

export function participantPresentation(settings) {
  return { display: { ...DEFAULT_DISPLAY, ...settings.display?.A }, overlayStyle: { ...DEFAULT_OVERLAY, ...settings.overlayStyle } };
}
