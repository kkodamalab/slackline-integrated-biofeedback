import { CameraRuntime } from './camera-runtime.js';
import { mapCover } from './geometry.mjs';
import { storeRemote, currentRemote } from './remote-state.mjs';
import { measurePose } from './measurements.mjs';
import { circularMeanDegrees, relativePhase, wrapDegrees } from './phase.mjs';
import { appendBounded, cameraPhaseObservation, participantFeedbackVisible } from './monitor-state.mjs';
import './qr-init.js';

const $ = id => document.getElementById(id);
const nowIso = () => new Date().toISOString();
const sessionId = crypto.randomUUID();
const state = {
  mode: 'idle', looping: false, recording: false, samples: [], phaseWindow: [], displayHistory: [],
  runtime: null, remote: { A: null, B: null }, connections: {}, previous: { A: null, B: null },
  trialStarted: null, terminalResult: null
};
const edges = [[11,12],[23,24],[11,13],[13,15],[12,14],[14,16],[11,23],[12,24],[23,25],[25,27],[24,26],[26,28]];
const settings = () => ({
  when: $('when').value, what: $('what').value, amount: $('amount').value, how: $('how').value,
  variables: [...document.querySelectorAll('#variables input:checked')].map(x => x.value), side: $('side').value,
  target: Number($('target').value), tolerance: Number($('tolerance').value), sourceA: $('sourceA').value,
  sourceB: $('sourceB').value, cameraAEnabled: $('cameraAEnabled').checked, cameraBEnabled: $('cameraBEnabled').checked
});
const message = text => { $('notice').textContent = text; };
const midpoint = (a, b) => a && b ? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } : null;

function setVideoPresence(id, present) {
  $('placeholder' + id).classList.toggle('video-present', present);
  $(id.toLowerCase() + 'State').textContent = present ? '● LIVE' : '● WAITING';
}

