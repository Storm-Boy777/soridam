// Hi-fi Step 6-4 — AI 코칭 카드 (mobile + PC)

const COACH_TRANSCRIPT = {
  questionLabel: 'Q1 · 묘사 (Description)',
  question: 'I would like you to talk about the music you like to listen to. What kind of music do you enjoy? Who are some of your favorite musicians or composers?',
  duration: '0:48',
  segments: [
    { text: "I'm really into hip-hop these days. ", tone: 'good' },
    { text: "I usually listen on my way to work, ", tone: 'good' },
    { text: "and I ", tone: 'normal' },
    { text: "go to concerts ", tone: 'polish' },
    { text: "almost every month. ", tone: 'normal' },
    { text: "My favorite artist is Kendrick Lamar — his lyrics ", tone: 'normal' },
    { text: "are really meaningful", tone: 'good' },
    { text: " to me.", tone: 'normal' },
  ],
};

const Transcript = ({ size = 'lg' }) => (
  <div className="t-body" style={{ lineHeight: 1.75, fontSize: size === 'lg' ? 14 : 13 }}>
    {COACH_TRANSCRIPT.segments.map((s, i) => {
      if (s.tone === 'good') return <span key={i} className="hl good">{s.text}</span>;
      if (s.tone === 'polish') return <span key={i} className="hl polish">{s.text}</span>;
      return <span key={i}>{s.text}</span>;
    })}
  </div>
);

