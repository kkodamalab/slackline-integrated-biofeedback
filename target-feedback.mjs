export const TARGET_VARIABLES = Object.freeze({
  relativePhase:{label:'Relative Phase',unit:'°',min:-180,max:180,circular:true,decimals:1},
  bodyAxisHead:{label:'Body Axis',unit:'°',min:-90,max:90,decimals:1},
  leftKnee:{label:'Left Knee',unit:'°',min:0,max:180,decimals:1},
  rightKnee:{label:'Right Knee',unit:'°',min:0,max:180,decimals:1},
  leftWristY:{label:'Left Hand',unit:'',min:0,max:1,decimals:3},
  rightWristY:{label:'Right Hand',unit:'',min:0,max:1,decimals:3},
  leftAnkleY:{label:'Left Foot',unit:'',min:0,max:1,decimals:3},
  rightAnkleY:{label:'Right Foot',unit:'',min:0,max:1,decimals:3}
});

export function targetMeta(key){return TARGET_VARIABLES[key]||{label:key,unit:'',min:0,max:1,decimals:2}}
export function targetDifference(key,value,target){if(!Number.isFinite(value)||!Number.isFinite(target))return null;const difference=value-target;return targetMeta(key).circular?Math.abs(((difference+180)%360+360)%360-180):Math.abs(difference)}
export function targetInside(key,value,target,tolerance){const difference=targetDifference(key,value,target);return difference===null?null:difference<=Math.max(0,Number(tolerance)||0)}
export function targetPercent(key,value){if(!Number.isFinite(value))return null;const {min,max}=targetMeta(key);return Math.max(0,Math.min(100,(value-min)/(max-min)*100))}
export function targetSnapshot(settings,measurements,phase){const key=settings.targetVariable,meta=targetMeta(key),value=key==='relativePhase'?(phase?.valid?phase.value:null):measurements?.[key];return{key,label:meta.label,unit:meta.unit,min:meta.min,max:meta.max,decimals:meta.decimals,value:Number.isFinite(value)?value:null,target:Number(settings.target),tolerance:Number(settings.tolerance),inside:targetInside(key,value,Number(settings.target),Number(settings.tolerance))}}
