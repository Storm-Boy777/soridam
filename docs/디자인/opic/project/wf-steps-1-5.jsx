// Session-room Step 1-5 wireframes (3 variations each)
// Mobile-first; PC variants where they meaningfully differ.

const S1_Stepper = ({ active = 1 }) => (
  <Row gap={4} className="items-center" style={{ padding: '8px 12px', borderBottom: '1px solid var(--line-light)' }}>
    <StepDots now={active} total={7} />
    <span className="hand t-sm muted" style={{ marginLeft: 'auto' }}>
      {['모드','카테고리','주제','콤보','가이드','질문 루프','종료'][active - 1]}
    </span>
  </Row>
);

// ─────────── STEP 1 — 모드 선택 ───────────
const Step1_A = () => (
  <Phone>
    <ImmHeader step={1} title="새 세션 · Step 1" mode="—" />
    <S1_Stepper active={1} />
    <div className="p-4 stack" style={{ gap: 16 }}>
      <Stack gap={4}>
        <span className="hand t-2xl">모드를 골라볼까요?</span>
        <span className="t-xs muted">중간에 바꿀 수 있어요 (헤더 토글)</span>
      </Stack>
      <Row gap={10}>
        <ModeCard icon="📡" title="온라인" desc="각자 디바이스 · 실시간 동기화" active />
        <ModeCard icon="👥" title="오프라인" desc="한 자리, 한 디바이스 교대" />
      </Row>
      <div className="card tint" style={{ padding: 10 }}>
        <div className="hand t-sm" style={{ marginBottom: 4 }}>오늘 멤버 (4)</div>
        <Row gap={6}>
          {['Alice','Bob','Carol','Dan'].map(n => <span key={n} className="bdg t-xs">{n}</span>)}
        </Row>
      </div>
      <button className="btn primary lg full">계속하기 →</button>
    </div>
  </Phone>
);

const Step1_B = () => (
  <Phone>
    <ImmHeader step={1} title="새 세션" mode="—" />
    <div className="p-5 stack flex-1" style={{ gap: 14 }}>
      <span className="hand t-3xl" style={{ lineHeight: 1.1 }}>오늘은<br/>어떻게 모였어요?</span>
      <Stack gap={8}>
        <div className="card" style={{ borderColor: 'var(--accent)', background: 'var(--accent-soft)', padding: 16 }}>
          <Row gap={10} className="items-center">
            <span style={{ fontSize: 24 }}>📡</span>
            <Stack gap={2} className="grow">
              <span className="hand t-lg">각자 다른 곳에서</span>
              <span className="t-xs muted">화면이 모두에게 실시간 동기화돼요</span>
            </Stack>
            <span className="bdg solid t-xs">선택됨</span>
          </Row>
        </div>
        <div className="card soft" style={{ padding: 16 }}>
          <Row gap={10} className="items-center">
            <span style={{ fontSize: 24 }}>👥</span>
            <Stack gap={2} className="grow">
              <span className="hand t-lg">한 자리에 함께</span>
              <span className="t-xs muted">한 기기로 발화자만 교대해서 녹음</span>
            </Stack>
          </Row>
        </div>
      </Stack>
      <span className="t-xs muted text-center" style={{ marginTop: 'auto' }}>· · · · · · · 1 / 7</span>
    </div>
    <div className="p-4" style={{ borderTop: '1px solid var(--line-light)' }}>
      <button className="btn primary full lg">시작 →</button>
    </div>
  </Phone>
);

const Step1_C = () => (
  <Phone>
    <ImmHeader step={1} title="모드" mode="—" />
    <div className="p-4 stack" style={{ gap: 12 }}>
      <Row className="between items-center">
        <span className="hand t-xl">모드</span>
        <StepDots now={1} total={7} />
      </Row>
      {/* Slider-style selector */}
      <div className="card tint" style={{ padding: 6, position: 'relative' }}>
        <Row gap={4}>
          <div className="card" style={{ flex: 1, padding: 10, background: 'var(--ink)', color: 'var(--paper)', textAlign: 'center', borderColor: 'var(--ink)' }}>
            <div className="hand t-md">📡 온라인</div>
          </div>
          <div style={{ flex: 1, padding: 10, textAlign: 'center' }}>
            <div className="hand t-md muted">👥 오프라인</div>
          </div>
        </Row>
      </div>
      <Stack gap={6}>
        <Row className="between"><span className="hand t-sm">실시간 동기화</span><span className="hand t-sm accent">✓ 켜짐</span></Row>
        <Row className="between"><span className="hand t-sm">개별 마이크</span><span className="hand t-sm accent">✓ 켜짐</span></Row>
        <Row className="between"><span className="hand t-sm">발화권 자동 양보</span><span className="hand t-sm muted">○ 꺼짐</span></Row>
      </Stack>
      <hr className="dashed" />
      <span className="hand t-sm muted">접속 멤버</span>
      <Row gap={6}>
        {['A','B','C','D'].map((c,i) => <span key={i} className="mb-dot live">{c}</span>)}
        <span className="t-xs muted body" style={{ alignSelf: 'center' }}>4명 모두 입장</span>
      </Row>
      <button className="btn acc full lg" style={{ marginTop: 8 }}>다음 단계로</button>
    </div>
  </Phone>
);

