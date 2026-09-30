import { CameraRuntime } from './camera-runtime.js';
import { aspectRatioValue, displayTransform, mapVideoPoint } from './geometry.mjs';
import { storeRemote, currentRemote } from './remote-state.mjs';
import { measurePose } from './measurements.mjs';
import { circularMeanDegrees, relativePhase, wrapDegrees } from './phase.mjs';
import { appendBounded, cameraPhaseObservation, participantFeedbackVisible } from './monitor-state.mjs';
import { gaugePercent, normalizeHow, participantState } from './feedback-state.mjs';
import { synchronizeDisplays } from './display-settings.mjs';
import { auditoryDecision, playBeep, playVoice, resumeAudio } from './auditory-feedback.mjs';
import { SERIES_META, transformSeries, mixedUnits } from './graph-settings.mjs';
import { COLOR_PALETTE, resolveColor } from './color-settings.mjs';
import { compositeBackground, serializeBackground } from './background-settings.mjs';
import './qr-init.js';

const $ = id => document.getElementById(id);
const nowIso = () => new Date().toISOString();
const sessionId = crypto.randomUUID();
const state = {
  mode: 'idle', looping: false, recording: false, samples: [], phaseWindow: [], displayHistory: [],
  runtime: null, remote: { A: null, B: null }, connections: {}, previous: { A: null, B: null },
  trialStarted: null, terminalResult: null, lastFeedbackPublish: 0, targetProfiles: { relativePhase: { target:0, tolerance:20 } },
  auditory: { previousOnTarget: null, beepLast: -Infinity, voiceLast: -Infinity }, remoteStreams:{A:null,B:null}, trialBaselines:{}, backgroundProcessed:{A:false,B:false}
};
const feedbackChannel = 'BroadcastChannel' in window ? new BroadcastChannel('slackline-feedback-v1') : null;
const edges = [[11,12],[23,24],[11,13],[13,15],[12,14],[14,16],[11,23],[12,24],[23,25],[25,27],[24,26],[26,28]];
const cameraDisplay = id => ({ aspect: $('aspect'+id).value, fit: $('fit'+id).value, customWidth: Number($('customWidth'+id).value), customHeight: Number($('customHeight'+id).value) });
const colorValue = name => resolveColor($(name+'ColorPreset').value,$(name+'Color').value);
const colorNames=['skeleton','joint','reference','axis','leftWave','rightWave','phase','gauge','targetRange'];
const colorConfiguration=()=>Object.fromEntries(colorNames.map(name=>[name,{preset:$(name+'ColorPreset').value,custom:$(name+'Color').value,value:colorValue(name)}]));
const overlayStyle = () => ({ skeletonColor: colorValue('skeleton'), skeletonWidth: Number($('skeletonWidth').value), jointColor: colorValue('joint'), jointSize: Number($('jointSize').value), referenceColor: colorValue('reference'), axisColor: colorValue('axis'), leftWaveColor:colorValue('leftWave'), rightWaveColor:colorValue('rightWave'), phaseColor:colorValue('phase'), gaugeColor:colorValue('gauge'), targetRangeColor:colorValue('targetRange') });
const backgroundConfiguration = () => serializeBackground(Object.fromEntries(['A','B'].map(id=>[id,{mode:$('backgroundMode'+id).value,blur:Number($('backgroundBlur'+id).value),color:$('backgroundColor'+id).value}])));
const auditorySettings = kind => kind==='beep' ? {enabled:$('beepEnabled').checked,type:$('beepType').value,volume:Number($('beepVolume').value),trigger:$('beepTrigger').value,cooldown:Number($('beepCooldown').value)} : {enabled:$('voiceEnabled').checked,phrase:$('voicePhrase').value,customPhrase:$('voiceCustomPhrase').value,volume:Number($('voiceVolume').value),rate:Number($('voiceRate').value),trigger:$('voiceTrigger').value,cooldown:Number($('voiceCooldown').value)};
const settings = () => ({
  when: $('when').value, what: $('what').value, amount: $('amount').value,
  how: normalizeHow([...document.querySelectorAll('#how input:checked')].map(x => x.value)),
  variables: [...document.querySelectorAll('#variables input:checked')].map(x => x.value), side: $('side').value,
  targetVariable: $('targetVariable').value, target: Number($('target').value), tolerance: Number($('tolerance').value), targets: { ...state.targetProfiles, [$('targetVariable').value]: { target:Number($('target').value), tolerance:Number($('tolerance').value) } }, sourceA: $('sourceA').value,
  sourceB: $('sourceB').value, cameraAEnabled: $('cameraAEnabled').checked, cameraBEnabled: $('cameraBEnabled').checked,
  graph:{ yAxisMode:$('yAxisMode').value, autoRange:$('yAutoRange').checked, yMin:Number($('yMin').value), yMax:Number($('yMax').value), relativeBaseline:$('relativeBaseline').value, standardization:'window-zscore', series:[...document.querySelectorAll('#variables input:checked')].map(x=>x.value) },
  cameraImageEnabled: $('feedbackCamera').checked, display: synchronizeDisplays({ A: cameraDisplay('A'), B: cameraDisplay('B') }, $('applyBoth').checked), background:backgroundConfiguration(), overlayStyle: overlayStyle(), colors: colorConfiguration(), beepEnabled:$('beepEnabled').checked, beepType:$('beepType').value, beepVolume:Number($('beepVolume').value), beepTrigger:$('beepTrigger').value, beepCooldown:Number($('beepCooldown').value), voiceEnabled:$('voiceEnabled').checked, voicePhrase:$('voicePhrase').value, voiceCustomPhrase:$('voiceCustomPhrase').value, voiceVolume:Number($('voiceVolume').value), voiceRate:Number($('voiceRate').value), voiceTrigger:$('voiceTrigger').value, voiceCooldown:Number($('voiceCooldown').value), filter: { enabled: $('lowPassEnabled').checked, cutoffHz: Number($('lowPassCutoff').value) }
});
const message = text => { $('notice').textContent = text; };
const midpoint = (a, b) => a && b ? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } : null;

