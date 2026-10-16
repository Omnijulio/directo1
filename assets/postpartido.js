(function () {
  "use strict";
  const core = window.Postpartido, params = new URLSearchParams(location.search);
  const allowed = ["auto", "espera", "visitante", "local"];
  const mode = allowed.includes(params.get("turno")) ? params.get("turno") : document.body.dataset.turno || "auto";
  const legacyRoot = document.body.dataset.postpartidoRoot === "1";
  const stage = document.createElement("main"); stage.id = "pg-stage";
  stage.innerHTML = '<div id="pg-demo" aria-hidden="true"></div>' +
    '<div id="pg-brand"><img src="assets/radio-evolucion.png" alt="Radio Evolución"></div>' +
    '<div id="pg-lower"><div id="pg-location"><svg viewBox="0 0 12 15" aria-hidden="true"><path d="M6 14s5-5.5 5-8A5 5 0 0 0 1 6c0 2.5 5 8 5 8Z" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="6" cy="6" r="1.5" fill="currentColor"/></svg><span id="pg-venue"></span></div>' +
    '<section id="pg-panel" aria-label="Declaraciones postpartido" aria-live="polite" hidden><div id="pg-emblem"><span id="pg-fallback" aria-hidden="true"></span><img id="pg-image" alt=""></div><div id="pg-copy"><h1 id="pg-title"></h1><p id="pg-subtitle"></p></div></section></div>';
  document.body.appendChild(stage);
  if (params.get("demo") === "1") document.body.classList.add("demo");
  const $ = id => document.getElementById(id);
  let key = "", timer, pending = false;
  function fitStage() {
    const k = Math.min(innerWidth / 1920, innerHeight / 1080);
    stage.style.transform = "translate(" + ((innerWidth - 1920 * k) / 2) + "px," + ((innerHeight - 1080 * k) / 2) + "px) scale(" + k + ")";
  }
  function fitText() {
    const title = $("pg-title"), subtitle = $("pg-subtitle");
    for (const [node, max, min] of [[title,36,26],[subtitle,16,13]]) {
      let size = max; node.style.fontSize = size + "px";
      while (node.scrollWidth > node.clientWidth && size > min) node.style.fontSize = --size + "px";
    }
  }
  function render(raw, immediate) {
    const model = core.resolve(raw, mode);
    if (!model) return;
    const nextKey = JSON.stringify(model);
    if (nextKey === key) return;
    key = nextKey; clearTimeout(timer);
    const panel = $("pg-panel"), wasVisible = !panel.hidden;
    panel.dataset.changing = "true";
    delete panel.dataset.entering;
    const paint = () => {
      $("pg-title").textContent = model.title; $("pg-subtitle").textContent = model.subtitle;
      $("pg-venue").textContent = model.venue; $("pg-fallback").textContent = model.fallback;
      panel.classList.toggle("pg-radio", model.radio);
      const image = $("pg-image"); image.hidden = !model.image; image.alt = model.imageAlt;
      image.onerror = () => { image.hidden = true; };
      if (image.getAttribute("src") !== model.image) image.src = model.image;
      panel.hidden = false; panel.dataset.changing = "false"; panel.dataset.entering = "true";
      stage.dataset.turno = model.mode; document.title = model.title + " · Radio Evolución";
      fitText();
    };
    if (wasVisible && !immediate) timer = setTimeout(paint,180); else paint();
  }
  async function getConfig(url) {
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(),5000);
    try {
      const response = await fetch(url,{cache:"no-store",credentials:"omit",signal:controller.signal});
      if (!response.ok) throw new Error("HTTP " + response.status);
      const data = await response.json();
      if (!core.event(data)) throw new Error("Configuración de postpartido no disponible");
      return data;
    } finally { clearTimeout(timer); }
  }
  async function poll() {
    if (pending) return;
    pending = true;
    try {
      for (const url of ["https://raw.githubusercontent.com/Omnijulio/directo1/main/config.json", "config.json"]) {
        try {
          const raw = await getConfig(url + "?t=" + Date.now());
          const now = params.has("ahora") ? Date.parse(params.get("ahora")) : Date.now();
          if (legacyRoot && core.currentEvent(raw,now)?.id !== "postpartido") { location.reload(); return; }
          render(raw,false); stage.dataset.configSource = url; stage.dataset.received = new Date().toISOString();
          break;
        } catch (_) { /* Se conserva el último rótulo y se prueba la copia publicada. */ }
      }
    } finally { pending = false; }
  }
  window.addEventListener("resize",fitStage); fitStage();
  $("pg-panel").addEventListener("animationend",event => { if (event.target === $("pg-panel")) delete $("pg-panel").dataset.entering; });
  try { render(JSON.parse($("pg-bootstrap").textContent),true); } catch (_) {}
  if (document.fonts?.ready) document.fonts.ready.then(fitText);
  document.addEventListener("visibilitychange",() => { if (!document.hidden) poll(); });
  window.addEventListener("online",poll);
  poll(); setInterval(poll,5000);
})();
