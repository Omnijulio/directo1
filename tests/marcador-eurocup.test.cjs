const test=require('node:test'),assert=require('node:assert/strict');
const core=require('../assets/marcador-feb-core.js'),euro=require('../assets/marcador-eurocup-core.js');
const config=require('../config-baloncesto.json'),fixture=require('./fixtures/eurocup-live.json');
const game=core.selectGame(config),copy=x=>JSON.parse(JSON.stringify(x));
const normalize=(h=fixture.header,b=fixture.box,p=fixture.plays)=>euro.normalize(h,b,p,game);
const plays=lines=>({CodeTeamA:'BGS ',CodeTeamB:'RIG ',FirstQuarter:lines});
test('el partido EuroCup U2026/65 se corresponde con Flashscore 6cIEmLOb y conserva el reloj oficial restante',()=>{
  assert.equal(game.partido,20260065);assert.equal(game.referencia_flashscore,'6cIEmLOb');
  const s=normalize();assert.equal(s.phase,'live');assert.equal(s.quarter,1);
  assert.deepEqual([s.home.score,s.away.score],[13,15]);assert.equal(s.clock,'03:10');assert.notEqual(s.clock,fixture.header.GameTime);
});
test('se rechazan otra temporada, fecha, equipos y jugadas de otro encuentro',()=>{
  for(const [key,value] of [['pcom','U2025'],['Date','29/10/2026'],['CodeTeamA','JLM']]){
    const h=copy(fixture.header);h[key]=value;assert.throws(()=>normalize(h),/otro|coinciden/);
  }
  assert.throws(()=>normalize(fixture.header,null,{CodeTeamA:'BGS',CodeTeamB:'JLM'}),/otros equipos/);
});
test('un 0–0 oficial es válido y los errores no se convierten en cero',()=>{
  const h=copy(fixture.header);h.ScoreA='0';h.ScoreB='0';assert.equal(normalize(h).home.score,0);
  for(const value of [null,'',undefined,-1]){h.ScoreA=value;assert.throws(()=>normalize(h),/incompleto/);}
});
test('asocia estadísticas por equipo aunque cambie el orden y elimina espacios de los identificadores',()=>{
  const b=copy(fixture.box);b.Stats.reverse();const s=normalize(fixture.header,b);
  assert.equal(s.home.stats.rt,5);assert.equal(s.away.stats.rt,7);assert.equal(s.home.stats.p3m,2);
  assert.ok(s.home.players.some(p=>p.id==='P013861'&&p.name==='STEWARD, DJ'&&p.pts===7));
  assert.ok(core.tickerLines(s).some(t=>t.includes('TRIPLES')&&t.includes('2/4')&&t.includes('1/5')));
  b.Stats[0].PlayersStats[0].Team='JLM';assert.throws(()=>normalize(fixture.header,b),/otro/);
});
test('las luces usan las faltas oficiales del cuarto y conservan el cuarto naranja y el bonus rojo',()=>{
  const h=copy(fixture.header);h.FoultsA='4';h.FoultsB='5';const s=normalize(h);
  assert.deepEqual(core.foulLights(s.home.fouls),['lit','lit','lit','orange','off']);
  assert.deepEqual(core.foulLights(s.away.fouls),Array(5).fill('red'));
  h.Quarter='2';h.FoultsA='0';assert.equal(normalize(h,null,null).home.fouls,0);
});
test('TOUT y TOUT_TV son pausas; TO es una pérdida que reanuda el juego, y las sustituciones no cancelan la pausa',()=>{
  const h=copy(fixture.header),p=plays([{PLAYTYPE:'TOUT',NUMBEROFPLAY:1,MARKERTIME:'03:10'},{PLAYTYPE:'IN',NUMBEROFPLAY:2,MARKERTIME:'03:10'}]);
  assert.equal(normalize(h,null,p).activity.kind,'timeout');
  p.FirstQuarter[0].PLAYTYPE='TOUT_TV';assert.equal(normalize(h,null,p).activity.kind,'timeout');
  p.FirstQuarter.push({PLAYTYPE:'TO',NUMBEROFPLAY:3,MARKERTIME:'03:10'});assert.equal(normalize(h,null,p).activity.kind,'live');
  h.RemainingPartialTime='03:09';assert.equal(normalize(h,null,p).activity.kind,'live');
});
test('el fin de cuarto y el descanso detienen las luces sin anticipar el final del partido',()=>{
  const h=copy(fixture.header);h.RemainingPartialTime='00:00';h.Quarter='2';
  assert.equal(normalize(h,null,null).activity.label,'DESCANSO');
  h.Quarter='4';assert.equal(normalize(h,null,null).activity.label,'FIN DEL CUARTO 4');
  assert.equal(normalize(h,null,null).phase,'break');h.Live=false;assert.equal(normalize(h,null,null).phase,'final');
  h.ScoreA=h.ScoreB;assert.notEqual(normalize(h,null,null).phase,'final');
});
test('la previa solo aparece cuando la fuente indica que todavía no ha comenzado',()=>{
  const h=copy(fixture.header);Object.assign(h,{Live:false,Quarter:'0',ScoreA:'0',ScoreB:'0',RemainingPartialTime:''});
  const s=normalize(h,null,null);assert.equal(s.phase,'pregame');assert.deepEqual(core.slides(s),[]);
});
test('los incrementos de jugadores se anuncian con el equipo correcto y nunca se reproduce el historial inicial',()=>{
  const tracker=euro.createStatsTracker(),s=normalize();assert.deepEqual(tracker.take(s,100000),[]);
  const p=s.away.players[0];p.pts+=3;p.p3m+=1;p.p3a+=1;const added=tracker.take(s,110000);
  assert.equal(added.length,1);assert.equal(added[0].teamId,'RIG');assert.equal(added[0].name,p.name);
  assert.ok(added[0].metrics.some(m=>m.key==='pts'&&m.amount===3));assert.deepEqual(tracker.take(s,120000),[]);
});
test('no se presenta el agregado de todas las prórrogas como parcial de una sola',()=>{
  const h=copy(fixture.header);h.Quarter='6';h.RemainingPartialTime='02:00';
  const s=normalize(h,null,null);assert.equal(s.quarter,6);assert.equal(s.quarters.length,4);
});
