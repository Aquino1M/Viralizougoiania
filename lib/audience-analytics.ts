type AnalyticsOverview = {
  today: { visitors: number; pageviews: number };
  month: { visitors: number; pageviews: number };
  average30: { visitors: number; pageviews: number };
  daily: Array<{ date: string; visitors: number; pageviews: number }>;
  topPages: Array<{ path: string; visitors: number; pageviews: number }>;
  trackingSince: string | null;
};

type AudienceRow = {
  id: string;
  data: {
    pageviews?: number;
    paths?: Record<string, number>;
    first_at?: string;
    last_at?: string;
    referrer_host?: string | null;
  } | null;
  updated_at?: string | null;
};

function config() {
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim().replace(/\/$/, "");
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!url || !key) throw new Error("Supabase de analytics não configurado.");
  return { url, key };
}

function headers(key: string, extra: Record<string,string> = {}) {
  return { apikey: key, Authorization: "Bearer " + key, "Content-Type": "application/json", ...extra };
}

function localDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || "";
  return get("year") + "-" + get("month") + "-" + get("day");
}

function safeVisitorId(value: string) {
  return value.replace(/[^0-9a-f-]/gi, "").slice(0, 36);
}

function safePathKey(value: string) {
  return value.slice(0, 400);
}

async function readOne(id: string): Promise<AudienceRow | null> {
  const cfg = config();
  const res = await fetch(
    cfg.url + "/rest/v1/settings?id=eq." + encodeURIComponent(id) + "&select=id,data,updated_at&limit=1",
    { headers: headers(cfg.key), cache: "no-store" },
  );
  if (!res.ok) throw new Error("Analytics read " + res.status);
  const rows = await res.json();
  return Array.isArray(rows) && rows[0] ? rows[0] : null;
}

async function upsertRow(row: AudienceRow) {
  const cfg = config();
  const res = await fetch(cfg.url + "/rest/v1/settings?on_conflict=id", {
    method: "POST",
    headers: headers(cfg.key, { Prefer: "resolution=merge-duplicates,return=minimal" }),
    body: JSON.stringify(row),
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Analytics write " + res.status);
}

export async function recordPageview(visitorId: string, path: string, referrerHost: string | null) {
  const visitor = safeVisitorId(visitorId);
  if (!visitor) return;

  const day = localDateKey();
  const id = "audience_day_" + day + "_" + visitor;
  const now = new Date().toISOString();
  const current = await readOne(id);
  const previous = current?.data || {};
  const paths = { ...(previous.paths || {}) };
  const pathKey = safePathKey(path);
  paths[pathKey] = Number(paths[pathKey] || 0) + 1;

  await upsertRow({
    id,
    data: {
      pageviews: Number(previous.pageviews || 0) + 1,
      paths,
      first_at: previous.first_at || now,
      last_at: now,
      referrer_host: previous.referrer_host || referrerHost || null,
    },
    updated_at: now,
  });
}

function dateFromRowId(id: string) {
  const match = id.match(/^audience_day_(\d{4}-\d{2}-\d{2})_/);
  return match?.[1] || "";
}

function visitorFromRowId(id: string) {
  const match = id.match(/^audience_day_\d{4}-\d{2}-\d{2}_(.+)$/);
  return match?.[1] || "";
}

async function fetchAudienceRowsSince(sinceIso: string): Promise<AudienceRow[]> {
  const cfg = config();
  const pageSize = 1000;
  const rows: AudienceRow[] = [];

  for (let offset = 0; offset < 100000; offset += pageSize) {
    const query =
      "settings?select=id,data,updated_at&id=like.audience_day_*&updated_at=gte." + encodeURIComponent(sinceIso) +
      "&order=updated_at.asc&limit=" + pageSize + "&offset=" + offset;
    const res = await fetch(cfg.url + "/rest/v1/" + query, {
      headers: headers(cfg.key),
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Analytics list " + res.status);
    const batch = await res.json();
    if (!Array.isArray(batch) || batch.length === 0) break;
    rows.push(...batch);
    if (batch.length < pageSize) break;
  }
  return rows;
}

export async function getAnalyticsOverview(): Promise<AnalyticsOverview> {
  const now = new Date();
  const today = localDateKey(now);
  const monthKey = today.slice(0, 7);
  const since = new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000);
  const rows = await fetchAudienceRowsSince(since.toISOString());

  const dailyMap = new Map<string, { visitors: Set<string>; pageviews: number }>();
  const monthVisitors = new Set<string>();
  let monthPageviews = 0;
  const top = new Map<string, { visitors: Set<string>; pageviews: number }>();
  let trackingSince: string | null = null;

  for (const row of rows) {
    const day = dateFromRowId(row.id);
    const visitor = visitorFromRowId(row.id);
    if (!day || !visitor) continue;

    if (!trackingSince || (row.data?.first_at && row.data.first_at < trackingSince)) {
      trackingSince = row.data?.first_at || trackingSince;
    }

    if (!dailyMap.has(day)) dailyMap.set(day, { visitors: new Set(), pageviews: 0 });
    const d = dailyMap.get(day)!;
    d.visitors.add(visitor);
    d.pageviews += Number(row.data?.pageviews || 0);

    if (day.startsWith(monthKey)) {
      monthVisitors.add(visitor);
      monthPageviews += Number(row.data?.pageviews || 0);
    }

    for (const [path, count] of Object.entries(row.data?.paths || {})) {
      if (!top.has(path)) top.set(path, { visitors: new Set(), pageviews: 0 });
      const item = top.get(path)!;
      item.visitors.add(visitor);
      item.pageviews += Number(count || 0);
    }
  }

  const daily: Array<{ date: string; visitors: number; pageviews: number }> = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const key = localDateKey(date);
    const stats = dailyMap.get(key);
    daily.push({ date: key, visitors: stats?.visitors.size || 0, pageviews: stats?.pageviews || 0 });
  }

  const todayStats = dailyMap.get(today);
  const sum = daily.reduce(
    (acc, row) => ({ visitors: acc.visitors + row.visitors, pageviews: acc.pageviews + row.pageviews }),
    { visitors: 0, pageviews: 0 },
  );

  const topPages = [...top.entries()]
    .map(([path, value]) => ({ path, visitors: value.visitors.size, pageviews: value.pageviews }))
    .sort((a, b) => b.pageviews - a.pageviews || b.visitors - a.visitors)
    .slice(0, 10);

  return {
    today: { visitors: todayStats?.visitors.size || 0, pageviews: todayStats?.pageviews || 0 },
    month: { visitors: monthVisitors.size, pageviews: monthPageviews },
    average30: {
      visitors: Number((sum.visitors / 30).toFixed(1)),
      pageviews: Number((sum.pageviews / 30).toFixed(1)),
    },
    daily,
    topPages,
    trackingSince,
  };
}