// ─────────── STEP 2 — 카테고리 선택 ───────────
const Step2_A = () => (
  <Phone>
    <ImmHeader step={2} title="Step 2 · 카테고리" />
    <S1_Stepper active={2} />
    <div className="p-4 stack" style={{ gap: 12 }}>
      <span className="hand t-xl">어떤 종류로 갈까요?</span>
      <Stack gap={10}>
        <div className="card" style={{ borderColor: 'var(--accent)', background: 'var(--accent-soft)' }}>
          <Row className="between items-center">
            <Stack gap={2}><span className="hand t-lg">일반</span><span className="t-xs muted">묘사 · 비교 · 과거경험</span></Stack>
            <span className="bdg solid">✓</span>
          </Row>
        </div>
        <div className="card soft">
          <Row className="between items-center">
            <Stack gap={2}><span className="hand t-lg">롤플레이</span><span className="t-xs muted">상황극 · 문제 해결</span></Stack>
            <span className="t-sm muted">→</span>
          </Row>
        </div>
        <div className="card soft">
          <Row className="between items-center">
            <Stack gap={2}><span className="hand t-lg">어드밴스</span><span className="t-xs muted">AL 도전 · 시사 · 추상</span></Stack>
            <span className="t-sm muted">→</span>
          </Row>
        </div>
      </Stack>
    </div>
  </Phone>
);

const Step2_B = () => (
  <Phone>
    <ImmHeader step={2} title="Step 2" />
    <div className="p-4 stack" style={{ gap: 14 }}>
      <Stack gap={2}>
        <span className="t-xs muted">2 / 7 · 카테고리</span>
        <span className="hand t-2xl">콤보 종류</span>
      </Stack>
      {/* Card-as-tab grid */}
      <div className="grid-4">
        <div className="card" style={{ padding: 14, borderColor: 'var(--accent)', background: 'var(--accent-soft)' }}>
          <div className="hand t-lg">일반</div>
          <div className="t-xs muted" style={{ marginTop: 4 }}>가장 자주 출제</div>
          <Row gap={4} style={{ marginTop: 8 }}>
            <span className="bdg t-xs">묘사</span><span className="bdg t-xs">비교</span>
          </Row>
        </div>
        <div className="card soft" style={{ padding: 14 }}>
          <div className="hand t-lg">롤플레이</div>
          <div className="t-xs muted" style={{ marginTop: 4 }}>상황 대응</div>
          <Row gap={4} style={{ marginTop: 8 }}>
            <span className="bdg t-xs">상황극</span>
          </Row>
        </div>
        <div className="card soft" style={{ padding: 14, gridColumn: 'span 2' }}>
          <Row className="between">
            <div className="hand t-lg">어드밴스</div>
            <span className="bdg acc t-xs">AL 도전</span>
          </Row>
          <div className="t-xs muted" style={{ marginTop: 4 }}>시사 · 추상 · 의견 비교</div>
        </div>
      </div>
      <hr className="dashed" />
      <Row gap={6} className="items-center">
        <span className="mb-dot speaking">A</span>
        <span className="t-xs muted body">Alice가 골랐어요</span>
      </Row>
    </div>
  </Phone>
);

