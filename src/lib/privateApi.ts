import { supabase } from "@/integrations/supabase/client";

export class SessionExpiredError extends Error {
  constructor() {
    super("Session expired");
    this.name = "SessionExpiredError";
  }
}

async function getFunctionErrorBody(error: unknown): Promise<{ error?: string } | null> {
  if (!error || typeof error !== "object") return null;

  const maybeError = error as {
    message?: string;
    context?: { status?: number; json?: () => Promise<unknown>; clone?: () => { json?: () => Promise<unknown> } };
  };

  const response = maybeError.context;
  if (response) {
    try {
      if (typeof response.clone === "function") {
        return await response.clone().json?.() as { error?: string } | null;
      }
      if (typeof response.json === "function") {
        return await response.json() as { error?: string } | null;
      }
    } catch {
      // ignore parse failures and fall back
    }
  }

  if (typeof maybeError.message === "string") {
    try {
      return JSON.parse(maybeError.message) as { error?: string };
    } catch {
      return null;
    }
  }

  return null;
}

export async function invokeMessaging(action: string, token: string, extra: Record<string, unknown> = {}) {
  if (!token) throw new Error("Not authenticated");

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
  }

  const { data, error } = await supabase.functions.invoke("messaging", {
    body: { action, token, ...extra },
  });

  if (error) {
    const errBody = await getFunctionErrorBody(error);
    const errMsg = errBody?.error;

    if (errMsg === "Access unavailable" || errMsg === "Token expired" || errMsg === "Session ended") {
      throw new SessionExpiredError();
    }

    throw new Error(errMsg || "Request failed");
  }

  if (data?.error) {
    if (data.error === "Access unavailable" || data.error === "Token expired" || data.error === "Session ended") {
      throw new SessionExpiredError();
    }
    throw new Error(data.error);
  }

  return data;
}
