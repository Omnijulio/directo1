/* Datos oficiales de live.euroleague.net/api para EuroCup. */
(function(root,factory){
  if(typeof module==="object"&&module.exports) module.exports=factory(require("./marcador-feb-core.js"),require("./marcador-acb-core.js"));
  else root.EuroCupScore=factory(root.FEBScore,root.ACBScore);
})(typeof globalThis!=="undefined"?globalThis:this,function(core,acb){
  "use strict";
  const list=value=>Array.isArray(value)?value:[], text=value=>value==null?"":String(value).trim();
  const fields={pts:"Points",p1m:"FreeThrowsMade",p1a:"FreeThrowsAttempted",p2m:"FieldGoalsMade2",p2a:"FieldGoalsAttempted2",
    p3m:"FieldGoalsMade3",p3a:"FieldGoalsAttempted3",reb:"TotalRebounds",rt:"TotalRebounds",assist:"Assistances",
    st:"Steals",to:"Turnovers",bs:"BlocksFavour",pf:"FoulsCommited",val:"Valuation"};
  const stats=source=>Object.fromEntries(Object.entries(fields).map(([key,field])=>[key,core.number(source&&source[field])]));
  function timeline(plays,quarter){
    const buckets=["FirstQuarter","SecondQuarter","ThirdQuarter","ForthQuarter","ExtraTime"];
    return buckets.flatMap((key,index)=>list(plays&&plays[key]).map(p=>({...p,period:index<4?index+1:
      core.number(p.MINUTE)>40?5+Math.floor((Number(p.MINUTE)-41)/5):Math.max(5,quarter)})))
      .sort((a,b)=>(core.number(a.NUMBEROFPLAY)||0)-(core.number(b.NUMBEROFPLAY)||0));
  }
  function activity(header,plays,phase,quarter){
    if(phase==="pregame")return {kind:phase,label:""};
    if(phase==="final")return {kind:phase,label:"FINAL DEL PARTIDO"};
    if(phase==="paused")return {kind:phase,label:"PARTIDO INTERRUMPIDO"};
    const lines=timeline(plays,quarter).filter(p=>p.period===quarter);
    const period=lines.filter(p=>["BP","EP"].includes(text(p.PLAYTYPE))).pop();
    if(quarter>0&&(/^0{1,2}:00(?:[.,]0+)?$/.test(text(header.RemainingPartialTime))||period&&text(period.PLAYTYPE)==="EP")){
      return {kind:quarter===2?"break":"quarter-end",label:quarter===2?"DESCANSO":quarter>4?"FIN DE PRÓRROGA "+(quarter-4):"FIN DEL CUARTO "+quarter};
    }
    const timeout=lines.filter(p=>/^TOUT(?:_TV)?$/.test(text(p.PLAYTYPE))).pop();
    const resumed=timeout&&lines.some(p=>Number(p.NUMBEROFPLAY)>Number(timeout.NUMBEROFPLAY)&&
      /^(?:[23]FG[AM]|FT[AM]|AS|O|D|ST|TO|CM|OF|BP|FV)$/.test(text(p.PLAYTYPE)));
    if(timeout&&text(timeout.MARKERTIME)===text(header.RemainingPartialTime)&&!resumed)return {kind:"timeout",label:"TIEMPO MUERTO"};
    return {kind:phase,label:phase==="live"?"EN JUEGO":""};
  }
  function quarterFouls(header,plays,game){
    const quarter=core.number(header.Quarter)||0;
    if(!quarter)return {home:0,away:0};
    // FoultsA/B son acumulados de todo el partido. El bonus se cuenta por periodo.
    const first=quarter>4?4:quarter,lines=timeline(plays,quarter),seen=new Set();
    const complete=lines.some(p=>p.period===first&&text(p.PLAYTYPE)==="BP");
    const fouls=lines.filter(p=>{
      const key=[p.period,p.NUMBEROFPLAY,p.PLAYTYPE,text(p.CODETEAM),text(p.PLAYER_ID)].join(":");
      if(seen.has(key))return false;seen.add(key);
      return p.period>=first&&p.period<=quarter&&text(p.PLAYER_ID)&&text(p.DORSAL)&&
        (/^CM/.test(text(p.PLAYTYPE))||text(p.PLAYTYPE)==="OF");
    });
    const count=id=>{const n=fouls.filter(p=>text(p.CODETEAM)===String(id)).length;return complete||n>=5?n:null;};
    return {home:count(game.local.id),away:count(game.visitante.id)};
  }
  function normalize(header,box,plays,game){
    if(!header||typeof header.Live!=="boolean")throw new Error("Cabecera EuroCup incompleta");
    const season=text(header.pcom||header.CompetitionReducedName);
    const date=text(header.Date).split("/").reverse().join("-");
    if(season!==game.temporada||date!==String(game.inicio).slice(0,10))throw new Error("Respuesta EuroCup de otro partido o temporada");
    if(text(header.CodeTeamA)!==String(game.local.id)||text(header.CodeTeamB)!==String(game.visitante.id))throw new Error("Equipos EuroCup no coinciden");
    if(plays&&(text(plays.CodeTeamA)!==String(game.local.id)||text(plays.CodeTeamB)!==String(game.visitante.id)))throw new Error("Jugadas EuroCup de otros equipos");
    const scores=[core.score(header.ScoreA),core.score(header.ScoreB)];
    if(scores.some(value=>value===null))throw new Error("Marcador EuroCup incompleto");
    const quarter=core.number(header.Quarter)??core.number(plays&&plays.ActualQuarter)??0;
    const clock=text(header.RemainingPartialTime),lines=timeline(plays,quarter);
    const explicitEnd=lines.some(p=>/^(?:EG|ENDGAME)$/.test(text(p.PLAYTYPE))||/end (?:of )?game|game (?:end|over)/i.test(text(p.PLAYINFO)));
    let phase=explicitEnd||!header.Live&&quarter>=4&&/^0{1,2}:00$/.test(clock)&&scores[0]!==scores[1]?"final":
      header.Live?"live":quarter===0?"pregame":"paused";
    const act=activity(header,plays,phase,quarter);
    if(["break","quarter-end"].includes(act.kind))phase="break";
    const fouls=quarterFouls(header,plays,game);
    const boxes=list(box&&box.Stats);
    function team(config,suffix,index){
      const name=text(header["Team"+suffix]);
      const entry=boxes.find(b=>list(b.PlayersStats).some(p=>text(p.Team)===String(config.id))||text(b.Team).toUpperCase()===name.toUpperCase());
      if(boxes.length&&!entry)throw new Error("Estadísticas EuroCup de otros equipos");
      if(entry&&list(entry.PlayersStats).some(p=>text(p.Team)&&text(p.Team)!==String(config.id)))throw new Error("Jugador EuroCup de otro equipo");
      return {id:String(config.id),name,short:config.corto,code:config.siglas,score:scores[index],
        fouls:phase==="pregame"?0:fouls[index?"away":"home"],stats:entry&&entry.totr?stats(entry.totr):null,
        players:list(entry&&entry.PlayersStats).map(p=>{const values=stats(p);return {id:text(p.Player_ID),name:text(p.Player),...values,
          p1miss:values.p1a!==null&&values.p1m!==null?values.p1a-values.p1m:null,
          p2miss:values.p2a!==null&&values.p2m!==null?values.p2a-values.p2m:null,
          p3miss:values.p3a!==null&&values.p3m!==null?values.p3a-values.p3m:null};})};
    }
    const quarters=[];
    for(let n=1;n<=Math.min(4,quarter);n++){
      const partial=suffix=>{
        const row=list(box&&box.ByQuarter).find(row=>text(row.Team).toUpperCase()===text(header["Team"+suffix]).toUpperCase());
        if(row&&core.score(row["Quarter"+n])!==null)return core.score(row["Quarter"+n]);
        // ScoreQuarterN es el tanteo acumulado al terminar ese periodo.
        const current=core.score(header["ScoreQuarter"+n+suffix]),previous=n===1?0:core.score(header["ScoreQuarter"+(n-1)+suffix]);
        return current!==null&&previous!==null&&current>=previous?current-previous:null;
      };
      quarters.push({n,home:partial("A"),away:partial("B")});
    }
    return {phase,quarter,clock:/^\d{1,2}:\d{2}(?:[.,]\d+)?$/.test(clock)?clock:"—",activity:act,
      quarters,home:team(game.local,"A",0),away:team(game.visitante,"B",1)};
  }
  return {normalize,activity,timeline,quarterFouls,createStatsTracker:acb.createStatsTracker};
});
