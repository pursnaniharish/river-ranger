// Tiny sound effects made with the Web Audio API (no audio files needed).
(function () {
  let ctx = null;
  let muted = false;

  function audioCtx() {
    if (!ctx) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      try { ctx = new C(); } catch (e) { return null; }
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, start, dur, type, vol, toFreq) {
    const a = audioCtx();
    if (!a) return;
    const t = a.currentTime + start;
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (toFreq) o.frequency.exponentialRampToValueAtTime(toFreq, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.18, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(a.destination);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  // [frequency, start, duration, wave, volume, glide-to frequency]
  const SOUNDS = {
    // Two rising bubble "bloops", like Trouty swimming on.
    next: [[260, 0, 0.11, 'sine', 0.2, 820], [420, 0.09, 0.13, 'sine', 0.16, 1300]],
    correct: [[660, 0, 0.12], [880, 0.1, 0.2]],
    wrong: [[240, 0, 0.22, 'square', 0.06], [190, 0.14, 0.28, 'square', 0.06]],
    click: [[540, 0, 0.06, 'triangle', 0.1]],
    flip: [[420, 0, 0.05, 'triangle', 0.08]],
    level: [[523, 0, 0.15], [659, 0.12, 0.15], [784, 0.24, 0.15], [1047, 0.36, 0.4]],
    splash: [[300, 0, 0.12, 'sawtooth', 0.04], [500, 0.08, 0.2, 'sine', 0.1], [700, 0.2, 0.25, 'sine', 0.1]]
  };

  RR.audio = {
    play(name) {
      if (muted || !SOUNDS[name]) return;
      try { SOUNDS[name].forEach(n => tone(n[0], n[1], n[2], n[3], n[4], n[5])); } catch (e) { /* ignore */ }
    },
    setMuted(m) { muted = !!m; },
    isMuted() { return muted; }
  };
})();
