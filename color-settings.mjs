export const COLOR_PALETTE=Object.freeze({lime:'#b8ff32',cyan:'#59d6c7',yellow:'#f3c969',orange:'#ff9f43',red:'#ff4d5a',blue:'#4d8dff',purple:'#a875ff',white:'#ffffff'});
export function resolveColor(preset,custom){return preset==='custom'?(custom||'#ffffff'):(COLOR_PALETTE[preset]||custom||'#ffffff')}
export function colorSettings(values){const result={};for(const [name,value] of Object.entries(values))result[name]={preset:value.preset,color:resolveColor(value.preset,value.color)};return result}
