const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../assets/marcador-feb-core.js');

const game = {partido:2535753,inicio:'2026-10-16T20:45:00+02:00',
  local:{id:'1008400',corto:'Tizona',siglas:'TIZ'},visitante:{id:'1009837',corto:'Oviedo',siglas:'OVI'}};
function response(home='0',away='0') {
  return {HEADER:{status:'2',statusText:'NOWPLAYING',quarter:1,time:'09:12',
    TEAM:[{id:'1008400',pts:home,name:'Tizona'},{id:'1009837',pts:away,name:'Oviedo'}],
    QUARTERS:{QUARTER:[{n:'1',scoreA:home,scoreB:away}]}}};
}

test('el 0–0 y el 0 de un solo equipo son resultados válidos', () => {
  const zero = core.normalize(response(),game);
  assert.equal(zero.home.score,0); assert.equal(zero.away.score,0);
  assert.equal(core.normalize(response('0','12'),game).away.score,12);
});
test('los datos vacíos y los errores HTTP no se convierten en cero', () => {
  for (const bad of [null,undefined,'',' ',NaN,'--','-1','1.5']) {
    assert.equal(core.score(bad),null);
    const data=response();data.HEADER.TEAM[0].pts=bad;
    assert.throws(() => core.normalize(data,game));
  }
  assert.throws(() => core.normalize({status:404},game));
});
test('se rechaza una respuesta de otro partido aunque tenga marcador', () => {
  const data=response('72','69');data.HEADER.TEAM[1].id='otro';
  assert.throws(() => core.normalize(data,game),/equipos/);
});
test('ordena estadísticas y puntos por ID, incluso si cambia el orden FEB', () => {
  const data=response('64','59');data.HEADER.TEAM.reverse();
  data.BOXSCORE={TEAM:[{id:'1009837',TOTAL:{rt:'19',assist:'10'}}, {id:'1008400',TOTAL:{rt:'23',assist:'14'}}]};
  const s=core.normalize(data,game), slides=core.slides(s);
  assert.equal(s.home.score,64); assert.equal(slides[0].home.value,'23');
  assert.equal(slides[0].away.value,'19');
});
test('admite las correcciones a la baja del acta oficial', () => {
  assert.equal(core.normalize(response('64','59'),game).home.score,64);
  assert.equal(core.normalize(response('63','59'),game).home.score,63);
});
test('conserva el reloj oficial, reconoce final, descanso y prórroga', () => {
  const data=response();assert.equal(core.normalize(data,game).clock,'09:12');
  data.HEADER.time='FINAL';assert.equal(core.normalize(data,game).phase,'final');
  data.HEADER.time='DESCANSO';assert.equal(core.normalize(data,game).phase,'break');
  data.HEADER.time='03:28';data.HEADER.quarter=5;
  assert.equal(core.normalize(data,game).quarter,5);
});
test('la ficha previa 0–0 deja de servir justo al llegar la hora de inicio', () => {
  const bootstrap={consultado:'2026-10-16T03:00:00Z',ficha:{partido:2535753,previa:true,
    local:{id:'1008400',puntos:0,nombre:'Tizona'},visitante:{id:'1009837',puntos:0,nombre:'Oviedo'}}};
  assert.equal(core.snapshotState(bootstrap,game,Date.parse('2026-10-16T18:44:59Z')).home.score,0);
  assert.equal(core.snapshotState(bootstrap,game,Date.parse('2026-10-16T18:45:00Z')),null);
  bootstrap.ficha.local.puntos=null;
  assert.equal(core.snapshotState(bootstrap,game,Date.parse('2026-10-16T18:00:00Z')),null);
});
test('no muestra porcentajes inventados cuando no se ha tirado', () => {
  const data=response();data.BOXSCORE={TEAM:[{id:'1008400',TOTAL:{p3m:'0',p3a:'0'}}]};
  const triples=core.slides(core.normalize(data,game)).find(s => s.key==='p3');
  assert.equal(triples.home.value,'0/0');assert.equal(triples.home.detail,'Sin intentos');
  assert.equal(triples.away.value,'—');
});
test('no asigna un líder ficticio a los jugadores con cero puntos', () => {
  const data=response();data.BOXSCORE={TEAM:[{id:'1008400',PLAYER:[{name:'SIN ESTRENARSE',pts:'0'}]}]};
  assert.equal(core.slides(core.normalize(data,game)).some(s=>s.key==='leader-pts'),false);
});
test('porcentajes con coma, líderes y parciales de prórroga', () => {
  assert.equal(core.number('47,8'),47.8);
  const data=response('84','80');data.HEADER.quarter=5;
  data.HEADER.QUARTERS.QUARTER.push({n:'5',scoreA:'8',scoreB:'4'});
  data.BOXSCORE={TEAM:[{id:'1008400',TOTAL:{p3m:'7',p3a:'24'},PLAYER:[{name:'A',pts:'8'},{name:'B',pts:'18'}]}]};
  const slides=core.slides(core.normalize(data,game));
  assert.equal(slides.find(s=>s.key==='p3').home.detail,'29% de acierto');
  assert.equal(slides.find(s=>s.key==='leader-pts').home.detail,'B');
  assert.equal(slides.find(s=>s.key==='quarters').quarters.at(-1).n,5);
});

