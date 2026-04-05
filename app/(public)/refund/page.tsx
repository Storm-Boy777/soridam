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
        시행일: 2026년 2월 18일 | 개정일: 2026년 3월 31일
      </p>

      <div className="mt-10 space-y-10 text-sm leading-relaxed text-foreground-secondary">
        {/* 제1조 */}
        <section>
          <h2 className="text-lg font-semibold text-foreground">
            제1조 (목적)
          </h2>
          <p className="mt-2">
            이 규정은 스투스 OPIc(이하 &quot;회사&quot;)이 제공하는
            소리담(HaruOPIc) 유료서비스에 대한 환불 기준과 절차를
            규정합니다.
            전자상거래 등에서의 소비자보호에 관한 법률 및
            콘텐츠이용자보호지침에 따릅니다.
          </p>
        </section>

        {/* 제2조 */}
        <section>
          <h2 className="text-lg font-semibold text-foreground">
            제2조 (유료서비스의 유형)
          </h2>
          <p className="mt-2">
            회사가 제공하는 유료서비스는 다음과 같이 구분됩니다.
          </p>
          <ol className="mt-2 list-decimal space-y-2 pl-5">
            <li>
              <span className="font-medium text-foreground">
                기간제 이용권(플랜)
              </span>
              : 일정 기간 동안 서비스를 이용할 수 있는 이용권으로, 모의고사 응시권·스크립트 생성권·튜터링 훈련권이 포함됩니다. 자동 갱신되지 않으며 기간 만료 시 자동 종료됩니다.
            </li>
            <li>
              <span className="font-medium text-foreground">횟수권</span>
              : 특정 기능(모의고사, 스크립트, 튜터링)을 정해진 횟수만큼 이용할 수 있는 이용권으로, 유효기간 없이 사용 시까지 유지됩니다.
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
              회원은 유료서비스 결제일로부터 7일 이내에 청약철회를 요청할 수
              있습니다.
            </li>
            <li>
              청약철회 시 서비스(이용권)를 이용하지 않은 경우 결제 금액 전액을
              환불합니다.
            </li>
            <li>
              서비스(이용권)를 일부 이용한 경우 제4조에 따라 환불 금액을
              산정합니다.
            </li>
          </ol>
        </section>

        {/* 제4조 */}
        <section>
          <h2 className="text-lg font-semibold text-foreground">
            제4조 (환불 금액 산정)
          </h2>

          <div className="mt-4 space-y-4">
            {/* 플랜 환불 */}
            <div>
              <p className="font-medium text-foreground">
                1. 기간제 이용권(플랜)
              </p>
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
                      <td className="px-4 py-3">결제 후 7일 이내, 이용권 미사용</td>
                      <td className="px-4 py-3">전액 환불</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3">결제 후 7일 이내, 이용권 일부 사용</td>
                      <td className="px-4 py-3">
                        결제금액 - (사용 이용권 x 개별 정가)*
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3">결제 후 7일 초과</td>
                      <td className="px-4 py-3">환불 불가 (잔여기간 서비스 이용)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-foreground-muted">
                * 개별 정가: 모의고사 7,900원/회, 스크립트 780원/회(5회 3,900원 기준), 튜터링 5,900원/회.
                사용 이용권 차감액이 결제금액을 초과하는 경우 환불금액은 0원입니다.
              </p>
            </div>

            {/* 횟수권 환불 */}
            <div>
              <p className="font-medium text-foreground">2. 횟수권</p>
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
                      <td className="px-4 py-3">결제 후 7일 이내, 이용권 미사용</td>
                      <td className="px-4 py-3">전액 환불</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3">이용권 1회라도 사용</td>
                      <td className="px-4 py-3">환불 불가</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3">결제 후 7일 초과, 이용권 미사용</td>
                      <td className="px-4 py-3">환불 불가</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* 제5조 */}
        <section>
          <h2 className="text-lg font-semibold text-foreground">
            제5조 (디지털 콘텐츠의 이용 간주)
          </h2>
          <p className="mt-2">
            본 서비스는 AI가 생성하는 디지털 콘텐츠(스크립트, 평가 리포트,
            튜터링 피드백 등)를 제공합니다. 다음의 경우 해당 이용권은
            사용된 것으로 간주합니다.
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              스크립트 생성권: AI 스크립트 생성이 요청된 시점
            </li>
            <li>
              모의고사 응시권: 모의고사 세션이 시작된 시점
            </li>
            <li>
              튜터링 훈련권: 튜터링 진단이 요청된 시점
            </li>
          </ul>
          <p className="mt-2">
            디지털 콘텐츠는 그 성질상 제공 즉시 소비가 이루어지므로,
            콘텐츠이용자보호지침에 따라 사용된 이용권에 대한 청약철회가
            제한될 수 있습니다.
          </p>
        </section>

        {/* 제6조 */}
        <section>
          <h2 className="text-lg font-semibold text-foreground">
            제6조 (환불이 불가능한 경우)
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>결제일로부터 7일이 초과한 경우</li>
            <li>
              횟수권을 1회라도 사용한 경우
            </li>
            <li>
              회원의 귀책사유로 서비스 이용이 불가능해진 경우 (계정 정지 등)
            </li>
            <li>
              이벤트, 프로모션 등 무료로 제공된 이용권 및 서비스
            </li>
            <li>
              후기 제출 보상으로 지급된 무료 이용권
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
            <li>
              카드 결제의 경우 카드사 사정에 따라 추가 시간이 소요될 수
              있습니다.
            </li>
          </ol>
        </section>

        {/* 제8조 */}
        <section>
          <h2 className="text-lg font-semibold text-foreground">
            제8조 (이용권 만료)
          </h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>
              기간제 이용권(플랜)은 유효기간 만료 시 자동 종료되며,
              자동 갱신(정기결제)되지 않습니다.
            </li>
            <li>
              플랜 만료 시 잔여 플랜 이용권은 소멸되며, 별도 구매한 횟수권은
              유지됩니다.
            </li>
            <li>
              플랜 재구매는 언제든지 가능합니다.
            </li>
          </ol>
        </section>

        {/* 제9조 */}
        <section>
          <h2 className="text-lg font-semibold text-foreground">
            제9조 (회사 귀책사유에 의한 환불)
          </h2>
          <p className="mt-2">
            회사의 귀책사유로 서비스를 정상적으로 제공하지 못한 경우,
            이용일수 기준으로 일할 계산하여 환불합니다.
            24시간 이상 연속 서비스 장애 발생 시 해당 기간만큼 이용기간을
            연장하거나 환불합니다.
          </p>
        </section>

        {/* 문의 */}
        <section className="rounded-[var(--radius-lg)] border border-border bg-surface-secondary p-5">
          <p className="font-medium text-foreground">환불 문의</p>
          <ul className="mt-2 space-y-0.5">
            <li>이메일: soridamhub@gmail.com</li>
            <li>상호: 스투스 OPIc</li>
            <li>대표: 전다영</li>
            <li>사업자등록번호: 757-18-02318</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
