import assert from 'node:assert/strict';import {mapCover} from './geometry.mjs';
const p=mapCover({x:.5,y:.5},1080,1920,640,360,false);assert(Math.abs(p.x-320)<1e-6&&Math.abs(p.y-180)<1e-6);const m=mapCover({x:.2,y:.5},1080,1920,640,360,true);assert(Math.abs(m.x-512)<1e-6);console.log('cover/portrait/mirror geometry tests passed');
