// Hi-fi Step 6-1 / 6-2 / 6-3 / 7 — 세션 룸 나머지

// ───────────── shared chrome ─────────────
const HfStatus = () => (
  <div className="status">
    <span className="num">9:41</span>
    <div className="dots"><i/><i/><i/></div>
    <span className="num">100%</span>
  </div>
);

const HfHeader = ({ title, sub, right }) => (
  <div className="hf-header">
    <div className="hf-row center" style={{ gap: 8 }}>
      <span style={{ fontSize: 18, color: 'var(--ink-2)', cursor: 'pointer' }}>←</span>
      <div className="hf-stack">
        <span className="t-h3">{title}</span>
        {sub && <span className="t-micro ink-3">{sub}</span>}
      </div>
    </div>
    {right || <span className="pill live">실시간</span>}
  </div>
);

const StepBar = ({ now = 6, total = 7, sub }) => (
  <div className="hf-row center" style={{ gap: 6, padding: '16px 20px 0' }}>
    {Array.from({length: total}).map((_, i) => (
      <div key={i} style={{
        flex: i + 1 === now ? '0 0 24px' : 1,
        height: 4, borderRadius: 2,
        background: i + 1 < now ? 'var(--ink-2)' : i + 1 === now ? 'var(--tc)' : 'var(--line-strong)',
      }}/>
    ))}
    <span className="t-micro ink-3 num" style={{ marginLeft: 6 }}>{now} / {total}</span>
  </div>
);

