class SoundManager {
  constructor() {
    this.ctx = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.musicPlaying = false;
    this.musicTimer = null;
    this.musicNodes = [];
    this.muted = false;
    this.musicMuted = false;
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.35;
    this.musicGain.connect(this.ctx.destination);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.7;
    this.sfxGain.connect(this.ctx.destination);

    // iOS unlock: resume + play a silent buffer in the same user gesture.
    // This is the only reliable way to unlock audio on iOS Safari.
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    const silent = this.ctx.createBuffer(1, 1, this.ctx.sampleRate);
    const src = this.ctx.createBufferSource();
    src.buffer = silent;
    src.connect(this.ctx.destination);
    src.start(0);
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.sfxGain) this.sfxGain.gain.value = this.muted ? 0 : 0.7;
    return this.muted;
  }

  toggleMusic() {
    this.musicMuted = !this.musicMuted;
    if (this.musicGain) this.musicGain.gain.value = this.musicMuted ? 0 : 0.35;
    if (!this.musicMuted && !this.musicPlaying) this.startMusic();
    return this.musicMuted;
  }

  _tone(freq, duration, type = 'sine', vol = 0.5, delay = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + duration + 0.05);
  }

  _noise(duration, vol = 0.2, delay = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.5;
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    source.start(t);
  }

  // --- Music helpers (play into musicGain) ---

  _musicTone(freq, duration, type, vol, time) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    osc.connect(gain);
    gain.connect(this.musicGain);
    osc.start(time);
    osc.stop(time + duration + 0.02);
    this.musicNodes.push(osc);
  }

  _musicNoise(duration, vol, time, cutoff = 8000) {
    if (!this.ctx) return;
    const len = this.ctx.sampleRate * duration;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    const flt = this.ctx.createBiquadFilter();
    flt.type = 'highpass';
    flt.frequency.value = cutoff;
    src.connect(flt);
    flt.connect(gain);
    gain.connect(this.musicGain);
    src.start(time);
    this.musicNodes.push(src);
  }

  // --- Sound Effects ---

  roundStart() {
    this._tone(523.25, 0.2, 'sine', 0.6, 0);
    this._tone(659.25, 0.2, 'sine', 0.6, 0.12);
    this._tone(783.99, 0.35, 'sine', 0.7, 0.24);
  }

  bidSubmit() {
    this._tone(880, 0.1, 'sine', 0.5, 0);
    this._tone(1100, 0.15, 'sine', 0.5, 0.07);
  }

  timerTick() {
    this._tone(600, 0.06, 'square', 0.2, 0);
  }

  timerUrgent() {
    this._tone(800, 0.1, 'square', 0.35, 0);
  }

  reveal() {
    this._tone(440, 0.15, 'sine', 0.5, 0);
    this._tone(554.37, 0.15, 'sine', 0.5, 0.12);
    this._tone(659.25, 0.25, 'sine', 0.6, 0.24);
    this._noise(0.2, 0.15, 0.18);
  }

  win() {
    this._tone(523.25, 0.15, 'sine', 0.6, 0);
    this._tone(659.25, 0.15, 'sine', 0.6, 0.12);
    this._tone(783.99, 0.15, 'sine', 0.6, 0.24);
    this._tone(1046.5, 0.5, 'sine', 0.7, 0.36);
  }

  coinGain() {
    this._tone(1200, 0.08, 'sine', 0.5, 0);
    this._tone(1500, 0.08, 'sine', 0.5, 0.06);
    this._tone(1800, 0.12, 'sine', 0.6, 0.12);
  }

  coinLoss() {
    this._tone(400, 0.2, 'sawtooth', 0.3, 0);
    this._tone(300, 0.25, 'sawtooth', 0.25, 0.12);
  }

  bonusCoin() {
    this._tone(1000, 0.1, 'sine', 0.4, 0);
    this._tone(1200, 0.12, 'sine', 0.4, 0.08);
  }

  gameOver() {
    this._tone(523.25, 0.35, 'sine', 0.6, 0);
    this._tone(493.88, 0.35, 'sine', 0.6, 0.35);
    this._tone(440, 0.35, 'sine', 0.6, 0.7);
    this._tone(392, 0.7, 'sine', 0.7, 1.05);
  }

  crashStart() {
    this._tone(200, 0.35, 'sine', 0.4, 0);
    this._tone(250, 0.35, 'sine', 0.4, 0.18);
    this._tone(300, 0.45, 'sine', 0.5, 0.36);
  }

  crashTick(multiplier) {
    const freq = 200 + multiplier * 120;
    this._tone(Math.min(freq, 2000), 0.05, 'sine', 0.15, 0);
  }

  cashOut() {
    this._tone(800, 0.12, 'sine', 0.6, 0);
    this._tone(1000, 0.12, 'sine', 0.6, 0.1);
    this._tone(1200, 0.18, 'sine', 0.6, 0.2);
    this._tone(1600, 0.3, 'sine', 0.7, 0.3);
  }

  crashBoom() {
    this._noise(0.7, 0.6, 0);
    this._tone(150, 0.5, 'sawtooth', 0.5, 0);
    this._tone(80, 0.7, 'sawtooth', 0.4, 0.25);
  }

  slotSpin() {
    // Rising whir sound
    for (let i = 0; i < 8; i++) {
      this._tone(300 + i * 50, 0.08, 'square', 0.15, i * 0.06);
    }
  }

  slotStop() {
    // Mechanical click-thunk
    this._tone(600, 0.06, 'square', 0.4, 0);
    this._noise(0.08, 0.3, 0.02);
  }

  slotWin() {
    // Jackpot fanfare
    this._tone(523.25, 0.15, 'sine', 0.6, 0);
    this._tone(659.25, 0.15, 'sine', 0.6, 0.1);
    this._tone(783.99, 0.15, 'sine', 0.6, 0.2);
    this._tone(1046.5, 0.2, 'sine', 0.7, 0.3);
    this._tone(1318.5, 0.3, 'sine', 0.7, 0.4);
    this._tone(1568, 0.5, 'sine', 0.8, 0.5);
    this._noise(0.15, 0.2, 0.3);
  }

  tieBreakAnnounce() {
    // Dramatic "dun dun dun!" announcement sting
    this._tone(220, 0.3, 'sawtooth', 0.4, 0);
    this._tone(220, 0.3, 'sawtooth', 0.4, 0.35);
    this._tone(165, 0.6, 'sawtooth', 0.5, 0.7);
    this._noise(0.4, 0.2, 0);
  }

  tieBreakTick() {
    // Countdown beep
    this._tone(500, 0.15, 'sine', 0.5, 0);
  }

  tieBreakSpin() {
    // Quick tick sound for spinner
    this._tone(700, 0.04, 'square', 0.25, 0);
    this._noise(0.02, 0.08, 0);
  }

  tieBreakWin() {
    // Triumphant fanfare for tie-break winner
    this._tone(523.25, 0.15, 'sine', 0.6, 0);
    this._tone(659.25, 0.15, 'sine', 0.6, 0.12);
    this._tone(783.99, 0.15, 'sine', 0.6, 0.24);
    this._tone(1046.5, 0.2, 'sine', 0.7, 0.36);
    this._tone(1318.5, 0.4, 'sine', 0.8, 0.48);
    this._noise(0.15, 0.2, 0.36);
  }

  roundAnnounce() {
    // Quick upbeat chime for round transition
    this._tone(440, 0.12, 'sine', 0.5, 0);
    this._tone(554.37, 0.12, 'sine', 0.5, 0.1);
    this._tone(659.25, 0.18, 'sine', 0.6, 0.2);
  }

  // --- Background Music: "The Entertainer" by Scott Joplin ---

  startMusic() {
    if (!this.ctx || this.musicPlaying) return;

    // On iOS the context may still be resuming — wait for it
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().then(() => this.startMusic());
      return;
    }

    this.musicPlaying = true;

    // "The Entertainer" - iconic A theme
    // BPM ~140 in ragtime style (each beat is an eighth note feel)
    const BPM = 140;
    const beatSec = 60 / BPM; // quarter note
    const e = beatSec / 2;    // eighth note

    // Note frequencies (C4 = 261.63)
    const N = {
      D3: 146.83, E3: 164.81, G3: 196, A3: 220, B3: 246.94,
      C4: 261.63, Cs4: 277.18, D4: 293.66, Ds4: 311.13, E4: 329.63,
      F4: 349.23, Fs4: 369.99, G4: 392, Gs4: 415.30, A4: 440,
      As4: 466.16, B4: 493.88,
      C5: 523.25, Cs5: 554.37, D5: 587.33, Ds5: 622.25, E5: 659.25,
      F5: 698.46, G5: 783.99, A5: 880,
      C3: 130.81, F3: 174.61, Fs3: 185,
      C2: 65.41, D2: 73.42, E2: 82.41, F2: 87.31, G2: 98, A2: 110, B2: 123.47,
    };

    // The Entertainer A section melody as [freq, duration_in_eighths]
    // Pickup + 4 bars of the famous intro theme
    const melody = [
      // Pickup notes
      [N.D4, 1], [N.Ds4, 1], [N.E4, 1],
      // Bar 1
      [N.C5, 2], [N.E4, 1], [N.C5, 2], [N.E4, 1], [N.C5, 3],
      // Bar 2
      [N.G4, 1], [N.Fs4, 1], [N.G4, 1], [N.C5, 2], [N.D5, 1], [N.Ds5, 1], [N.E5, 1],
      // Bar 3
      [N.C5, 2], [N.D5, 1], [N.E5, 3], [N.B4, 1], [N.D5, 2],
      // Bar 4
      [N.C5, 4], [0, 2], [N.D4, 1], [N.Ds4, 1],
      // Bar 5 (repeat of intro with variation)
      [N.E4, 1], [N.C5, 2], [N.E4, 1], [N.C5, 2], [N.E4, 1], [N.C5, 3],
      // Bar 6
      [N.A4, 1], [N.G4, 1], [N.Fs4, 1], [N.A4, 1], [N.C5, 2], [N.E5, 2],
      // Bar 7
      [N.D5, 2], [N.C5, 1], [N.A4, 1], [N.D5, 2], [N.C5, 2],
      // Bar 8
      [N.A4, 4], [0, 2], [N.D4, 1], [N.Ds4, 1],
    ];

    // Bass pattern (oom-pah style) - simple C and G bass
    const bassChords = [
      // Each entry: [bassNote, chordNotes[], beats]
      { bass: N.C3, chord: [N.E3, N.G3], beats: 8 },     // Bar 1
      { bass: N.C3, chord: [N.E3, N.G3], beats: 8 },     // Bar 2
      { bass: N.G2, chord: [N.B3, N.D4], beats: 4 },     // Bar 3 first half
      { bass: N.C3, chord: [N.E3, N.G3], beats: 4 },     // Bar 3 second half
      { bass: N.C3, chord: [N.E3, N.G3], beats: 8 },     // Bar 4
      { bass: N.C3, chord: [N.E3, N.G3], beats: 8 },     // Bar 5
      { bass: N.F2, chord: [N.A3, N.C4], beats: 4 },     // Bar 6 first half
      { bass: N.C3, chord: [N.E3, N.G3], beats: 4 },     // Bar 6 second half
      { bass: N.G2, chord: [N.B3, N.D4], beats: 4 },     // Bar 7 first half
      { bass: N.C3, chord: [N.E3, N.G3], beats: 4 },     // Bar 7 second half
      { bass: N.C3, chord: [N.E3, N.G3], beats: 8 },     // Bar 8
    ];

    // Total eighths in the melody
    let totalEighths = 0;
    for (const [, dur] of melody) totalEighths += dur;

    const loopDuration = totalEighths * e;

    const scheduleLoop = () => {
      if (!this.musicPlaying || !this.ctx) return;

      const now = this.ctx.currentTime + 0.05;

      // Schedule melody (piano-like tone)
      let t = now;
      for (const [freq, dur] of melody) {
        const noteDur = dur * e;
        if (freq > 0) {
          // Main piano tone (triangle for mellow piano-like sound)
          this._musicTone(freq, noteDur * 0.85, 'triangle', 0.18, t);
          // Add a quiet sine overtone for richness
          this._musicTone(freq * 2, noteDur * 0.5, 'sine', 0.04, t);
        }
        t += noteDur;
      }

      // Schedule oom-pah bass
      let bt = now;
      for (const { bass, chord, beats } of bassChords) {
        const halfBeats = beats / 2;
        for (let i = 0; i < halfBeats; i++) {
          const time = bt + i * 2 * e;
          if (i % 1 === 0) {
            // "Oom" - bass note on downbeat
            this._musicTone(bass, e * 0.8, 'triangle', 0.12, time);
            // "Pah" - chord on upbeat
            const chordTime = time + e;
            for (const cn of chord) {
              this._musicTone(cn, e * 0.6, 'triangle', 0.06, chordTime);
            }
          }
        }
        bt += beats * e;
      }
    };

    // Schedule first loop immediately, then repeat
    scheduleLoop();
    this.musicTimer = setInterval(scheduleLoop, loopDuration * 1000);
  }

  stopMusic() {
    this.musicPlaying = false;
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    this.musicNodes.forEach(n => {
      try { n.stop(); } catch (e) { /* ignore */ }
    });
    this.musicNodes = [];
  }
}

export const soundManager = new SoundManager();
