"use client";

// 내 자료 내보내기 — 브라우저에서 ZIP을 조립한다.
//
// 서버(EF)에서 만들지 않는 이유: 11GB 규모라 메모리·실행시간 제한에 걸린다.
// script-packages가 public 버킷이라 클라이언트가 직접 fetch할 수 있어 가능한 구조.
//
// 분할: 상위 10%가 132MB, 최대 1.9GB라 통짜 ZIP은 메모리에서 터진다.
// PART_LIMIT 단위로 나누되 첫 파트에 항상 index.html을 넣어, 같은 폴더에 모두 풀면
// 플레이어가 audio/ 전체를 인식하도록 했다.

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, Loader2, FileAudio, FileText, CheckCircle2, AlertTriangle } from "lucide-react";
import { getMyExportData, type ExportScript } from "@/lib/actions/export";
import { buildPlayerHtml, buildPlainText } from "@/lib/utils/export-player";

/** 파트당 상한. 브라우저 메모리 안전선 */
const PART_LIMIT = 200 * 1024 * 1024;

function fmtSize(bytes: number): string {
  if (bytes <= 0) return "-";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${Math.round(bytes / 1024 / 1024)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

/** 오디오를 PART_LIMIT 이하 묶음으로 나눈다 */
function splitParts(scripts: ExportScript[]): ExportScript[][] {
  // 문장 음성 또는 질문 음성이 있는 스크립트를 크기순으로 파트에 나눈다
  const withAudio = scripts.filter((s) => s.audio || s.questionAudio);
  const parts: ExportScript[][] = [];
  let cur: ExportScript[] = [];
  let curSize = 0;

  for (const s of withAudio) {
    const size =
      (s.audio ? s.audio.size || 5 * 1024 * 1024 : 0) +
      (s.questionAudio ? 300 * 1024 : 0); // 질문 음성은 크기 미상 → 0.3MB로 가정
    if (cur.length > 0 && curSize + size > PART_LIMIT) {
      parts.push(cur);
      cur = [];
      curSize = 0;
    }
    cur.push(s);
    curSize += size;
  }
  if (cur.length > 0) parts.push(cur);
  return parts.length > 0 ? parts : [[]];
}

function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ExportContent() {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState<string[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ["my-export-data"],
    queryFn: () => getMyExportData(),
    staleTime: 5 * 60 * 1000,
  });

  const scripts: ExportScript[] = data && "scripts" in data && Array.isArray(data.scripts) ? data.scripts : [];
  const audioCount = scripts.filter((s) => s.audio).length;
  const totalSize = scripts.reduce((sum, s) => sum + (s.audio?.size ?? 0), 0);
  const parts = splitParts(scripts);
  const multiPart = parts.length > 1;

  const download = async () => {
    if (busy || scripts.length === 0) return;
    setBusy(true);
    setDone(false);
    setFailed([]);
    const failures: string[] = [];

    try {
      const JSZip = (await import("jszip")).default;
      const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");

      for (let p = 0; p < parts.length; p++) {
        const zip = new JSZip();

        // 첫 파트에만 플레이어와 텍스트본을 넣는다 (같은 폴더에 풀면 전체가 합쳐진다)
        if (p === 0) {
          zip.file("index.html", buildPlayerHtml(scripts));
          zip.file("스크립트_모음.txt", buildPlainText(scripts));
          zip.file(
            "읽어주세요.txt",
            [
              "소리담 — 내 자료",
              "",
              "★ 반드시 압축을 먼저 푼 뒤, 풀린 폴더 안의 index.html 을 열어주세요.",
              "  (ZIP 안에서 바로 열면 음성이 함께 풀리지 않아 재생되지 않습니다)",
              "",
              multiPart
                ? `이 자료는 용량이 커서 ${parts.length}개 파일로 나뉘어 있습니다.`
                : "",
              multiPart ? "모든 ZIP 파일을 '같은 폴더'에 풀어주세요." : "",
              multiPart ? "" : "",
              "index.html 을 열면 스크립트와 음성을 함께 학습할 수 있습니다.",
              "인터넷 연결 없이도 동작하며, 별도 설치가 필요 없습니다.",
              "",
              "· 문장을 클릭하면 그 문장만 재생됩니다.",
              "· 🔁 버튼을 켜면 해당 문장이 반복됩니다.",
              "· '한글 가리기' / '영어 가리기'로 쉐도잉 연습을 할 수 있습니다.",
              "· 스페이스바로 재생/정지할 수 있습니다.",
              "",
              "플레이어가 열리지 않으면 '스크립트_모음.txt' 로 내용을 확인하실 수 있습니다.",
            ]
              .filter((l) => l !== undefined)
              .join("\n")
          );
        }

        const chunk = parts[p];
        for (let i = 0; i < chunk.length; i++) {
          const s = chunk[i];
          const label = parts.length > 1 ? `(${p + 1}/${parts.length}) ` : "";
          setProgress(`${label}음성 내려받는 중… ${i + 1} / ${chunk.length}`);
          // 스크립트 음성
          if (s.audio) {
            try {
              const res = await fetch(s.audio.url);
              if (!res.ok) throw new Error(String(res.status));
              zip.file(`audio/${s.audio.fileName}`, await res.blob());
            } catch {
              // 개별 실패는 건너뛰고 계속 — 하나 때문에 전체를 잃지 않게
              failures.push(s.title || s.topic || s.id.slice(0, 8));
            }
          }
          // 질문 음성
          if (s.questionAudio) {
            try {
              const res = await fetch(s.questionAudio.url);
              if (!res.ok) throw new Error(String(res.status));
              zip.file(`audio/${s.questionAudio.fileName}`, await res.blob());
            } catch {
              // 질문 음성 실패는 조용히 건너뜀 (본문 음성이 핵심)
            }
          }
        }

        setProgress(
          parts.length > 1 ? `(${p + 1}/${parts.length}) 압축하는 중…` : "압축하는 중…"
        );
        const blob = await zip.generateAsync({ type: "blob" });
        const name =
          parts.length > 1
            ? `소리담_내자료_${stamp}_${p + 1}of${parts.length}.zip`
            : `소리담_내자료_${stamp}.zip`;
        saveBlob(blob, name);
      }

      setFailed(failures);
      setDone(true);
      if (failures.length > 0) {
        toast.warning(`${failures.length}개 음성을 받지 못했어요. 나머지는 저장됐습니다.`);
      } else {
        toast.success("저장이 완료됐어요 🙌");
      }
    } catch (e) {
      console.error("[export]", e);
      toast.error("내보내기에 실패했어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setBusy(false);
      setProgress("");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary-400" />
      </div>
    );
  }

  if (data && "error" in data) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6 text-center text-sm text-foreground-secondary">
        {data.error}
      </div>
    );
  }

  if (scripts.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-10 text-center">
        <p className="text-sm text-foreground-secondary">내려받으실 스크립트가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* 요약 */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat icon={FileText} label="스크립트" value={`${scripts.length}개`} />
        <Stat icon={FileAudio} label="음성 파일" value={`${audioCount}개`} />
        <Stat icon={Download} label="전체 용량" value={fmtSize(totalSize)} />
      </div>

      {/* 다운로드 */}
      <div className="rounded-2xl border border-border bg-surface p-6">
        <h2 className="text-base font-bold text-foreground">내 자료 내려받기</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-foreground-secondary">
          스크립트와 음성을 하나로 묶어 저장합니다. 압축을 풀고{" "}
          <code className="rounded bg-surface-secondary px-1.5 py-0.5 text-xs font-semibold">
            index.html
          </code>
          을 열면 인터넷 없이도 문장별 재생·쉐도잉 연습을 하실 수 있어요.
        </p>

        {multiPart && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <p className="text-xs leading-relaxed text-amber-800">
              용량이 커서 <b>{parts.length}개 파일</b>로 나뉘어 저장됩니다. 브라우저가
              여러 번 저장을 물어볼 수 있어요. 모두 <b>같은 폴더에 풀어주세요.</b>
            </p>
          </div>
        )}

        <button
          onClick={download}
          disabled={busy}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-primary-500 py-3 text-sm font-bold text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {busy ? progress || "준비 중…" : "전체 내려받기"}
        </button>

        {busy && (
          <p className="mt-2.5 text-center text-xs text-foreground-muted">
            창을 닫지 말고 기다려주세요. 용량에 따라 몇 분 걸릴 수 있어요.
          </p>
        )}

        {done && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <div className="text-xs leading-relaxed text-emerald-800">
              <b>저장이 완료됐어요.</b>{" "}
              <b className="text-emerald-900">압축을 먼저 푼 뒤</b>, 풀린 폴더 안의
              index.html을 열어주세요. ZIP 안에서 바로 열면 음성이 재생되지 않아요.
              {failed.length > 0 && (
                <p className="mt-1 text-amber-700">
                  다만 {failed.length}개 음성을 받지 못했어요: {failed.slice(0, 3).join(", ")}
                  {failed.length > 3 && ` 외 ${failed.length - 3}개`}. 다시 시도하시면 받아질 수
                  있어요.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 목록 */}
      <div className="rounded-2xl border border-border bg-surface">
        <div className="border-b border-border px-5 py-3">
          <h3 className="text-xs font-bold text-foreground-secondary">
            포함되는 스크립트 ({scripts.length})
          </h3>
        </div>
        <ul className="max-h-80 divide-y divide-border/60 overflow-y-auto">
          {scripts.map((s) => (
            <li key={s.id} className="flex items-center gap-3 px-5 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {s.title || s.topic || "제목 없음"}
                </p>
                <p className="truncate text-xs text-foreground-muted">
                  {[s.topic, s.targetGrade && `목표 ${s.targetGrade}`, s.createdAt.slice(0, 10)]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              {s.audio ? (
                <span className="shrink-0 text-xs tabular-nums text-foreground-muted">
                  {fmtSize(s.audio.size)}
                </span>
              ) : (
                <span className="shrink-0 rounded-md bg-surface-secondary px-2 py-0.5 text-[10px] font-medium text-foreground-muted">
                  음성 없음
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3.5">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50">
        <Icon className="h-4 w-4 text-primary-500" />
      </div>
      <div>
        <p className="text-xs text-foreground-secondary">{label}</p>
        <p className="text-base font-bold tabular-nums text-foreground">{value}</p>
      </div>
    </div>
  );
}
