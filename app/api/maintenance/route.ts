import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: 점검 모드 상태 조회 (1분 캐시)
export async function GET() {
  const { data } = await supabaseAdmin
    .from("system_settings")
    .select("value")
    .eq("key", "maintenance_mode")
    .single();

  // jsonb: true/false 불리언으로 저장됨
  const enabled = data?.value === true;

  return NextResponse.json(
    { maintenance: enabled },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30",
      },
    }
  );
}

// POST: 점검 모드 변경 (관리자만)
export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.app_metadata?.role !== "admin") {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  }

  const body = await request.json();
  const enabled = body.enabled === true;

  // jsonb 컬럼에 불리언 저장
  const { error } = await supabaseAdmin
    .from("system_settings")
    .update({ value: enabled, updated_at: new Date().toISOString() })
    .eq("key", "maintenance_mode");

  if (error) {
    return NextResponse.json({ error: "업데이트 실패" }, { status: 500 });
  }

  // 감사 로그
  await supabaseAdmin.from("admin_audit_log").insert({
    admin_id: user.id,
    action: enabled ? "maintenance_on" : "maintenance_off",
    target_type: "system",
    target_id: "maintenance_mode",
    details: { enabled },
  });

  return NextResponse.json({ maintenance: enabled });
}
