import { supabase } from "@/integrations/supabase/client";

export class SessionExpiredError extends Error {
  constructor() {
    super("Session expired");
    this.name = "SessionExpiredError";
  }
}

export async function invokeMessaging(action: string, token: string, extra: Record<string, unknown> = {}) {
  if (!token) throw new Error("Not authenticated");

  // Check token expiry client-side before making the request
  try {
    const payloadB64 = token.split(".")?.[1];
    if (payloadB64) {
      const payload = JSON.parse(atob(payloadB64));
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        throw new SessionExpiredError();
      }
    }
  } catch (e) {
    if (e instanceof SessionExpiredError) throw e;
    // If token parsing fails, let the server handle it
  }

  const { data, error } = await supabase.functions.invoke("messaging", {
    body: { action, token, ...extra },
  });

  if (error) {
    // Network or server error
    throw new Error("Request failed");
  }

  if (data?.error) {
    if (data.error === "Access unavailable" || data.error === "Token expired" || data.error === "Session ended") {
      throw new SessionExpiredError();
    }
    throw new Error(data.error);
  }

  return data;
}
