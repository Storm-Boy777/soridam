let ctx: AudioContext | null = null;

function getCtx() {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

// 슬롯 스핀 틱 (짧은 기계음)
export function playSlotTick() {
  const ac = getCtx();
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(600 + Math.random() * 300, ac.currentTime);
  gain.gain.setValueAtTime(0.04, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.03);
  osc.connect(gain).connect(ac.destination);
  osc.start(); osc.stop(ac.currentTime + 0.03);
}

// 슬롯 정지 (딩!)
export function playSlotStop() {
  const ac = getCtx();
  const t = ac.currentTime;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(880, t);
  osc.frequency.exponentialRampToValueAtTime(1320, t + 0.08);
  gain.gain.setValueAtTime(0.2, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
  osc.connect(gain).connect(ac.destination);
  osc.start(); osc.stop(t + 0.3);
}

// 카드 뒤집기 (팩 소리)
export function playCardFlip() {
  const ac = getCtx();
  const t = ac.currentTime;
  const buf = ac.createBuffer(1, ac.sampleRate * 0.06, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = ac.createBufferSource();
  src.buffer = buf;
  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.12, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
  const filter = ac.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.setValueAtTime(2000, t);
  src.connect(filter).connect(gain).connect(ac.destination);
  src.start(); src.stop(t + 0.06);
}

// 카드 셔플 (사각사각)
export function playCardShuffle() {
  const ac = getCtx();
  const t = ac.currentTime;
  for (let i = 0; i < 3; i++) {
    const buf = ac.createBuffer(1, ac.sampleRate * 0.04, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let j = 0; j < data.length; j++) data[j] = (Math.random() * 2 - 1) * (1 - j / data.length);
    const src = ac.createBufferSource();
    src.buffer = buf;
    const gain = ac.createGain();
    gain.gain.setValueAtTime(0.08, t + i * 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.05 + 0.04);
    src.connect(gain).connect(ac.destination);
    src.start(t + i * 0.05); src.stop(t + i * 0.05 + 0.04);
  }
}

// 당첨 카드 (짠!)
export function playWinCard() {
  const ac = getCtx();
  const t = ac.currentTime;
  [660, 880, 1100].forEach((freq, i) => {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, t + i * 0.06);
    gain.gain.setValueAtTime(0.15, t + i * 0.06);
    gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.06 + 0.2);
    osc.connect(gain).connect(ac.destination);
    osc.start(t + i * 0.06); osc.stop(t + i * 0.06 + 0.2);
  });
}

// 꽝 카드 (뿅)
export function playMissCard() {
  const ac = getCtx();
  const t = ac.currentTime;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(300, t);
  osc.frequency.exponentialRampToValueAtTime(100, t + 0.15);
  gain.gain.setValueAtTime(0.08, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
  osc.connect(gain).connect(ac.destination);
  osc.start(); osc.stop(t + 0.15);
}

// 리스트 셔플 스핀 틱
export function playReelTick() {
  const ac = getCtx();
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(500 + Math.random() * 200, ac.currentTime);
  gain.gain.setValueAtTime(0.03, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.025);
  osc.connect(gain).connect(ac.destination);
  osc.start(); osc.stop(ac.currentTime + 0.025);
}

// 리스트 정지 (통!)
export function playReelStop() {
  const ac = getCtx();
  const t = ac.currentTime;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(700, t);
  osc.frequency.exponentialRampToValueAtTime(1050, t + 0.1);
  gain.gain.setValueAtTime(0.18, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
  osc.connect(gain).connect(ac.destination);
  osc.start(); osc.stop(t + 0.25);
}

// 전체 완료 팡파레
export function playAllComplete() {
  const ac = getCtx();
  const t = ac.currentTime;
  const notes = [523, 659, 784, 1047, 1319, 1568];
  notes.forEach((freq, i) => {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, t + i * 0.08);
    gain.gain.setValueAtTime(0.12, t + i * 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.3);
    osc.connect(gain).connect(ac.destination);
    osc.start(t + i * 0.08); osc.stop(t + i * 0.08 + 0.3);
  });
}
