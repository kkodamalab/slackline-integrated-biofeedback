export const DISPLAY_HISTORY_LIMIT = 180;

export function appendBounded(history, sample, limit = DISPLAY_HISTORY_LIMIT) {
  history.push(sample);
  if (history.length > limit) history.splice(0, history.length - limit);
  return history;
}

export function cameraPhaseObservation(time, cameraAMeasurement) {
  return {
    time,
    left: cameraAMeasurement?.missing ? null : cameraAMeasurement?.leftWristY,
    right: cameraAMeasurement?.missing ? null : cameraAMeasurement?.rightWristY
  };
}

export function participantFeedbackVisible(when, recording, terminalResult) {
  if (when === 'none') return false;
  if (when === 'concurrent') return recording;
  return when === 'terminal' && !recording && terminalResult !== null;
}