// ───────────── MOBILE ─────────────
const Step64Hifi = () => {
  const [tab, setTab] = React.useState('coach'); // coach | transcript
  return (
    <div className="hf hf-phone">
      <div className="status">
        <span className="num">9:41</span>
        <div className="dots"><i/><i/><i/></div>
        <span className="num">100%</span>
      </div>

      <div className="hf-header">
        <div className="hf-row center" style={{ gap: 8 }}>
          <span style={{ fontSize: 18, color: 'var(--ink-2)', cursor: 'pointer' }}>←</span>
          <div className="hf-stack">
            <span className="t-h3">Q1 · 코칭</span>
            <span className="t-micro ink-3">음악 콤보 · 1/3 질문</span>
          </div>
        </div>
        <div className="hf-row center" style={{ gap: 6 }}>
          <span className="mb-dot a live" style={{ width: 26, height: 26, fontSize: 10 }}>A</span>
        </div>
      </div>

      <div className="hf-tabs">
        <div className={`hf-tab ${tab==='coach'?'active':''}`} onClick={() => setTab('coach')}>코치 노트</div>
        <div className={`hf-tab ${tab==='transcript'?'active':''}`} onClick={() => setTab('transcript')}>내 답변</div>
      </div>

      <div className="body" style={{ padding: '20px' }}>
        {tab === 'coach' && (
          <div className="hf-stack" style={{ gap: 16 }}>
            {/* Coach intro */}
            <div className="hf-row" style={{ gap: 12, alignItems: 'flex-start' }}>
              <div className="coach-avatar lg">◐</div>
              <div className="hf-stack" style={{ gap: 4, flex: 1 }}>
                <span className="t-h3">AI 스터디 코치</span>
                <span className="t-xs ink-3">방금 도착 · 25초 분량</span>
              </div>
            </div>

            <p className="t-body" style={{ margin: 0, color: 'var(--ink)' }}>
              도입이 자연스러웠어요. <span className="hl">"I'm really into..."</span> 같은 표현이 시작을 부드럽게 만들어줬어요. 한 가지만 같이 다듬어볼까요?
            </p>

            {/* 잘한 점 */}
            <div className="coach-block good">
              <div className="hf-row center" style={{ gap: 6, marginBottom: 8 }}>
                <span className="tag good">잘한 점</span>
              </div>
              <p className="t-sm" style={{ margin: 0, color: 'var(--ink)' }}>
                도입부 connector가 자연스러워요. <span className="hl good">"I'm really into..."</span> 구문은 묘사 답변에서 가장 좋아하는 시작 방식 중 하나예요.
              </p>
            </div>

            {/* 다듬을 부분 */}
            <div className="coach-block polish">
              <div className="hf-row center" style={{ gap: 6, marginBottom: 8 }}>
                <span className="tag polish">다듬을 부분</span>
              </div>
              <p className="t-sm" style={{ margin: 0, color: 'var(--ink)' }}>
                <span className="hl polish">"go to concerts"</span> 부분에서 한 번 멈추셨어요. 다음번엔 <b>"I love going to concerts"</b>처럼 동사 형태를 살짝 바꿔보면 더 자연스러워요.
              </p>
            </div>

            {/* 팁 */}
            <div className="coach-block tip">
              <div className="hf-row center" style={{ gap: 6, marginBottom: 8 }}>
                <span className="tag tip">팁</span>
              </div>
              <p className="t-sm" style={{ margin: 0, color: 'var(--ink)' }}>
                AL 등급에서는 <b>구체적인 예시 한 가지</b>를 더 넣으면 좋아요. 예: "Kendrick Lamar의 'HUMBLE.'을 자주 들어요" 같은 디테일이요.
              </p>
            </div>

            {/* Action */}
            <div className="hf-row" style={{ gap: 8 }}>
              <button className="hf-btn secondary" style={{ flex: 1 }}>다시 듣기</button>
              <button className="hf-btn primary" style={{ flex: 1 }}>다음 질문</button>
            </div>
          </div>
        )}

        {tab === 'transcript' && (
          <div className="hf-stack" style={{ gap: 14 }}>
            <div className="hf-card" style={{ padding: 14 }}>
              <div className="hf-row between center" style={{ marginBottom: 10 }}>
                <span className="section-h">내 답변</span>
                <span className="t-xs ink-3 num">{COACH_TRANSCRIPT.duration}</span>
              </div>
              <Transcript size="md"/>
            </div>
            <div className="hf-row center" style={{ gap: 8, padding: '8px 4px' }}>
              <button className="hf-btn ghost sm">▶ 재생</button>
              <div className="hf-wave" style={{ flex: 1 }}>
                {Array.from({length: 32}).map((_, i) => (
                  <i key={i} style={{ height: 4 + Math.abs(Math.sin(i * 0.7)) * 18 }}/>
                ))}
              </div>
            </div>
            <div className="t-xs ink-3" style={{ padding: '0 4px', lineHeight: 1.6 }}>
              <span className="hl good" style={{ marginRight: 6 }}>잘한 부분</span>
              <span className="hl polish">다듬을 부분</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ───────────── PC ─────────────
const Step64HifiPC = () => (
  <div className="hf hf-pc">
    <div className="hf-header">
      <div className="hf-row center" style={{ gap: 12 }}>
        <span style={{ fontSize: 16, color: 'var(--ink-2)', cursor: 'pointer' }}>←</span>
        <div className="crumbs">
          <span>5월 오픽 AL 스터디</span>
          <span>›</span>
          <span>음악 콤보</span>
          <span>›</span>
          <span className="now">Q1 · 묘사</span>
        </div>
      </div>
      <div className="hf-row center" style={{ gap: 12 }}>
        <span className="pill live">실시간</span>
        <div className="mb-stack">
          <span className="mb-dot a live">A</span>
          <span className="mb-dot b live">B</span>
          <span className="mb-dot c live">C</span>
          <span className="mb-dot d live">D</span>
        </div>
        <span className="t-sm ink-3">콤보 1/3 진행 중</span>
      </div>
    </div>

    <div className="pc-dual">
      {/* LEFT — 전사 */}
      <div className="hf-card lift" style={{ padding: 24, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div className="hf-row between center" style={{ marginBottom: 12 }}>
          <span className="section-h">{COACH_TRANSCRIPT.questionLabel}</span>
          <span className="t-xs ink-3 num">{COACH_TRANSCRIPT.duration}</span>
        </div>
        <p className="t-body ink-2" style={{ margin: 0, marginBottom: 18, lineHeight: 1.55 }}>
          {COACH_TRANSCRIPT.question}
        </p>
        <div style={{ height: 1, background: 'var(--line)', margin: '0 -24px 18px' }}/>

        <span className="section-h" style={{ marginBottom: 10 }}>내 답변</span>
        <div style={{ flex: 1, overflow: 'auto' }}>
          <Transcript size="lg"/>
        </div>

        <div className="hf-row center" style={{ gap: 10, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
          <button className="hf-btn ghost sm">▶</button>
          <div className="hf-wave" style={{ flex: 1, height: 28 }}>
            {Array.from({length: 60}).map((_, i) => (
              <i key={i} style={{ height: 4 + Math.abs(Math.sin(i * 0.5)) * 22 }}/>
            ))}
          </div>
          <span className="t-xs ink-3 num">0:12 / 0:48</span>
        </div>
      </div>

      {/* RIGHT — 코치 노트 */}
      <div className="hf-stack" style={{ gap: 12, overflow: 'hidden' }}>
        {/* Coach intro */}
        <div className="hf-card lift" style={{ padding: 18 }}>
          <div className="hf-row" style={{ gap: 12, alignItems: 'flex-start' }}>
            <div className="coach-avatar lg">◐</div>
            <div className="hf-stack" style={{ gap: 6, flex: 1 }}>
              <div className="hf-row between center">
                <span className="t-h3">AI 스터디 코치</span>
                <span className="t-xs ink-3">방금 도착</span>
              </div>
              <p className="t-body" style={{ margin: 0, color: 'var(--ink)', lineHeight: 1.6 }}>
                도입이 자연스러웠어요. <span className="hl">"I'm really into..."</span> 같은 표현이 시작을 부드럽게 만들어줬어요. 한 가지만 같이 다듬어볼까요?
              </p>
            </div>
          </div>
        </div>

        {/* 3-block coaching */}
        <div className="hf-stack" style={{ gap: 10, flex: 1, overflow: 'auto' }}>
          <div className="coach-block good">
            <div className="hf-row center" style={{ gap: 6, marginBottom: 6 }}>
              <span className="tag good">잘한 점</span>
            </div>
            <p className="t-sm" style={{ margin: 0, lineHeight: 1.55 }}>
              도입부 connector가 자연스러워요. <span className="hl good">"I'm really into..."</span> 구문은 묘사 답변에서 가장 좋아하는 시작 방식 중 하나예요.
            </p>
          </div>

          <div className="coach-block polish">
            <div className="hf-row center" style={{ gap: 6, marginBottom: 6 }}>
              <span className="tag polish">다듬을 부분</span>
            </div>
            <p className="t-sm" style={{ margin: 0, lineHeight: 1.55 }}>
              <span className="hl polish">"go to concerts"</span> 부분에서 한 번 멈추셨어요. 다음번엔 <b>"I love going to concerts"</b>처럼 동사 형태를 살짝 바꿔보면 더 자연스러워요.
            </p>
          </div>

          <div className="coach-block tip">
            <div className="hf-row center" style={{ gap: 6, marginBottom: 6 }}>
              <span className="tag tip">팁</span>
            </div>
            <p className="t-sm" style={{ margin: 0, lineHeight: 1.55 }}>
              AL 등급에서는 <b>구체적인 예시 한 가지</b>를 더 넣으면 좋아요. 예: "Kendrick Lamar의 'HUMBLE.'을 자주 들어요" 같은 디테일이요.
            </p>
          </div>
        </div>

        <div className="hf-row" style={{ gap: 8 }}>
          <button className="hf-btn secondary" style={{ flex: 1 }}>다시 듣기</button>
          <button className="hf-btn primary" style={{ flex: 2 }}>다음 질문 →</button>
        </div>
      </div>
    </div>
  </div>
);

window.Step64Hifi = Step64Hifi;
window.Step64HifiPC = Step64HifiPC;