function setVideoPresence(id, present) {
  $('placeholder' + id).classList.toggle('video-present', present);
  $(id.toLowerCase() + 'State').textContent = present ? '● LIVE' : '● WAITING';
}

function applyDisplaySettings() {
  const displays = settings().display;
  for (const id of ['A','B']) {
    const display=displays[id], video=$('video'+id), ratio=aspectRatioValue(display.aspect,display.customWidth,display.customHeight);
    const viewport=video.parentElement; viewport.dataset.fit=display.fit;
    viewport.style.aspectRatio=ratio || (video.videoWidth && video.videoHeight ? `${video.videoWidth}/${video.videoHeight}` : '16/9');
  }
  $('skeletonWidthValue').value=$('skeletonWidth').value+' px'; $('jointSizeValue').value=$('jointSize').value+' px';
  try { sessionStorage.setItem('slackline-display-settings',JSON.stringify({display:displays,overlayStyle:overlayStyle(),colors:colorConfiguration()})); } catch {}
  ensureLoop(); publishFeedback({valid:false},true);
}

function draw(id, landmarks, meta = {}) {
  const canvas = $('canvas' + id), context = canvas.getContext('2d'), video = $('video' + id), dpr = devicePixelRatio;
  canvas.width = Math.max(1, canvas.clientWidth * dpr); canvas.height = Math.max(1, canvas.clientHeight * dpr);
  context.clearRect(0, 0, canvas.width, canvas.height);
  const background=backgroundConfiguration()[id], display = settings().display[id];
  const transform=displayTransform(meta.videoWidth || video.videoWidth || canvas.width,meta.videoHeight || video.videoHeight || canvas.height,canvas.width,canvas.height,display.fit);
  const processed=$("camera" + id + "Video").checked && compositeBackground(context,video,meta.mask,transform,background);
  state.backgroundProcessed[id]=processed;
  video.style.visibility = $("camera" + id + "Video").checked && !processed ? 'visible' : 'hidden';
  if (!landmarks) return;
  const style = overlayStyle();
  const point = value => mapVideoPoint(value, meta.videoWidth || video.videoWidth || canvas.width, meta.videoHeight || video.videoHeight || canvas.height, canvas.width, canvas.height, display.fit, !!meta.mirror);
  if ($('camera' + id + 'Skeleton').checked) {
    context.strokeStyle = style.skeletonColor; context.lineWidth = style.skeletonWidth * dpr;
    for (const [a, b] of edges) {
      if ((landmarks[a]?.visibility ?? 0) < .5 || (landmarks[b]?.visibility ?? 0) < .5) continue;
      const x = point(landmarks[a]), y = point(landmarks[b]); context.beginPath(); context.moveTo(x.x, x.y); context.lineTo(y.x, y.y); context.stroke();
    }
  }
  if ($('camera' + id + 'Joints').checked) {
    context.fillStyle = style.jointColor;
    for (const landmark of landmarks.slice(11)) if ((landmark?.visibility ?? 0) >= .5) { const p=point(landmark); context.beginPath(); context.arc(p.x,p.y,style.jointSize*dpr,0,Math.PI*2); context.fill(); }
  }
  if ($('camera' + id + 'Reference').checked) {
    context.lineWidth = style.skeletonWidth * dpr; context.strokeStyle = style.referenceColor; context.beginPath();
    context.moveTo(canvas.width / 2, 0); context.lineTo(canvas.width / 2, canvas.height); context.stroke();
  }
  if ($('camera' + id + 'Axis').checked) {
    const shoulders = midpoint(landmarks[11], landmarks[12]), hips = midpoint(landmarks[23], landmarks[24]);
    if (shoulders && hips) {
      context.lineWidth = style.skeletonWidth * dpr; context.strokeStyle = style.axisColor; const x = point(shoulders), y = point(hips); context.beginPath();
      context.moveTo(x.x, x.y); context.lineTo(y.x, y.y); context.stroke();
    }
  }
}

