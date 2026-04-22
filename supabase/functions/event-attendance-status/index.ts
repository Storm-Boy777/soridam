import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 활성 멤버 전체 + 이벤트 제목 설정 병렬 조회
    const [membersRes, settingsRes] = await Promise.all([
      supabase
        .from("event_members")
        .select("id, name, department, is_attended, attended_at")
        .eq("is_active", true)
        .order("name"),
      supabase
        .from("system_settings")
        .select("key, value")
        .in("key", ["attendance_event_title", "attendance_event_subtitle"]),
    ]);

    if (membersRes.error) throw membersRes.error;

    const allMembers = membersRes.data || [];
    const total = allMembers.length;
    const attended = allMembers.filter((m) => m.is_attended).length;

    // 제목 설정 파싱 (jsonb → string)
    const settingsMap: Record<string, string> = {};
    for (const row of settingsRes.data || []) {
      settingsMap[row.key] = typeof row.value === "string" ? row.value : String(row.value ?? "");
    }
    const eventTitle = settingsMap["attendance_event_title"] || "";
    const eventSubtitle = settingsMap["attendance_event_subtitle"] || "";

    // 부서별 집계
    const deptMap = new Map<string, { total: number; attended: number }>();
    for (const m of allMembers) {
      const dept = m.department || "미지정";
      if (!deptMap.has(dept)) {
        deptMap.set(dept, { total: 0, attended: 0 });
      }
      const stat = deptMap.get(dept)!;
      stat.total++;
      if (m.is_attended) stat.attended++;
    }

    const departments = Array.from(deptMap.entries())
      .map(([name, stat]) => ({ name, ...stat }))
      .sort((a, b) => a.name.localeCompare(b.name, "ko"));

    return new Response(
      JSON.stringify({
        total,
        attended,
        departments,
        members: allMembers,
        event_title: eventTitle,
        event_subtitle: eventSubtitle,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
