// Hi-fi Step 1 — 모드 선택 (Mode picker)

const Step1Hifi = () => {
  const [mode, setMode] = React.useState('online');
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
            <span className="t-h3">5월 오픽 AL 스터디</span>
            <span className="t-micro ink-3">멤버 4명 · 세션 룸</span>
          </div>
        </div>
        <span className="pill live">실시간</span>
      </div>

      <div className="body" style={{ padding: '24px 20px 0' }}>
        {/* Step indicator */}
        <div className="hf-row center" style={{ gap: 6, marginBottom: 24 }}>
          {[1,2,3,4,5,6,7].map(i => (
            <div key={i} style={{
              flex: i === 1 ? '0 0 24px' : 1,
              height: 4,
              borderRadius: 2,
              background: i === 1 ? 'var(--tc)' : i < 1 ? 'var(--ink-2)' : 'var(--line-strong)',
            }}/>
          ))}
          <span className="t-micro ink-3 num" style={{ marginLeft: 6 }}>1 / 7</span>
        </div>

        <h1 className="t-display" style={{ margin: 0, marginBottom: 6 }}>
          오늘 어떻게<br/>모일까요?
        </h1>
        <p className="t-body ink-3" style={{ margin: 0, marginBottom: 24 }}>
          학습 중에도 언제든 바꿀 수 있어요.
        </p>

        <div className="hf-stack" style={{ gap: 10 }}>
          <div className={`mode-card ${mode === 'online' ? 'selected' : ''}`} onClick={() => setMode('online')}>
            <div className="check">✓</div>
            <div className="hf-row" style={{ gap: 14 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: mode === 'online' ? 'var(--tc)' : 'var(--surface-2)',
                color: mode === 'online' ? 'white' : 'var(--ink-2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, flexShrink: 0,
                transition: 'all 0.15s'
              }}>📡</div>
              <div className="hf-stack" style={{ gap: 4 }}>
                <span className="t-h2">온라인</span>
                <span className="t-sm ink-3">화상으로 모여서 함께 답변하고 코칭을 받아요</span>
                <div className="hf-row" style={{ gap: 6, marginTop: 8 }}>
                  <span className="pill">화상 통화</span>
                  <span className="pill">실시간 동기화</span>
                </div>
              </div>
            </div>
          </div>

          <div className={`mode-card ${mode === 'offline' ? 'selected' : ''}`} onClick={() => setMode('offline')}>
            <div className="check">✓</div>
            <div className="hf-row" style={{ gap: 14 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: mode === 'offline' ? 'var(--tc)' : 'var(--surface-2)',
                color: mode === 'offline' ? 'white' : 'var(--ink-2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, flexShrink: 0,
                transition: 'all 0.15s'
              }}>👥</div>
              <div className="hf-stack" style={{ gap: 4 }}>
                <span className="t-h2">오프라인</span>
                <span className="t-sm ink-3">한 공간에 모여서 함께 답변하고 코칭을 받아요</span>
                <div className="hf-row" style={{ gap: 6, marginTop: 8 }}>
                  <span className="pill">대면 모임</span>
                  <span className="pill">한 화면 공유</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Members ready strip */}
        <div className="hf-card" style={{ padding: 14, marginTop: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
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
        </div>
      </div>

      <div className="hf-footer">
        <button className="hf-btn primary lg full">시작하기</button>
      </div>
    </div>
  );
};

window.Step1Hifi = Step1Hifi;
