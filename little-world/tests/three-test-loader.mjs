// Resolve the browser import-map name without installing another Three.js copy.
export async function resolve(specifier,context,nextResolve){
 if(specifier==='three')return {url:new URL('../vendor/three.module.js',import.meta.url).href,shortCircuit:true};
 return nextResolve(specifier,context);
}
