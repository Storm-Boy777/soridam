"use client";

import { useEffect, useRef, useState } from "react";
import { playTick, playReveal, playWhoosh, playFight, playPunch, playKick, playKO, playWinner } from "./battleSounds";

interface Props {
  winners: string[];
  participants: string[];
  onComplete: () => void;
}

const POSES = {
  idle: { hd: [0, -50], nk: [0, -38], le: [-10, -24], lh: [-6, -12], re: [10, -24], rh: [6, -12], lk: [-7, 18], lf: [-10, 36], rk: [7, 18], rf: [10, 36] },
  idle2: { hd: [1, -48], nk: [1, -37], le: [-11, -22], lh: [-7, -10], re: [11, -22], rh: [7, -10], lk: [-7, 18], lf: [-10, 36], rk: [7, 18], rf: [10, 36] },
  punch: { hd: [8, -46], nk: [6, -36], le: [-18, -32], lh: [-22, -24], re: [40, -36], rh: [58, -36], lk: [-5, 18], lf: [-12, 36], rk: [12, 14], rf: [6, 36] },
  kick: { hd: [4, -48], nk: [2, -38], le: [-14, -28], lh: [-10, -16], re: [14, -28], rh: [10, -16], lk: [-6, 16], lf: [-10, 34], rk: [30, 8], rf: [50, 12] },
  hit: { hd: [-16, -42], nk: [-12, -33], le: [-24, -16], lh: [-28, -6], re: [-8, -18], rh: [-14, -6], lk: [10, 18], lf: [18, 36], rk: [18, 16], rf: [24, 36] },
  ko: { hd: [-42, -2], nk: [-32, 2], le: [-44, 12], lh: [-52, 20], re: [-18, 12], rh: [-8, 20], lk: [22, 6], lf: [36, 10], rk: [12, 6], rf: [22, 10] },
};

type Pose = typeof POSES.idle;

function lerp(a: number[], b: number[], t: number): number[] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

function lerpPose(a: Pose, b: Pose, t: number): Pose {
  const result: Record<string, number[]> = {};
  for (const key of Object.keys(a)) {
    result[key] = lerp(a[key as keyof Pose], b[key as keyof Pose], t);
  }
  return result as unknown as Pose;
}

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

// 리스트 스크롤용: 참가자 배열을 셔플해서 마지막에 당첨자가 오도록 구성
function buildScrollList(names: string[], finalName: string): string[] {
  const pool = names.filter((n) => n !== finalName).sort(() => Math.random() - 0.5);
  // 최소 15개 항목 확보 (30→15로 축소)
  const list: string[] = [];
  while (list.length < 15) {
    list.push(...pool.sort(() => Math.random() - 0.5));
  }
  list.push(finalName); // 마지막 = 확정 이름
  return list;
}

interface Spark {
  x: number; y: number; vx: number; vy: number; life: number; size: number; color: string;
}

