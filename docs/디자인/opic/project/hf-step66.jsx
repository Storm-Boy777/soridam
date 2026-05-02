// Hi-fi Step 6-6 — 4명 동시 비교 (mobile + PC)
// 핵심: 순위 X, 함께 배우는 BP(Best Practice) 공유

const MEMBERS_66 = [
  {
    key: 'a', name: 'Alice', initial: 'A',
    answer: "I'm really into hip-hop these days. I usually listen on my way to work — Kendrick Lamar's lyrics are really meaningful to me.",
    bp: { tag: '도입 connector', note: 'into 구문이 자연스러워요' },
    polish: '시제 연결',
  },
  {
    key: 'b', name: 'Bob', initial: 'B',
    answer: "Well, I love jazz. My favorite is Miles Davis, and I often go to live shows in small clubs around the city.",
    bp: { tag: '구체적 디테일', note: '"small clubs around the city"' },
    polish: '도입부 길이',
  },
  {
    key: 'c', name: 'Carol', initial: 'C',
    answer: "I mostly listen to K-pop. I would say BTS and IU are the artists I follow the most. Their songs help me relax.",
    bp: { tag: 'I would say…', note: 'AL 등급 hedge 표현' },
    polish: '문장 다양성',
  },
  {
    key: 'd', name: 'Dan', initial: 'D',
    answer: "Honestly, I enjoy all kinds of music — but lately I've been hooked on indie rock. Tame Impala is on repeat.",
    bp: { tag: '리듬감', note: '"on repeat" 같은 구어체' },
    polish: '시작 어휘',
  },
];

