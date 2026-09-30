import assert from 'node:assert/strict';
import { compositeBackground, normalizeBackground, serializeBackground } from './background-settings.mjs';

assert.deepEqual(normalizeBackground({mode:'blur',blur:12,color:'#abcdef'}),{mode:'blur',blur:12,color:'#abcdef'});
assert.deepEqual(normalizeBackground({mode:'invalid',blur:99,color:'red'}),{mode:'original',blur:30,color:'#101820'});
assert.deepEqual(serializeBackground({A:{mode:'solid',color:'#112233'},B:{mode:'blur',blur:6}}),{
  A:{mode:'solid',blur:0,color:'#112233'}, B:{mode:'blur',blur:6,color:'#101820'}
});
const calls=[], context={canvas:{width:640,height:360},save(){calls.push('save')},restore(){calls.push('restore')},drawImage(source){calls.push(source)},fillRect(){calls.push('fill')},set globalCompositeOperation(value){calls.push(value)},set filter(value){calls.push(value)},set fillStyle(value){calls.push(value)}};
const video={videoWidth:1280}, mask={};
assert.equal(compositeBackground(context,video,mask,{offsetX:0,offsetY:0,drawnWidth:640,drawnHeight:360},{mode:'blur',blur:8}),true);
assert.deepEqual(calls,['save',mask,'source-in',video,'destination-over','blur(8px)',video,'restore']);
console.log('background settings tests passed: independent modes and safe normalization');
