import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const html=readFileSync('index.html','utf8'),app=readFileSync('app.js','utf8');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
assert.equal(new Set(ids).size,ids.length,'DOM IDs must be unique');
for(const id of ['A','B']) for(const control of ['Video','Axis','Skeleton']){
  assert.match(html,new RegExp(`<label><input id="show${control}${id}"[^>]*>[^<]+<\\/label>`),`${control} ${id} must be wrapped by its label`);
}
for(const src of [...html.matchAll(/(?:src|href)="([^"#?]+)"/g)].map(x=>x[1]).filter(x=>!/^https?:|^\.\/$/.test(x))) assert(existsSync(src.replace(/^\.\//,'')),`missing local reference: ${src}`);
assert.match(app,/function setVideoPresence\(id,present\).*placeholder.*hidden=present/,'received video must hide its placeholder');
assert.match(app,/const m=measures\.A;state\.phaseWindow/,'relative phase must use camera A only');
assert.match(app,/state\.phaseHistory=\[\]/,'trial reset must clear graph history');
console.log('DOM/integration tests passed: labels, unique IDs, references, video state, camera A phase, reset');
