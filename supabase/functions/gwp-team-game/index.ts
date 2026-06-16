import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// =============================================
// gwp-team-game — GWP 팀 매칭 게임 백엔드 (action 라우터)
//
// 모든 "쓰기"는 이 함수(service role)를 경유한다.
// 읽기/실시간은 클라이언트가 anon으로 직접 SELECT/subscribe (RLS read 허용).
//
// actions:
//   create_session   { title, team_count, team_size, parts[] }  → 새 세션(기존은 ended)
//   update_session   { session_id, ...patch }                   → 설정/상태 변경
//   checkin          { session_id, member_id }                  → 팀 배정(RPC) 반환
//   arm_buzzer       { session_id }                             → 버저 ON, round+1
//   stop_buzzer      { session_id }                             → 버저 OFF
//   buzz             { session_id, member_id }                  → 저요 누름 기록
//   clear_round      { session_id }                             → 현재 라운드 누름 삭제 + 버저 OFF
//   reset_checkins   { session_id }                             → 체크인/팀배정 전체 삭제
// =============================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// 입장 코드 — 4자리 숫자
function genCode(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { action, ...p } = await req.json();

    switch (action) {
      // ── 세션 생성 (기존 진행중 세션은 종료) ─────────────────
      case "create_session": {
        const team_count = Number(p.team_count);
        const team_size = Number(p.team_size);
        const parts: string[] = Array.isArray(p.parts) ? p.parts : [];
        if (!Number.isInteger(team_count) || team_count < 1)
          return json({ error: "팀 개수가 올바르지 않습니다" }, 400);
        if (!Number.isInteger(team_size) || team_size < 1)
          return json({ error: "팀당 인원이 올바르지 않습니다" }, 400);
        if (parts.length < 1) return json({ error: "참가 파트(부서)를 1개 이상 선택하세요" }, 400);

        // 기존 진행중 세션 종료
        await supabase
          .from("gwp_team_sessions")
          .update({ status: "ended", updated_at: new Date().toISOString() })
          .neq("status", "ended");

        const { data, error } = await supabase
          .from("gwp_team_sessions")
          .insert({
            title: (p.title || "GWP 팀 매칭 게임").toString().slice(0, 120),
            team_count,
            team_size,
            parts,
            status: "checkin",
          })
          .select()
          .single();
        if (error) throw error;
        // 입장 코드 생성 → 비밀 테이블에 저장 (응답으로만 진행자에게 전달)
        const code = genCode();
        const { error: secErr } = await supabase
          .from("gwp_session_secrets")
          .insert({ session_id: data.id, join_code: code });
        if (secErr) throw secErr;
        return json({ session: data, code });
      }

      // ── 세션 설정/상태 변경 ──────────────────────────────
      case "update_session": {
        if (!p.session_id) return json({ error: "session_id 누락" }, 400);
        const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
        for (const k of ["title", "team_count", "team_size", "parts", "status", "checkin_open"]) {
          if (p[k] !== undefined) patch[k] = p[k];
        }
        const { data, error } = await supabase
          .from("gwp_team_sessions")
          .update(patch)
          .eq("id", p.session_id)
          .select()
          .single();
        if (error) throw error;
        return json({ session: data });
      }

      // ── 입장 코드 검증 (체크인 전 사전 확인용) ──────────────
      case "verify_code": {
        if (!p.session_id) return json({ error: "session_id 누락" }, 400);
        const { data: sec } = await supabase
          .from("gwp_session_secrets")
          .select("join_code")
          .eq("session_id", p.session_id)
          .maybeSingle();
        const ok = !sec || String(p.code ?? "").trim() === sec.join_code;
        return json({ ok });
      }

      // ── 입장 코드 재발급 (진행자) ──────────────────────────
      case "regenerate_code": {
        if (!p.session_id) return json({ error: "session_id 누락" }, 400);
        const code = genCode();
        const { error } = await supabase
          .from("gwp_session_secrets")
          .upsert({ session_id: p.session_id, join_code: code }, { onConflict: "session_id" });
        if (error) throw error;
        return json({ code });
      }

      // ── 체크인 → 팀 배정 (RPC, advisory lock으로 동시성 안전) ──
      case "checkin": {
        if (!p.session_id || !p.member_id)
          return json({ error: "session_id / member_id 누락" }, 400);

        // 마감 여부 (게임 시작/수동 마감)
        const { data: sess, error: sErr } = await supabase
          .from("gwp_team_sessions")
          .select("status, checkin_open")
          .eq("id", p.session_id)
          .single();
        if (sErr) throw sErr;
        if (sess.status !== "checkin" || !sess.checkin_open)
          return json({ error: "체크인이 마감되었어요", closed: true }, 409);

        // 입장 코드 검증
        const { data: sec } = await supabase
          .from("gwp_session_secrets")
          .select("join_code")
          .eq("session_id", p.session_id)
          .maybeSingle();
        if (sec && String(p.code ?? "").trim() !== sec.join_code)
          return json({ error: "입장 코드가 올바르지 않아요", bad_code: true }, 403);

        const { data, error } = await supabase.rpc("gwp_assign_team", {
          p_session: p.session_id,
          p_member: p.member_id,
        });
        if (error) throw error;
        const row = Array.isArray(data) ? data[0] : data;
        return json({
          team_number: row.team_number,
          member_name: row.member_name,
          part: row.part,
          already: row.already,
        });
      }

      // ── 버저 ON (새 라운드) ──────────────────────────────
      case "arm_buzzer": {
        if (!p.session_id) return json({ error: "session_id 누락" }, 400);
        const { data: cur, error: e1 } = await supabase
          .from("gwp_team_sessions")
          .select("buzzer_round")
          .eq("id", p.session_id)
          .single();
        if (e1) throw e1;
        const nextRound = (cur?.buzzer_round ?? 0) + 1;
        const { data, error } = await supabase
          .from("gwp_team_sessions")
          .update({
            buzzer_active: true,
            buzzer_round: nextRound,
            status: "playing",
            updated_at: new Date().toISOString(),
          })
          .eq("id", p.session_id)
          .select()
          .single();
        if (error) throw error;
        return json({ session: data });
      }

      // ── 버저 OFF ────────────────────────────────────────
      case "stop_buzzer": {
        if (!p.session_id) return json({ error: "session_id 누락" }, 400);
        const { error } = await supabase
          .from("gwp_team_sessions")
          .update({ buzzer_active: false, updated_at: new Date().toISOString() })
          .eq("id", p.session_id);
        if (error) throw error;
        return json({ ok: true });
      }

      // ── 저요 누름 기록 ──────────────────────────────────
      case "buzz": {
        if (!p.session_id || !p.member_id)
          return json({ error: "session_id / member_id 누락" }, 400);

        const { data: sess, error: se } = await supabase
          .from("gwp_team_sessions")
          .select("buzzer_active, buzzer_round")
          .eq("id", p.session_id)
          .single();
        if (se) throw se;
        if (!sess?.buzzer_active)
          return json({ error: "지금은 버저가 꺼져 있어요", inactive: true }, 409);

        const { data: asg, error: ae } = await supabase
          .from("gwp_team_assignments")
          .select("member_name, team_number")
          .eq("session_id", p.session_id)
          .eq("member_id", p.member_id)
          .maybeSingle();
        if (ae) throw ae;
        if (!asg) return json({ error: "먼저 체크인을 해주세요" }, 400);

        const { error: ie } = await supabase.from("gwp_buzzer_presses").insert({
          session_id: p.session_id,
          round: sess.buzzer_round,
          member_id: p.member_id,
          member_name: asg.member_name,
          team_number: asg.team_number,
        });
        // 이미 이 라운드에 눌렀으면 unique 위반 (23505) → 멱등 처리
        if (ie && ie.code === "23505") return json({ ok: true, already: true });
        if (ie) throw ie;
        return json({ ok: true, already: false });
      }

      // ── 현재 라운드 누름 삭제 + 버저 OFF ──────────────────
      case "clear_round": {
        if (!p.session_id) return json({ error: "session_id 누락" }, 400);
        const { data: sess } = await supabase
          .from("gwp_team_sessions")
          .select("buzzer_round")
          .eq("id", p.session_id)
          .single();
        if (sess) {
          await supabase
            .from("gwp_buzzer_presses")
            .delete()
            .eq("session_id", p.session_id)
            .eq("round", sess.buzzer_round);
        }
        await supabase
          .from("gwp_team_sessions")
          .update({ buzzer_active: false, updated_at: new Date().toISOString() })
          .eq("id", p.session_id);
        return json({ ok: true });
      }

      // ── 체크인/팀배정 전체 초기화 ─────────────────────────
      case "reset_checkins": {
        if (!p.session_id) return json({ error: "session_id 누락" }, 400);
        const { error } = await supabase
          .from("gwp_team_assignments")
          .delete()
          .eq("session_id", p.session_id);
        if (error) throw error;
        return json({ ok: true });
      }

      default:
        return json({ error: `알 수 없는 action: ${action}` }, 400);
    }
  } catch (err) {
    return json({ error: (err as Error).message }, 400);
  }
});
