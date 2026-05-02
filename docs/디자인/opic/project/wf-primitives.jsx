// Shared sketchy primitives for wireframes
// Tiny inline-friendly helpers used by all session-room artboards.

const Stack = ({ children, gap = 8, style, className = '', ...rest }) => (
  <div className={`stack ${className}`} style={{ gap, ...style }} {...rest}>{children}</div>
);
const Row = ({ children, gap = 8, style, className = '', ...rest }) => (
  <div className={`row ${className}`} style={{ gap, ...style }} {...rest}>{children}</div>
);

// Sketchy phone frame for mobile artboards
const Phone = ({ title = '오픽 스터디', children, footerHint }) => (
  <div className="phone">
    <div className="phone-status">
      <span>9:41</span>
      <span style={{ fontSize: 9 }}>● ● ●</span>
      <span>100%</span>
    </div>
    <div className="phone-body">{children}</div>
    {footerHint && <div className="t-xs muted text-center" style={{ padding: '4px 0', borderTop: '1px solid var(--line-light)' }}>{footerHint}</div>}
  </div>
);

// Immersive header used inside the session room
const ImmHeader = ({ step, total = 7, mode = '온라인', members = 4, speaking, title }) => (
  <div className="imm-header">
    <Row gap={6} className="items-center">
      <span className="hand t-sm">← 나가기</span>
      <span className="muted t-xs">·</span>
      <span className="hand t-sm">{title || `Step ${step}/${total}`}</span>
    </Row>
    <Row gap={6} className="items-center">
      <span className="toggle">
        <span className={mode === '온라인' ? 'on' : ''}>온라인</span>
        <span className={mode === '오프라인' ? 'on' : ''}>오프라인</span>
      </span>
      <Row gap={2}>
        {Array.from({ length: members }).map((_, i) => (
          <span key={i} className={`mb-dot ${speaking === i ? 'speaking' : 'live'}`}>{['A','B','C','D','E'][i]}</span>
        ))}
      </Row>
    </Row>
  </div>
);

// Step dots for use inside sub-headers
const StepDots = ({ now = 1, total = 7 }) => (
  <div className="dots-steps">
    {Array.from({ length: total }).map((_, i) => (
      <i key={i} className={i + 1 < now ? 'done' : i + 1 === now ? 'now' : ''}>{i + 1}</i>
    ))}
  </div>
);

// Generic sketchy "image" placeholder
const Img = ({ w = '100%', h = 80, label, style }) => (
  <div className="sk-img" style={{ width: w, height: h, display: 'flex', alignItems: 'center', justifyContent: 'center', ...style }}>
    {label && <span className="hand t-sm muted">{label}</span>}
  </div>
);

// Lorem placeholder lines
const Lines = ({ n = 3, last = 60 }) => (
  <Stack gap={6}>
    {Array.from({ length: n }).map((_, i) => (
      <div key={i} className="line-row" style={i === n - 1 ? { width: `${last}%` } : null} />
    ))}
  </Stack>
);

// Wave bars
const Wave = ({ bars = 22, live = false, h = 28 }) => {
  const heights = React.useMemo(() => Array.from({ length: bars }).map(() => 4 + Math.random() * (h - 4)), [bars, h]);
  return (
    <div className="wave" style={{ height: h }}>
      {heights.map((bh, i) => (
        <i key={i} style={{ height: bh, background: live ? 'var(--accent)' : 'var(--line)' }} />
      ))}
    </div>
  );
};

// Member tile (used in 6-1 selection + 6-6 comparison)
const MemberTile = ({ name = 'Alice', initial = 'A', tag, status, active, mini }) => (
  <div className={`card ${active ? '' : 'soft'}`} style={{
    padding: mini ? 8 : 12,
    borderColor: active ? 'var(--accent)' : undefined,
    background: active ? 'var(--accent-soft)' : undefined,
    position: 'relative',
  }}>
    <Row gap={8} className="items-center">
      <span className="sk-circle" style={{ width: mini ? 24 : 34, height: mini ? 24 : 34, fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: mini ? 11 : 13 }}>{initial}</span>
      <Stack gap={2} className="grow">
        <span className="hand" style={{ fontSize: mini ? 13 : 15 }}>{name}</span>
        {tag && <span className="t-xs muted">{tag}</span>}
      </Stack>
      {status && <span className="bdg hi t-xs">{status}</span>}
    </Row>
  </div>
);

// Mode toggle (for Step 1)
const ModeCard = ({ icon, title, desc, active }) => (
  <div className="card" style={{
    flex: 1,
    borderColor: active ? 'var(--accent)' : undefined,
    background: active ? 'var(--accent-soft)' : undefined,
    borderWidth: active ? 2 : 1.5,
    padding: 14,
    position: 'relative',
  }}>
    {active && <span className="check-tag">✓</span>}
    <div style={{ fontSize: 28, marginBottom: 6 }}>{icon}</div>
    <div className="hand t-lg" style={{ marginBottom: 4 }}>{title}</div>
    <div className="t-xs muted" style={{ lineHeight: 1.5 }}>{desc}</div>
  </div>
);

// Coaching card sections (good / warn / tip)
const CoachLine = ({ kind = 'good', label, items, compact }) => {
  const cls = { good: 'good', warn: 'warn', tip: 'tip' }[kind];
  const ic = { good: '✓', warn: '⚠', tip: '💡' }[kind];
  return (
    <div className={`coach-sec ${cls}`} style={compact ? { padding: '5px 8px', margin: '4px 0' } : null}>
      <div className="hand" style={{ fontSize: compact ? 12 : 13, marginBottom: 3 }}>
        <span style={{ marginRight: 4 }}>{ic}</span>{label}
      </div>
      {items && (
        <ul style={{ margin: 0, paddingLeft: 16, fontSize: compact ? 10 : 11, color: 'var(--ink-2)', lineHeight: 1.4, fontFamily: 'var(--font-body)' }}>
          {items.map((it, i) => <li key={i}>{it}</li>)}
        </ul>
      )}
    </div>
  );
};

// Annotation flag (sticky)
const Flag = ({ children, top, left, right, bottom, color = 'hi' }) => (
  <div className="flag" style={{
    top, left, right, bottom,
    background: color === 'acc' ? 'var(--accent-soft)' : color === 'g' ? 'var(--hilite-2)' : 'var(--hilite)'
  }}>{children}</div>
);

Object.assign(window, { Stack, Row, Phone, ImmHeader, StepDots, Img, Lines, Wave, MemberTile, ModeCard, CoachLine, Flag });
