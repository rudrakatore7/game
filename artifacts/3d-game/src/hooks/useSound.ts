let ctx: AudioContext | null = null;
let masterCompressor: DynamicsCompressorNode | null = null;

function getCtx(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext();
    masterCompressor = ctx.createDynamicsCompressor();
    masterCompressor.threshold.setValueAtTime(-24, ctx.currentTime);
    masterCompressor.knee.setValueAtTime(30, ctx.currentTime);
    masterCompressor.ratio.setValueAtTime(12, ctx.currentTime);
    masterCompressor.attack.setValueAtTime(0.003, ctx.currentTime);
    masterCompressor.release.setValueAtTime(0.25, ctx.currentTime);
    masterCompressor.connect(ctx.destination);
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function playTone(
  frequency: number,
  type: OscillatorType,
  duration: number,
  gainPeak: number,
  freqEnd?: number
) {
  const ac   = getCtx();
  const osc  = ac.createOscillator();
  const gain = ac.createGain();
  osc.connect(gain);
  if (masterCompressor) gain.connect(masterCompressor);
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, ac.currentTime);
  if (freqEnd !== undefined)
    osc.frequency.exponentialRampToValueAtTime(freqEnd, ac.currentTime + duration);
  gain.gain.setValueAtTime(0, ac.currentTime);
  gain.gain.linearRampToValueAtTime(gainPeak, ac.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);
  osc.start(ac.currentTime);
  osc.stop(ac.currentTime + duration);
}

function playNoise(durationSec: number, gainPeak: number, decayMult = 5) {
  try {
    const ac     = getCtx();
    const bufLen = Math.floor(ac.sampleRate * durationSec);
    const buffer = ac.createBuffer(1, bufLen, ac.sampleRate);
    const data   = buffer.getChannelData(0);
    for (let i = 0; i < bufLen; i++)
      data[i] = (Math.random() * 2 - 1) * Math.exp((-i / bufLen) * decayMult);
    const src  = ac.createBufferSource();
    const gain = ac.createGain();
    src.buffer = buffer;
    src.connect(gain);
    if (masterCompressor) gain.connect(masterCompressor);
    gain.gain.setValueAtTime(gainPeak, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + durationSec);
    src.start(ac.currentTime);
  } catch { /* ignore */ }
}

export function playCollectSound() {
  playTone(523,  "sine", 0.12, 0.4);
  setTimeout(() => playTone(659,  "sine", 0.12, 0.4), 60);
  setTimeout(() => playTone(784,  "sine", 0.20, 0.5), 120);
  setTimeout(() => playTone(1047, "sine", 0.25, 0.4), 200);
}

export function playHitSound() {
  playTone(1400, "sawtooth", 0.18, 0.55, 280);
  playTone(340,  "square",   0.22, 0.45, 80);
  setTimeout(() => playTone(60, "sawtooth", 0.35, 0.5, 25), 20);
  for (let i = 0; i < 5; i++)
    setTimeout(() => playTone(220 + i * 40, "square", 0.06, 0.3, 180), 30 + i * 40);
  setTimeout(() => playTone(2200, "sawtooth", 0.1, 0.25, 800), 60);
  playNoise(0.18, 0.5);
}

export function playShootSound() {
  // Sharp crack + mechanical click
  playTone(900, "square",   0.05, 0.65, 200);
  playTone(450, "sawtooth", 0.04, 0.35, 900);
  setTimeout(() => playTone(320, "square", 0.06, 0.25, 280), 35);
  playNoise(0.06, 0.9, 10);
}

export function playBulletHitSound() {
  // Metal spark — high pitched zing
  playTone(2000, "square",   0.07, 0.35, 700);
  playTone(3000, "sawtooth", 0.04, 0.20, 1500);
  setTimeout(() => playTone(1200, "square", 0.05, 0.15, 600), 25);
}

export function playDroneDestroySound() {
  // Explosion crunch + static
  playTone(180, "sawtooth", 0.40, 0.55, 45);
  playTone(420, "square",   0.30, 0.45, 90);
  setTimeout(() => playTone(90, "sawtooth", 0.45, 0.40, 35), 100);
  setTimeout(() => playTone(600, "square", 0.20, 0.30, 150), 50);
  playNoise(0.30, 0.65, 4);
}

export function playDroneWarningSound() {
  // Ascending two-beep alert
  playTone(660, "square", 0.10, 0.22);
  setTimeout(() => playTone(880, "square", 0.09, 0.20), 90);
}

export function playWinSound() {
  const notes = [523, 659, 784, 1047, 1319];
  notes.forEach((freq, i) => setTimeout(() => playTone(freq, "sine", 0.35, 0.45), i * 100));
}

export function playLoseSound() {
  playTone(400, "sawtooth", 0.6, 0.4, 100);
  setTimeout(() => playTone(150, "square", 0.4, 0.3, 80), 300);
}

export function playTimerBeep() {
  playTone(880, "square", 0.07, 0.18);
}
