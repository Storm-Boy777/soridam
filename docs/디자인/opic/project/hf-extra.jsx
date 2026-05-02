// Hi-fi 세션 룸 외 — 홈 / 그룹 / 입장 대기 / 마이페이지 / 엣지케이스

const HfStatusX = () => (
  <div className="status">
    <span className="num">9:41</span>
    <div className="dots"><i/><i/><i/></div>
    <span className="num">100%</span>
  </div>
);

// ─────────────────────────────────────────
// 홈 — 내 그룹, 다음 세션
// ─────────────────────────────────────────
const HomeHifi = () => (
  <div className="hf hf-phone">
    <HfStatusX/>
    <div className="hf-header">
      <div className="hf-stack">
        <span className="t-h2">안녕하세요, Alice</span>
        <span className="t-xs ink-3">5월 2일 금요일</span>
      </div>
      <span style={{ width: 32, height: 32, borderRadius: 16, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>👤</span>
    </div>

    <div className="body" style={{ padding: '20px' }}>
      {/* Next session */}
      <div className="insight" style={{ marginBottom: 20 }}>
        <span className="t-xs ink-3" style={{ marginBottom: 4, display: 'block' }}>다음 세션</span>
        <div className="t-h2" style={{ marginBottom: 6 }}>오늘 저녁 8시</div>
        <p className="t-sm" style={{ margin: '0 0 12px', color: 'var(--ink-2)' }}>
          5월 오픽 AL 스터디 · 멤버 4명
        </p>
        <div className="hf-row between center">
          <div className="mb-stack">
            <span className="mb-dot a">A</span>
            <span className="mb-dot b">B</span>
            <span className="mb-dot c">C</span>
            <span className="mb-dot d">D</span>
          </div>
          <button className="hf-btn tc sm">입장 →</button>
        </div>
      </div>

      <span className="section-h" style={{ marginBottom: 12, display: 'block' }}>내 스터디</span>
      <div className="hf-stack" style={{ gap: 10, marginBottom: 20 }}>
        {[
          { name: '5월 오픽 AL 스터디', meta: '주 3회 · 4명', live: true },
          { name: '4월 오픽 IH 스터디', meta: '종료 · 12회 학습', live: false },
        ].map((g, i) => (
          <div key={i} className="hf-card" style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="hf-stack" style={{ gap: 2, flex: 1 }}>
              <span className="t-sm" style={{ fontWeight: 600 }}>{g.name}</span>
              <span className="t-xs ink-3">{g.meta}</span>
            </div>
            {g.live && <span className="pill live">진행 중</span>}
          </div>
        ))}
      </div>

      <span className="section-h" style={{ marginBottom: 12, display: 'block' }}>새 그룹</span>
      <div className="hf-card flat" style={{ padding: 16, textAlign: 'center', borderStyle: 'dashed' }}>
        <div style={{ fontSize: 24, marginBottom: 6 }}>＋</div>
        <span className="t-sm" style={{ fontWeight: 500 }}>등급별 그룹 둘러보기</span>
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────
// 그룹 선택 / 입장 대기
// ─────────────────────────────────────────
const LobbyHifi = () => (
  <div className="hf hf-phone">
    <HfStatusX/>
    <div className="hf-header">
      <div className="hf-row center" style={{ gap: 8 }}>
        <span style={{ fontSize: 18, color: 'var(--ink-2)', cursor: 'pointer' }}>←</span>
        <div className="hf-stack">
          <span className="t-h3">입장 대기</span>
          <span className="t-micro ink-3">5월 오픽 AL 스터디</span>
        </div>
      </div>
      <span className="pill">대기실</span>
    </div>

    <div className="body" style={{ padding: '24px 20px' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'var(--tc-tint)', color: 'var(--tc)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 32, margin: '0 auto 12px',
        }}>⏱</div>
        <div className="t-h1" style={{ marginBottom: 6 }}>곧 시작해요</div>
        <p className="t-sm ink-3" style={{ margin: 0 }}>2명이 더 들어오면 시작됩니다</p>
      </div>

      <div className="hf-card" style={{ padding: 16 }}>
        <span className="section-h" style={{ marginBottom: 12, display: 'block' }}>멤버 (2/4)</span>
        <div className="hf-stack" style={{ gap: 12 }}>
          {[
            { key: 'a', name: 'Alice', state: 'me' },
            { key: 'b', name: 'Bob', state: 'in' },
            { key: 'c', name: 'Carol', state: 'wait' },
            { key: 'd', name: 'Dan', state: 'wait' },
          ].map(m => (
            <div key={m.key} className="hf-row center" style={{ gap: 10 }}>
              <span className={`mb-dot ${m.key} ${m.state !== 'wait' ? 'live' : ''}`} style={{
                width: 32, height: 32, fontSize: 12,
                opacity: m.state === 'wait' ? 0.4 : 1,
              }}>{m.name[0]}</span>
              <span className="t-sm" style={{ fontWeight: 500, flex: 1, color: m.state === 'wait' ? 'var(--ink-3)' : 'var(--ink)' }}>
                {m.name} {m.state === 'me' && <span className="t-xs ink-3">(나)</span>}
              </span>
              {m.state === 'in' && <span className="pill live" style={{ fontSize: 10 }}>입장</span>}
              {m.state === 'wait' && <span className="t-xs ink-3">대기 중…</span>}
              {m.state === 'me' && <span className="t-xs" style={{ color: 'var(--tc)', fontWeight: 600 }}>준비됨</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="hf-card" style={{ padding: 12, marginTop: 16, display: 'flex', gap: 10, alignItems: 'flex-start', background: 'var(--surface-2)', boxShadow: 'none' }}>
        <div className="coach-avatar sm">◐</div>
        <p className="t-xs" style={{ margin: 0, lineHeight: 1.55, color: 'var(--ink-2)', flex: 1 }}>
          기다리는 동안 오늘 학습할 콤보를 미리 살펴보세요.
        </p>
      </div>
    </div>

    <div className="hf-footer">
      <button className="hf-btn secondary lg full">콤보 미리보기</button>
    </div>
  </div>
);

// ─────────────────────────────────────────
// 마이페이지 — BP 누적
// ─────────────────────────────────────────
const MyHifi = () => (
  <div className="hf hf-phone">
    <HfStatusX/>
    <div className="hf-header">
      <div className="hf-stack">
        <span className="t-h2">내 학습</span>
        <span className="t-xs ink-3">함께 배운 발자취</span>
      </div>
      <span style={{ fontSize: 16, color: 'var(--ink-2)' }}>⚙</span>
    </div>

    <div className="body" style={{ padding: '20px' }}>
      {/* Profile + summary */}
      <div className="hf-card lift" style={{ padding: 18, marginBottom: 20, textAlign: 'center' }}>
        <div className="mb-dot a" style={{ width: 56, height: 56, fontSize: 22, margin: '0 auto 10px', display: 'flex' }}>A</div>
        <div className="t-h2" style={{ marginBottom: 4 }}>Alice</div>
        <span className="t-xs ink-3">5월 오픽 AL 스터디 · 12회 함께함</span>
      </div>

      {/* BP collection */}
      <span className="section-h" style={{ marginBottom: 12, display: 'block' }}>내가 배운 베스트 표현</span>
      <div className="hf-stack" style={{ gap: 8, marginBottom: 20 }}>
        {[
          { from: 'Bob', text: 'small clubs around the city', tag: '구체적 디테일' },
          { from: 'Carol', text: 'I would say…', tag: 'AL hedge' },
          { from: 'Dan', text: 'on repeat', tag: '구어체 리듬' },
        ].map((b, i) => (
          <div key={i} className="hf-card" style={{ padding: 12 }}>
            <div className="hf-row between center" style={{ marginBottom: 6 }}>
              <span className="tag good" style={{ fontSize: 10 }}>{b.tag}</span>
              <span className="t-xs ink-3">from {b.from}</span>
            </div>
            <div className="quote" style={{ background: 'var(--surface-2)', padding: '8px 10px', fontSize: 12 }}>{b.text}</div>
          </div>
        ))}
      </div>

      {/* History */}
      <span className="section-h" style={{ marginBottom: 12, display: 'block' }}>학습한 콤보</span>
      <div className="hf-stack" style={{ gap: 6 }}>
        {[
          { name: '음악 · AL', date: '5/2', done: true },
          { name: '여행 · AL', date: '4/30', done: true },
          { name: '영화 · AL', date: '4/28', done: true },
        ].map((h, i) => (
          <div key={i} className="hf-row between center" style={{ padding: '10px 12px', background: 'var(--surface)', borderRadius: 10, boxShadow: 'var(--shadow-sm)' }}>
            <div className="hf-row center" style={{ gap: 8 }}>
              <span style={{ width: 16, height: 16, borderRadius: '50%', background: 'var(--good)', color: 'white', fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>✓</span>
              <span className="t-sm">{h.name}</span>
            </div>
            <span className="t-xs ink-3 num">{h.date}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────
// 엣지케이스 — 마이크 권한 거부
// ─────────────────────────────────────────
const EdgeMicHifi = () => (
  <div className="hf hf-phone">
    <HfStatusX/>
    <div className="hf-header">
      <div className="hf-row center" style={{ gap: 8 }}>
        <span style={{ fontSize: 18, color: 'var(--ink-2)', cursor: 'pointer' }}>←</span>
        <span className="t-h3">마이크 필요</span>
      </div>
    </div>

    <div className="body" style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ textAlign: 'center', padding: '32px 0' }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'var(--polish-tint)', color: 'var(--tc)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 32, margin: '0 auto 16px',
        }}>🎤</div>
        <div className="t-h1" style={{ marginBottom: 8 }}>마이크 사용을 허용해주세요</div>
        <p className="t-sm ink-3" style={{ margin: 0, lineHeight: 1.6, padding: '0 16px' }}>
          답변을 녹음하려면 마이크가 필요해요. 설정에서 권한을 허용한 다음 다시 시도해주세요.
        </p>
      </div>

      <div className="hf-card" style={{ padding: 16, marginBottom: 16, background: 'var(--surface-2)', boxShadow: 'none' }}>
        <span className="section-h" style={{ marginBottom: 10, display: 'block' }}>설정 방법</span>
        <div className="hf-stack" style={{ gap: 10 }}>
          {[
            '설정 앱 열기',
            '오픽 스터디 → 마이크',
            '"허용"으로 변경',
          ].map((t, i) => (
            <div key={i} className="hf-row" style={{ gap: 10, alignItems: 'center' }}>
              <span className="num" style={{
                width: 22, height: 22, borderRadius: '50%', background: 'var(--surface)', color: 'var(--ink)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, flexShrink: 0,
              }}>{i + 1}</span>
              <span className="t-sm">{t}</span>
            </div>
          ))}
        </div>
      </div>
    </div>

    <div className="hf-footer">
      <div className="hf-stack" style={{ gap: 8 }}>
        <button className="hf-btn primary lg full">설정 열기</button>
        <button className="hf-btn ghost full">스터디 나가기</button>
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────
// 엣지케이스 — 멤버 이탈/재접속
// ─────────────────────────────────────────
const EdgeReconnectHifi = () => (
  <div className="hf hf-phone">
    <HfStatusX/>
    <div className="hf-header">
      <div className="hf-stack">
        <span className="t-h3">Q1 · 답변 중</span>
        <span className="t-micro ink-3">음악 콤보</span>
      </div>
      <span className="pill" style={{ background: 'var(--polish-tint)', color: 'var(--tc)' }}>연결 끊김</span>
    </div>

    <div className="body" style={{ padding: '20px' }}>
      <div className="hf-card" style={{ padding: 16, marginBottom: 16, border: '1.5px solid var(--tc)', background: 'var(--polish-tint)' }}>
        <div className="hf-row" style={{ gap: 10, alignItems: 'flex-start', marginBottom: 8 }}>
          <span className="mb-dot c" style={{ width: 28, height: 28, fontSize: 11, opacity: 0.5 }}>C</span>
          <div className="hf-stack" style={{ gap: 2, flex: 1 }}>
            <span className="t-sm" style={{ fontWeight: 600 }}>Carol이 잠시 끊겼어요</span>
            <span className="t-xs ink-3">자동으로 재접속을 시도하고 있어요</span>
          </div>
        </div>
        <div className="hf-row" style={{ gap: 6, marginTop: 10 }}>
          <span className="hf-wave" style={{ flex: 1, height: 16, gap: 2 }}>
            {Array.from({length: 12}).map((_, i) => (
              <i key={i} style={{ height: 4 + Math.abs(Math.sin(i * 0.6)) * 10, background: 'var(--tc)', width: 2, opacity: 0.6 }}/>
            ))}
          </span>
          <span className="t-xs ink-3 num">15초째…</span>
        </div>
      </div>

      <div className="hf-card" style={{ padding: 14 }}>
        <span className="section-h" style={{ marginBottom: 10, display: 'block' }}>지금 멤버</span>
        <div className="hf-stack" style={{ gap: 10 }}>
          {[
            { key: 'a', name: 'Alice', state: 'in' },
            { key: 'b', name: 'Bob', state: 'in' },
            { key: 'c', name: 'Carol', state: 'out' },
            { key: 'd', name: 'Dan', state: 'in' },
          ].map(m => (
            <div key={m.key} className="hf-row center" style={{ gap: 10, opacity: m.state === 'out' ? 0.5 : 1 }}>
              <span className={`mb-dot ${m.key} ${m.state === 'in' ? 'live' : ''}`} style={{ width: 28, height: 28, fontSize: 11 }}>{m.name[0]}</span>
              <span className="t-sm" style={{ fontWeight: 500, flex: 1 }}>{m.name}</span>
              {m.state === 'in' && <span className="t-xs" style={{ color: 'var(--good)', fontWeight: 500 }}>● 연결됨</span>}
              {m.state === 'out' && <span className="t-xs ink-3">재접속 중…</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="hf-card" style={{ padding: 12, marginTop: 16, display: 'flex', gap: 10, alignItems: 'flex-start', background: 'var(--surface-2)', boxShadow: 'none' }}>
        <div className="coach-avatar sm">◐</div>
        <p className="t-xs" style={{ margin: 0, lineHeight: 1.55, color: 'var(--ink-2)', flex: 1 }}>
          30초 안에 돌아오지 않으면 Carol을 빼고 진행할게요.
        </p>
      </div>
    </div>

    <div className="hf-footer">
      <div className="hf-row" style={{ gap: 8 }}>
        <button className="hf-btn secondary" style={{ flex: 1 }}>잠시 대기</button>
        <button className="hf-btn primary" style={{ flex: 1 }}>3명으로 진행</button>
      </div>
    </div>
  </div>
);

window.HomeHifi = HomeHifi;
window.LobbyHifi = LobbyHifi;
window.MyHifi = MyHifi;
window.EdgeMicHifi = EdgeMicHifi;
window.EdgeReconnectHifi = EdgeReconnectHifi;
