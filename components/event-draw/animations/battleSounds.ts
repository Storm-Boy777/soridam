let ctx: AudioContext | null = null;

function getCtx() {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function noise(ac: AudioContext, duration: number, volume: number): AudioBufferSourceNode {
  const buf = ac.createBuffer(1, ac.sampleRate * duration, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * volume;
  const src = ac.createBufferSource();
  src.buffer = buf;
  return src;
}

// 스크롤 틱 (짧은 클릭)
export function playTick() {
  const ac = getCtx();
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(800 + Math.random() * 400, ac.currentTime);
  gain.gain.setValueAtTime(0.08, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.04);
  osc.connect(gain).connect(ac.destination);
  osc.start(); osc.stop(ac.currentTime + 0.04);
}

// 이름 확정 (상승 톤)
export function playReveal() {
  const ac = getCtx();
  const t = ac.currentTime;
  [523, 659, 784, 1047].forEach((freq, i) => {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, t + i * 0.08);
    gain.gain.setValueAtTime(0.15, t + i * 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.2);
    osc.connect(gain).connect(ac.destination);
    osc.start(t + i * 0.08); osc.stop(t + i * 0.08 + 0.2);
  });
}

// ROUND 1 / VS 텍스트 등장
export function playWhoosh() {
  const ac = getCtx();
  const t = ac.currentTime;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(200, t);
  osc.frequency.exponentialRampToValueAtTime(600, t + 0.15);
  gain.gain.setValueAtTime(0.1, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
  osc.connect(gain).connect(ac.destination);
  osc.start(); osc.stop(t + 0.2);
}

// FIGHT! 사이렌
export function playFight() {
  const ac = getCtx();
  const t = ac.currentTime;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(400, t);
  osc.frequency.linearRampToValueAtTime(800, t + 0.15);
  osc.frequency.linearRampToValueAtTime(400, t + 0.3);
  gain.gain.setValueAtTime(0.12, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
  osc.connect(gain).connect(ac.destination);
  osc.start(); osc.stop(t + 0.4);
}

// 펀치 타격
export function playPunch() {
  const ac = getCtx();
  const t = ac.currentTime;
  // 임팩트 (저음)
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(150, t);
  osc.frequency.exponentialRampToValueAtTime(40, t + 0.12);
  gain.gain.setValueAtTime(0.3, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
  osc.connect(gain).connect(ac.destination);
  osc.start(); osc.stop(t + 0.15);
  // 노이즈 (찰싹)
  const n = noise(ac, 0.08, 0.2);
  const ng = ac.createGain();
  ng.gain.setValueAtTime(0.2, t);
  ng.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
  n.connect(ng).connect(ac.destination);
  n.start(); n.stop(t + 0.08);
}

// 킥 타격
export function playKick() {
  const ac = getCtx();
  const t = ac.currentTime;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(200, t);
  osc.frequency.exponentialRampToValueAtTime(30, t + 0.18);
  gain.gain.setValueAtTime(0.35, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
  osc.connect(gain).connect(ac.destination);
  osc.start(); osc.stop(t + 0.2);
  // 노이즈
  const n = noise(ac, 0.1, 0.25);
  const ng = ac.createGain();
  ng.gain.setValueAtTime(0.25, t);
  ng.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
  n.connect(ng).connect(ac.destination);
  n.start(); n.stop(t + 0.1);
}

// K.O. 폭발
export function playKO() {
  const ac = getCtx();
  const t = ac.currentTime;
  // 깊은 쿵
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(80, t);
  osc.frequency.exponentialRampToValueAtTime(20, t + 0.5);
  gain.gain.setValueAtTime(0.4, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
  osc.connect(gain).connect(ac.destination);
  osc.start(); osc.stop(t + 0.5);
  // 노이즈 폭발
  const n = noise(ac, 0.3, 0.3);
  const ng = ac.createGain();
  ng.gain.setValueAtTime(0.3, t);
  ng.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
  n.connect(ng).connect(ac.destination);
  n.start(); n.stop(t + 0.3);
}

// WINNER 팡파레
export function playWinner() {
  const ac = getCtx();
  const t = ac.currentTime;
  const notes = [523, 659, 784, 1047, 1319, 1047, 1319, 1568];
  notes.forEach((freq, i) => {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, t + i * 0.1);
    gain.gain.setValueAtTime(0.12, t + i * 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 0.25);
    osc.connect(gain).connect(ac.destination);
    osc.start(t + i * 0.1); osc.stop(t + i * 0.1 + 0.25);
  });
}