function synth(t) {
  const landmarks = Array.from({ length: 33 }, () => ({ x: .5, y: .5, visibility: .98 })), q = Math.sin(t * 2.7) * .04, a = Math.sin(t * 5) * .1;
  landmarks[0] = { x: .5 + q, y: .1, visibility: .98 }; landmarks[7] = { x: .47 + q, y: .12, visibility: .98 }; landmarks[8] = { x: .53 + q, y: .12, visibility: .98 };
  for (const [i,x,y] of [[11,.43,.27],[12,.57,.27],[23,.46,.56],[24,.54,.56],[25,.45,.74],[26,.55,.74],[27,.44,.93],[28,.56,.93]]) landmarks[i] = { x: x + q, y, visibility: .98 };
  landmarks[15] = { x: .3, y: .4 + a, visibility: .98 }; landmarks[16] = { x: .7, y: .4 - a, visibility: .98 }; return landmarks;
}

function source(id, time) {
  if (!$('camera' + id + 'Enabled').checked) return {};
  if (state.mode === 'sim') return { landmarks: synth(time / 1000), receivedAt: time, timestamp: Date.now(), meta: { simulation: true } };
  const selected=settings()['source'+id];
  if (selected==='device1'||selected==='device2') return currentRemote(state.remote,selected==='device1'?'A':'B',time) || {};
  return { landmarks: state.runtime?.landmarks[id] || null, receivedAt: time, timestamp: state.runtime?.timestamps[id], meta: { videoWidth: $('video' + id).videoWidth, videoHeight: $('video' + id).videoHeight, mask:state.runtime?.masks?.[id] || null } };
}

