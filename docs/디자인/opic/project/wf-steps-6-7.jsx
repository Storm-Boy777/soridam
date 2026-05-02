// Step 6 (질문 루프) + Step 7 (종료) wireframes
// Includes the brand-core: AI coaching card (6-4) and 4-up comparison (6-6)

// ─────────── STEP 6-1 — 발화자 선정 ───────────
const Step61_A = () => (
  <Phone>
    <ImmHeader step={6} title="Step 6-1 · 발화자" speaking={null} />
    <div className="px-4 py-3 stack" style={{ gap: 8 }}>
      <Row className="between">
        <span className="hand t-md">Q1 · 묘사</span>
        <span className="bdg t-xs">1 / 3</span>
      </Row>
      <span className="t-xs body muted" style={{ lineHeight: 1.4 }}>"What kind of music do you listen to? Who are some of your favorite musicians?"</span>
    </div>
    <hr className="dashed" />
    <div className="p-4 stack" style={{ gap: 10 }}>
      <span className="hand t-lg">누가 먼저 답변할까요?</span>
      <Stack gap={6}>
        <MemberTile name="Alice" initial="A" tag="아직 답변 X" status="자원" active />
        <MemberTile name="Bob" initial="B" tag="아직 답변 X" />
        <MemberTile name="Carol" initial="C" tag="아직 답변 X" />
        <MemberTile name="Dan" initial="D" tag="아직 답변 X" />
      </Stack>
      <span className="t-xs muted text-center">먼저 누른 사람이 발화자 (first-write-wins)</span>
      <button className="btn acc full lg">내가 할게요!</button>
    </div>
  </Phone>
);

const Step61_B = () => (
  <Phone>
    <ImmHeader step={6} title="발화자" />
    <div className="p-4 stack flex-1" style={{ gap: 14, position: 'relative' }}>
      <Stack gap={2}>
        <span className="t-xs muted">Q1 · 1 of 3</span>
        <span className="hand t-2xl">발화자<br/>지원받습니다</span>
      </Stack>
      {/* Roundtable view */}
      <div style={{ position: 'relative', height: 220, margin: '8px auto', width: 220 }}>
        <div className="sk-circle" style={{ position: 'absolute', inset: 40, borderStyle: 'dashed', background: 'transparent' }}></div>
        <span className="hand t-xs muted" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center', width: 100 }}>탭해서 자원</span>
        <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)' }}><MemberTile name="Alice" initial="A" mini active /></div>
        <div style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)' }}><MemberTile name="Bob" initial="B" mini /></div>
        <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)' }}><MemberTile name="Carol" initial="C" mini /></div>
        <div style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)' }}><MemberTile name="Dan" initial="D" mini /></div>
      </div>
      <div className="card tint">
        <span className="t-xs body">Alice가 자원 · 5초 후 시작</span>
      </div>
    </div>
  </Phone>
);

const Step61_C = () => (
  <Phone>
    <ImmHeader step={6} title="발화자" />
    <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--line-light)' }}>
      <span className="hand t-sm">Q1 · 묘사 · 1/3</span>
    </div>
    <div className="p-4 stack flex-1" style={{ gap: 8 }}>
      <span className="hand t-md">발화 순서 (드래그로 변경)</span>
      <Stack gap={6}>
        {[['1', 'Alice', '나', 'now'], ['2', 'Bob', '대기', null], ['3', 'Carol', '대기', null], ['4', 'Dan', '대기', null]].map(([n, name, tag, st], i) => (
          <Row key={i} gap={8} className="items-center" style={{
            padding: 10, border: `${st === 'now' ? 1.8 : 1}px solid ${st === 'now' ? 'var(--accent)' : 'var(--line-light)'}`,
            borderRadius: 8, background: st === 'now' ? 'var(--accent-soft)' : 'var(--paper)',
          }}>
            <span className="bdg solid t-xs" style={{ minWidth: 22, justifyContent: 'center' }}>{n}</span>
            <span className="hand t-md grow">{name}</span>
            <span className="bdg t-xs">{tag}</span>
            <span className="muted body" style={{ fontSize: 14 }}>≡</span>
          </Row>
        ))}
      </Stack>
      <Row gap={8} style={{ marginTop: 'auto' }}>
        <button className="btn full">랜덤</button>
        <button className="btn acc full">Alice 시작</button>
      </Row>
    </div>
  </Phone>
);

// ─────────── STEP 6-2 — 답변 녹음 (본인) ───────────
const Step62_A = () => (
  <Phone>
    <ImmHeader step={6} title="6-2 · 녹음" speaking={0} />
    <div className="p-4 stack flex-1" style={{ gap: 12 }}>
      <div className="card tint">
        <span className="t-xs muted body">Q1 · 묘사</span>
        <div className="hand t-md" style={{ marginTop: 4, lineHeight: 1.4 }}>What kind of music do you listen to? Who are some of your favorite musicians?</div>
      </div>
      <div className="stack center" style={{ flex: 1, gap: 14 }}>
        <span className="hand t-lg">🎤 당신 차례예요</span>
        <div className="mic-big live">
          <span style={{ fontSize: 32 }}>🎤</span>
        </div>
        <span className="timer">REC · 00:42</span>
        <Wave bars={26} live h={28} />
      </div>
      <Row gap={8}>
        <button className="btn full">다시 녹음</button>
        <button className="btn primary full">제출</button>
      </Row>
    </div>
  </Phone>
);

