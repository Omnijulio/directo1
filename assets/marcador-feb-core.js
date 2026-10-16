/* Normalización de los datos públicos de baloncestoenvivo.feb.es. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.FEBScore = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const number = value => {
    if (value === null || value === undefined || String(value).trim() === "") return null;
    const n = Number(String(value).replace(",", "."));
    return Number.isFinite(n) ? n : null;
  };
  const score = value => {
    const n = number(value);
    return n !== null && Number.isInteger(n) && n >= 0 && n <= 999 ? n : null;
  };
  const list = value => Array.isArray(value) ? value : value ? [value] : [];
  const text = value => value == null ? "" : String(value).trim();
  const display = value => number(value) === null ? "—" : String(number(value));
  const byId = (items, id) => items.find(item => String(item.id) === String(id));
  const deleted = value => value === true || value === 1 || /^(true|1)$/i.test(text(value));

  function selectGame(config, requested, now) {
    const practice = config.prueba_activa;
    if (!requested && practice && (now === undefined ? Date.now() : now) < Date.parse(practice.hasta)) requested = practice.partido;
    if (!requested) return config.feb || null;
    if (!/^\d{1,10}$/.test(String(requested))) return null;
    return [config.feb, ...list(config.pruebas)].find(game => game && String(game.partido) === String(requested)) || null;
  }

  function timeline(raw) {
    const seen = new Set();
    return list(raw && raw.PLAYBYPLAY && raw.PLAYBYPLAY.LINES).filter(line => {
      const key = text(line.num) || [line.LogTimeUtc, line.action, line.idPlayer, line.text].join("|");
      if (seen.has(key)) return false;
      seen.add(key);
      return !deleted(line.deleted);
    });
  }

  function countsAsTeamFoul(line) {
    return line.action === "foul" && !!text(line.idPlayer) &&
      (text(line.logParam10) === "" || String(line.logParam10) === "1");
  }

  function quarterFouls(raw, game, currentPhase) {
    if (currentPhase === "pregame") return {home: 0, away: 0};
    const quarter = number(raw.HEADER.quarter), lines = timeline(raw);
    // En las prórrogas se mantienen las faltas del cuarto periodo (regla FIBA 41.1.3).
    const firstQuarter = quarter > 4 ? 4 : quarter;
    if (!(firstQuarter > 0)) return {home: null, away: null};
    const complete = lines.some(line => number(line.quarter) === firstQuarter && line.action === "period" &&
      (String(line.logParam2) === "0" || /comienzo|inicio|start/i.test(text(line.text))));
    const eligible = lines.filter(line => number(line.quarter) >= firstQuarter && number(line.quarter) <= quarter && countsAsTeamFoul(line));
    const count = id => {
      const n = eligible.filter(line => String(line.idTeam) === String(id)).length;
      // Cinco faltas observadas bastan para confirmar el bonus aunque falte el comienzo.
      return complete || n >= 5 ? n : null;
    };
    return {home: count(game.local.id), away: count(game.visitante.id)};
  }

  function foulLights(count) {
    const n = number(count);
    return Array.from({length: 5}, (_, i) => n === null ? "unknown" : n >= 5 ? "red" :
      i >= n ? "off" : i === 3 ? "orange" : "lit");
  }

  function phase(header) {
    const status = text(header.statusText).toUpperCase();
    const time = text(header.time).toUpperCase();
    if (String(header.status) !== "3" && /(?:FIN(?:AL)?\s+(?:DEL?\s+)?CUARTO|END\s*(?:OF\s*)?(?:QUARTER|PERIOD))/.test(status + " " + time)) return "break";
    if (String(header.status) === "3" || /FINISHED|FINAL|ENDED/.test(status) || time === "FINAL") return "final";
    if (/DESCANSO|HALF|BREAK|INTERVAL/.test(status + " " + time)) return "break";
    if (/SUSPEND|POSTPON|CANCEL|APLAZ/.test(status + " " + time)) return "paused";
    if (String(header.status) === "2" || /PLAYING|LIVE|EN JUEGO|INPROGRESS/.test(status)) return "live";
    if (String(header.status) === "1" || /SCHEDULED|NOTSTARTED|PRE|PENDING/.test(status)) return "pregame";
    if (number(header.quarter) > 0 && /\d{1,2}:\d{2}/.test(time)) return "live";
    return "unknown";
  }

  function activity(raw) {
    const header = raw.HEADER, currentPhase = phase(header), quarter = number(header.quarter);
    const words = (text(header.statusText) + " " + text(header.time)).toUpperCase();
    const finishLabel = quarter === 2 ? "DESCANSO" : quarter > 4 ? "FIN DE PRÓRROGA " + (quarter - 4) : "FIN DEL CUARTO " + quarter;
    if (currentPhase === "final") return {kind:"final",label:"FINAL DEL PARTIDO"};
    if (currentPhase === "pregame") return {kind:"pregame",label:""};
    if (currentPhase === "paused") return {kind:"paused",label:"PARTIDO INTERRUMPIDO"};
    const lines = timeline(raw).filter(line => number(line.quarter) === quarter);
    const zeroClock = /^0{1,2}:00(?:[.,]0+)?$/.test(text(header.time));
    const lastPeriod = lines.filter(line => line.action === "period").sort((a,b) => (number(b.num)||0)-(number(a.num)||0))[0];
    const endedPeriod = lastPeriod && (String(lastPeriod.logParam2) === "1" || /fin|end/i.test(text(lastPeriod.text)));
    if (/DESCANSO|HALFTIME|HALF TIME|FIN(?:AL)?\s+(?:DEL?\s+)?CUARTO|END\s*(?:OF\s*)?(?:QUARTER|PERIOD)/.test(words) || (quarter > 0 && zeroClock) || endedPeriod) {
      return {kind:quarter === 2 ? "break" : "quarter-end",label:quarter > 0 ? finishLabel : "DESCANSO"};
    }
    const timeout = lines.filter(line => line.action === "timeout").sort((a,b) => (number(b.num)||0)-(number(a.num)||0))[0];
    const explicitTimeout = /TIME\s?OUT|TIEMPO\s+MUERTO|\bTMO\b/.test(words);
    if (explicitTimeout) return {kind:"timeout",label:"TIEMPO MUERTO",teamId:timeout ? text(timeout.idTeam) : ""};
    if (timeout && text(timeout.time) === text(header.time)) {
      const resumed = lines.some(line => (number(line.num)||0) > (number(timeout.num)||0) &&
        /^(shoot|fthrow|rebound|assist|recovery|lose|blockshot)$/.test(line.action));
      if (!resumed) return {kind:"timeout",label:"TIEMPO MUERTO",teamId:text(timeout.idTeam)};
    }
    if (currentPhase === "break") return {kind:quarter === 2 ? "break" : "quarter-end",label:quarter > 0 ? finishLabel : "DESCANSO"};
    if (currentPhase === "live") return {kind:"live",label:"EN JUEGO"};
    return {kind:"unknown",label:""};
  }

  function normalize(raw, game) {
    const header = raw && raw.HEADER;
    if (!header) throw new Error("Respuesta FEB sin cabecera");
    const teams = list(header.TEAM);
    const home = byId(teams, game.local.id), away = byId(teams, game.visitante.id);
    if (!home || !away) throw new Error("La respuesta no corresponde a los equipos configurados");
    const scores = [score(home.pts), score(away.pts)];
    if (scores.some(s => s === null)) throw new Error("Marcador FEB incompleto");
    const box = list(raw.BOXSCORE && raw.BOXSCORE.TEAM);
    const totals = list(raw.TEAMSTATS && raw.TEAMSTATS.TEAM);
    const players = list(raw.SCOREBOARD && raw.SCOREBOARD.TEAM);
    function team(source, config, value) {
      const b = byId(box, config.id);
      const p = byId(players, config.id);
      return {
        id: String(config.id), name: text(source.name) || config.nombre,
        short: config.corto, code: config.siglas, score: value,
        stats: b && b.TOTAL || byId(totals, config.id) || null,
        players: list(b && b.PLAYER || p && p.PLAYER)
      };
    }
    const quarters = list(header.QUARTERS && header.QUARTERS.QUARTER).map(q => ({
      n: number(q.n), home: score(teams.indexOf(home) === 0 ? q.scoreA : q.scoreB), away: score(teams.indexOf(away) === 1 ? q.scoreB : q.scoreA)
    })).filter(q => q.n > 0);
    const clockText = text(header.time);
    const currentPhase = phase(header), fouls = quarterFouls(raw, game, currentPhase);
    const homeTeam = team(home, game.local, scores[0]), awayTeam = team(away, game.visitante, scores[1]);
    homeTeam.fouls = fouls.home; awayTeam.fouls = fouls.away;
    return {
      phase: currentPhase, quarter: number(header.quarter),
      clock: /^\d{1,2}:\d{2}(?:[.,]\d+)?$/.test(clockText) ? clockText : "—",
      statusText: text(header.statusText), activity: activity(raw), quarters,
      home: homeTeam, away: awayTeam
    };
  }

  function snapshotState(bootstrap, game, now) {
    const s = bootstrap && bootstrap.ficha;
    if (!s || String(s.partido) !== String(game.partido) ||
        String(s.local.id) !== String(game.local.id) || String(s.visitante.id) !== String(game.visitante.id)) return null;
    const start = Date.parse(game.inicio);
    const checked = Date.parse(bootstrap.consultado);
    // La ficha estática de la FEB puede seguir mostrando 0–0 durante el partido.
    // Solo se usa su resultado previo antes de la hora de inicio y con fecha válida.
    if (!Number.isFinite(checked) || checked > now + 60000 || now - checked > 86400000 ||
        !Number.isFinite(start) || now >= start || !s.previa) return null;
    const a = score(s.local.puntos), b = score(s.visitante.puntos);
    if (a !== 0 || b !== 0) return null;
    return {
      phase: "pregame", quarter: null, clock: "—", quarters: [], snapshot: true,
      home: {id: String(s.local.id), name: s.local.nombre, short: game.local.corto, code: game.local.siglas, score: a, fouls: 0, stats: null, players: []},
      away: {id: String(s.visitante.id), name: s.visitante.nombre, short: game.visitante.corto, code: game.visitante.siglas, score: b, fouls: 0, stats: null, players: []}
    };
  }

  function playerEvents(raw, state) {
    const teams = [state.home, state.away];
    return timeline(raw).flatMap(line => {
      if (!text(line.idPlayer)) return [];
      const team = byId(teams, line.idTeam);
      if (!team) return [];
      const player = byId(team.players, line.idPlayer);
      const parsed = text(line.text).match(/^\([^)]*\)\s*(.+?):\s*/);
      const name = text(player && player.name) || (parsed && parsed[1]);
      if (!name) return [];
      const action = text(line.action), metrics = [];
      if (action === "shoot" || action === "fthrow") {
        const points = number(line.logParam6), made = String(line.logParam4) === "1";
        if (![1, 2, 3].includes(points) || !["0", "1"].includes(String(line.logParam4))) return [];
        if (made) metrics.push({key: "pts", amount: points}, {key: "p" + points + "m", amount: 1});
        else metrics.push({key: "p" + points + "miss", amount: 1});
      } else {
        const key = {rebound: "reb", assist: "assist", recovery: "st", lose: "to", blockshot: "bs", foul: "pf"}[action];
        if (!key) return [];
        metrics.push({key, amount: 1});
      }
      const utc = text(line.LogTimeUtc);
      const at = utc ? Date.parse(utc.replace(" ", "T") + (/Z$|[+-]\d{2}:\d{2}$/.test(utc) ? "" : "Z")) : NaN;
      const sequence = number(line.num);
      return [{id: text(line.num) || [utc, action, line.idPlayer, line.text].join("|"), sequence,
        playerId: text(line.idPlayer), teamId: team.id, name, metrics,
        quarter: number(line.quarter), clock: text(line.time), at: Number.isFinite(at) ? at : null}];
    }).sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
  }

  function createEventTracker(saved) {
    let initialized = !!(saved && saved.initialized);
    let cursor = number(saved && saved.cursor) || 0;
    const seen = new Set(saved && Array.isArray(saved.seen) ? saved.seen : []);
    return {
      take(events, now) {
        const fresh = [], ready = initialized, previousCursor = cursor;
        for (const event of events) {
          const known = seen.has(event.id) || (event.sequence !== null && event.sequence <= previousCursor);
          seen.add(event.id);
          cursor = Math.max(cursor, event.sequence || 0);
          // El primer acceso establece una base: no reproduce acciones históricas.
          // Tras una reconexión solo se anuncian acciones fechadas en el último minuto.
          if (ready && !known && event.at !== null && now - event.at <= 60000 && event.at <= now + 5000) fresh.push(event);
        }
        initialized = true;
        while (seen.size > 1500) seen.delete(seen.values().next().value);
        return fresh;
      },
      save() { return {initialized, cursor, seen: [...seen]}; }
    };
  }

  function groupEvents(events) {
    const groups = new Map();
    for (const event of events) {
      const id = event.teamId + ":" + event.playerId;
      if (!groups.has(id)) groups.set(id, {...event, metrics: []});
      const group = groups.get(id);
      group.at = Math.max(group.at || 0, event.at || 0);
      group.clock = event.clock; group.quarter = event.quarter;
      for (const metric of event.metrics) {
        const existing = group.metrics.find(m => m.key === metric.key);
        if (existing) existing.amount += metric.amount;
        else group.metrics.push({...metric});
      }
    }
    return [...groups.values()];
  }

  function metricLabel(metric) {
    const labels = {pts: ["PUNTO", "PUNTOS"], p3m: ["TRIPLE", "TRIPLES"], p2m: ["CANASTA DE 2", "CANASTAS DE 2"],
      p1m: ["TIRO LIBRE", "TIROS LIBRES"], p3miss: ["T3 FALLADO", "T3 FALLADOS"], p2miss: ["T2 FALLADO", "T2 FALLADOS"],
      p1miss: ["TL FALLADO", "TL FALLADOS"], reb: ["REBOTE", "REBOTES"], assist: ["ASISTENCIA", "ASISTENCIAS"],
      st: ["RECUPERACIÓN", "RECUPERACIONES"], to: ["PÉRDIDA", "PÉRDIDAS"], bs: ["TAPÓN", "TAPONES"], pf: ["FALTA PERSONAL", "FALTAS PERSONALES"]};
    const label = labels[metric.key];
    return label ? "+" + metric.amount + " " + label[metric.amount === 1 ? 0 : 1] : "";
  }

  function shot(team, prefix) {
    const made = number(team.stats && team.stats[prefix + "m"]);
    const attempted = number(team.stats && team.stats[prefix + "a"]);
    if (made === null || attempted === null || attempted < made || attempted < 0) return null;
    return {
      value: made + "/" + attempted,
      detail: attempted ? Math.round(made / attempted * 100) + "% de acierto" : "Sin intentos",
      numeric: attempted ? made / attempted * 100 : 0
    };
  }

  function slides(state) {
    if (!state || state.snapshot || state.phase === "pregame") return [];
    const result = [], a = state.home, b = state.away;
    function metric(key, label, detail, lowerBetter) {
      const av = number(a.stats && a.stats[key]), bv = number(b.stats && b.stats[key]);
      if (av === null && bv === null) return;
      result.push({key, title: label, kind: "comparison", lowerBetter: !!lowerBetter,
        home: {value: display(av), numeric: av, detail: a.short},
        away: {value: display(bv), numeric: bv, detail: b.short}, note: detail || "ESTADÍSTICAS DEL PARTIDO"});
    }
    metric("rt", "REBOTES");
    metric("assist", "ASISTENCIAS");
    [["p3", "TRIPLES"], ["p2", "TIROS DE DOS"], ["p1", "TIROS LIBRES"]].forEach(([key, label]) => {
      const av = shot(a, key), bv = shot(b, key);
      if (av || bv) result.push({key, title: label, kind: "comparison", home: av || {value: "—", numeric: null, detail: "Sin dato FEB"},
        away: bv || {value: "—", numeric: null, detail: "Sin dato FEB"}, note: "CONVERTIDOS / INTENTADOS"});
    });
    metric("st", "RECUPERACIONES");
    metric("to", "PÉRDIDAS", "BALONES PERDIDOS", true);
    metric("bs", "TAPONES");
    [["pts", "MÁXIMOS ANOTADORES", "PTS"], ["reb", "LÍDERES EN REBOTES", "REB"], ["assist", "LÍDERES EN ASISTENCIAS", "AST"], ["val", "VALORACIÓN", "VAL"]].forEach(([key, title, unit]) => {
      const leader = team => {
        const ps = team.players.filter(p => number(p[key]) !== null && number(p[key]) > 0);
        ps.sort((x, y) => number(y[key]) - number(x[key]) || text(x.name).localeCompare(text(y.name)));
        if (!ps.length) return {value: "—", detail: "Sin dato destacado", numeric: null};
        const p = ps[0];
        return {value: display(p[key]) + " " + unit, detail: text(p.name), numeric: number(p[key])};
      };
      const home = leader(a), away = leader(b);
      if (home.numeric !== null || away.numeric !== null) result.push({key: "leader-" + key, title, kind: "leader", home, away, note: "LÍDER DE CADA EQUIPO"});
    });
    const qs = state.quarters.filter(q => q.home !== null && q.away !== null);
    if (qs.length) result.push({key: "quarters", title: "PARCIALES", kind: "quarters", quarters: qs, note: "PUNTOS POR CUARTO"});
    return result;
  }

  function tickerLines(state) {
    return slides(state).flatMap(slide => {
      if (slide.kind === "quarters") return ["PARCIALES · " + slide.quarters.map(q =>
        (q.n > 4 ? "PR " + (q.n - 4) : "C" + q.n) + " " + q.home + "–" + q.away).join(" · ")];
      const a = slide.home, b = slide.away;
      if (slide.kind === "leader") return [slide.title + " · " + state.home.code + ": " + a.detail + " " + a.value +
        " · " + state.away.code + ": " + b.detail + " " + b.value];
      if (slide.kind === "comparison") return [slide.title + " · " + state.home.short + " " + a.value +
        " – " + b.value + " " + state.away.short];
      return [];
    });
  }

  return {number, score, phase, activity, selectGame, normalize, snapshotState, slides, tickerLines, quarterFouls, foulLights,
    playerEvents, createEventTracker, groupEvents, metricLabel};
});
