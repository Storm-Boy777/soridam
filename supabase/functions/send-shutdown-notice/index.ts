// send-shutdown-notice — AI 기능 종료 안내 메일 발송 (일회성)
//
// 시크릿(이미 설정됨): RESEND_API_KEY, FROM_EMAIL, ADMIN_EMAIL,
//                     SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// 사전조건: 마이그 109 적용 (email_send_log + get_shutdown_recipients)
//
// 호출: POST, 헤더 x-trigger-secret: <SHUTDOWN_TRIGGER_SECRET>
//       (게이트웨이 통과용 Authorization: Bearer <anon 또는 service 키>도 함께)
// 본문: { "mode": "dryrun" | "test" | "send" }
//   dryrun — 대상 수만 반환, 발송 안 함 (기본값)
//   test   — 관리자(ADMIN_EMAIL)에게 두 변형 각 1통
//   send   — 실제 발송. email_send_log에 없는 대상만. 배치.
//
// 배포: supabase functions deploy send-shutdown-notice --no-verify-jwt
//   (JWT 검증 대신 함수 내부에서 service_role 키를 확인)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CAMPAIGN = "shutdown_2026";
const DL_URL = "https://soridamhub.com/my-data";
const BATCH = 100; // Resend batch 상한

const SUBJECT: Record<string, string> = {
  credit: "[소리담] 서비스 운영 방식 변경 안내 — 8월 31일까지 크레딧과 자료를 꼭 확인해 주세요",
  script: "[소리담] 서비스 운영 방식 변경 안내 — 8월 31일까지 내 자료를 꼭 확인해 주세요",
};

function fromField(): string {
  const f = Deno.env.get("FROM_EMAIL") || "";
  return f.includes("<") ? f : `소리담 <${f}>`;
}

// ── 마크업 헬퍼 — 소리담 실제 브랜드 시스템 (가입 인증 메일과 동일 팔레트) ──
// primary(인디고 블루) #3A5BC7, 다크 네이비 헤더/푸터 #12121F,
// foreground #1A1A2E / secondary #6B6B7B / muted #A0A0AF, surface-secondary #F3F2EF, border #E8E6E1
const C = {
  ink: "#1A1A2E",
  ink2: "#6B6B7B",
  ink3: "#A0A0AF",
  accent: "#3A5BC7",
  soft: "#F3F2EF",
  line: "#E8E6E1",
  navy: "#12121F",
};

function p(html: string, opts: { size?: number; color?: string; mt?: number; mb?: number; weight?: number } = {}): string {
  const { size = 15, color = C.ink2, mt = 0, mb = 16, weight = 400 } = opts;
  return `<p style="margin:${mt}px 0 ${mb}px;font-size:${size}px;line-height:1.7;color:${color};font-weight:${weight}">${html}</p>`;
}

function h2(text: string): string {
  return `<h2 style="margin:0 0 12px;font-size:16px;font-weight:700;color:${C.ink};letter-spacing:-.01em">${text}</h2>`;
}

