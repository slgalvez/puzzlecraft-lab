const ACCESS_GRANT_KEY = "private_access_grant";
const ACCESS_GRANT_FALLBACK_KEY = "private_access_grant_fallback";

interface AccessGrant {
  exp: number;
}

function parseGrant(raw: string | null): AccessGrant | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<AccessGrant>;
    if (!parsed.exp || parsed.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return { exp: parsed.exp };
  } catch {
    return null;
  }
}

export function setPrivateAccessGrant(exp: number): void {
  const value = JSON.stringify({ exp });
  sessionStorage.setItem(ACCESS_GRANT_KEY, value);
  localStorage.setItem(ACCESS_GRANT_FALLBACK_KEY, value);
}

export function clearPrivateAccessGrant(): void {
  sessionStorage.removeItem(ACCESS_GRANT_KEY);
  localStorage.removeItem(ACCESS_GRANT_FALLBACK_KEY);
}

export function hasPrivateAccessGrant(): boolean {
  const sessionGrant = parseGrant(sessionStorage.getItem(ACCESS_GRANT_KEY));
  if (sessionGrant) {
    localStorage.setItem(ACCESS_GRANT_FALLBACK_KEY, JSON.stringify(sessionGrant));
    return true;
  }

  const fallbackGrant = parseGrant(localStorage.getItem(ACCESS_GRANT_FALLBACK_KEY));
  if (fallbackGrant) {
    sessionStorage.setItem(ACCESS_GRANT_KEY, JSON.stringify(fallbackGrant));
    return true;
  }

  clearPrivateAccessGrant();
  return false;
}
