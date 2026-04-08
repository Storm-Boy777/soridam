"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Settings,
  Globe,
  CreditCard,
  Shield,
  Megaphone,
  Check,
  Loader2,
} from "lucide-react";
import { getSettings, updateSetting, type SettingKey } from "@/lib/actions/admin/settings";

function parseVal(val: unknown): string {
  if (val === null || val === undefined) return "";
  if (typeof val === "string") return val;
  return String(val);
}
function parseBool(val: unknown): boolean {
  return val === true || val === "true";
}
function parseNum(val: unknown): number {
  const n = Number(val);
  return isNaN(n) ? 0 : n;
}

export default function AdminSettingsPage() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: () => getSettings(),
    staleTime: 30_000,
  });

  const [form, setForm] = useState({
    site_name: "",
    site_description: "",
    og_image_url: "",
    payment_provider: "creem",
    welcome_credit_cents: 0,
    signup_enabled: true,
    maintenance_mode: false,
    site_notice: "",
  });
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const savedTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (settings) {
      setForm({
        site_name: parseVal(settings.site_name),
        site_description: parseVal(settings.site_description),
        og_image_url: parseVal(settings.og_image_url),
        payment_provider: parseVal(settings.payment_provider) || "creem",
        welcome_credit_cents: parseNum(settings.welcome_credit_cents),
        signup_enabled: parseBool(settings.signup_enabled),
        maintenance_mode: parseBool(settings.maintenance_mode),
        site_notice: parseVal(settings.site_notice),
      });
    }
  }, [settings]);

  const save = async (key: SettingKey, value: unknown) => {
    setSaving(key);
    setSaved(null);
    try {
      const result = await updateSetting(key, value);
      if (result.success) {
        setSaved(key);
        clearTimeout(savedTimer.current);
        savedTimer.current = setTimeout(() => setSaved(null), 2000);
        queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
      } else {
        toast.error(result.error || "저장 실패");
      }
    } finally {
      setSaving(null);
    }
  };

  const toggle = async (key: "signup_enabled" | "maintenance_mode") => {
    const newVal = !form[key];
    setForm((f) => ({ ...f, [key]: newVal }));
    await save(key, newVal);
  };

  const update = (key: string, value: unknown) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-primary-400" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2.5">
        <Settings size={18} className="text-foreground-secondary" />
        <h1 className="text-lg font-bold text-foreground">사이트 설정</h1>
      </div>

      {/* 2열 그리드: 좌(기본+알림) 우(결제+접근) */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* ── 기본 설정 ── */}
        <Card icon={Globe} title="기본 설정">
          <Field label="사이트명">
            <InputWithSave
              value={form.site_name}
              onChange={(v) => update("site_name", v)}
              onSave={() => save("site_name", form.site_name)}
              saving={saving === "site_name"}
              saved={saved === "site_name"}
            />
          </Field>
          <Field label="사이트 설명">
            <InputWithSave
              value={form.site_description}
              onChange={(v) => update("site_description", v)}
              onSave={() => save("site_description", form.site_description)}
              saving={saving === "site_description"}
              saved={saved === "site_description"}
              textarea
            />
          </Field>
          <Field label="OG 이미지 URL">
            <InputWithSave
              value={form.og_image_url}
              onChange={(v) => update("og_image_url", v)}
              onSave={() => save("og_image_url", form.og_image_url)}
              saving={saving === "og_image_url"}
              saved={saved === "og_image_url"}
              mono
            />
          </Field>
        </Card>

        {/* ── 결제 설정 ── */}
        <Card icon={CreditCard} title="결제 설정">
          <Field label="결제 Provider">
            <div className="flex items-center gap-3">
              {(["creem", "polar"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => update("payment_provider", p)}
                  className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition-colors ${
                    form.payment_provider === p
                      ? "bg-primary-500 text-white"
                      : "bg-surface-secondary text-foreground-secondary hover:bg-border"
                  }`}
                >
                  {p === "creem" ? "Creem" : "Polar"}
                </button>
              ))}
              <SaveIndicator
                onSave={() => save("payment_provider", form.payment_provider)}
                saving={saving === "payment_provider"}
                saved={saved === "payment_provider"}
              />
            </div>
          </Field>
          <Field label="신규 가입 체험 크레딧">
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={form.welcome_credit_cents}
                onChange={(e) => update("welcome_credit_cents", Number(e.target.value))}
                min={0}
                step={50}
                className="w-24 rounded-lg border border-border bg-white px-3 py-1.5 text-sm tabular-nums text-foreground focus:border-primary-400 focus:outline-none"
              />
              <span className="text-xs tabular-nums text-foreground-muted">
                = ${(form.welcome_credit_cents / 100).toFixed(2)}
              </span>
              <SaveIndicator
                onSave={() => save("welcome_credit_cents", form.welcome_credit_cents)}
                saving={saving === "welcome_credit_cents"}
                saved={saved === "welcome_credit_cents"}
              />
            </div>
          </Field>
        </Card>

        {/* ── 접근 설정 ── */}
        <Card icon={Shield} title="접근 설정">
          <Field label="회원가입">
            <Toggle
              enabled={form.signup_enabled}
              onChange={() => toggle("signup_enabled")}
              saving={saving === "signup_enabled"}
              labelOn="허용"
              labelOff="차단"
            />
          </Field>
          <Field label="점검 모드" hint="프로덕션 접근 차단">
            <Toggle
              enabled={form.maintenance_mode}
              onChange={() => toggle("maintenance_mode")}
              saving={saving === "maintenance_mode"}
              labelOn="점검 중"
              labelOff="정상 운영"
              danger
            />
          </Field>
        </Card>

        {/* ── 알림 설정 ── */}
        <Card icon={Megaphone} title="알림 설정">
          <Field label="공지 배너" hint="빈 값 = 미표시">
            <InputWithSave
              value={form.site_notice}
              onChange={(v) => update("site_notice", v)}
              onSave={() => save("site_notice", form.site_notice)}
              saving={saving === "site_notice"}
              saved={saved === "site_notice"}
              placeholder="예: 4/10 오후 2시 서버 점검 예정"
            />
          </Field>
        </Card>
      </div>
    </div>
  );
}

/* ── 공통 컴포넌트 ── */

function Card({ icon: Icon, title, children }: { icon: React.ComponentType<{ size?: number; className?: string }>; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface">
      <div className="flex items-center gap-2 border-b border-border/50 px-4 py-2.5">
        <Icon size={14} className="text-foreground-secondary" />
        <h2 className="text-xs font-bold text-foreground">{title}</h2>
      </div>
      <div className="divide-y divide-border/20 px-4">{children}</div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="py-3">
      <div className="mb-1.5 flex items-baseline gap-2">
        <p className="text-xs font-medium text-foreground">{label}</p>
        {hint && <p className="text-[10px] text-foreground-muted">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function InputWithSave({
  value, onChange, onSave, saving, saved, textarea, mono, placeholder,
}: {
  value: string; onChange: (v: string) => void; onSave: () => void;
  saving: boolean; saved: boolean; textarea?: boolean; mono?: boolean; placeholder?: string;
}) {
  const cls = `w-full rounded-lg border border-border bg-white px-3 py-1.5 text-sm text-foreground placeholder:text-foreground-muted focus:border-primary-400 focus:outline-none ${mono ? "font-mono text-xs" : ""}`;

  return (
    <div className="flex gap-2">
      {textarea ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={2} className={`${cls} resize-none`} placeholder={placeholder} />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} className={cls} placeholder={placeholder} />
      )}
      <SaveIndicator onSave={onSave} saving={saving} saved={saved} />
    </div>
  );
}

function SaveIndicator({ onSave, saving, saved }: { onSave: () => void; saving: boolean; saved: boolean }) {
  return (
    <button
      onClick={onSave}
      disabled={saving}
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
        saved
          ? "bg-green-100 text-green-600"
          : "bg-primary-50 text-primary-500 hover:bg-primary-100"
      } disabled:opacity-50`}
    >
      {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : <Check size={14} />}
    </button>
  );
}

function Toggle({
  enabled, onChange, saving, labelOn, labelOff, danger,
}: {
  enabled: boolean; onChange: () => void; saving: boolean; labelOn: string; labelOff: string; danger?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <button
        onClick={onChange}
        disabled={saving}
        className={`flex h-5 w-9 items-center rounded-full px-0.5 transition-colors ${
          enabled ? (danger ? "bg-red-500" : "bg-green-500") : "bg-gray-300"
        } disabled:opacity-50`}
      >
        <span className={`h-4 w-4 rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-4" : "translate-x-0"}`} />
      </button>
      <span className={`text-xs font-medium ${enabled ? (danger ? "text-red-600" : "text-green-600") : "text-foreground-muted"}`}>
        {enabled ? labelOn : labelOff}
      </span>
      {saving && <Loader2 size={10} className="animate-spin text-foreground-muted" />}
    </div>
  );
}
