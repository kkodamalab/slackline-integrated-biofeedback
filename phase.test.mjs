import assert from 'node:assert/strict'; import { circularMeanDegrees, lowPass, relativePhase } from './phase.mjs';
const signal=(phase=0,amp=.08,missing=false)=>Array.from({length:180},(_,i)=>{const time=i*33+(i%7)*2;return {time,left:.5+amp*Math.sin(time/1000*2*Math.PI*.8),right:missing&&i%2?null:.5+amp*Math.sin(time/1000*2*Math.PI*.8+phase)}});
for(const deg of [0,90,180]){const result=relativePhase(signal(deg*Math.PI/180));assert(result.valid);assert(Math.abs(Math.abs(result.value)-deg)<12,`${deg}: ${result.value}`)}
assert.equal(relativePhase(signal(0,.001)).valid,false); assert.equal(relativePhase(signal(0,.08,true)).valid,false); assert.equal(relativePhase(signal().slice(0,12)).valid,false);
console.log('phase tests passed: irregular 0/90/180, low amplitude, missing, short window');

assert(Math.abs(Math.abs(circularMeanDegrees([179,-179]))-180)<1.1); assert.equal(circularMeanDegrees([0,90,180,-90]),null);
console.log('circular mean tests passed: wrap boundary and unstable direction');

const raw=signal(Math.PI/2), off=relativePhase(raw), on=relativePhase(raw,{lowPass:true,cutoffHz:6}), changed=relativePhase(raw,{lowPass:true,cutoffHz:3});
assert(off.valid && on.valid && changed.valid); assert.equal(off.filtered,false); assert.equal(on.filtered,true); assert.equal(on.cutoffHz,6);
const overNyquist=relativePhase(raw,{lowPass:true,cutoffHz:100}); assert(overNyquist.valid); assert.equal(overNyquist.filtered,false); assert.match(overNyquist.filterReason,/Nyquist/);
assert.equal(lowPass([1,Number.NaN],33,6),null); assert.equal(lowPass([1,2],33,20),null);
console.log('filter tests passed: off/on/cutoff change/Nyquist/missing/irregular sampling');
