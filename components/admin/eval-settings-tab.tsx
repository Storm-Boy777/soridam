"use client";

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Save, RotateCcw, ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { getEvalSettings, updateEvalSettings } from "@/lib/actions/admin/content";
import { getTaskChecklists, updateTaskChecklist } from "@/lib/actions/admin/mock-exam";
import type { MockTestEvalSettings, TaskFulfillmentChecklist } from "@/lib/types/mock-exam";

// ── 안전한 숫자 변환 (NaN 방지) ──
function safeNumber(value: unknown, fallback: number): number {
  if (value == null) return fallback;
  const n = Number(value);
  return Number.isNaN(n) ? fallback : n;
}

// ── 평가엔진 기본값 ──
const RE_DEFAULTS: Record<string, number> = {
  re_checkbox_pass_threshold: 0.80,
  re_floor_nh: 0.45,
  re_floor_il: 0.65,
  re_floor_im1: 0.75,
  re_floor_im2: 0.95,
  re_ceiling_broke_down: 0.70,
  re_ceiling_respond: 0.90,
  re_sympathetic_low: 50,
  re_sympathetic_mid: 70,
  re_sympathetic_at_times: 85,
  re_sympathetic_pron_weight: 0.60,
  re_al_pass_threshold: 0.70,
  re_q12_gatekeeper_threshold: 0.50,
};

// ── GPT 모델 기본값 ──
const GPT_DEFAULTS: Record<string, string | number> = {
  judge_model: "gpt-4.1-mini",
  judge_temperature: 0.20,
  judge_max_tokens: 6000,
  coach_model: "gpt-4.1",
  coach_temperature: 0.40,
  coach_max_tokens: 8000,
  report_model: "gpt-4.1",
  report_temperature: 0.40,
  report_max_tokens: 12000,
  growth_model: "gpt-4.1-mini",
  growth_temperature: 0.50,
  growth_max_tokens: 3000,
};

const MODEL_OPTIONS = ["gpt-4.1", "gpt-4.1-mini", "gpt-4o-mini"];

// ── 유형별 활성화 토글 키 매핑 ──
const TOGGLE_KEYS: { key: string; label: string }[] = [
  { key: "enabled_description", label: "묘사" },
  { key: "enabled_routine", label: "루틴/습관" },
  { key: "enabled_asking_questions", label: "질문하기 RP" },
  { key: "enabled_comparison", label: "비교/변화" },
  { key: "enabled_past_experience", label: "과거 경험" },
  { key: "enabled_suggest_alternatives", label: "대안 제시 RP" },
  { key: "enabled_comparison_change", label: "사회 비교/변화" },
  { key: "enabled_social_issue", label: "의견 제시/주장" },
];

// ============================================================
// 메인 컴포넌트
// ============================================================

export function EvalSettingsTab() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ["admin-eval-settings"],
    queryFn: () => getEvalSettings() as Promise<MockTestEvalSettings>,
    staleTime: 5 * 60 * 1000,
  });

  const { data: checklists, isLoading: checklistsLoading } = useQuery({
    queryKey: ["admin-task-checklists"],
    queryFn: () => getTaskChecklists() as Promise<TaskFulfillmentChecklist[]>,
    staleTime: 5 * 60 * 1000,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-eval-settings"] });
    queryClient.invalidateQueries({ queryKey: ["admin-task-checklists"] });
  };

  if (settingsLoading || checklistsLoading || !settings) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-primary-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <RuleEngineSection settings={settings} onSaved={invalidateAll} />
      <GptModelSection settings={settings} onSaved={invalidateAll} />
      <ToggleSection settings={settings} onSaved={invalidateAll} />
      <ChecklistSection checklists={checklists || []} onSaved={invalidateAll} />
    </div>
  );
}

// ============================================================
// 섹션 A: 평가엔진 Threshold
// ============================================================

