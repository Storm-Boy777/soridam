"use server";

import { requireAdmin } from "@/lib/auth";
import { T } from "@/lib/constants/tables";
import type { AuditLogEntry, PaginatedResult } from "@/lib/types/admin";

export async function getAuditLogs(params: {
  page?: number;
  pageSize?: number;
  action?: string;      // 단일 action (하위 호환)
  actions?: string[];   // action 그룹 필터
  dateFrom?: string;    // ISO date "2026-03-01"
  dateTo?: string;      // ISO date "2026-03-14"
}): Promise<PaginatedResult<AuditLogEntry>> {
  const { supabase } = await requireAdmin();
  const page = params.page || 1;
  const pageSize = params.pageSize || 30;
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from(T.admin_audit_log)
    .select("*", { count: "exact" });

  if (params.actions && params.actions.length > 0) {
    query = query.in("action", params.actions);
  } else if (params.action && params.action !== "all") {
    query = query.eq("action", params.action);
  }

  if (params.dateFrom) {
    query = query.gte("created_at", params.dateFrom + "T00:00:00");
  }
  if (params.dateTo) {
    query = query.lte("created_at", params.dateTo + "T23:59:59");
  }

  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error || !data) {
    return { data: [], total: 0, page, pageSize };
  }

  // admin 이메일 조회 (병렬)
  const adminIds = [...new Set(data.map((d) => d.admin_id))];
  const emailResults = await Promise.all(
    adminIds.map((id) => supabase.auth.admin.getUserById(id))
  );
  const emailMap = new Map<string, string>();
  emailResults.forEach((res, i) => {
    if (res.data?.user?.email) emailMap.set(adminIds[i], res.data.user.email);
  });

  const entries: AuditLogEntry[] = data.map((d) => ({
    id: d.id,
    admin_id: d.admin_id,
    admin_email: emailMap.get(d.admin_id),
    action: d.action,
    target_type: d.target_type,
    target_id: d.target_id,
    details: d.details || {},
    ip_address: d.ip_address,
    created_at: d.created_at,
  }));

  return { data: entries, total: count || 0, page, pageSize };
}
