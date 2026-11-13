(function(){
  "use strict";
  const $=id=>document.getElementById(id),panel=$("football-scorebug");
  if(!panel||!window.FootballScore) return;
  const params=new URLSearchParams(location.search);
  const hour=new Intl.DateTimeFormat("es-ES",{timeZone:"Europe/Madrid",hour:"2-digit",minute:"2-digit"});
  let game,state,lastGood=0,failed=false,pending=false,generation=0,nextPoll;
  function image(side,team){
    const img=$("football-"+side+"-logo"),fallback=$("football-"+side+"-fallback");
    $("football-"+side+"-code").textContent=team.siglas;fallback.textContent=team.siglas;
    img.alt="Escudo de "+team.nombre;
    const sync=()=>{const loaded=img.complete&&img.naturalWidth>0;img.hidden=!loaded;fallback.hidden=loaded;};
    img.onload=sync;img.onerror=sync;
    if(img.getAttribute("src")!==team.escudo){img.hidden=true;fallback.hidden=false;img.src=team.escudo;}
    sync();
  }
  function render(){
    if(!game) return;
    const stale=!!state&&(failed||Date.now()-lastGood>60000);
    panel.dataset.phase=state?state.phase:"unknown";panel.dataset.stale=String(stale);
    panel.dataset.received=lastGood?new Date(lastGood).toISOString():"";
    for(const side of ["home","away"]){
      const el=$("football-"+side+"-score"),value=state?String(state[side].score):"—";
      if(el.textContent!==value){el.textContent=value;el.classList.remove("changed");void el.offsetWidth;el.classList.add("changed");}
    }
    let clock=state?state.clock:"—",label="FÚTBOL";
    if(state&&state.phase==="pregame") clock=hour.format(new Date(game.inicio));
    if(state&&state.phase==="break") clock="DESCANSO";
    if(state&&state.phase==="final") clock="FINAL";
    if(state&&state.phase==="paused") clock="PAUSA";
    if(stale) label="FÚTBOL · RECONECTANDO";
    if(!state) label=failed?"FÚTBOL · RECONECTANDO":"FÚTBOL · CONECTANDO";
    $("football-clock").textContent=clock;$("football-label").textContent=label;
    panel.setAttribute("aria-label",[game.local.nombre,state?state.home.score:"sin dato",game.visitante.nombre,state?state.away.score:"sin dato",clock,stale?"último dato recibido":""].filter(Boolean).join(" · "));
  }
  async function poll(){
    if(!game) return;
    if(pending){clearTimeout(nextPoll);nextPoll=setTimeout(poll,1000);return;}
    pending=true;const current=generation,started=Date.now(),controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
    try{
      if(game.liga!=="esp.2"||!/^\d{9}$/.test(String(game.partido))) throw new Error("Partido de fútbol no válido");
      const date=String(game.inicio).slice(0,10).replace(/-/g,"");
      const response=await fetch("https://site.api.espn.com/apis/site/v2/sports/soccer/esp.2/scoreboard?dates="+date+"&t="+Date.now(),{cache:"no-store",credentials:"omit",signal:controller.signal});
      if(!response.ok) throw new Error("HTTP "+response.status);
      const next=window.FootballScore.normalize(await response.json(),game);
      if(current!==generation) return;
      state=next;lastGood=Date.now();failed=false;
    }catch(_){if(current===generation)failed=true;}
    finally{
      clearTimeout(timer);pending=false;
      if(current===generation&&game){render();clearTimeout(nextPoll);nextPoll=setTimeout(poll,Math.max(1000,10000-(Date.now()-started)));}
    }
  }
  window.addEventListener("scoreboard-config",event=>{
    const config=event.detail.config,next=config.futbol;
    const enabled=next&&next.visible!==false&&params.get("futbol")!=="0"&&
      (next.acompanar_partidos||[]).some(id=>String(id)===String(event.detail.partido));
    panel.hidden=!enabled;document.body.classList.toggle("with-football",!!enabled);
    if(!enabled){if(game){generation++;game=null;clearTimeout(nextPoll);}return;}
    const changed=!game||String(game.partido)!==String(next.partido);game=next;
    image("home",game.local);image("away",game.visitante);
    panel.dataset.partido=String(game.partido);panel.dataset.source="espn-api";
    if(changed){generation++;state=null;lastGood=0;failed=false;clearTimeout(nextPoll);render();poll();}
  });
  window.addEventListener("online",()=>{if(game){clearTimeout(nextPoll);poll();}});
  document.addEventListener("visibilitychange",()=>{if(!document.hidden&&game){clearTimeout(nextPoll);poll();}});
  setInterval(render,1000);
})();