function RuleEngineSection({
  settings,
  onSaved,
}: {
  settings: MockTestEvalSettings;
  onSaved: () => void;
}) {
  const [values, setValues] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const v: Record<string, number> = {};
    for (const key of Object.keys(RE_DEFAULTS)) {
      v[key] = safeNumber((settings as unknown as Record<string, unknown>)[key], RE_DEFAULTS[key]);
    }
    setValues(v);
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await updateEvalSettings(values);
      if (result.success) {
        toast.success("평가엔진 설정 저장 완료");
        onSaved();
      } else {
        toast.error(result.error || "저장 실패");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setValues({ ...RE_DEFAULTS });
  };

  const groups = [
    {
      title: "Floor (최소 기준)",
      items: [
        { key: "re_floor_nh", label: "NH Floor", desc: "INT pass_rate < 이 값 → NH", step: 0.05 },
        { key: "re_floor_il", label: "IL Floor", desc: "INT pass_rate < 이 값 → IL", step: 0.05 },
        { key: "re_floor_im1", label: "IM1 Floor", desc: "INT pass_rate < 이 값 → IM1", step: 0.05 },
        { key: "re_floor_im2", label: "IM2 Floor", desc: "INT pass_rate ≥ 이 값 → IM2+", step: 0.05 },
      ],
    },
    {
      title: "Ceiling (상한 제한)",
      items: [
        { key: "re_ceiling_broke_down", label: "Broke Down", desc: "ADV pass_rate < 이 값 → IM2 상한", step: 0.05 },
        { key: "re_ceiling_respond", label: "Respond", desc: "ADV pass_rate ≥ 이 값 → IH 가능", step: 0.05 },
      ],
    },
    {
      title: "Sympathetic Listener (발음 보정)",
      items: [
        { key: "re_sympathetic_low", label: "Low 기준", desc: "발음 < 이 값 → 1등급 하락", step: 5 },
        { key: "re_sympathetic_mid", label: "Mid 기준", desc: "발음 < 이 값 → 제한적 상향 불가", step: 5 },
        { key: "re_sympathetic_at_times", label: "At Times", desc: "발음 < 이 값 → IH 제한", step: 5 },
        { key: "re_sympathetic_pron_weight", label: "발음 가중치", desc: "accuracy×이 값 + prosody×나머지", step: 0.05 },
      ],
    },
    {
      title: "기타",
      items: [
        { key: "re_checkbox_pass_threshold", label: "체크박스 Pass", desc: "체크박스 통과 기준", step: 0.05 },
        { key: "re_al_pass_threshold", label: "AL Pass", desc: "AL 체크박스 통과 기준", step: 0.05 },
        { key: "re_q12_gatekeeper_threshold", label: "Q12 Gatekeeper", desc: "Q12 게이트키퍼 기준", step: 0.05 },
      ],
    },
  ];

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground">평가엔진 Threshold</h3>
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-foreground-secondary transition-colors hover:bg-surface-secondary"
          >
            <RotateCcw size={12} />
            기본값 복원
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1 rounded-lg bg-primary-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary-600 disabled:opacity-50"
          >
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
            저장
          </button>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {groups.map((group) => (
          <div key={group.title} className="space-y-2.5">
            <h4 className="text-xs font-semibold text-foreground-secondary">{group.title}</h4>
            {group.items.map((item) => (
              <div key={item.key} className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-medium text-foreground">{item.label}</span>
                  <span className="ml-2 text-[10px] text-foreground-muted">{item.desc}</span>
                </div>
                <input
                  type="number"
                  step={item.step}
                  value={values[item.key] ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, [item.key]: Number(e.target.value) }))}
                  className="w-20 rounded-md border border-border bg-background px-2 py-1 text-right text-xs tabular-nums text-foreground focus:border-primary-400 focus:outline-none"
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// 섹션 B: GPT 모델 설정
// ============================================================

function GptModelSection({
  settings,
  onSaved,
}: {
  settings: MockTestEvalSettings;
  onSaved: () => void;
}) {
  const [values, setValues] = useState<Record<string, string | number>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const v: Record<string, string | number> = {};
    for (const [key, def] of Object.entries(GPT_DEFAULTS)) {
      const raw = (settings as unknown as Record<string, unknown>)[key];
      v[key] = raw != null ? (raw as string | number) : def;
    }
    setValues(v);
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await updateEvalSettings(values);
      if (result.success) {
        toast.success("GPT 모델 설정 저장 완료");
        onSaved();
      } else {
        toast.error(result.error || "저장 실패");
      }
    } finally {
      setSaving(false);
    }
  };

  const cards = [
    { prefix: "judge", label: "Judge (체크박스 평가)", desc: "gpt-4.1-mini 기본" },
    { prefix: "coach", label: "Coach (코칭 생성)", desc: "gpt-4.1 기본" },
    { prefix: "report", label: "Report (종합 리포트)", desc: "gpt-4.1 기본" },
    { prefix: "growth", label: "Growth (성장 분석)", desc: "gpt-4.1-mini 기본" },
  ];

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground">GPT 모델 설정</h3>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1 rounded-lg bg-primary-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary-600 disabled:opacity-50"
        >
          {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
          저장
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {cards.map((card) => (
          <div key={card.prefix} className="rounded-lg border border-border/50 bg-background p-3">
            <div className="mb-2">
              <span className="text-xs font-semibold text-foreground">{card.label}</span>
              <span className="ml-2 text-[10px] text-foreground-muted">{card.desc}</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="w-14 text-[10px] text-foreground-secondary">모델</label>
                <select
                  value={(values[`${card.prefix}_model`] as string) || ""}
                  onChange={(e) => setValues((v) => ({ ...v, [`${card.prefix}_model`]: e.target.value }))}
                  className="flex-1 rounded-md border border-border bg-surface px-2 py-1 text-xs text-foreground focus:border-primary-400 focus:outline-none"
                >
                  {MODEL_OPTIONS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="w-14 text-[10px] text-foreground-secondary">온도</label>
                <input
                  type="number"
                  step={0.05}
                  min={0}
                  max={2}
                  value={values[`${card.prefix}_temperature`] ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, [`${card.prefix}_temperature`]: Number(e.target.value) }))}
                  className="flex-1 rounded-md border border-border bg-surface px-2 py-1 text-xs tabular-nums text-foreground focus:border-primary-400 focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="w-14 text-[10px] text-foreground-secondary">토큰</label>
                <input
                  type="number"
                  step={500}
                  min={1000}
                  max={30000}
                  value={values[`${card.prefix}_max_tokens`] ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, [`${card.prefix}_max_tokens`]: Number(e.target.value) }))}
                  className="flex-1 rounded-md border border-border bg-surface px-2 py-1 text-xs tabular-nums text-foreground focus:border-primary-400 focus:outline-none"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// 섹션 C: 유형별 활성화 토글
// ============================================================

function ToggleSection({
  settings,
  onSaved,
}: {
  settings: MockTestEvalSettings;
  onSaved: () => void;
}) {
  const [togglingKey, setTogglingKey] = useState<string | null>(null);

  const handleToggle = async (key: string, currentValue: boolean) => {
    setTogglingKey(key);
    try {
      const result = await updateEvalSettings({ [key]: !currentValue });
      if (result.success) {
        toast.success("토글 변경 완료");
        onSaved();
      } else {
        toast.error(result.error || "변경 실패");
      }
    } finally {
      setTogglingKey(null);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <h3 className="mb-4 text-sm font-bold text-foreground">유형별 활성화 토글</h3>
      <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4">
        {TOGGLE_KEYS.map(({ key, label }) => {
          const enabled = (settings as unknown as Record<string, unknown>)[key] as boolean ?? true;
          const isToggling = togglingKey === key;
          return (
            <button
              key={key}
              onClick={() => handleToggle(key, enabled)}
              disabled={isToggling}
              className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs font-medium transition-colors disabled:opacity-50 ${
                enabled
                  ? "border-green-200 bg-green-50 text-green-700"
                  : "border-border bg-background text-foreground-muted"
              }`}
            >
              <span>{label}</span>
              {isToggling ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <span className={`h-3 w-6 rounded-full transition-colors ${enabled ? "bg-green-500" : "bg-gray-300"}`}>
                  <span
                    className={`block h-3 w-3 rounded-full bg-white transition-transform ${enabled ? "translate-x-3" : "translate-x-0"}`}
                  />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// 섹션 D: 과제충족 체크리스트
// ============================================================

function ChecklistSection({
  checklists,
  onSaved,
}: {
  checklists: TaskFulfillmentChecklist[];
  onSaved: () => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <h3 className="mb-4 text-sm font-bold text-foreground">과제충족 체크리스트 (10 유형)</h3>
      <div className="space-y-1">
        {checklists.map((cl) => (
          <ChecklistAccordion
            key={cl.question_type}
            checklist={cl}
            isExpanded={expanded === cl.question_type}
            onToggle={() => setExpanded(expanded === cl.question_type ? null : cl.question_type)}
            onSaved={onSaved}
          />
        ))}
      </div>
    </div>
  );
}

function ChecklistAccordion({
  checklist,
  isExpanded,
  onToggle,
  onSaved,
}: {
  checklist: TaskFulfillmentChecklist;
  isExpanded: boolean;
  onToggle: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    required: (checklist.required || []).join("\n"),
    advanced: (checklist.advanced || []).join("\n"),
    ideal_flow: checklist.ideal_flow || "",
    common_mistakes: (checklist.common_mistakes || []).join("\n"),
    core_prescription: checklist.core_prescription || "",
    feedback_tone: checklist.feedback_tone || "",
    start_template: checklist.start_template || "",
  });
  const [saving, setSaving] = useState(false);

  // 체크리스트 변경 시 form 리셋
  useEffect(() => {
    setForm({
      required: (checklist.required || []).join("\n"),
      advanced: (checklist.advanced || []).join("\n"),
      ideal_flow: checklist.ideal_flow || "",
      common_mistakes: (checklist.common_mistakes || []).join("\n"),
      core_prescription: checklist.core_prescription || "",
      feedback_tone: checklist.feedback_tone || "",
      start_template: checklist.start_template || "",
    });
  }, [checklist]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = {
        required: form.required.split("\n").filter((l) => l.trim()),
        advanced: form.advanced.split("\n").filter((l) => l.trim()),
        ideal_flow: form.ideal_flow,
        common_mistakes: form.common_mistakes.split("\n").filter((l) => l.trim()),
        core_prescription: form.core_prescription,
        feedback_tone: form.feedback_tone,
        start_template: form.start_template,
      };
      const result = await updateTaskChecklist(checklist.question_type, updates);
      if (result.success) {
        toast.success(`${checklist.label} 체크리스트 저장 완료`);
        onSaved();
      } else {
        toast.error(result.error || "저장 실패");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg border border-border/50">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-medium text-foreground transition-colors hover:bg-surface-secondary"
      >
        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <span className="font-mono text-foreground-muted">{checklist.question_type}</span>
        <span className="text-foreground">{checklist.label}</span>
        <span className="ml-auto text-[10px] text-foreground-muted">
          필수{checklist.required?.length || 0} 심화{checklist.advanced?.length || 0}
        </span>
      </button>

      {isExpanded && (
        <div className="space-y-3 border-t border-border/50 px-3 pb-3 pt-3">
          <FieldTextarea label="필수 항목 (줄바꿈 구분)" value={form.required} onChange={(v) => setForm((f) => ({ ...f, required: v }))} rows={3} />
          <FieldTextarea label="심화 항목 (줄바꿈 구분)" value={form.advanced} onChange={(v) => setForm((f) => ({ ...f, advanced: v }))} rows={2} />
          <FieldInput label="Ideal Flow" value={form.ideal_flow} onChange={(v) => setForm((f) => ({ ...f, ideal_flow: v }))} />
          <FieldTextarea label="Common Mistakes (줄바꿈 구분)" value={form.common_mistakes} onChange={(v) => setForm((f) => ({ ...f, common_mistakes: v }))} rows={3} />
          <FieldInput label="Core Prescription" value={form.core_prescription} onChange={(v) => setForm((f) => ({ ...f, core_prescription: v }))} />
          <FieldInput label="Feedback Tone" value={form.feedback_tone} onChange={(v) => setForm((f) => ({ ...f, feedback_tone: v }))} />
          <FieldInput label="Start Template (무응답 구제)" value={form.start_template} onChange={(v) => setForm((f) => ({ ...f, start_template: v }))} />

          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1 rounded-lg bg-primary-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary-600 disabled:opacity-50"
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
              저장
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── 공통 입력 컴포넌트 ──

function FieldInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-[10px] font-medium text-foreground-secondary">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground focus:border-primary-400 focus:outline-none"
      />
    </div>
  );
}

function FieldTextarea({
  label,
  value,
  onChange,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <div>
      <label className="mb-1 block text-[10px] font-medium text-foreground-secondary">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground focus:border-primary-400 focus:outline-none"
      />
    </div>
  );
}