function chart() {
  const canvas = $('phaseChart'), context = canvas.getContext('2d'), dpr = devicePixelRatio, rows = state.displayHistory, colors=overlayStyle();
  canvas.width = canvas.clientWidth * dpr; canvas.height = canvas.clientHeight * dpr; context.clearRect(0, 0, canvas.width, canvas.height);
  if (rows.length < 2) return;
  const s=settings(), requested=s.graph.series.filter(key=>SERIES_META[key]&&rows.some(row=>Number.isFinite(row[key]))), mixed=s.graph.yAxisMode==='absolute'&&mixedUnits(requested), selected=mixed?requested.filter(key=>SERIES_META[key].unit===SERIES_META[requested[0]]?.unit):requested, transformed={};
  $('graphWarning').hidden=!mixed;
  for(const key of selected)transformed[key]=transformSeries(rows.map(row=>row[key]),s.graph.yAxisMode,s.graph.relativeBaseline,state.trialBaselines[key]);
  const all=Object.values(transformed).flat().filter(Number.isFinite); let min=s.graph.yMin,max=s.graph.yMax;
  if(s.graph.autoRange&&all.length){min=Math.min(...all);max=Math.max(...all);if(min===max){min-=1;max+=1}}
  if(!(max>min))return;
  const palette=[colors.leftWaveColor,colors.rightWaveColor,colors.phaseColor,'#ff8a65','#ab8cff','#ffffff'];
  Object.entries(transformed).forEach(([key,values],seriesIndex)=>{context.strokeStyle=palette[seriesIndex%palette.length];context.lineWidth=2*dpr;context.beginPath();let started=false;values.forEach((value,i)=>{if(!Number.isFinite(value)){started=false;return}const x=i/(rows.length-1)*canvas.width,y=(1-(value-min)/(max-min))*canvas.height;started?context.lineTo(x,y):context.moveTo(x,y);started=true});context.stroke()});
}

function updateResearchMonitor(phase) {
  const s = settings(), colors=overlayStyle(), targetPercent = gaugePercent(s.target), tolerancePercent = Math.min(50, Math.max(0, s.tolerance / 360 * 100));
  $('phaseNeedle').style.background=colors.gaugeColor; $('phaseTolerance').style.background=colors.targetRangeColor+'30'; $('phaseTolerance').style.borderColor=colors.targetRangeColor;
  $('phaseTarget').style.left = targetPercent + '%'; $('phaseTolerance').style.left = Math.max(0, targetPercent - tolerancePercent) + '%';
  $('phaseTolerance').style.width = Math.min(100 - Math.max(0, targetPercent - tolerancePercent), tolerancePercent * 2) + '%';
  $('phaseTargetLabel').textContent = `${s.target}°`; $('phaseToleranceLabel').textContent = `${s.tolerance}°`;
  $('monitorPhaseValue').textContent = phase.valid ? `${phase.value.toFixed(1)}°` : '—'; $('phaseNeedle').hidden = !phase.valid;
  if (phase.valid) $('phaseNeedle').style.left = gaugePercent(phase.value) + '%';
  $('phaseGauge').setAttribute('aria-valuenow', phase.valid ? phase.value.toFixed(1) : '');
}

function processAuditory(value, terminal=false) {
  const s=settings(), difference=s.targetVariable==='relativePhase'?Math.abs(wrapDegrees(value-s.target)):Math.abs(value-s.target), onTarget=Number.isFinite(value)&&difference<=s.tolerance, now=performance.now();
  const context={recording:state.recording,terminal,previousOnTarget:state.auditory.previousOnTarget,onTarget,now};
  const beep=auditorySettings('beep'), voice=auditorySettings('voice'); beep.when=s.when; voice.when=s.when; beep.enabled&&=s.how.includes('target'); voice.enabled&&=s.how.includes('target');
  if(auditoryDecision(beep,context,state.auditory.beepLast)){playBeep(beep.type,beep.volume);state.auditory.beepLast=now}
  if(auditoryDecision(voice,context,state.auditory.voiceLast)){playVoice(voice);state.auditory.voiceLast=now}
  state.auditory.previousOnTarget=onTarget;
}

