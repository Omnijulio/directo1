(function () {
  "use strict";
  const core = window.FEBScore, $ = id => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  if (params.get("config") === "1") return;
  if (params.get("solo") === "marcador") document.body.classList.add("score-only");
  const RAW_BOOTSTRAP = "https://raw.githubusercontent.com/Omnijulio/directo1/main/datos/feb-bootstrap.json";
  const API = "https://intrafeb.feb.es/LiveStats.API/api/v1/BoxScore/";
  const bootSources = ["datos/feb-bootstrap.json", RAW_BOOTSTRAP];
  let game, bootstrap, state, lastGood = 0, failed = false, pending = false;
  let nextPoll, rotation, slideIndex = 0, currentSlide = "", bootChecked = 0, generation = 0;
  let preview = params.get("prueba") || "";
  const previewMode = ["previa", "vivo", "descanso", "final", "conexion"].includes(preview);
  const timeFormat = new Intl.DateTimeFormat("es-ES", {timeZone: "Europe/Madrid", hour: "2-digit", minute: "2-digit", second: "2-digit"});
  const hourFormat = new Intl.DateTimeFormat("es-ES", {timeZone: "Europe/Madrid", hour: "2-digit", minute: "2-digit"});
  const dayFormat = new Intl.DateTimeFormat("es-ES", {timeZone: "Europe/Madrid", day: "numeric", month: "long"});
  const safeTime = value => Number.isFinite(Date.parse(value)) ? timeFormat.format(new Date(value)) : "—";
  function write(id, value) { $(id).textContent = value; }

  async function getJSON(url, headers) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
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
        bootstrap = data;
        bootChecked = Date.now();
        return data;
      } catch (_) { /* La copia publicada mantiene el acceso durante una caída de raw. */ }
    }
    if (bootstrap && Date.parse(bootstrap.caduca) > Date.now() + 30000) return bootstrap;
    throw new Error("Acceso público FEB pendiente de renovación");
  }

  function setImage(id, url) {
    const el = $(id);
    if (el.getAttribute("src") === url) return;
    el.hidden = false;
    el.onerror = () => { el.hidden = true; };
    el.src = url;
  }

  function configure(next) {
    if (!next.feb) return;
    const changed = !game || String(game.partido) !== String(next.feb.partido);
    const previousRotation = game && game.rotar_segundos;
    game = next.feb;
    if (!/^\d{1,10}$/.test(String(game.partido))) return;
    document.documentElement.style.setProperty("--team-home", /^#[\da-f]{6}$/i.test(game.local.color) ? game.local.color : "#3b89ea");
    document.documentElement.style.setProperty("--team-away", /^#[\da-f]{6}$/i.test(game.visitante.color) ? game.visitante.color : "#f6c65d");
    write("score-competition", game.competicion + " · " + game.jornada);
    write("score-home-name", game.local.corto);
    write("score-away-name", game.visitante.corto);
    write("score-home-sponsor", "GRUPO URETA · LOCAL");
    write("score-away-sponsor", "ALIMERKA · VISITANTE");
    write("score-home-fallback", game.local.siglas);
    write("score-away-fallback", game.visitante.siglas);
    setImage("score-home-logo", game.local.escudo);
    setImage("score-away-logo", game.visitante.escudo);
    $("scorebug").hidden = params.get("marcador") === "0";
    $("stats-ribbon").hidden = params.get("estadisticas") === "0" || game.estadisticas === false;
    if (changed) {
      generation++;
      state = null; bootstrap = null; lastGood = 0; failed = false; bootChecked = 0;
      slideIndex = 0; currentSlide = "";
      clearTimeout(nextPoll);
      render();
      if (previewMode) showPreview(); else poll();
    }
    if (changed || previousRotation !== game.rotar_segundos) startRotation();
    fitNames();
  }

  async function poll() {
    if (!game || previewMode) return;
    if (pending) { clearTimeout(nextPoll); nextPoll = setTimeout(poll, 1000); return; }
    pending = true;
    const requestGeneration = generation;
    const startedAt = Date.now();
    try {
      const data = await loadBootstrap(false);
      if (requestGeneration !== generation) return;
      if (!state || state.snapshot) {
        state = core.snapshotState(data, game, Date.now());
        render(); renderSlide(false);
      }
      let raw;
      try {
        raw = await getJSON(API + game.partido + "?t=" + Date.now(), {Authorization: "Bearer " + data.tokenPublico});
      } catch (error) {
        if (error.status !== 401 && error.status !== 403) throw error;
        const refreshed = await loadBootstrap(true);
        raw = await getJSON(API + game.partido + "?t=" + Date.now(), {Authorization: "Bearer " + refreshed.tokenPublico});
      }
      if (requestGeneration !== generation) return;
      state = core.normalize(raw, game);
      lastGood = Date.now(); failed = false;
      // Solo se guardan marcadores, nunca el token, para recuperarse de una recarga.
      try { sessionStorage.setItem("feb-" + game.partido, JSON.stringify({state, lastGood})); } catch (_) {}
    } catch (error) {
      if (requestGeneration !== generation) return;
      failed = true;
      const previous = core.snapshotState(bootstrap, game, Date.now());
      if (!state || state.snapshot) state = previous;
      if (!state) {
        try {
          const cached = JSON.parse(sessionStorage.getItem("feb-" + game.partido));
          if (cached && Date.now() - cached.lastGood < 900000 && cached.lastGood <= Date.now() &&
              cached.state.home.id === String(game.local.id) && cached.state.away.id === String(game.visitante.id)) {
            state = cached.state; lastGood = cached.lastGood;
          }
        } catch (_) {}
      }
    } finally {
      pending = false;
      if (requestGeneration === generation) { render(); renderSlide(false); }
      clearTimeout(nextPoll);
      const seconds = Math.max(15, Number(game.actualizar_segundos) || 15);
      nextPoll = setTimeout(poll, Math.max(1000, seconds * 1000 - (Date.now() - startedAt)));
    }
  }

  function setScore(id, value) {
    const next = value === null || value === undefined ? "—" : String(value);
    const el = $(id);
    if (el.textContent === next) return;
    el.textContent = next;
    if (next !== "—") { el.classList.remove("changed"); void el.offsetWidth; el.classList.add("changed"); }
  }

  function render() {
    if (!game) return;
    // La previa deja de ser utilizable al llegar la hora de inicio.
    if (state && state.snapshot && !previewMode && Date.now() >= Date.parse(game.inicio)) state = null;
    const stale = !!(state && !state.snapshot && (failed || Date.now() - lastGood > 60000));
    const phase = state ? state.phase : "unknown";
    $("scorebug").dataset.phase = phase;
    $("scorebug").dataset.stale = String(stale);
    setScore("score-home", state && state.home.score);
    setScore("score-away", state && state.away.score);
    let phaseText, clock = state && state.clock || "—", period = "RELOJ FEB";
    if (phase === "pregame") {
      phaseText = "PREVIA · 0–0 EN LA FEB";
      if (state.home.score !== 0 || state.away.score !== 0) phaseText = "PREVIA FEB";
      clock = hourFormat.format(new Date(game.inicio)); period = "HORA DE INICIO";
    } else if (phase === "final") { phaseText = "FINAL"; clock = "FINAL"; period = "PARTIDO TERMINADO"; }
    else if (phase === "break") { phaseText = "DESCANSO"; clock = "PAUSA"; period = periodText(state.quarter); }
    else if (phase === "paused") { phaseText = "PARTIDO INTERRUMPIDO"; period = "INFORMACIÓN FEB"; }
    else if (phase === "live") { phaseText = "EN JUEGO"; period = periodText(state.quarter); }
    else { phaseText = lastGood ? "ESTADO PENDIENTE FEB" : "ESPERANDO DATOS FEB"; }
    if (stale) phaseText = Date.now() - lastGood > 60000 ? "DATOS SIN ACTUALIZAR" : "RECONECTANDO CON FEB";
    write("score-phase", previewMode ? "PRUEBA · " + phaseText : phaseText);
    write("score-clock", clock);
    write("score-period", period);
    let source = "FUENTE: FEB · " + game.partido;
    let connection = "CONECTANDO CON LA FEB";
    if (state && state.snapshot) connection = "FICHA PREVIA · CONSULTADA " + safeTime(bootstrap && bootstrap.consultado);
    else if (lastGood) connection = (stale ? "ÚLTIMO DATO " : "RECIBIDO ") + timeFormat.format(new Date(lastGood));
    else if (failed) connection = "DIRECTO FEB AÚN NO DISPONIBLE · REINTENTO AUTOMÁTICO";
    if (previewMode) { source = "VISTA DE PRUEBA · DATOS DE EJEMPLO"; connection = "NO EMITIR COMO RESULTADO REAL"; }
    write("score-source", source);
    write("score-connection", connection);
    $("scorebug").setAttribute("aria-label", [game.local.nombre, state ? state.home.score : "sin dato", game.visitante.nombre, state ? state.away.score : "sin dato", phaseText].join(" · "));
  }

  function periodText(n) { return n > 4 ? "PRÓRROGA " + (n - 4) : n > 0 ? "CUARTO " + n : "PERIODO FEB"; }
  function element(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function idleSlides() {
    const snapshot = state && state.snapshot;
    return [
      {key:"info-match", title:"EL PARTIDO", value:state ? state.home.score + "–" + state.away.score : "FEB", detail:game.local.corto + " · " + game.visitante.corto,
        note:snapshot ? "0–0 PUBLICADO EN LA FICHA PREVIA DE LA FEB" : "ESTADÍSTICAS PENDIENTES DE LA FEB"},
      {key:"info-venue", title:"EL PLANTÍO", value:hourFormat.format(new Date(game.inicio)), detail:game.pabellon,
        note:dayFormat.format(new Date(game.inicio)) + " · " + game.competicion + " · " + game.jornada},
      {key:"info-source", title:"DATOS OFICIALES", value:"FEB", detail:snapshot ? "El marcador oficial parte de 0–0" : "Esperando estadísticas del partido",
        note:"ACTUALIZACIÓN AUTOMÁTICA · EL RELOJ REPRODUCE EL DATO DE LA FEDERACIÓN"}
    ];
  }
  function availableSlides() {
    if (state && !state.snapshot && (failed || Date.now() - lastGood > 60000)) {
      return [{key:"connection", title:"CONEXIÓN FEB", value:"FEB", detail:"Esperando la siguiente actualización",
        note:"ÚLTIMO MARCADOR RECIBIDO A LAS " + (lastGood ? timeFormat.format(new Date(lastGood)) : "—")}];
    }
    const live = core.slides(state);
    return live.length ? live : idleSlides();
  }
  function createView(slide) {
    const view = element("div", "stat-view");
    if (slide.kind === "quarters") {
      const grid = element("div", "quarter-grid");
      slide.quarters.forEach(q => {
        const cell = element("div", "quarter-cell");
        cell.append(element("div", "quarter-label", q.n > 4 ? "PR " + (q.n - 4) : "CUARTO " + q.n));
        const score = element("div", "quarter-result");
        score.append(element("span", "home", q.home), element("span", "", " – "), element("span", "away", q.away));
        cell.append(score); grid.append(cell);
      });
      view.append(grid);
    } else if (slide.kind) {
      ["home", "away"].forEach((side, i) => {
        const value = slide[side];
        const team = i ? game.visitante : game.local;
        const block = element("div", "stat-side " + side + (slide.kind === "leader" ? " stat-leader" : ""));
        block.append(element("div", "stat-code", team.siglas));
        const info = element("div", "stat-info");
        info.append(element("div", "stat-detail", value.detail), element("div", "stat-note", slide.kind === "leader" ? team.corto : slide.note));
        block.append(info, element("div", "stat-value", value.value));
        if (slide.kind === "comparison") {
          const track = element("div", "stat-track"), bar = element("div", "stat-bar");
          const max = Math.max(Number(slide.home.numeric) || 0, Number(slide.away.numeric) || 0);
          bar.style.width = max && value.numeric !== null ? Math.min(100, Math.max(0, value.numeric / max * 100)) + "%" : "0%";
          track.append(bar); block.append(track);
        }
        view.append(block);
      });
    } else {
      const idle = element("div", "stat-idle"), info = element("div", "stat-info");
      idle.append(element("div", "stat-idle-value", slide.value));
      info.append(element("div", "stat-idle-title", slide.detail), element("div", "stat-idle-sub", slide.note));
      idle.append(info); view.append(idle);
    }
    return view;
  }
  function renderSlide(advance) {
    if (!game) return;
    const slides = availableSlides();
    if (advance) slideIndex++;
    slideIndex %= slides.length;
    const slide = slides[slideIndex];
    const unchanged = currentSlide === slide.key;
    write("stats-title", slide.title);
    write("stats-page", String(slideIndex + 1).padStart(2, "0") + " / " + String(slides.length).padStart(2, "0"));
    const view = createView(slide);
    if (unchanged && !advance) view.style.animation = "none";
    $("stats-body").replaceChildren(view);
    if (!unchanged || advance) {
      const bar = $("stats-progress-fill");
      bar.style.animation = "none"; void bar.offsetWidth;
      bar.style.animation = "feb-progress " + Math.max(5, Number(game.rotar_segundos) || 8) + "s linear infinite";
    }
    currentSlide = slide.key;
    fitStatTitle();
  }
  function startRotation() {
    clearInterval(rotation);
    renderSlide(false);
    rotation = setInterval(() => renderSlide(true), Math.max(5, Number(game.rotar_segundos) || 8) * 1000);
  }
  function fit(el, max, min) {
    let size = max; el.style.fontSize = size + "px";
    while (el.scrollWidth > el.clientWidth && size > min) el.style.fontSize = --size + "px";
  }
  function fitNames() { ["score-home-name", "score-away-name"].forEach(id => fit($(id),24,16)); }
  function fitStatTitle() { fit($("stats-title"),27,16); }

  function showPreview() {
    const stats = {rt:"23",assist:"14",p3m:"6",p3a:"17",p2m:"14",p2a:"25",p1m:"9",p1a:"12",st:"5",to:"7",bs:"3"};
    const team = (cfg, value) => ({id:String(cfg.id),name:cfg.nombre,short:cfg.corto,code:cfg.siglas,score:value,stats:{...stats},players:[{name:"JUGADOR DE EJEMPLO",pts:"18",reb:"7",assist:"5",val:"22"}]});
    state = {phase: preview === "final" ? "final" : preview === "descanso" ? "break" : preview === "previa" ? "pregame" : "live",
      quarter:preview === "descanso" ? 2 : 3,clock:"06:24",home:team(game.local,preview === "previa" ? 0 : 64),away:team(game.visitante,preview === "previa" ? 0 : 59),
      quarters:[{n:1,home:24,away:20},{n:2,home:19,away:22},{n:3,home:21,away:17}]};
    state.away.stats.rt="19";state.away.stats.assist="10";
    lastGood = Date.now(); failed = preview === "conexion";
    render(); renderSlide(false);
  }
  window.addEventListener("feb:config", event => configure(event.detail));
  window.addEventListener("online", () => { if (game && !previewMode) { clearTimeout(nextPoll); poll(); } });
  document.addEventListener("visibilitychange", () => { if (!document.hidden && game && !previewMode) { clearTimeout(nextPoll); poll(); } });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => {fitNames();fitStatTitle();});
  setInterval(render, 1000);
  getJSON("config-baloncesto.json?t=" + Date.now()).then(configure).catch(() => {
    write("score-phase", "CONFIGURACIÓN NO DISPONIBLE");
    write("score-connection", "RECARGA EL WIDGET PARA VOLVER A INTENTARLO");
  });
})();
