"use server";

import { revalidatePath } from "next/cache";
import { T } from "@/lib/constants/tables";
import { requireAdmin } from "@/lib/auth";
import type { PaginatedResult } from "@/lib/types/admin";
import type { ScriptDetail } from "@/lib/types/scripts";

// ── 관리자 스크립트 타입 ──

export interface AdminScriptListItem {
  id: string;
  user_email: string;
  question_id: string;
  source: string;
  title: string | null;
  topic: string | null;
  category: string | null;
  question_korean: string | null;
  target_grade: string | null;
  question_type: string | null;
  word_count: number | null;
  status: string;
  refine_count: number;
  created_at: string;
}

export interface AdminScriptStats {
  total: number;
  today: number;
  confirmed: number;
  draft: number;
  // 등급별 분포
  levelDistribution: Record<string, number>;
  // 질문 타입별 분포
  typeDistribution: Record<string, number>;
  // 평균 단어 수
  avgWordCount: number;
}

// ── 통계 ──

export async function getAdminScriptStats(): Promise<AdminScriptStats> {
  const { supabase } = await requireAdmin();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [totalRes, todayRes, confirmedRes, draftRes, distributionRes] = await Promise.all([
    supabase.from(T.scripts).select("id", { count: "exact", head: true }),
    supabase
      .from(T.scripts)
      .select("id", { count: "exact", head: true })
      .gte("created_at", todayStart.toISOString()),
    supabase
      .from(T.scripts)
      .select("id", { count: "exact", head: true })
      .eq("status", "confirmed"),
    supabase
      .from(T.scripts)
      .select("id", { count: "exact", head: true })
      .eq("status", "draft"),
    supabase
      .from(T.scripts)
      .select("target_grade, question_type, word_count"),
  ]);

  // 등급별, 타입별 분포 계산
  const levelDistribution: Record<string, number> = {};
  const typeDistribution: Record<string, number> = {};
  let totalWords = 0;
  let wordCountN = 0;
  for (const s of distributionRes.data || []) {
    if (s.target_grade) {
      levelDistribution[s.target_grade] = (levelDistribution[s.target_grade] || 0) + 1;
    }
    if (s.question_type) {
      typeDistribution[s.question_type] = (typeDistribution[s.question_type] || 0) + 1;
    }
    if (s.word_count && s.word_count > 0) {
      totalWords += s.word_count;
      wordCountN++;
    }
  }

  return {
    total: totalRes.count || 0,
    today: todayRes.count || 0,
    confirmed: confirmedRes.count || 0,
    draft: draftRes.count || 0,
    levelDistribution,
    typeDistribution,
    avgWordCount: wordCountN > 0 ? Math.round(totalWords / wordCountN) : 0,
  };
}

// ── 목록 (전체 사용자) ──

export async function getAdminScripts(params: {
  page?: number;
  pageSize?: number;
  status?: string;
  search?: string;
  level?: string;
  type?: string;
}): Promise<PaginatedResult<AdminScriptListItem>> {
  const { supabase } = await requireAdmin();
  const page = params.page || 1;
  const pageSize = params.pageSize || 20;
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from(T.scripts)
    .select("id, user_id, question_id, source, title, topic, category, question_korean, target_grade, question_type, word_count, status, refine_count, created_at", { count: "exact" });

  if (params.status && params.status !== "all") {
    query = query.eq("status", params.status);
  }

  if (params.level && params.level !== "all") {
    query = query.eq("target_grade", params.level);
  }

  if (params.type && params.type !== "all") {
    query = query.eq("question_type", params.type);
  }

  // 검색: 이메일은 DB 필터 불가 → 검색 시 넉넉히 조회 후 클라이언트 필터
  const isSearching = !!params.search?.trim();
  const fetchSize = isSearching ? 200 : pageSize;
  const fetchOffset = isSearching ? 0 : offset;

  const { data, count } = await query
    .order("created_at", { ascending: false })
    .range(fetchOffset, fetchOffset + fetchSize - 1);

  if (!data) return { data: [], total: 0, page, pageSize };

  // 사용자 이메일 조회 (Promise.all 병렬화)
  const userIds = [...new Set(data.map((s) => s.user_id))];
  const emailResults = await Promise.all(
    userIds.map((uid) => supabase.auth.admin.getUserById(uid))
  );
  const emailMap = new Map<string, string>();
  emailResults.forEach((res, i) => {
    if (res.data?.user?.email) emailMap.set(userIds[i], res.data.user.email);
  });

  let items: AdminScriptListItem[] = data.map((s) => ({
    id: s.id,
    user_email: emailMap.get(s.user_id) || "-",
    question_id: s.question_id,
    source: s.source,
    title: s.title,
    topic: s.topic,
    category: s.category,
    question_korean: s.question_korean,
    target_grade: s.target_grade,
    question_type: s.question_type,
    word_count: s.word_count,
    status: s.status,
    refine_count: s.refine_count,
    created_at: s.created_at,
  }));

  // 검색: 이메일 + 질문 + 토픽 + 제목 클라이언트 필터
  if (isSearching) {
    const term = params.search!.trim().toLowerCase();
    items = items.filter(
      (s) =>
        s.user_email.toLowerCase().includes(term) ||
        s.question_korean?.toLowerCase().includes(term) ||
        s.topic?.toLowerCase().includes(term) ||
        s.title?.toLowerCase().includes(term)
    );
    const filteredTotal = items.length;
    // 수동 페이지네이션
    const start = (page - 1) * pageSize;
    items = items.slice(start, start + pageSize);
    return { data: items, total: filteredTotal, page, pageSize };
  }

  return { data: items, total: count || 0, page, pageSize };
}