const Step2_C = () => (
  <Phone>
    <ImmHeader step={2} title="Step 2" />
    <div className="p-4 stack" style={{ gap: 10 }}>
      <span className="hand t-xl">카테고리</span>
      <div className="tabs">
        <span className="on">일반</span>
        <span>롤플레이</span>
        <span>어드밴스</span>
      </div>
      <Stack gap={8} style={{ marginTop: 8 }}>
        <span className="t-xs muted">일반 콤보 — 가장 보편적인 답변 패턴 학습</span>
        <Row gap={6} style={{ flexWrap: 'wrap' }}>
          <span className="bdg hi">묘사</span>
          <span className="bdg hi">비교</span>
          <span className="bdg hi">과거경험</span>
          <span className="bdg">+ 22 토픽</span>
        </Row>
      </Stack>
      <div className="card tint" style={{ marginTop: 4 }}>
        <Row gap={8}>
          <span style={{ fontSize: 20 }}>🎓</span>
          <Stack gap={2}>
            <span className="hand t-sm">팁</span>
            <span className="t-xs muted body" style={{ lineHeight: 1.5 }}>일반 콤보가 시험 출제 80%! AL 노리려면 여기부터 단단하게.</span>
          </Stack>
        </Row>
      </div>
      <button className="btn primary full" style={{ marginTop: 'auto' }}>이걸로 갈게요 →</button>
    </div>
  </Phone>
);

