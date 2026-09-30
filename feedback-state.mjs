export const VISUALIZATIONS = ['numeric', 'skeleton', 'waveform', 'gauge', 'target'];

export function normalizeHow(value) {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  return VISUALIZATIONS.filter(item => values.includes(item));
}

export function gaugePercent(value) {
  if (!Number.isFinite(value)) return null;
  return (Math.max(-180, Math.min(180, value)) + 180) / 360 * 100;
}

export function participantState(settings, recording, terminalResult, phase, history = [], cameraImage = null) {
  const terminal = settings.when === 'terminal' && !recording && terminalResult !== null;
  const concurrent = settings.when === 'concurrent' && recording;
  const value = terminal ? terminalResult : phase?.valid ? phase.value : null;
  return {
    type: 'feedback-state', visible: concurrent || terminal, recording, when: settings.when,
    what: settings.what, amount: settings.amount, how: normalizeHow(settings.how),
    target: settings.target, tolerance: settings.tolerance, cameraImageEnabled: settings.cameraImageEnabled,
    value: Number.isFinite(value) ? value : null, history: history.slice(-180), cameraImage
  };
}