const Step62_B_self = () => (
  <Phone>
    <ImmHeader step={6} title="녹음" speaking={0} />
    {/* Question pinned top */}
    <div className="p-3" style={{ background: 'var(--ink)', color: 'var(--paper)' }}>
      <Row gap={6} className="items-center">
        <span className="bdg t-xs" style={{ background: 'var(--paper)', color: 'var(--ink)' }}>Q1</span>
        <span className="t-xs body" style={{ lineHeight: 1.4 }}>What kind of music do you listen to?</span>
      </Row>
    </div>
    <div className="stack center flex-1" style={{ background: 'var(--accent-soft)', position: 'relative' }}>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* Pulsing rings */}
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            position: 'absolute', borderRadius: '50%',
            width: 120 + i * 50, height: 120 + i * 50,
            border: `1.5px solid var(--accent)`, opacity: 0.3 - i * 0.08,
          }} />
        ))}
        <div style={{
          width: 110, height: 110, borderRadius: '50%',
          background: 'var(--accent)', color: 'var(--paper)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 40, boxShadow: '0 4px 0 rgba(0,0,0,0.15)',
        }}>🎤</div>
      </div>
      <div style={{ position: 'absolute', top: 14, right: 14 }}>
        <span className="timer" style={{ background: 'var(--paper)' }}>● 01:08</span>
      </div>
      <div style={{ position: 'absolute', bottom: 16, left: 16, right: 16 }}>
        <Wave bars={32} live h={36} />
        <Row gap={8} style={{ marginTop: 12 }}>
          <button className="btn full">↺ 다시</button>
          <button className="btn primary full">완료 ✓</button>
        </Row>
      </div>
    </div>
  </Phone>
);

const Step62_C_other = () => (
  <Phone>
    <ImmHeader step={6} title="청취 중" speaking={0} />
    <div className="p-4 stack flex-1" style={{ gap: 12 }}>
      <div className="card tint">
        <span className="t-xs muted body">Q1</span>
        <div className="t-xs body" style={{ marginTop: 4, lineHeight: 1.4 }}>What kind of music do you listen to?</div>
      </div>
      <div className="stack center" style={{ flex: 1, gap: 12 }}>
        <span className="sk-circle" style={{ width: 90, height: 90, background: 'var(--accent-soft)', borderColor: 'var(--accent)', fontSize: 32 }}>A</span>
        <span className="hand t-lg">Alice 답변 중</span>
        <Wave bars={24} h={28} />
        <span className="timer">01:12</span>
        <Stack gap={6} style={{ width: '100%', marginTop: 8 }}>
          <Row gap={6} className="items-center"><span className="mb-dot live">B</span><span className="t-xs muted body">Bob · 청취 중</span></Row>
          <Row gap={6} className="items-center"><span className="mb-dot live">C</span><span className="t-xs muted body">Carol · 청취 중</span></Row>
          <Row gap={6} className="items-center"><span className="mb-dot live">D</span><span className="t-xs muted body">Dan · 청취 중 (나)</span></Row>
        </Stack>
      </div>
      <span className="t-xs muted text-center body">발화자 마이크만 켜져 있어요</span>
    </div>
  </Phone>
);

// ─────────── STEP 6-3 — AI 코칭 생성 중 ───────────
const Step63_A = () => (
  <Phone>
    <ImmHeader step={6} title="6-3 · 분석 중" />
    <div className="stack center flex-1 p-4" style={{ gap: 14 }}>
      <div className="sk-circle" style={{ width: 80, height: 80, background: 'var(--accent-soft)', borderColor: 'var(--accent)' }}>
        <span style={{ fontSize: 32 }}>👨‍🏫</span>
      </div>
      <span className="hand t-xl">강사가 듣고 있어요</span>
      <Stack gap={6} style={{ width: '100%' }}>
        <Row gap={8} className="items-center"><span className="hand t-sm" style={{ minWidth: 70 }}>전사</span><div style={{ flex: 1, height: 4, background: 'var(--paper-2)' }}><div style={{ width: '100%', height: '100%', background: 'var(--accent)' }}/></div><span className="hand t-xs accent">✓</span></Row>
        <Row gap={8} className="items-center"><span className="hand t-sm" style={{ minWidth: 70 }}>발음 분석</span><div style={{ flex: 1, height: 4, background: 'var(--paper-2)' }}><div style={{ width: '70%', height: '100%', background: 'var(--accent)' }}/></div><span className="t-xs muted body">···</span></Row>
        <Row gap={8} className="items-center"><span className="hand t-sm" style={{ minWidth: 70 }}>코칭 작성</span><div style={{ flex: 1, height: 4, background: 'var(--paper-2)' }}><div style={{ width: '15%', height: '100%', background: 'var(--accent)' }}/></div><span className="t-xs muted body">···</span></Row>
      </Stack>
    </div>
  </Phone>
);

