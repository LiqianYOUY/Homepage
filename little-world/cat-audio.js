/** A quiet synthesized cat voice; no recordings, downloads, or autoplay. */
export function createCatAudio({getMuted = () => false,onVoice} = {}) {
  let context = null, master = null, unlocked = false, disposed = false, lastVoice = -Infinity, lastMuted = null;
  const voices = new Set();
  let gestureAuthorized = false, pendingVoice = null;
  const muted = () => {try{return !!getMuted();}catch{return true;}};
  function unlockFromGesture(event) {
    if (disposed || (unlocked && context?.state === 'running')) return;
    // Browsers can suspend an unlocked context when the tab loses focus.
    // A fresh trusted gesture should resume the same context.
    if (context?.state !== 'running') unlocked = false;
    const active = event?.isTrusted === true || globalThis.navigator?.userActivation?.isActive === true;
    if (!active) return;
    gestureAuthorized = true;
    const AudioContext = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AudioContext) return;
    try {
      if (!context) {context = new AudioContext(); master = context.createGain(); master.gain.value = muted() ? 0 : .62; master.connect(context.destination);}
      context.resume().then(() => {if (!disposed) {unlocked = context.state === 'running';const pending=pendingVoice;pendingVoice=null;if(unlocked&&pending)meow(pending);}}).catch(() => {});
      unlocked = context.state === 'running';
    } catch { /* Sound is optional; all visual actions remain available. */ }
  }
  function meow({soft = true} = {}) {
    unlockFromGesture();
    if (muted() || disposed) return false;
    if (!unlocked || !context || context.state !== 'running') {if(gestureAuthorized&&context)pendingVoice={soft};return false;}
    const t = context.currentTime;
    if (t - lastVoice < 12) return false;
    lastVoice = t;
    onVoice?.({duration:.76,time:t});
    const amp = context.createGain(), filter = context.createBiquadFilter();
    filter.type = 'lowpass'; filter.frequency.setValueAtTime(1500, t); filter.Q.value = .8;
    amp.gain.setValueAtTime(0, t); amp.gain.linearRampToValueAtTime(soft ? .026 : .038, t + .10);
    amp.gain.exponentialRampToValueAtTime(.014, t + .36); amp.gain.exponentialRampToValueAtTime(.0001, t + .72);
    amp.connect(filter); filter.connect(master);
    const fundamental = 520 + Math.random() * 55;
    const oscillators = [context.createOscillator(), context.createOscillator()];
    oscillators.forEach((o, i) => {
      o.type = i ? 'sine' : 'triangle';
      const ratio = i ? 1.008 : 1;
      o.frequency.setValueAtTime(fundamental * ratio, t);
      o.frequency.exponentialRampToValueAtTime(fundamental * 1.40 * ratio, t + .14);
      o.frequency.exponentialRampToValueAtTime(fundamental * .90 * ratio, t + .40);
      o.frequency.exponentialRampToValueAtTime(fundamental * .70 * ratio, t + .72);
      o.connect(amp); o.start(t); o.stop(t + .76); voices.add(o);
      o.onended = () => {voices.delete(o); o.disconnect(); if (i) {amp.disconnect(); filter.disconnect();}};
    });
    return true;
  }
  function update() {const value=muted();if (master && context && value!==lastMuted) {master.gain.setTargetAtTime(value ? 0 : .62, context.currentTime, .04);lastMuted=value;}}
  function dispose() {
    disposed = true; pendingVoice = null;
    globalThis.document?.removeEventListener('pointerdown', unlockFromGesture, true);
    globalThis.document?.removeEventListener('keydown', unlockFromGesture, true);
    voices.forEach(o => {try{o.stop();}catch{}}); voices.clear();
    if (context) context.close().catch(() => {});
  }
  globalThis.document?.addEventListener('pointerdown', unlockFromGesture, {capture:true, passive:true});
  globalThis.document?.addEventListener('keydown', unlockFromGesture, {capture:true});
  return {unlockFromGesture, meow, update, dispose, isUnlocked: () => unlocked, isMuted: muted};
}