function draw(id, landmarks, meta = {}) {
  const canvas = $('canvas' + id), context = canvas.getContext('2d'), video = $('video' + id), dpr = devicePixelRatio;
  canvas.width = Math.max(1, canvas.clientWidth * dpr); canvas.height = Math.max(1, canvas.clientHeight * dpr);
  context.clearRect(0, 0, canvas.width, canvas.height);
  video.style.visibility = $("camera" + id + "Video").checked ? 'visible' : 'hidden';
  if (!landmarks) return;
  const point = value => mapCover(value, meta.videoWidth || video.videoWidth || canvas.width, meta.videoHeight || video.videoHeight || canvas.height, canvas.width, canvas.height, !!meta.mirror);
  if ($('camera' + id + 'Skeleton').checked) {
    context.strokeStyle = '#59d6c7'; context.lineWidth = 2 * dpr;
    for (const [a, b] of edges) {
      if ((landmarks[a]?.visibility ?? 0) < .5 || (landmarks[b]?.visibility ?? 0) < .5) continue;
      const x = point(landmarks[a]), y = point(landmarks[b]); context.beginPath(); context.moveTo(x.x, x.y); context.lineTo(y.x, y.y); context.stroke();
    }
  }
  if ($('camera' + id + 'Axis').checked) {
    const shoulders = midpoint(landmarks[11], landmarks[12]), hips = midpoint(landmarks[23], landmarks[24]);
    if (shoulders && hips) {
      context.lineWidth = 2 * dpr; context.strokeStyle = '#f3c969'; context.beginPath();
      context.moveTo(canvas.width / 2, 0); context.lineTo(canvas.width / 2, canvas.height); context.stroke();
      context.strokeStyle = '#59d6c7'; const x = point(shoulders), y = point(hips); context.beginPath();
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
  if (settings()['source' + id] === 'remote') return currentRemote(state.remote, id, time) || {};
  return { landmarks: state.runtime?.landmarks[id] || null, receivedAt: time, timestamp: state.runtime?.timestamps[id], meta: { videoWidth: $('video' + id).videoWidth, videoHeight: $('video' + id).videoHeight } };
}

function chart() {
  const canvas = $('phaseChart'), context = canvas.getContext('2d'), dpr = devicePixelRatio, rows = state.displayHistory;
  canvas.width = canvas.clientWidth * dpr; canvas.height = canvas.clientHeight * dpr; context.clearRect(0, 0, canvas.width, canvas.height);
  if (rows.length < 2) return;
  const line = (key, color, min, max) => { context.strokeStyle = color; context.lineWidth = 2 * dpr; context.beginPath(); let started = false; rows.forEach((row, i) => { const value = row[key]; if (!Number.isFinite(value)) { started = false; return; } const x = i / (rows.length - 1) * canvas.width, y = (1 - (value - min) / (max - min)) * canvas.height; started ? context.lineTo(x,y) : context.moveTo(x,y); started = true; }); context.stroke(); };
  line('leftWristY', '#b8ff32', 0, 1); line('rightWristY', '#59d6c7', 0, 1); line('relativePhase', '#f3c969', -180, 180);
}

function updateResearchMonitor(phase) {
  const s = settings(), targetPercent = (wrapDegrees(s.target) + 180) / 360 * 100, tolerancePercent = Math.min(50, Math.max(0, s.tolerance / 360 * 100));
  $('phaseTarget').style.left = targetPercent + '%'; $('phaseTolerance').style.left = Math.max(0, targetPercent - tolerancePercent) + '%';
  $('phaseTolerance').style.width = Math.min(100 - Math.max(0, targetPercent - tolerancePercent), tolerancePercent * 2) + '%';
  $('phaseTargetLabel').textContent = `${s.target}°`; $('phaseToleranceLabel').textContent = `${s.tolerance}°`;
  $('monitorPhaseValue').textContent = phase.valid ? `${phase.value.toFixed(1)}°` : '—'; $('phaseNeedle').hidden = !phase.valid;
  if (phase.valid) $('phaseNeedle').style.left = (phase.value + 180) / 360 * 100 + '%';
  $('phaseGauge').setAttribute('aria-valuenow', phase.valid ? phase.value.toFixed(1) : '');
}

function feedback(phase, measurement) {
  const s = settings(), visible = participantFeedbackVisible(s.when, state.recording, state.terminalResult);
  $('feedback').hidden = !visible;
  if (s.when === 'concurrent' && state.recording) {
    $('phaseValue').textContent = phase.valid ? `${phase.value.toFixed(1)}°` : '—';
    $('detail').textContent = s.amount === 'detailed' && phase.valid ? `目標 ${s.target}° / 誤差 ${wrapDegrees(phase.value - s.target).toFixed(1)}° / 信頼性 ${(measurement.confidence ?? 0).toFixed(2)}` : '';
    if (phase.valid) message(Math.abs(wrapDegrees(phase.value - s.target)) <= s.tolerance ? '目標範囲内' : '目標範囲外');
  }
  $('feedbackTitle').textContent = s.what === 'kr' ? '結果（相対位相）' : '過程（左右手の協調）';
  document.querySelector('.depth-dial')?.classList.toggle('compact', s.how !== 'gauge');
  for (const connection of Object.values(state.connections)) if (connection?.open) connection.send({ type: 'feedback', visible, value: phase.valid ? phase.value : null, target: s.target, tolerance: s.tolerance, what: s.what, amount: s.amount, how: s.how });
}

function frame(time) {
  if (!state.looping) return;
  const inputs = { A: source('A', time), B: source('B', time) }, measures = {};
  for (const id of ['A','B']) {
    draw(id, inputs[id].landmarks, inputs[id].meta); measures[id] = measurePose(inputs[id].landmarks, state.previous[id], time);
    if (!measures[id].missing) state.previous[id] = measures[id]; $('readout' + id).textContent = inputs[id].landmarks ? '検出' : '未検出';
  }
  appendBounded(state.phaseWindow, cameraPhaseObservation(time, measures.A));
  const phase = relativePhase(state.phaseWindow), a = measures.A;
  appendBounded(state.displayHistory, { leftWristY: a.leftWristY, rightWristY: a.rightWristY, relativePhase: phase.valid ? phase.value : null });
  $('trunkValue').textContent = a.bodyAxisHead == null ? '—' : a.bodyAxisHead.toFixed(1) + '°'; $('kneeValue').textContent = measures.B.leftKnee == null ? '—' : measures.B.leftKnee.toFixed(1) + '°';
  $('confValue').textContent = a.confidence == null ? '—' : a.confidence.toFixed(2); $('syncValue').textContent = inputs.A.timestamp && inputs.B.timestamp ? Math.abs(inputs.A.timestamp - inputs.B.timestamp) + ' ms' : '—';
  if (state.recording) {
    const s = settings(); state.samples.push({ sessionId, trial: $('trial').value, condition: $('condition').value, memo: $('memo').value, wallTime: nowIso(), monotonicTime: time, mode: state.mode, sourceA: s.sourceA, sourceB: s.sourceB, cameraA: inputs.A.meta, cameraB: inputs.B.meta, ...a, relativePhase: phase.valid ? phase.value : null, phaseReason: phase.valid ? '' : phase.reason, missingA: measures.A.missing, missingB: measures.B.missing, freshnessA: inputs.A.receivedAt ? time-inputs.A.receivedAt : null, freshnessB: inputs.B.receivedAt ? time-inputs.B.receivedAt : null, timeDifference: inputs.A.timestamp && inputs.B.timestamp ? inputs.A.timestamp-inputs.B.timestamp : null, bf: s });
    if (state.samples.length > 20000) state.samples.shift();
  }
  updateResearchMonitor(phase); feedback(phase, a); if (time % 100 < 18) chart(); requestAnimationFrame(frame);
}

function ensureLoop() { if (!state.looping) { state.looping = true; requestAnimationFrame(frame); } }
function stopInputs() { state.runtime?.stop(); state.runtime = null; state.looping = false; for (const id of ['A','B']) { draw(id, null); setVideoPresence(id, false); } }
async function startCams() { stopInputs(); state.mode = 'camera'; state.runtime = new CameraRuntime({ onState: (id,text) => { $(id.toLowerCase()+'State').textContent = text; }, onError: message, onVideo: setVideoPresence, onFrame: (id,lm) => { if (!lm) draw(id,null); } }); if (await state.runtime.start({ A: $('cameraAEnabled').checked, B: $('cameraBEnabled').checked })) ensureLoop(); }
function startSim() { stopInputs(); state.mode = 'sim'; $('simulationBadge').hidden = false; for (const id of ['A','B']) setVideoPresence(id, true); message('SIMULATION：模擬データは実測値ではありません'); ensureLoop(); }
function startTrial() { state.samples = []; state.phaseWindow = []; state.recording = true; state.terminalResult = null; state.trialStarted = nowIso(); $('modeStatus').textContent = '計測中'; $('phaseValue').textContent = '—'; ensureLoop(); message('新しい試行を開始しました'); }
function stopTrial() { state.recording = false; $('modeStatus').textContent = '停止'; if (settings().when === 'terminal') { const valid = state.samples.map(x => x.relativePhase).filter(Number.isFinite), mean = circularMeanDegrees(valid); state.terminalResult = mean ?? Number.NaN; $('feedback').hidden = false; $('phaseValue').textContent = mean == null ? '算出不能' : mean.toFixed(1) + '°'; $('detail').textContent = ''; message(`Terminal KR：試行 ${$('trial').value} / 有効 ${valid.length} samples`); } }
function reset() { state.recording = false; state.samples = []; state.phaseWindow = []; state.displayHistory = []; state.previous = { A:null, B:null }; state.terminalResult = null; $('phaseValue').textContent = '—'; chart(); message('試行データをリセットしました'); }
function download(kind) { const meta = { sessionId, trialStarted: state.trialStarted, exportedAt: nowIso(), settings: settings(), samples: state.samples }; let body,type; if (kind === 'json') { body=JSON.stringify(meta,null,2); type='application/json'; } else { const flat=state.samples.map(x=>({...x,cameraA:JSON.stringify(x.cameraA),cameraB:JSON.stringify(x.cameraB),bf:JSON.stringify(x.bf)})),keys=[...new Set(flat.flatMap(Object.keys))]; body='\ufeff'+keys.join(',')+'\n'+flat.map(row=>keys.map(key=>`"${String(row[key]??'').replaceAll('"','""')}"`).join(',')).join('\n'); type='text/csv'; } const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([body],{type})); a.download=`slackline-${sessionId}-${$('trial').value}.${kind}`; a.click(); URL.revokeObjectURL(a.href); }

$('startCams').onclick=startCams; $('stopAll').onclick=stopInputs; $('startSim').onclick=startSim; $('startTrial').onclick=startTrial; $('stopTrial').onclick=stopTrial; $('resetTrial').onclick=reset; $('downloadCsv').onclick=()=>download('csv'); $('downloadJson').onclick=()=>download('json'); $('fullscreen').onclick=()=>document.documentElement.requestFullscreen?.();
for (const id of ['A','B']) { $('camera'+id+'Video').onchange = () => draw(id, source(id, performance.now()).landmarks); $('camera'+id+'Axis').onchange = $('camera'+id+'Skeleton').onchange = () => ensureLoop(); const video=$('video'+id); video.addEventListener('playing',()=>setVideoPresence(id,true)); video.addEventListener('emptied',()=>setVideoPresence(id,false)); }
for (const id of ['when','how','target','tolerance']) $(id).onchange=()=>ensureLoop();
for (const id of ['cameraAEnabled','cameraBEnabled']) $(id).onchange=()=>state.mode === 'camera' ? startCams() : ensureLoop();
window.addEventListener('error', event => message('JavaScriptエラー: '+event.message)); window.addEventListener('unhandledrejection', event => message('非同期エラー: '+event.reason));

async function setupRemote() { try { const {default:Peer}=await import('https://cdn.jsdelivr.net/npm/peerjs@1.5.5/+esm'), peer=new Peer(); peer.on('open',id=>{ $('roomCode').textContent=`ROOM ${id.slice(-6).toUpperCase()}`; for(const slot of ['A','B']) { const url=new URL('./capture.html',location.href); url.searchParams.set('peer',id); url.searchParams.set('source',slot); $('link'+slot).href=url.href; const qr=$('qr'+slot); qr.replaceChildren(); if(window.QRCode)new QRCode(qr,{text:url.href,width:160,height:160}); } }); peer.on('call',call=>{ const slot=call.metadata?.source==='B'?'B':'A'; call.answer(new MediaStream()); call.on('stream',stream=>{ const video=$('video'+slot); video.srcObject=stream; video.play().then(()=>setVideoPresence(slot,true)).catch(()=>{}); $('state'+slot).textContent='映像受信中'; }); call.on('close',()=>{ $('state'+slot).textContent='映像切断'; const video=$('video'+slot); video.srcObject=null; setVideoPresence(slot,false); }); }); peer.on('connection',connection=>{ const slot=connection.metadata?.source==='B'?'B':'A'; state.connections[slot]=connection; connection.on('data',data=>{ if(data.type!=='pose')return; storeRemote(state.remote,slot,data,performance.now()); $('state'+slot).textContent=data.landmarks?'映像・ランドマーク受信中':'映像あり・未検出'; ensureLoop(); }); connection.on('close',()=>{ delete state.connections[slot]; delete state.remote[slot]; $('state'+slot).textContent='ランドマーク受信停止'; draw(slot,null); }); }); } catch(error) { message('PeerJS接続失敗: '+error.message); } }
setupRemote();
