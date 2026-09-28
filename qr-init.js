const slots=['A','B'];
const $=id=>document.getElementById(id);
function retry(){const b=document.createElement('button');b.type='button';b.textContent='QR生成を再試行';b.addEventListener('click',()=>location.reload());return b}
function fail(reason){for(const slot of slots){const q=$('qr'+slot);if(q){q.replaceChildren();q.append(reason,retry())}}const r=$('roomCode');if(r)r.textContent='PeerJS接続失敗';const n=$('notice');if(n)n.textContent='QR生成失敗: '+reason+'（ダミーIDは使用していません）'}
function ready(){return window.QRCode&&slots.every(s=>{const h=$('link'+s)?.href||'';return h.includes('peer=')&&h.includes('source='+s)})}
let checks=0;const timer=setInterval(()=>{checks++;if(ready()){clearInterval(timer);for(const s of slots){const q=$('qr'+s);if(q)q.dataset.qrStatus='generated'}return}if(checks===20){clearInterval(timer);fail(window.QRCode?'PeerJSの接続先IDを取得できませんでした':'QRコードライブラリを読み込めませんでした')}},500);
