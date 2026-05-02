// Hi-fi Step 2 / 3 / 4 / 5 — 세션 룸 앞단

const HfStatus2 = () => (
  <div className="status">
    <span className="num">9:41</span>
    <div className="dots"><i/><i/><i/></div>
    <span className="num">100%</span>
  </div>
);

const HfHeader2 = ({ title, sub, right }) => (
  <div className="hf-header">
    <div className="hf-row center" style={{ gap: 8 }}>
      <span style={{ fontSize: 18, color: 'var(--ink-2)', cursor: 'pointer' }}>←</span>
      <div className="hf-stack">
        <span className="t-h3">{title}</span>
        {sub && <span className="t-micro ink-3">{sub}</span>}
      </div>
    </div>
    {right === undefined ? <span className="pill live">실시간</span> : right}
  </div>
);

const StepBar2 = ({ now = 2, total = 7 }) => (
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
// Step 2 · 카테고리
// ─────────────────────────────────────────
const Step2Hifi = () => {
  const [sel, setSel] = React.useState('general');
  const cats = [
    { key: 'general', name: '일반 주제', desc: '음악·여행·영화 등 일상 카테고리', tag: '추천', icon: '🌿' },
    { key: 'rp', name: '롤플레이', desc: '주어진 상황에서 역할극 답변', tag: null, icon: '🎭' },
    { key: 'adv', name: '어드밴스', desc: '복합 질문 · IH~AL 도전', tag: 'AL 도전', icon: '🎯' },
  ];
  return (
    <div className="hf hf-phone">
      <HfStatus2/>
      <HfHeader2 title="카테고리" sub="오늘 어떤 결로 갈까요?"/>
      <StepBar2 now={2}/>
      <div className="body" style={{ padding: '20px' }}>
        <h1 className="t-h1" style={{ margin: '0 0 6px' }}>어떤 카테고리로 모일까요?</h1>
        <p className="t-sm ink-3" style={{ margin: '0 0 20px' }}>처음이면 일반 주제부터 시작하는 걸 추천해요.</p>
        <div className="hf-stack" style={{ gap: 10 }}>
          {cats.map(c => (
            <div key={c.key} className={`mode-card ${sel === c.key ? 'selected' : ''}`} onClick={() => setSel(c.key)}>
              <div className="check">✓</div>
              <div className="hf-row" style={{ gap: 14 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: sel === c.key ? 'var(--tc)' : 'var(--surface-2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, flexShrink: 0,
                }}>{c.icon}</div>
                <div className="hf-stack" style={{ gap: 4, flex: 1 }}>
                  <div className="hf-row center" style={{ gap: 6 }}>
                    <span className="t-h2">{c.name}</span>
                    {c.tag && <span className="pill tc">{c.tag}</span>}
                  </div>
                  <span className="t-sm ink-3">{c.desc}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="hf-footer">
        <button className="hf-btn primary lg full">다음 →</button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────
// Step 3 · 주제
// ─────────────────────────────────────────
const Step3Hifi = () => {
  const [sel, setSel] = React.useState('music');
  const topics = [
    { key: 'music', name: '음악', meta: '출제율 ↑↑↑', recent: false },
    { key: 'travel', name: '여행', meta: '출제율 ↑↑↑', recent: true },
    { key: 'movie', name: '영화', meta: '출제율 ↑↑', recent: false },
    { key: 'sports', name: '스포츠', meta: '출제율 ↑↑', recent: false },
    { key: 'cook', name: '요리', meta: '출제율 ↑', recent: false },
    { key: 'park', name: '공원', meta: '출제율 ↑', recent: false },
  ];
  return (
    <div className="hf hf-phone">
      <HfStatus2/>
      <HfHeader2 title="주제 선택" sub="자주 출제되는 순"/>
      <StepBar2 now={3}/>
      <div className="body" style={{ padding: '20px' }}>
        <h1 className="t-h1" style={{ margin: '0 0 6px' }}>오늘 어떤 주제로?</h1>
        <p className="t-sm ink-3" style={{ margin: '0 0 16px' }}>최근에 안 한 주제일수록 좋아요.</p>

        {/* search */}
        <div className="hf-card" style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, background: 'var(--surface-2)', boxShadow: 'none' }}>
          <span style={{ color: 'var(--ink-3)', fontSize: 14 }}>🔍</span>
          <span className="t-sm ink-3">주제 검색…</span>
        </div>

        <div className="hf-stack" style={{ gap: 8 }}>
          {topics.map(t => (
            <div key={t.key} className="hf-card" onClick={() => setSel(t.key)} style={{
              padding: 14, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
              border: sel === t.key ? '1.5px solid var(--tc)' : '1.5px solid transparent',
              background: sel === t.key ? 'var(--tc-tint)' : 'var(--surface)',
              boxShadow: sel === t.key ? '0 0 0 4px rgba(201,100,66,0.08)' : 'var(--shadow-sm)',
            }}>
              <div className="hf-stack" style={{ gap: 2, flex: 1 }}>
                <div className="hf-row center" style={{ gap: 6 }}>
                  <span className="t-sm" style={{ fontWeight: 600 }}>{t.name}</span>
                  {t.recent && <span className="pill" style={{ fontSize: 10 }}>최근 학습</span>}
                </div>
                <span className="t-xs ink-3">{t.meta}</span>
              </div>
              {sel === t.key && <span style={{ color: 'var(--tc)', fontWeight: 700 }}>✓</span>}
            </div>
          ))}
        </div>
      </div>
      <div className="hf-footer">
        <button className="hf-btn primary lg full">다음 →</button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────
// Step 4 · 콤보
// ─────────────────────────────────────────
const Step4Hifi = () => {
  const [sel, setSel] = React.useState('combo1');
  const combos = [
    {
      key: 'combo1', tag: '가장 자주 출제',
      questions: ['좋아하는 음악 묘사', '음악 듣는 습관', '기억에 남는 공연 경험'],
      learned: false,
    },
    {
      key: 'combo2', tag: '두 번째로 자주',
      questions: ['좋아하는 가수 소개', '가수의 매력', '콘서트 경험'],
      learned: true,
    },
    {
      key: 'combo3', tag: '도전형',
      questions: ['음악 취향 변화', '음악과 감정', '미래 음악 트렌드'],
      learned: false,
    },
  ];
  return (
    <div className="hf hf-phone">
      <HfStatus2/>
      <HfHeader2 title="콤보 선택" sub="음악 · 3개 질문 묶음"/>
      <StepBar2 now={4}/>
      <div className="body" style={{ padding: '20px' }}>
        <h1 className="t-h1" style={{ margin: '0 0 6px' }}>어떤 콤보로?</h1>
        <p className="t-sm ink-3" style={{ margin: '0 0 16px' }}>콤보 = 함께 출제되는 3개 질문 묶음이에요.</p>

        <div className="hf-stack" style={{ gap: 10 }}>
          {combos.map((c, idx) => (
            <div key={c.key} className="hf-card" onClick={() => setSel(c.key)} style={{
              padding: 16, cursor: 'pointer',
              border: sel === c.key ? '1.5px solid var(--tc)' : '1.5px solid transparent',
              background: sel === c.key ? 'var(--tc-tint)' : 'var(--surface)',
              boxShadow: sel === c.key ? '0 0 0 4px rgba(201,100,66,0.08)' : 'var(--shadow-sm)',
            }}>
              <div className="hf-row between center" style={{ marginBottom: 10 }}>
                <div className="hf-row center" style={{ gap: 8 }}>
                  <span className="t-h3">콤보 {idx + 1}</span>
                  <span className="pill tc" style={{ fontSize: 10 }}>{c.tag}</span>
                </div>
                {c.learned && <span className="pill" style={{ fontSize: 10 }}>이미 학습</span>}
              </div>
              <div className="hf-stack" style={{ gap: 6 }}>
                {c.questions.map((q, i) => (
                  <div key={i} className="hf-row" style={{ gap: 8, alignItems: 'flex-start' }}>
                    <span className="num t-xs" style={{ color: 'var(--ink-3)', minWidth: 14 }}>Q{i+1}</span>
                    <span className="t-sm" style={{ color: 'var(--ink-2)', lineHeight: 1.5 }}>{q}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="hf-footer">
        <button className="hf-btn primary lg full">이 콤보로 시작 →</button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────
// Step 5 · AI 스터디 코치 가이드
// ─────────────────────────────────────────
const Step5Hifi = () => (
  <div className="hf hf-phone">
    <HfStatus2/>
    <HfHeader2 title="시작 전 가이드" sub="음악 콤보 · AL"/>
    <StepBar2 now={5}/>
    <div className="body" style={{ padding: '24px 20px 20px' }}>
      {/* Coach intro */}
      <div className="hf-row" style={{ gap: 12, alignItems: 'center', marginBottom: 18 }}>
        <div className="coach-avatar lg">◐</div>
        <div className="hf-stack" style={{ gap: 2, flex: 1 }}>
          <span className="t-h3">AI 스터디 코치</span>
          <span className="t-xs ink-3">오늘의 학습 인트로</span>
        </div>
      </div>

      {/* Combo summary card */}
      <div className="insight" style={{ marginBottom: 16 }}>
        <span className="t-xs ink-3" style={{ marginBottom: 4, display: 'block' }}>오늘의 콤보</span>
        <div className="t-h2" style={{ marginBottom: 8 }}>음악 · AL</div>
        <p className="t-sm" style={{ margin: 0, lineHeight: 1.6, color: 'var(--ink)' }}>
          이 콤보는 일반 주제 자리에서 <b>53% 확률</b>로 등장하는 정형화된 패턴이에요.
        </p>
      </div>

      {/* Today's points */}
      <span className="section-h" style={{ marginBottom: 10, display: 'block' }}>오늘 함께 배울 포인트</span>
      <div className="hf-stack" style={{ gap: 10, marginBottom: 18 }}>
        {[
          { tag: '도입', text: '몰입 표현 (into / hooked on)으로 자연스럽게 시작하기' },
          { tag: '구조', text: '습관 → 구체적 예시 → 감정 한 줄로 마무리' },
          { tag: '디테일', text: '아티스트 이름 · 곡명 · 장소 같은 디테일 한 가지 이상' },
        ].map((p, i) => (
          <div key={i} className="hf-card" style={{ padding: 14, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <span className="num" style={{
              width: 24, height: 24, borderRadius: 8, background: 'var(--tc-tint)', color: 'var(--tc)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, flexShrink: 0,
            }}>{i + 1}</span>
            <div className="hf-stack" style={{ gap: 4, flex: 1 }}>
              <span className="tag good" style={{ fontSize: 10, alignSelf: 'flex-start' }}>{p.tag}</span>
              <span className="t-sm" style={{ lineHeight: 1.55, color: 'var(--ink)' }}>{p.text}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Member ready strip */}
      <div className="hf-card" style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface-2)', boxShadow: 'none' }}>
        <div className="mb-stack">
          <span className="mb-dot a live">A</span>
          <span className="mb-dot b live">B</span>
          <span className="mb-dot c live">C</span>
          <span className="mb-dot d live">D</span>
        </div>
        <span className="t-xs ink-3" style={{ flex: 1 }}>4명 모두 준비됐어요</span>
      </div>
    </div>
    <div className="hf-footer">
      <button className="hf-btn primary lg full">시작할게요 →</button>
    </div>
  </div>
);

window.Step2Hifi = Step2Hifi;
window.Step3Hifi = Step3Hifi;
window.Step4Hifi = Step4Hifi;
window.Step5Hifi = Step5Hifi;
