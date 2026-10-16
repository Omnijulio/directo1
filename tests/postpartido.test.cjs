const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../assets/postpartido-core.js');
const config = require('../config.json');

test('la emisión empieza esperando a los entrenadores, sin identificar a nadie como compareciente', () => {
  const model = core.resolve(config,'auto');
  assert.equal(model.mode,'espera');
  assert.equal(model.title,'Declaraciones de los entrenadores');
  assert.equal(model.subtitle,'En breve · Tras el partido');
  assert.equal(model.radio,true);
  assert.equal(core.event(config).rotulo_alterna,0);
});
test('el orden es visitante Javi Rodríguez y después local Denís Pombar, con sus escudos', () => {
  const visitor = core.resolve(config,'visitante'), home = core.resolve(config,'local');
  assert.equal(visitor.title,'Javi Rodríguez');
  assert.equal(visitor.subtitle,'Entrenador visitante · Alimerka Oviedo');
  assert.equal(visitor.image,config.equipos.oviedo.escudo);
  assert.equal(home.title,'Denís Pombar');
  assert.equal(home.subtitle,'Entrenador local · Grupo Ureta Tizona');
  assert.equal(home.image,config.equipos.tizona.escudo);
});
test('las páginas fijas no cambian de persona al actualizar el turno de la página principal', () => {
  const raw = structuredClone(config);
  for (const active of [0,1,2]) {
    core.event(raw).hablando = active;
    assert.equal(core.resolve(raw,'visitante').title,'Javi Rodríguez');
    assert.equal(core.resolve(raw,'local').title,'Denís Pombar');
  }
});
test('la página automática sigue los turnos y permite volver a la espera', () => {
  const raw = structuredClone(config);
  core.event(raw).hablando = 1;
  assert.equal(core.resolve(raw,'auto').mode,'visitante');
  core.event(raw).hablando = 2;
  assert.equal(core.resolve(raw,'auto').mode,'local');
  assert.equal(core.resolve(raw,'espera').mode,'espera');
  core.event(raw).hablando = 0;
  assert.equal(core.resolve(raw,'auto').mode,'espera');
});
test('el programa anterior sigue disponible y no se sustituye por el postpartido', () => {
  assert.equal(core.currentEvent(config,Date.parse('2026-10-16T10:30:00+02:00')).evento,'Rueda de prensa DOMUND 2026 · Archidiócesis de Burgos');
  assert.equal(core.currentEvent(config,Date.parse('2026-10-16T19:00:00+02:00')).id,'postpartido');
  assert.equal(core.resolve({programa:[]},'visitante'),null);
});