function cameraSnapshot() {
  if (!$('feedbackCamera').checked || !$('videoA').videoWidth) return null;
  const source=$('videoA'), overlay=$('canvasA'), canvas=document.createElement('canvas'); canvas.width=overlay.width; canvas.height=overlay.height;
  if(state.backgroundProcessed.A){canvas.getContext('2d').drawImage(overlay,0,0);return canvas.toDataURL('image/jpeg',.65)}
  const transform=displayTransform(source.videoWidth,source.videoHeight,canvas.width,canvas.height,settings().display.A.fit);
  canvas.getContext('2d').drawImage(source,transform.offsetX,transform.offsetY,transform.drawnWidth,transform.drawnHeight);
  return canvas.toDataURL('image/jpeg', .65);
}

function publishFeedback(phase, force = false) {
  const now = performance.now(); if (!force && now - state.lastFeedbackPublish < 200) return;
  state.lastFeedbackPublish = now;
  const s = settings(), payload = participantState(s, state.recording, state.terminalResult, phase, state.displayHistory, cameraSnapshot());
  payload.skeletonImage = s.how.includes('skeleton') && !state.backgroundProcessed.A ? $('canvasA').toDataURL('image/png') : null;
  feedbackChannel?.postMessage(payload);
  try { localStorage.setItem('slackline-feedback-state', JSON.stringify(payload)); } catch {}
  // Keep the established Smartphone message contract, now driven by the same state.
  for (const connection of Object.values(state.connections)) if (connection?.open) connection.send({ ...payload, type: 'feedback' });
}

function frame(time) {
  if (!state.looping) return;
  const inputs = { A: source('A', time), B: source('B', time) }, measures = {};
  for (const id of ['A','B']) {
    const selected=settings()['source'+id], background=backgroundConfiguration()[id];
    if(selected!=='pc'&&background.mode!=='original'&&state.runtime?.backgroundPose){inputs[id].meta??={};inputs[id].meta.mask=state.runtime.segmentExternal(id,$('video'+id),time)}
    draw(id, inputs[id].landmarks, inputs[id].meta); measures[id] = measurePose(inputs[id].landmarks, state.previous[id], time);
    if (!measures[id].missing) state.previous[id] = measures[id]; $('readout' + id).textContent = inputs[id].landmarks ? 'Detected' : 'Not detected';
  }
  appendBounded(state.phaseWindow, cameraPhaseObservation(time, measures.A));
  const s = settings(), phase = relativePhase(state.phaseWindow, { lowPass: s.filter.enabled, cutoffHz: s.filter.cutoffHz }), a = measures.A;
  $('filterStatus').textContent = phase.filterReason ? `${phase.filterReason} (Nyquist ${phase.nyquistHz.toFixed(1)} Hz)` : s.filter.enabled && phase.valid ? `Active (Nyquist ${phase.nyquistHz.toFixed(1)} Hz)` : 'Applied after resampling and before Hilbert transform';
  appendBounded(state.displayHistory, { ...a, leftKnee:measures.A.leftKnee, rightKnee:measures.A.rightKnee, relativePhase: phase.valid ? phase.value : null });
  $('trunkValue').textContent = a.bodyAxisHead == null ? '—' : a.bodyAxisHead.toFixed(1) + '°'; $('kneeValue').textContent = measures.B.leftKnee == null ? '—' : measures.B.leftKnee.toFixed(1) + '°';
  $('confValue').textContent = a.confidence == null ? '—' : a.confidence.toFixed(2); $('syncValue').textContent = inputs.A.timestamp && inputs.B.timestamp ? Math.abs(inputs.A.timestamp - inputs.B.timestamp) + ' ms' : '—';
  if (state.recording) {
    state.samples.push({ sessionId, trial: $('trial').value, condition: $('condition').value, memo: $('memo').value, wallTime: nowIso(), monotonicTime: time, mode: state.mode, sourceA: s.sourceA, sourceB: s.sourceB, cameraA: inputs.A.meta, cameraB: inputs.B.meta, ...a, rawLeftWristY: a.leftWristY, rawRightWristY: a.rightWristY, filteredLeftWristY: phase.filtered ? phase.left?.at(-1) : null, filteredRightWristY: phase.filtered ? phase.right?.at(-1) : null, relativePhase: phase.valid ? phase.value : null, phaseReason: phase.valid ? '' : phase.reason, missingA: measures.A.missing, missingB: measures.B.missing, freshnessA: inputs.A.receivedAt ? time-inputs.A.receivedAt : null, freshnessB: inputs.B.receivedAt ? time-inputs.B.receivedAt : null, timeDifference: inputs.A.timestamp && inputs.B.timestamp ? inputs.A.timestamp-inputs.B.timestamp : null, bf: s });
    if (state.samples.length > 20000) state.samples.shift();
  }
  const current={...a,relativePhase:phase.valid?phase.value:null}[s.targetVariable]; updateResearchMonitor(phase); processAuditory(current); publishFeedback(phase); if (time % 100 < 18) chart(); requestAnimationFrame(frame);
}

