import assert from 'node:assert/strict';
import { appendBounded, cameraPhaseObservation, participantFeedbackVisible, DISPLAY_HISTORY_LIMIT } from './monitor-state.mjs';

const history=[];
for(let i=0;i<DISPLAY_HISTORY_LIMIT+25;i++) appendBounded(history,i);
assert.equal(history.length,DISPLAY_HISTORY_LIMIT);
assert.equal(history[0],25);
const a={missing:false,leftWristY:.2,rightWristY:.7};
assert.deepEqual(cameraPhaseObservation(10,a),{time:10,left:.2,right:.7});
assert.deepEqual(cameraPhaseObservation(11,{missing:true,leftWristY:.1,rightWristY:.9}),{time:11,left:null,right:null});
assert.equal(participantFeedbackVisible('none',true,null),false);
assert.equal(participantFeedbackVisible('concurrent',true,null),true);
assert.equal(participantFeedbackVisible('concurrent',false,null),false);
assert.equal(participantFeedbackVisible('terminal',true,90),false);
assert.equal(participantFeedbackVisible('terminal',false,90),true);
assert.equal(participantFeedbackVisible('terminal',false,Number.NaN),true);
console.log('monitor state tests passed: bounded history, camera A observation, BF visibility');
