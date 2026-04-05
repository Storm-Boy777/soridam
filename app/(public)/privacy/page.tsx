import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "개인정보처리방침",
  description: "소리담 개인정보처리방침",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold">개인정보처리방침</h1>
      <p className="mt-2 text-sm text-foreground-muted">
        시행일: 2026년 2월 18일 | 개정일: 2026년 3월 31일
      </p>

      <div className="mt-10 space-y-10 text-sm leading-relaxed text-foreground-secondary">
        {/* 제1조 */}
        <section>
          <h2 className="text-lg font-semibold text-foreground">
            제1조 (개인정보의 수집 및 이용 목적)
          </h2>
          <p className="mt-2">
            스투스 OPIc(이하 &quot;회사&quot;)은 다음의 목적을 위하여
            개인정보를 처리합니다. 처리하는 개인정보는 다음의 목적 이외의
            용도로는 이용되지 않으며, 이용 목적이 변경되는 경우에는
            별도의 동의를 받는 등 필요한 조치를 이행합니다.
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>회원가입 및 관리: 본인 확인, 서비스 부정이용 방지</li>
            <li>
              서비스 제공: AI 기반 OPIc 말하기 학습(모의고사, 스크립트 생성,
              튜터링, 쉐도잉), 학습 리포트 생성, 맞춤 학습
            </li>
            <li>유료서비스: 결제 처리, 요금 정산, 이용권 관리</li>
            <li>마케팅: 이벤트·광고성 정보 제공 (별도 동의 시)</li>
          </ul>
        </section>

        {/* 제2조 */}
        <section>
          <h2 className="text-lg font-semibold text-foreground">
            제2조 (수집하는 개인정보 항목)
          </h2>
          <div className="mt-2 space-y-3">
            <div>
              <p className="font-medium text-foreground">필수 항목</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5">
                <li>이메일 주소 (Supabase Auth 기반 인증)</li>
                <li>비밀번호 (암호화 저장)</li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-foreground">
                소셜 로그인 시 수집 항목
              </p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5">
                <li>Google: 이메일, 이름, 프로필 사진</li>
                <li>Kakao: 이메일, 닉네임, 프로필 사진</li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-foreground">
                서비스 이용 시 자동 수집 항목
              </p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5">
                <li>학습 기록 (모의고사 응시, 튜터링 훈련, 쉐도잉 이력)</li>
                <li>음성 녹음 데이터 (AI 평가 및 학습 피드백 생성 목적)</li>
                <li>접속 IP, 브라우저 정보, 접속 시간</li>
              </ul>
            </div>
          </div>
        </section>

        {/* 제3조 */}
        <section>
          <h2 className="text-lg font-semibold text-foreground">
            제3조 (개인정보의 보유 및 이용 기간)
          </h2>
          <p className="mt-2">
            회사는 개인정보 수집 및 이용 목적이 달성된 후에는 해당 정보를
            지체 없이 파기합니다. 다만, 관계 법령에 의해 보존할 필요가 있는
            경우 해당 기간 동안 보관합니다.
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>계약 또는 청약철회 기록: 5년 (전자상거래법)</li>
            <li>대금결제 및 재화 공급 기록: 5년 (전자상거래법)</li>
            <li>소비자 불만 또는 분쟁처리 기록: 3년 (전자상거래법)</li>
            <li>접속 기록: 3개월 (통신비밀보호법)</li>
          </ul>
        </section>

        {/* 제4조 */}
        <section>
          <h2 className="text-lg font-semibold text-foreground">
            제4조 (개인정보의 제3자 제공)
          </h2>
          <p className="mt-2">
            회사는 원칙적으로 이용자의 개인정보를 외부에 제공하지 않습니다.
            다만, 다음의 경우에는 예외로 합니다.
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>이용자가 사전에 동의한 경우</li>
            <li>법령의 규정에 의거하거나, 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우</li>
          </ul>
        </section>

        {/* 제5조 */}
        <section>
          <h2 className="text-lg font-semibold text-foreground">
            제5조 (개인정보 처리의 위탁)
          </h2>
          <p className="mt-2">
            회사는 원활한 서비스 제공을 위해 다음과 같이 개인정보 처리
            업무를 위탁하고 있습니다.
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-2 pr-4 font-medium text-foreground">
                    수탁업체
                  </th>
                  <th className="pb-2 pr-4 font-medium text-foreground">
                    위탁 업무
                  </th>
                  <th className="pb-2 font-medium text-foreground">
                    보유 기간
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                <tr>
                  <td className="py-2 pr-4">주식회사 코리아포트원 (PortOne)</td>
                  <td className="py-2 pr-4">전자결제 처리 및 결제 도용 방지</td>
                  <td className="py-2">위탁 계약 종료 시까지</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">주식회사 KG이니시스</td>
                  <td className="py-2 pr-4">신용카드 결제 대행</td>
                  <td className="py-2">위탁 계약 종료 시까지</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">주식회사 카카오페이</td>
                  <td className="py-2 pr-4">간편결제 대행</td>
                  <td className="py-2">위탁 계약 종료 시까지</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">주식회사 NHN KCP</td>
                  <td className="py-2 pr-4">전자결제 대행</td>
                  <td className="py-2">위탁 계약 종료 시까지</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">Supabase Inc.</td>
                  <td className="py-2 pr-4">클라우드 인프라 운영 및 데이터 저장</td>
                  <td className="py-2">위탁 계약 종료 시까지</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">Vercel Inc.</td>
                  <td className="py-2 pr-4">웹 호스팅 및 서비스 배포</td>
                  <td className="py-2">위탁 계약 종료 시까지</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3">
            회사는 위탁 계약 체결 시 개인정보보호법 제26조에 따라
            위탁업무 수행 목적 외 개인정보 처리 금지, 기술적·관리적
            보호조치, 재위탁 제한, 수탁자에 대한 관리·감독, 손해배상 등
            책임에 관한 사항을 계약서 등 문서에 명시하고, 해당
            수탁자가 개인정보를 안전하게 처리하는지를 감독하고
            있습니다.
          </p>
        </section>

        {/* 제6조 */}
        <section>
          <h2 className="text-lg font-semibold text-foreground">
            제6조 (개인정보의 파기)
          </h2>
          <p className="mt-2">
            회사는 개인정보 보유기간의 경과, 처리 목적 달성 등 개인정보가
            불필요하게 되었을 때에는 지체 없이 해당 개인정보를 파기합니다.
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>전자적 파일: 복구 불가능한 방법으로 영구 삭제</li>
            <li>기록물, 인쇄물: 파쇄 또는 소각</li>
          </ul>
        </section>

        {/* 제7조 */}
        <section>
          <h2 className="text-lg font-semibold text-foreground">
            제7조 (이용자의 권리·의무)
          </h2>
          <p className="mt-2">
            이용자는 언제든지 자신의 개인정보에 대해 다음의 권리를 행사할 수
            있습니다.
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>개인정보 열람 요구</li>
            <li>오류 등이 있을 경우 정정 요구</li>
            <li>삭제 요구</li>
            <li>처리 정지 요구</li>
          </ul>
          <p className="mt-2">
            권리 행사는 서비스 내 설정 또는 이메일(soridamhub@gmail.com)로
            요청할 수 있으며, 회사는 지체 없이 조치합니다.
          </p>
        </section>

        {/* 제8조 */}
        <section>
          <h2 className="text-lg font-semibold text-foreground">
            제8조 (개인정보의 안전성 확보 조치)
          </h2>
          <p className="mt-2">
            회사는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고
            있습니다.
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>비밀번호 암호화 저장 (Supabase Auth bcrypt)</li>
            <li>SSL/TLS 암호화 통신</li>
            <li>Row Level Security(RLS) 기반 데이터 접근 제어</li>
            <li>개인정보 접근 권한 최소화</li>
          </ul>
        </section>

        {/* 제9조 */}
        <section>
          <h2 className="text-lg font-semibold text-foreground">
            제9조 (개인정보 보호책임자)
          </h2>
          <ul className="mt-2 space-y-0.5">
            <li>성명: 전다영</li>
            <li>직책: 대표</li>
            <li>이메일: soridamhub@gmail.com</li>
          </ul>
        </section>

        {/* 제10조 */}
        <section>
          <h2 className="text-lg font-semibold text-foreground">
            제10조 (개인정보 처리방침 변경)
          </h2>
          <p className="mt-2">
            이 개인정보처리방침은 시행일로부터 적용되며, 법령 및 방침에 따른
            변경 내용의 추가, 삭제 및 정정이 있는 경우에는 변경사항의 시행
            7일 전부터 공지사항을 통하여 고지할 것입니다.
          </p>
        </section>

        {/* 사업자 정보 */}
        <section className="rounded-[var(--radius-lg)] border border-border bg-surface-secondary p-5">
          <p className="font-medium text-foreground">사업자 정보</p>
          <ul className="mt-2 space-y-0.5">
            <li>상호: 스투스 OPIc</li>
            <li>대표: 전다영</li>
            <li>사업자등록번호: 757-18-02318</li>
            <li>
              소재지: 경상북도 구미시 해마루공원로 80, 104동 1903호
            </li>
            <li>이메일: soridamhub@gmail.com</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