function bindVideoSources() {
  for(const id of ['A','B']) {
    const selected=$('source'+id).value, video=$('video'+id);
    if(selected!=='pc') { const slot=selected==='device1'?'A':'B'; video.srcObject=state.remoteStreams[slot]||null; if(video.srcObject)video.play().then(()=>setVideoPresence(id,true)).catch(()=>{}); }
  }
}
function ensureLoop() { if (!state.looping) { state.looping = true; requestAnimationFrame(frame); } }
function stopInputs() { state.runtime?.stop(); state.runtime = null; state.looping = false; for (const id of ['A','B']) { draw(id, null); setVideoPresence(id, false); } }
async function startCams() { stopInputs(); state.mode = 'camera'; bindVideoSources(); const pcA=$('sourceA').value==='pc'&&$('cameraAEnabled').checked,pcB=$('sourceB').value==='pc'&&$('cameraBEnabled').checked;if(pcA&&pcB){message('Camera 1 and Camera 2 cannot acquire the same PC camera. Choose another source for either camera.');return} state.runtime = new CameraRuntime({ onState: (id,text) => { $(id.toLowerCase()+'State').textContent = text; }, onError: message, onVideo: setVideoPresence, onFrame: (id,lm) => { if (!lm) draw(id,null); } }); const local={A:$('sourceA').value==='pc'&&$('cameraAEnabled').checked,B:$('sourceB').value==='pc'&&$('cameraBEnabled').checked}, remoteBackground=['A','B'].some(id=>$('source'+id).value!=='pc'&&backgroundConfiguration()[id].mode!=='original'); if(local.A||local.B)await state.runtime.start(local);if(remoteBackground)await state.runtime.initExternal(); ensureLoop(); }
function startSim() { stopInputs(); state.mode = 'sim'; $('simulationBadge').hidden = false; for (const id of ['A','B']) setVideoPresence(id, true); message('SIMULATION: generated data are not measured values'); ensureLoop(); }
async function startTrial() { await resumeAudio(); state.samples = []; state.phaseWindow = []; state.recording = true; state.auditory.previousOnTarget=null; state.auditory.beepLast=state.auditory.voiceLast=-Infinity; state.trialBaselines={}; const first=state.displayHistory.at(-1)||{}; for(const key of settings().graph.series)if(Number.isFinite(first[key]))state.trialBaselines[key]=first[key]; state.terminalResult = null; state.trialStarted = nowIso(); $('modeStatus').textContent = 'Recording'; ensureLoop(); publishFeedback({valid:false}, true); message('A new trial has started'); }
function stopTrial() { state.recording = false; $('modeStatus').textContent = 'Stopped'; if (settings().when === 'terminal') { const key=settings().targetVariable,valid=state.samples.map(x=>x[key]).filter(Number.isFinite), result=key==='relativePhase'?circularMeanDegrees(valid):(valid.length?valid.reduce((a,b)=>a+b,0)/valid.length:null); state.terminalResult = result ?? Number.NaN; processAuditory(state.terminalResult,true); message(`Terminal KR: trial ${$('trial').value} / valid ${valid.length} samples`); } publishFeedback({valid:false}, true); }
function reset() { state.recording = false; state.samples = []; state.phaseWindow = []; state.displayHistory = []; state.previous = { A:null, B:null }; state.terminalResult = null; chart(); publishFeedback({valid:false}, true); message('Trial data has been reset'); }
function download(kind) { const meta = { sessionId, trialStarted: state.trialStarted, exportedAt: nowIso(), settings: settings(), samples: state.samples }; let body,type; if (kind === 'json') { body=JSON.stringify(meta,null,2); type='application/json'; } else { const flat=state.samples.map(x=>({...x,cameraA:JSON.stringify(x.cameraA),cameraB:JSON.stringify(x.cameraB),bf:JSON.stringify(x.bf)})),keys=[...new Set(flat.flatMap(Object.keys))]; body='\ufeff'+keys.join(',')+'\n'+flat.map(row=>keys.map(key=>`"${String(row[key]??'').replaceAll('"','""')}"`).join(',')).join('\n'); type='text/csv'; } const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([body],{type})); a.download=`slackline-${sessionId}-${$('trial').value}.${kind}`; a.click(); URL.revokeObjectURL(a.href); }