const Step63_B = () => (
  <Phone>
    <ImmHeader step={6} title="분석 중" />
    <div className="stack center flex-1 p-4">
      <div style={{ position: 'relative', width: 180, height: 180, marginBottom: 16 }}>
        <div className="sk-circle" style={{ position: 'absolute', inset: 0, borderStyle: 'dashed', background: 'transparent' }}></div>
        <div className="sk-circle" style={{ position: 'absolute', inset: 24 }}><span style={{ fontSize: 48 }}>👨‍🏫</span></div>
      </div>
      <span className="hand t-xl">잠깐만요...</span>
      <span className="t-xs muted text-center body" style={{ marginTop: 8, lineHeight: 1.5 }}>Alice의 답변에서<br/>좋았던 점들을 정리하고 있어요</span>
      {/* skeleton card preview */}
      <div className="card soft" style={{ width: '100%', marginTop: 18, padding: 10 }}>
        <Stack gap={6}>
          <div className="line-row thick" style={{ width: '40%' }} />
          <Lines n={3} last={70} />
        </Stack>
      </div>
    </div>
  </Phone>
);

const Step63_C = () => (
  <Phone>
    <ImmHeader step={6} title="분석 중" />
    <div className="p-4 stack flex-1" style={{ gap: 10 }}>
      <Row gap={6}>
        <span className="bdg solid t-xs">A</span>
        <span className="hand t-md">Alice 답변 분석</span>
        <span className="t-xs muted body" style={{ marginLeft: 'auto' }}>~8초</span>
      </Row>
      {/* Step list */}
      <Stack gap={6} style={{ marginTop: 6 }}>
        <Row gap={8} className="items-center"><span className="bdg g t-xs">✓</span><span className="hand t-sm">음성 → 텍스트 (Whisper)</span></Row>
        <Row gap={8} className="items-center"><span className="bdg g t-xs">✓</span><span className="hand t-sm">발음 패턴 분석</span></Row>
        <Row gap={8} className="items-center"><span className="bdg acc t-xs">···</span><span className="hand t-sm">강점·다듬을 부분 정리</span></Row>
        <Row gap={8} className="items-center"><span className="bdg t-xs muted">○</span><span className="hand t-sm muted">팁 작성</span></Row>
      </Stack>
      <hr className="dashed" />
      <span className="hand t-sm muted">다른 멤버 화면</span>
      <Row gap={6}>
        {['B','C','D'].map(c => <span key={c} className="mb-dot live">{c}</span>)}
        <span className="t-xs muted body" style={{ alignSelf: 'center' }}>같이 기다리는 중</span>
      </Row>
      <button className="btn full" style={{ marginTop: 'auto' }}>건너뛰기 (코칭 안 받기)</button>
    </div>
  </Phone>
);

// ─────────── STEP 6-4 — AI 코칭 카드 (브랜드 핵심) ───────────
const COACH_TEXT = "오! Alice, 도입 진짜 깔끔했어요. \"I'm really into hip-hop these days\" 같은 표현 자연스러워요. 근데 중간에 시제가 살짝 흔들렸어요. 다음엔 시제 한 번 더 챙기면 훨씬 매끄럽게 나올 거예요.";

// Var A — vertical, narrative-led (most readable, story-like)
const Step64_A = () => (
  <Phone>
    <ImmHeader step={6} title="6-4 · 코칭" />
    <div className="p-4 stack" style={{ gap: 10, overflow: 'auto' }}>
      <Row gap={8} className="items-center">
        <span className="sk-circle" style={{ width: 36, height: 36, fontSize: 14 }}>A</span>
        <Stack gap={2} className="grow">
          <span className="hand t-md">Alice의 답변</span>
          <span className="t-xs muted body">01:12 · 묘사</span>
        </Stack>
        <button className="btn sm">▶ 듣기</button>
      </Row>
      <div className="card tint" style={{ padding: 10 }}>
        <span className="t-xs body" style={{ lineHeight: 1.5, color: 'var(--ink-2)' }}>"I'm really into hip-hop these days. I started listening when I was in middle school..."</span>
      </div>
      {/* Hero coaching message */}
      <div className="card" style={{ borderColor: 'var(--accent)', background: 'var(--accent-soft)', padding: 14, position: 'relative' }}>
        <Row gap={6} className="items-center" style={{ marginBottom: 6 }}>
          <span style={{ fontSize: 18 }}>🎓</span>
          <span className="hand t-md">AI 스터디 코치 한마디</span>
        </Row>
        <span className="t-sm body" style={{ lineHeight: 1.6, color: 'var(--ink)' }}>{COACH_TEXT}</span>
      </div>
      <CoachLine kind="good" label="잘한 점" items={['자연스러운 도입 표현', '풍부한 어휘 ("genre")', '발음 또렷']} />
      <CoachLine kind="warn" label="다듬을 부분" items={['현재 → 과거 시제 일관성', "'rhythm' 한 번 더 또박또박"]} />
      <CoachLine kind="tip" label="다음 답변 팁" items={['"I usually..., and last month..." 패턴']} />
    </div>
  </Phone>
);

