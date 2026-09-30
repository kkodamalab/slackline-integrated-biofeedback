import assert from 'node:assert/strict';
import { gaugePercent, normalizeHow, participantState, visualizationVisibility } from './feedback-state.mjs';
assert.deepEqual(normalizeHow(['numeric','waveform','gauge']),['numeric','waveform','gauge']);
assert.deepEqual(normalizeHow(['waveform','gauge']),['waveform','gauge']);
assert.deepEqual([-180,-90,0,90,180].map(value=>gaugePercent(value)),[0,25,50,75,100]); assert.equal(gaugePercent(Number.NaN),null);
const base={when:'none',what:'kr',amount:'simple',how:['numeric','waveform','gauge'],target:0,tolerance:20,cameraImageEnabled:true};
assert.equal(participantState(base,true,null,{valid:true,value:20}).visible,false);
assert.equal(participantState({...base,when:'concurrent'},true,null,{valid:true,value:20}).visible,true);
assert.equal(participantState({...base,when:'terminal'},true,30,{valid:true,value:20}).visible,false);
assert.equal(participantState({...base,when:'terminal'},false,30,{valid:false}).visible,true);
assert.equal(participantState({...base,cameraImageEnabled:false},true,null,{valid:true,value:20}).cameraImageEnabled,false);
assert.deepEqual(visualizationVisibility({...base,how:['skeleton','target']}),{camera:true,skeleton:true,waveform:false,gauge:false,target:true,numeric:false});
assert.deepEqual(visualizationVisibility({...base,cameraImageEnabled:false,how:['waveform','gauge']}),{camera:false,skeleton:false,waveform:true,gauge:true,target:false,numeric:false});
for(const key of ['skeleton','waveform','gauge','target','numeric']) { const visibility=visualizationVisibility({...base,cameraImageEnabled:false,how:[key]}); assert.equal(visibility[key],true); for(const other of ['skeleton','waveform','gauge','target','numeric']) if(other!==key)assert.equal(visibility[other],false); }
assert.equal(visualizationVisibility({...base,cameraImageEnabled:true,how:[]}).camera,true);
const knee=participantState({...base,when:'concurrent',targetVariable:'leftKnee',target:90,tolerance:5},true,null,{value:92,label:'Left Knee',unit:'°',min:0,max:180,inside:true},[{leftKnee:92}]);
assert.equal(knee.value,92);assert.equal(knee.targetVariable,'leftKnee');assert.deepEqual(knee.range,{min:0,max:180});assert.equal(knee.inside,true);
console.log('feedback state tests passed: multi-HOW, gauge mapping, WHEN, camera and terminal state');