function start(quarter, num=1) {
  return {num:String(num),action:'period',quarter:String(quarter),logParam2:'0',text:'Comienzo del Cuarto '+quarter};
}
function foul(num, quarter, team='1008400', extra={}) {
  return {num:String(num),action:'foul',quarter:String(quarter),idTeam:team,idPlayer:'23',logParam10:'1',...extra};
}
function withPlays(lines, quarter=1) {
  const raw=response('64','59');raw.HEADER.quarter=quarter;
  raw.PLAYBYPLAY={LINES:lines};
  // Estos totales del partido no son las faltas del cuarto.
  raw.TEAMSTATS={TEAM:[{id:'1008400',pf:'18'},{id:'1009837',pf:'17'}]};
  return raw;
}

test('las luces cuentan solo las faltas del cuarto y se reinician al empezar el siguiente', () => {
  const lines=[start(1),foul(2,1),foul(3,1),start(2,4),foul(5,2),foul(6,2,'1009837')];
  let state=core.normalize(withPlays(lines,2),game);
  assert.equal(state.home.fouls,1);assert.equal(state.away.fouls,1);
  lines.push(start(3,7));
  state=core.normalize(withPlays(lines,3),game);
  assert.equal(state.home.fouls,0);assert.equal(state.away.fouls,0);
});
test('no cuenta dos veces una jugada, ni faltas borradas o técnicas del entrenador', () => {
  const one=foul(2,1);
  const raw=withPlays([start(1),one,one,foul(3,1,'1008400',{deleted:'true'}),
    foul(4,1,'1008400',{idPlayer:null,logParam10:'0'}),foul(5,1,'1008400',{logParam10:'0'})]);
  assert.equal(core.normalize(raw,game).home.fouls,1);
  raw.PLAYBYPLAY.LINES=raw.PLAYBYPLAY.LINES.filter(l=>l.num!=='2');
  assert.equal(core.normalize(raw,game).home.fouls,0);
});
test('el recuento incompleto no se presenta como cero, pero cinco faltas sí confirman el bonus', () => {
  const raw=withPlays([foul(2,1)]);
  assert.equal(core.normalize(raw,game).home.fouls,null);
  raw.PLAYBYPLAY.LINES=Array.from({length:5},(_,i)=>foul(i+2,1));
  assert.equal(core.normalize(raw,game).home.fouls,5);
  assert.equal(core.normalize(raw,game).away.fouls,null);
});
test('cuarta luz naranja, quinta y posteriores todas rojas', () => {
  assert.deepEqual(core.foulLights(0),['off','off','off','off','off']);
  assert.deepEqual(core.foulLights(3),['lit','lit','lit','off','off']);
  assert.deepEqual(core.foulLights(4),['lit','lit','lit','orange','off']);
  assert.deepEqual(core.foulLights(5),['red','red','red','red','red']);
  assert.deepEqual(core.foulLights(8),['red','red','red','red','red']);
  assert.deepEqual(core.foulLights(null),Array(5).fill('unknown'));
});
test('la prórroga mantiene las faltas del cuarto periodo', () => {
  const raw=withPlays([start(4),foul(2,4),foul(3,4),start(5,4),foul(5,5)],5);
  assert.equal(core.normalize(raw,game).home.fouls,3);
});

