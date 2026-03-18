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
    const directMessage = maybeError.message;

    try {
      return JSON.parse(directMessage) as { error?: string };
    } catch {
      const nestedJsonMatch = directMessage.match(/\{.*\}$/);
      if (nestedJsonMatch) {
        try {
          return JSON.parse(nestedJsonMatch[0]) as { error?: string };
        } catch {
          // ignore nested parse failure and fall through
        }
      }
    }
  }

  return null;
}

function isSessionEndedMessage(message?: string | null): boolean {
  return message === "Access unavailable" || message === "Token expired" || message === "Session ended";
}

function isSessionEndedError(error: unknown, errBody: { error?: string } | null): boolean {
  if (isSessionEndedMessage(errBody?.error)) return true;

  if (!error || typeof error !== "object") return false;

  const maybeError = error as {
    message?: string;
    context?: { status?: number };
    status?: number;
  };

  const status = maybeError.context?.status ?? maybeError.status;
  if (status === 401) {
    if (!maybeError.message) return true;
    if (
      maybeError.message.includes("Session ended") ||
      maybeError.message.includes("Access unavailable") ||
      maybeError.message.includes("Token expired")
    ) {
      return true;
    }
  }

  return false;
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

    if (isSessionEndedError(error, errBody)) {
      throw new SessionExpiredError();
    }

    throw new Error(errMsg || "Request failed");
  }

  if (data?.error) {
    if (isSessionEndedMessage(data.error)) {
      throw new SessionExpiredError();
    }
    throw new Error(data.error);
  }

  return data;
}