// ── 삭제 (관리자) ──

export async function deleteAdminScript(
  scriptId: string
): Promise<{ error?: string }> {
  const { supabase, userId } = await requireAdmin();

  // 스크립트 존재 확인
  const { data: script } = await supabase
    .from(T.scripts)
    .select("id, user_id, question_korean, topic")
    .eq("id", scriptId)
    .single();

  if (!script) {
    return { error: "스크립트를 찾을 수 없습니다" };
  }

  // 1. Storage 파일 경로 수집
  const { data: packages } = await supabase
    .from(T.script_packages)
    .select("wav_file_path, json_file_path")
    .eq("script_id", scriptId);

  const filePaths = (packages || [])
    .flatMap((p) => [p.wav_file_path, p.json_file_path])
    .filter(Boolean) as string[];

  // 2. DB 삭제 먼저 (CASCADE로 packages도 삭제)
  const { error } = await supabase
    .from(T.scripts)
    .delete()
    .eq("id", scriptId);

  if (error) {
    console.error("[deleteAdminScript] DB error:", error.message, error.code, error.details);
    return { error: `스크립트 삭제에 실패했습니다: ${error.message}` };
  }

  // 3. Storage 파일 삭제 (DB 삭제 성공 후, 실패해도 무시)
  if (filePaths.length > 0) {
    try {
      await supabase.storage.from("script-packages").remove(filePaths);
    } catch {
      console.error("[deleteAdminScript] Storage cleanup failed for:", filePaths);
    }
  }

  // 감사 로그 기록
  await supabase.from(T.admin_audit_log).insert({
    admin_id: userId,
    action: "delete_script",
    target_type: "script",
    target_id: scriptId,
    details: {
      user_id: script.user_id,
      question_korean: script.question_korean,
      topic: script.topic,
    },
  });

  revalidatePath("/admin/scripts");
  return {};
}

// ── 상세 (사용자 화면 재사용용) ──

export async function getAdminScriptDetail(
  scriptId: string
): Promise<{ error?: string; data?: ScriptDetail }> {
  const { supabase } = await requireAdmin();

  const { data, error } = await supabase
    .from(T.scripts)
    .select(`
      *,
      script_packages(*)
    `)
    .eq("id", scriptId)
    .single();

  if (error || !data) {
    return { error: "스크립트를 찾을 수 없습니다" };
  }

  // questions 조회
  const { data: question } = await supabase
    .from(T.questions)
    .select("id, question_english, question_korean, topic, category, question_type_eng")
    .eq("id", data.question_id)
    .single();

  const detail: ScriptDetail = {
    ...data,
    package: Array.isArray(data.script_packages) && data.script_packages.length > 0
      ? data.script_packages[0]
      : null,
    question_detail: question ?? undefined,
  };

  return { data: detail };
}
