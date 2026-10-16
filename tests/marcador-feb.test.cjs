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
