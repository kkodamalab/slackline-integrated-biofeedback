export const SERIES_META = {
  leftWristY:{label:'Left hand',unit:'normalized position',range:[0,1]}, rightWristY:{label:'Right hand',unit:'normalized position',range:[0,1]},
  leftAnkleY:{label:'Left foot',unit:'normalized position',range:[0,1]}, rightAnkleY:{label:'Right foot',unit:'normalized position',range:[0,1]},
  leftWristVelocity:{label:'Left hand velocity',unit:'normalized position/s'}, rightWristVelocity:{label:'Right hand velocity',unit:'normalized position/s'},
  leftAnkleVelocity:{label:'Left foot velocity',unit:'normalized position/s'}, rightAnkleVelocity:{label:'Right foot velocity',unit:'normalized position/s'},
  bodyAxisHead:{label:'Body axis',unit:'degree',range:[-180,180]}, bodyAxisShoulder:{label:'Shoulder body axis',unit:'degree',range:[-180,180]},
  leftKnee:{label:'Left knee',unit:'degree',range:[0,180]}, rightKnee:{label:'Right knee',unit:'degree',range:[0,180]}, relativePhase:{label:'Relative phase',unit:'degree',range:[-180,180]}
};

export function transformSeries(values, mode='absolute', baselineMode='window', trialBaseline=null) {
  const valid=values.filter(Number.isFinite);
  if(mode==='absolute') return values.slice();
  if(mode==='relative') {
    const baseline=baselineMode==='trial'&&Number.isFinite(trialBaseline)?trialBaseline:valid[0];
    return values.map(value=>Number.isFinite(value)&&Number.isFinite(baseline)?value-baseline:null);
  }
  if(mode==='zscore') {
    if(valid.length<2)return values.map(()=>null);
    const mean=valid.reduce((sum,value)=>sum+value,0)/valid.length;
    const sd=Math.sqrt(valid.reduce((sum,value)=>sum+(value-mean)**2,0)/valid.length);
    if(!Number.isFinite(sd)||sd===0)return values.map(()=>null);
    return values.map(value=>Number.isFinite(value)?(value-mean)/sd:null);
  }
  return values.map(()=>null);
}

export function mixedUnits(series) { return new Set(series.map(key=>SERIES_META[key]?.unit).filter(Boolean)).size>1; }
