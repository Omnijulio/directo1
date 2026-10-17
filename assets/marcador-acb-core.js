/* Adaptador de las respuestas públicas de ACB Live; no simula el reloj. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./marcador-feb-core.js"));
  else root.ACBScore = factory(root.FEBScore);
})(typeof globalThis !== "undefined" ? globalThis : this, function (core) {
  "use strict";
  const list = value => Array.isArray(value) ? value : [];
  const fields = {pts:"points",p1m:"freeThrowsMade",p1a:"freeThrowsAttempted",p2m:"twoPointersMade",
    p2a:"twoPointersAttempted",p3m:"threePointersMade",p3a:"threePointersAttempted",assist:"assists",
    reb:"totalRebounds",rt:"totalRebounds",st:"steals",to:"turnovers",bs:"blocks",pf:"personalFouls",val:"rating"};
  const stats = value => Object.fromEntries(Object.entries(fields).map(([key,source]) => [key,core.number(value && value[source])]));
  const clock = play => String(play.minute).padStart(2,"0") + ":" + String(play.second).padStart(2,"0");
  function activity(header, plays, phase) {
    const quarter = core.number(header.currentQuarter);
    if (phase === "pregame") return {kind:phase,label:""};
    if (phase === "final") return {kind:phase,label:"FINAL DEL PARTIDO"};
    if (phase === "paused") return {kind:phase,label:"PARTIDO INTERRUMPIDO"};
    const lines = list(plays && plays.plays).filter(p => Number(p.quarter) === quarter).sort((a,b) => b.order-a.order);
    const period = lines.find(p => [121,116,123].includes(Number(p.playType)));
    if (header.isOnHalfTime || (quarter > 0 && (/^0{1,2}:00(?:[.,]0+)?$/.test(header.timeLeft) || period && [116,123].includes(Number(period.playType))))) {
      return {kind:quarter===2?"break":"quarter-end",label:quarter===2?"DESCANSO":quarter>4?"FIN DE PRÓRROGA "+(quarter-4):"FIN DEL CUARTO "+quarter};
    }
    const timeout = lines.find(p => [113,118].includes(Number(p.playType)));
    const resumed = timeout && lines.some(p => p.order > timeout.order &&
      [92,93,94,96,97,98,100,101,102,103,104,106,107,108,109,110,119,130,131,159,160,161,162,121].includes(Number(p.playType)));
    if (timeout && clock(timeout) === header.timeLeft && !resumed) return {kind:"timeout",label:"TIEMPO MUERTO"};
    return {kind:phase,label:phase==="live"?"EN JUEGO":""};
  }
  function normalize(header, box, plays, game) {
    if (!header || String(header.matchId)!==String(game.partido)) throw new Error("Respuesta ACB de otro partido");
    if (String(header.teams && header.teams.home && header.teams.home.id)!==String(game.local.id) ||
        String(header.teams && header.teams.away && header.teams.away.id)!==String(game.visitante.id)) throw new Error("Equipos ACB no coinciden");
    const status = String(header.matchStatus || "").toUpperCase();
    let phase = /^(NOT_STARTED|NOT_SCHEDULED)$/.test(status)?"pregame":status==="FINALIZED"?"final":
      /^(SUSPENDED|POSTPONED)$/.test(status)?"paused":status==="STARTED"?"live":"unknown";
    if (phase === "unknown") throw new Error("Estado ACB desconocido");
    const quarter = core.number(header.currentQuarter);
    const scores = [header.currentHomeScore,header.currentAwayScore].map(value =>
      value==null && phase==="pregame" && quarter===0 ? 0 : core.score(value));
    if (scores.some(value=>value===null)) throw new Error("Marcador ACB incompleto");
    const boxes = list(box && box.teamBoxscores);
    if (boxes.length && [game.local,game.visitante].some(team=>!boxes.some(b=>String(b.team && b.team.id)===String(team.id)))) throw new Error("Estadísticas ACB de otros equipos");
    if (plays && (String(plays.homeTeam && plays.homeTeam.id)!==String(game.local.id) || String(plays.awayTeam && plays.awayTeam.id)!==String(game.visitante.id))) throw new Error("Jugadas ACB de otros equipos");
    function team(side,config,index) {
      const source=header.teams[side], b=boxes.find(b=>String(b.team.id)===String(config.id));
      const all=b && list(b.statsByPeriods).find(p=>Number(p.quarter)===0);
      const total=all && all.stats;
      return {id:String(config.id),name:source.fullName,short:config.corto,code:config.siglas,score:scores[index],
        fouls:phase==="pregame"?0:core.score(header[side==="home"?"currentHomeBonus":"currentAwayBonus"]),
        stats:total?stats(total.total):null,
        players:list(total && total.players).map(p=>({id:String(p.player.id),name:p.player.nickname || p.player.firstInitialAndLastName,
          ...stats(p),p1miss:core.number(p.freeThrowsAttempted)===null || core.number(p.freeThrowsMade)===null?null:p.freeThrowsAttempted-p.freeThrowsMade,
          p2miss:core.number(p.twoPointersAttempted)===null || core.number(p.twoPointersMade)===null?null:p.twoPointersAttempted-p.twoPointersMade,
          p3miss:core.number(p.threePointersAttempted)===null || core.number(p.threePointersMade)===null?null:p.threePointersAttempted-p.threePointersMade}))};
    }
    const liveActivity=activity(header,plays,phase);
    if (["break","quarter-end"].includes(liveActivity.kind)) phase="break";
    return {phase,quarter,clock:/^\d{1,2}:\d{2}(?:[.,]\d+)?$/.test(header.timeLeft)?header.timeLeft:"—",
      statusText:status,activity:liveActivity,quarters:list(header.quarterScores).map(q=>({n:core.number(q.quarter),home:core.score(q.homeScore),away:core.score(q.awayScore)})),
      home:team("home",game.local,0),away:team("away",game.visitante,1)};
  }
  function createStatsTracker(saved) {
    let previous=saved && saved.previous || {}, checked=Number(saved && saved.checked)||0;
    return {
      take(state,now) {
        const current={}, events=[], fresh=checked>0 && now>=checked && now-checked<=60000;
        for (const team of [state.home,state.away]) for (const player of team.players) {
          const key=team.id+":"+player.id, before=previous[key]; current[key]={...player};
          if (!fresh || !before || state.phase==="pregame") continue;
          const metrics=["pts","p1m","p2m","p3m","p1miss","p2miss","p3miss","reb","assist","st","to","bs","pf"].flatMap(key=>{
            const a=core.number(before[key]), b=core.number(player[key]);
            return a!==null && b!==null && b>a ? [{key,amount:b-a}] : [];
          });
          if (metrics.length) events.push({id:key+":"+now,playerId:player.id,teamId:team.id,name:player.name,metrics,quarter:state.quarter,clock:state.clock,at:now});
        }
        previous=current;checked=now;return events;
      },
      save() { return {previous,checked}; }
    };
  }
  return {normalize,activity,createStatsTracker};
});
