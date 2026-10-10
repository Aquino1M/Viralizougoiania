const JOB_PREFIX = "viralizou_ig_job_";

function randomToken() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return String(Date.now()) + "_" + Math.random().toString(36).slice(2);
}

function notifyTab(tabId, status, message) {
  if (tabId == null) return;
  chrome.tabs.sendMessage(tabId, {
    type: "INSTAGRAM_HELPER_STATUS",
    status,
    message
  }).catch(() => {});
}

async function saveJob(job) {
  await chrome.storage.session.set({
    [JOB_PREFIX + job.token]: job,
    active_viralizou_job: job.token
  });
}

async function getJob(token) {
  const data = await chrome.storage.session.get(JOB_PREFIX + token);
  return data[JOB_PREFIX + token] || null;
}

async function updateJob(token, patch) {
  const job = await getJob(token);
  if (!job) return;
  await saveJob({ ...job, ...patch });
}

function isInstagramUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && /(^|\.)instagram\.com$/i.test(u.hostname) &&
      /^\/(?:reel|reels|p|tv)\//i.test(u.pathname);
  } catch {
    return false;
  }
}

async function startJob(url, sourceTabId) {
  if (!isInstagramUrl(url)) {
    notifyTab(sourceTabId, "error", "Cole um link direto de Reel/publicação do Instagram.");
    return;
  }

  const token = randomToken();
  const job = {
    token,
    sourceTabId,
    url,
  };
  await saveJob(job);

  const tab = await chrome.tabs.create({ url, active: false });
  await updateJob(token, { instagramTabId: tab.id });
  notifyTab(sourceTabId, "starting", "Buscando o Reel em segundo plano com a sessão já conectada...");
}

async function finishJob(token, status, message, finishedTabId) {
  const job = await getJob(token);
  if (!job) return;
  notifyTab(job.sourceTabId, status, message);
  const tabsToClose = [...new Set([job.instagramTabId, ...(status === "error" ? [finishedTabId] : [])].filter((id) => Number.isInteger(id)))];
  await Promise.all(tabsToClose.map((tabId) => chrome.tabs.remove(tabId).catch(() => {})));
  await chrome.storage.session.remove(JOB_PREFIX + token);
  const { active_viralizou_job } = await chrome.storage.session.get("active_viralizou_job");
  if (active_viralizou_job === token) await chrome.storage.session.remove("active_viralizou_job");
}

chrome.runtime.onMessage.addListener((message, sender) => {
  if (!message) return;

  if (message.type === "START_REEL_JOB") {
    startJob(String(message.url || ""), sender.tab?.id).catch((error) => {
      notifyTab(sender.tab?.id, "error", error?.message || "Falha ao abrir o Instagram.");
    });
    return;
  }

  if (message.type === "REEL_DOWNLOAD_DONE" || message.type === "REEL_DOWNLOAD_FAILED") {
    const token = String(message.token || "");
    if (!token) return;
    void finishJob(
      token,
      message.type === "REEL_DOWNLOAD_DONE" ? "ready" : "error",
      message.type === "REEL_DOWNLOAD_DONE"
        ? "✅ Download enviado ao navegador."
        : String(message.error || "Não foi possível baixar o vídeo."),
      sender.tab?.id
    ).catch(() => {});
    return;
  }

  if (message.type === "REEL_MEDIA_FOUND") {
    const tokenPromise = chrome.storage.session.get("active_viralizou_job");
    tokenPromise.then(async ({ active_viralizou_job }) => {
      const job = await getJob(active_viralizou_job);
      if (!job) return;
      const token = job.token;
      const mediaUrl = String(message.mediaUrl || "").trim();
      if (!mediaUrl) return;

      await updateJob(token, {
        mediaUrl,
        shortcode: message.shortcode || "instagram",
        pageUrl: message.pageUrl || job.url
      });

      const sourceTab = job.sourceTabId;
      notifyTab(sourceTab, "opened", "Vídeo encontrado. Baixando pelo navegador logado...");

      await chrome.tabs.create({
        url: chrome.runtime.getURL("downloader.html?token=" + encodeURIComponent(token)),
        active: false
      });
    });
    return;
  }

  if (message.type === "REEL_MEDIA_NOT_FOUND") {
    chrome.storage.session.get("active_viralizou_job").then(async ({ active_viralizou_job }) => {
      if (!active_viralizou_job) return;
      await finishJob(active_viralizou_job, "error", "Não consegui localizar o vídeo usando a sessão atual do navegador.", sender.tab?.id);
    });
    return;
  }
});

chrome.tabs.onUpdated.addListener((tabId, info) => {
  if (info.status !== "complete") return;

  chrome.storage.session.get("active_viralizou_job").then(async ({ active_viralizou_job }) => {
    if (!active_viralizou_job) return;
    const job = await getJob(active_viralizou_job);
    if (!job || job.instagramTabId !== tabId) return;

    notifyTab(job.sourceTabId, "opened", "Página carregada em segundo plano. Capturando o vídeo...");
    chrome.tabs.sendMessage(tabId, { type: "CAPTURE_REEL_MEDIA" }).catch(() => {});
  });
});