function dotList(items: string[]): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:18px">
    ${items
      .map(
        (t) => `
      <tr><td style="padding:5px 0;vertical-align:top;width:20px">
        <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${C.accent};margin-top:8px"></span>
      </td><td style="padding:5px 0;font-size:15px;line-height:1.7;color:${C.ink2}">${t}</td></tr>`,
      )
      .join("")}
  </table>`;
}

function numberedItem(no: string, title: string, body: string): string {
  return `<div style="margin-bottom:16px">
    <div style="font-size:15px;font-weight:700;color:${C.ink};margin-bottom:5px">${no} ${title}</div>
    <div style="font-size:14.5px;line-height:1.7;color:${C.ink2}">${body}</div>
  </div>`;
}

function emailHtml(segment: "credit" | "script"): string {
  const deadlineBlock =
    segment === "credit"
      ? `
      ${numberedItem(
        "①",
        "보유 크레딧 사용",
        `보유하고 계신 크레딧은 2026년 8월 31일까지 사용하실 수 있습니다.<br>
         서비스 종료 이후에는 AI 기능 이용이 종료되며, 남아 있는 크레딧은 함께 종료됩니다.`,
      )}
      ${numberedItem(
        "②",
        "내 자료 다운로드",
        `그동안 생성하신 스크립트와 음성 자료는 8월 31일까지 다운로드하실 수 있습니다.<br>
         이후에는 저장 공간 정리를 위해 순차적으로 삭제되며, 삭제된 자료는 복구가 어렵습니다.<br>
         다운로드한 자료는 인터넷 연결 없이도 학습할 수 있는 프로그램 형태로 계속 이용하실 수 있습니다.`,
      )}`
      : numberedItem(
          "①",
          "내 자료 다운로드",
          `그동안 생성하신 스크립트와 음성 자료는 8월 31일까지 다운로드하실 수 있습니다.<br>
           이후에는 저장 공간 정리를 위해 순차적으로 삭제되며, 삭제된 자료는 복구가 어렵습니다.<br>
           다운로드한 자료는 인터넷 연결 없이도 학습할 수 있는 프로그램 형태로 계속 이용하실 수 있습니다.`,
        );

  const body = `
    <h2 style="margin:0 0 20px;font-size:22px;font-weight:700;color:${C.ink};letter-spacing:-.02em;line-height:1.35">
      서비스 운영 방식 변경 안내
    </h2>

    ${p("안녕하세요. 소리담 운영자입니다.", { mb: 20 })}

    ${p("소리담을 운영한 지도 어느덧 1년이 되었습니다.", { color: C.ink, mb: 14 })}
    ${p(
      "지난 1년 동안 많은 분들이 소리담을 이용해 주셨고, 소중한 후기와 응원 덕분에 운영자인 저 역시 많은 것을 배우며 함께 성장할 수 있었습니다. 진심으로 감사드립니다.",
      { mb: 20 },
    )}

    ${p("그동안 소리담은 AI를 활용한 스크립트 생성, 모의고사 평가, 튜터링, 발음 평가 등 다양한 기능을 제공해 왔습니다.", { mb: 14 })}
    ${p(
      "하지만 이러한 AI 기능은 OpenAI 등의 외부 AI 이용 비용뿐 아니라 데이터베이스, 서버, 스토리지 등 지속적인 운영 비용이 함께 발생합니다. 지난 1년 동안은 이러한 비용의 상당 부분을 운영자가 직접 부담하며 서비스를 유지해 왔지만, 현재의 운영 방식으로는 장기적인 서비스를 이어가기 어렵다고 판단했습니다.",
      { mb: 20 },
    )}

    <div style="background:${C.soft};border:1px solid ${C.line};border-radius:10px;padding:16px 18px;margin-bottom:20px">
      <div style="font-size:15px;font-weight:700;color:${C.ink};line-height:1.6">
        이번 변경은 기능을 줄이기 위한 것이 아니라, 소리담을 더 오래 운영하기 위한 선택입니다.
      </div>
    </div>

    ${p("앞으로도 부담 없이 이용할 수 있는 무료 OPIc 학습 플랫폼을 목표로 서비스 운영 방식을 다음과 같이 변경합니다.", { mb: 28 })}

    ${h2("변경되는 내용")}
    <div style="font-size:13.5px;font-weight:800;color:${C.ink3};margin-bottom:8px">AI 기능 종료</div>
    ${dotList([
      "AI 스크립트 생성 및 교정",
      "AI 모의고사 평가",
      "AI 튜터링",
      "AI 쉐도잉 발음 평가",
      "AI 코치",
    ])}
    <div style="font-size:13.5px;font-weight:800;color:${C.ink3};margin-bottom:8px">서비스 종료</div>
    ${dotList(["AI 크레딧 충전 서비스"])}

    ${h2("계속 제공되는 기능")}
    ${p("앞으로도 OPIc 학습에 꼭 필요한 핵심 기능은 무료로 계속 제공하며 안정적으로 운영해 나가겠습니다.", { mb: 16 })}
    ${dotList([
      "시험 후기 (기출 확인 및 후기 작성)",
      "기출 빈도 분석",
      "오픽 스터디",
      "AI 평가 없이 연습할 수 있는 모의고사 (예정)",
    ])}

    <div style="height:1px;background:${C.line};margin:28px 0"></div>

    ${h2("8월 31일까지 꼭 확인해 주세요")}
    ${deadlineBlock}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0">
      <tr><td align="center">
        <a href="${DL_URL}" style="display:inline-block;background:${C.accent};color:#ffffff;text-decoration:none;
           padding:15px 44px;border-radius:9999px;font-size:15px;font-weight:700">내 자료 내려받기</a>
      </td></tr>
    </table>

    ${p(
      `버튼이 작동하지 않는 경우, 아래 링크를 복사하여 브라우저에 붙여넣어 주세요:<br>
       <a href="${DL_URL}" style="color:${C.accent};word-break:break-all;text-decoration:underline">${DL_URL}</a>`,
      { size: 13, color: C.ink3, mt: 4, mb: 28 },
    )}

    <div style="height:1px;background:${C.line};margin-bottom:24px"></div>

    ${p("앞으로도 여러분의 피드백을 바탕으로 꼭 필요한 기능을 꾸준히 개선하여, OPIc를 준비하는 과정에 실질적인 도움이 되는 무료 학습 플랫폼이 되도록 노력하겠습니다.", { mb: 14 })}
    ${p("많은 이용과 의견 부탁드립니다.", { mb: 20 })}
    ${p("지난 1년 동안 소리담을 아껴 주시고 응원해 주신 모든 분들께 다시 한번 진심으로 감사드립니다.", { color: C.ink, weight: 700, mb: 0 })}
  `;

  return `<!doctype html><html lang="ko"><body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background-color:#FAFAF7">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#FAFAF7;padding:40px 20px">
    <tr><td align="center">
      <table width="680" cellpadding="0" cellspacing="0" border="0"
        style="max-width:680px;width:100%;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(26,26,46,0.06)">

        <!-- 헤더 — 다크 네이비 -->
        <tr><td style="background-color:${C.navy};padding:36px 30px;text-align:center">
          <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:bold;letter-spacing:-0.5px">소리담</h1>
          <p style="margin:8px 0 0;color:rgba(255,255,255,0.55);font-size:13px">데이터 기반 OPIc AI 학습 플랫폼</p>
        </td></tr>

        <!-- 본문 -->
        <tr><td style="padding:40px 40px 8px">${body}</td></tr>

        <!-- 푸터 — 다크 네이비 -->
        <tr><td style="background-color:${C.navy};padding:28px 30px;text-align:center">
          <p style="margin:0 0 8px;color:rgba(255,255,255,0.6);font-size:13px">
            이 메일은 소리담 서비스 이용 안내로 발송되었습니다.<br>
            문의는 서비스 내 소통함으로 남겨주세요.
          </p>
          <p style="margin:0;color:rgba(255,255,255,0.35);font-size:12px">
            &copy; 2026 소리담 (Soridam). All rights reserved.<br>
            <a href="https://soridamhub.com" style="color:${C.accent};text-decoration:none">soridamhub.com</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body></html>`;
}

async function resendBatch(
  from: string,
  items: { to: string; subject: string; html: string }[],
): Promise<{ ok: boolean; ids: (string | null)[]; error?: string }> {
  const res = await fetch("https://api.resend.com/emails/batch", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(
      items.map((e) => ({ from, to: [e.to], subject: e.subject, html: e.html })),
    ),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, ids: [], error: JSON.stringify(json).slice(0, 300) };
  const data = (json as { data?: { id: string }[] }).data || [];
  return { ok: true, ids: items.map((_, i) => data[i]?.id ?? null) };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  // 인증: 전용 트리거 시크릿을 가진 호출자만
  const trigger = req.headers.get("x-trigger-secret") || "";
  const expected = Deno.env.get("SHUTDOWN_TRIGGER_SECRET") || "";
  if (!expected || trigger !== expected) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }
  const svcKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const body = await req.json().catch(() => ({}));
  const mode = body.mode || "dryrun";
  const max = typeof body.max === "number" ? body.max : Infinity; // 1회 발송 상한 (하루 100건 분할용)
  const from = fromField();
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, svcKey);

  // ── status: 도메인 인증 + 특정 메일 배달 상태 조회 (디버그) ──
  if (mode === "status") {
    const key = Deno.env.get("RESEND_API_KEY");
    const h = { Authorization: `Bearer ${key}` };
    const domains = await fetch("https://api.resend.com/domains", { headers: h })
      .then((r) => r.json()).catch(() => ({}));
    const ids: string[] = Array.isArray(body.ids) ? body.ids : [];
    const emails = [];
    for (const id of ids) {
      const e = await fetch(`https://api.resend.com/emails/${id}`, { headers: h })
        .then((r) => r.json()).catch(() => ({}));
      emails.push({ id, last_event: e.last_event, to: e.to, from: e.from, subject: e.subject });
    }
    return new Response(JSON.stringify({ mode, from, domains, emails }, null, 2), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // ── test: 관리자에게만 두 변형 발송 ──
  if (mode === "test") {
    const admin = Deno.env.get("ADMIN_EMAIL");
    if (!admin) return new Response(JSON.stringify({ error: "ADMIN_EMAIL 미설정" }), { status: 400 });
    const r = await resendBatch(from, [
      { to: admin, subject: "[TEST] " + SUBJECT.credit, html: emailHtml("credit") },
      { to: admin, subject: "[TEST] " + SUBJECT.script, html: emailHtml("script") },
    ]);
    return new Response(JSON.stringify({ mode, to: admin, result: r }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // ── 수신자 조회 + 이미 발송한 대상 제외 ──
  const { data: recips, error: rErr } = await supabase.rpc("get_shutdown_recipients");
  if (rErr) return new Response(JSON.stringify({ error: rErr.message }), { status: 500 });

  const { data: sent } = await supabase
    .from("email_send_log")
    .select("user_id")
    .eq("campaign", CAMPAIGN);
  const sentIds = new Set((sent || []).map((r: { user_id: string }) => r.user_id));

  let pending = (recips as { user_id: string; email: string; segment: "credit" | "script" }[])
    .filter((r) => !sentIds.has(r.user_id));

  const summary = {
    total: recips.length,
    already_sent: sentIds.size,
    pending: pending.length,
    pending_credit: pending.filter((r) => r.segment === "credit").length,
    pending_script: pending.filter((r) => r.segment === "script").length,
  };

  // ── dryrun: 요약만 ──
  if (mode !== "send") {
    return new Response(JSON.stringify({ mode: "dryrun", ...summary }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // only: 특정 세그먼트만 이번 호출에서 발송 (예: 1차 크레딧 33명만)
  if (body.only === "credit" || body.only === "script") {
    pending = pending.filter((r) => r.segment === body.only);
  }
  // max: 1회 발송 상한 (하루 100건 분할용). 남는 대상은 다음 호출로 미룸
  if (pending.length > max) pending = pending.slice(0, max);

  // ── send: 배치 발송 + 로그 ──
  let ok = 0;
  let fail = 0;
  const errors: string[] = [];
  for (let i = 0; i < pending.length; i += BATCH) {
    const chunk = pending.slice(i, i + BATCH);
    const r = await resendBatch(
      from,
      chunk.map((c) => ({ to: c.email, subject: SUBJECT[c.segment], html: emailHtml(c.segment) })),
    );
    if (!r.ok) {
      fail += chunk.length;
      if (r.error) errors.push(r.error);
      continue; // 실패 배치는 로그 안 남김 → 재실행 시 재시도
    }
    const rows = chunk.map((c, idx) => ({
      campaign: CAMPAIGN,
      user_id: c.user_id,
      email: c.email,
      segment: c.segment,
      status: "sent",
      resend_id: r.ids[idx],
    }));
    const { error: logErr } = await supabase.from("email_send_log").insert(rows);
    if (logErr) errors.push("log: " + logErr.message);
    ok += chunk.length;
  }

  return new Response(JSON.stringify({ mode: "send", sent: ok, failed: fail, errors, ...summary }), {
    headers: { "Content-Type": "application/json" },
  });
});
