"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, FileText } from "lucide-react";
import {
  getAdminScriptStats,
  getAdminScripts,
  getAdminScriptDetail,
  type AdminScriptListItem,
  type AdminScriptStats,
} from "@/lib/actions/admin/scripts";
import type { ScriptDetail, ScriptParagraph } from "@/lib/types/scripts";
import { ScriptRenderer, ScriptSummaryView } from "@/components/scripts/create/script-renderer";

// ── question_type 한글 매핑 ──

const QUESTION_TYPE_LABELS: Record<string, string> = {
  description: "묘사",
  routine: "루틴",
  comparison: "비교",
  past_experience_memorable: "경험(기억)",
  past_experience_change: "경험(변화)",
  past_experience_childhood: "경험(어린시절)",
  comparison_change: "비교변화",
  social_issue: "사회적이슈",
  ask_questions: "질문하기",
  suggest_alternative: "대안제시",
  // 축약 변형 대응
  past_memorable: "경험(기억)",
  past_change: "경험(변화)",
  past_childhood: "경험(어린시절)",
};

function getQuestionTypeLabel(type: string | null): string {
  if (!type) return "-";
  return QUESTION_TYPE_LABELS[type] || type;
}

// ── question_type 뱃지 컬러 ──

function getQuestionTypeColor(type: string | null): string {
  if (!type) return "bg-gray-100 text-gray-500";
  const colors: Record<string, string> = {
    description: "bg-sky-50 text-sky-700",
    routine: "bg-teal-50 text-teal-700",
    comparison: "bg-violet-50 text-violet-700",
    past_experience_memorable: "bg-rose-50 text-rose-700",
    past_experience_change: "bg-orange-50 text-orange-700",
    past_experience_childhood: "bg-pink-50 text-pink-700",
    comparison_change: "bg-indigo-50 text-indigo-700",
    social_issue: "bg-red-50 text-red-700",
    ask_questions: "bg-emerald-50 text-emerald-700",
    suggest_alternative: "bg-amber-50 text-amber-700",
    past_memorable: "bg-rose-50 text-rose-700",
    past_change: "bg-orange-50 text-orange-700",
    past_childhood: "bg-pink-50 text-pink-700",
  };
  return colors[type] || "bg-gray-100 text-gray-600";
}

// ── 통계 뷰 (모의고사 스타일) ──

