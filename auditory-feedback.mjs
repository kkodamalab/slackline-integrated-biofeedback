export const BEEP_TYPES = ['high','low','double','soft-chime','alert'];

export function triggerMatches(trigger, previousOnTarget, onTarget) {
  if (trigger === 'enter') return previousOnTarget !== true && onTarget;
  if (trigger === 'exit') return previousOnTarget === true && !onTarget;
  return trigger === 'outside' && !onTarget;
}

export function auditoryDecision(config, context, lastPlayed = -Infinity) {
  const timingAllowed = config.when === 'concurrent' ? context.recording && !context.terminal
    : config.when === 'terminal' ? context.terminal === true : false;
  const cooldown = Math.max(0, Number(config.cooldown) || 0);
  const triggered=context.terminal ? (config.trigger==='enter'?context.onTarget:!context.onTarget) : triggerMatches(config.trigger, context.previousOnTarget, context.onTarget);
  return timingAllowed && config.enabled && context.onTarget!==null && triggered
    && context.now - lastPlayed >= cooldown;
}

let sharedAudioContext;
let lastAudioError='';
export function audioStatus(){return sharedAudioContext?.state||'not initialized'}
export function audioError(){return lastAudioError}
export async function resumeAudio(AudioContextClass=globalThis.AudioContext||globalThis.webkitAudioContext) {
  if(!AudioContextClass){lastAudioError='AudioContext is unavailable';return null}
  sharedAudioContext ||= new AudioContextClass();
  if(sharedAudioContext.state==='suspended')try{await sharedAudioContext.resume()}catch(error){lastAudioError=`AudioContext resume failed: ${error.message}`;return null}
  if(sharedAudioContext.state!=='running'){lastAudioError=`AudioContext is ${sharedAudioContext.state}`;return null}lastAudioError='';
  return sharedAudioContext;
}

function tone(context, destination, frequency, start, duration, gainValue, type='sine') {
  const oscillator=context.createOscillator(), gain=context.createGain(); oscillator.type=type; oscillator.frequency.value=frequency;
  gain.gain.setValueAtTime(0,start); gain.gain.linearRampToValueAtTime(gainValue,start+.015); gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
  oscillator.connect(gain).connect(destination); oscillator.start(start); oscillator.stop(start+duration);
}

export function playBeep(type='high', volume=.5, AudioContextClass=globalThis.AudioContext||globalThis.webkitAudioContext) {
  if (!AudioContextClass){lastAudioError='AudioContext is unavailable';return false} const context=sharedAudioContext||new AudioContextClass(); sharedAudioContext=context;if(context.state!=='running'){lastAudioError=`AudioContext is ${context.state}`;context.resume?.().catch?.(error=>{lastAudioError=`AudioContext resume failed: ${error.message}`});return false} const now=context.currentTime, gain=Math.max(.0001,Math.min(1,Number(volume)))*.18;
  try{
  if(type==='low') tone(context,context.destination,220,now,.22,gain);
  else if(type==='double'){tone(context,context.destination,740,now,.1,gain);tone(context,context.destination,740,now+.14,.1,gain)}
  else if(type==='soft-chime'){tone(context,context.destination,523,now,.45,gain*.7);tone(context,context.destination,784,now+.08,.5,gain*.5)}
  else if(type==='alert'){tone(context,context.destination,330,now,.15,gain,'square');tone(context,context.destination,660,now+.16,.2,gain,'square')}
  else tone(context,context.destination,880,now,.16,gain);lastAudioError='';return true}catch(error){lastAudioError=`Beep output failed: ${error.message}`;return false}
}
export function resetAudioForTest(){sharedAudioContext=undefined;lastAudioError=''}

export function resolvePhrase(preset, custom) { return preset === 'custom' ? String(custom||'').trim() : preset; }
export function playVoice(config, speech=globalThis.speechSynthesis, Utterance=globalThis.SpeechSynthesisUtterance) {
  const phrase=resolvePhrase(config.phrase,config.customPhrase); if(!speech||!Utterance||!phrase)return false;
  const utterance=new Utterance(phrase); utterance.lang='ja-JP'; utterance.volume=Math.max(0,Math.min(1,Number(config.volume))); utterance.rate=Math.max(.5,Math.min(2,Number(config.rate))); speech.speak(utterance); return true;
}
