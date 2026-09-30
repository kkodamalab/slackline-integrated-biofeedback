export const BACKGROUND_MODES = Object.freeze(['original', 'blur', 'solid']);

export function normalizeBackground(value = {}) {
  const mode = BACKGROUND_MODES.includes(value.mode) ? value.mode : 'original';
  const blur = Math.max(0, Math.min(30, Number(value.blur) || 0));
  const color = /^#[0-9a-f]{6}$/i.test(value.color || '') ? value.color : '#101820';
  return { mode, blur, color };
}

export function serializeBackground(cameras = {}) {
  return { A: normalizeBackground(cameras.A), B: normalizeBackground(cameras.B) };
}

/** Draw a person-segmented frame. Returns false when segmentation is unavailable. */
export function compositeBackground(context, video, mask, destination, setting) {
  const config = normalizeBackground(setting);
  if (config.mode === 'original') return false;
  if (!mask || !video?.videoWidth || !destination?.drawnWidth) return false;
  let maskSource = mask;
  if (typeof mask.getAsFloat32Array === 'function' || typeof mask.getAsImageData === 'function') {
    const floats=typeof mask.getAsFloat32Array==='function'?mask.getAsFloat32Array():null;
    const sourceData=floats?null:mask.getAsImageData(), width=mask.width||sourceData.width, height=mask.height||sourceData.height;
    const data=new ImageData(width,height);
    for (let pixel = 0; pixel < width*height; pixel++) {
      const index=pixel*4, confidence=floats?floats[pixel]:sourceData.data[index]/255;
      data.data[index]=data.data[index+1]=data.data[index+2]=255;data.data[index+3]=Math.round(Math.max(0,Math.min(1,confidence))*255);
    }
    const surface = typeof OffscreenCanvas === 'function'
      ? new OffscreenCanvas(data.width, data.height)
      : Object.assign(document.createElement('canvas'), { width: data.width, height: data.height });
    surface.getContext('2d').putImageData(data, 0, 0);
    maskSource = surface;
  }
  const { offsetX, offsetY, drawnWidth, drawnHeight } = destination;
  context.save();
  context.drawImage(maskSource, offsetX, offsetY, drawnWidth, drawnHeight);
  context.globalCompositeOperation = 'source-in';
  context.drawImage(video, offsetX, offsetY, drawnWidth, drawnHeight);
  context.globalCompositeOperation = 'destination-over';
  if (config.mode === 'solid') {
    context.fillStyle = config.color;
    context.fillRect(0, 0, context.canvas.width, context.canvas.height);
  } else {
    context.filter = `blur(${config.blur}px)`;
    context.drawImage(video, offsetX, offsetY, drawnWidth, drawnHeight);
  }
  context.restore();
  return true;
}
