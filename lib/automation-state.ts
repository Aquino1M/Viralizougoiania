export type AutomationState = {
  enabled: boolean;
  interval_minutes: number;
  queue_mode: "1_per_category";
  last_run_at: string | null;
  last_success_at: string | null;
  next_run_at: string | null;
  last_found: number;
  last_added: number;
  last_published: number;
  last_hydrated: number;
  last_error: string;
  running_until: string | null;
  updated_at?: string | null;
};

const DEFAULT_STATE: AutomationState = {
  enabled: true,
  interval_minutes: 10,
  queue_mode: "1_per_category",
  last_run_at: null,
  last_success_at: null,
  next_run_at: null,
  last_found: 0,
  last_added: 0,
  last_published: 0,
  last_hydrated: 0,
  last_error: "",
  running_until: null,
};

function supabaseConfig() {
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim().replace(/\/$/, "");
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();
  if (!url || !key || !url.includes(".supabase.co") || key.length < 20) return null;
  return { url, key };
}

function headers(key: string, extra: Record<string,string> = {}) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

export function automationConfigured() {
  return Boolean(supabaseConfig());
}

export async function getAutomationState(): Promise<AutomationState> {
  const cfg = supabaseConfig();
  if (!cfg) return { ...DEFAULT_STATE, enabled: false, last_error: "Supabase não configurado." };

  try {
    const res = await fetch(`${cfg.url}/rest/v1/settings?id=eq.automation&select=data,updated_at&limit=1`, {
      headers: headers(cfg.key),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Supabase ${res.status}`);
    const rows = await res.json();
    if (!Array.isArray(rows) || !rows[0]?.data) return { ...DEFAULT_STATE };
    return {
      ...DEFAULT_STATE,
      ...(rows[0].data as Partial<AutomationState>),
      updated_at: rows[0].updated_at || null,
    };
  } catch (e) {
    return {
      ...DEFAULT_STATE,
      enabled: false,
      last_error: e instanceof Error ? e.message : "Erro ao ler estado da automação.",
    };
  }
}

export async function saveAutomationState(patch: Partial<AutomationState>): Promise<AutomationState> {
  const cfg = supabaseConfig();
  if (!cfg) throw new Error("Supabase não configurado.");

  const current = await getAutomationState();
  const next: AutomationState = {
    ...DEFAULT_STATE,
    ...current,
    ...patch,
  };
  delete (next as Partial<AutomationState>).updated_at;

  const res = await fetch(`${cfg.url}/rest/v1/settings?on_conflict=id`, {
    method: "POST",
    headers: headers(cfg.key, { Prefer: "resolution=merge-duplicates,return=minimal" }),
    body: JSON.stringify({
      id: "automation",
      data: next,
      updated_at: new Date().toISOString(),
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Supabase ${res.status}: ${body}`);
  }
  return next;
}
