// 오프라인 쉐도잉 플레이어 생성기
//
// ExportScript[] → 자기완결 HTML 문자열.
// 외부 의존성 0, 인터넷 0. 오디오는 같은 폴더의 audio/ 를 상대경로로 참조한다.
// 사용자가 ZIP을 풀고 index.html을 더블클릭하면 바로 학습 도구가 된다.
//
// 구성 (심플):
//  · 좌: 카테고리 › 주제 › 짧은 한글 질문 트리
//  · 우: 영어 질문 / 한글 질문  →  스크립트(영어 / 한글)  →  가라오케(재생 중 문장 하이라이트)
//  · 하단: 최소 재생바 (재생·진행·속도)

import type { ExportScript } from "@/lib/actions/export";

/** </script> 로 태그를 탈출하는 것을 막는다 */
function embedJson(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/** 플레이어 없이도 읽히는 순수 텍스트본 — 플레이어가 안 열릴 때의 안전망 */
export function buildPlainText(scripts: ExportScript[]): string {
  const lines: string[] = [
    "소리담 — 내 스크립트 모음",
    `내보낸 날짜: ${new Date().toISOString().slice(0, 10)}`,
    `총 ${scripts.length}개`,
    "",
    "=".repeat(60),
    "",
  ];

  scripts.forEach((s, i) => {
    lines.push(`[${i + 1}] ${s.questionShort || s.title || s.topic || "제목 없음"}`);
    if (s.topic) lines.push(`주제: ${s.topic}${s.category ? ` (${s.category})` : ""}`);
    if (s.targetGrade) lines.push(`목표 등급: ${s.targetGrade}`);
    lines.push("");
    if (s.questionEnglish) lines.push(`Q. ${s.questionEnglish}`);
    if (s.questionKorean) lines.push(`   ${s.questionKorean}`);
    lines.push("");
    lines.push("[영어]");
    lines.push(s.englishText);
    if (s.koreanTranslation) {
      lines.push("");
      lines.push("[한국어]");
      lines.push(s.koreanTranslation);
    }
    if (s.keyExpressions.length > 0) {
      lines.push("");
      lines.push("[핵심 표현]");
      s.keyExpressions.forEach((k) => lines.push(`  · ${k}`));
    }
    if (s.audio) lines.push("", `음성 파일: audio/${s.audio.fileName}`);
    lines.push("", "-".repeat(60), "");
  });

  return lines.join("\n");
}

export function buildPlayerHtml(scripts: ExportScript[]): string {
  const withAudio = scripts.filter((s) => s.audio).length;

  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>소리담 — 내 스크립트 (${scripts.length}개)</title>
<style>
:root{
  --bg:#fff; --panel:#fff; --soft:#F5F6FA; --soft-2:#ECEEF6;
  --accent:#1C49FF; --accent-soft:#EEF2FF;
  --ink:#12205A; --ink-2:#4A5578; --ink-3:#7A82A3; --ink-4:#AEB4CC;
  --line:rgba(18,32,90,.08);
  --sb:280px; --bar:60px;
  --font:'Pretendard Variable',Pretendard,system-ui,-apple-system,'Segoe UI','Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',sans-serif;
}
[data-theme="dark"]{
  --bg:#0E1330; --panel:#141A3A; --soft:#1B2247; --soft-2:#242C57;
  --accent:#6E90FF; --accent-soft:#1E2856;
  --ink:#EAEDFB; --ink-2:#AEB6DE; --ink-3:#828BB6; --ink-4:#5A6291;
  --line:rgba(234,237,251,.09);
}
*{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{font-family:var(--font);background:var(--bg);color:var(--ink);
  -webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
svg{display:block}
button{font-family:inherit;cursor:pointer;border:none;background:none;color:inherit}
button:focus-visible{outline:2px solid var(--accent);outline-offset:2px}

/* ── 좌: 사이드바 ── */
.sb{position:fixed;left:0;top:0;bottom:0;width:var(--sb);z-index:40;background:var(--panel);
  box-shadow:1px 0 0 var(--line);display:flex;flex-direction:column}
.sb-h{display:flex;align-items:center;gap:10px;padding:20px 20px 14px}
.mk{width:26px;height:26px;border-radius:8px;flex:none;background:var(--accent);color:#fff;
  display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800}
[data-theme="dark"] .mk{color:#0E1330}
.sb-h b{font-size:15px;font-weight:700;letter-spacing:-.02em}
.sch{margin:0 16px 10px;position:relative}
.sch svg{position:absolute;left:13px;top:50%;transform:translateY(-50%);color:var(--ink-4)}
.sch input{width:100%;border:none;outline:none;background:var(--soft);color:var(--ink);
  font-family:inherit;font-size:13.5px;border-radius:10px;padding:10px 12px 10px 36px}
.sch input::placeholder{color:var(--ink-3)}
.tree{flex:1;overflow-y:auto;padding:2px 10px 20px}

.cat>.hd,.tp>.hd{display:flex;align-items:center;gap:7px;width:100%;text-align:left;
  border-radius:9px;cursor:pointer;color:var(--ink-2)}
.cat>.hd{padding:9px 8px;font-size:13.5px;font-weight:700;color:var(--ink)}
.tp>.hd{padding:7px 8px 7px 24px;font-size:13px;font-weight:500}
.cat>.hd:hover,.tp>.hd:hover{background:var(--soft)}
.cv{flex:none;color:var(--ink-4);transition:transform .18s ease}
.cat.o>.hd .cv,.tp.o>.hd .cv{transform:rotate(90deg)}
.nm{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.body{display:none}.cat.o>.body,.tp.o>.body{display:block}
.leaf{display:block;width:100%;text-align:left;padding:8px 10px 8px 42px;border-radius:9px;
  cursor:pointer;color:var(--ink-3);font-size:13px;line-height:1.45;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.leaf:hover{background:var(--soft);color:var(--ink-2)}
.leaf.on{background:var(--accent-soft);color:var(--accent);font-weight:600}
.empty{padding:24px 12px;text-align:center;color:var(--ink-4);font-size:13px}

/* ── 우: 본문 ── */
.app{margin-left:var(--sb);min-height:100vh;padding-bottom:calc(var(--bar) + 40px)}
.top{position:sticky;top:0;z-index:20;height:56px;display:flex;align-items:center;gap:4px;
  padding:0 18px;background:var(--bg);box-shadow:0 1px 0 var(--line)}
.top .t{flex:1;min-width:0;font-size:14px;font-weight:600;color:var(--ink-2);
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ic{width:38px;height:38px;flex:none;border-radius:9px;display:flex;align-items:center;
  justify-content:center;color:var(--ink-2)}
.ic:hover{background:var(--soft)}
.burger{display:none}

.page{max-width:680px;margin:0 auto;padding:40px 28px 0}
@media(max-width:720px){.page{padding:28px 18px 0}}

.qrow{display:flex;gap:16px;align-items:flex-start}
.qtext{flex:1;min-width:0}
.qplay{width:40px;height:40px;flex:none;border-radius:50%;background:var(--accent-soft);color:var(--accent);
  display:flex;align-items:center;justify-content:center;margin-top:1px;transition:.14s}
.qplay:hover,.qplay.playing{background:var(--accent);color:#fff}
.q .en{font-size:21px;line-height:1.4;font-weight:700;letter-spacing:-.02em;color:var(--ink)}
.q .ko{font-size:15px;line-height:1.55;color:var(--ink-3);margin-top:8px;font-weight:500}
.hide-en .q .en,.hide-ko .q .ko{display:none}
.rule{height:1px;background:var(--line);margin:28px 0}

.s{display:block;width:100%;text-align:left;position:relative;padding:16px 18px;border-radius:14px;
  cursor:pointer;transition:background .14s ease}
.s+.s{margin-top:4px}
.s:hover{background:var(--soft)}
.s.on{background:var(--accent-soft)}
.s .en{font-size:17.5px;line-height:1.6;color:var(--ink);letter-spacing:-.005em}
.s .ko{font-size:14.5px;line-height:1.55;color:var(--ink-3);margin-top:6px}
.s.on .ko{color:var(--ink-2)}
.flat{font-size:17px;line-height:1.75;white-space:pre-wrap;color:var(--ink)}
.flat.ko{font-size:15px;color:var(--ink-3);margin-top:22px}
.noaudio{margin-top:20px;font-size:13px;color:var(--ink-4)}

.err{display:none;margin-bottom:24px;padding:16px 18px;border-radius:14px;background:var(--accent-soft);
  color:var(--ink-2);font-size:14px;line-height:1.6}
.err.show{display:block}
.err b{display:block;margin-bottom:5px;font-size:15px;font-weight:700;color:var(--accent)}
.err code{background:var(--panel);border-radius:6px;padding:2px 7px;font-size:13px}

/* ── 하단 재생바 ── */
.pb{position:fixed;left:var(--sb);right:0;bottom:0;z-index:30;height:var(--bar);
  background:var(--panel);box-shadow:0 -1px 0 var(--line),0 -6px 28px rgba(18,32,90,.05);
  display:flex;align-items:center;gap:14px;padding:0 22px;padding-bottom:env(safe-area-inset-bottom)}
.play{width:42px;height:42px;flex:none;border-radius:50%;background:var(--accent);color:#fff;
  display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(28,73,255,.3)}
[data-theme="dark"] .play{color:#0E1330}
.play:hover{filter:brightness(1.07)}
.time{font-size:12.5px;font-weight:600;color:var(--ink-3);font-variant-numeric:tabular-nums;flex:none}
.scrub{flex:1;height:5px;background:var(--soft-2);border-radius:3px;cursor:pointer;position:relative}
.scrub .fill{position:absolute;left:0;top:0;bottom:0;background:var(--accent);border-radius:3px;width:0}
.spd{flex:none;height:32px;padding:0 13px;border-radius:999px;background:var(--soft);
  font-size:12.5px;font-weight:700;color:var(--ink-2);font-variant-numeric:tabular-nums}
.spd:hover{background:var(--soft-2)}
.tog{flex:none;height:32px;padding:0 12px;border-radius:999px;background:var(--soft);
  font-size:12.5px;font-weight:700;color:var(--ink-4)}
.tog:hover{background:var(--soft-2)}
.tog.on{background:var(--accent-soft);color:var(--accent)}
/* 언어 끄기 — 해당 언어 텍스트만 숨김 (문장은 그대로 클릭·재생) */
.hide-en .s .en,.hide-en .flat:not(.ko){display:none}
.hide-ko .s .ko,.hide-ko .flat.ko{display:none}

.scrim{position:fixed;inset:0;z-index:39;background:rgba(18,32,90,.35);display:none}
@media(max-width:860px){
  .sb{transform:translateX(-100%);transition:transform .22s ease}
  .sb.o{transform:none}
  .scrim.show{display:block}
  .app{margin-left:0}
  .pb{left:0}
  .burger{display:flex}
}
</style>
</head>
<body>

<aside class="sb" id="sb">
  <div class="sb-h"><div class="mk">소</div><b>내 스크립트</b></div>
  <div class="sch">
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
    <input id="q" placeholder="검색" autocomplete="off">
  </div>
  <nav class="tree" id="tree"></nav>
</aside>
<div class="scrim" id="scrim"></div>

<div class="app">
  <div class="top">
    <button class="ic burger" id="burger" title="목록"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg></button>
    <div class="t" id="topT">—</div>
    <button class="ic" id="thBtn" title="라이트/다크"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"/></svg></button>
  </div>
  <main class="page" id="main"></main>
</div>

<div class="pb">
  <button class="play" id="pp"><svg id="ppI" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z"/></svg></button>
  <span class="time" id="tc">0:00</span>
  <div class="scrub" id="scrub"><div class="fill" id="fill"></div></div>
  <span class="time" id="td">0:00</span>
  <button class="tog on" id="tEn">영어</button>
  <button class="tog on" id="tKo">한글</button>
  <button class="spd" id="spd">1.0×</button>
</div>

<audio id="au"></audio>
<audio id="auQ"></audio>

<script>
var DATA = ${embedJson(scripts)};
var au = document.getElementById("au");
var auQ = document.getElementById("auQ");
var cur = 0, act = -1, follow = true;
var SPEEDS = [1, 1.25, 1.5, 0.75], sp = 0;
var IC_PLAY = '<path d="M8 5.5v13l11-6.5z"/>';
var IC_PAUSE = '<path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/>';

function esc(t){return String(t).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}
function s2(n){n=Math.max(0,Math.round(n||0));return Math.floor(n/60)+":"+String(n%60).padStart(2,"0");}
function S(){return DATA[cur];}
function sents(){var s=S();return (s&&s.audio&&s.audio.sentences)||[];}
function leafLabel(s){
  if(s.questionShort) return s.questionShort;
  if(s.title) return s.title;
  var k=s.questionKorean||""; if(k) return k.length>22?k.slice(0,22)+"…":k;
  return s.topic||"제목 없음";
}

/* ── 본문 ── */
function render(){
  var s=S(), main=document.getElementById("main");
  if(!s){main.innerHTML="<div class='empty'>스크립트가 없습니다.</div>";return;}
  act=-1; follow=true;
  document.getElementById("topT").textContent = leafLabel(s);

  var h="<div class='err' id='err'></div>";
  h+="<div class='q'><div class='qrow'>";
  h+="<div class='qtext'>";
  if(s.questionEnglish) h+="<div class='en'>"+esc(s.questionEnglish)+"</div>";
  else h+="<div class='en'>"+esc(leafLabel(s))+"</div>";
  if(s.questionKorean) h+="<div class='ko'>"+esc(s.questionKorean)+"</div>";
  h+="</div>";
  if(s.questionAudio) h+="<button class='qplay' id='qplay' title='질문 듣기'><svg width='20' height='20' viewBox='0 0 24 24'><path d='M4 9.5v5h3.5L12 18V6L7.5 9.5H4z' fill='currentColor'/><path d='M15.5 9.3a4 4 0 0 1 0 5.4' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round'/><path d='M18 7a7 7 0 0 1 0 10' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round'/></svg></button>";
  h+="</div></div><div class='rule'></div>";

  if(sents().length){
    sents().forEach(function(t,i){
      h+="<button class='s' data-i='"+i+"'>"
        +"<div class='en'>"+esc(t.english)+"</div>"
        +(t.korean?"<div class='ko'>"+esc(t.korean)+"</div>":"")
        +"</button>";
    });
  } else {
    h+="<div class='flat'>"+esc(s.englishText)+"</div>";
    if(s.koreanTranslation) h+="<div class='flat ko'>"+esc(s.koreanTranslation)+"</div>";
    if(!s.audio) h+="<div class='noaudio'>이 스크립트는 음성이 없어 재생되지 않습니다.</div>";
  }
  main.innerHTML=h;

  if(s.audio){ au.src="audio/"+s.audio.fileName; au.playbackRate=SPEEDS[sp]; }
  else au.removeAttribute("src");

  Array.prototype.forEach.call(document.querySelectorAll(".s"),function(el){
    el.onclick=function(){
      var i=+el.dataset.i;
      // 재생 중인 문장을 다시 누르면 일시정지, 그 외에는 그 문장부터 재생
      if(i===act && !au.paused){ au.pause(); return; }
      playFrom(i);
    };
  });

  // 질문 음성 재생 버튼
  var qp=document.getElementById("qplay");
  if(qp && s.questionAudio){
    var qsrc="audio/"+s.questionAudio.fileName;
    qp.onclick=function(){
      if(!auQ.paused){ auQ.pause(); return; }
      au.pause();  // 문장 재생 중지
      if(auQ.getAttribute("src")!==qsrc){ auQ.src=qsrc; }
      var p=auQ.play(); if(p&&p.catch)p.catch(function(){ showErr(); });
    };
  }

  document.getElementById("tc").textContent="0:00";
  document.getElementById("td").textContent="0:00";
  document.getElementById("fill").style.width="0";
}

/* ── 재생 / 가라오케 ── */
function showErr(){
  var s=S(), e=document.getElementById("err"); if(!e)return;
  e.innerHTML="<b>음성 파일을 찾을 수 없어요</b>ZIP 안에서 바로 여시면 음성이 함께 풀리지 않아요. 압축을 먼저 푼 뒤, 풀린 폴더의 index.html을 열어주세요.<div style='margin-top:6px'>찾는 위치: <code>audio/"+esc(s&&s.audio?s.audio.fileName:"")+"</code></div>";
  e.className="err show";
}
function play(){ auQ.pause(); var p=au.play(); if(p&&p.catch)p.catch(showErr); }

// 질문 음성 ↔ 문장 음성 상호 배타 + 버튼 아이콘 토글
au.addEventListener("play",function(){ auQ.pause(); });
auQ.addEventListener("play",function(){ au.pause(); var q=document.getElementById("qplay"); if(q)q.classList.add("playing"); });
auQ.addEventListener("pause",function(){ var q=document.getElementById("qplay"); if(q)q.classList.remove("playing"); });
auQ.addEventListener("ended",function(){ var q=document.getElementById("qplay"); if(q)q.classList.remove("playing"); });
function playFrom(i){
  var arr=sents(); if(!arr[i])return;
  follow=true; act=i;
  var go=function(){au.currentTime=arr[i].start;play();};
  if(au.readyState===0){au.addEventListener("loadedmetadata",function o(){au.removeEventListener("loadedmetadata",o);go();});}
  else go();
  mark(); scrollTo_(i);
}
function mark(){
  Array.prototype.forEach.call(document.querySelectorAll(".s"),function(el){
    el.classList.toggle("on", +el.dataset.i===act);
  });
}
function scrollTo_(i){
  if(!follow)return;
  var el=document.querySelector(".s[data-i='"+i+"']");
  if(el) el.scrollIntoView({block:"center",behavior:"smooth"});
}
au.addEventListener("timeupdate",function(){
  var dur=au.duration||0;
  document.getElementById("tc").textContent=s2(au.currentTime);
  if(dur) document.getElementById("fill").style.width=(au.currentTime/dur*100)+"%";
  // 현재 문장 하이라이트 (하단바 진행만, 문장 밑줄 없음)
  var arr=sents(), found=-1;
  for(var i=0;i<arr.length;i++){
    if(au.currentTime>=arr[i].start && au.currentTime<arr[i].end){ found=i; break; }
  }
  if(found>=0 && found!==act){ act=found; mark(); scrollTo_(found); }
});
au.addEventListener("loadedmetadata",function(){ document.getElementById("td").textContent=s2(au.duration); });
au.addEventListener("error",function(){ if(au.getAttribute("src")) showErr(); });
au.addEventListener("play",function(){ document.getElementById("ppI").innerHTML=IC_PAUSE; });
au.addEventListener("pause",function(){ document.getElementById("ppI").innerHTML=IC_PLAY; });
au.addEventListener("ended",function(){ act=-1; mark(); });

document.getElementById("pp").onclick=function(){ au.paused?play():au.pause(); };
document.getElementById("scrub").onclick=function(e){
  if(!au.duration)return; var r=this.getBoundingClientRect();
  au.currentTime=(e.clientX-r.left)/r.width*au.duration;
};
document.getElementById("spd").onclick=function(){
  sp=(sp+1)%SPEEDS.length; au.playbackRate=SPEEDS[sp];
  this.textContent=SPEEDS[sp].toFixed(SPEEDS[sp]%1?2:1).replace(/0$/,"")+"×";
};
document.getElementById("tEn").onclick=function(){
  var off=document.body.classList.toggle("hide-en"); this.classList.toggle("on",!off);
};
document.getElementById("tKo").onclick=function(){
  var off=document.body.classList.toggle("hide-ko"); this.classList.toggle("on",!off);
};
document.getElementById("thBtn").onclick=function(){
  var d=document.documentElement.getAttribute("data-theme")==="dark";
  document.documentElement.setAttribute("data-theme",d?"light":"dark");
  try{localStorage.setItem("soridam:theme",d?"light":"dark");}catch(e){}
};
try{var th=localStorage.getItem("soridam:theme"); if(th)document.documentElement.setAttribute("data-theme",th);}catch(e){}

// 사용자가 스크롤하면 자동 따라가기 일시 해제 (클릭·문장전환 시 재개)
var stO=null;
window.addEventListener("scroll",function(){
  if(stO)return; stO=setTimeout(function(){stO=null;
    if(act<0)return; var el=document.querySelector(".s[data-i='"+act+"']"); if(!el)return;
    var r=el.getBoundingClientRect();
    follow=(r.top>-40 && r.bottom<window.innerHeight+40);
  },140);
},{passive:true});

/* ── 트리 (카테고리 › 주제 › 짧은 질문) ── */
var CV='<svg class="cv" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>';
var CAT_ORDER=["일반","롤플레이","어드밴스"];
function buildTree(filter){
  var f=(filter||"").toLowerCase(), s=S();
  var curCat=s?(s.category||"기타"):"", curTop=s?(s.topic||"기타"):"";
  var cats={}, order=[];
  DATA.forEach(function(d,i){
    var c=d.category||"기타", t=d.topic||"기타";
    if(!cats[c]){cats[c]={t:{},o:[]};order.push(c);}
    if(!cats[c].t[t]){cats[c].t[t]=[];cats[c].o.push(t);}
    cats[c].t[t].push(i);
  });
  order.sort(function(a,b){var ia=CAT_ORDER.indexOf(a),ib=CAT_ORDER.indexOf(b);
    return (ia<0?99:ia)-(ib<0?99:ib)||order.indexOf(a)-order.indexOf(b);});

  var html="", shown=0;
  order.forEach(function(c){
    var rows="";
    cats[c].o.forEach(function(t){
      var leaves=cats[c].t[t].filter(function(i){
        return !f || (leafLabel(DATA[i])+" "+t+" "+c).toLowerCase().indexOf(f)>=0;
      });
      if(!leaves.length)return; shown+=leaves.length;
      var lr=leaves.map(function(i){
        return "<button class='leaf"+(i===cur?" on":"")+"' data-i='"+i+"'>"+esc(leafLabel(DATA[i]))+"</button>";
      }).join("");
      var open=(f||(c===curCat&&t===curTop));
      rows+="<div class='tp"+(open?" o":"")+"'><button class='hd'>"+CV+"<span class='nm'>"+esc(t)+"</span></button><div class='body'>"+lr+"</div></div>";
    });
    if(!rows)return;
    var open=(f||c===curCat);
    html+="<div class='cat"+(open?" o":"")+"'><button class='hd'>"+CV+"<span class='nm'>"+esc(c)+"</span></button><div class='body'>"+rows+"</div></div>";
  });
  var tree=document.getElementById("tree");
  tree.innerHTML=shown?html:"<div class='empty'>검색 결과가 없어요</div>";
  Array.prototype.forEach.call(tree.querySelectorAll(".cat>.hd,.tp>.hd"),function(b){
    b.onclick=function(){b.parentNode.classList.toggle("o");};
  });
  Array.prototype.forEach.call(tree.querySelectorAll(".leaf"),function(b){
    b.onclick=function(){pick(+b.dataset.i);};
  });
}
function pick(i){
  if(i!==cur){ cur=i; au.pause(); auQ.pause(); render(); buildTree(document.getElementById("q").value); window.scrollTo(0,0); }
  closeDrawer();
}

/* ── 모바일 드로어 + 검색 ── */
var sb=document.getElementById("sb"), scrim=document.getElementById("scrim");
function closeDrawer(){sb.classList.remove("o");scrim.classList.remove("show");}
document.getElementById("burger").onclick=function(){sb.classList.add("o");scrim.classList.add("show");};
scrim.onclick=closeDrawer;
document.getElementById("q").addEventListener("input",function(){buildTree(this.value);});
document.addEventListener("keydown",function(e){
  if(e.target.tagName==="INPUT"){if(e.key==="Escape"){e.target.blur();closeDrawer();}return;}
  if(e.key===" "){e.preventDefault();au.paused?play():au.pause();}
  else if(e.key==="Escape")closeDrawer();
});

render();
buildTree("");
</script>
</body>
</html>`;
}
