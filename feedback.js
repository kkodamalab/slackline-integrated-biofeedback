import { gaugePercent, normalizeHow, visualizationVisibility } from './feedback-state.mjs';
import { participantPresentation } from './display-settings.mjs';
import { targetToleranceSegments } from './target-feedback.mjs';
const $=id=>document.getElementById(id);

function drawHistory(rows,key,min,max,colors={}) {
  const canvas=$('waveform'), ctx=canvas.getContext('2d'); ctx.clearRect(0,0,canvas.width,canvas.height);
  const line=(key,color,min,max)=>{ctx.strokeStyle=color;ctx.lineWidth=3;ctx.beginPath();let started=false;rows.forEach((row,i)=>{const v=row[key];if(!Number.isFinite(v)){started=false;return}const x=i/Math.max(1,rows.length-1)*canvas.width,y=(1-(v-min)/(max-min))*canvas.height;started?ctx.lineTo(x,y):ctx.moveTo(x,y);started=true});ctx.stroke()};
  line(key,colors.phaseColor||'#f3c969',min,max);
}

export function renderFeedback(state) {
  const how=normalizeHow(state?.how), visual=visualizationVisibility(state), visible=!!state?.visible;
  $('waiting').hidden=visible; $('content').hidden=!visible; if(!visible)return;
  const show=(id,value)=>$(id).hidden=!how.includes(value);
  const hasCamera=visual.camera&&!!state.cameraImage, hasSkeleton=visual.skeleton&&!!state.skeletonImage;
  $('cameraWrap').hidden=!(hasCamera||hasSkeleton); $('camera').hidden=!hasCamera; if(hasCamera)$('camera').src=state.cameraImage;
  const presentation=participantPresentation(state); $('cameraWrap').dataset.fit=presentation.display.fit;
  $('skeleton').dataset.lineWidth=presentation.overlayStyle.skeletonWidth; $('skeleton').dataset.jointSize=presentation.overlayStyle.jointSize;
  $('skeleton').hidden=!hasSkeleton; if(hasSkeleton)$('skeleton').src=state.skeletonImage;
  show('numeric','numeric'); show('waveform','waveform'); $('gaugeBlock').hidden=!visual.gauge; show('targetText','target');
  const min=state.range?.min??-180,max=state.range?.max??180,unit=state.unit||'',decimals=unit==='°'?1:3;
  $('numeric').textContent=Number.isFinite(state.value)?`${state.value.toFixed(decimals)}${unit}`:'—';
  const value=gaugePercent(state.value,min,max), target=gaugePercent(state.target,min,max), segments=targetToleranceSegments(state.targetVariable,state.target,state.tolerance);
  $('needle').hidden=value===null; if(value!==null)$('needle').style.left=value+'%'; $('target').style.left=target+'%';
  for(const [index,id] of ['tolerance','toleranceWrap'].entries()){const element=$(id),segment=segments[index];element.hidden=!segment;if(segment){element.style.left=segment.left+'%';element.style.width=segment.width+'%'}}
  $('scaleMin').textContent=`${min}${unit}`;$('scaleMid').textContent=`${(min+max)/2}${unit}`;$('scaleMax').textContent=`${max}${unit}`;
  $('targetText').textContent=`${state.targetLabel||state.targetVariable}: target ${state.target}${unit} / tolerance ±${state.tolerance}${unit}`;
  const onTarget=state.inside===true;
  $('needle').style.background=presentation.overlayStyle.gaugeColor||'#f3c969'; for(const id of ['tolerance','toleranceWrap'])$(id).style.background=(presentation.overlayStyle.targetRangeColor||'#b8ff32')+'40';
  $('result').textContent=onTarget?'TARGET':' '; drawHistory(state.history||[],state.targetVariable,min,max,presentation.overlayStyle);
}
const channel='BroadcastChannel'in window?new BroadcastChannel('slackline-feedback-v1'):null; channel?.addEventListener('message',event=>renderFeedback(event.data));
window.addEventListener('storage',event=>{if(event.key==='slackline-feedback-state'&&event.newValue)renderFeedback(JSON.parse(event.newValue))});
try{const saved=localStorage.getItem('slackline-feedback-state');if(saved)renderFeedback(JSON.parse(saved))}catch{}
