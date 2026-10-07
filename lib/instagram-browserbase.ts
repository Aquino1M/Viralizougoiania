import { getSettings, updateSettings } from "@/lib/storage";

const BB_API = "https://api.browserbase.com";

function config() {
  const apiKey = (process.env.BROWSERBASE_API_KEY || "").trim();
  const projectId = (process.env.BROWSERBASE_PROJECT_ID || "").trim();
  if (!apiKey || !projectId) {
    throw new Error("Instagram sem extensão precisa do Browserbase. Configure BROWSERBASE_API_KEY e BROWSERBASE_PROJECT_ID na Vercel.");
  }
  return { apiKey, projectId };
}

async function bb(path: string, init: RequestInit = {}) {
  const { apiKey } = config();
  const response = await fetch(BB_API + path, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-BB-API-Key": apiKey,
      ...(init.headers || {}),
    },
    cache: "no-store",
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Browserbase HTTP ${response.status}: ${text.slice(0, 500)}`);
  }
  return response;
}

export async function getInstagramContextId() {
  const envId = (process.env.BROWSERBASE_CONTEXT_ID || "").trim();
  if (envId) return envId;

  const settings = await getSettings();
  const saved = String((settings as any).instagram_browser_context_id || "").trim();
  return saved;
}

export async function ensureInstagramContext() {
  const existing = await getInstagramContextId();
  if (existing) return existing;

  const { projectId } = config();
  const response = await bb("/v1/contexts", {
    method: "POST",
    body: JSON.stringify({ projectId }),
  });
  const data = await response.json() as { id?: string };
  if (!data.id) throw new Error("O Browserbase não retornou o ID do contexto.");
  await updateSettings({ instagram_browser_context_id: data.id } as any);
  return data.id;
}

export async function createInstagramBrowser(options: { persist: boolean; timeout?: number } = { persist: false }) {
  const { projectId } = config();
  const contextId = await ensureInstagramContext();
  const response = await bb("/v1/sessions", {
    method: "POST",
    body: JSON.stringify({
      projectId,
      timeout: options.timeout || 900,
      keepAlive: true,
      browserSettings: {
        context: { id: contextId, persist: options.persist },
        solveCaptchas: true,
        recordSession: true,
        viewport: { width: 1440, height: 900 },
      },
    }),
  });
  const session = await response.json() as { id?: string; connectUrl?: string };
  if (!session.id || !session.connectUrl) throw new Error("O Browserbase não retornou uma sessão válida.");
  return { ...session, contextId };
}

export async function debugInstagramSession(sessionId: string) {
  const response = await bb(`/v1/sessions/${encodeURIComponent(sessionId)}/debug?expiresIn=1800`);
  return await response.json() as {
    debuggerFullscreenUrl?: string;
    debuggerUrl?: string;
    pages?: Array<{ id: string; url: string; title: string; debuggerFullscreenUrl?: string }>;
  };
}

export async function releaseInstagramSession(sessionId: string) {
  try {
    await bb(`/v1/sessions/${encodeURIComponent(sessionId)}`, {
      method: "POST",
      body: JSON.stringify({ status: "REQUEST_RELEASE" }),
    });
  } catch {}
}

type CdpMessage = {
  id?: number;
  method?: string;
  params?: any;
  result?: any;
  error?: any;
};

class CdpClient {
  private ws: WebSocket;
  private nextId = 1;
  private pending = new Map<number, { resolve: (v: any) => void; reject: (e: any) => void }>();
  public events: CdpMessage[] = [];

  private constructor(ws: WebSocket) {
    this.ws = ws;
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(String(event.data)) as CdpMessage;
        if (message.id && this.pending.has(message.id)) {
          const p = this.pending.get(message.id)!;
          this.pending.delete(message.id);
          if (message.error) p.reject(new Error(message.error.message || "CDP error"));
          else p.resolve(message.result);
        } else {
          this.events.push(message);
          if (this.events.length > 2000) this.events.splice(0, 500);
        }
      } catch {}
    };
  }

  static async connect(url: string) {
    const ws = new WebSocket(url);
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Tempo esgotado ao conectar ao navegador remoto.")), 12000);
      ws.addEventListener("open", () => { clearTimeout(timer); resolve(); }, { once: true });
      ws.addEventListener("error", () => { clearTimeout(timer); reject(new Error("Não foi possível conectar ao navegador remoto.")); }, { once: true });
    });
    return new CdpClient(ws);
  }

  command(method: string, params: any = {}, sessionId?: string): Promise<any> {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
      setTimeout(() => {
        if (!this.pending.has(id)) return;
        this.pending.delete(id);
        reject(new Error(`CDP timeout: ${method}`));
      }, 20000);
    });
  }

  close() {
    try { this.ws.close(); } catch {}
  }
}

async function delay(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function attachPage(cdp: CdpClient) {
  const targets = await cdp.command("Target.getTargets");
  let target = (targets.targetInfos || []).find((t: any) => t.type === "page" && !String(t.url || "").startsWith("devtools://"));
  if (!target) {
    const created = await cdp.command("Target.createTarget", { url: "about:blank" });
    target = { targetId: created.targetId };
  }
  const attached = await cdp.command("Target.attachToTarget", { targetId: target.targetId, flatten: true });
  const sessionId = attached.sessionId;
  await cdp.command("Page.enable", {}, sessionId);
  await cdp.command("Runtime.enable", {}, sessionId);
  await cdp.command("Network.enable", {}, sessionId);
  return { sessionId, targetId: target.targetId };
}

async function evaluate(cdp: CdpClient, sessionId: string, expression: string) {
  const result = await cdp.command("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  }, sessionId);
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || "Falha ao executar JavaScript no navegador.");
  }
  return result.result?.value;
}

async function navigate(cdp: CdpClient, sessionId: string, url: string) {
  await cdp.command("Page.navigate", { url }, sessionId);
  await delay(5500);
}

function cleanUrl(value: unknown) {
  if (typeof value !== "string") return "";
  const v = value.trim().replace(/\\u0026/gi, "&").replace(/\\\//g, "/");
  try {
    const parsed = new URL(v);
    if (parsed.protocol !== "https:") return "";
    return parsed.toString();
  } catch {
    return "";
  }
}

export async function openInstagramLoginSession() {
  const session = await createInstagramBrowser({ persist: true, timeout: 1800 });
  const cdp = await CdpClient.connect(session.connectUrl!);
  try {
    const page = await attachPage(cdp);
    await navigate(cdp, page.sessionId, "https://www.instagram.com/");
    const debug = await debugInstagramSession(session.id!);
    return {
      sessionId: session.id,
      contextId: session.contextId,
      liveViewUrl: debug.debuggerFullscreenUrl || debug.pages?.[0]?.debuggerFullscreenUrl || debug.debuggerUrl || "",
    };
  } catch (error) {
    cdp.close();
    await releaseInstagramSession(session.id!);
    throw error;
  } finally {
    cdp.close();
  }
}

export async function inspectInstagramSession(sessionId: string) {
  const { apiKey } = config();
  void apiKey;
  const response = await bb(`/v1/sessions/${encodeURIComponent(sessionId)}`);
  const info = await response.json() as { status?: string; connectUrl?: string };
  if (!info.connectUrl) return { status: info.status || "UNKNOWN", loggedIn: false, url: "" };

  const cdp = await CdpClient.connect(info.connectUrl);
  try {
    const page = await attachPage(cdp);
    const data = await evaluate(cdp, page.sessionId, `(() => ({
      url: location.href,
      title: document.title,
      text: (document.body?.innerText || "").slice(0, 5000)
    }))()`);
    const url = String(data?.url || "");
    const text = String(data?.text || "");
    const loggedIn = url.toLowerCase().includes("instagram.com")
      && !url.includes("/accounts/login")
      && !url.includes("/accounts/signup")
      && !url.includes("/challenge")
      && !url.includes("/checkpoint")
      && !/(Log in|Entrar|Cadastre-se|Sign up)/i.test(text.slice(0, 1200));
    return { status: info.status || "UNKNOWN", loggedIn, url, title: String(data?.title || "") };
  } finally {
    cdp.close();
  }
}

export async function resolveInstagramWithBrowser(rawUrl: string) {
  const session = await createInstagramBrowser({ persist: false, timeout: 120 });
  const cdp = await CdpClient.connect(session.connectUrl!);
  try {
    const page = await attachPage(cdp);
    const mediaEvents: string[] = [];
    await navigate(cdp, page.sessionId, rawUrl);
    for (const event of cdp.events) {
      if (event.method !== "Network.responseReceived") continue;
      const response = event.params?.response;
      const mime = String(response?.mimeType || "");
      const url = cleanUrl(response?.url);
      if (url && (mime.startsWith("video/") || /\\.(mp4|m3u8)(?:[?#]|$)/i.test(url) || /cdninstagram|fbcdn/i.test(url))) {
        mediaEvents.push(url);
      }
    }

    const data = await evaluate(cdp, page.sessionId, `(() => {
      const metas = Array.from(document.querySelectorAll('meta')).map((m) => ({
        key: m.getAttribute('property') || m.getAttribute('name') || '',
        value: m.getAttribute('content') || ''
      }));
      const videos = Array.from(document.querySelectorAll('video')).map((v) => v.currentSrc || v.src).filter(Boolean);
      const resources = performance.getEntriesByType('resource').map((r) => r.name).filter(Boolean);
      const html = document.documentElement?.innerHTML || '';
      const meta = (key) => metas.find((m) => m.key.toLowerCase() === key.toLowerCase())?.value || '';
      const candidates = [
        ...videos,
        ...resources,
        meta('og:video:secure_url'),
        meta('og:video'),
        ...Array.from(html.matchAll(/"video_url"\\s*:\\s*"((?:\\\\.|[^"])*)"/gi)).map((m) => m[1]),
        ...Array.from(html.matchAll(/"contentUrl"\\s*:\\s*"((?:\\\\.|[^"])*)"/gi)).map((m) => m[1]),
        ...Array.from(html.matchAll(/https?:\\\\/\\\\/[^"'< >]+?\\\\.mp4(?:[^"'< >]*)?/gi)).map((m) => m[0])
      ];
      return {
        title: meta('og:title') || document.title || 'Vídeo do Instagram',
        author: meta('author') || meta('instagram:creator') || '',
        thumbnailUrl: meta('og:image') || meta('twitter:image') || '',
        candidates
      };
    })()`);

    const allCandidates = [...(data?.candidates || []), ...mediaEvents]
      .map(cleanUrl)
      .filter((u: string) => u && !/\.m3u8(?:[?#]|$)/i.test(u));
    const mediaUrl = allCandidates.find((u: string) => /\.mp4(?:[?#]|$)/i.test(u))
      || allCandidates.find((u: string) => /cdninstagram|fbcdn/i.test(u))
      || allCandidates[0] || "";

    if (!mediaUrl) {
      throw new Error("O navegador remoto conseguiu abrir o Instagram, mas não encontrou o MP4. Abra o Reel no navegador conectado e tente novamente.");
    }

    return {
      title: String(data?.title || "Vídeo do Instagram").replace(/\\s+/g, " ").trim(),
      author: String(data?.author || "").trim(),
      thumbnailUrl: cleanUrl(data?.thumbnailUrl),
      mediaUrl,
    };
  } finally {
    cdp.close();
    await releaseInstagramSession(session.id!);
  }
}