$('startCams').onclick=startCams; $('stopAll').onclick=stopInputs; $('startSim').onclick=startSim; $('startTrial').onclick=startTrial; $('stopTrial').onclick=stopTrial; $('resetTrial').onclick=reset; $('downloadCsv').onclick=()=>download('csv'); $('downloadJson').onclick=()=>download('json'); $('fullscreen').onclick=()=>document.documentElement.requestFullscreen?.();
$('openFeedback').onclick=()=>window.open('./feedback.html', 'slackline-feedback');
for (const id of ['A','B']) { $('camera'+id+'Video').onchange = () => draw(id, source(id, performance.now()).landmarks); for(const control of ['Reference','Axis','Skeleton','Joints'])$('camera'+id+control).onchange=()=>ensureLoop(); const video=$('video'+id); video.addEventListener('playing',()=>setVideoPresence(id,true)); video.addEventListener('emptied',()=>setVideoPresence(id,false)); }
for (const id of ['when','what','amount','target','tolerance','feedbackCamera','lowPassEnabled','lowPassCutoff','beepEnabled','beepType','beepVolume','beepTrigger','beepCooldown','voiceEnabled','voicePhrase','voiceCustomPhrase','voiceVolume','voiceRate','voiceTrigger','voiceCooldown']) $(id).onchange=()=>{ ensureLoop(); publishFeedback({valid:false}, true); };
$('targetVariable').dataset.previous='relativePhase';
$('targetVariable').onchange=event=>{ state.targetProfiles[event.target.dataset.previous]={target:Number($('target').value),tolerance:Number($('tolerance').value)}; const profile=state.targetProfiles[event.target.value]||{target:0,tolerance:20}; state.targetProfiles[event.target.value]=profile; $('target').value=profile.target; $('tolerance').value=profile.tolerance; event.target.dataset.previous=event.target.value; publishFeedback({valid:false},true); };
for (const input of document.querySelectorAll('#how input')) input.onchange=()=>{ ensureLoop(); publishFeedback({valid:false}, true); };
for (const id of ['cameraAEnabled','cameraBEnabled','sourceA','sourceB']) $(id).onchange=()=>state.mode === 'camera' ? startCams() : (bindVideoSources(),ensureLoop());
for(const id of ['yAxisMode','yAutoRange','yMin','yMax','relativeBaseline'])$(id).onchange=()=>chart();
for(const id of ['backgroundModeA','backgroundBlurA','backgroundColorA','backgroundModeB','backgroundBlurB','backgroundColorB'])$(id).oninput=async()=>{if(state.mode==='camera'&&!state.runtime?.backgroundPose&&['A','B'].some(camera=>$('source'+camera).value!=='pc'&&backgroundConfiguration()[camera].mode!=='original')){state.runtime??=new CameraRuntime({onError:message});await state.runtime.initExternal()}ensureLoop();publishFeedback({valid:false},true)};
for(const input of document.querySelectorAll('#variables input'))input.addEventListener('change',chart);
for(const name of colorNames){const select=$(name+'ColorPreset'),custom=$(name+'Color');for(const [key,value] of Object.entries(COLOR_PALETTE)){const option=document.createElement('option');option.value=key;option.textContent=key[0].toUpperCase()+key.slice(1);select.append(option)}const option=document.createElement('option');option.value='custom';option.textContent='Custom';select.append(option);const match=Object.entries(COLOR_PALETTE).find(([,value])=>value.toLowerCase()===custom.value.toLowerCase());select.value=match?.[0]||'custom';select.onchange=()=>{if(select.value!=='custom')custom.value=COLOR_PALETTE[select.value];applyDisplaySettings()};custom.oninput=()=>{select.value='custom';applyDisplaySettings()}}
for (const id of ['aspectA','fitA','customWidthA','customHeightA','aspectB','fitB','customWidthB','customHeightB','applyBoth','skeletonWidth','jointSize']) $(id).oninput=applyDisplaySettings;
try { const saved=JSON.parse(sessionStorage.getItem('slackline-display-settings')); if(saved) { for(const id of ['A','B']) { const d=saved.display?.[id]; if(d){ $('aspect'+id).value=d.aspect; $('fit'+id).value=d.fit; $('customWidth'+id).value=d.customWidth; $('customHeight'+id).value=d.customHeight; } } for(const [key,value] of Object.entries(saved.overlayStyle||{})){ const ids={skeletonWidth:'skeletonWidth',jointSize:'jointSize'}; if(ids[key])$(ids[key]).value=value; } for(const [name,value] of Object.entries(saved.colors||{})){if(colorNames.includes(name)){ $(name+'ColorPreset').value=value.preset; $(name+'Color').value=value.custom; }} } } catch {}
applyDisplaySettings();
$('testBeep').onclick=async()=>{await resumeAudio();playBeep($('beepType').value,Number($('beepVolume').value))}; $('testVoice').onclick=()=>playVoice(auditorySettings('voice'));
window.addEventListener('error', event => message('JavaScript error: '+event.message)); window.addEventListener('unhandledrejection', event => message('Asynchronous error: '+event.reason));

