import assert from 'node:assert/strict';
import { DEFAULT_OVERLAY, participantPresentation, synchronizeDisplays } from './display-settings.mjs';
const separate=synchronizeDisplays({A:{aspect:'9:16',fit:'contain'},B:{aspect:'16:9',fit:'cover'}},false);
assert.equal(separate.A.aspect,'9:16'); assert.equal(separate.B.fit,'cover');
const both=synchronizeDisplays({A:{aspect:'original',fit:'contain'},B:{aspect:'1:1',fit:'fill'}},true); assert.deepEqual(both.A,both.B);
const style={skeletonColor:'#123456',skeletonWidth:10,jointColor:'#abcdef',jointSize:12,axisColor:'#fedcba'};
const participant=participantPresentation({display:{A:{aspect:'9:16',fit:'contain'}},overlayStyle:style}); assert.equal(participant.display.fit,'contain'); assert.deepEqual(participant.overlayStyle,style);
assert.equal(DEFAULT_OVERLAY.skeletonWidth,3); assert.equal(DEFAULT_OVERLAY.jointSize,3);
console.log('display settings tests passed: A/B, participant sync, widths, sizes and colors');