// Var B — chat-bubble narrative (강사 페르소나 강조)
const Step64_B = () => (
  <Phone>
    <ImmHeader step={6} title="강사 코칭" />
    <div className="p-4 stack flex-1" style={{ gap: 10, background: 'var(--paper-2)' }}>
      <Row gap={8} className="items-center">
        <span className="sk-circle" style={{ width: 32, height: 32, background: 'var(--accent-soft)', borderColor: 'var(--accent)' }}>👨‍🏫</span>
        <Stack gap={0}>
          <span className="hand t-md">AI 스터디 코치 → Alice</span>
          <span className="t-xs muted">방금 도착</span>
        </Stack>
      </Row>
      {/* chat bubbles */}
      <div style={{ alignSelf: 'flex-start', maxWidth: '88%' }} className="card lifted">
        <span className="t-sm body" style={{ lineHeight: 1.55 }}>오! Alice, <span className="spot-acc spot">도입 진짜 깔끔</span>했어요 👍</span>
      </div>
      <div style={{ alignSelf: 'flex-start', maxWidth: '88%' }} className="card lifted">
        <span className="t-sm body" style={{ lineHeight: 1.55 }}>"I'm really into hip-hop these days" — 이런 표현 자연스러워요. 발음도 또렷!</span>
      </div>
      <div style={{ alignSelf: 'flex-start', maxWidth: '88%' }} className="card lifted" style={{ background: 'var(--hilite)' }}>
        <span className="hand t-xs" style={{ color: 'var(--ink-2)' }}>다듬을 부분 ⚠</span>
        <div className="t-sm body" style={{ lineHeight: 1.55, marginTop: 4 }}>중간에 <span className="spot">시제가 살짝 흔들렸어요</span>. 'rhythm'도 한 번 더 또박.</div>
      </div>
      <div style={{ alignSelf: 'flex-start', maxWidth: '88%' }} className="card lifted">
        <span className="hand t-xs">팁 💡</span>
        <div className="t-sm body" style={{ lineHeight: 1.55, marginTop: 4 }}>"I usually..., and last month..." 패턴 써보세요!</div>
      </div>
      <Row gap={6} style={{ marginTop: 'auto' }}>
        <button className="btn sm">👍</button>
        <button className="btn sm">💾 저장</button>
        <button className="btn primary sm" style={{ marginLeft: 'auto' }}>다음 →</button>
      </Row>
    </div>
  </Phone>
);

// Var C — Compact summary-first; expandable details
const Step64_C = () => (
  <Phone>
    <ImmHeader step={6} title="코칭 요약" />
    <div className="p-4 stack" style={{ gap: 10, overflow: 'auto' }}>
      <Row className="between items-center">
        <Row gap={6} className="items-center">
          <span className="sk-circle" style={{ width: 28, height: 28, fontSize: 11 }}>A</span>
          <span className="hand t-md">Alice · Q1</span>
        </Row>
        <Row gap={4}><span className="bdg g t-xs">3 강점</span><span className="bdg hi t-xs">2 다듬</span><span className="bdg acc t-xs">1 팁</span></Row>
      </Row>
      <div className="card" style={{ borderColor: 'var(--accent)', background: 'var(--paper)', padding: 14 }}>
        <span className="hand t-md" style={{ display: 'block', marginBottom: 4 }}>핵심 한 줄</span>
        <span className="t-sm body" style={{ lineHeight: 1.55 }}>도입은 깔끔, <span className="spot">시제 한 번 더 챙기면</span> AL 매끄럽게.</span>
      </div>
      {/* Accordion-style sections */}
      <Stack gap={6}>
        <div className="card soft" style={{ padding: 0 }}>
          <Row className="between items-center" style={{ padding: 10, borderBottom: '1px solid var(--line-light)' }}>
            <Row gap={6} className="items-center"><span className="bdg g t-xs">✓</span><span className="hand t-sm">잘한 점</span></Row>
            <span className="muted body t-sm">▾</span>
          </Row>
          <Stack gap={4} style={{ padding: '8px 12px' }}>
            <span className="t-xs body" style={{ color: 'var(--ink-2)' }}>· 자연스러운 도입 표현</span>
            <span className="t-xs body" style={{ color: 'var(--ink-2)' }}>· 풍부한 어휘 ("genre")</span>
            <span className="t-xs body" style={{ color: 'var(--ink-2)' }}>· 발음 또렷</span>
          </Stack>
        </div>
        <div className="card soft" style={{ padding: 10 }}>
          <Row className="between"><Row gap={6} className="items-center"><span className="bdg hi t-xs">⚠</span><span className="hand t-sm">다듬을 부분 (2)</span></Row><span className="muted body t-sm">▸</span></Row>
        </div>
        <div className="card soft" style={{ padding: 10 }}>
          <Row className="between"><Row gap={6} className="items-center"><span className="bdg acc t-xs">💡</span><span className="hand t-sm">다음 답변 팁 (1)</span></Row><span className="muted body t-sm">▸</span></Row>
        </div>
      </Stack>
      <Row gap={8}>
        <button className="btn full">📝 메모</button>
        <button className="btn primary full">다음 발화자</button>
      </Row>
    </div>
  </Phone>
);

