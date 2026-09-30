import assert from 'node:assert/strict';
import { appendDisplaySample, appendTrialSample, DISPLAY_HISTORY_LIMIT, resetTrialData, TRIAL_SAMPLE_LIMIT } from './trial-state.mjs';

const state = { recording: true, samples: [], displayHistory: [{ relativePhase: 42 }], phaseWindow: [{ time: 1 }] };
for (let i = 0; i < DISPLAY_HISTORY_LIMIT + 12; i++) appendDisplaySample(state, { id: i });
assert.equal(state.displayHistory.length, DISPLAY_HISTORY_LIMIT);
assert.equal(state.displayHistory[0].id, 12);
for (let i = 0; i < TRIAL_SAMPLE_LIMIT + 2; i++) appendTrialSample(state, { id: i });
assert.equal(state.samples.length, TRIAL_SAMPLE_LIMIT);
resetTrialData(state);
assert.equal(state.recording, false);
assert.deepEqual(state.samples, []);
assert.equal(state.displayHistory.length, DISPLAY_HISTORY_LIMIT, 'reset keeps the live display history');
assert.deepEqual(state.phaseWindow, [{ time: 1 }], 'reset keeps the phase analysis window');
console.log('trial state tests passed: bounded histories and non-destructive trial reset');
