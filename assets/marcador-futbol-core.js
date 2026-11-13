/* Minuto y resultado publicados por el marcador de ESPN; nunca se extrapola el reloj. */
(function(root,factory){
  if(typeof module === "object" && module.exports) module.exports=factory();
  else root.FootballScore=factory();
})(typeof globalThis !== "undefined" ? globalThis : this,function(){
  "use strict";
  const list=x=>Array.isArray(x)?x:[],text=x=>x==null?"":String(x).trim();
  function score(value){
    if(!/^\d{1,2}$/.test(text(value))) throw new Error("Resultado de fútbol incompleto");
    return Number(value);
  }
  function normalize(raw,game){
    const event=list(raw&&raw.events).find(e=>String(e.id)===String(game.partido));
    if(!event) throw new Error("Partido de fútbol ausente");
    if(!Number.isFinite(Date.parse(event.date)) || Math.abs(Date.parse(event.date)-Date.parse(game.inicio))>60000)
      throw new Error("Fecha de fútbol distinta de la configurada");
    const competition=list(event.competitions).find(c=>String(c.id)===String(game.partido));
    if(!competition) throw new Error("Ficha de fútbol de otro partido");
    const teams=list(competition.competitors),home=teams.find(t=>t.homeAway==="home"),away=teams.find(t=>t.homeAway==="away");
    if(!home||!away||String(home.team&&home.team.id)!==String(game.local.id)||String(away.team&&away.team.id)!==String(game.visitante.id))
      throw new Error("Equipos de fútbol distintos de los configurados");
    const status=competition.status||event.status||{},type=status.type||{},name=text(type.name);
    const phase=/POSTPON|SUSPEND|CANCEL|ABANDON/.test(name)?"paused":
      type.completed===true||type.state==="post"?"final":/HALFTIME|END_OF|BREAK/.test(name)?"break":
      type.state==="in"?"live":type.state==="pre"?"pregame":"unknown";
    const minute=text(status.displayClock).replace(/[’'′]/g,"").replace(/\s/g,"");
    const clock=/^\d{1,3}(?:\+\d{1,2})?$/.test(minute)?minute+"′":"—";
    return {phase,clock,home:{id:String(game.local.id),score:score(home.score)},away:{id:String(game.visitante.id),score:score(away.score)}};
  }
  return {normalize};
});
