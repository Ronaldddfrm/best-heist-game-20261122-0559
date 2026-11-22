// audio.js — tiny synthesised WebAudio bleeps. No audio files, no network.
// Everything is created lazily on the first user gesture, and every call is
// guarded so a headless browser without audio never breaks the game.
export function createAudio() {
  let ctx = null;

  function ensure() {
    if (ctx) return ctx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    } catch {
      return null;
    }
    return ctx;
  }

  function blip(freq, seconds, type, gainValue, when = 0) {
    const ac = ensure();
    if (!ac) return;
    try {
      if (ac.state === 'suspended') ac.resume().catch(() => {});
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      const t = ac.currentTime + when;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(gainValue, t + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + seconds);
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start(t);
      osc.stop(t + seconds + 0.05);
    } catch {
      // Silence is fine; the game must never depend on sound.
    }
  }

  return {
    unlock() { ensure(); },
    grab() { blip(660, 0.12, 'sine', 0.12); blip(990, 0.14, 'sine', 0.1, 0.07); },
    smash() { blip(180, 0.16, 'square', 0.08); blip(120, 0.2, 'square', 0.07, 0.05); },
    coin() { blip(1320, 0.1, 'triangle', 0.12); blip(1760, 0.12, 'triangle', 0.09, 0.06); },
    spotted() { blip(220, 0.22, 'sawtooth', 0.14); blip(165, 0.3, 'sawtooth', 0.13, 0.14); },
    vault() { blip(523, 0.12, 'sine', 0.12); blip(659, 0.12, 'sine', 0.12, 0.1); blip(784, 0.22, 'sine', 0.12, 0.2); },
    exitOpen() { blip(392, 0.14, 'sine', 0.1); blip(523, 0.2, 'sine', 0.1, 0.1); },
    win() { [523, 659, 784, 1047].forEach((f, i) => blip(f, 0.22, 'sine', 0.12, i * 0.11)); },
    caught() { blip(330, 0.25, 'sawtooth', 0.12); blip(220, 0.35, 'sawtooth', 0.12, 0.18); blip(147, 0.5, 'sawtooth', 0.12, 0.36); },
  };
}
