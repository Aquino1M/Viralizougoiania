(() => {
  const SITE_EVENT = "viralizou-instagram-download";
  const READY_EVENT = "viralizou-instagram-helper-ready";
  const STATUS_EVENT = "viralizou-instagram-helper-status";

  function emit(status, message) {
    window.dispatchEvent(new CustomEvent(STATUS_EVENT, {
      detail: { status, message: message || "" },
    }));
  }

  function getShortcode(url) {
    try {
      const u = new URL(url);
      const part = u.pathname.split("/").filter(Boolean)[1] || "instagram";
      return part.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80) || "instagram";
    } catch {
      return "instagram";
    }
  }

  function scanVideos() {
    const found = [];

    for (const video of document.querySelectorAll("video")) {
      const urls = [video.currentSrc, video.src];
      for (const url of urls) {
        if (url && /^https?:\/\//i.test(url)) found.push(url);
      }
      for (const source of video.querySelectorAll("source")) {
        if (source.src && /^https?:\/\//i.test(source.src)) found.push(source.src);
      }
    }

    const entries = performance.getEntriesByType("resource");
    for (const entry of entries) {
      const name = entry && entry.name ? String(entry.name) : "";
      if (
        /^https?:\/\//i.test(name) &&
        /(cdninstagram\.com|fbcdn\.net|\.mp4(?:[?&]|$)|\/t50\.|\/t51\.)/i.test(name)
      ) {
        found.push(name);
      }
    }

    return [...new Set(found)].sort((a, b) => {
      const score = (url) => {
        let value = 0;
        if (/\.mp4(?:[?&]|$)/i.test(url)) value += 6;
        if (/cdninstagram\.com|fbcdn\.net/i.test(url)) value += 4;
        if (/\/t50\.|\/t51\./i.test(url)) value += 2;
        return value;
      };
      return score(b) - score(a);
    });
  }

  if (location.hostname.includes("instagram.com")) {
    window.dispatchEvent(new CustomEvent(READY_EVENT));

    chrome.runtime.onMessage.addListener((message) => {
      if (!message || message.type !== "CAPTURE_REEL_MEDIA") return;

      emit("opened", "Instagram aberto. Procurando o arquivo que o navegador recebeu...");

      let attempts = 0;
      const timer = setInterval(() => {
        attempts += 1;
        const candidates = scanVideos();

        if (candidates.length) {
          clearInterval(timer);
          chrome.runtime.sendMessage({
            type: "REEL_MEDIA_FOUND",
            mediaUrl: candidates[0],
            shortcode: getShortcode(location.href),
            pageUrl: location.href,
          });
          return;
        }

        if (attempts >= 20) {
          clearInterval(timer);
          chrome.runtime.sendMessage({
            type: "REEL_MEDIA_NOT_FOUND",
            reason: "O Instagram não expôs uma URL de vídeo direta nesta aba."
          });
        }
      }, 1000);
    });
  }

  if (
    location.hostname === "viralizougoiania.vercel.app" ||
    location.hostname === "viralizougoiania-grupo-aquino.vercel.app" ||
    location.hostname === "localhost" ||
    location.hostname === "127.0.0.1"
  ) {
    window.dispatchEvent(new CustomEvent(READY_EVENT));

    chrome.runtime.onMessage.addListener((message) => {
      if (message?.type === "INSTAGRAM_HELPER_STATUS") emit(message.status, message.message);
    });

    window.addEventListener(SITE_EVENT, (event) => {
      const detail = event.detail || {};
      const value = String(detail.url || "").trim();
      if (!value) return;

      chrome.runtime.sendMessage({
        type: "START_REEL_JOB",
        url: value,
      });

      emit("starting", "Abrindo o Instagram no navegador logado...");
    });

    window.addEventListener("viralizou-instagram-helper-ping", () => {
      window.dispatchEvent(new CustomEvent(READY_EVENT));
    });
  }
})();
