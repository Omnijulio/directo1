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

  function phase(header) {
    const status = text(header.statusText).toUpperCase();
    const time = text(header.time).toUpperCase();
    if (String(header.status) === "3" || /FINISHED|FINAL|ENDED/.test(status) || time === "FINAL") return "final";
    if (/DESCANSO|HALF|BREAK|INTERVAL/.test(status + " " + time)) return "break";
    if (/SUSPEND|POSTPON|CANCEL|APLAZ/.test(status + " " + time)) return "paused";
    if (String(header.status) === "2" || /PLAYING|LIVE|EN JUEGO|INPROGRESS/.test(status)) return "live";
    if (String(header.status) === "1" || /SCHEDULED|NOTSTARTED|PRE|PENDING/.test(status)) return "pregame";
    if (number(header.quarter) > 0 && /\d{1,2}:\d{2}/.test(time)) return "live";
    return "unknown";
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
    return {
      phase: phase(header), quarter: number(header.quarter),
      clock: /^\d{1,2}:\d{2}(?:[.,]\d+)?$/.test(clockText) ? clockText : "—",
      statusText: text(header.statusText), quarters,
      home: team(home, game.local, scores[0]), away: team(away, game.visitante, scores[1])
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
      home: {id: String(s.local.id), name: s.local.nombre, short: game.local.corto, code: game.local.siglas, score: a, stats: null, players: []},
      away: {id: String(s.visitante.id), name: s.visitante.nombre, short: game.visitante.corto, code: game.visitante.siglas, score: b, stats: null, players: []}
    };
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

  return {number, score, phase, normalize, snapshotState, slides};
});
