"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  PenTool,
  FolderOpen,
  Headphones,
  ArrowRight,
  FileText,
  Info,
  Trash2,
  Eye,
  CheckCircle2,
  Clock,
  ChevronRight,
} from "lucide-react";
import { getMyScripts, getShadowingHistory, deleteScript } from "@/lib/actions/scripts";
import type { ScriptListItem, ShadowingHistoryItem } from "@/lib/types/scripts";
import {
  SCRIPT_SOURCE_LABELS,
  SCRIPT_STATUS_LABELS,
  TARGET_LEVEL_SHORT_LABELS,
} from "@/lib/types/scripts";
import { ANSWER_TYPE_LABELS, ANSWER_TYPE_COLORS } from "@/lib/types/reviews";

/* ── 상수 ── */

const tabs = [
  { id: "create", label: "스크립트 생성", icon: PenTool },
  { id: "my", label: "내 스크립트", icon: FolderOpen },
  { id: "shadowing", label: "쉐도잉 훈련", icon: Headphones },
] as const;

type TabId = (typeof tabs)[number]["id"];

/* ── Props ── */

interface ScriptsContentProps {
  initialScripts?: ScriptListItem[];
  initialShadowingHistory?: ShadowingHistoryItem[];
}

/* ── 메인 컴포넌트 ── */

