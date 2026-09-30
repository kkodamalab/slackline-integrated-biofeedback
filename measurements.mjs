export const VISIBILITY_THRESHOLD = 0.5;
const pair = (a,b) => a && b && (a.visibility ?? 1) >= VISIBILITY_THRESHOLD && (b.visibility ?? 1) >= VISIBILITY_THRESHOLD ? {x:(a.x+b.x)/2,y:(a.y+b.y)/2,visibility:Math.min(a.visibility??1,b.visibility??1)} : null;
const point = p => p && (p.visibility ?? 1) >= VISIBILITY_THRESHOLD ? { x:p.x, y:p.y, visibility:p.visibility ?? 1 } : null;
const angle = (a,b,c) => { if (![a,b,c].every(Boolean)) return null; const d=Math.hypot(a.x-b.x,a.y-b.y)*Math.hypot(c.x-b.x,c.y-b.y); return d ? Math.acos(Math.max(-1,Math.min(1,((a.x-b.x)*(c.x-b.x)+(a.y-b.y)*(c.y-b.y))/d)))*180/Math.PI : null; };
const tilt = (top,bottom) => top && bottom ? Math.atan2(bottom.x-top.x,bottom.y-top.y)*180/Math.PI : null;
export function measurePose(l, previous, time) {
  if (!l?.length || l.length < 33) return { missing:true, confidence:null };
  const headPoints=[0,7,8].map(i=>point(l[i])).filter(Boolean); const head=headPoints.length ? {x:headPoints.reduce((s,p)=>s+p.x,0)/headPoints.length,y:headPoints.reduce((s,p)=>s+p.y,0)/headPoints.length} : null;
  const shoulder=pair(l[11],l[12]), pelvis=pair(l[23],l[24]);
  const position = i => point(l[i]); const velocity=(p,key)=>p&&previous?.[key]&&time>previous.time ? (p.y-previous[key].y)/((time-previous.time)/1000) : null;
  const leftWrist=position(15),rightWrist=position(16),leftAnkle=position(27),rightAnkle=position(28);
  return {missing:false,time,leftWrist,rightWrist,leftAnkle,rightAnkle,leftWristY:leftWrist?.y??null,rightWristY:rightWrist?.y??null,leftAnkleY:leftAnkle?.y??null,rightAnkleY:rightAnkle?.y??null,leftWristVelocity:velocity(leftWrist,'leftWrist'),rightWristVelocity:velocity(rightWrist,'rightWrist'),leftAnkleVelocity:velocity(leftAnkle,'leftAnkle'),rightAnkleVelocity:velocity(rightAnkle,'rightAnkle'),bodyAxisHead:tilt(head,pelvis),bodyAxisShoulder:tilt(shoulder,pelvis),leftKnee:angle(point(l[23]),point(l[25]),point(l[27])),rightKnee:angle(point(l[24]),point(l[26]),point(l[28])),confidence:Math.min(...[0,7,8,11,12,15,16,23,24,25,26,27,28].map(i=>l[i]?.visibility??0))};
}