// ─────────── STEP 6-6 — 4명 동시 비교 ───────────
const MiniCoach = ({ name, initial, oneliner, strengths = 2, weaknesses = 1, accent }) => (
  <div className="card" style={{
    padding: 8, borderRadius: 8,
    borderColor: accent ? 'var(--accent)' : undefined,
    background: accent ? 'var(--accent-soft)' : undefined,
  }}>
    <Row gap={6} className="items-center" style={{ marginBottom: 6 }}>
      <span className="sk-circle" style={{ width: 22, height: 22, fontSize: 10 }}>{initial}</span>
      <span className="hand t-sm grow">{name}</span>
      <span className="t-xs muted body">▸</span>
    </Row>
    <div style={{ fontSize: 10, lineHeight: 1.4, color: 'var(--ink-2)', minHeight: 28 }} className="body">{oneliner}</div>
    <Row gap={4} style={{ marginTop: 6 }}>
      <span className="bdg g t-xs" style={{ padding: '0 5px' }}>✓{strengths}</span>
      <span className="bdg hi t-xs" style={{ padding: '0 5px' }}>⚠{weaknesses}</span>
    </Row>
  </div>
);

// Var A — 2x2 grid mobile
const Step66_A = () => (
  <Phone>
    <ImmHeader step={6} title="6-6 · 함께 보기" />
    <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--line-light)' }}>
      <Row className="between">
        <Stack gap={2}><span className="hand t-md">Q1 · 4명 코칭</span><span className="t-xs muted body">서로 짚어보기 5:00</span></Stack>
        <span className="timer">04:23</span>
      </Row>
    </div>
    <div className="p-3 stack" style={{ gap: 8, overflow: 'auto' }}>
      <div className="grid-4">
        <MiniCoach name="Alice" initial="A" oneliner="도입 깔끔, 시제 한 번 더" strengths={3} weaknesses={2} accent />
        <MiniCoach name="Bob" initial="B" oneliner="어휘 좋음, 속도 살짝 빠름" strengths={2} weaknesses={2} />
        <MiniCoach name="Carol" initial="C" oneliner="구조 명확, 디테일 추가 굿" strengths={3} weaknesses={1} />
        <MiniCoach name="Dan" initial="D" oneliner="자신감 좋음, 발음 정리" strengths={2} weaknesses={3} />
      </div>
      <div className="card tint">
        <span className="hand t-sm">📌 모두 공통</span>
        <div className="t-xs body" style={{ marginTop: 4, lineHeight: 1.5 }}>"도입은 강한데 → <span className="spot">중간 시제 흔들림</span>이 4명 다 보여요. 같이 짚으면 좋겠어요."</div>
      </div>
      <Row gap={8}>
        <button className="btn full">💬 토론 메모</button>
        <button className="btn primary full">다음 질문 →</button>
      </Row>
    </div>
  </Phone>
);

// Var B — Single column with comparison highlight
const Step66_B = () => (
  <Phone>
    <ImmHeader step={6} title="함께 보기" />
    <div className="p-3 stack" style={{ gap: 10, overflow: 'auto' }}>
      <div className="card" style={{ background: 'var(--ink)', color: 'var(--paper)', borderColor: 'var(--ink)' }}>
        <span className="hand t-sm" style={{ color: 'var(--paper)' }}>오늘의 인사이트</span>
        <div className="t-xs body" style={{ marginTop: 4, lineHeight: 1.55 }}>4명 모두 <span style={{ background: 'var(--accent)', padding: '0 4px' }}>중간 시제 일관성</span>이 흔들렸어요. 같이 다듬어요!</div>
      </div>
      {/* Member rows w/ highlight */}
      {[
        { n: 'Alice', i: 'A', s: ['깔끔한 도입', '풍부한 어휘'], w: ['시제 흔들림'], same: true },
        { n: 'Bob', i: 'B', s: ['생생한 어휘'], w: ['속도 빠름', '시제 흔들림'], same: true },
        { n: 'Carol', i: 'C', s: ['명확한 구조', '디테일'], w: ['시제 흔들림'], same: true },
        { n: 'Dan', i: 'D', s: ['자신감 있는 톤'], w: ['발음 또렷', '시제 흔들림'], same: true },
      ].map(({ n, i, s, w }) => (
        <div key={n} className="card soft" style={{ padding: 10 }}>
          <Row gap={6} className="items-center" style={{ marginBottom: 6 }}>
            <span className="sk-circle" style={{ width: 24, height: 24, fontSize: 10 }}>{i}</span>
            <span className="hand t-sm grow">{n}</span>
            <span className="t-xs muted body">▸ 펼치기</span>
          </Row>
          <Row gap={4} style={{ flexWrap: 'wrap' }}>
            {s.map((x, j) => <span key={j} className="bdg g t-xs">✓ {x}</span>)}
            {w.map((x, j) => (
              <span key={j} className="bdg t-xs" style={{
                background: x.includes('시제') ? 'var(--accent-soft)' : 'var(--hilite)',
                borderColor: x.includes('시제') ? 'var(--accent)' : undefined,
              }}>⚠ {x}</span>
            ))}
          </Row>
        </div>
      ))}
      <button className="btn primary full">다음 질문 →</button>
    </div>
  </Phone>
);

