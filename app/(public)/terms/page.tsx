import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "이용약관",
  description: "소리담 서비스 이용약관",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold">이용약관</h1>
      <p className="mt-2 text-sm text-foreground-muted">
        시행일: 2026년 2월 18일 | 개정일: 2026년 4월 10일
      </p>

      <div className="mt-10 space-y-10 text-sm leading-relaxed text-foreground-secondary">
        {/* 제1조 */}
        <section>
          <h2 className="text-lg font-semibold text-foreground">
            제1조 (목적)
          </h2>
          <p className="mt-2">
            이 약관은 소리담 운영자(이하 &quot;운영자&quot;)가 제공하는
            소리담 서비스(이하 &quot;서비스&quot;)의 이용 조건 및
            절차, 운영자와 회원 간의 권리·의무 및 책임사항을 규정함을 목적으로
            합니다.
          </p>
        </section>

        {/* 제2조 */}
        <section>
          <h2 className="text-lg font-semibold text-foreground">
            제2조 (정의)
          </h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>
              &quot;서비스&quot;란 운영자가 제공하는 AI 기반 OPIc 영어 말하기
              학습 플랫폼을 의미합니다.
            </li>
            <li>
              &quot;회원&quot;이란 운영자와 이용계약을 체결하고 서비스를 이용하는
              자를 의미합니다.
            </li>
            <li>
              &quot;크레딧&quot;이란 서비스 내 AI 기능(모의고사, 스크립트 생성,
              튜터링 등) 이용 시 발생하는 외부 API 비용을 처리하기 위한
              선불 충전 수단을 의미합니다. 크레딧은 USD(미국 달러) 기준으로
              운영됩니다.
            </li>
            <li>
              &quot;크레딧 충전&quot;이란 회원이 결제를 통해 크레딧 잔액을
              증가시키는 행위를 의미합니다. 크레딧은 AI 기능 사용 시
              실제 발생한 비용만큼 자동으로 차감됩니다.
            </li>
          </ol>
        </section>

        {/* 제3조 */}
        <section>
          <h2 className="text-lg font-semibold text-foreground">
            제3조 (약관의 효력 및 변경)
          </h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>
              이 약관은 서비스 화면에 게시하거나 기타의 방법으로 회원에게
              공지함으로써 효력이 발생합니다.
            </li>
            <li>
              운영자는 관련 법령을 위배하지 않는 범위에서 약관을 변경할 수 있으며,
              변경 시 적용일자 7일 전부터 공지합니다.
            </li>
            <li>
              변경된 약관에 동의하지 않는 회원은 서비스 이용을 중단하고
              탈퇴할 수 있습니다.
            </li>
          </ol>
        </section>

        {/* 제4조 */}
        <section>
          <h2 className="text-lg font-semibold text-foreground">
            제4조 (이용계약의 체결)
          </h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>
              이용계약은 회원이 약관에 동의하고 회원가입을 신청한 후 운영자가
              이를 승낙함으로써 체결됩니다.
            </li>
            <li>
              운영자는 다음 각 호에 해당하는 경우 가입을 거절할 수 있습니다.
              <ul className="mt-1 list-disc space-y-0.5 pl-5">
                <li>타인의 정보를 이용한 경우</li>
                <li>허위 정보를 기재한 경우</li>
                <li>기타 운영자가 정한 가입 요건을 충족하지 못한 경우</li>
              </ul>
            </li>
          </ol>
        </section>

        {/* 제5조 */}
        <section>
          <h2 className="text-lg font-semibold text-foreground">
            제5조 (서비스의 제공 및 변경)
          </h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>
              운영자는 다음과 같은 서비스를 제공합니다.
              <ul className="mt-1 list-disc space-y-0.5 pl-5">
                <li>시험후기: OPIc 기출 빈도 분석 및 후기 공유</li>
                <li>스크립트: AI 맞춤 스크립트 생성 및 원어민 음성 변환</li>
                <li>모의고사: 기출 기반 실전 모의고사 및 AI 평가 리포트</li>
                <li>튜터링: AI 약점 진단 및 맞춤 드릴 훈련</li>
                <li>쉐도잉: 원어민 발음 따라읽기 훈련</li>
              </ul>
            </li>
            <li>
              운영자는 서비스의 내용을 변경할 수 있으며, 변경 시 사전에
              공지합니다.
            </li>
          </ol>
        </section>

        {/* 제6조 */}
        <section>
          <h2 className="text-lg font-semibold text-foreground">
            제6조 (크레딧 충전 및 이용)
          </h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>
              서비스의 AI 기능은 크레딧을 충전하여 이용합니다. 크레딧은
              소리담의 이용료가 아니라, AI 기능 사용 시 발생하는 외부 API
              원가를 간편하게 처리하기 위한 수단입니다.
            </li>
            <li>
              크레딧은 AI 기능 사용 시 실제 발생한 비용(USD 기준)만큼
              자동으로 차감됩니다.
            </li>
            <li>
              크레딧 충전은 1회성이며, 자동 갱신(정기결제)되지 않습니다.
            </li>
            <li>
              충전된 크레딧은 유효기간 없이 사용 시까지 유지됩니다.
            </li>
            <li>
              결제 대행은 Creem을 통해 처리되며, 충전 금액 및 결제 방법은
              서비스 내 AI 스토어 페이지에 게시된 바에 따릅니다.
            </li>
          </ol>
        </section>

        {/* 제7조 */}
        <section>
          <h2 className="text-lg font-semibold text-foreground">
            제7조 (회원의 의무)
          </h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>
              회원은 관계 법령, 이 약관의 규정, 이용안내 및 서비스상에 공지한
              주의사항을 준수하여야 합니다.
            </li>
            <li>
              회원은 다음 행위를 하여서는 안 됩니다.
              <ul className="mt-1 list-disc space-y-0.5 pl-5">
                <li>타인의 정보 도용</li>
                <li>서비스 운영을 방해하는 행위</li>
                <li>
                  서비스를 이용하여 얻은 정보(AI 생성 콘텐츠 포함)를
                  무단 복제·배포·상업적 이용하는 행위
                </li>
                <li>운영자의 지적재산권을 침해하는 행위</li>
                <li>
                  자동화 수단(봇, 스크래퍼 등)을 이용하여 서비스에
                  접근하는 행위
                </li>
              </ul>
            </li>
          </ol>
        </section>

        {/* 제8조 */}
        <section>
          <h2 className="text-lg font-semibold text-foreground">
            제8조 (운영자의 의무)
          </h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>
              운영자는 관련 법령과 이 약관이 금지하는 행위를 하지 않으며,
              지속적이고 안정적으로 서비스를 제공하기 위해 노력합니다.
            </li>
            <li>
              운영자는 회원의 개인정보 보호를 위해 보안 시스템을 갖추며
              개인정보처리방침을 공시하고 준수합니다.
            </li>
          </ol>
        </section>

        {/* 제9조 */}
        <section>
          <h2 className="text-lg font-semibold text-foreground">
            제9조 (계약 해지 및 이용 제한)
          </h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>
              회원은 언제든지 서비스 내 설정을 통해 이용계약 해지를 신청할 수
              있으며, 운영자는 즉시 처리합니다.
            </li>
            <li>
              운영자는 회원이 본 약관을 위반한 경우 서비스 이용을 제한하거나
              이용계약을 해지할 수 있습니다.
            </li>
          </ol>
        </section>

        {/* 제10조 */}
        <section>
          <h2 className="text-lg font-semibold text-foreground">
            제10조 (면책조항)
          </h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>
              운영자는 천재지변, 전쟁 등 불가항력으로 인하여 서비스를 제공할 수
              없는 경우 책임이 면제됩니다.
            </li>
            <li>
              운영자는 회원의 귀책사유로 인한 서비스 이용 장애에 대하여 책임을
              지지 않습니다.
            </li>
            <li>
              AI가 생성한 스크립트, 평가 리포트, 튜터링 피드백 등은
              학습 참고용이며, 실제 OPIc 시험 결과를 보장하지 않습니다.
              운영자는 AI 생성 콘텐츠의 정확성이나 완전성에 대해 보증하지
              않습니다.
            </li>
          </ol>
        </section>

        {/* 제11조 */}
        <section>
          <h2 className="text-lg font-semibold text-foreground">
            제11조 (환불)
          </h2>
          <p className="mt-2">
            크레딧 충전에 대한 환불 사항은 별도의 환불 규정에 따릅니다.
          </p>
        </section>

        {/* 제12조 */}
        <section>
          <h2 className="text-lg font-semibold text-foreground">
            제12조 (분쟁 해결)
          </h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>
              서비스 이용과 관련하여 운영자와 회원 간에 분쟁이 발생한 경우,
              쌍방은 원만한 해결을 위해 성실히 협의합니다.
            </li>
            <li>
              협의가 이루어지지 않는 경우 관련 법령에 따른 분쟁 해결 절차를
              따릅니다.
            </li>
          </ol>
        </section>

        {/* 부칙 */}
        <section>
          <h2 className="text-lg font-semibold text-foreground">부칙</h2>
          <p className="mt-2">
            이 약관은 2026년 2월 18일부터 시행하며, 2026년 4월 10일 개정된
            내용은 같은 날부터 적용됩니다.
          </p>
        </section>

        {/* 문의처 */}
        <section className="rounded-[var(--radius-lg)] border border-border bg-surface-secondary p-5">
          <p className="font-medium text-foreground">문의처</p>
          <p className="mt-2">이메일: soridamhub@gmail.com</p>
        </section>
      </div>
    </div>
  );
}
