import assert from 'node:assert/strict';
import { aspectRatioValue, displayTransform, mapCover, mapVideoPoint } from './geometry.mjs';
const close=(actual,expected,message)=>assert.ok(Math.abs(actual-expected)<1e-6,`${message}: ${actual} != ${expected}`);
// Landscape 16:9: contain and cover are identical.
for(const fit of ['contain','cover']) { const t=displayTransform(1920,1080,1280,720,fit); close(t.drawnWidth,1280,fit); close(t.drawnHeight,720,fit); }
// Portrait 9:16 in a matching portrait viewport.
for(const fit of ['contain','cover']) { const p=mapVideoPoint({x:.25,y:.75},1080,1920,540,960,fit); close(p.x,135,fit); close(p.y,720,fit); }
// Critical smartphone portrait -> desktop 16:9 cases.
const contain=displayTransform(1080,1920,1600,900,'contain'); close(contain.drawnWidth,506.25,'portrait contain width'); close(contain.offsetX,546.875,'contain pillarbox'); close(contain.offsetY,0,'contain is not cropped');
const cover=displayTransform(1080,1920,1600,900,'cover'); close(cover.drawnWidth,1600,'cover width'); assert.ok(cover.offsetY<0,'cover crops top/bottom');
// Landmarks and body-axis endpoints use the same transform, including mirroring.
for(const fit of ['contain','cover','fill','original']) { const p=mapVideoPoint({x:.2,y:.4},1080,1920,1600,900,fit,false), mirrored=mapVideoPoint({x:.2,y:.4},1080,1920,1600,900,fit,true); close(p.x+mirrored.x,1600,`${fit} mirror`); }
const shoulder=mapVideoPoint({x:.5,y:.25},1080,1920,1600,900,'contain'), pelvis=mapVideoPoint({x:.5,y:.75},1080,1920,1600,900,'contain'); close(shoulder.x,pelvis.x,'body axis aligned');
const old=mapCover({x:.5,y:.5},1080,1920,640,360); close(old.x,320,'legacy cover'); close(old.y,180,'legacy cover');
assert.equal(aspectRatioValue('9:16'),9/16); assert.equal(aspectRatioValue('custom',3,2),1.5); assert.equal(aspectRatioValue('original'),null);
console.log('geometry tests passed: landscape/portrait, contain/cover/fill/original, mirror and overlay alignment');
