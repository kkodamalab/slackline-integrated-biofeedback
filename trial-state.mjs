export const DISPLAY_HISTORY_LIMIT = 180;
export const TRIAL_SAMPLE_LIMIT = 20000;

export function appendBounded(rows, row, limit) {
  rows.push(row);
  if (rows.length > limit) rows.splice(0, rows.length - limit);
}

export function appendDisplaySample(state, sample) {
  appendBounded(state.displayHistory, sample, DISPLAY_HISTORY_LIMIT);
}

export function appendTrialSample(state, sample) {
  appendBounded(state.samples, sample, TRIAL_SAMPLE_LIMIT);
}

/** Reset exported trial data without interrupting or erasing the live monitor. */
export function resetTrialData(state) {
  state.recording = false;
  state.samples.length = 0;
  state.trialStarted = null;
}
