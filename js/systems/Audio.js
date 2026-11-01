/**
 * AudioSystem —— Web Audio 合成音效（GDD 6.2 Audio & UI System）
 *
 * 第一階段不使用音訊檔，全部以振盪器與噪音即時合成；並有一段低音量的寒風環境音。
 * 瀏覽器規定必須在使用者互動後才能播放聲音，因此 unlock() 由第一次按鍵/點擊觸發。
 */
class AudioSystem {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = SaveStore.get('muted', false) === true;
    this.volume = 0.55;
  }

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      this.ctx = new AC();
    } catch (e) {
      return;
    }
    const c = this.ctx;
    this.master = c.createGain();
    this.master.gain.value = this.muted ? 0 : this.volume;
    this.master.connect(c.destination);
    this.sfxBus = c.createGain();
    this.sfxBus.connect(this.master);
    this.ambienceBus = c.createGain();
    this.ambienceBus.gain.value = 1;
    this.ambienceBus.connect(this.master);

    const length = c.sampleRate * 2;
    this.noiseBuffer = c.createBuffer(1, length, c.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;

    this._startAmbience();
  }

  toggleMute() {
    this.muted = !this.muted;
    SaveStore.set('muted', this.muted);
    if (this.master) this.master.gain.setTargetAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime, 0.05);
  }

  _tone({ type = 'sine', freq = 440, to = null, dur = 0.2, vol = 0.2, attack = 0.005, delay = 0 }) {
    const c = this.ctx;
    const t = c.currentTime + delay;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (to) osc.frequency.exponentialRampToValueAtTime(to, t + dur);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(this.sfxBus);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  _noise({ dur = 0.2, vol = 0.2, type = 'lowpass', freq = 1000, to = null, q = 1, delay = 0, attack = 0.003 }) {
    const c = this.ctx;
    const t = c.currentTime + delay;
    const src = c.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = c.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(freq, t);
    if (to) filter.frequency.exponentialRampToValueAtTime(to, t + dur);
    filter.Q.value = q;
    const gain = c.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter).connect(gain).connect(this.sfxBus);
    src.start(t, Math.random() * 1.5);
    src.stop(t + dur + 0.05);
  }

  play(name) {
    if (!this.ctx || this.muted) return;
    switch (name) {
      case 'jump':
        this._tone({ type: 'square', freq: 240, to: 480, dur: 0.12, vol: 0.05 });
        this._noise({ type: 'highpass', freq: 2000, dur: 0.08, vol: 0.05 });
        break;
      case 'land':
        this._noise({ type: 'lowpass', freq: 500, dur: 0.12, vol: 0.18 });
        break;
      case 'slash':
        this._noise({ type: 'bandpass', freq: 3200, to: 700, q: 0.9, dur: 0.17, vol: 0.28 });
        this._tone({ type: 'triangle', freq: 900, to: 320, dur: 0.1, vol: 0.04 });
        break;
      case 'slash2':
        this._noise({ type: 'bandpass', freq: 2600, to: 5200, q: 0.9, dur: 0.16, vol: 0.26 });
        this._tone({ type: 'triangle', freq: 420, to: 1000, dur: 0.1, vol: 0.04 });
        break;
      case 'slash3':
        this._noise({ type: 'bandpass', freq: 4200, to: 450, q: 0.7, dur: 0.28, vol: 0.34 });
        this._tone({ type: 'sawtooth', freq: 260, to: 80, dur: 0.22, vol: 0.06 });
        break;
      case 'potBreak':
        this._noise({ type: 'highpass', freq: 1800, dur: 0.16, vol: 0.3 });
        this._noise({ type: 'bandpass', freq: 900, to: 300, q: 1.2, dur: 0.22, vol: 0.18, delay: 0.02 });
        [1400, 1900, 2500].forEach((f, i) => this._tone({ type: 'triangle', freq: f, dur: 0.08, vol: 0.04, delay: 0.03 + i * 0.035 }));
        break;
      case 'snowHit':
        this._noise({ type: 'lowpass', freq: 900, to: 300, dur: 0.14, vol: 0.22 });
        break;
      case 'snowBreak':
        this._noise({ type: 'lowpass', freq: 1400, to: 250, dur: 0.32, vol: 0.3 });
        this._noise({ type: 'highpass', freq: 5000, dur: 0.18, vol: 0.05, delay: 0.05 });
        break;
      case 'iceBreak':
        this._noise({ type: 'highpass', freq: 3000, dur: 0.35, vol: 0.32 });
        this._noise({ type: 'bandpass', freq: 1200, to: 300, q: 1, dur: 0.45, vol: 0.2, delay: 0.03 });
        [2600, 3400, 2200, 3900].forEach((f, i) => this._tone({ type: 'triangle', freq: f, dur: 0.12, vol: 0.035, delay: 0.04 + i * 0.05 }));
        break;
      case 'clink':
        this._tone({ type: 'square', freq: 1900, to: 1500, dur: 0.07, vol: 0.05 });
        this._noise({ type: 'highpass', freq: 4000, dur: 0.05, vol: 0.1 });
        break;
      case 'secret':
        [523, 659, 784, 1046, 1319].forEach((f, i) => this._tone({ type: 'triangle', freq: f, dur: 0.5, vol: 0.05, delay: 0.15 + i * 0.07, attack: 0.01 }));
        break;
      case 'scarfThrow':
        this._noise({ type: 'bandpass', freq: 1200, to: 3600, q: 1.4, dur: 0.16, vol: 0.14 });
        this._tone({ type: 'sine', freq: 300, to: 700, dur: 0.12, vol: 0.04 });
        break;
      case 'scarfGrab':
        this._noise({ type: 'lowpass', freq: 900, dur: 0.06, vol: 0.18 });
        this._tone({ type: 'triangle', freq: 1760, dur: 0.6, vol: 0.05, attack: 0.003 });
        this._tone({ type: 'sine', freq: 2349, dur: 0.5, vol: 0.03, delay: 0.03 });
        break;
      case 'yank':
        this._noise({ type: 'bandpass', freq: 700, to: 2200, q: 1, dur: 0.14, vol: 0.2 });
        this._tone({ type: 'square', freq: 200, to: 520, dur: 0.12, vol: 0.05 });
        break;
      case 'gate':
        this._tone({ type: 'sawtooth', freq: 72, to: 48, dur: 0.8, vol: 0.08, attack: 0.05 });
        this._noise({ type: 'lowpass', freq: 420, dur: 0.9, vol: 0.28, attack: 0.05 });
        [880, 1175].forEach((f, i) => this._tone({ type: 'triangle', freq: f, dur: 0.5, vol: 0.04, delay: i * 0.08 }));
        break;
      case 'heal':
        [660, 880, 1320].forEach((f, i) => this._tone({ type: 'sine', freq: f, dur: 0.35, vol: 0.06, delay: i * 0.05, attack: 0.01 }));
        break;
      case 'hit':
        this._tone({ type: 'square', freq: 170, to: 60, dur: 0.12, vol: 0.12 });
        this._noise({ type: 'lowpass', freq: 2400, dur: 0.09, vol: 0.22 });
        break;
      case 'kill':
        this._tone({ type: 'square', freq: 170, to: 50, dur: 0.14, vol: 0.12 });
        this._noise({ type: 'lowpass', freq: 2600, dur: 0.14, vol: 0.22 });
        this._tone({ type: 'triangle', freq: 660, to: 1320, dur: 0.25, vol: 0.07, delay: 0.05 });
        this._tone({ type: 'sine', freq: 990, dur: 0.35, vol: 0.05, delay: 0.12 });
        break;
      case 'hurt':
        this._tone({ type: 'sawtooth', freq: 420, to: 110, dur: 0.28, vol: 0.1 });
        this._noise({ type: 'lowpass', freq: 900, dur: 0.16, vol: 0.22 });
        break;
      case 'die':
        this._tone({ type: 'sawtooth', freq: 300, to: 45, dur: 0.9, vol: 0.12 });
        this._noise({ type: 'lowpass', freq: 700, to: 120, dur: 0.6, vol: 0.2 });
        break;
      case 'dodge':
        this._noise({ type: 'bandpass', freq: 500, to: 2600, q: 1.2, dur: 0.18, vol: 0.16 });
        break;
      case 'checkpoint':
        [523, 784, 1046].forEach((f, i) => {
          this._tone({ type: 'sine', freq: f, dur: 0.9, vol: 0.09, delay: i * 0.12, attack: 0.01 });
          this._tone({ type: 'triangle', freq: f * 2, dur: 0.3, vol: 0.02, delay: i * 0.12 });
        });
        break;
      case 'victory':
        // 和風五聲音階（都節）的簡短旋律
        [587, 622, 784, 880, 932, 1175, 932, 1175].forEach((f, i) => {
          this._tone({ type: 'triangle', freq: f, dur: 0.7, vol: 0.09, delay: i * 0.17, attack: 0.004 });
        });
        [587, 880, 1175].forEach((f) => this._tone({ type: 'sine', freq: f, dur: 2.2, vol: 0.05, delay: 1.4, attack: 0.05 }));
        break;
      case 'doubleJump':
        this._noise({ type: 'bandpass', freq: 900, to: 3200, q: 1.5, dur: 0.16, vol: 0.12 });
        this._tone({ type: 'sine', freq: 520, to: 1040, dur: 0.14, vol: 0.05 });
        break;
      case 'pogo':
        this._tone({ type: 'square', freq: 300, to: 900, dur: 0.1, vol: 0.06 });
        this._noise({ type: 'highpass', freq: 2500, dur: 0.06, vol: 0.12 });
        break;
      case 'chargeStart':
        this._tone({ type: 'sine', freq: 180, to: 420, dur: 0.5, vol: 0.05, attack: 0.05 });
        break;
      case 'charged':
        this._tone({ type: 'triangle', freq: 1320, dur: 0.35, vol: 0.07 });
        this._tone({ type: 'sine', freq: 1760, dur: 0.5, vol: 0.05, delay: 0.05 });
        break;
      case 'wave':
        this._noise({ type: 'bandpass', freq: 4200, to: 500, q: 0.8, dur: 0.38, vol: 0.34 });
        this._tone({ type: 'sawtooth', freq: 320, to: 70, dur: 0.3, vol: 0.06 });
        this._tone({ type: 'sine', freq: 1200, to: 2400, dur: 0.2, vol: 0.04 });
        break;
      case 'spiral':
        // 三聲旋風呼嘯，對應三次斬擊
        [0, 0.14, 0.28].forEach((d, i) => {
          this._noise({ type: 'bandpass', freq: 1400 + i * 600, to: 3800 + i * 400, q: 1.2, dur: 0.16, vol: 0.2, delay: d + 0.04 });
        });
        this._tone({ type: 'sine', freq: 400, to: 1300, dur: 0.45, vol: 0.05 });
        this._noise({ type: 'lowpass', freq: 800, dur: 0.5, vol: 0.12 });
        break;
      case 'ability':
        [392, 523, 659, 784, 1046].forEach((f, i) => {
          this._tone({ type: 'triangle', freq: f, dur: 0.8, vol: 0.08, delay: i * 0.09, attack: 0.005 });
        });
        this._tone({ type: 'sine', freq: 1568, dur: 1.4, vol: 0.04, delay: 0.5, attack: 0.05 });
        break;
      case 'vision':
        this._tone({ type: 'sine', freq: 220, to: 110, dur: 1.0, vol: 0.12, attack: 0.02 });
        this._noise({ type: 'bandpass', freq: 600, to: 2600, q: 2, dur: 0.6, vol: 0.1, attack: 0.08 });
        [988, 1319, 1661].forEach((f, i) => this._tone({ type: 'triangle', freq: f, dur: 0.9, vol: 0.035, delay: 0.08 + i * 0.07, attack: 0.03 }));
        break;
      case 'visionEnd':
        this._tone({ type: 'sine', freq: 660, to: 260, dur: 0.35, vol: 0.06 });
        this._noise({ type: 'bandpass', freq: 2400, to: 500, q: 2, dur: 0.3, vol: 0.06 });
        break;
      case 'menu':
        this._tone({ type: 'square', freq: 660, dur: 0.04, vol: 0.03 });
        break;
      case 'select':
        this._tone({ type: 'square', freq: 880, to: 1320, dur: 0.09, vol: 0.05 });
        break;
      case 'pause':
        this._tone({ type: 'sine', freq: 440, to: 330, dur: 0.14, vol: 0.08 });
        break;
      default:
        break;
    }
  }

  /** 寒風環境音：循環噪音經帶通濾波，以低頻 LFO 調變頻率與音量 */
  _startAmbience() {
    const c = this.ctx;
    const src = c.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    const filter = c.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 520;
    filter.Q.value = 0.7;
    const gain = c.createGain();
    gain.gain.value = 0.045;

    const lfo = c.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = c.createGain();
    lfoGain.gain.value = 300;
    lfo.connect(lfoGain).connect(filter.frequency);

    const lfo2 = c.createOscillator();
    lfo2.frequency.value = 0.13;
    const lfo2Gain = c.createGain();
    lfo2Gain.gain.value = 0.025;
    lfo2.connect(lfo2Gain).connect(gain.gain);

    src.connect(filter).connect(gain).connect(this.ambienceBus);
    src.start();
    lfo.start();
    lfo2.start();
  }
}
