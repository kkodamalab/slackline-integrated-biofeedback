/** State whose bounded live history is deliberately independent from trial data. */
export function createTrialState({ historyLimit = 180, sampleLimit = 20000 } = {}) {
  if (!Number.isInteger(historyLimit) || historyLimit < 1) throw new RangeError('historyLimit must be a positive integer');
  if (!Number.isInteger(sampleLimit) || sampleLimit < 1) throw new RangeError('sampleLimit must be a positive integer');
  return { recording: false, phaseHistory: [], samples: [], trialStarted: null, historyLimit, sampleLimit };
}

function appendBounded(list, value, limit) {
  list.push(value);
  if (list.length > limit) list.splice(0, list.length - limit);
  return value;
}

/** Add a sample used only by the continuously updating on-screen plot. */
export function appendPhaseHistory(state, sample) {
  return appendBounded(state.phaseHistory, sample, state.historyLimit);
}

/** Add an export sample only while a trial is being recorded. */
export function appendTrialSample(state, sample) {
  if (!state.recording) return false;
  appendBounded(state.samples, sample, state.sampleLimit);
  return true;
}

export function beginTrial(state, startedAt) {
  state.samples.length = 0;
  state.recording = true;
  state.trialStarted = startedAt;
}

export function endTrial(state) {
  state.recording = false;
}

export function resetTrialState(state) {
  state.recording = false;
  state.samples.length = 0;
  state.phaseHistory.length = 0;
  state.trialStarted = null;
}
