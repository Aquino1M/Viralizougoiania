const JOB_PREFIX = "viralizou_ig_job_";

function randomToken() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return String(Date.now()) + "_" + Math.random().toString(36).slice(2);
}

function notifyTab(tabId, status, message) {
  if (!tabId) return;
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
    return /(^|\.)instagram\.com$/i.test(u.hostname) &&
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
    createdAt: Date.now(),
    mediaCandidates: []
  };
  await saveJob(job);

  const tab = await chrome.tabs.create({ url, active: true });
  await updateJob(token, { instagramTabId: tab.id });
  notifyTab(sourceTabId, "starting", "Instagram aberto. Aguarde o auxiliar capturar o vídeo...");
}

function scoreMediaUrl(url) {
  let score = 0;
  if (/\.mp4(?:[?&]|$)/i.test(url)) score += 10;
  if (/cdninstagram\.com|fbcdn\.net|fbsbx\.com/i.test(url)) score += 8;
  if (/\/t50\.|\/t51\./i.test(url)) score += 4;
  if (/(video|reel|clip)/i.test(url)) score += 1;
  return score;
}

async function captureNetworkRequest(details) {
  if (!details || !details.tabId || !/^https?:\/\//i.test(details.url || "")) return;

  const data = await chrome.storage.session.get("active_viralizou_job");
  const token = data.active_viralizou_job;
  if (!token) return;

  const job = await getJob(token);
  if (!job || job.instagramTabId !== details.tabId) return;

  const url = details.url;
  if (!/(cdninstagram\.com|fbcdn\.net|fbsbx\.com|\.mp4(?:[?&]|$)|\/t50\.|\/t51\.)/i.test(url)) return;
  if (!job.mediaCandidates.includes(url)) {
    job.mediaCandidates = [...job.mediaCandidates, url].slice(-30);
    await saveJob(job);
  }
}

chrome.webRequest.onBeforeRequest.addListener(
  captureNetworkRequest,
  {
    urls: [
      "https://*.cdninstagram.com/*",
      "https://*.fbcdn.net/*",
      "https://*.fbsbx.com/*"
    ]
  }
);

chrome.runtime.onMessage.addListener((message, sender) => {
  if (!message) return;

  if (message.type === "START_REEL_JOB") {
    startJob(String(message.url || ""), sender.tab?.id).catch((error) => {
      notifyTab(sender.tab?.id, "error", error?.message || "Falha ao abrir o Instagram.");
    });
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
      const job = await getJob(active_viralizou_job);
      if (!job) return;
      notifyTab(job.sourceTabId, "error", "Não consegui localizar o arquivo de vídeo nesta página do Instagram. Tente iniciar o download com o Reel já reproduzindo.");
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

    notifyTab(tabId, "opened", "Página carregada. Capturando o vídeo...");
    chrome.tabs.sendMessage(tabId, { type: "CAPTURE_REEL_MEDIA" }).catch(() => {});
  });
});