// Var C — 4-up landscape view (PC-friendly compressed)
const Step66_C = () => (
  <Phone>
    <ImmHeader step={6} title="함께 보기" />
    <div className="px-4 py-3 between" style={{ borderBottom: '1px solid var(--line-light)' }}>
      <span className="hand t-md">Q1 · 토론 시간</span>
      <Row gap={6}>
        <span className="timer">04:23</span>
        <button className="btn sm">⏸</button>
      </Row>
    </div>
    <div className="p-3 stack flex-1" style={{ gap: 8, overflow: 'auto' }}>
      <div className="grid-4-row">
        {['A','B','C','D'].map((c, i) => (
          <div key={c} className="card soft" style={{ padding: 6 }}>
            <span className="sk-circle" style={{ width: 24, height: 24, fontSize: 10, margin: '0 auto 4px' }}>{c}</span>
            <Stack gap={3} style={{ marginTop: 4 }}>
              <div style={{ height: 4, background: '#4a8a4a', opacity: 0.7 }} />
              <div style={{ height: 4, background: '#4a8a4a', opacity: 0.7, width: i === 1 ? '50%' : '100%' }} />
              <div style={{ height: 4, background: 'var(--accent)', width: i === 3 ? '100%' : i === 0 ? '60%' : '40%' }} />
              <div style={{ height: 4, background: 'var(--accent)', opacity: 0.5, width: i === 3 ? '70%' : 0 }} />
            </Stack>
            <div className="t-xs muted body text-center" style={{ marginTop: 4 }}>탭</div>
          </div>
        ))}
      </div>
      {/* Selected member detail */}
      <div className="card" style={{ borderColor: 'var(--accent)' }}>
        <Row className="between" style={{ marginBottom: 8 }}>
          <Row gap={6} className="items-center">
            <span className="sk-circle" style={{ width: 28, height: 28, fontSize: 11, background: 'var(--accent-soft)', borderColor: 'var(--accent)' }}>A</span>
            <span className="hand t-md">Alice 펼침</span>
          </Row>
          <span className="muted body t-xs">{'< 1/4 >'}</span>
        </Row>
        <span className="t-xs body" style={{ lineHeight: 1.5 }}>"도입 진짜 깔끔! 시제 한 번 더 챙기면 매끄럽게..."</span>
        <Row gap={4} style={{ flexWrap: 'wrap', marginTop: 6 }}>
          <span className="bdg g t-xs">✓ 도입</span>
          <span className="bdg g t-xs">✓ 어휘</span>
          <span className="bdg acc t-xs">⚠ 시제</span>
        </Row>
      </div>
      <Row gap={6}>
        <button className="btn full">📝 모두 저장</button>
        <button className="btn primary full">다음 →</button>
      </Row>
    </div>
  </Phone>
);

// ─────────── STEP 7 — 종료 / 요약 ───────────
const Step7_A = () => (
  <Phone>
    <ImmHeader step={7} title="종료" />
    <div className="p-4 stack flex-1" style={{ gap: 12, overflow: 'auto' }}>
      <Stack gap={4}>
        <span className="hand t-3xl">수고했어요! 🎉</span>
        <span className="t-xs muted body">음악 콤보 A · 32분 · 4명</span>
      </Stack>
      <div className="card tint" style={{ padding: 14 }}>
        <Row className="between" style={{ marginBottom: 8 }}>
          <span className="hand t-md">오늘의 인사이트</span>
          <span style={{ fontSize: 22 }}>💡</span>
        </Row>
        <span className="t-xs body" style={{ lineHeight: 1.55 }}>
          공통 약점: <span className="spot-acc spot">중간 시제 일관성</span><br/>
          공통 강점: 깔끔한 도입, 자연스러운 어휘
        </span>
      </div>
      <Stack gap={6}>
        <span className="hand t-md">다음에 시도해볼 것</span>
        <Row gap={6}><span className="bdg t-xs">롤플레이</span><span className="bdg t-xs">집 콤보</span><span className="bdg t-xs">AL 도전</span></Row>
      </Stack>
      <Row gap={8} style={{ marginTop: 'auto' }}>
        <button className="btn full">이력 저장 ✓</button>
        <button className="btn primary full">홈으로</button>
      </Row>
    </div>
  </Phone>
);