async function setupRemote() { try { const {default:Peer}=await import('https://cdn.jsdelivr.net/npm/peerjs@1.5.5/+esm'), peer=new Peer(); peer.on('open',id=>{ $('roomCode').textContent=`ROOM ${id.slice(-6).toUpperCase()}`; for(const slot of ['A','B']) { const url=new URL('./capture.html',location.href); url.searchParams.set('peer',id); url.searchParams.set('source',slot); $('link'+slot).href=url.href; const qr=$('qr'+slot); qr.replaceChildren(); if(window.QRCode)new QRCode(qr,{text:url.href,width:160,height:160}); } }); peer.on('call',call=>{ const slot=call.metadata?.source==='B'?'B':'A'; call.answer(new MediaStream()); call.on('stream',stream=>{ state.remoteStreams[slot]=stream; bindVideoSources(); $('state'+slot).textContent='Receiving video'; }); call.on('close',()=>{ $('state'+slot).textContent='Video disconnected'; state.remoteStreams[slot]=null; bindVideoSources(); for(const id of ['A','B'])if($('source'+id).value===(slot==='A'?'device1':'device2'))setVideoPresence(id,false); }); }); peer.on('connection',connection=>{ const slot=connection.metadata?.source==='B'?'B':'A'; state.connections[slot]=connection; connection.on('data',data=>{ if(data.type!=='pose')return; storeRemote(state.remote,slot,data,performance.now()); $('state'+slot).textContent=data.landmarks?'Receiving video and landmarks':'Video available / no pose detected'; ensureLoop(); }); connection.on('close',()=>{ delete state.connections[slot]; delete state.remote[slot]; $('state'+slot).textContent='Landmark reception stopped'; draw(slot,null); }); }); } catch(error) { message('PeerJS connection failed: '+error.message); } }
setupRemote();
