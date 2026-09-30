import assert from 'node:assert/strict';
import { transformSeries, mixedUnits } from './graph-settings.mjs';
assert.deepEqual(transformSeries([2,3,null,5],'relative','window'),[0,1,null,3]);
assert.deepEqual(transformSeries([2,3],'relative','trial',1),[1,2]);
assert.deepEqual(transformSeries([4,4,4],'zscore'),[null,null,null]);
const z=transformSeries([1,2,3],'zscore'); assert.ok(Math.abs(z[1])<1e-12); assert.ok(Math.abs(z[0]+z[2])<1e-12);
assert.equal(mixedUnits(['leftWristY','rightWristY']),false); assert.equal(mixedUnits(['leftWristY','leftKnee']),true);
console.log('graph settings tests passed: absolute, relative, trial baseline, z-score and units');
