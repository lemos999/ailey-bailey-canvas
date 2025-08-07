// [CoreDNA] 챗봇 MVP 전용 부트스트래퍼
(async () => {
  document.body.style.visibility = 'hidden';
  const BASE_URL = 'https://lemos999.github.io/ailey-bailey-canvas/chatbot_mvp_src/';
  try {
    const response = await fetch(`${BASE_URL}config_chatbot.json`);
    if (!response.ok) throw new Error(`Config not found`);
    const config = await response.json();
    await Promise.all(config.stylesheets.map(path => loadCss(`${BASE_URL}${path}`)));
    document.body.innerHTML = config.bodyHtml;
    for (const path of config.scripts) { await loadScript(`${BASE_URL}${path}`); }
    console.log("Chatbot MVP Initialized.");
  } catch (error) {
    console.error("Chatbot MVP failed to load:", error);
    document.body.innerHTML = `<div style="color:red;padding:20px;"><h1>Error</h1><p>Failed to load chatbot application.</p></div>`;
  } finally {
    document.body.style.visibility = 'visible';
  }
  function loadCss(url) { return new Promise((resolve, reject) => { const link = document.createElement("link"); link.rel = "stylesheet"; link.href = url; link.onload = () => resolve(); link.onerror = () => reject(new Error(`CSS load error for ${url}`)); document.head.appendChild(link); }); }
  function loadScript(url) { return new Promise((resolve, reject) => { const script = document.createElement("script"); script.src = url; script.defer = true; script.onload = () => resolve(); script.onerror = () => reject(new Error(`Script load error for ${url}`)); document.body.appendChild(script); }); }
})();