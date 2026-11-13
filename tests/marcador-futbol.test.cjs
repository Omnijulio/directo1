const test=require('node:test'),assert=require('node:assert/strict');
const core=require('../assets/marcador-futbol-core.js'),basket=require('../assets/marcador-feb-core.js');
const config=require('../config-baloncesto.json'),fixture=require('./fixtures/futbol-leganes-burgos.json');
const clone=x=>JSON.parse(JSON.stringify(x)),game=config.futbol;
const event=x=>x.events[0],comp=x=>event(x).competitions[0];
function status(x,type,displayClock){comp(x).status={type,displayClock};return x;}
test('ambas composiciones seleccionan Tizona–Gran Canaria y el fútbol pertenece al mismo día',()=>{
  const g=basket.selectGame(config);assert.equal(g.partido,2535791);
  assert.deepEqual([g.local.id,g.visitante.id],['1008400','1008797']);
  assert.deepEqual(config.narradores,['Iñaki','“Pancho”']);assert.ok(game.acompanar_partidos.includes(g.partido));
  const s=core.normalize(fixture,game);assert.equal(s.phase,'pregame');
  assert.deepEqual([s.home.score,s.away.score],[0,0]);
});
test('solo se acepta el encuentro identificado, con local, visitante y fecha correctos',()=>{
  let x=clone(fixture);event(x).id='otro';assert.throws(()=>core.normalize(x,game),/ausente/);
  x=clone(fixture);comp(x).id='otro';assert.throws(()=>core.normalize(x,game),/otro partido/);
  x=clone(fixture);event(x).date='2026-11-14T19:30Z';assert.throws(()=>core.normalize(x,game),/Fecha/);
  x=clone(fixture);comp(x).competitors[0].team.id='999';assert.throws(()=>core.normalize(x,game),/Equipos/);
  x=clone(fixture);comp(x).competitors.reverse();assert.equal(core.normalize(x,game).home.id,'17534');
});
test('conserva el minuto y el añadido de la fuente, sin calcular un reloj con la hora local',()=>{
  const x=status(clone(fixture),{state:'in',name:'STATUS_FIRST_HALF'},"45'+3");
  comp(x).competitors[0].score='1';const s=core.normalize(x,game);
  assert.equal(s.phase,'live');assert.equal(s.clock,'45+3′');assert.equal(s.home.score,1);
  comp(x).status.displayClock='';assert.equal(core.normalize(x,game).clock,'—');
});
test('descanso, final y aplazamiento no se presentan como un partido en juego',()=>{
  const x=clone(fixture);
  status(x,{state:'in',name:'STATUS_HALFTIME'},"45'");assert.equal(core.normalize(x,game).phase,'break');
  status(x,{state:'post',name:'STATUS_FULL_TIME',completed:true},"90'+4");assert.equal(core.normalize(x,game).phase,'final');
  status(x,{state:'pre',name:'STATUS_POSTPONED'},'');assert.equal(core.normalize(x,game).phase,'paused');
});
test('la ausencia del partido o de un resultado válido es un error y nunca un 0–0',()=>{
  assert.throws(()=>core.normalize({},game),/ausente/);
  for(const bad of [null,undefined,'','—','-1','1.5']){
    const x=clone(fixture);comp(x).competitors[0].score=bad;
    assert.throws(()=>core.normalize(x,game),/incompleto/);
  }
  const x=clone(fixture);comp(x).competitors[1].score='1';const s=core.normalize(x,game);
  assert.deepEqual([s.home.score,s.away.score],[0,1]);
});