// ─────────────────────────────────────────
// Step 6-1 · 발화자 선정
// ─────────────────────────────────────────
const Step61Hifi = () => {
  const [speaker, setSpeaker] = React.useState(null);
  return (
    <div className="hf hf-phone">
      <HfStatus/>
      <HfHeader title="Q1 · 누가 먼저?" sub="음악 콤보 · 1/3 질문"/>
      <StepBar now={6}/>

      <div className="body" style={{ padding: '20px' }}>
        <div className="hf-card" style={{ padding: 16, marginBottom: 16, background: 'var(--surface-2)', boxShadow: 'none' }}>
          <span className="section-h" style={{ marginBottom: 8, display: 'block' }}>이번 질문</span>
          <p className="t-body" style={{ margin: 0, lineHeight: 1.6, color: 'var(--ink)' }}>
            What kind of music do you enjoy? Who are some of your favorite musicians?
          </p>
        </div>

        <div className="hf-row between center" style={{ marginBottom: 12 }}>
          <span className="t-h3">먼저 답변할 사람</span>
          <span className="t-xs ink-3">먼저 누른 사람이 답변해요</span>
        </div>

        <div className="hf-stack" style={{ gap: 8 }}>
          {[
            { key: 'a', name: 'Alice', sub: '나' },
            { key: 'b', name: 'Bob', sub: '대기 중' },
            { key: 'c', name: 'Carol', sub: '대기 중' },
            { key: 'd', name: 'Dan', sub: '대기 중' },
          ].map(m => {
            const selected = speaker === m.key;
            return (
              <div key={m.key} className="hf-card"
                onClick={() => m.sub === '나' && setSpeaker(m.key)}
                style={{
                  padding: 14, display: 'flex', alignItems: 'center', gap: 12,
                  cursor: m.sub === '나' ? 'pointer' : 'default',
                  border: selected ? '1.5px solid var(--tc)' : '1.5px solid transparent',
                  background: selected ? 'var(--tc-tint)' : 'var(--surface)',
                  boxShadow: selected ? '0 0 0 4px rgba(201,100,66,0.08)' : 'var(--shadow-sm)',
                }}>
                <span className={`mb-dot ${m.key} live`} style={{ width: 36, height: 36, fontSize: 13 }}>{m.name[0]}</span>
                <div className="hf-stack" style={{ gap: 2, flex: 1 }}>
                  <span className="t-sm" style={{ fontWeight: 600 }}>{m.name}</span>
                  <span className="t-xs ink-3">{m.sub}</span>
                </div>
                {m.sub === '나' && !selected && <button className="hf-btn tc sm">내가 답변</button>}
                {selected && <span style={{ color: 'var(--tc)', fontWeight: 600, fontSize: 13 }}>✓ 선택됨</span>}
              </div>
            );
          })}
        </div>

        <div className="hf-card" style={{ padding: 12, marginTop: 16, display: 'flex', gap: 10, alignItems: 'flex-start', background: 'var(--surface-2)', boxShadow: 'none' }}>
          <div className="coach-avatar sm">◐</div>
          <p className="t-xs" style={{ margin: 0, lineHeight: 1.55, color: 'var(--ink-2)', flex: 1 }}>
            한 명이 답변하는 동안 나머지는 들으면서 표현을 메모해두세요.
          </p>
        </div>
      </div>

      <div className="hf-footer">
        <button className="hf-btn primary lg full" disabled={!speaker} style={!speaker ? { opacity: 0.4 } : null}>
          {speaker ? '답변 시작 →' : '답변자를 선택해주세요'}
        </button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────
// Step 6-2 · 답변 녹음 (본인)
// ─────────────────────────────────────────
const Step62SelfHifi = () => {
  const [recording, setRecording] = React.useState(true);
  return (
    <div className="hf hf-phone">
      <HfStatus/>
      <HfHeader title="Q1 · 답변 중" sub="당신이 답변할 차례예요" right={
        <span className="pill" style={{ background: 'rgba(201,100,66,0.12)', color: 'var(--tc)' }}>
          <span style={{ width: 6, height: 6, background: 'var(--tc)', borderRadius: '50%', display: 'inline-block', animation: 'pulse 1.2s infinite' }}/>
          녹음 중
        </span>
      }/>

      <div className="body" style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column' }}>
        <div className="hf-card" style={{ padding: 18, marginBottom: 20 }}>
          <span className="section-h" style={{ marginBottom: 10, display: 'block' }}>질문</span>
          <p className="t-body" style={{ margin: 0, lineHeight: 1.6 }}>
            What kind of music do you enjoy? Who are some of your favorite musicians or composers?
          </p>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 24 }}>
          {/* Big timer */}
          <div className="num" style={{ fontSize: 48, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.02em' }}>
            0:23
          </div>

          {/* Live wave */}
          <div className="hf-wave" style={{ height: 56, gap: 3 }}>
            {Array.from({length: 32}).map((_, i) => (
              <i key={i} style={{
                height: 6 + Math.abs(Math.sin(i * 0.4)) * 44,
                background: 'var(--tc)',
                width: 3,
              }}/>
            ))}
          </div>

          <span className="t-sm ink-3">권장 답변 길이 · 40~60초</span>
        </div>

        <div className="hf-row" style={{ gap: 10, marginTop: 20 }}>
          <button className="hf-btn secondary" style={{ flex: 1 }} onClick={() => setRecording(false)}>다시 시작</button>
          <button className="hf-btn primary" style={{ flex: 2 }}>답변 완료 →</button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────
// Step 6-2 · 답변 청취 (타인)
// ─────────────────────────────────────────
const Step62OtherHifi = () => (
  <div className="hf hf-phone">
    <HfStatus/>
    <HfHeader title="Q1 · 듣는 중" sub="Alice의 답변" right={
      <span className="pill live">실시간</span>
    }/>

    <div className="body" style={{ padding: '20px' }}>
      <div className="hf-card" style={{ padding: 14, marginBottom: 16, background: 'var(--surface-2)', boxShadow: 'none' }}>
        <p className="t-sm" style={{ margin: 0, lineHeight: 1.55, color: 'var(--ink-2)' }}>
          What kind of music do you enjoy? Who are some of your favorite musicians?
        </p>
      </div>

      {/* Speaker hero */}
      <div className="hf-card lift" style={{ padding: 24, textAlign: 'center', marginBottom: 16 }}>
        <span className="mb-dot a live" style={{ width: 64, height: 64, fontSize: 24, margin: '0 auto', display: 'flex' }}>A</span>
        <div className="t-h2" style={{ marginTop: 12 }}>Alice</div>
        <span className="pill" style={{ marginTop: 6, background: 'rgba(201,100,66,0.12)', color: 'var(--tc)' }}>
          <span style={{ width: 6, height: 6, background: 'var(--tc)', borderRadius: '50%', display: 'inline-block' }}/>
          답변 중
        </span>

        <div className="hf-wave" style={{ height: 36, gap: 2, marginTop: 18, justifyContent: 'center' }}>
          {Array.from({length: 28}).map((_, i) => (
            <i key={i} style={{
              height: 4 + Math.abs(Math.sin(i * 0.5)) * 28,
              background: 'var(--tc)',
              width: 2,
            }}/>
          ))}
        </div>
        <div className="num t-xs ink-3" style={{ marginTop: 10 }}>0:23</div>
      </div>

      {/* Note pad */}
      <div className="hf-card" style={{ padding: 14 }}>
        <div className="hf-row between center" style={{ marginBottom: 8 }}>
          <span className="section-h">메모</span>
          <span className="t-xs ink-3">나만 보여요</span>
        </div>
        <textarea placeholder="좋은 표현이 들리면 적어두세요…"
          style={{
            width: '100%', minHeight: 80, border: 'none', outline: 'none',
            fontFamily: 'var(--font)', fontSize: 13, lineHeight: 1.55,
            background: 'transparent', color: 'var(--ink)', resize: 'none',
          }}
          defaultValue="• &quot;I'm really into ~&quot; 도입 좋음&#10;• Kendrick Lamar 디테일 깔끔"
        />
      </div>

      {/* Other members status */}
      <div className="hf-row center" style={{ gap: 8, marginTop: 16, padding: '0 4px' }}>
        <span className="t-xs ink-3" style={{ flexShrink: 0 }}>듣는 중</span>
        <div className="mb-stack">
          <span className="mb-dot b live">B</span>
          <span className="mb-dot c live">C</span>
          <span className="mb-dot d live">D</span>
        </div>
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────
// Step 6-3 · AI 코칭 생성 중
// ─────────────────────────────────────────
const Step63Hifi = () => (
  <div className="hf hf-phone">
    <HfStatus/>
    <HfHeader title="Q1 · 코치가 듣는 중" sub="잠시만요" right={null}/>

    <div className="body" style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
      {/* Animated avatar */}
      <div style={{ position: 'relative' }}>
        <div className="coach-avatar" style={{ width: 88, height: 88, fontSize: 36 }}>◐</div>
        <div style={{
          position: 'absolute', inset: -8, borderRadius: '50%',
          border: '2px solid var(--tc)', opacity: 0.3,
          animation: 'pulse 2s infinite'
        }}/>
        <div style={{
          position: 'absolute', inset: -16, borderRadius: '50%',
          border: '1px solid var(--tc)', opacity: 0.15,
          animation: 'pulse 2s infinite .4s'
        }}/>
      </div>

      <div style={{ textAlign: 'center', maxWidth: 280 }}>
        <div className="t-h1" style={{ marginBottom: 6 }}>코치가 듣고 있어요</div>
        <p className="t-sm ink-3" style={{ margin: 0, lineHeight: 1.55 }}>
          4명의 답변을 함께 살펴보고 있어요.<br/>잠시만 기다려주세요.
        </p>
      </div>

      {/* Progress steps */}
      <div className="hf-card" style={{ padding: 16, width: '100%', marginTop: 10 }}>
        <div className="hf-stack" style={{ gap: 12 }}>
          {[
            { label: '답변 듣기', state: 'done' },
            { label: '표현 분석', state: 'doing' },
            { label: '코치 노트 정리', state: 'wait' },
          ].map((s, i) => (
            <div key={i} className="hf-row center" style={{ gap: 10 }}>
              <span style={{
                width: 18, height: 18, borderRadius: '50%',
                background: s.state === 'done' ? 'var(--good)' : s.state === 'doing' ? 'var(--tc)' : 'var(--line-strong)',
                color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700,
              }}>{s.state === 'done' ? '✓' : ''}</span>
              <span className="t-sm" style={{
                color: s.state === 'wait' ? 'var(--ink-3)' : 'var(--ink)',
                fontWeight: s.state === 'doing' ? 600 : 400,
              }}>{s.label}</span>
              {s.state === 'doing' && (
                <div className="hf-row" style={{ gap: 3, marginLeft: 'auto' }}>
                  <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--tc)', animation: 'bounce 1.2s infinite' }}/>
                  <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--tc)', animation: 'bounce 1.2s infinite .2s' }}/>
                  <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--tc)', animation: 'bounce 1.2s infinite .4s' }}/>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="t-xs ink-3" style={{ marginTop: 10 }}>약 8초 소요</div>
    </div>
  </div>
);

// ─────────────────────────────────────────
// Step 7 · 종료 / 인사이트
// ─────────────────────────────────────────
const Step7Hifi = () => (
  <div className="hf hf-phone">
    <HfStatus/>
    <HfHeader title="오늘의 학습" sub="음악 콤보 · 5월 2일" right={null}/>

    <div className="body" style={{ padding: '20px' }}>
      {/* Hero */}
      <div style={{ textAlign: 'center', padding: '20px 0 24px' }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🌱</div>
        <div className="t-display" style={{ marginBottom: 6 }}>오늘도 한 걸음</div>
        <p className="t-sm ink-3" style={{ margin: 0 }}>
          4명이 함께 음악 콤보 3문항을 끝냈어요
        </p>
      </div>

      {/* Today's BP */}
      <div className="insight" style={{ marginBottom: 16 }}>
        <div className="hf-row center" style={{ gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 16 }}>✨</span>
          <span className="t-h3">오늘의 베스트 표현</span>
        </div>
        <div className="hf-stack" style={{ gap: 6 }}>
          <div className="quote" style={{ background: 'rgba(255,255,255,0.6)' }}>
            I'm really into hip-hop these days
          </div>
          <span className="t-xs ink-3" style={{ marginLeft: 12 }}>— Alice의 도입 표현</span>
        </div>
      </div>

      {/* Coach note */}
      <div className="hf-card" style={{ padding: 16, marginBottom: 16 }}>
        <div className="hf-row" style={{ gap: 12, alignItems: 'flex-start', marginBottom: 12 }}>
          <div className="coach-avatar">◐</div>
          <div className="hf-stack" style={{ gap: 2, flex: 1 }}>
            <span className="t-sm" style={{ fontWeight: 600 }}>AI 스터디 코치</span>
            <span className="t-xs ink-3">오늘의 마무리</span>
          </div>
        </div>
        <p className="t-body" style={{ margin: 0, lineHeight: 1.6, color: 'var(--ink)' }}>
          오늘은 <span className="hl">"몰입 표현"</span>으로 도입을 시작하는 패턴을 함께 배웠어요. 다음 세션에서는 <b>구체적 디테일</b>을 하나씩 더 넣는 연습을 해볼까요?
        </p>
      </div>

      {/* Stats — 자연어만 */}
      <div className="hf-card" style={{ padding: 16, marginBottom: 16 }}>
        <span className="section-h" style={{ marginBottom: 12, display: 'block' }}>오늘 함께한 멤버</span>
        <div className="hf-stack" style={{ gap: 10 }}>
          {[
            { key: 'a', name: 'Alice', note: '도입 connector' },
            { key: 'b', name: 'Bob', note: '구체적 디테일' },
            { key: 'c', name: 'Carol', note: 'hedge 표현' },
            { key: 'd', name: 'Dan', note: '구어체 리듬' },
          ].map(m => (
            <div key={m.key} className="hf-row center" style={{ gap: 10 }}>
              <span className={`mb-dot ${m.key}`} style={{ width: 28, height: 28, fontSize: 11 }}>{m.name[0]}</span>
              <span className="t-sm" style={{ fontWeight: 500, flex: 1 }}>{m.name}</span>
              <span className="tag good" style={{ fontSize: 10 }}>BP · {m.note}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Next */}
      <div className="hf-card flat" style={{ padding: 14 }}>
        <span className="t-xs ink-3" style={{ marginBottom: 4, display: 'block' }}>다음 추천 콤보</span>
        <div className="hf-row between center">
          <span className="t-sm" style={{ fontWeight: 600 }}>여행 (Travel) · AL</span>
          <span className="t-xs ink-3">출제율 ↑</span>
        </div>
      </div>
    </div>

    <div className="hf-footer">
      <div className="hf-row" style={{ gap: 8 }}>
        <button className="hf-btn secondary" style={{ flex: 1 }}>홈으로</button>
        <button className="hf-btn primary" style={{ flex: 2 }}>이어서 다음 콤보 →</button>
      </div>
    </div>
  </div>
);

window.Step61Hifi = Step61Hifi;
window.Step62SelfHifi = Step62SelfHifi;
window.Step62OtherHifi = Step62OtherHifi;
window.Step63Hifi = Step63Hifi;
window.Step7Hifi = Step7Hifi;
