"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getAdminQuestions,
  getPromptTemplates,
  getEvalPrompts,
  getOpicTips,
  getScriptSpecs,
  updatePromptTemplate,
  updateEvalPrompt,
} from "@/lib/actions/admin/content";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { PromptEditor } from "@/components/admin/prompt-editor";

type TabKey = "questions" | "prompts" | "eval_prompts" | "tips" | "specs";

const TABS: { key: TabKey; label: string }[] = [
  { key: "questions", label: "질문 DB" },
  { key: "prompts", label: "AI 프롬프트" },
  { key: "eval_prompts", label: "평가 프롬프트" },
  { key: "tips", label: "학습 팁" },
  { key: "specs", label: "스크립트 규격서" },
];

export default function AdminContentPage() {
  const [tab, setTab] = useState<TabKey>("questions");

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-foreground">콘텐츠 관리</h1>

      {/* 탭 */}
      <div className="flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.key
                ? "border-primary-500 text-primary-600"
                : "border-transparent text-foreground-secondary hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "questions" && <QuestionsTab />}
      {tab === "prompts" && <PromptsTab />}
      {tab === "eval_prompts" && <EvalPromptsTab />}
      {tab === "tips" && <TipsTab />}
      {tab === "specs" && <SpecsTab />}
    </div>
  );
}

// ── 질문 DB 탭 ──
function QuestionsTab() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getAdminQuestions({ page, pageSize: 30 });
      setData(result.data);
      setTotal(result.total);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetch(); }, [fetch]);

  const columns = [
    { key: "id", label: "ID", className: "w-24" },
    { key: "topic", label: "주제" },
    { key: "category", label: "카테고리" },
    { key: "question_short", label: "질문 (요약)" },
    { key: "question_type_kor", label: "유형" },
    { key: "survey_type", label: "서베이" },
  ];

  if (loading) return <LoadingSkeleton />;
  return (
    <AdminDataTable
      columns={columns}
      data={data}
      total={total}
      page={page}
      pageSize={30}
      onPageChange={setPage}
    />
  );
}

// ── AI 프롬프트 탭 ──
function PromptsTab() {
  const [templates, setTemplates] = useState<{ id: string; name: string; content: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPromptTemplates().then((data) => {
      setTemplates(data);
      setLoading(false);
    });
  }, []);

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-4">
      {templates.map((t) => (
        <PromptEditor
          key={t.id}
          id={t.id}
          name={t.name}
          initialContent={t.content}
          onSave={updatePromptTemplate}
        />
      ))}
      {templates.length === 0 && (
        <p className="py-8 text-center text-sm text-foreground-muted">프롬프트 템플릿이 없습니다</p>
      )}
    </div>
  );
}

// ── 평가 프롬프트 탭 ──
function EvalPromptsTab() {
  const [prompts, setPrompts] = useState<{ id: string; name: string; content: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getEvalPrompts().then((data) => {
      setPrompts(data);
      setLoading(false);
    });
  }, []);

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-4">
      {prompts.map((p) => (
        <PromptEditor
          key={p.id}
          id={p.id}
          name={p.name}
          initialContent={p.content}
          onSave={updateEvalPrompt}
        />
      ))}
      {prompts.length === 0 && (
        <p className="py-8 text-center text-sm text-foreground-muted">평가 프롬프트가 없습니다</p>
      )}
    </div>
  );
}

// ── 학습 팁 탭 ──
function TipsTab() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getOpicTips({ page, pageSize: 30 });
      setData(result.data);
      setTotal(result.total);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetch(); }, [fetch]);

  const columns = [
    { key: "category", label: "카테고리" },
    { key: "question_type", label: "질문 유형" },
    { key: "title", label: "제목" },
    {
      key: "expression",
      label: "표현",
      render: (row: Record<string, unknown>) => (
        <span className="line-clamp-2 text-xs">{String(row.expression || "")}</span>
      ),
    },
  ];

  if (loading) return <LoadingSkeleton />;
  return (
    <AdminDataTable
      columns={columns}
      data={data}
      total={total}
      page={page}
      pageSize={30}
      onPageChange={setPage}
    />
  );
}

// ── 스크립트 규격서 탭 ──
function SpecsTab() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getScriptSpecs({ page, pageSize: 30 });
      setData(result.data);
      setTotal(result.total);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetch(); }, [fetch]);

  const columns = [
    { key: "target_level", label: "등급" },
    { key: "question_type", label: "질문 유형" },
    { key: "total_slots", label: "슬롯" },
    {
      key: "slot_structure",
      label: "구조",
      render: (row: Record<string, unknown>) => (
        <span className="line-clamp-1 text-xs">{String(row.slot_structure || "")}</span>
      ),
    },
  ];

  if (loading) return <LoadingSkeleton />;
  return (
    <AdminDataTable
      columns={columns}
      data={data}
      total={total}
      page={page}
      pageSize={30}
      onPageChange={setPage}
    />
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-14 animate-pulse rounded-lg border border-border bg-surface-secondary" />
      ))}
    </div>
  );
}
