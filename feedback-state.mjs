import { targetInside } from './target-feedback.mjs';
export const VISUALIZATIONS = ['numeric', 'skeleton', 'trajectory', 'waveform', 'gauge', 'target'];

export function normalizeHow(value) {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  return VISUALIZATIONS.filter(item => values.includes(item));
}

export function visualizationVisibility(settings) {
  const how=normalizeHow(settings?.how);
  return {camera:!!settings?.cameraImageEnabled,skeleton:how.includes('skeleton'),waveform:how.includes('waveform'),gauge:how.includes('gauge'),target:how.includes('target'),numeric:how.includes('numeric')};
}

export function gaugePercent(value, min=-180, max=180) {
  if (!Number.isFinite(value)) return null;
  return Math.max(0,Math.min(100,(value-min)/(max-min)*100));
}

export function participantState(settings, recording, terminalResult, targetFeedback, history = [], cameraImage = null) {
  const terminal = settings.when === 'terminal' && !recording && terminalResult !== null;
  const concurrent = settings.when === 'concurrent' && recording;
  const value = terminal ? terminalResult : targetFeedback?.value;
  return {
    type: 'feedback-state', visible: concurrent || terminal, recording, when: settings.when,
    what: settings.what, amount: settings.amount, how: normalizeHow(settings.how),
    target: settings.target, tolerance: settings.tolerance, targetVariable:settings.targetVariable,
    targetLabel:targetFeedback?.label,unit:targetFeedback?.unit||'',range:{min:targetFeedback?.min??-180,max:targetFeedback?.max??180},inside:terminal?targetInside(settings.targetVariable,terminalResult,settings.target,settings.tolerance):targetFeedback?.inside,
    cameraImageEnabled: settings.cameraImageEnabled, display: settings.display, overlayStyle: settings.overlayStyle,
    value: Number.isFinite(value) ? value : null, history: history.slice(-180), cameraImage
  };
}
