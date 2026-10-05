type AnalyticsOverview = {
  today: { visitors: number; pageviews: number };
  month: { visitors: number; pageviews: number };
  average30: { visitors: number; pageviews: number };
  daily: Array<{ date: string; visitors: number; pageviews: number }>;
  topPages: Array<{ path: string; visitors: number; pageviews: number }>;
  trackingSince: string | null;
};

function config() {
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim().replace(/\/$/, "");
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!url || !key) throw new Error("Supabase de analytics não configurado.");
  return { url, key };
}

function headers(key: string, extra: Record<string,string> = {}) {
  return { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...extra };
}

export async function recordPageview(visitorId: string, path: string, referrerHost: string | null) {
  const cfg = config();
  const res = await fetch(`${cfg.url}/rest/v1/site_pageviews`, {
    method: "POST",
    headers: headers(cfg.key, { Prefer: "return=minimal" }),
    body: JSON.stringify({ visitor_id: visitorId, path, referrer_host: referrerHost }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Analytics insert ${res.status}`);
}

export async function getAnalyticsOverview(): Promise<AnalyticsOverview> {
  const cfg = config();
  const res = await fetch(`${cfg.url}/rest/v1/rpc/site_analytics_overview`, {
    method: "POST",
    headers: headers(cfg.key),
    body: "{}",
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Analytics RPC ${res.status}: ${body}`);
  }
  return await res.json();
}
