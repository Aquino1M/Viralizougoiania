export type AutomationState = {
  enabled: boolean;
  interval_minutes: number;
  queue_mode: "1_per_10m" | "2_per_10m" | "3_per_10m" | "1_per_category" | "3_per_category";
  last_run_at: string | null;
  last_success_at: string | null;
  next_run_at: string | null;
  last_found: number;
  last_added: number;
  last_published: number;
  last_hydrated: number;
  last_reclassified: number;
  last_football_sync: string | null;
  last_round: number;
  last_fixtures: number;
  last_source_counts: Record<string, number>;
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
  last_reclassified: 0,
  last_football_sync: null,
  last_round: 0,
  last_fixtures: 0,
  last_source_counts: {},
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


export type RadarSnapshotItem = {
  title: string;
  excerpt: string;
  category?: string;
  image_url: string;
  video_url?: string;
  source_name: string;
  source_url: string;
  source_author?: string;
  published_at?: string | null;
  radar_group: "goias" | "brasil" | "futebol" | "fofocas";
};

export type RadarSnapshot = {
  updated_at: string | null;
  items: RadarSnapshotItem[];
  source_counts: Record<string, number>;
};

export async function getRadarSnapshot(): Promise<RadarSnapshot> {
  const cfg = supabaseConfig();
  if (!cfg) return { updated_at: null, items: [], source_counts: {} };
  try {
    const res = await fetch(`${cfg.url}/rest/v1/settings?id=eq.radar_snapshot&select=data,updated_at&limit=1`, {
      headers: headers(cfg.key),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Supabase ${res.status}`);
    const rows = await res.json();
    if (!Array.isArray(rows) || !rows[0]?.data) return { updated_at: null, items: [], source_counts: {} };
    const data = rows[0].data as Partial<RadarSnapshot>;
    return {
      updated_at: data.updated_at || rows[0].updated_at || null,
      items: Array.isArray(data.items) ? data.items : [],
      source_counts: data.source_counts || {},
    };
  } catch {
    return { updated_at: null, items: [], source_counts: {} };
  }
}

export async function saveRadarSnapshot(snapshot: RadarSnapshot): Promise<void> {
  const cfg = supabaseConfig();
  if (!cfg) return;
  const payload: RadarSnapshot = {
    updated_at: snapshot.updated_at || new Date().toISOString(),
    items: snapshot.items.slice(0, 700),
    source_counts: snapshot.source_counts || {},
  };
  const res = await fetch(`${cfg.url}/rest/v1/settings?on_conflict=id`, {
    method: "POST",
    headers: headers(cfg.key, { Prefer: "resolution=merge-duplicates,return=minimal" }),
    body: JSON.stringify({
      id: "radar_snapshot",
      data: payload,
      updated_at: payload.updated_at,
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Supabase ${res.status}: ${body}`);
  }
}
