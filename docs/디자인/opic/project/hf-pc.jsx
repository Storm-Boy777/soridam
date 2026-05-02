// Hi-fi PC 화면들 — Step 1, 2, 3, 4, 5, 6-1, 6-2, 6-3, 7 + 홈

const HfPCHeader = ({ crumb = [], right }) => (
  <div className="hf-header">
    <div className="hf-row center" style={{ gap: 12 }}>
      <span style={{ fontSize: 16, color: 'var(--ink-2)', cursor: 'pointer' }}>←</span>
      <div className="crumbs">
        {crumb.map((c, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span>›</span>}
            <span className={i === crumb.length - 1 ? 'now' : ''}>{c}</span>
          </React.Fragment>
        ))}
      </div>
    </div>
    {right || (
      <div className="hf-row center" style={{ gap: 12 }}>
        <span className="pill live">실시간</span>
        <div className="mb-stack">
          <span className="mb-dot a live">A</span>
          <span className="mb-dot b live">B</span>
          <span className="mb-dot c live">C</span>
          <span className="mb-dot d live">D</span>
        </div>
      </div>
    )}
  </div>
);

const PCStepBar = ({ now = 1, total = 7 }) => (
  <div style={{ padding: '14px 24px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
    {Array.from({length: total}).map((_, i) => (
      <div key={i} style={{
        flex: i + 1 === now ? '0 0 32px' : 1,
        height: 4, borderRadius: 2,
        background: i + 1 < now ? 'var(--ink-2)' : i + 1 === now ? 'var(--tc)' : 'var(--line-strong)',
      }}/>
    ))}
    <span className="t-micro ink-3 num" style={{ marginLeft: 8 }}>Step {now} / {total}</span>
  </div>
);

// 공통 PC 컨테이너
const PCContainer = ({ title, sub, children, footer }) => (
  <div className="hf hf-pc">
    {children}
    {footer}
  </div>
);

// ─────────────────────────────────────────
// Step 1 PC — 모드 선택
// ─────────────────────────────────────────
const Step1HifiPC = () => {
  const [mode, setMode] = React.useState('online');
  return (
    <div className="hf hf-pc">
      <HfPCHeader crumb={['5월 오픽 AL 스터디', '세션 룸']} right={<span className="pill live">실시간</span>}/>
      <PCStepBar now={1}/>
      <div style={{ padding: '32px 64px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: 880, margin: '0 auto', width: '100%' }}>
        <h1 className="t-display" style={{ margin: '0 0 8px', fontSize: 36 }}>오늘 어떻게 모일까요?</h1>
        <p className="t-body ink-3" style={{ margin: '0 0 32px' }}>학습 중에도 언제든 바꿀 수 있어요.</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {[
            { key: 'online', icon: '📡', name: '온라인', desc: '화상으로 모여서 함께 답변하고 코칭을 받아요', tags: ['화상 통화', '실시간 동기화'] },
            { key: 'offline', icon: '👥', name: '오프라인', desc: '한 공간에 모여서 함께 답변하고 코칭을 받아요', tags: ['대면 모임', '한 화면 공유'] },
          ].map(m => (
            <div key={m.key} className={`mode-card ${mode === m.key ? 'selected' : ''}`} onClick={() => setMode(m.key)} style={{ padding: 28 }}>
              <div className="check">✓</div>
              <div style={{
                width: 56, height: 56, borderRadius: 14,
                background: mode === m.key ? 'var(--tc)' : 'var(--surface-2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 26, marginBottom: 16,
              }}>{m.icon}</div>
              <div className="t-h1" style={{ marginBottom: 6 }}>{m.name}</div>
              <p className="t-body ink-3" style={{ margin: '0 0 12px', lineHeight: 1.5 }}>{m.desc}</p>
              <div className="hf-row" style={{ gap: 6 }}>
                {m.tags.map(t => <span key={t} className="pill">{t}</span>)}
              </div>
            </div>
          ))}
        </div>

        <div className="hf-card" style={{ padding: 16, marginTop: 24, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div className="mb-stack">
            <span className="mb-dot a live">A</span>
            <span className="mb-dot b live">B</span>
            <span className="mb-dot c live">C</span>
            <span className="mb-dot d live">D</span>
          </div>
          <div className="hf-stack" style={{ gap: 2, flex: 1 }}>
            <span className="t-sm" style={{ fontWeight: 600 }}>4명 모두 준비 완료</span>
            <span className="t-xs ink-3">Alice · Bob · Carol · Dan</span>
          </div>
          <button className="hf-btn primary lg" style={{ minWidth: 140 }}>시작하기 →</button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────
// Step 2 PC — 카테고리
// ─────────────────────────────────────────
const Step2HifiPC = () => {
  const [sel, setSel] = React.useState('general');
  const cats = [
    { key: 'general', name: '일반 주제', desc: '음악·여행·영화 등 일상 카테고리', tag: '추천', icon: '🌿' },
    { key: 'rp', name: '롤플레이', desc: '주어진 상황에서 역할극 답변', tag: null, icon: '🎭' },
    { key: 'adv', name: '어드밴스', desc: '복합 질문 · IH~AL 도전', tag: 'AL 도전', icon: '🎯' },
  ];
  return (
    <div className="hf hf-pc">
      <HfPCHeader crumb={['5월 오픽 AL 스터디', '카테고리']}/>
      <PCStepBar now={2}/>
      <div style={{ padding: '32px 64px', flex: 1, maxWidth: 1040, margin: '0 auto', width: '100%' }}>
        <h1 className="t-display" style={{ margin: '0 0 8px', fontSize: 32 }}>어떤 카테고리로 모일까요?</h1>
        <p className="t-body ink-3" style={{ margin: '0 0 28px' }}>처음이면 일반 주제부터 시작하는 걸 추천해요.</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {cats.map(c => (
            <div key={c.key} className={`mode-card ${sel === c.key ? 'selected' : ''}`} onClick={() => setSel(c.key)} style={{ padding: 24 }}>
              <div className="check">✓</div>
              <div style={{
                width: 48, height: 48, borderRadius: 12,
                background: sel === c.key ? 'var(--tc)' : 'var(--surface-2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, marginBottom: 14,
              }}>{c.icon}</div>
              <div className="hf-row center" style={{ gap: 6, marginBottom: 6 }}>
                <span className="t-h2">{c.name}</span>
                {c.tag && <span className="pill tc">{c.tag}</span>}
              </div>
              <p className="t-sm ink-3" style={{ margin: 0, lineHeight: 1.55 }}>{c.desc}</p>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 32, display: 'flex', justifyContent: 'flex-end' }}>
          <button className="hf-btn primary lg" style={{ minWidth: 160 }}>다음 →</button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────
// Step 3 PC — 주제
// ─────────────────────────────────────────
const Step3HifiPC = () => {
  const [sel, setSel] = React.useState('music');
  const topics = [
    { key: 'music', name: '음악', meta: '출제율 ↑↑↑', recent: false },
    { key: 'travel', name: '여행', meta: '출제율 ↑↑↑', recent: true },
    { key: 'movie', name: '영화', meta: '출제율 ↑↑', recent: false },
    { key: 'sports', name: '스포츠', meta: '출제율 ↑↑', recent: false },
    { key: 'cook', name: '요리', meta: '출제율 ↑', recent: false },
    { key: 'park', name: '공원', meta: '출제율 ↑', recent: false },
    { key: 'shop', name: '쇼핑', meta: '출제율 ↑', recent: false },
    { key: 'tv', name: 'TV 보기', meta: '출제율 ↑', recent: false },
  ];
  return (
    <div className="hf hf-pc">
      <HfPCHeader crumb={['5월 오픽 AL 스터디', '카테고리', '주제 선택']}/>
      <PCStepBar now={3}/>
      <div style={{ padding: '28px 64px', flex: 1, maxWidth: 1040, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column' }}>
        <h1 className="t-h1" style={{ margin: '0 0 6px' }}>오늘 어떤 주제로?</h1>
        <p className="t-sm ink-3" style={{ margin: '0 0 18px' }}>최근에 안 한 주제일수록 좋아요.</p>

        <div className="hf-card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, background: 'var(--surface-2)', boxShadow: 'none' }}>
          <span style={{ color: 'var(--ink-3)' }}>🔍</span>
          <span className="t-sm ink-3">주제 검색…</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, flex: 1 }}>
          {topics.map(t => (
            <div key={t.key} className="hf-card" onClick={() => setSel(t.key)} style={{
              padding: 16, cursor: 'pointer',
              border: sel === t.key ? '1.5px solid var(--tc)' : '1.5px solid transparent',
              background: sel === t.key ? 'var(--tc-tint)' : 'var(--surface)',
              boxShadow: sel === t.key ? '0 0 0 4px rgba(201,100,66,0.08)' : 'var(--shadow-sm)',
            }}>
              <div className="hf-row between center" style={{ marginBottom: 6 }}>
                <span className="t-h3">{t.name}</span>
                {sel === t.key && <span style={{ color: 'var(--tc)', fontWeight: 700 }}>✓</span>}
              </div>
              <div className="hf-row center" style={{ gap: 6 }}>
                <span className="t-xs ink-3">{t.meta}</span>
                {t.recent && <span className="pill" style={{ fontSize: 10 }}>최근 학습</span>}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
          <button className="hf-btn primary lg" style={{ minWidth: 160 }}>다음 →</button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────
// Step 4 PC — 콤보
// ─────────────────────────────────────────
const Step4HifiPC = () => {
  const [sel, setSel] = React.useState('combo1');
  const combos = [
    { key: 'combo1', tag: '가장 자주 출제', questions: ['좋아하는 음악 묘사', '음악 듣는 습관', '기억에 남는 공연 경험'], learned: false },
    { key: 'combo2', tag: '두 번째로 자주', questions: ['좋아하는 가수 소개', '가수의 매력', '콘서트 경험'], learned: true },
    { key: 'combo3', tag: '도전형', questions: ['음악 취향 변화', '음악과 감정', '미래 음악 트렌드'], learned: false },
  ];
  return (
    <div className="hf hf-pc">
      <HfPCHeader crumb={['5월 오픽 AL 스터디', '음악', '콤보 선택']}/>
      <PCStepBar now={4}/>
      <div style={{ padding: '28px 64px', flex: 1, maxWidth: 1040, margin: '0 auto', width: '100%' }}>
        <h1 className="t-h1" style={{ margin: '0 0 6px' }}>어떤 콤보로?</h1>
        <p className="t-sm ink-3" style={{ margin: '0 0 18px' }}>콤보 = 함께 출제되는 3개 질문 묶음이에요.</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {combos.map((c, idx) => (
            <div key={c.key} className="hf-card" onClick={() => setSel(c.key)} style={{
              padding: 20, cursor: 'pointer',
              border: sel === c.key ? '1.5px solid var(--tc)' : '1.5px solid transparent',
              background: sel === c.key ? 'var(--tc-tint)' : 'var(--surface)',
              boxShadow: sel === c.key ? '0 0 0 4px rgba(201,100,66,0.08)' : 'var(--shadow-sm)',
            }}>
              <div className="hf-row between center" style={{ marginBottom: 12 }}>
                <div className="hf-row center" style={{ gap: 8 }}>
                  <span className="t-h2">콤보 {idx + 1}</span>
                  <span className="pill tc" style={{ fontSize: 10 }}>{c.tag}</span>
                </div>
                {c.learned && <span className="pill" style={{ fontSize: 10 }}>이미 학습</span>}
              </div>
              <div className="hf-stack" style={{ gap: 8 }}>
                {c.questions.map((q, i) => (
                  <div key={i} className="hf-row" style={{ gap: 8, alignItems: 'flex-start' }}>
                    <span className="num t-xs" style={{ color: 'var(--ink-3)', minWidth: 18 }}>Q{i+1}</span>
                    <span className="t-sm" style={{ color: 'var(--ink-2)', lineHeight: 1.5 }}>{q}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 28, display: 'flex', justifyContent: 'flex-end' }}>
          <button className="hf-btn primary lg" style={{ minWidth: 200 }}>이 콤보로 시작 →</button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────
// Step 5 PC — 코치 가이드
// ─────────────────────────────────────────
const Step5HifiPC = () => (
  <div className="hf hf-pc">
    <HfPCHeader crumb={['5월 오픽 AL 스터디', '음악 콤보', '시작 전 가이드']}/>
    <PCStepBar now={5}/>
    <div style={{ padding: '28px 64px', flex: 1, maxWidth: 1040, margin: '0 auto', width: '100%', display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 24 }}>
      {/* LEFT — 콤보 정보 */}
      <div className="hf-stack" style={{ gap: 16 }}>
        <div className="hf-row" style={{ gap: 14, alignItems: 'center' }}>
          <div className="coach-avatar lg">◐</div>
          <div className="hf-stack" style={{ gap: 2 }}>
            <span className="t-h3">AI 스터디 코치</span>
            <span className="t-xs ink-3">오늘의 학습 인트로</span>
          </div>
        </div>

        <div className="insight">
          <span className="t-xs ink-3" style={{ marginBottom: 4, display: 'block' }}>오늘의 콤보</span>
          <div className="t-h1" style={{ marginBottom: 10 }}>음악 · AL</div>
          <p className="t-body" style={{ margin: 0, lineHeight: 1.6, color: 'var(--ink)' }}>
            이 콤보는 일반 주제 자리에서 <b>53% 확률</b>로 등장하는 정형화된 패턴이에요.
          </p>
        </div>

        <div className="hf-card" style={{ padding: 16, background: 'var(--surface-2)', boxShadow: 'none' }}>
          <span className="section-h" style={{ marginBottom: 10, display: 'block' }}>3개 질문</span>
          <div className="hf-stack" style={{ gap: 6 }}>
            {['좋아하는 음악 묘사', '음악 듣는 습관', '기억에 남는 공연 경험'].map((q, i) => (
              <div key={i} className="hf-row" style={{ gap: 8 }}>
                <span className="num t-xs ink-3" style={{ minWidth: 20 }}>Q{i+1}</span>
                <span className="t-sm">{q}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT — 포인트 */}
      <div className="hf-stack" style={{ gap: 12 }}>
        <span className="section-h">오늘 함께 배울 포인트</span>
        {[
          { tag: '도입', text: '몰입 표현 (into / hooked on)으로 자연스럽게 시작하기', detail: '도입부 첫 5초가 답변 톤을 결정해요' },
          { tag: '구조', text: '습관 → 구체적 예시 → 감정 한 줄로 마무리', detail: '논리적 흐름이 AL 등급의 핵심' },
          { tag: '디테일', text: '아티스트 이름 · 곡명 · 장소 같은 디테일 한 가지 이상', detail: '구체성이 답변의 신뢰도를 올려요' },
        ].map((p, i) => (
          <div key={i} className="hf-card" style={{ padding: 18, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <span className="num" style={{
              width: 32, height: 32, borderRadius: 10, background: 'var(--tc-tint)', color: 'var(--tc)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 700, flexShrink: 0,
            }}>{i + 1}</span>
            <div className="hf-stack" style={{ gap: 6, flex: 1 }}>
              <span className="tag good" style={{ fontSize: 10, alignSelf: 'flex-start' }}>{p.tag}</span>
              <span className="t-body" style={{ lineHeight: 1.55, color: 'var(--ink)', fontWeight: 500 }}>{p.text}</span>
              <span className="t-xs ink-3">{p.detail}</span>
            </div>
          </div>
        ))}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
          <button className="hf-btn primary lg" style={{ minWidth: 180 }}>시작할게요 →</button>
        </div>
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────
// Step 6-1 PC — 발화자 선정
// ─────────────────────────────────────────
const Step61HifiPC = () => {
  const [sel, setSel] = React.useState(null);
  return (
    <div className="hf hf-pc">
      <HfPCHeader crumb={['5월 오픽 AL 스터디', '음악 콤보', 'Q1 · 누가 먼저?']}/>
      <div style={{ padding: '32px 64px', flex: 1, maxWidth: 1040, margin: '0 auto', width: '100%' }}>
        <div className="hf-card" style={{ padding: 20, marginBottom: 24, background: 'var(--surface-2)', boxShadow: 'none' }}>
          <span className="section-h" style={{ marginBottom: 8, display: 'block' }}>이번 질문 · Q1</span>
          <p className="t-h2" style={{ margin: 0, lineHeight: 1.5, fontWeight: 500 }}>
            What kind of music do you enjoy? Who are some of your favorite musicians?
          </p>
        </div>

        <div className="hf-row between center" style={{ marginBottom: 14 }}>
          <span className="t-h2">먼저 답변할 사람</span>
          <span className="t-sm ink-3">먼저 누른 사람이 답변해요</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            { key: 'a', name: 'Alice', sub: '나' },
            { key: 'b', name: 'Bob', sub: '대기 중' },
            { key: 'c', name: 'Carol', sub: '대기 중' },
            { key: 'd', name: 'Dan', sub: '대기 중' },
          ].map(m => {
            const selected = sel === m.key;
            return (
              <div key={m.key} className="hf-card" onClick={() => m.sub === '나' && setSel(m.key)} style={{
                padding: 20, cursor: m.sub === '나' ? 'pointer' : 'default',
                textAlign: 'center',
                border: selected ? '1.5px solid var(--tc)' : '1.5px solid transparent',
                background: selected ? 'var(--tc-tint)' : 'var(--surface)',
                boxShadow: selected ? '0 0 0 4px rgba(201,100,66,0.08)' : 'var(--shadow-sm)',
              }}>
                <span className={`mb-dot ${m.key} live`} style={{ width: 56, height: 56, fontSize: 22, margin: '0 auto 12px', display: 'flex' }}>{m.name[0]}</span>
                <div className="t-h3" style={{ marginBottom: 4 }}>{m.name}</div>
                <span className="t-xs ink-3">{m.sub}</span>
                {m.sub === '나' && !selected && <button className="hf-btn tc sm" style={{ marginTop: 12, width: '100%' }}>내가 답변</button>}
                {selected && <div style={{ color: 'var(--tc)', fontWeight: 600, fontSize: 13, marginTop: 12 }}>✓ 선택됨</div>}
              </div>
            );
          })}
        </div>

        <div className="hf-card" style={{ padding: 14, marginTop: 20, display: 'flex', gap: 12, alignItems: 'center', background: 'var(--surface-2)', boxShadow: 'none' }}>
          <div className="coach-avatar sm">◐</div>
          <p className="t-sm" style={{ margin: 0, color: 'var(--ink-2)', flex: 1 }}>
            한 명이 답변하는 동안 나머지는 들으면서 표현을 메모해두세요.
          </p>
          <button className="hf-btn primary" disabled={!sel} style={{ minWidth: 160, opacity: sel ? 1 : 0.4 }}>
            {sel ? '답변 시작 →' : '대기 중'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────
// Step 6-2 PC — 답변 중 (4명 화상회의 스타일)
// ─────────────────────────────────────────
const Step62HifiPC = () => (
  <div className="hf hf-pc">
    <HfPCHeader crumb={['5월 오픽 AL 스터디', '음악 콤보', 'Q1 · 답변 중']}
      right={<span className="pill" style={{ background: 'rgba(201,100,66,0.12)', color: 'var(--tc)' }}>● 녹음 중 · 0:23</span>}/>

    <div style={{ padding: '20px 24px', flex: 1, display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, overflow: 'hidden' }}>
      {/* MAIN — 4 video tiles */}
      <div className="hf-stack" style={{ gap: 12, overflow: 'hidden' }}>
        <div className="hf-card" style={{ padding: 14, background: 'var(--surface-2)', boxShadow: 'none' }}>
          <span className="section-h" style={{ marginBottom: 6, display: 'block' }}>Q1</span>
          <p className="t-body" style={{ margin: 0, lineHeight: 1.5 }}>
            What kind of music do you enjoy? Who are some of your favorite musicians?
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, flex: 1 }}>
          {[
            { key: 'a', name: 'Alice', speaking: true },
            { key: 'b', name: 'Bob', speaking: false },
            { key: 'c', name: 'Carol', speaking: false },
            { key: 'd', name: 'Dan', speaking: false },
          ].map(m => (
            <div key={m.key} className="hf-card" style={{
              padding: 0, overflow: 'hidden', position: 'relative',
              border: m.speaking ? '2px solid var(--tc)' : '1px solid var(--line)',
              background: m.speaking ? 'var(--tc-tint)' : 'var(--surface-2)',
              minHeight: 180, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span className={`mb-dot ${m.key} ${m.speaking ? 'live' : ''}`} style={{ width: 64, height: 64, fontSize: 24 }}>{m.name[0]}</span>
              <div style={{ position: 'absolute', bottom: 10, left: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="t-sm" style={{ fontWeight: 600 }}>{m.name}</span>
                {m.speaking && (
                  <span className="pill" style={{ background: 'var(--tc)', color: 'white', fontSize: 10 }}>● 답변 중</span>
                )}
              </div>
              {m.speaking && (
                <div className="hf-wave" style={{ position: 'absolute', bottom: 12, right: 12, height: 18 }}>
                  {Array.from({length: 14}).map((_, i) => (
                    <i key={i} style={{ height: 3 + Math.abs(Math.sin(i * 0.6)) * 14, background: 'var(--tc)', width: 2 }}/>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* SIDE — note pad */}
      <div className="hf-card" style={{ padding: 18, display: 'flex', flexDirection: 'column' }}>
        <div className="hf-row between center" style={{ marginBottom: 12 }}>
          <span className="section-h">메모</span>
          <span className="t-xs ink-3">나만 보여요</span>
        </div>
        <textarea placeholder="좋은 표현이 들리면 적어두세요…"
          style={{
            flex: 1, border: 'none', outline: 'none',
            fontFamily: 'var(--font)', fontSize: 13, lineHeight: 1.6,
            background: 'transparent', color: 'var(--ink)', resize: 'none', padding: 0,
          }}
          defaultValue="• &quot;I'm really into ~&quot; 도입 좋음&#10;• Kendrick Lamar 디테일 깔끔&#10;• 'on my way to work' 자연스러움"
        />
        <div className="hf-card" style={{ padding: 12, marginTop: 12, display: 'flex', gap: 10, alignItems: 'flex-start', background: 'var(--surface-2)', boxShadow: 'none' }}>
          <div className="coach-avatar sm">◐</div>
          <p className="t-xs" style={{ margin: 0, lineHeight: 1.55, color: 'var(--ink-2)', flex: 1 }}>
            마음에 드는 표현 메모해두면 다음에 활용할 수 있어요.
          </p>
        </div>
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────
// Step 6-3 PC — 코칭 생성 중
// ─────────────────────────────────────────
const Step63HifiPC = () => (
  <div className="hf hf-pc">
    <HfPCHeader crumb={['5월 오픽 AL 스터디', '음악 콤보', 'Q1 · 코치가 듣는 중']}/>
    <div style={{ padding: '64px 64px', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28 }}>
      <div style={{ position: 'relative' }}>
        <div className="coach-avatar" style={{ width: 120, height: 120, fontSize: 56 }}>◐</div>
        <div style={{ position: 'absolute', inset: -12, borderRadius: '50%', border: '2px solid var(--tc)', opacity: 0.3, animation: 'pulse 2s infinite' }}/>
        <div style={{ position: 'absolute', inset: -24, borderRadius: '50%', border: '1px solid var(--tc)', opacity: 0.15, animation: 'pulse 2s infinite .4s' }}/>
      </div>

      <div style={{ textAlign: 'center', maxWidth: 480 }}>
        <div className="t-display" style={{ marginBottom: 8 }}>코치가 듣고 있어요</div>
        <p className="t-body ink-3" style={{ margin: 0, lineHeight: 1.6 }}>
          4명의 답변을 함께 살펴보고 있어요. 잠시만 기다려주세요.
        </p>
      </div>

      <div className="hf-card" style={{ padding: 24, width: 480 }}>
        <div className="hf-stack" style={{ gap: 14 }}>
          {[
            { label: '답변 듣기', state: 'done' },
            { label: '표현 분석', state: 'doing' },
            { label: '코치 노트 정리', state: 'wait' },
          ].map((s, i) => (
            <div key={i} className="hf-row center" style={{ gap: 12 }}>
              <span style={{
                width: 22, height: 22, borderRadius: '50%',
                background: s.state === 'done' ? 'var(--good)' : s.state === 'doing' ? 'var(--tc)' : 'var(--line-strong)',
                color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700,
              }}>{s.state === 'done' ? '✓' : ''}</span>
              <span className="t-body" style={{
                color: s.state === 'wait' ? 'var(--ink-3)' : 'var(--ink)',
                fontWeight: s.state === 'doing' ? 600 : 500,
              }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="t-sm ink-3">약 8초 소요</div>
    </div>
  </div>
);

// ─────────────────────────────────────────
// Step 7 PC — 마무리 / 인사이트
// ─────────────────────────────────────────
const Step7HifiPC = () => (
  <div className="hf hf-pc">
    <HfPCHeader crumb={['5월 오픽 AL 스터디', '음악 콤보', '오늘의 학습']} right={null}/>
    <div style={{ padding: '32px 64px', flex: 1, maxWidth: 1040, margin: '0 auto', width: '100%', overflow: 'auto' }}>
      <div style={{ textAlign: 'center', padding: '16px 0 28px' }}>
        <div style={{ fontSize: 56, marginBottom: 8 }}>🌱</div>
        <div className="t-display" style={{ marginBottom: 6, fontSize: 32 }}>오늘도 한 걸음</div>
        <p className="t-body ink-3" style={{ margin: 0 }}>
          4명이 함께 음악 콤보 3문항을 끝냈어요
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="insight">
          <div className="hf-row center" style={{ gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 18 }}>✨</span>
            <span className="t-h2">오늘의 베스트 표현</span>
          </div>
          <div className="quote" style={{ background: 'rgba(255,255,255,0.6)', fontSize: 15, padding: '14px 16px' }}>
            I'm really into hip-hop these days
          </div>
          <span className="t-xs ink-3" style={{ marginLeft: 14, display: 'block', marginTop: 6 }}>— Alice의 도입 표현</span>
        </div>

        <div className="hf-card lift" style={{ padding: 20 }}>
          <div className="hf-row" style={{ gap: 12, alignItems: 'flex-start', marginBottom: 12 }}>
            <div className="coach-avatar">◐</div>
            <div className="hf-stack" style={{ gap: 2, flex: 1 }}>
              <span className="t-sm" style={{ fontWeight: 600 }}>AI 스터디 코치</span>
              <span className="t-xs ink-3">오늘의 마무리</span>
            </div>
          </div>
          <p className="t-body" style={{ margin: 0, lineHeight: 1.6 }}>
            오늘은 <span className="hl">"몰입 표현"</span>으로 도입을 시작하는 패턴을 함께 배웠어요. 다음 세션에서는 <b>구체적 디테일</b>을 하나씩 더 넣는 연습을 해볼까요?
          </p>
        </div>
      </div>

      <div className="hf-card" style={{ padding: 20, marginBottom: 16 }}>
        <span className="section-h" style={{ marginBottom: 14, display: 'block' }}>오늘 함께한 멤버</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            { key: 'a', name: 'Alice', note: '도입 connector' },
            { key: 'b', name: 'Bob', note: '구체적 디테일' },
            { key: 'c', name: 'Carol', note: 'hedge 표현' },
            { key: 'd', name: 'Dan', note: '구어체 리듬' },
          ].map(m => (
            <div key={m.key} className="hf-card flat" style={{ padding: 14, textAlign: 'center' }}>
              <span className={`mb-dot ${m.key}`} style={{ width: 36, height: 36, fontSize: 13, margin: '0 auto 8px', display: 'flex' }}>{m.name[0]}</span>
              <div className="t-sm" style={{ fontWeight: 600, marginBottom: 6 }}>{m.name}</div>
              <span className="tag good" style={{ fontSize: 10 }}>BP · {m.note}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="hf-card flat" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <span className="t-xs ink-3">다음 추천 콤보</span>
        <div className="hf-stack" style={{ gap: 0, flex: 1 }}>
          <span className="t-sm" style={{ fontWeight: 600 }}>여행 (Travel) · AL</span>
          <span className="t-xs ink-3">출제율 ↑↑↑</span>
        </div>
        <button className="hf-btn secondary sm">살펴보기</button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button className="hf-btn secondary lg" style={{ minWidth: 140 }}>홈으로</button>
        <button className="hf-btn primary lg" style={{ minWidth: 200 }}>이어서 다음 콤보 →</button>
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────
// 홈 PC
// ─────────────────────────────────────────
const HomeHifiPC = () => (
  <div className="hf hf-pc">
    <div className="hf-header">
      <div className="hf-stack">
        <span className="t-h2">안녕하세요, Alice</span>
        <span className="t-xs ink-3">5월 2일 금요일</span>
      </div>
      <div className="hf-row center" style={{ gap: 12 }}>
        <button className="hf-btn ghost sm">알림</button>
        <button className="hf-btn ghost sm">설정</button>
        <span style={{ width: 36, height: 36, borderRadius: 18, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>👤</span>
      </div>
    </div>

    <div style={{ padding: '24px 64px', flex: 1, maxWidth: 1040, margin: '0 auto', width: '100%', overflow: 'auto' }}>
      <div className="insight" style={{ marginBottom: 24 }}>
        <div className="hf-row between center">
          <div className="hf-stack" style={{ gap: 6 }}>
            <span className="t-xs ink-3">다음 세션</span>
            <div className="t-display" style={{ fontSize: 28 }}>오늘 저녁 8시</div>
            <p className="t-sm" style={{ margin: 0, color: 'var(--ink-2)' }}>5월 오픽 AL 스터디 · 멤버 4명</p>
          </div>
          <div className="hf-row center" style={{ gap: 14 }}>
            <div className="mb-stack">
              <span className="mb-dot a">A</span>
              <span className="mb-dot b">B</span>
              <span className="mb-dot c">C</span>
              <span className="mb-dot d">D</span>
            </div>
            <button className="hf-btn tc lg" style={{ minWidth: 140 }}>입장 →</button>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20 }}>
        <div className="hf-stack" style={{ gap: 12 }}>
          <span className="section-h">내 스터디</span>
          {[
            { name: '5월 오픽 AL 스터디', meta: '주 3회 · 4명', live: true },
            { name: '4월 오픽 IH 스터디', meta: '종료 · 12회 학습', live: false },
          ].map((g, i) => (
            <div key={i} className="hf-card" style={{ padding: 18, display: 'flex', alignItems: 'center', gap: 14 }}>
              <div className="hf-stack" style={{ gap: 4, flex: 1 }}>
                <span className="t-h3">{g.name}</span>
                <span className="t-xs ink-3">{g.meta}</span>
              </div>
              {g.live && <span className="pill live">진행 중</span>}
              <button className="hf-btn ghost sm">→</button>
            </div>
          ))}

          <div className="hf-card flat" style={{ padding: 20, textAlign: 'center', borderStyle: 'dashed' }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>＋</div>
            <span className="t-sm" style={{ fontWeight: 500 }}>등급별 그룹 둘러보기</span>
          </div>
        </div>

        <div className="hf-stack" style={{ gap: 12 }}>
          <span className="section-h">최근 학습한 베스트 표현</span>
          {[
            { from: 'Bob', text: 'small clubs around the city', tag: '구체적 디테일' },
            { from: 'Carol', text: 'I would say…', tag: 'AL hedge' },
            { from: 'Dan', text: 'on repeat', tag: '구어체 리듬' },
          ].map((b, i) => (
            <div key={i} className="hf-card" style={{ padding: 14 }}>
              <div className="hf-row between center" style={{ marginBottom: 6 }}>
                <span className="tag good" style={{ fontSize: 10 }}>{b.tag}</span>
                <span className="t-xs ink-3">from {b.from}</span>
              </div>
              <div className="quote" style={{ background: 'var(--surface-2)', padding: '8px 10px', fontSize: 12 }}>{b.text}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

window.Step1HifiPC = Step1HifiPC;
window.Step2HifiPC = Step2HifiPC;
window.Step3HifiPC = Step3HifiPC;
window.Step4HifiPC = Step4HifiPC;
window.Step5HifiPC = Step5HifiPC;
window.Step61HifiPC = Step61HifiPC;
window.Step62HifiPC = Step62HifiPC;
window.Step63HifiPC = Step63HifiPC;
window.Step7HifiPC = Step7HifiPC;
window.HomeHifiPC = HomeHifiPC;
