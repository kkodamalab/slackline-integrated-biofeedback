import assert from 'node:assert/strict'; import { circularMeanDegrees, relativePhase } from './phase.mjs';
const signal=(phase=0,amp=.08,missing=false)=>Array.from({length:180},(_,i)=>{const time=i*33+(i%7)*2;return {time,left:.5+amp*Math.sin(time/1000*2*Math.PI*.8),right:missing&&i%2?null:.5+amp*Math.sin(time/1000*2*Math.PI*.8+phase)}});
for(const deg of [0,90,180]){const result=relativePhase(signal(deg*Math.PI/180));assert(result.valid);assert(Math.abs(Math.abs(result.value)-deg)<12,`${deg}: ${result.value}`)}
assert.equal(relativePhase(signal(0,.001)).valid,false); assert.equal(relativePhase(signal(0,.08,true)).valid,false); assert.equal(relativePhase(signal().slice(0,12)).valid,false);
const acrossBoundary=circularMeanDegrees([179,-179]);assert(acrossBoundary.valid);assert(Math.abs(Math.abs(acrossBoundary.value)-180)<1e-9);
const unstable=circularMeanDegrees([0,90,180,-90]);assert.equal(unstable.valid,false);assert.match(unstable.reason,/不安定/);
console.log('phase tests passed: signal validation, circular boundary mean, unstable direction');
