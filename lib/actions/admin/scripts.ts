"use server";

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
  target_level: string | null;
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
    supabase.from("scripts").select("id", { count: "exact", head: true }),
    supabase
      .from("scripts")
      .select("id", { count: "exact", head: true })
      .gte("created_at", todayStart.toISOString()),
    supabase
      .from("scripts")
      .select("id", { count: "exact", head: true })
      .eq("status", "confirmed"),
    supabase
      .from("scripts")
      .select("id", { count: "exact", head: true })
      .eq("status", "draft"),
    supabase
      .from("scripts")
      .select("target_level, question_type, word_count"),
  ]);

  // 등급별, 타입별 분포 계산
  const levelDistribution: Record<string, number> = {};
  const typeDistribution: Record<string, number> = {};
  let totalWords = 0;
  let wordCountN = 0;
  for (const s of distributionRes.data || []) {
    if (s.target_level) {
      levelDistribution[s.target_level] = (levelDistribution[s.target_level] || 0) + 1;
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
}): Promise<PaginatedResult<AdminScriptListItem>> {
  const { supabase } = await requireAdmin();
  const page = params.page || 1;
  const pageSize = params.pageSize || 20;
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from("scripts")
    .select("id, user_id, question_id, source, title, topic, category, question_korean, target_level, question_type, word_count, status, refine_count, created_at", { count: "exact" });

  if (params.status && params.status !== "all") {
    query = query.eq("status", params.status);
  }

  const { data, count } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (!data) return { data: [], total: 0, page, pageSize };

  // 사용자 이메일 조회
  const userIds = [...new Set(data.map((s) => s.user_id))];
  const emailMap = new Map<string, string>();
  for (const uid of userIds) {
    const { data: u } = await supabase.auth.admin.getUserById(uid);
    if (u?.user?.email) emailMap.set(uid, u.user.email);
  }

  const items: AdminScriptListItem[] = data.map((s) => ({
    id: s.id,
    user_email: emailMap.get(s.user_id) || "-",
    question_id: s.question_id,
    source: s.source,
    title: s.title,
    topic: s.topic,
    category: s.category,
    question_korean: s.question_korean,
    target_level: s.target_level,
    question_type: s.question_type,
    word_count: s.word_count,
    status: s.status,
    refine_count: s.refine_count,
    created_at: s.created_at,
  }));

  return { data: items, total: count || 0, page, pageSize };
}

// ── 상세 (사용자 화면 재사용용) ──

export async function getAdminScriptDetail(
  scriptId: string
): Promise<{ error?: string; data?: ScriptDetail }> {
  const { supabase } = await requireAdmin();

  const { data, error } = await supabase
    .from("scripts")
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
    .from("questions")
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
