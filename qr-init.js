const slots=['A','B'];
const $=id=>document.getElementById(id);
function retry(){const b=document.createElement('button');b.type='button';b.textContent='Retry QR generation';b.addEventListener('click',()=>location.reload());return b}
function fail(reason){for(const slot of slots){const q=$('qr'+slot);if(q){q.replaceChildren();q.append(reason,retry())}}const r=$('roomCode');if(r)r.textContent='PeerJS connection failed';const n=$('notice');if(n)n.textContent='QR generation failed: '+reason+' (no placeholder ID is used)'}
function ready(){return window.QRCode&&slots.every(s=>{const h=$('link'+s)?.href||'';return h.includes('peer=')&&h.includes('source='+s)})}
let checks=0;const timer=setInterval(()=>{checks++;if(ready()){clearInterval(timer);for(const s of slots){const q=$('qr'+s);if(q)q.dataset.qrStatus='generated'}return}if(checks===20){clearInterval(timer);fail(window.QRCode?'Could not obtain a PeerJS destination ID':'Could not load the QR code library')}},500);
