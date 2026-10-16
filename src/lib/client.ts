export async function api<T = any>(
  path: string,
  init?: { method?: string; body?: unknown }
): Promise<{ ok: boolean; status: number; data: T }> {
  try {
    const hasBody = init?.body !== undefined;
    const res = await fetch(path, {
      method: init?.method ?? (hasBody ? "POST" : "GET"),
      headers: hasBody ? { "Content-Type": "application/json" } : undefined,
      body: hasBody ? JSON.stringify(init?.body) : undefined,
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data: data as T };
  } catch {
    return {
      ok: false,
      status: 0,
      data: { error: "Network error. Check your connection and try again." } as T,
    };
  }
}
