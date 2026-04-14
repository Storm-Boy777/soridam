"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Settings,
  Globe,
  CreditCard,
  Shield,
  Check,
  Loader2,
  Eye,
  X,
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
    signup_google_enabled: false,
    signup_kakao_enabled: false,
    signup_email_enabled: true,
    signup_email_whitelist: "",
    signup_invited_emails: "",
    maintenance_mode: false,
  });
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const savedTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (settings) {
      setForm({
        site_name: parseVal(settings.site_name),
        site_description: parseVal(settings.site_description),
        og_image_url: parseVal(settings.og_image_url),
        payment_provider: parseVal(settings.payment_provider) || "creem",
        welcome_credit_cents: parseNum(settings.welcome_credit_cents),
        signup_google_enabled: parseBool(settings.signup_google_enabled),
        signup_kakao_enabled: parseBool(settings.signup_kakao_enabled),
        signup_email_enabled: parseBool(settings.signup_email_enabled),
        signup_email_whitelist: parseVal(settings.signup_email_whitelist),
        signup_invited_emails: parseVal(settings.signup_invited_emails),
        maintenance_mode: parseBool(settings.maintenance_mode),
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

  const toggle = async (key: "signup_google_enabled" | "signup_kakao_enabled" | "signup_email_enabled" | "maintenance_mode") => {
    const newVal = !form[key];
    setForm((f) => ({ ...f, [key]: newVal }));

    // 점검 모드는 /api/maintenance API도 함께 호출 (사이드바 동기화)
    if (key === "maintenance_mode") {
      await fetch("/api/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: newVal }),
      });
      // API가 system_settings도 업데이트하므로 별도 save 불필요
      setSaving(key);
      setSaved(key);
      clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setSaved(null), 2000);
      setSaving(null);
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
    } else {
      await save(key, newVal);
    }
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
          <Field label="Google 가입" right>
            <Toggle
              enabled={form.signup_google_enabled}
              onChange={() => toggle("signup_google_enabled")}
              saving={saving === "signup_google_enabled"}
              labelOn="허용"
              labelOff="차단"
            />
          </Field>
          <Field label="Kakao 가입" right>
            <Toggle
              enabled={form.signup_kakao_enabled}
              onChange={() => toggle("signup_kakao_enabled")}
              saving={saving === "signup_kakao_enabled"}
              labelOn="허용"
              labelOff="차단"
            />
          </Field>
          <Field label="이메일 가입" right>
            <Toggle
              enabled={form.signup_email_enabled}
              onChange={() => toggle("signup_email_enabled")}
              saving={saving === "signup_email_enabled"}
              labelOn="허용"
              labelOff="차단"
            />
          </Field>
          <Field label="허용 도메인" hint="빈 값 = 제한 없음">
            <InputWithSave
              value={form.signup_email_whitelist}
              onChange={(v) => update("signup_email_whitelist", v)}
              onSave={() => save("signup_email_whitelist", form.signup_email_whitelist)}
              saving={saving === "signup_email_whitelist"}
              saved={saved === "signup_email_whitelist"}
              placeholder="예: gmail.com, naver.com"
            />
          </Field>
          <Field label="초대 이메일" hint="도메인 제한 우회 허용">
            <InputWithSave
              value={form.signup_invited_emails}
              onChange={(v) => update("signup_invited_emails", v)}
              onSave={() => save("signup_invited_emails", form.signup_invited_emails)}
              saving={saving === "signup_invited_emails"}
              saved={saved === "signup_invited_emails"}
              placeholder="예: user@gmail.com, friend@naver.com"
            />
          </Field>
          <WhitelistViewer
            whitelist={form.signup_email_whitelist}
            invitedEmails={form.signup_invited_emails}
            onUpdateWhitelist={(v) => { update("signup_email_whitelist", v); save("signup_email_whitelist", v); }}
            onUpdateInvited={(v) => { update("signup_invited_emails", v); save("signup_invited_emails", v); }}
          />
          <Field label="점검 모드" hint="프로덕션 접근 차단" right>
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

        {/* 알림 설정: 공지사항 관리 페이지(/admin/announcements)로 이전됨 */}
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

function Field({ label, hint, right, children }: { label: string; hint?: string; right?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 py-3">
      <div className="w-28 shrink-0">
        <p className="text-xs font-medium text-foreground">{label}</p>
        {hint && <p className="text-[10px] text-foreground-muted">{hint}</p>}
      </div>
      <div className={`flex-1${right ? " flex justify-end" : ""}`}>{children}</div>
    </div>
  );
}

function InputWithSave({
  value, onChange, onSave, saving, saved, mono, placeholder,
}: {
  value: string; onChange: (v: string) => void; onSave: () => void;
  saving: boolean; saved: boolean; mono?: boolean; placeholder?: string;
}) {
  return (
    <div className="flex gap-2">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-lg border border-border bg-white px-3 py-1.5 text-sm text-foreground placeholder:text-foreground-muted focus:border-primary-400 focus:outline-none ${mono ? "font-mono text-xs" : ""}`}
      />
      <SaveIndicator onSave={onSave} saving={saving} saved={saved} />
    </div>
  );
}

function SaveIndicator({ onSave, saving, saved }: { onSave: () => void; saving: boolean; saved: boolean }) {
  return (
    <button
      onClick={onSave}
      disabled={saving}
      className={`ml-auto flex shrink-0 items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
        saved
          ? "bg-green-100 text-green-600"
          : "bg-primary-500 text-white hover:bg-primary-600"
      } disabled:opacity-50`}
    >
      {saving ? <Loader2 size={12} className="animate-spin" /> : saved ? <><Check size={12} /> 완료</> : "저장"}
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

function WhitelistViewer({
  whitelist, invitedEmails, onUpdateWhitelist, onUpdateInvited,
}: {
  whitelist: string; invitedEmails: string;
  onUpdateWhitelist: (v: string) => void; onUpdateInvited: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const domains = whitelist ? whitelist.split(",").map((d) => d.trim()).filter(Boolean) : [];
  const emails = invitedEmails ? invitedEmails.split(",").map((e) => e.trim()).filter(Boolean) : [];

  const removeDomain = (target: string) => {
    const updated = domains.filter((d) => d !== target).join(", ");
    onUpdateWhitelist(updated);
  };
  const removeEmail = (target: string) => {
    const updated = emails.filter((e) => e !== target).join(", ");
    onUpdateInvited(updated);
  };

  return (
    <>
      <div className="flex items-center gap-4 py-3">
        <div className="w-28 shrink-0">
          <p className="text-xs font-medium text-foreground">허용 현황</p>
          <p className="text-[10px] text-foreground-muted">도메인 + 초대 이메일</p>
        </div>
        <div className="flex-1">
          <button
            onClick={() => setOpen(true)}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground-secondary hover:bg-surface-secondary transition-colors"
          >
            <Eye size={12} />
            화이트리스트 확인 ({domains.length + emails.length}건)
          </button>
        </div>
      </div>

      {/* 모달 */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setOpen(false)}>
          <div
            className="mx-4 w-full max-w-md rounded-xl border border-border bg-surface p-5 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-foreground">가입 허용 화이트리스트</h3>
              <button onClick={() => setOpen(false)} className="rounded-lg p-1 hover:bg-surface-secondary">
                <X size={16} className="text-foreground-muted" />
              </button>
            </div>

            {/* 허용 도메인 */}
            <div className="mb-4">
              <p className="text-xs font-medium text-foreground-secondary mb-2">
                허용 도메인 ({domains.length}건)
              </p>
              {domains.length === 0 ? (
                <p className="text-xs text-foreground-muted">제한 없음 (모든 도메인 허용)</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {domains.map((d) => (
                    <span key={d} className="inline-flex items-center gap-1 rounded-md bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-600">
                      @{d}
                      <button onClick={() => removeDomain(d)} className="ml-0.5 rounded hover:bg-primary-100 p-0.5" title="삭제">
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* 초대 이메일 */}
            <div>
              <p className="text-xs font-medium text-foreground-secondary mb-2">
                초대 이메일 ({emails.length}건)
              </p>
              {emails.length === 0 ? (
                <p className="text-xs text-foreground-muted">없음</p>
              ) : (
                <div className="flex flex-col gap-1">
                  {emails.map((e) => (
                    <span key={e} className="inline-flex items-center justify-between rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
                      {e}
                      <button onClick={() => removeEmail(e)} className="ml-1 rounded hover:bg-amber-100 p-0.5" title="삭제">
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => setOpen(false)}
              className="mt-4 w-full rounded-lg bg-surface-secondary py-2 text-xs font-medium text-foreground-secondary hover:bg-border transition-colors"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </>
  );
}