const Step7_B = () => (
  <Phone>
    <ImmHeader step={7} title="요약" />
    <div className="p-4 stack flex-1" style={{ gap: 10 }}>
      <span className="hand t-2xl">오늘 기록</span>
      <Row gap={6}>
        <div className="card soft text-center" style={{ flex: 1, padding: 10 }}>
          <div className="hand t-xl">3</div>
          <div className="t-xs muted body">질문</div>
        </div>
        <div className="card soft text-center" style={{ flex: 1, padding: 10 }}>
          <div className="hand t-xl">12</div>
          <div className="t-xs muted body">답변</div>
        </div>
        <div className="card soft text-center" style={{ flex: 1, padding: 10 }}>
          <div className="hand t-xl">32분</div>
          <div className="t-xs muted body">학습</div>
        </div>
      </Row>
      <div className="card">
        <span className="hand t-md">멤버별 한 줄</span>
        <Stack gap={5} style={{ marginTop: 6 }}>
          {['Alice — 도입 깔끔, 시제 OK','Bob — 어휘 풍부, 속도 ↓','Carol — 구조 명확','Dan — 자신감, 발음 정리'].map((s, i) => (
            <Row key={i} gap={6} className="items-center"><span className="bdg t-xs">{['A','B','C','D'][i]}</span><span className="t-xs body">{s}</span></Row>
          ))}
        </Stack>
      </div>
      <Stack gap={4}>
        <span className="hand t-sm">기록 공유</span>
        <Row gap={6}><span className="bdg t-xs">📋 복사</span><span className="bdg t-xs">📧 이메일</span><span className="bdg t-xs">💾 다운로드</span></Row>
      </Stack>
      <button className="btn primary full lg" style={{ marginTop: 'auto' }}>완료</button>
    </div>
  </Phone>
);

const Step7_C = () => (
  <Phone>
    <ImmHeader step={7} title="종료" />
    <div className="stack flex-1 center p-4" style={{ background: 'var(--paper-2)', position: 'relative' }}>
      <span style={{ fontSize: 60 }}>🎉</span>
      <span className="hand t-2xl text-center" style={{ marginTop: 6 }}>오늘도 한 콤보<br/>마스터!</span>
      <div className="card lifted" style={{ marginTop: 14, width: '100%' }}>
        <span className="hand t-sm muted">강사 한마디</span>
        <span className="t-xs body" style={{ display: 'block', marginTop: 4, lineHeight: 1.55 }}>
          "오늘 다들 도입은 정말 좋았어요. 다음엔 <b>시제 일관성</b>만 한 번 더 챙기면 됩니다. 박수~ 👏"
        </span>
      </div>
      <Row gap={6} style={{ marginTop: 12, width: '100%' }}>
        <button className="btn full">이력 보기</button>
        <button className="btn primary full">새 세션</button>
      </Row>
      <button className="btn full" style={{ marginTop: 6, width: '100%' }}>나가기</button>
    </div>
  </Phone>
);