// ─────────── STEP 3 — 주제 ───────────
const TopicRow = ({ name, count, pct, learned, active }) => (
  <Row className="between items-center" style={{
    padding: '10px 12px',
    border: `${active ? 1.8 : 1}px solid ${active ? 'var(--accent)' : 'var(--line-light)'}`,
    background: active ? 'var(--accent-soft)' : 'var(--paper)',
    borderRadius: 8,
  }}>
    <Stack gap={2}>
      <Row gap={6} className="items-center">
        <span className="hand t-md">{name}</span>
        {learned && <span className="bdg g t-xs">✓ 학습</span>}
      </Row>
      <span className="t-xs muted body">{count}콤보 · 출제 {pct}%</span>
    </Stack>
    <Stack gap={2} style={{ alignItems: 'end' }}>
      <span className="hand accent t-md">{pct}%</span>
      <div style={{ width: 50, height: 4, background: 'var(--paper-2)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: 'var(--accent)' }} />
      </div>
    </Stack>
  </Row>
);

const Step3_A = () => (
  <Phone>
    <ImmHeader step={3} title="Step 3 · 주제" />
    <S1_Stepper active={3} />
    <div className="p-4 stack" style={{ gap: 10 }}>
      <Row className="between items-center">
        <span className="hand t-xl">주제 (빈도순)</span>
        <span className="bdg t-xs">필터</span>
      </Row>
      <Stack gap={6}>
        <TopicRow name="음악" count={19} pct={62} active />
        <TopicRow name="집" count={16} pct={54} learned />
        <TopicRow name="영화" count={14} pct={48} />
        <TopicRow name="여행" count={12} pct={41} />
        <TopicRow name="요리" count={9} pct={32} learned />
      </Stack>
    </div>
  </Phone>
);

const Step3_B = () => (
  <Phone>
    <ImmHeader step={3} title="Step 3" />
    <div className="p-4 stack" style={{ gap: 10 }}>
      <Stack gap={2}>
        <span className="t-xs muted">3 / 7</span>
        <span className="hand t-2xl">주제를 픽!</span>
      </Stack>
      {/* Cloud-style: bigger = more frequent */}
      <div className="card tint" style={{ padding: 16, minHeight: 220, position: 'relative' }}>
        <span className="hand spot-acc spot" style={{ position: 'absolute', top: 30, left: 20, fontSize: 28 }}>음악</span>
        <span className="hand spot" style={{ position: 'absolute', top: 24, right: 24, fontSize: 22 }}>집</span>
        <span className="hand" style={{ position: 'absolute', top: 80, left: 60, fontSize: 18 }}>영화</span>
        <span className="hand" style={{ position: 'absolute', top: 110, right: 30, fontSize: 16 }}>여행</span>
        <span className="hand" style={{ position: 'absolute', bottom: 50, left: 30, fontSize: 16, opacity: 0.6 }}>요리 ✓</span>
        <span className="hand muted" style={{ position: 'absolute', bottom: 30, right: 50, fontSize: 14 }}>스포츠</span>
        <span className="hand muted" style={{ position: 'absolute', bottom: 70, left: 130, fontSize: 13 }}>가족</span>
        <span className="hand muted" style={{ position: 'absolute', top: 60, left: 160, fontSize: 13 }}>날씨</span>
      </div>
      <Row className="between" style={{ padding: '0 4px' }}>
        <span className="t-xs muted">크게 = 자주 출제</span>
        <span className="t-xs muted">✓ = 이미 학습</span>
      </Row>
      <div className="card" style={{ borderColor: 'var(--accent)', background: 'var(--accent-soft)' }}>
        <Row className="between items-center">
          <Stack gap={2}>
            <span className="hand t-md">음악 선택됨</span>
            <span className="t-xs muted">19콤보 · 62% 출제</span>
          </Stack>
          <button className="btn acc sm">콤보 보기</button>
        </Row>
      </div>
    </div>
  </Phone>
);

const Step3_C = () => (
  <Phone>
    <ImmHeader step={3} title="주제" />
    <div className="px-4 py-3 stack" style={{ gap: 8 }}>
      <Row gap={6} className="items-center">
        <input className="sk-box" placeholder="🔍 주제 검색" style={{
          flex: 1, fontFamily: 'var(--font-hand)', fontSize: 14, padding: '6px 10px', border: '1.5px solid var(--line)', borderRadius: 6, background: 'var(--paper)'
        }} />
        <span className="bdg solid t-xs">정렬: 빈도</span>
      </Row>
      <Row gap={4} style={{ flexWrap: 'wrap' }}>
        <span className="bdg hi t-xs">전체</span>
        <span className="bdg t-xs">미학습만</span>
        <span className="bdg t-xs">★북마크</span>
      </Row>
    </div>
    <div style={{ flex: 1, overflow: 'hidden', padding: '0 16px' }} className="stack fadebot">
      <Stack gap={6}>
        {[
          ['음악',19,62,false], ['집',16,54,true], ['영화',14,48,false],
          ['여행',12,41,false], ['요리',9,32,true], ['스포츠',8,29,false],
          ['가족',7,25,false],
        ].map(([n,c,p,l]) => <TopicRow key={n} name={n} count={c} pct={p} learned={l} active={n==='음악'} />)}
      </Stack>
    </div>
  </Phone>
);

// ─────────── STEP 4 — 콤보 선택 ───────────
const ComboCard = ({ pct, qs, learned, active }) => (
  <div className="card" style={{
    borderColor: active ? 'var(--accent)' : undefined,
    background: active ? 'var(--accent-soft)' : undefined,
    padding: 12,
  }}>
    <Row className="between items-center" style={{ marginBottom: 6 }}>
      <Row gap={6} className="items-center">
        <span className="hand t-md">콤보 {pct >= 50 ? 'A' : pct >= 30 ? 'B' : 'C'}</span>
        <span className="bdg acc t-xs">{pct}% 출제</span>
      </Row>
      {active && <span className="bdg solid t-xs">선택</span>}
    </Row>
    <Stack gap={4}>
      {qs.map((q, i) => (
        <Row key={i} gap={6} className="items-start">
          <span className="t-xs body" style={{ fontWeight: 700, color: 'var(--ink-3)', minWidth: 16 }}>Q{i+1}</span>
          <Stack gap={2} className="grow">
            <span className="t-xs body" style={{ lineHeight: 1.4, color: 'var(--ink-2)' }}>{q.txt}</span>
            <Row gap={4} className="items-center">
              <span className="bdg t-xs" style={{ padding: '0 6px' }}>{q.tag}</span>
              {q.learned && <span className="bdg g t-xs" style={{ padding: '0 6px' }}>✓ 학습</span>}
              <span className="t-xs muted body">· {q.pct}%</span>
            </Row>
          </Stack>
        </Row>
      ))}
    </Stack>
  </div>
);

const COMBO_A = {
  pct: 53,
  qs: [
    { tag: '묘사', pct: 89, txt: 'What kind of music do you listen to? Who are your favorite musicians?' },
    { tag: '비교', pct: 71, txt: "When did you first become interested in music? How has it developed?", learned: true },
    { tag: '과거경험', pct: 64, txt: 'Describe a particularly memorable time you heard live music.' },
  ],
};
const COMBO_B = { pct: 27, qs: [
  { tag: '묘사', pct: 62, txt: 'Tell me about your favorite music genre and why.' },
  { tag: '비교', pct: 51, txt: 'Compare music you listened to as a kid vs now.' },
  { tag: '과거경험', pct: 44, txt: 'A time when music helped you through tough moments.' },
]};

const Step4_A = () => (
  <Phone>
    <ImmHeader step={4} title="Step 4 · 콤보" />
    <S1_Stepper active={4} />
    <div className="p-4 stack" style={{ gap: 10, overflow: 'auto' }}>
      <Row className="between">
        <span className="hand t-xl">음악 콤보</span>
        <span className="t-xs muted body">19개 · 빈도순</span>
      </Row>
      <ComboCard {...COMBO_A} active />
      <ComboCard {...COMBO_B} />
      <button className="btn primary full">이 콤보로 학습 시작</button>
    </div>
  </Phone>
);

const Step4_B = () => (
  <Phone>
    <ImmHeader step={4} title="콤보" />
    <div className="px-4 py-3 stack" style={{ gap: 8 }}>
      <Row className="between items-center">
        <Stack gap={2}>
          <span className="t-xs muted">음악 · 19개 콤보</span>
          <span className="hand t-lg">자주 출제 → 적게</span>
        </Stack>
        <span className="bdg t-xs">필터 ▾</span>
      </Row>
      {/* Frequency bar visual */}
      <div className="card tint" style={{ padding: 10 }}>
        <div className="hand t-xs muted" style={{ marginBottom: 6 }}>출제 빈도 분포</div>
        <Row gap={3} style={{ alignItems: 'end', height: 36 }}>
          {[53, 27, 18, 12, 8, 6, 5, 4, 3, 3, 2, 2, 2, 1, 1, 1, 1, 1, 1].map((h, i) => (
            <i key={i} style={{ flex: 1, height: `${h * 1.4}%`, minHeight: 3, background: i === 0 ? 'var(--accent)' : i === 1 ? 'var(--accent-soft)' : 'var(--ink-4)' }} />
          ))}
        </Row>
      </div>
    </div>
    <div style={{ flex: 1, overflow: 'auto', padding: '0 16px 12px' }} className="stack fadebot">
      <Stack gap={8}>
        <ComboCard {...COMBO_A} active />
        <ComboCard {...COMBO_B} />
      </Stack>
    </div>
  </Phone>
);

const Step4_C = () => (
  <Phone>
    <ImmHeader step={4} title="콤보" />
    <div className="p-4 stack" style={{ gap: 10 }}>
      <span className="hand t-xl">음악 일반 콤보 A</span>
      <div className="card" style={{ borderColor: 'var(--accent)', background: 'var(--accent-soft)' }}>
        <Row gap={10} className="items-center">
          <Stack gap={2} className="grow">
            <span className="hand t-md">출제율 53%</span>
            <span className="t-xs muted body">이번 달 가장 많이 나오는 패턴</span>
          </Stack>
          <span style={{ fontSize: 28 }}>🔥</span>
        </Row>
      </div>
      <span className="hand t-md muted">3개 질문</span>
      <Stack gap={6}>
        {COMBO_A.qs.map((q, i) => (
          <div key={i} className="card soft" style={{ padding: 10 }}>
            <Row gap={6} className="items-center" style={{ marginBottom: 4 }}>
              <span className="bdg solid t-xs">Q{i+1}</span>
              <span className="bdg t-xs">{q.tag}</span>
              <span className="t-xs muted body" style={{ marginLeft: 'auto' }}>등장률 {q.pct}%</span>
              {q.learned && <span className="bdg g t-xs">✓</span>}
            </Row>
            <span className="t-xs body" style={{ color: 'var(--ink-2)', lineHeight: 1.4 }}>{q.txt}</span>
          </div>
        ))}
      </Stack>
      <Row gap={8}>
        <button className="btn full">다른 콤보</button>
        <button className="btn primary full">시작 →</button>
      </Row>
    </div>
  </Phone>
);

// ─────────── STEP 5 — AI 스터디 코치 가이드 ───────────
const Step5_A = () => (
  <Phone>
    <ImmHeader step={5} title="Step 5 · 가이드" />
    <S1_Stepper active={5} />
    <div className="p-4 stack" style={{ gap: 12 }}>
      <Row gap={10} className="items-center">
        <span className="sk-circle" style={{ width: 56, height: 56, fontSize: 24, background: 'var(--accent-soft)', borderColor: 'var(--accent)' }}>👨‍🏫</span>
        <Stack gap={2}>
          <span className="hand t-lg">AI 스터디 코치</span>
          <span className="t-xs muted">오늘의 학습 인트로</span>
        </Stack>
      </Row>
      <div className="card" style={{ background: 'var(--paper-2)', borderRadius: 12, position: 'relative' }}>
        <span className="t-md print" style={{ lineHeight: 1.6 }}>
          오늘 <span className="spot-acc spot">음악 콤보 AL</span>로 잡고 갈게요. 이 콤보, 음악이 일반 자리에 나올 때 <span className="spot">53% 확률</span>로 등장하는 정형화된 패턴이에요.
          <br/><br/>
          핵심은 <span className="hand">"추상적 묘사 → 구체적 비교 → 임팩트 있는 경험"</span> 으로 자연스럽게 흐르는 거예요.
          <br/><br/>
          자, 멤버들끼리 답변 끝나면 서로 짚어주세요. 시작합시다!
        </span>
      </div>
      <Row gap={8}>
        <button className="btn full">🔊 다시 듣기</button>
        <button className="btn primary full">시작 →</button>
      </Row>
    </div>
  </Phone>
);

const Step5_B = () => (
  <Phone>
    <ImmHeader step={5} title="가이드" />
    <div className="stack flex-1" style={{ background: 'var(--paper-2)', position: 'relative' }}>
      <div style={{
        position: 'absolute', top: 30, left: '50%', transform: 'translateX(-50%)',
        width: 140, height: 140, borderRadius: '50%',
        border: '2px solid var(--accent)', background: 'var(--accent-soft)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 56,
      }}>👨‍🏫</div>
      <Wave bars={32} live h={20} style={{ position: 'absolute', top: 195, left: 0, right: 0, justifyContent: 'center' }} />
      <div style={{ position: 'absolute', top: 230, left: 16, right: 16 }}>
        <div className="card" style={{ background: 'var(--paper)', padding: 14 }}>
          <span className="t-sm body" style={{ lineHeight: 1.6, color: 'var(--ink-2)' }}>
            "오늘 <b>음악 콤보 AL</b>로 잡고 갈게요. 53% 확률로 나오는 정형 패턴이에요. 추상 → 비교 → 경험으로 흐르는 게 핵심이에요!"
          </span>
        </div>
      </div>
      <div style={{ position: 'absolute', bottom: 20, left: 16, right: 16 }} className="row gap-2">
        <button className="btn full"><span style={{ fontSize: 14 }}>⏸</span> 일시정지</button>
        <button className="btn primary full">시작</button>
      </div>
    </div>
  </Phone>
);

const Step5_C = () => (
  <Phone>
    <ImmHeader step={5} title="강사 한마디" />
    <div className="p-4 stack" style={{ gap: 10 }}>
      <Row gap={8} className="items-center">
        <span className="sk-circle" style={{ width: 36, height: 36, background: 'var(--accent-soft)', borderColor: 'var(--accent)' }}>🎓</span>
        <Stack gap={2}>
          <span className="hand t-md">AI 스터디 코치</span>
          <span className="t-xs muted">25초 듣기</span>
        </Stack>
        <button className="btn sm" style={{ marginLeft: 'auto' }}>▶ 재생</button>
      </Row>
      {/* Beat structure */}
      <Stack gap={6}>
        <div className="card soft">
          <Row className="between"><span className="hand t-sm">1. 오늘의 콤보</span><span className="bdg hi t-xs">음악 · AL</span></Row>
        </div>
        <div className="card soft">
          <Row className="between"><span className="hand t-sm">2. 출제 빈도</span><span className="bdg acc t-xs">53%</span></Row>
        </div>
        <div className="card soft">
          <Row className="between" style={{ marginBottom: 6 }}><span className="hand t-sm">3. 핵심 흐름</span></Row>
          <Row gap={4}>
            <span className="bdg t-xs">묘사</span>
            <span className="t-xs muted">→</span>
            <span className="bdg t-xs">비교</span>
            <span className="t-xs muted">→</span>
            <span className="bdg t-xs">경험</span>
          </Row>
        </div>
        <div className="card soft">
          <span className="hand t-sm">4. 시작!</span>
        </div>
      </Stack>
      <button className="btn acc full lg" style={{ marginTop: 'auto' }}>학습 시작</button>
    </div>
  </Phone>
);

Object.assign(window, {
  Step1_A, Step1_B, Step1_C,
  Step2_A, Step2_B, Step2_C,
  Step3_A, Step3_B, Step3_C,
  Step4_A, Step4_B, Step4_C,
  Step5_A, Step5_B, Step5_C,
});
