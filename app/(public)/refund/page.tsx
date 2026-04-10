import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "환불 규정",
  description: "소리담 환불 규정 안내",
};

export default function RefundPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold">환불 규정</h1>
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
            이 규정은 소리담 운영자(이하 &quot;운영자&quot;)가 제공하는
            소리담 서비스의 크레딧 충전에 대한 환불 기준과 절차를
            규정합니다.
          </p>
        </section>

        {/* 제2조 */}
        <section>
          <h2 className="text-lg font-semibold text-foreground">
            제2조 (크레딧의 성격)
          </h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>
              크레딧은 소리담의 이용료가 아니라, AI 기능(모의고사, 스크립트 생성,
              튜터링 등) 사용 시 발생하는 외부 API 원가를 간편하게 처리하기
              위한 선불 충전 수단입니다.
            </li>
            <li>
              크레딧은 USD(미국 달러) 기준으로 운영되며, AI 기능 사용 시
              실제 발생한 비용만큼 자동으로 차감됩니다.
            </li>
            <li>
              크레딧 충전은 1회성이며, 자동 갱신(정기결제)되지 않습니다.
            </li>
            <li>
              충전된 크레딧은 유효기간 없이 사용 시까지 유지됩니다.
            </li>
          </ol>
        </section>

        {/* 제3조 */}
        <section>
          <h2 className="text-lg font-semibold text-foreground">
            제3조 (청약철회 및 환불)
          </h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>
              회원은 크레딧 충전일로부터 7일 이내에 청약철회를 요청할 수
              있습니다.
            </li>
            <li>
              청약철회 시 충전된 크레딧을 전혀 사용하지 않은 경우
              충전 금액 전액을 환불합니다.
            </li>
            <li>
              크레딧을 일부 사용한 경우 제4조에 따라 환불 금액을
              산정합니다.
            </li>
          </ol>
        </section>

        {/* 제4조 */}
        <section>
          <h2 className="text-lg font-semibold text-foreground">
            제4조 (환불 금액 산정)
          </h2>
          <div className="mt-2 overflow-x-auto rounded-[var(--radius-lg)] border border-border">
            <table className="w-full text-left">
              <thead className="bg-surface-secondary">
                <tr>
                  <th className="px-4 py-3 font-semibold text-foreground">
                    이용 상태
                  </th>
                  <th className="px-4 py-3 font-semibold text-foreground">
                    환불 기준
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="px-4 py-3">충전 후 7일 이내, 크레딧 미사용</td>
                  <td className="px-4 py-3">전액 환불</td>
                </tr>
                <tr>
                  <td className="px-4 py-3">충전 후 7일 이내, 크레딧 일부 사용</td>
                  <td className="px-4 py-3">
                    충전 금액 - 사용된 크레딧(실비용 기준)
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3">충전 후 7일 초과</td>
                  <td className="px-4 py-3">환불 불가 (잔여 크레딧은 계속 이용 가능)</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-foreground-muted">
            * 사용된 크레딧은 AI 기능 호출 시 실제 발생한 외부 API 비용(USD)
            기준으로 산정됩니다. 사용 크레딧이 충전 금액을 초과하는 경우
            환불 금액은 $0입니다.
          </p>
        </section>

        {/* 제5조 */}
        <section>
          <h2 className="text-lg font-semibold text-foreground">
            제5조 (크레딧 사용 시점)
          </h2>
          <p className="mt-2">
            크레딧은 AI 기능이 외부 API를 호출하는 시점에 자동 차감되며,
            다음의 경우 크레딧이 사용된 것으로 간주합니다.
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              스크립트: AI 스크립트 생성 또는 TTS 패키지 생성이 요청된 시점
            </li>
            <li>
              모의고사: 답변 음성의 STT 변환 및 AI 평가가 수행된 시점
            </li>
            <li>
              튜터링: AI 진단, 드릴 생성, 또는 평가가 수행된 시점
            </li>
          </ul>
          <p className="mt-2">
            AI 생성 콘텐츠는 그 성질상 제공 즉시 소비가 이루어지므로,
            이미 사용된 크레딧에 대한 청약철회가 제한될 수 있습니다.
          </p>
        </section>

        {/* 제6조 */}
        <section>
          <h2 className="text-lg font-semibold text-foreground">
            제6조 (환불이 불가능한 경우)
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>충전일로부터 7일이 초과한 경우</li>
            <li>충전된 크레딧을 전액 사용한 경우</li>
            <li>
              회원의 귀책사유로 서비스 이용이 불가능해진 경우 (계정 정지 등)
            </li>
            <li>
              이벤트, 프로모션, 베타 초대 등 무료로 지급된 크레딧
            </li>
          </ul>
        </section>

        {/* 제7조 */}
        <section>
          <h2 className="text-lg font-semibold text-foreground">
            제7조 (환불 절차)
          </h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>
              환불 요청은 이메일(soridamhub@gmail.com)로 접수합니다.
            </li>
            <li>
              접수 후 3영업일 이내에 환불 가능 여부를 안내합니다.
            </li>
            <li>
              환불 승인 후 5~7영업일 이내에 원래 결제 수단으로 환불 처리됩니다.
            </li>
          </ol>
        </section>

        {/* 제8조 */}
        <section>
          <h2 className="text-lg font-semibold text-foreground">
            제8조 (크레딧 유효기간)
          </h2>
          <p className="mt-2">
            충전된 크레딧은 유효기간 없이 사용 시까지 유지됩니다.
            회원 탈퇴 시 잔여 크레딧은 소멸되며, 탈퇴 전 환불 규정에
            따라 환불을 요청할 수 있습니다.
          </p>
        </section>

        {/* 제9조 */}
        <section>
          <h2 className="text-lg font-semibold text-foreground">
            제9조 (운영자 귀책사유에 의한 환불)
          </h2>
          <p className="mt-2">
            운영자의 귀책사유로 서비스를 정상적으로 제공하지 못하여
            크레딧이 부당하게 차감된 경우, 해당 금액만큼 크레딧을
            복원하거나 환불합니다.
          </p>
        </section>

        {/* 문의처 */}
        <section className="rounded-[var(--radius-lg)] border border-border bg-surface-secondary p-5">
          <p className="font-medium text-foreground">환불 문의</p>
          <p className="mt-2">이메일: soridamhub@gmail.com</p>
        </section>
      </div>
    </div>
  );
}
