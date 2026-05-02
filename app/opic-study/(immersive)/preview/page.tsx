"use client";

/**
 * 오픽 스터디 디자인 시안 미리보기
 *
 * 디자인 원본 (claude design)과 비교하며 충실도 확인용.
 * 실제 사용자에게 노출되는 페이지가 아닌 개발/디자인 검토 페이지.
 */

import { Step64Mobile, Step64Pc } from "../../_screens/Step64";
import { Step66Mobile, Step66Pc } from "../../_screens/Step66";
import { Step1, Step2, Step3, Step4, Step5 } from "../../_screens/SetupSteps";
import { Step61, Step62Self, Step62Other, Step63 } from "../../_screens/LoopSteps";
import { Home, Lobby, MyPage } from "../../_screens/EntryScreens";
import { Step7, EdgeMic, EdgeReconnect } from "../../_screens/Step7AndEdge";

// ============================================================
// 섹션 헤더
// ============================================================

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ padding: "32px 0" }}>
      <div style={{ padding: "0 32px", marginBottom: 16 }}>
        <h2
          style={{
            margin: 0,
            fontSize: 24,
            fontWeight: 700,
            color: "#1f1b16",
            letterSpacing: "-0.02em",
          }}
        >
          {title}
        </h2>
        {subtitle && (
          <p
            style={{
              margin: "4px 0 0",
              fontSize: 13,
              color: "#7a6f63",
              lineHeight: 1.5,
            }}
          >
            {subtitle}
          </p>
        )}
      </div>
      {children}
    </section>
  );
}

// ============================================================
// 아트보드 (디자인 캔버스 한 칸)
// ============================================================

