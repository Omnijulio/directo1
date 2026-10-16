(function () {
  "use strict";
  const core = window.FEBScore, $ = id => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const RAW_BOOTSTRAP = "https://raw.githubusercontent.com/Omnijulio/directo1/main/datos/feb-bootstrap.json";
  const API = "https://intrafeb.feb.es/LiveStats.API/api/v1/KeyFacts/";
  const bootSources = ["datos/feb-bootstrap.json", RAW_BOOTSTRAP];
  const preview = params.get("prueba") || "";
  const previewMode = ["previa", "vivo", "descanso", "final", "conexion", "faltas", "accion", "comparativa"].includes(preview);
  const timeFormat = new Intl.DateTimeFormat("es-ES", {timeZone: "Europe/Madrid", hour: "2-digit", minute: "2-digit", second: "2-digit"});
  const hourFormat = new Intl.DateTimeFormat("es-ES", {timeZone: "Europe/Madrid", hour: "2-digit", minute: "2-digit"});
  let game, configVersion, bootstrap, state, lastGood = 0, failed = false, pending = false, configPending = false;
  let nextPoll, bootChecked = 0, generation = 0, tracker, slideIndex = 0;
  let queue = [], activeFlash = null, nextComparisonAt = Date.now() + 60000;
  const write = (id, value) => { $(id).textContent = value; };
  const stale = () => !!(state && !state.snapshot && (failed || (!previewMode && Date.now() - lastGood > 60000)));
  const statsEnabled = () => params.get("estadisticas") !== "0" && game.estadisticas !== false;
  const eventsEnabled = () => params.get("avisos") !== "0" && game.avisos_jugadores !== false;
  const seconds = (value, fallback, min, max) => Math.min(max, Math.max(min, Number(value) || fallback));
  const element = (tag, cls, value) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (value !== undefined) node.textContent = value;
    return node;
  };

  function fitStage() {
    const k = Math.min(innerWidth / 1920, innerHeight / 1080);
    $("stage").style.transform = "translate(" + ((innerWidth - 1920 * k) / 2) + "px," + ((innerHeight - 1080 * k) / 2) + "px) scale(" + k + ")";
  }

  function setupConfigurator() {
    document.documentElement.classList.add("config"); $("cfg").hidden = false;
    const controls = [["cfg-stats", "estadisticas"], ["cfg-events", "avisos"], ["cfg-credits", "narradores"]];
    const build = () => {
      const url = new URL(location.origin + location.pathname);
      controls.forEach(([id, key]) => { if (!$(id).checked) url.searchParams.set(key, "0"); });
      $("cfg-url").value = url.href;
      url.searchParams.set("demo", "1"); $("cfg-preview").href = url.href;
      write("cfg-result", "");
    };
    controls.forEach(([id, key]) => { $(id).checked = params.get(key) !== "0"; $(id).addEventListener("change", build); });
    $("cfg").addEventListener("submit", event => event.preventDefault());
    $("cfg-copy").addEventListener("click", async () => {
      try { await navigator.clipboard.writeText($("cfg-url").value); write("cfg-result", "Enlace copiado."); }
      catch (_) { $("cfg-url").select(); write("cfg-result", "Selecciona y copia el enlace."); }
    });
    build();
  }
  if (params.get("config") === "1") { setupConfigurator(); return; }
  if (params.get("demo") === "1") document.body.classList.add("demo");
  $("test-label").hidden = !previewMode;
  window.addEventListener("resize", fitStage); fitStage();

  async function getJSON(url, headers) {
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(url, {headers, signal: controller.signal, cache: "no-store", credentials: "omit"});
      if (!response.ok) { const error = new Error("HTTP " + response.status); error.status = response.status; throw error; }
      return await response.json();
    } finally { clearTimeout(timer); }
  }

  async function loadBootstrap(force) {
    if (!force && bootstrap && Date.parse(bootstrap.caduca) > Date.now() + 120000 && Date.now() - bootChecked < 3600000) return bootstrap;
    for (const source of force ? [...bootSources].reverse() : bootSources) {
      try {
        const data = await getJSON(source + "?t=" + Math.floor(Date.now() / 30000));
        const expiry = Date.parse(data.caduca);
        if (String(data.partido) !== String(game.partido) || !data.tokenPublico || !Number.isFinite(expiry) || expiry <= Date.now() + 30000) continue;
        bootstrap = data; bootChecked = Date.now(); return data;
      } catch (_) { /* Se prueba también la otra copia del acceso público. */ }
    }
    if (bootstrap && Date.parse(bootstrap.caduca) > Date.now() + 30000) return bootstrap;
    throw new Error("Acceso público FEB pendiente de renovación");
  }

  function setImage(id, url, name) {
    const img = $(id); img.alt = "Escudo de " + name;
    if (img.getAttribute("src") === url) return;
    img.hidden = false; img.onerror = () => { img.hidden = true; }; img.src = url;
  }

  function restoreSession() {
    let saved;
    try { saved = JSON.parse(sessionStorage.getItem("feb-" + game.partido)); } catch (_) {}
    tracker = core.createEventTracker(saved && saved.tracker);
    if (saved && saved.state && Date.now() - saved.lastGood < 900000 && saved.lastGood <= Date.now() &&
        saved.state.home.id === String(game.local.id) && saved.state.away.id === String(game.visitante.id)) {
      state = saved.state; lastGood = saved.lastGood; failed = true;
    }
  }
  function saveSession() {
    try { sessionStorage.setItem("feb-" + game.partido, JSON.stringify({state, lastGood, tracker: tracker.save()})); } catch (_) {}
  }

  function configure(config) {
    const next = config.feb;
    if (!next || !/^\d{1,10}$/.test(String(next.partido)) || !next.local || !next.visitante) return;
    const changed = !game || String(game.partido) !== String(next.partido);
    game = next;
    for (const [side, team] of [["home", game.local], ["away", game.visitante]]) {
      document.documentElement.style.setProperty("--team-" + side, /^#[\da-f]{6}$/i.test(team.color) ? team.color : side === "home" ? "#3b89ea" : "#f6c65d");
      write("score-" + side + "-fallback", team.siglas);
      setImage("score-" + side + "-logo", team.escudo, team.nombre);
    }
    write("venue", params.get("ubicacion") || game.pabellon);
    $("scorebug").hidden = params.get("marcador") === "0";
    if (!statsEnabled() && activeFlash && activeFlash.kind === "comparison") hideFlash();
    if (changed) {
      generation++; state = null; bootstrap = null; lastGood = 0; failed = false; bootChecked = 0;
      queue = []; slideIndex = 0; nextComparisonAt = Date.now() + seconds(game.comparar_cada_segundos, 60, 30, 600) * 1000;
      hideFlash(); clearTimeout(nextPoll); restoreSession(); render();
      if (previewMode) showPreview(); else { showNarrators(config); poll(); }
    }
  }

  async function loadConfig() {
    if (configPending) return;
    configPending = true;
    try {
      const config = await getJSON("config-baloncesto.json?t=" + Date.now());
      if (configVersion !== undefined && config.version !== configVersion) { location.reload(); return; }
      configVersion = config.version; configure(config);
    } catch (_) {
      if (!game) write("score-status", "CONFIGURACIÓN PENDIENTE · REINTENTANDO");
    } finally { configPending = false; }
  }

  async function poll() {
    if (!game || previewMode) return;
    if (pending) { clearTimeout(nextPoll); nextPoll = setTimeout(poll, 1000); return; }
    pending = true;
    const requestGeneration = generation, startedAt = Date.now();
    try {
      const data = await loadBootstrap(false);
      if (requestGeneration !== generation) return;
      if (!state || state.snapshot) {
        state = core.snapshotState(data, game, Date.now());
        if (state) tracker.take([], Date.now());
        render();
      }
      let raw;
      try { raw = await getJSON(API + game.partido + "?t=" + Date.now(), {Authorization: "Bearer " + data.tokenPublico}); }
      catch (error) {
        if (error.status !== 401 && error.status !== 403) throw error;
        const refreshed = await loadBootstrap(true);
        raw = await getJSON(API + game.partido + "?t=" + Date.now(), {Authorization: "Bearer " + refreshed.tokenPublico});
      }
      if (requestGeneration !== generation) return;
      state = core.normalize(raw, game); lastGood = Date.now(); failed = false;
      const fresh = tracker.take(core.playerEvents(raw, state), lastGood);
      if (eventsEnabled()) enqueue(core.groupEvents(fresh));
      saveSession();
    } catch (_) {
      if (requestGeneration !== generation) return;
      failed = true;
      if (!state || state.snapshot) state = core.snapshotState(bootstrap, game, Date.now());
    } finally {
      pending = false;
      if (requestGeneration === generation) render();
      clearTimeout(nextPoll);
      nextPoll = setTimeout(poll, Math.max(1000, seconds(game.actualizar_segundos, 15, 15, 120) * 1000 - (Date.now() - startedAt)));
    }
  }

  function setScore(id, value) {
    const next = value === null || value === undefined ? "—" : String(value), el = $(id);
    if (el.textContent === next) return;
    el.textContent = next;
    if (next !== "—") { el.classList.remove("changed"); void el.offsetWidth; el.classList.add("changed"); }
  }
  function renderFouls(side, team) {
    const row = $(side + "-fouls"), count = team ? core.number(team.fouls) : null;
    const label = (side === "home" ? game.local.corto : game.visitante.corto) + ": " +
      (count === null ? "faltas del cuarto sin dato FEB" : count + " faltas del cuarto" + (count >= 5 ? ", bonus" : ""));
    row.setAttribute("aria-label", label); row.title = label;
    core.foulLights(count).forEach((light, i) => { row.children[i].dataset.light = light; });
  }
  function render() {
    if (!game) return;
    if (state && state.snapshot && !previewMode && Date.now() >= Date.parse(game.inicio)) state = null;
    const phase = state ? state.phase : "unknown", isStale = stale();
    $("scorebug").dataset.phase = phase; $("scorebug").dataset.stale = String(isStale);
    setScore("score-home", state && state.home.score); setScore("score-away", state && state.away.score);
    renderFouls("home", state && state.home); renderFouls("away", state && state.away);
    let clock = state && state.clock || "—", period = state ? periodText(state.quarter) : "FEB", status = "";
    if (phase === "pregame") {
      clock = Number.isFinite(Date.parse(game.inicio)) ? hourFormat.format(new Date(game.inicio)) : "—";
      period = "PREVIA"; status = state.home.score === 0 && state.away.score === 0 ? "PREVIA · 0–0 CONFIRMADO POR FEB" : "PREVIA FEB";
    } else if (phase === "final") { clock = "FINAL"; period = ""; }
    else if (phase === "break") { clock = "PAUSA"; period = "DESCANSO"; }
    else if (phase === "paused") status = "PARTIDO INTERRUMPIDO";
    else if (phase !== "live") status = "ESPERANDO DATOS FEB";
    else if (state.home.score === 0 && state.away.score === 0) status = "0–0 · EN JUEGO";
    if (isStale) status = "ÚLTIMO DATO " + timeFormat.format(new Date(lastGood)) + " · RECONECTANDO";
    if (previewMode) status = "PRUEBA · DATOS FICTICIOS";
    write("score-clock", clock); write("score-period", period); write("score-status", status);
    $("score-status").hidden = !status;
    $("scorebug").setAttribute("aria-label", [game.local.nombre, state ? state.home.score : "sin dato", game.visitante.nombre,
      state ? state.away.score : "sin dato", phase, status].join(" · "));
    if (isStale && activeFlash && activeFlash.kind === "comparison") hideFlash();
  }
  function periodText(n) { return n > 4 ? "PR " + (n - 4) : n > 0 ? "C" + n : "FEB"; }

  function hideFlash() { $("flash").hidden = true; $("flash").replaceChildren(); activeFlash = null; }
  function showFlash(kind, nodes, duration, color) {
    const flash = $("flash"); flash.replaceChildren(...nodes); flash.dataset.kind = kind;
    flash.style.setProperty("--flash-team", color || "#6d8cac");
    flash.hidden = false; flash.style.animation = "none"; void flash.offsetWidth; flash.style.animation = "";
    activeFlash = {kind, until: Date.now() + duration};
  }
  function showNarrators(config) {
    if (params.get("narradores") === "0" || config.credito_narradores === false || !Array.isArray(config.narradores) || !config.narradores.length) return;
    const key = "feb-narradores-" + game.partido;
    try { if (sessionStorage.getItem(key)) return; sessionStorage.setItem(key, "1"); } catch (_) {}
    showFlash("narrators", [element("div", "flash-eyebrow", "NARRACIÓN"),
      element("div", "narrator-names", config.narradores.join(" · "))], 6000);
  }
  function enqueue(events) {
    for (const event of events) {
      const existing = queue.find(item => item.playerId === event.playerId && item.teamId === event.teamId);
      if (existing) {
        const merged = core.groupEvents([existing, event])[0]; Object.assign(existing, merged);
      } else queue.push(event);
    }
    if (queue.length && activeFlash && activeFlash.kind !== "player") hideFlash();
    tick();
  }
  function showPlayer(event, duration) {
    const team = event.teamId === String(game.local.id) ? game.local : game.visitante;
    const heading = element("div", "flash-eyebrow");
    heading.append(element("span", "", team.corto), element("span", "", [periodText(event.quarter), event.clock].filter(Boolean).join(" · ")));
    const metrics = element("div", "action-metrics");
    event.metrics.forEach(metric => metrics.append(element("span", "", core.metricLabel(metric))));
    showFlash("player", [heading, element("div", "player-name", event.name), metrics], duration, team.color);
  }
  function showComparison(slide, duration) {
    const grid = element("div", "comparison-grid");
    for (const [i, side] of ["home", "away"].entries()) {
      if (i) grid.append(element("div", "comparison-divider", "—"));
      const team = i ? game.visitante : game.local, cell = element("div", "comparison-team " + side);
      cell.append(element("span", "comparison-name", team.corto), element("span", "comparison-value", slide[side].value)); grid.append(cell);
    }
    const nodes = [element("div", "comparison-title", slide.title), grid];
    const a = core.number(slide.home.numeric), b = core.number(slide.away.numeric);
    if (a !== null && b !== null && a + b > 0) {
      const bars = element("div", "comparison-bars");
      [a, b].forEach(value => { const bar = element("span"); bar.style.width = (value / (a + b) * 100) + "%"; bars.append(bar); }); nodes.push(bars);
    }
    if (/^p[123]$/.test(slide.key)) nodes.push(element("div", "comparison-detail", "CONVERTIDOS / INTENTADOS · " + game.local.siglas + " " + slide.home.detail + " · " + game.visitante.siglas + " " + slide.away.detail));
    showFlash("comparison", nodes, duration);
  }
  function tick() {
    if (!game) return;
    const now = Date.now();
    if (activeFlash && now >= activeFlash.until) hideFlash();
    queue = queue.filter(event => now - event.at < 60000);
    if (activeFlash) return;
    if (queue.length && eventsEnabled()) {
      showPlayer(queue.shift(), seconds(game.aviso_jugador_segundos, 4, 3, 8) * 1000); return;
    }
    if (now < nextComparisonAt || !statsEnabled() || stale()) return;
    const slides = core.slides(state).filter(slide => slide.kind === "comparison");
    if (!slides.length) return;
    const slide = slides[slideIndex++ % slides.length];
    showComparison(slide, seconds(game.comparar_durante_segundos, 7, 5, 12) * 1000);
    nextComparisonAt = now + seconds(game.comparar_cada_segundos, 60, 30, 600) * 1000;
  }

  function showPreview() {
    const stats = {rt:"23",assist:"14",p3m:"6",p3a:"17",p2m:"14",p2a:"25",p1m:"9",p1a:"12",st:"5",to:"7",bs:"3"};
    const team = (cfg, value, fouls) => ({id:String(cfg.id),name:cfg.nombre,short:cfg.corto,code:cfg.siglas,score:value,fouls,
      stats:{...stats},players:[]});
    state = {phase: preview === "final" ? "final" : preview === "descanso" ? "break" : preview === "previa" ? "pregame" : "live",
      quarter:preview === "descanso" ? 2 : 3,clock:"06:24",home:team(game.local,preview === "previa" ? 0 : 64,preview === "faltas" ? 4 : 2),
      away:team(game.visitante,preview === "previa" ? 0 : 59,preview === "faltas" ? 5 : 3),quarters:[]};
    if (preview === "previa") state.home.fouls = state.away.fouls = 0;
    state.away.stats.rt = "19"; state.away.stats.assist = "10";
    lastGood = Date.now(); failed = preview === "conexion"; render();
    if (preview === "accion") showPlayer({teamId:state.home.id,name:"JUGADOR DE PRUEBA",quarter:3,clock:"06:24",metrics:[{key:"pts",amount:3},{key:"p3m",amount:1}]},86400000);
    if (preview === "comparativa") showComparison(core.slides(state)[0],86400000);
  }
  window.addEventListener("online", () => { if (game && !previewMode) { clearTimeout(nextPoll); poll(); } });
  document.addEventListener("visibilitychange", () => { if (!document.hidden && game && !previewMode) { clearTimeout(nextPoll); poll(); } });
  setInterval(render, 1000); setInterval(tick, 250); setInterval(loadConfig, 5000); loadConfig();
})();
