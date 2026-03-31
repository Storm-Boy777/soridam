// CSV 내보내기 유틸

/**
 * 객체 배열을 CSV 문자열로 변환
 * @param data 객체 배열
 * @param columns 컬럼 정의 { key, label }
 */
export function toCSV<T extends Record<string, unknown>>(
  data: T[],
  columns: { key: string; label: string }[]
): string {
  const header = columns.map((c) => `"${c.label}"`).join(",");
  const rows = data.map((row) =>
    columns
      .map((c) => {
        const val = row[c.key];
        if (val == null) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      })
      .join(",")
  );
  // BOM + UTF-8 CSV
  return "\uFEFF" + [header, ...rows].join("\n");
}

/**
 * CSV 문자열을 브라우저에서 다운로드
 */
export function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
