import { supabase } from "@/integrations/supabase/client";

export async function invokeMessaging(action: string, token: string, extra: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke("messaging", {
    body: { action, token, ...extra },
  });
  if (error) throw new Error("Request failed");
  if (data?.error) throw new Error(data.error);
  return data;
}