// ───────────── MOBILE ─────────────
const Step66Hifi = () => {
  const [focused, setFocused] = React.useState(null);
  const focus = focused != null ? MEMBERS_66[focused] : null;

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
            <span className="t-h3">함께 보기</span>
            <span className="t-micro ink-3">Q1 · 4명의 답변</span>
          </div>
        </div>
        <span className="pill live">실시간</span>
      </div>

      <div className="body" style={{ padding: '20px' }}>
        {/* Insight strip */}
        <div className="insight" style={{ marginBottom: 16 }}>
          <div className="hf-row center" style={{ gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 14 }}>✨</span>
            <span className="t-h3">오늘 4명에게서 배운 점</span>
          </div>
          <p className="t-sm" style={{ margin: 0, lineHeight: 1.55, color: 'var(--ink)' }}>
            네 명 모두 <b>"into / hooked on"</b> 같은 <b>몰입 표현</b>으로 시작했어요. 묘사 콤보의 좋은 도입 패턴이에요.
          </p>
        </div>

        {/* 2x2 grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {MEMBERS_66.map((m, i) => (
            <div key={m.key} className="hf-card" style={{ padding: 12, cursor: 'pointer' }} onClick={() => setFocused(i)}>
              <div className="hf-row center" style={{ gap: 8, marginBottom: 8 }}>
                <span className={`mb-dot ${m.key}`} style={{ width: 24, height: 24, fontSize: 10 }}>{m.initial}</span>
                <span className="t-sm" style={{ fontWeight: 600 }}>{m.name}</span>
              </div>
              <p className="t-xs" style={{ margin: 0, lineHeight: 1.5, color: 'var(--ink-2)',
                display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {m.answer}
              </p>
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--line)' }}>
                <span className="tag good" style={{ fontSize: 10 }}>BP · {m.bp.tag}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Coach footer */}
        <div className="hf-card" style={{ padding: 14, marginTop: 16, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <div className="coach-avatar">◐</div>
          <div className="hf-stack" style={{ gap: 4, flex: 1 }}>
            <span className="t-xs" style={{ fontWeight: 600 }}>AI 스터디 코치</span>
            <p className="t-xs" style={{ margin: 0, lineHeight: 1.55, color: 'var(--ink-2)' }}>
              네 명의 답변을 모두 들어보고, 마음에 드는 표현 하나씩 골라 다음 답변에 써보세요.
            </p>
          </div>
        </div>
      </div>

      <div className="hf-footer">
        <button className="hf-btn primary lg full">다음 질문 →</button>
      </div>

      {/* Focus overlay */}
      {focus && (
        <div onClick={() => setFocused(null)} style={{
          position: 'absolute', inset: 0, background: 'rgba(31,27,22,0.4)',
          display: 'flex', alignItems: 'flex-end', zIndex: 10, animation: 'fadeIn .15s'
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'var(--bg)', borderTopLeftRadius: 24, borderTopRightRadius: 24,
            padding: 20, width: '100%', maxHeight: '80%', overflow: 'auto'
          }}>
            <div style={{ width: 40, height: 4, background: 'var(--line-strong)', borderRadius: 2, margin: '0 auto 16px' }}/>
            <div className="hf-row center" style={{ gap: 10, marginBottom: 12 }}>
              <span className={`mb-dot ${focus.key}`}>{focus.initial}</span>
              <span className="t-h2">{focus.name}</span>
            </div>
            <div className="quote" style={{ marginBottom: 14 }}>{focus.answer}</div>
            <div className="coach-block good" style={{ marginBottom: 10 }}>
              <div className="tag good" style={{ marginBottom: 6 }}>이 점이 베스트</div>
              <p className="t-sm" style={{ margin: 0 }}><b>{focus.bp.tag}</b> — {focus.bp.note}</p>
            </div>
            <div className="coach-block polish">
              <div className="tag polish" style={{ marginBottom: 6 }}>같이 배워볼 점</div>
              <p className="t-sm" style={{ margin: 0 }}>{focus.polish}을 다음 답변에 의식해보면 좋아요.</p>
            </div>
            <button className="hf-btn ghost full" style={{ marginTop: 12 }} onClick={() => setFocused(null)}>닫기</button>
          </div>
        </div>
      )}
    </div>
  );
};

// ───────────── PC — 4컬럼 ─────────────
const Step66HifiPC = () => (
  <div className="hf hf-pc">
    <div className="hf-header">
      <div className="hf-row center" style={{ gap: 12 }}>
        <span style={{ fontSize: 16, color: 'var(--ink-2)', cursor: 'pointer' }}>←</span>
        <div className="crumbs">
          <span>5월 오픽 AL 스터디</span>
          <span>›</span>
          <span>음악 콤보</span>
          <span>›</span>
          <span className="now">Q1 · 함께 보기</span>
        </div>
      </div>
      <div className="hf-row center" style={{ gap: 12 }}>
        <span className="pill live">실시간</span>
        <button className="hf-btn primary sm">다음 질문 →</button>
      </div>
    </div>

    {/* Insight strip */}
    <div style={{ padding: '14px 20px 0' }}>
      <div className="insight">
        <div className="hf-row between center">
          <div className="hf-row center" style={{ gap: 10 }}>
            <span style={{ fontSize: 18 }}>✨</span>
            <div className="hf-stack" style={{ gap: 2 }}>
              <span className="t-h3">오늘 4명에게서 배운 점</span>
              <p className="t-sm" style={{ margin: 0, color: 'var(--ink-2)' }}>
                네 명 모두 <b>"into / hooked on / love"</b> 같은 <b>몰입 표현</b>으로 자연스럽게 시작했어요. 묘사 콤보의 좋은 도입 패턴이에요.
              </p>
            </div>
          </div>
          <div className="hf-row center" style={{ gap: 8 }}>
            <span className="coach-avatar sm">◐</span>
            <span className="t-xs ink-3">AI 스터디 코치 정리</span>
          </div>
        </div>
      </div>
    </div>

    <div className="pc-grid-4">
      {MEMBERS_66.map(m => (
        <div key={m.key} className="mb-col">
          <div className="mb-col-h">
            <span className={`mb-dot ${m.key} live`}>{m.initial}</span>
            <div className="hf-stack" style={{ gap: 0, flex: 1 }}>
              <span className="t-sm" style={{ fontWeight: 600 }}>{m.name}</span>
              <span className="t-micro ink-3">0:{40 + Math.floor(Math.random() * 15)}</span>
            </div>
            <button className="hf-btn ghost sm">▶</button>
          </div>
          <div className="mb-col-body">
            {/* Quote */}
            <div className="quote" style={{ marginBottom: 12 }}>{m.answer}</div>

            {/* Wave */}
            <div className="hf-wave" style={{ marginBottom: 14, height: 20 }}>
              {Array.from({length: 28}).map((_, i) => (
                <i key={i} style={{ height: 3 + Math.abs(Math.sin((i + m.key.charCodeAt(0)) * 0.6)) * 16 }}/>
              ))}
            </div>

            {/* BP */}
            <div className="coach-block good" style={{ padding: '10px 12px', marginBottom: 8 }}>
              <span className="tag good" style={{ marginBottom: 6, display: 'inline-flex' }}>이 점이 베스트</span>
              <p className="t-xs" style={{ margin: '6px 0 0', lineHeight: 1.5, color: 'var(--ink)' }}>
                <b>{m.bp.tag}</b><br/>
                <span className="ink-2">{m.bp.note}</span>
              </p>
            </div>

            {/* Polish */}
            <div className="coach-block polish" style={{ padding: '10px 12px' }}>
              <span className="tag polish" style={{ marginBottom: 6, display: 'inline-flex' }}>같이 배워볼 점</span>
              <p className="t-xs" style={{ margin: '6px 0 0', lineHeight: 1.5, color: 'var(--ink-2)' }}>
                {m.polish}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>

    <div style={{ padding: '12px 20px 16px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span className="t-xs ink-3">콤보 1/3 · 다음 질문에서 마음에 든 표현 한 가지씩 써보세요</span>
      <div className="hf-row" style={{ gap: 8 }}>
        <button className="hf-btn secondary sm">전체 다시 듣기</button>
        <button className="hf-btn primary sm">다음 질문 →</button>
      </div>
    </div>
  </div>
);

window.Step66Hifi = Step66Hifi;
window.Step66HifiPC = Step66HifiPC;