// ─────────── PC variants for the brand-core screens ───────────
const PCFrame = ({ children, title = '오픽 스터디 · 세션 #842' }) => (
  <div style={{ width: '100%', height: '100%', background: 'var(--paper)', border: '1.5px solid var(--line)', borderRadius: 6, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
    <div style={{ height: 28, background: 'var(--paper-2)', borderBottom: '1px solid var(--line-light)', display: 'flex', alignItems: 'center', padding: '0 10px', gap: 6, flexShrink: 0 }}>
      <span style={{ width: 8, height: 8, borderRadius: 4, background: '#e57373' }} />
      <span style={{ width: 8, height: 8, borderRadius: 4, background: '#fdd835' }} />
      <span style={{ width: 8, height: 8, borderRadius: 4, background: '#81c784' }} />
      <span className="t-xs muted body" style={{ marginLeft: 12 }}>{title}</span>
    </div>
    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>{children}</div>
  </div>
);

// PC 6-4 — full coaching card with answer transcript + audio
const PCStep64 = () => (
  <PCFrame>
    <ImmHeader step={6} title="Q1 · 코칭 · Alice" speaking={0} members={4} />
    <div className="row flex-1" style={{ minHeight: 0 }}>
      {/* Left: transcript */}
      <div style={{ flex: 1, padding: 16, borderRight: '1px solid var(--line-light)', overflow: 'auto' }}>
        <Stack gap={10}>
          <Row gap={8} className="items-center">
            <span className="sk-circle" style={{ width: 36, height: 36, fontSize: 14 }}>A</span>
            <Stack gap={2}><span className="hand t-md">Alice의 답변</span><span className="t-xs muted body">01:12 · 자동 전사</span></Stack>
            <button className="btn sm" style={{ marginLeft: 'auto' }}>▶ 재생</button>
          </Row>
          <Wave bars={50} h={22} />
          <span className="t-sm body" style={{ lineHeight: 1.7 }}>
            "I'm <span className="spot-g spot">really into hip-hop</span> these days. I started listening when I was in middle school, and now I <span className="spot">go to concerts</span> almost every weekend. The <span className="spot-acc spot">rhythm was</span> what got me hooked... uh, the rhythm <span className="spot-acc spot">is</span> what got me hooked."
          </span>
          <hr className="dashed" />
          <Stack gap={4}>
            <span className="hand t-sm muted">하이라이트 색상</span>
            <Row gap={6}><span className="bdg g t-xs">강점 표현</span><span className="bdg hi t-xs">개선 표현</span><span className="bdg acc t-xs">시제 흔들림</span></Row>
          </Stack>
        </Stack>
      </div>
      {/* Right: coaching */}
      <div style={{ width: 320, padding: 14, overflow: 'auto', background: 'var(--paper-2)' }}>
        <Stack gap={10}>
          <div className="card" style={{ borderColor: 'var(--accent)', padding: 12 }}>
            <Row gap={6} className="items-center" style={{ marginBottom: 6 }}>
              <span style={{ fontSize: 16 }}>🎓</span>
              <span className="hand t-md">AI 스터디 코치 한마디</span>
            </Row>
            <span className="t-xs body" style={{ lineHeight: 1.6 }}>{COACH_TEXT}</span>
          </div>
          <CoachLine kind="good" label="잘한 점" items={['자연스러운 도입 표현','풍부한 어휘 ("genre")','발음 또렷']} compact />
          <CoachLine kind="warn" label="다듬을 부분" items={['현재 → 과거 시제 일관성', "'rhythm' 한 번 더 또박또박"]} compact />
          <CoachLine kind="tip" label="다음 답변 팁" items={['"I usually..., and last month..." 패턴']} compact />
          <Row gap={6}>
            <button className="btn sm full">💾 저장</button>
            <button className="btn primary sm full">다음 발화자 →</button>
          </Row>
        </Stack>
      </div>
    </div>
  </PCFrame>
);

// PC 6-6 — 4 columns side by side
const PCStep66 = () => (
  <PCFrame title="오픽 스터디 · 함께 보기">
    <ImmHeader step={6} title="Q1 · 4명 동시 비교 · 토론 5분" />
    <div className="px-5 py-3 between" style={{ borderBottom: '1px solid var(--line-light)' }}>
      <span className="hand t-md">함께 짚어보는 시간</span>
      <Row gap={8}><span className="timer">04:23 / 05:00</span><button className="btn sm">⏸</button></Row>
    </div>
    <div className="row flex-1" style={{ minHeight: 0, overflow: 'auto' }}>
      {[
        { n: 'Alice', i: 'A', txt: '"도입 진짜 깔끔! 어휘도 풍부. 시제만 한 번 더..."', s: ['깔끔한 도입','풍부한 어휘','발음 또렷'], w: ['시제 일관성','rhythm 발음'] },
        { n: 'Bob', i: 'B', txt: '"표현 살아있어요! 근데 속도 살짝 빠른 느낌..."', s: ['생생한 어휘','자연스러운 도입'], w: ['속도','시제 일관성'] },
        { n: 'Carol', i: 'C', txt: '"구조가 정말 명확. 디테일 추가하면 완벽해요."', s: ['명확한 구조','자신감','자연스러운 흐름'], w: ['시제 일관성'] },
        { n: 'Dan', i: 'D', txt: '"자신감 굿! 발음 한 번 더 또박또박 갑시다."', s: ['자신감','전달력'], w: ['발음 또렷','시제 일관성','속도'] },
      ].map(({ n, i, txt, s, w }) => (
        <div key={n} style={{ flex: 1, padding: 14, borderRight: '1px solid var(--line-light)', display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
          <Row gap={8} className="items-center">
            <span className="sk-circle" style={{ width: 32, height: 32, fontSize: 12 }}>{i}</span>
            <Stack gap={1} className="grow"><span className="hand t-md">{n}</span><span className="t-xs muted body">01:0{i.charCodeAt(0) - 64 + 1}</span></Stack>
            <span className="bdg t-xs">▶</span>
          </Row>
          <div className="card tint" style={{ padding: 8 }}>
            <span className="t-xs body" style={{ lineHeight: 1.5 }}>{txt}</span>
          </div>
          <Stack gap={3}>
            <span className="hand t-xs muted">강점</span>
            {s.map((x, j) => <span key={j} className="bdg g t-xs" style={{ alignSelf: 'flex-start' }}>✓ {x}</span>)}
          </Stack>
          <Stack gap={3}>
            <span className="hand t-xs muted">다듬</span>
            {w.map((x, j) => (
              <span key={j} className="bdg t-xs" style={{
                alignSelf: 'flex-start',
                background: x.includes('시제') ? 'var(--accent-soft)' : 'var(--hilite)',
                borderColor: x.includes('시제') ? 'var(--accent)' : undefined,
              }}>⚠ {x}</span>
            ))}
          </Stack>
          <button className="btn sm" style={{ marginTop: 'auto' }}>전체 보기</button>
        </div>
      ))}
    </div>
    {/* Bottom synthesis */}
    <div style={{ padding: 12, background: 'var(--ink)', color: 'var(--paper)', display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ fontSize: 18 }}>📌</span>
      <Stack gap={2} className="grow">
        <span className="hand t-sm">공통 인사이트</span>
        <span className="t-xs body" style={{ lineHeight: 1.5 }}>4명 모두 <span style={{ background: 'var(--accent)', padding: '0 4px' }}>중간 시제 일관성</span>이 흔들림 — 같이 다듬어요!</span>
      </Stack>
      <button className="btn primary sm">다음 질문 →</button>
    </div>
  </PCFrame>
);

Object.assign(window, {
  Step61_A, Step61_B, Step61_C,
  Step62_A, Step62_B_self, Step62_C_other,
  Step63_A, Step63_B, Step63_C,
  Step64_A, Step64_B, Step64_C,
  Step66_A, Step66_B, Step66_C,
  Step7_A, Step7_B, Step7_C,
  PCFrame, PCStep64, PCStep66,
});
