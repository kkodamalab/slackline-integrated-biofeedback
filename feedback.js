import { gaugePercent, normalizeHow } from './feedback-state.mjs';
const $=id=>document.getElementById(id);

function drawHistory(rows) {
  const canvas=$('waveform'), ctx=canvas.getContext('2d'); ctx.clearRect(0,0,canvas.width,canvas.height);
  const line=(key,color,min,max)=>{ctx.strokeStyle=color;ctx.lineWidth=3;ctx.beginPath();let started=false;rows.forEach((row,i)=>{const v=row[key];if(!Number.isFinite(v)){started=false;return}const x=i/Math.max(1,rows.length-1)*canvas.width,y=(1-(v-min)/(max-min))*canvas.height;started?ctx.lineTo(x,y):ctx.moveTo(x,y);started=true});ctx.stroke()};
  line('leftWristY','#b8ff32',0,1); line('rightWristY','#59d6c7',0,1); line('relativePhase','#f3c969',-180,180);
}

export function renderFeedback(state) {
  const how=normalizeHow(state?.how), visible=!!state?.visible;
  $('waiting').hidden=visible; $('content').hidden=!visible; if(!visible)return;
  const show=(id,value)=>$(id).hidden=!how.includes(value);
  $('cameraWrap').hidden=!state.cameraImageEnabled; $('camera').src=state.cameraImage||'';
  $('skeleton').hidden=!how.includes('skeleton'); if(state.skeletonImage)$('skeleton').src=state.skeletonImage;
  show('numeric','numeric'); show('waveform','waveform'); $('gaugeBlock').hidden=!how.includes('gauge'); show('targetText','target');
  $('numeric').textContent=Number.isFinite(state.value)?`${state.value.toFixed(1)}°`:'—';
  const value=gaugePercent(state.value), target=gaugePercent(state.target), half=Math.max(0,Math.min(50,state.tolerance/360*100));
  $('needle').hidden=value===null; if(value!==null)$('needle').style.left=value+'%'; $('target').style.left=target+'%';
  $('tolerance').style.left=Math.max(0,target-half)+'%'; $('tolerance').style.width=Math.min(100-Math.max(0,target-half),half*2)+'%';
  $('targetText').textContent=`Target ${state.target}° / tolerance ±${state.tolerance}°`;
  $('result').textContent=Number.isFinite(state.value)&&Math.abs((((state.value-state.target)+180)%360+360)%360-180)<=state.tolerance?'TARGET':' '; drawHistory(state.history||[]);
}
const channel='BroadcastChannel'in window?new BroadcastChannel('slackline-feedback-v1'):null; channel?.addEventListener('message',event=>renderFeedback(event.data));
window.addEventListener('storage',event=>{if(event.key==='slackline-feedback-state'&&event.newValue)renderFeedback(JSON.parse(event.newValue))});
try{const saved=localStorage.getItem('slackline-feedback-state');if(saved)renderFeedback(JSON.parse(saved))}catch{}
