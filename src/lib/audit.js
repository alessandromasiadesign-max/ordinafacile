import { supabase } from "@/api/supabaseClient";

export async function safeAuditLog(payload) {
  try {
    if (!payload || typeof payload !== "object") return;

    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes?.user;

    const row = {
      action: payload.action,
      entity_type: payload.entity_type,
      entity_id: payload.entity_id,
      restaurant_id: payload.restaurant_id,
      user_id: user?.id ?? null,
      meta: payload.meta ?? null,
    };

    const { error } = await supabase.from("audit_logs").insert(row);
    if (error) return;
  } catch {
  }
}
