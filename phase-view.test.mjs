import assert from 'node:assert/strict';
import { phasePercent, phaseSegments, phaseStatus, targetBands } from './phase-view.mjs';

assert.equal(phasePercent(-180), 0);
assert.equal(phasePercent(0), 50);
assert.equal(phasePercent(90), 75);
assert.equal(phaseStatus({ valid: false, reason: '運動振幅が不足しています' }).value, '--');
assert.match(phaseStatus({ valid: false, reason: '運動振幅が不足しています' }).status, /算出不能/);
assert.deepEqual(phaseSegments([{ time: 0, value: 170 }, { time: 1, value: 179 }, { time: 2, value: -179 }, { time: 3, value: -160 }]).map(x => x.length), [2, 2]);
assert.deepEqual(phaseSegments([{ time: 0, value: 0 }, { time: 1, value: null }, { time: 2, value: 5 }]).map(x => x.length), [1, 1]);
assert.deepEqual(targetBands(180, 10), [[-180, -170], [170, 180]]);
console.log('phase view tests passed: gauge, invalid state, wrap splitting, target bands');
