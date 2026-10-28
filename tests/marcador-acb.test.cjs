const test=require('node:test');
const assert=require('node:assert/strict');
const core=require('../assets/marcador-feb-core.js');
const acb=require('../assets/marcador-acb-core.js');
const config=require('../config-baloncesto.json');
const pre=require('./fixtures/acb-previa.json');
const final=require('./fixtures/acb-final.json');
const game=core.selectGame(config,"105404"),clone=value=>JSON.parse(JSON.stringify(value));
function live(){const h=clone(pre.header);Object.assign(h,{matchStatus:'STARTED',currentQuarter:1,timeLeft:'08:12',currentHomeScore:0,currentAwayScore:0});return h;}
function plays(lines){return {homeTeam:pre.header.teams.home,awayTeam:pre.header.teams.away,plays:lines};}

test('la ficha ACB 105404 corresponde a Burgos–Obradoiro y permite el 0–0 anterior al inicio',()=>{
  assert.equal(game.proveedor,'acb');assert.equal(game.referencia_flashscore,'42mhERFs');
  const s=acb.normalize(pre.header,pre.box,null,game);
  assert.equal(s.phase,'pregame');assert.equal(s.home.score,0);assert.equal(s.away.score,0);
  assert.equal(s.home.id,'4469');assert.equal(s.away.id,'4479');assert.deepEqual(core.slides(s),[]);
});
test('un cero en juego es válido y los datos ausentes nunca se convierten en cero',()=>{
  const h=live();assert.equal(acb.normalize(h,null,null,game).home.score,0);
  for(const value of [null,'',undefined,-1]){h.currentHomeScore=value;assert.throws(()=>acb.normalize(h,null,null,game),/incompleto/);}
});
test('rechaza cabeceras, estadísticas y jugadas de otro partido o de otros equipos',()=>{
  const h=live();h.matchId=105400;assert.throws(()=>acb.normalize(h,null,null,game),/otro partido/);
  h.matchId=105404;h.teams.home.id=999;assert.throws(()=>acb.normalize(h,null,null,game),/Equipos/);
  assert.throws(()=>acb.normalize(live(),final.box,null,game),/Estadísticas/);
  assert.throws(()=>acb.normalize(live(),null,final.plays,game),/Jugadas/);
});
test('el acta final real 105400 conserva resultado, estadísticas, líderes y parciales por ID',()=>{
  const h=final.header,b=clone(final.box);b.teamBoxscores.reverse();
  const g={partido:h.matchId,local:{id:h.teams.home.id,corto:'Bilbao',siglas:'SBB'},visitante:{id:h.teams.away.id,corto:'Burgos',siglas:'BUR'}};
  const s=acb.normalize(h,b,final.plays,g);
  assert.equal(s.phase,'final');assert.equal(s.home.score,96);assert.equal(s.away.score,87);
  assert.equal(s.home.stats.rt,34);assert.equal(s.away.stats.assist,17);
  assert.deepEqual(s.quarters.map(q=>[q.home,q.away]),[[19,20],[25,25],[30,25],[22,17]]);
  assert.ok(core.tickerLines(s).some(t=>t.includes('TRIPLES')&&t.includes('13/35')&&t.includes('7/20')));
  assert.ok(core.slides(s).some(t=>t.key==='leader-pts'));
});
test('las luces usan las faltas del cuarto y se reinician en el siguiente periodo',()=>{
  const h=live();h.currentHomeBonus=4;h.currentAwayBonus=5;
  const s=acb.normalize(h,pre.box,null,game);
  assert.equal(s.home.fouls,4);assert.equal(s.away.fouls,5);
  assert.deepEqual(core.foulLights(s.home.fouls),['lit','lit','lit','orange','off']);
  assert.deepEqual(core.foulLights(s.away.fouls),Array(5).fill('red'));
  h.currentQuarter=2;h.currentHomeBonus=0;assert.equal(acb.normalize(h,pre.box,null,game).home.fouls,0);
});
test('el tiempo muerto persiste con sustituciones y termina al reanudar el juego',()=>{
  const h=live(),p=plays([{order:20,playType:113,quarter:1,minute:8,second:12},{order:21,playType:112,quarter:1,minute:8,second:12}]);
  assert.equal(acb.normalize(h,null,p,game).activity.kind,'timeout');
  h.timeLeft='08:11';assert.equal(acb.normalize(h,null,p,game).activity.kind,'live');
  h.timeLeft='08:12';p.plays.push({order:22,playType:93,quarter:1,minute:8,second:12});
  assert.equal(acb.normalize(h,null,p,game).activity.kind,'live');
});
test('distingue descanso, fin de cuarto, prórroga y final sin anticipar el resultado',()=>{
  const h=live();h.timeLeft='00:00';
  assert.equal(acb.normalize(h,null,null,game).activity.label,'FIN DEL CUARTO 1');
  assert.equal(acb.normalize(h,null,null,game).phase,'break');
  h.currentQuarter=2;h.isOnHalfTime=true;assert.equal(acb.normalize(h,null,null,game).activity.label,'DESCANSO');
  h.currentQuarter=5;h.isOnHalfTime=false;assert.equal(acb.normalize(h,null,null,game).activity.label,'FIN DE PRÓRROGA 1');
  h.matchStatus='FINALIZED';assert.equal(acb.normalize(h,null,null,game).activity.label,'FINAL DEL PARTIDO');
});
test('una jugada de fin de periodo detiene las luces aunque el reloj aún no marque cero',()=>{
  const h=live(),p=plays([{order:20,playType:116,quarter:1,minute:0,second:0}]);
  assert.equal(acb.normalize(h,null,p,game).activity.kind,'quarter-end');
  p.plays.push({order:21,playType:121,quarter:1,minute:10,second:0});assert.equal(acb.normalize(h,null,p,game).activity.kind,'live');
});
test('los avisos anuncian incrementos de cada jugador sin repetirlos ni anunciar correcciones a la baja',()=>{
  const s=acb.normalize(live(),pre.box,null,game),tracker=acb.createStatsTracker();assert.deepEqual(tracker.take(s,100000),[]);
  const p=s.home.players[0];p.pts=3;p.p3m=1;p.reb=1;const added=tracker.take(s,110000);
  assert.equal(added.length,1);assert.equal(added[0].teamId,'4469');assert.equal(added[0].name,p.name);
  assert.deepEqual(added[0].metrics,[{key:'pts',amount:3},{key:'p3m',amount:1},{key:'reb',amount:1}]);
  assert.deepEqual(tracker.take(s,120000),[]);p.pts=2;assert.deepEqual(tracker.take(s,130000),[]);
});
test('una primera carga o una reconexión prolongada no reproduce estadísticas históricas',()=>{
  const s=acb.normalize(live(),pre.box,null,game),tracker=acb.createStatsTracker();
  s.home.players[0].pts=12;assert.deepEqual(tracker.take(s,100000),[]);
  const restored=acb.createStatsTracker(tracker.save());s.home.players[0].pts=20;assert.deepEqual(restored.take(s,200001),[]);
  s.home.players[0].pts=22;assert.equal(restored.take(s,210001)[0].metrics[0].amount,2);
});

