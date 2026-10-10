async function run() {
  const params = new URLSearchParams(location.search);
  const token = params.get("token");
  const status = document.getElementById("status");
  const progress = document.getElementById("progress");

  if (!token) {
    status.textContent = "Token do download ausente.";
    return;
  }

  const key = "viralizou_ig_job_" + token;
  const data = await chrome.storage.session.get(key);
  const job = data[key];

  if (!job || !job.mediaUrl) {
    status.textContent = "Arquivo de vídeo não encontrado.";
    return;
  }

  const shortcode = (job.shortcode || "instagram").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
  const filename = "viralizou-instagram-" + (shortcode || "reel") + ".mp4";

  try {
    status.textContent = "Baixando o arquivo pelo navegador...";
    progress.style.width = "20%";

    const response = await fetch(job.mediaUrl, {
      method: "GET",
      credentials: "include",
      redirect: "follow",
      referrer: "https://www.instagram.com/",
      referrerPolicy: "strict-origin-when-cross-origin",
      cache: "no-store"
    });

    if (!response.ok) throw new Error("Instagram/CDN HTTP " + response.status);

    const blob = await response.blob();
    if (!blob.size) throw new Error("Arquivo vazio.");

    progress.style.width = "70%";
    const objectUrl = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();

    setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);

    progress.style.width = "100%";
    status.textContent = "✅ Download iniciado. Você pode fechar esta aba.";

    chrome.runtime.sendMessage({ type: "REEL_DOWNLOAD_DONE", token });
    setTimeout(() => window.close(), 5000);
  } catch (error) {
    // Fallback: tenta o download nativo com a URL assinada capturada pelo navegador.
    try {
      await chrome.downloads.download({
        url: job.mediaUrl,
        filename,
        saveAs: true
      });
      progress.style.width = "100%";
      status.textContent = "✅ Download enviado para o gerenciador de downloads.";
      chrome.runtime.sendMessage({ type: "REEL_DOWNLOAD_DONE", token });
      setTimeout(() => window.close(), 5000);
    } catch (fallbackError) {
      const message = "Não foi possível baixar automaticamente. " + (fallbackError?.message || error?.message || "");
      status.textContent = message;
      chrome.runtime.sendMessage({ type: "REEL_DOWNLOAD_FAILED", token, error: message });
    }
  }
}

run().catch((error) => {
  document.getElementById("status").textContent = error?.message || "Erro no download.";
});