export function ScriptsContent({
  initialScripts,
  initialShadowingHistory,
}: ScriptsContentProps) {
  const [activeTab, setActiveTab] = useState<TabId>("create");

  return (
    <div>
      {/* 탭 네비게이션 */}
      <div className="mb-6 overflow-x-auto">
        <div className="flex min-w-max border-b border-border">
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 border-b-2 px-3 py-3 text-sm font-medium transition-colors sm:gap-2 sm:px-4 ${
                  active
                    ? "border-primary-500 text-primary-600"
                    : "border-transparent text-foreground-muted hover:border-border hover:text-foreground-secondary"
                }`}
              >
                <tab.icon size={16} className="hidden sm:block" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 탭 콘텐츠 */}
      {activeTab === "create" && <CreateTab />}
      {activeTab === "my" && <MyScriptsTab initialData={initialScripts} />}
      {activeTab === "shadowing" && (
        <ShadowingTab initialData={initialShadowingHistory} />
      )}
    </div>
  );
}

/* ── 스크립트 생성 탭 ── */

function CreateTab() {
  return (
    <div className="space-y-6">
      {/* 안내 배너 */}
      <div className="flex items-start gap-3 rounded-[var(--radius-xl)] border border-primary-200 bg-primary-50/50 p-4">
        <Info size={18} className="mt-0.5 shrink-0 text-primary-500" />
        <div>
          <p className="text-sm font-medium text-foreground">
            AI 맞춤 스크립트란?
          </p>
          <p className="mt-1 text-sm text-foreground-secondary">
            시험 빈출 주제와 내 경험을 조합하여, 자연스럽고 외우기 쉬운 영어
            답변 스크립트를 AI가 생성해 줍니다.
          </p>
        </div>
      </div>

      {/* 생성 시작 */}
      <Link
        href="/scripts/create"
        className="group flex items-center justify-between rounded-[var(--radius-xl)] border border-border bg-surface p-5 transition-all hover:border-primary-300 hover:shadow-sm"
      >
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-50">
            <PenTool size={18} className="text-primary-500" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">
              새 스크립트 생성
            </h3>
            <p className="mt-0.5 text-sm text-foreground-secondary">
              나의 소소한 일상이 가장 자연스러운 영어 대본이 됩니다
            </p>
          </div>
        </div>
        <ChevronRight
          size={16}
          className="shrink-0 text-foreground-muted transition-transform group-hover:translate-x-0.5"
        />
      </Link>

      {/* 생성 과정 안내 */}
      <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-6">
        <h3 className="font-semibold text-foreground">스크립트 생성 과정</h3>
        <p className="mt-1 text-sm text-foreground-secondary">
          3단계로 나만의 맞춤 스크립트를 완성합니다
        </p>

        <div className="mt-6 space-y-4">
          {[
            {
              step: 1,
              title: "주제·질문 선택",
              desc: "빈출 주제 목록에서 준비할 질문을 선택합니다",
            },
            {
              step: 2,
              title: "내 경험 입력 + 목표 등급 선택",
              desc: "한국어로 경험을 입력하고 목표 등급을 설정합니다",
            },
            {
              step: 3,
              title: "AI 스크립트 생성 → 확인 → 확정",
              desc: "AI가 생성한 답변을 확인하고, 최대 3회 수정 후 확정합니다",
            },
          ].map((s, i) => (
            <div key={s.step} className="flex items-start gap-4">
              <div className="flex flex-col items-center">
                <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-border bg-surface-secondary text-sm font-bold text-foreground-muted">
                  {s.step}
                </div>
                {i < 2 && <div className="mt-1 h-6 w-px bg-border" />}
              </div>
              <div className="pb-1">
                <p className="font-semibold text-foreground">{s.title}</p>
                <p className="text-sm text-foreground-secondary">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── 내 스크립트 탭 ── */

function MyScriptsTab({
  initialData,
}: {
  initialData?: ScriptListItem[];
}) {
  const queryClient = useQueryClient();

  const { data: scripts, isLoading } = useQuery({
    queryKey: ["my-scripts"],
    queryFn: async () => {
      const result = await getMyScripts();
      if (result.error) throw new Error(result.error);
      return result.data ?? [];
    },
    initialData,
    staleTime: 5 * 60 * 1000,
  });

  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(scriptId: string) {
    if (!confirm("이 스크립트를 삭제하시겠습니까? 연결된 패키지도 함께 삭제됩니다.")) return;
    setDeletingId(scriptId);
    try {
      const result = await deleteScript(scriptId);
      if (result.error) {
        alert(result.error);
      } else {
        queryClient.invalidateQueries({ queryKey: ["my-scripts"] });
      }
    } finally {
      setDeletingId(null);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (!scripts?.length) {
    return (
      <div className="space-y-6">
        <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-6">
          <h3 className="font-semibold text-foreground">내 스크립트 목록</h3>
          <div className="mt-6 flex flex-col items-center py-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-secondary">
              <FileText size={24} className="text-foreground-muted" />
            </div>
            <p className="mt-3 text-sm font-medium text-foreground-secondary">
              아직 생성한 스크립트가 없습니다
            </p>
            <p className="mt-1 text-xs text-foreground-muted">
              스크립트를 생성하면 여기에서 관리할 수 있습니다
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {scripts.map((script) => (
        <ScriptCard
          key={script.id}
          script={script}
          onDelete={handleDelete}
          isDeleting={deletingId === script.id}
        />
      ))}
    </div>
  );
}

/* ── 스크립트 카드 ── */

function ScriptCard({
  script,
  onDelete,
  isDeleting,
}: {
  script: ScriptListItem;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}) {
  const answerTypeLabel =
    script.answer_type && ANSWER_TYPE_LABELS[script.answer_type]
      ? ANSWER_TYPE_LABELS[script.answer_type]
      : script.answer_type;

  const answerTypeColor =
    script.answer_type && ANSWER_TYPE_COLORS[script.answer_type]
      ? ANSWER_TYPE_COLORS[script.answer_type]
      : "bg-gray-100 text-gray-700";

  const levelLabel =
    script.target_level
      ? TARGET_LEVEL_SHORT_LABELS[script.target_level] || script.target_level
      : null;

  const preview =
    script.english_text?.length > 120
      ? script.english_text.slice(0, 120) + "..."
      : script.english_text || "(생성 중...)";

  return (
    <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-4 transition-colors hover:border-primary-200">
      {/* 상단: 뱃지 + 메타 */}
      <div className="flex flex-wrap items-center gap-2">
        {/* answer_type 뱃지 */}
        {script.answer_type && (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${answerTypeColor}`}
          >
            {answerTypeLabel}
          </span>
        )}
        {/* 등급 뱃지 */}
        {levelLabel && (
          <span className="rounded-full bg-primary-50 px-2 py-0.5 text-xs font-semibold text-primary-600">
            {levelLabel}
          </span>
        )}
        {/* 소스 뱃지 */}
        <span className="text-xs text-foreground-muted">
          {SCRIPT_SOURCE_LABELS[script.source]}
        </span>
        {/* 상태 */}
        <span className="ml-auto flex items-center gap-1 text-xs">
          {script.status === "confirmed" ? (
            <>
              <CheckCircle2 size={12} className="text-green-500" />
              <span className="text-green-600">확정</span>
            </>
          ) : (
            <>
              <Clock size={12} className="text-foreground-muted" />
              <span className="text-foreground-muted">초안</span>
            </>
          )}
        </span>
      </div>

      {/* 주제 + 질문 */}
      <div className="mt-2">
        {script.topic && (
          <p className="text-sm font-medium text-foreground">{script.topic}</p>
        )}
        {script.question_korean && (
          <p className="mt-0.5 text-xs text-foreground-secondary line-clamp-1">
            {script.question_korean}
          </p>
        )}
      </div>

      {/* 미리보기 */}
      <p className="mt-2 text-sm text-foreground-secondary line-clamp-2">
        {preview}
      </p>

      {/* 하단: 단어 수 + 액션 */}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-foreground-muted">
          {script.word_count && (
            <span>{script.word_count}단어</span>
          )}
          {script.refine_count > 0 && (
            <span>수정 {script.refine_count}/3</span>
          )}
          {script.package && (
            <span className="text-primary-500">
              패키지 {script.package.status === "completed" ? "완료" : `${script.package.progress}%`}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Link
            href={`/scripts/create?view=${script.id}`}
            className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium text-foreground-secondary transition-colors hover:bg-surface-secondary hover:text-foreground"
          >
            <Eye size={12} />
            보기
          </Link>
          <button
            onClick={() => onDelete(script.id)}
            disabled={isDeleting}
            className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium text-red-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
          >
            <Trash2 size={12} />
            삭제
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── 쉐도잉 훈련 탭 ── */

function ShadowingTab({
  initialData,
}: {
  initialData?: ShadowingHistoryItem[];
}) {
  const { data: history, isLoading } = useQuery({
    queryKey: ["shadowing-history"],
    queryFn: async () => {
      const result = await getShadowingHistory();
      if (result.error) throw new Error(result.error);
      return result.data ?? [];
    },
    initialData,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="space-y-6">
      {/* 안내 */}
      <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-6">
        <h3 className="font-semibold text-foreground">쉐도잉 훈련</h3>
        <p className="mt-1 text-sm text-foreground-secondary">
          생성한 스크립트를 원어민 음성으로 듣고, 따라 읽으며 입에 붙입니다.
        </p>

        {isLoading ? (
          <div className="mt-6 flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
          </div>
        ) : !history?.length ? (
          <div className="mt-6 flex flex-col items-center py-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-secondary">
              <Headphones size={24} className="text-foreground-muted" />
            </div>
            <p className="mt-3 text-sm font-medium text-foreground-secondary">
              쉐도잉 훈련 이력이 없습니다
            </p>
            <p className="mt-1 text-xs text-foreground-muted">
              스크립트의 패키지를 생성한 후 쉐도잉 훈련을 시작할 수 있습니다
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {history.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between rounded-lg border border-border bg-surface-secondary/50 p-3"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {session.topic || "주제 없음"}
                  </p>
                  {session.question_korean && (
                    <p className="mt-0.5 text-xs text-foreground-secondary line-clamp-1">
                      {session.question_korean}
                    </p>
                  )}
                  <div className="mt-1 flex items-center gap-2 text-xs text-foreground-muted">
                    <span>
                      {new Date(session.started_at).toLocaleDateString("ko-KR")}
                    </span>
                    {session.evaluation?.overall_score != null && (
                      <span className="font-medium text-primary-500">
                        {session.evaluation.overall_score}점
                      </span>
                    )}
                    {session.evaluation?.estimated_level && (
                      <span className="rounded bg-primary-50 px-1.5 py-0.5 text-xs font-semibold text-primary-600">
                        {session.evaluation.estimated_level}
                      </span>
                    )}
                  </div>
                </div>
                <Link
                  href={`/scripts/shadowing?session=${session.id}`}
                  className="inline-flex h-8 items-center gap-1 rounded-lg px-3 text-xs font-medium text-primary-500 transition-colors hover:bg-primary-50"
                >
                  상세
                  <ArrowRight size={12} />
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