function ScriptStatsView({ stats }: { stats: AdminScriptStats }) {
  // 등급 순서
  const levelOrder = ["AL", "IH", "IM3", "IM2", "IM1", "IL", "NH", "NM", "NL"];
  const levelColors: Record<string, string> = {
    AL: "bg-purple-100 text-purple-800",
    IH: "bg-blue-100 text-blue-800",
    IM3: "bg-sky-100 text-sky-800",
    IM2: "bg-teal-100 text-teal-700",
    IM1: "bg-emerald-100 text-emerald-700",
    IL: "bg-amber-100 text-amber-800",
    NH: "bg-orange-100 text-orange-700",
    NM: "bg-red-100 text-red-700",
    NL: "bg-red-100 text-red-700",
  };

  // 가장 많은 등급
  const topLevel = Object.entries(stats.levelDistribution)
    .sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="space-y-4">
      {/* 메인 통계 카드 */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
        {[
          { label: "전체 스크립트", value: stats.total, sub: null, bg: "bg-surface" },
          { label: "오늘 생성", value: stats.today, sub: null, bg: "bg-blue-50" },
          { label: "확정", value: stats.confirmed, sub: `${stats.total > 0 ? Math.round((stats.confirmed / stats.total) * 100) : 0}%`, bg: "bg-green-50" },
          { label: "평균 단어 수", value: stats.avgWordCount, sub: "단어", bg: "bg-surface" },
          { label: "최다 등급", value: topLevel?.[0] || "-", sub: topLevel ? `${topLevel[1]}건` : null, bg: "bg-primary-50" },
        ].map((item) => (
          <div key={item.label} className={`rounded-lg border border-border ${item.bg} px-3.5 py-2.5`}>
            <div className="text-[11px] text-foreground-muted">{item.label}</div>
            <div className="mt-0.5 flex items-baseline gap-1">
              <span className="text-lg font-bold tabular-nums text-foreground">{item.value}</span>
              {item.sub && <span className="text-xs text-foreground-muted">{item.sub}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* 등급별 분포 + 타입별 분포 */}
      <div className="grid gap-3 md:grid-cols-2">
        {/* 등급 분포 */}
        {Object.keys(stats.levelDistribution).length > 0 && (
          <div className="rounded-lg border border-border bg-surface px-3.5 py-2.5">
            <div className="mb-2 text-[11px] font-medium text-foreground-muted">등급별 분포</div>
            <div className="flex flex-wrap gap-1.5">
              {levelOrder
                .filter((lv) => stats.levelDistribution[lv])
                .map((lv) => (
                  <span key={lv} className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-semibold ${levelColors[lv] || "bg-gray-100 text-gray-700"}`}>
                    {lv}
                    <span className="font-normal opacity-70">{stats.levelDistribution[lv]}</span>
                  </span>
                ))}
            </div>
          </div>
        )}

        {/* 타입 분포 */}
        {Object.keys(stats.typeDistribution).length > 0 && (
          <div className="rounded-lg border border-border bg-surface px-3.5 py-2.5">
            <div className="mb-2 text-[11px] font-medium text-foreground-muted">질문 타입별 분포</div>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(stats.typeDistribution)
                .sort((a, b) => b[1] - a[1])
                .map(([type, count]) => (
                  <span key={type} className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium ${getQuestionTypeColor(type)}`}>
                    {getQuestionTypeLabel(type)}
                    <span className="font-normal opacity-70">{count}</span>
                  </span>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── 상세 뷰 (사용자 화면 재사용) ──

function ScriptDetailView({
  scriptId,
  onBack,
}: {
  scriptId: string;
  onBack: () => void;
}) {
  const { data: result, isLoading } = useQuery({
    queryKey: ["admin-script-detail", scriptId],
    queryFn: () => getAdminScriptDetail(scriptId),
    staleTime: 5 * 60 * 1000,
  });

  const script = result?.data;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-primary-400" />
      </div>
    );
  }

  if (!script || result?.error) {
    return (
      <div className="py-10 text-center text-sm text-foreground-secondary">
        스크립트를 불러올 수 없습니다.
      </div>
    );
  }

  const paragraphs = (script.paragraphs as { paragraphs?: ScriptParagraph[] } | null)?.paragraphs;
  const output = script.paragraphs as ScriptDetail["paragraphs"] & {
    structure_summary?: unknown[];
    key_sentences?: unknown[];
    key_expressions?: unknown[];
    discourse_markers?: unknown[];
    reusable_patterns?: unknown[];
    similar_questions?: unknown[];
    expansion_ideas?: string[];
    connectors?: string[];
    fillers?: string[];
    full_text?: { english: string };
  };

  return (
    <div>
      {/* 헤더 */}
      <div className="mb-4 flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-foreground-secondary transition-colors hover:bg-surface-secondary hover:text-foreground"
        >
          <ArrowLeft size={14} />
          목록
        </button>
        <div className="flex-1">
          <h2 className="text-base font-semibold text-foreground">
            {script.question_korean || script.title || "스크립트"}
          </h2>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-foreground-muted">
            <span className="rounded bg-surface-secondary px-1.5 py-0.5 font-medium text-foreground-secondary">{script.topic}</span>
            {script.question_type && (
              <span className={`rounded px-1.5 py-0.5 font-medium ${getQuestionTypeColor(script.question_type)}`}>
                {getQuestionTypeLabel(script.question_type)}
              </span>
            )}
            {script.target_level && (
              <span className="rounded bg-primary-50 px-1.5 py-0.5 font-semibold text-primary-700">
                {script.target_level}
              </span>
            )}
            <span>{script.word_count}단어</span>
            <span className={`rounded px-1.5 py-0.5 font-medium ${
              script.status === "confirmed" ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
            }`}>
              {script.status === "confirmed" ? "확정" : "초안"}
            </span>
          </div>
        </div>
      </div>

      {/* 스크립트 뷰어 (사용자 화면 동일) */}
      {paragraphs && paragraphs.length > 0 && (
        <div className="mb-6">
          <ScriptRenderer paragraphs={paragraphs} mode="both" />
        </div>
      )}

      {/* 핵심 정리 (사용자 화면 동일) */}
      {output && (
        <ScriptSummaryView
          fullTextEnglish={output.full_text?.english}
          paragraphs={paragraphs}
          structureSummary={output.structure_summary as never[]}
          keySentences={output.key_sentences as never[]}
          keyExpressions={output.key_expressions as never[]}
          discourseMarkers={output.discourse_markers as never[]}
          reusablePatterns={output.reusable_patterns as never[]}
          similarQuestions={output.similar_questions as never[]}
          expansionIdeas={output.expansion_ideas}
          targetLevel={script.target_level}
          connectors={output.connectors}
          fillers={output.fillers}
        />
      )}
    </div>
  );
}

// ── 메인 페이지 ──

export default function AdminScriptsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: stats } = useQuery({
    queryKey: ["admin-script-stats"],
    queryFn: () => getAdminScriptStats(),
    staleTime: 60_000,
  });

  const { data: listResult, isLoading } = useQuery({
    queryKey: ["admin-scripts", page, statusFilter],
    queryFn: () => getAdminScripts({ page, pageSize: 20, status: statusFilter }),
    staleTime: 30_000,
  });

  const list = listResult?.data || [];
  const total = listResult?.total || 0;
  const totalPages = Math.ceil(total / 20);

  // 상세 뷰 모드
  if (selectedId) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-foreground">스크립트 관리</h1>
        <ScriptDetailView
          scriptId={selectedId}
          onBack={() => setSelectedId(null)}
        />
      </div>
    );
  }

  const filterOptions = [
    { key: "all", label: "전체", count: stats?.total },
    { key: "confirmed", label: "확정", count: stats?.confirmed },
    { key: "draft", label: "초안", count: stats?.draft },
  ];

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-foreground">스크립트 관리</h1>

      {/* 통계 (모의고사 스타일) */}
      {stats && <ScriptStatsView stats={stats} />}

      {/* 필터 */}
      <div className="flex gap-1">
        {filterOptions.map((f) => (
          <button
            key={f.key}
            onClick={() => { setStatusFilter(f.key); setPage(1); }}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              statusFilter === f.key
                ? "bg-primary-500 text-white"
                : "bg-surface-secondary text-foreground-secondary hover:text-foreground"
            }`}
          >
            {f.label}
            {f.count !== undefined && f.count > 0 && (
              <span className={`inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1 text-[10px] font-semibold leading-none ${
                statusFilter === f.key
                  ? "bg-white/25 text-white"
                  : "bg-foreground/10 text-foreground-muted"
              }`}>
                {f.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 리스트 */}
      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 size={20} className="animate-spin text-primary-400" />
          </div>
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16">
            <FileText size={32} className="text-foreground-muted/50" />
            <span className="text-sm text-foreground-muted">스크립트가 없습니다.</span>
          </div>
        ) : (
          list.map((item, idx) => (
            <button
              key={item.id}
              onClick={() => setSelectedId(item.id)}
              className={`group flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface-secondary ${
                idx < list.length - 1 ? "border-b border-border/50" : ""
              }`}
            >
              {/* 왼쪽: 질문+메타 */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-foreground group-hover:text-primary-700">
                    {item.question_korean || item.title || "-"}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-foreground-muted">
                  <span className="truncate">{item.user_email}</span>
                  <span className="text-border">·</span>
                  {item.topic && (
                    <>
                      <span>{item.topic}</span>
                      <span className="text-border">·</span>
                    </>
                  )}
                  {(item.word_count ?? 0) > 0 && (
                    <>
                      <span>{item.word_count}단어</span>
                      <span className="text-border">·</span>
                    </>
                  )}
                  <span>
                    {new Date(item.created_at).toLocaleDateString("ko-KR", {
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </div>
              </div>

              {/* 오른쪽: 뱃지 */}
              <div className="flex shrink-0 items-center gap-1.5 pt-0.5">
                {/* 질문 타입 */}
                {item.question_type && (
                  <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${getQuestionTypeColor(item.question_type)}`}>
                    {getQuestionTypeLabel(item.question_type)}
                  </span>
                )}
                {/* 등급 */}
                {item.target_level && (
                  <span className="rounded bg-primary-50 px-1.5 py-0.5 text-xs font-semibold text-primary-700">
                    {item.target_level}
                  </span>
                )}
                {/* 상태 */}
                <span
                  className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${
                    item.status === "confirmed"
                      ? "bg-green-50 text-green-700"
                      : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {item.status === "confirmed" ? "확정" : "초안"}
                </span>
              </div>
            </button>
          ))
        )}
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-foreground-secondary transition-colors hover:bg-surface-secondary disabled:opacity-40"
          >
            이전
          </button>
          <span className="text-xs tabular-nums text-foreground-muted">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-foreground-secondary transition-colors hover:bg-surface-secondary disabled:opacity-40"
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
}