export default function VsBattle({ winners, participants, onComplete }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 960, h: 540 });

  const winner = winners[0];

  // 반응형: 90vw, 16:9 비율
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const update = () => {
      const vw = window.innerWidth * 0.9;
      const vh = window.innerHeight * 0.8;
      const w = Math.min(Math.round(vw), 1400);
      const h = Math.min(Math.round(w * 0.5625), Math.round(vh));
      setCanvasSize({ w, h });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || canvasSize.w < 100) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvasSize.w, H = canvasSize.h;
    const sc = W / 960; // 기준 960px
    const others = participants.filter((n) => n !== winner);
    const opponent = others.length ? others[Math.floor(Math.random() * others.length)] : participants[0];

    const leftWins = Math.random() > 0.5;
    const leftName = leftWins ? winner : opponent;
    const rightName = leftWins ? opponent : winner;

    const BL = "#60a5fa", RD = "#fb7185";
    const LX = Math.round(W * 0.28), RX = Math.round(W * 0.72);
    const GY = Math.round(H * 0.72);

    // 리스트 스크롤 데이터
    const leftList = buildScrollList(participants, leftName);
    const rightList = buildScrollList(participants, rightName);
    const SCROLL_DURATION = 4200;
    const REVEAL_DURATION = 2100;
    const REVEAL_HOLD = 2100;

    let time = 0;
    let phase: "select" | "intro" | "battle" | "ko" | "result" = "select";
    let pt = 0; // phase time
    let leftHP = 100, rightHP = 100;
    let leftPose = { ...POSES.idle }, rightPose = { ...POSES.idle };

    let turn: "left" | "right" = "left";
    let turnState: "wait" | "attack" = "wait";
    let turnTime = 0;
    let atkType: "punch" | "kick" = "punch";
    let dmgDone = false;
    let hitCount = 0;

    let sparks: Spark[] = [];
    let shakeX = 0, shakeY = 0;
    let flashAlpha = 0;

    let lastTickTime = 0;
    let introSoundPlayed = [false, false, false];
    let koSoundPlayed = false;
    let winnerSoundPlayed = false;
    let revealSoundPlayed = false;

    let animId: number;

    function S(v: number) { return v * sc; }

    // 폰트 문자열 사전 캐시 (매 프레임 파싱 방지)
    const FONTS = {
      scroll: `600 ${S(18)}px sans-serif`,
      title28: `800 ${S(28)}px sans-serif`,
      vs60: `900 ${S(60)}px sans-serif`,
      vs72: `900 ${S(72)}px sans-serif`,
      name48: `800 ${S(48)}px sans-serif`,
      intro58: `900 ${S(58)}px sans-serif`,
      ko64: `900 ${S(64)}px sans-serif`,
      winner48: `900 ${S(48)}px sans-serif`,
      winner38: `800 ${S(38)}px sans-serif`,
      hp12: `600 ${S(12)}px sans-serif`,
      name15: `700 ${S(15)}px sans-serif`,
    };

    // gradient 사전 캐시
    const lineH = S(34);
    const visibleLines = 7;
    const clipH = lineH * visibleLines;
    const centerY = H / 2;
    const fadeH = clipH * 0.3;
    const fadeCaches: Record<string, { top: CanvasGradient; bot: CanvasGradient }> = {};
    [LX, RX].forEach((cx) => {
      const top = ctx!.createLinearGradient(cx, centerY - clipH / 2, cx, centerY - clipH / 2 + fadeH);
      top.addColorStop(0, "#0a0a14");
      top.addColorStop(1, "rgba(10,10,20,0)");
      const bot = ctx!.createLinearGradient(cx, centerY + clipH / 2 - fadeH, cx, centerY + clipH / 2);
      bot.addColorStop(0, "rgba(10,10,20,0)");
      bot.addColorStop(1, "#0a0a14");
      fadeCaches[cx] = { top, bot };
    });

    function drawStickman(x: number, y: number, pose: Pose, dir: number, color: string, s: number) {
      const lw = S(3.5) * s;
      ctx!.strokeStyle = color;
      ctx!.lineWidth = lw;
      ctx!.lineCap = "round";
      ctx!.fillStyle = color;

      const j = (key: keyof Pose) => [
        x + pose[key][0] * dir * s * sc,
        y + pose[key][1] * s * sc,
      ];

      const hd = j("hd"), nk = j("nk");
      const le = j("le"), lh = j("lh"), re = j("re"), rh = j("rh");
      const lk = j("lk"), lf = j("lf"), rk = j("rk"), rf = j("rf");

      // 모든 선을 단일 path로 통합
      ctx!.beginPath();
      ctx!.moveTo(x, y); ctx!.lineTo(lk[0], lk[1]); ctx!.lineTo(lf[0], lf[1]);
      ctx!.moveTo(x, y); ctx!.lineTo(rk[0], rk[1]); ctx!.lineTo(rf[0], rf[1]);
      ctx!.moveTo(nk[0], nk[1]); ctx!.lineTo(x, y);
      ctx!.moveTo(nk[0], nk[1]); ctx!.lineTo(le[0], le[1]); ctx!.lineTo(lh[0], lh[1]);
      ctx!.moveTo(nk[0], nk[1]); ctx!.lineTo(re[0], re[1]); ctx!.lineTo(rh[0], rh[1]);
      ctx!.stroke();

      ctx!.beginPath(); ctx!.arc(rh[0], rh[1], S(4) * s, 0, Math.PI * 2); ctx!.fill();
      ctx!.beginPath(); ctx!.arc(hd[0], hd[1], S(11) * s, 0, Math.PI * 2); ctx!.stroke();
      ctx!.beginPath(); ctx!.arc(hd[0] + dir * S(3.5) * s, hd[1] - S(2) * s, S(1.8) * s, 0, Math.PI * 2); ctx!.fill();
    }

    function drawHPBar(x: number, y: number, hp: number) {
      const w = S(150), h = S(12);
      ctx!.fillStyle = "rgba(255,255,255,0.08)";
      ctx!.fillRect(x - w / 2, y, w, h);
      const hpColor = hp > 60 ? "#34d399" : hp > 30 ? "#fbbf24" : "#ef4444";
      ctx!.fillStyle = hpColor;
      ctx!.fillRect(x - w / 2, y, w * (hp / 100), h);
      ctx!.strokeStyle = "rgba(255,255,255,0.15)";
      ctx!.lineWidth = 1;
      ctx!.strokeRect(x - w / 2, y, w, h);
      ctx!.fillStyle = "rgba(255,255,255,0.6)";
      ctx!.font = FONTS.hp12;
      ctx!.textAlign = "center";
      ctx!.fillText(`${Math.round(hp)}%`, x, y - S(6));
    }

    function spawnSparks(x: number, y: number, color: string) {
      for (let i = 0; i < 6; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 5;
        sparks.push({
          x, y,
          vx: Math.cos(angle) * speed * sc,
          vy: Math.sin(angle) * speed * sc,
          life: 1,
          size: (2 + Math.random() * 4) * sc,
          color,
        });
      }
      // 최대 40개 제한
      if (sparks.length > 40) sparks = sparks.slice(-40);
    }

    function updateAndDrawSparks() {
      sparks = sparks.filter((sp) => sp.life > 0);
      for (const sp of sparks) {
        sp.x += sp.vx;
        sp.y += sp.vy;
        sp.vy += 0.15 * sc;
        sp.life -= 0.035;
        ctx!.globalAlpha = Math.max(0, sp.life);
        ctx!.fillStyle = sp.color;
        ctx!.beginPath();
        ctx!.arc(sp.x, sp.y, Math.max(0.1, sp.size * sp.life), 0, Math.PI * 2);
        ctx!.fill();
      }
      ctx!.globalAlpha = 1;
    }

    // 배경 그라데이션 캐시
    const bgGrad = ctx!.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, "#0a0a14");
    bgGrad.addColorStop(1, "#060610");

    function drawBackground() {
      ctx!.fillStyle = bgGrad;
      ctx!.fillRect(-10, -10, W + 20, H + 20);
      // 바닥선
      ctx!.strokeStyle = "rgba(255,255,255,0.06)";
      ctx!.lineWidth = S(1.5);
      ctx!.beginPath(); ctx!.moveTo(S(50), GY + S(114)); ctx!.lineTo(W - S(50), GY + S(114)); ctx!.stroke();
    }

    function drawNames() {
      const hpY = GY - S(260);
      ctx!.font = FONTS.name15;
      // 왼쪽 이름: HP바 왼쪽에 배치
      ctx!.textAlign = "left";
      ctx!.fillStyle = BL;
      ctx!.fillText(leftName, LX - S(75), hpY - S(8));
      // 오른쪽 이름: HP바 오른쪽에 배치
      ctx!.textAlign = "right";
      ctx!.fillStyle = RD;
      ctx!.fillText(rightName, RX + S(75), hpY - S(8));
    }

    let lastFrameTime = 0;
    const frame = (timestamp: number) => {
      const dt = lastFrameTime ? Math.min(timestamp - lastFrameTime, 200) : 16;
      lastFrameTime = timestamp;
      time += dt;
      pt += dt;

      shakeX *= 0.82;
      shakeY *= 0.82;
      flashAlpha *= 0.88;

      ctx!.save();
      ctx!.translate(shakeX, shakeY);
      drawBackground();

      // ===== SELECT (스크롤 8s → 리빌 2s → 유지 2s = 12초) =====
      if (phase === "select") {
        const totalSelectTime = SCROLL_DURATION + REVEAL_DURATION + REVEAL_HOLD;
        const scrolling = pt < SCROLL_DURATION;
        const revealing = pt >= SCROLL_DURATION && pt < SCROLL_DURATION + REVEAL_DURATION;
        const holding = pt >= SCROLL_DURATION + REVEAL_DURATION;

        if (scrolling) {
          ctx!.font = FONTS.title28;
          ctx!.fillStyle = "#c9a227";
          ctx!.textAlign = "center";
          ctx!.fillText("PLAYER SELECT", W / 2, S(55));

          ctx!.font = FONTS.vs60;
          ctx!.fillStyle = "rgba(59,130,246,0.08)";
          ctx!.fillText("VS", W / 2, H / 2 + S(14));

          const scrollProgress = Math.min(pt / SCROLL_DURATION, 1);
          const eased = 1 - Math.pow(1 - scrollProgress, 4);

          const leftMaxScroll = (leftList.length - 1) * lineH;
          const rightMaxScroll = (rightList.length - 1) * lineH;
          const leftScrollY = eased * leftMaxScroll;
          const rightScrollY = eased * rightMaxScroll;
          const halfClip = clipH / 2;

          const drawScrollList = (list: string[], scrollY: number, cx: number) => {
            ctx!.font = FONTS.scroll;
            ctx!.fillStyle = "rgba(255,255,255,0.7)";
            ctx!.textAlign = "center";
            ctx!.textBaseline = "middle";

            for (let i = 0; i < list.length; i++) {
              const itemY = centerY + i * lineH - scrollY;
              if (itemY < centerY - halfClip - lineH || itemY > centerY + halfClip + lineH) continue;

              const distFromCenter = Math.abs(itemY - centerY);
              const normalizedDist = Math.min(distFromCenter / halfClip, 1);
              const alpha = Math.max(0.08, 1 - normalizedDist * 1.2);

              ctx!.globalAlpha = alpha;
              ctx!.fillText(list[i], cx, itemY);
            }
            ctx!.globalAlpha = 1;

            const cache = fadeCaches[cx];
            ctx!.fillStyle = cache.top;
            ctx!.fillRect(cx - S(120), centerY - halfClip, S(240), fadeH);
            ctx!.fillStyle = cache.bot;
            ctx!.fillRect(cx - S(120), centerY + halfClip - fadeH, S(240), fadeH);
          };

          drawScrollList(leftList, leftScrollY, LX);
          drawScrollList(rightList, rightScrollY, RX);

          if (pt - lastTickTime > 200) { playTick(); lastTickTime = pt; }

        } else {
          if (!revealSoundPlayed) { playReveal(); revealSoundPlayed = true; }
          const rp = revealing
            ? easeInOut(Math.min((pt - SCROLL_DURATION) / REVEAL_DURATION, 1))
            : 1;

          // 이름 크기: S(24) → S(48)
          const nameSize = S(24 + 24 * rp);

          // 왼쪽 이름
          ctx!.font = `800 ${nameSize}px sans-serif`;
          ctx!.fillStyle = BL;
          ctx!.textAlign = "center";
          ctx!.textBaseline = "middle";
          ctx!.fillText(leftName, LX, H / 2);

          // 오른쪽 이름
          ctx!.font = `800 ${nameSize}px sans-serif`;
          ctx!.fillStyle = RD;
          ctx!.textAlign = "center";
          ctx!.textBaseline = "middle";
          ctx!.fillText(rightName, RX, H / 2);

          // VS 등장 (중앙, 팝인)
          if (rp > 0.2) {
            const vsP = easeInOut(Math.min((rp - 0.2) / 0.6, 1));
            const vsScale = 0.3 + vsP * 0.7;
            ctx!.save();
            ctx!.translate(W / 2, H / 2);
            ctx!.scale(vsScale, vsScale);
            ctx!.globalAlpha = vsP;
            ctx!.font = FONTS.vs72;
            ctx!.fillStyle = "#c9a227";
            ctx!.textAlign = "center";
            ctx!.textBaseline = "middle";
            ctx!.fillText("VS", 0, 0);
            ctx!.restore();
          }
        }

        if (pt > totalSelectTime) {
          phase = "intro"; pt = 0;
        }
      }

      // ===== INTRO (각 3초: ROUND 1 → VS → FIGHT!) =====
      if (phase === "intro") {
        // 스틱맨 페이드인 (첫 1초에 등장)
        const stickAlpha = Math.min(1, pt / 1000);
        ctx!.globalAlpha = stickAlpha;
        drawStickman(LX, GY, POSES.idle, 1, BL, 3);
        drawStickman(RX, GY, POSES.idle, -1, RD, 3);
        ctx!.globalAlpha = 1;
        drawNames();

        let text = "", color = "#fff";
        if (pt < 2100) { text = "ROUND 1"; if (!introSoundPlayed[0]) { playWhoosh(); introSoundPlayed[0] = true; } }
        else if (pt < 4200) { text = "VS"; color = "#60a5fa"; if (!introSoundPlayed[1]) { playWhoosh(); introSoundPlayed[1] = true; } }
        else if (pt < 6300) { text = "FIGHT !"; color = RD; if (!introSoundPlayed[2]) { playFight(); introSoundPlayed[2] = true; } }
        else { phase = "battle"; pt = 0; turnTime = 0; turn = "left"; turnState = "wait"; hitCount = 0; }

        if (text) {
          const segTime = pt % 2100;
          const p = Math.min(1, segTime / 500);
          ctx!.save();
          ctx!.translate(W / 2, H / 2 - S(30));
          const zoom = p + (1 - p) * 3;
          ctx!.scale(zoom, zoom);
          ctx!.globalAlpha = Math.min(1, p * 2.5);
          ctx!.font = FONTS.intro58;
          ctx!.fillStyle = color;
          ctx!.textAlign = "center";
          ctx!.textBaseline = "middle";
          ctx!.fillText(text, 0, 0);
          ctx!.restore();
        }
      }

      // ===== BATTLE (턴제, 느긋하게) =====
      if (phase === "battle") {
        turnTime += dt;
        const breathe = (Math.sin(time * 0.003) + 1) / 2;

        if (turnState === "wait") {
          leftPose = lerpPose(POSES.idle, POSES.idle2, breathe);
          rightPose = lerpPose(POSES.idle, POSES.idle2, breathe);

          // 대기 시간: 900~1400ms
          if (turnTime > 500 + Math.random() * 200) {
            turnState = "attack";
            turnTime = 0;
            dmgDone = false;
            atkType = Math.random() > 0.4 ? "punch" : "kick";
          }
        }

        if (turnState === "attack") {
          const atkPose = atkType === "punch" ? POSES.punch : POSES.kick;
          const dur = 400;
          const p = Math.min(turnTime / dur, 1);

          const attacker = turn === "left";

          // 공격자 포즈
          if (p < 0.3) {
            const pose = lerpPose(POSES.idle, atkPose, easeInOut(p / 0.3));
            if (attacker) leftPose = pose; else rightPose = pose;
          } else if (p < 0.5) {
            if (attacker) leftPose = atkPose; else rightPose = atkPose;
            if (!dmgDone) {
              // 데미지: 8~14 (7~12턴 소요)
              const dmg = 8 + Math.random() * 6;
              if (attacker) {
                rightHP = Math.max(0, rightHP - dmg);
                spawnSparks(RX - S(75), GY - S(90), "#fbbf24");
                shakeX = (5 + Math.random() * 5) * sc;
              } else {
                leftHP = Math.max(0, leftHP - dmg);
                spawnSparks(LX + S(75), GY - S(90), "#fbbf24");
                shakeX = (-5 - Math.random() * 5) * sc;
              }
              shakeY = (-3 + Math.random() * 6) * sc;
              dmgDone = true;
              hitCount++;
              if (atkType === "punch") playPunch(); else playKick();
            }
          } else {
            const pose = lerpPose(atkPose, POSES.idle, easeInOut((p - 0.5) / 0.5));
            if (attacker) leftPose = pose; else rightPose = pose;
          }

          // 피격자 리액션
          const defender = !attacker;
          if (p > 0.25 && p < 0.6) {
            const hitP = easeInOut(Math.min((p - 0.25) / 0.15, 1));
            const pose = lerpPose(POSES.idle, POSES.hit, hitP);
            if (defender) { if (attacker) rightPose = pose; else leftPose = pose; }
          } else if (p >= 0.6) {
            const recoverP = easeInOut((p - 0.6) / 0.4);
            const pose = lerpPose(POSES.hit, POSES.idle, recoverP);
            if (defender) { if (attacker) rightPose = pose; else leftPose = pose; }
          }

          if (p >= 1) {
            // 최소 8턴 보장 후 승패 판정
            const canEnd = hitCount >= 8;
            if (canEnd && (leftHP <= 0 || rightHP <= 0)) {
              if (leftWins) { rightHP = 0; leftHP = Math.max(leftHP, 12); }
              else { leftHP = 0; rightHP = Math.max(rightHP, 12); }
              phase = "ko"; pt = 0;
              flashAlpha = 1;
            } else {
              // HP가 0이어도 최소 턴 미달이면 살려줌
              if (leftHP <= 0) leftHP = 5;
              if (rightHP <= 0) rightHP = 5;
              turn = turn === "left" ? "right" : "left";
              turnState = "wait";
              turnTime = 0;
            }
          }
        }

        drawStickman(LX, GY, leftPose, 1, BL, 3);
        drawStickman(RX, GY, rightPose, -1, RD, 3);
        drawHPBar(LX, GY - S(260), leftHP);
        drawHPBar(RX, GY - S(260), rightHP);
        drawNames();
      }

      // ===== K.O. (4초) =====
      if (phase === "ko") {
        const p = Math.min(pt / 800, 1);
        const loserPose = lerpPose(POSES.hit, POSES.ko, easeInOut(p));

        if (leftWins) {
          drawStickman(LX, GY, POSES.idle, 1, BL, 3);
          drawStickman(RX, GY, loserPose, -1, RD, 3);
        } else {
          drawStickman(LX, GY, loserPose, 1, BL, 3);
          drawStickman(RX, GY, POSES.idle, -1, RD, 3);
        }

        drawHPBar(LX, GY - S(260), leftHP);
        drawHPBar(RX, GY - S(260), rightHP);
        drawNames();

        if (!koSoundPlayed) { playKO(); koSoundPlayed = true; }
        if (pt > 350 && pt < 1960) {
          const koP = Math.min((pt - 500) / 400, 1);
          ctx!.save();
          ctx!.translate(W / 2, H / 2 - S(20));
          const koZoom = koP + (1 - koP) * 2.5;
          ctx!.scale(koZoom, koZoom);
          ctx!.globalAlpha = Math.min(1, koP * 3);
          ctx!.font = FONTS.ko64;
          ctx!.fillStyle = "#eab308";
          ctx!.textAlign = "center";
          ctx!.textBaseline = "middle";
          ctx!.fillText("K.O.", 0, 0);
          ctx!.restore();
        }

        if (pt > 2800) { phase = "result"; pt = 0; }
      }

      // ===== RESULT (3초) =====
      if (phase === "result") {
        if (!winnerSoundPlayed) { playWinner(); winnerSoundPlayed = true; }
        const p = Math.min(pt / 600, 1);

        ctx!.save();
        ctx!.globalAlpha = easeInOut(p);
        ctx!.font = FONTS.winner48;
        ctx!.fillStyle = "#eab308";
        ctx!.textAlign = "center";
        ctx!.fillText("WINNER", W / 2, H / 2 - S(35));

        ctx!.font = FONTS.winner38;
        ctx!.fillStyle = "#fff";
        ctx!.fillText(winner, W / 2, H / 2 + S(25));
        ctx!.restore();

        if (pt > 2800) {
          onComplete();
          return;
        }
      }

      updateAndDrawSparks();

      if (flashAlpha > 0.01) {
        ctx!.fillStyle = `rgba(255,255,255,${flashAlpha * 0.7})`;
        ctx!.fillRect(-10, -10, W + 20, H + 20);
      }

      ctx!.restore();
      animId = requestAnimationFrame(frame);
    };

    animId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(animId);
  }, [winner, participants, onComplete, canvasSize]);

  return (
    <div ref={containerRef} className="flex flex-col items-center justify-center" style={{ width: "90vw", maxWidth: "90vw" }}>
      <canvas
        ref={canvasRef}
        width={canvasSize.w}
        height={canvasSize.h}
        className="rounded-2xl w-full"
        style={{ maxWidth: "1400px" }}
      />
    </div>
  );
}