function Artboard({
  label,
  width,
  height,
  children,
}: {
  label: string;
  width: number;
  height: number;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", flexShrink: 0 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: "#7a6f63",
          marginBottom: 8,
          paddingLeft: 4,
        }}
      >
        {label} · {width}×{height}
      </div>
      <div
        style={{
          width,
          height,
          background: "#ffffff",
          borderRadius: 16,
          overflow: "hidden",
          boxShadow:
            "0 2px 4px rgba(31,27,22,0.04), 0 12px 32px rgba(31,27,22,0.08), 0 0 0 1px rgba(31,27,22,0.10)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ============================================================
// 미리보기 페이지
// ============================================================

export default function PreviewPage() {
  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "#ede9e0",
        fontFamily:
          "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, system-ui, 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif",
        color: "#1f1b16",
      }}
    >
      {/* 페이지 헤더 */}
      <header
        style={{
          padding: "32px 32px 0",
          borderBottom: "1px solid rgba(31,27,22,0.10)",
          paddingBottom: 24,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: "#7a6f63",
            marginBottom: 8,
          }}
        >
          오픽 스터디 — 디자인 시안 미리보기
        </div>
        <h1
          style={{
            margin: 0,
            fontSize: 32,
            fontWeight: 700,
            letterSpacing: "-0.025em",
          }}
        >
          전체 화면 (Phase 2~5)
        </h1>
        <p
          style={{
            margin: "8px 0 0",
            fontSize: 14,
            color: "#4a4035",
            lineHeight: 1.55,
            maxWidth: 720,
          }}
        >
          BP 디렉션: Notion 골격 + Things 3 디테일 + 따뜻한 크림/테라코타.
          페르소나는 추상 심볼(◐)로 절제, 코칭은 잘한 점/다듬을 부분/팁 3블록.
          실제 데이터 연동 전 디자인 충실도 확인용 페이지.
        </p>
      </header>

      {/* 진입 화면 */}
      <Section
        title="진입 화면"
        subtitle="홈 → 입장 대기 → 마이페이지"
      >
        <div style={{ display: "flex", gap: 32, padding: "0 32px", overflowX: "auto" }}>
          <Artboard label="홈" width={360} height={760}>
            <Home />
          </Artboard>
          <Artboard label="입장 대기" width={360} height={760}>
            <Lobby />
          </Artboard>
          <Artboard label="마이페이지 · BP 누적" width={360} height={760}>
            <MyPage />
          </Artboard>
        </div>
      </Section>

      {/* 엣지케이스 */}
      <Section
        title="엣지케이스"
        subtitle="마이크 권한 / 멤버 이탈 · 재접속"
      >
        <div style={{ display: "flex", gap: 32, padding: "0 32px", overflowX: "auto" }}>
          <Artboard label="마이크 권한 거부" width={360} height={760}>
            <EdgeMic />
          </Artboard>
          <Artboard label="멤버 재접속 중" width={360} height={760}>
            <EdgeReconnect />
          </Artboard>
        </div>
      </Section>

      {/* Step 1 — 모드 선택 */}
      <Section
        title="Step 1 · 모드 선택"
        subtitle="첫 인상 · 무드 검증"
      >
        <div style={{ display: "flex", gap: 32, padding: "0 32px", overflowX: "auto" }}>
          <Artboard label="모바일" width={360} height={760}>
            <Step1 />
          </Artboard>
        </div>
      </Section>

      {/* Setup — Step 2~5 */}
      <Section
        title="세션 설정 · Step 2 ~ 5"
        subtitle="카테고리 → 주제 → 콤보 → 코치 가이드"
      >
        <div style={{ display: "flex", gap: 32, padding: "0 32px", overflowX: "auto" }}>
          <Artboard label="2 · 카테고리" width={360} height={760}>
            <Step2 />
          </Artboard>
          <Artboard label="3 · 주제" width={360} height={760}>
            <Step3 />
          </Artboard>
          <Artboard label="4 · 콤보" width={360} height={760}>
            <Step4 />
          </Artboard>
          <Artboard label="5 · 코치 가이드" width={360} height={760}>
            <Step5 />
          </Artboard>
        </div>
      </Section>

      {/* Loop — Step 6-1~6-3 */}
      <Section
        title="질문 루프 · Step 6-1 ~ 6-3"
        subtitle="콤보 안 한 질문의 흐름: 발화자 선정 → 답변 → 코칭 생성"
      >
        <div style={{ display: "flex", gap: 32, padding: "0 32px", overflowX: "auto" }}>
          <Artboard label="6-1 · 발화자 선정" width={360} height={760}>
            <Step61 />
          </Artboard>
          <Artboard label="6-2 · 본인 (답변)" width={360} height={760}>
            <Step62Self />
          </Artboard>
          <Artboard label="6-2 · 타인 (청취 + 메모)" width={360} height={760}>
            <Step62Other />
          </Artboard>
          <Artboard label="6-3 · 코칭 생성 중" width={360} height={760}>
            <Step63 />
          </Artboard>
        </div>
      </Section>

      {/* Step 6-4 */}
      <Section
        title="★ Step 6-4 · AI 코칭 카드"
        subtitle="자연어만 · 잘한 점 / 다듬을 부분 / 팁 3블록 · 점수 일체 비공개"
      >
        <div
          style={{
            display: "flex",
            gap: 32,
            padding: "0 32px",
            overflowX: "auto",
          }}
        >
          <Artboard label="모바일" width={360} height={760}>
            <Step64Mobile />
          </Artboard>
          <Artboard label="PC · 전사 + 코치 듀얼" width={1280} height={800}>
            <Step64Pc />
          </Artboard>
        </div>
      </Section>

      {/* Step 6-6 */}
      <Section
        title="★ Step 6-6 · 4명 동시 비교"
        subtitle="순위 X · BP(베스트 프랙티스) 공유 · '함께 배운다'"
      >
        <div
          style={{
            display: "flex",
            gap: 32,
            padding: "0 32px",
            overflowX: "auto",
          }}
        >
          <Artboard label="모바일 · 2×2 + 포커스 오버레이" width={360} height={760}>
            <Step66Mobile />
          </Artboard>
          <Artboard label="PC · 4컬럼" width={1280} height={800}>
            <Step66Pc />
          </Artboard>
        </div>
      </Section>

      {/* Step 7 */}
      <Section
        title="Step 7 · 종료 / 인사이트"
        subtitle="오늘의 BP 모음 + 다음 추천"
      >
        <div
          style={{
            display: "flex",
            gap: 32,
            padding: "0 32px 64px",
            overflowX: "auto",
          }}
        >
          <Artboard label="모바일 · 마무리" width={360} height={760}>
            <Step7 />
          </Artboard>
        </div>
      </Section>

      {/* 푸터 */}
      <footer
        style={{
          padding: "24px 32px 48px",
          borderTop: "1px solid rgba(31,27,22,0.10)",
          fontSize: 12,
          color: "#7a6f63",
          lineHeight: 1.6,
        }}
      >
        <div style={{ marginBottom: 4 }}>
          📐 디자인 원본: <code>docs/디자인/opic/project/오픽 스터디 하이파이.html</code>
        </div>
        <div style={{ marginBottom: 4 }}>
          🎨 디자인 시스템: <code>app/opic-study/_styles/opic-study.css</code> · <code>_components/bp.tsx</code>
        </div>
        <div>
          🧪 시안 데이터: <code>app/opic-study/_screens/_mock.ts</code> (실제 SA 데이터로 교체 예정)
        </div>
      </footer>
    </div>
  );
}