const eventAt=Date.parse('2026-10-16T19:12:00Z');
function play(num, action, extra={}) {
  return {num:String(num),action,idPlayer:'23',idTeam:'1008400',quarter:'2',time:'04:21',
    LogTimeUtc:'2026-10-16 19:12:00',text:'(TIZONA) NOMBRE OFICIAL: ACCIÓN',...extra};
}
function events(lines) {
  const raw=withPlays(lines,2), state=core.normalize(raw,game);
  return core.playerEvents(raw,state);
}
test('un triple muestra al jugador real con los puntos y el triple añadidos', () => {
  const result=events([play(10,'shoot',{logParam4:'1',logParam6:'3'})]);
  assert.equal(result[0].name,'NOMBRE OFICIAL');
  assert.equal(result[0].at,eventAt);
  assert.deepEqual(result[0].metrics,[{key:'pts',amount:3},{key:'p3m',amount:1}]);
  assert.deepEqual(result[0].metrics.map(core.metricLabel),['+3 PUNTOS','+1 TRIPLE']);
});
test('se anuncian rebotes, asistencias, faltas y tiros fallados; nunca se asigna un rebote de equipo a un jugador', () => {
  const result=events([play(10,'rebound'),play(11,'assist'),play(12,'foul'),
    play(13,'shoot',{logParam4:'0',logParam6:'2'}),play(14,'rebound',{idPlayer:null}),play(15,'assist',{deleted:true})]);
  assert.deepEqual(result.map(e=>e.metrics[0].key),['reb','assist','pf','p2miss']);
});
test('no reproduce el historial inicial y solo entrega una vez cada acción nueva', () => {
  const tracker=core.createEventTracker();
  const first=events([play(10,'assist')]);
  assert.deepEqual(tracker.take(first,eventAt),[]);
  const all=events([play(10,'assist'),play(11,'rebound')]);
  assert.deepEqual(tracker.take(all,eventAt+15000).map(e=>e.id),['11']);
  assert.deepEqual(tracker.take(all,eventAt+30000),[]);
  const reloaded=core.createEventTracker(tracker.save());
  assert.deepEqual(reloaded.take(all,eventAt+45000),[]);
});
test('la previa permite detectar la primera jugada y una reconexión descarta los avisos antiguos', () => {
  const tracker=core.createEventTracker();tracker.take([],eventAt-30000);
  assert.equal(tracker.take(events([play(1,'assist')]),eventAt+15000).length,1);
  const all=events([play(1,'assist'),play(2,'rebound'),play(3,'assist',{LogTimeUtc:'2026-10-16 19:14:50'})]);
  assert.deepEqual(tracker.take(all,eventAt+180000).map(e=>e.id),['3']);
});
test('agrupa los incrementos del mismo jugador sin mezclar equipos o inventar estadísticas', () => {
  const grouped=core.groupEvents(events([play(10,'rebound'),play(11,'rebound'),play(12,'assist'),
    play(13,'shoot',{logParam4:'1',logParam6:'2'}),play(14,'rebound',{idPlayer:'24',text:'(TIZONA) OTRO: REBOTE'})]));
  assert.equal(grouped.length,2);
  assert.deepEqual(grouped[0].metrics.map(core.metricLabel),['+2 REBOTES','+1 ASISTENCIA','+2 PUNTOS','+1 CANASTA DE 2']);
  assert.equal(grouped[1].name,'OTRO');
});
