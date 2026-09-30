import assert from 'node:assert/strict';
import { normalizeBackground, serializeBackground } from './background-settings.mjs';

assert.deepEqual(normalizeBackground({mode:'blur',blur:12,color:'#abcdef'}),{mode:'blur',blur:12,color:'#abcdef'});
assert.deepEqual(normalizeBackground({mode:'invalid',blur:99,color:'red'}),{mode:'original',blur:30,color:'#101820'});
assert.deepEqual(serializeBackground({A:{mode:'solid',color:'#112233'},B:{mode:'blur',blur:6}}),{
  A:{mode:'solid',blur:0,color:'#112233'}, B:{mode:'blur',blur:6,color:'#101820'}
});
console.log('background settings tests passed: independent modes and safe normalization');
