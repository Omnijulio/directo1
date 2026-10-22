/* Declaraciones en directo · Radio Evolución Burgos
   Fases automáticas por hora de Madrid:
     oculto  → nada visible (hasta `previa_minutos` antes de `inicio`)
     previa  → «En breve», cuenta atrás, faldón y rotativos
     directo → «En directo», rotativos y hora (hasta `hasta`)
   Parámetros de URL:
     ?escena=oculto|previa|directo  fuerza una fase (sin distintivo)
     ?ahora=11:50 o ?ahora=2026-10-22T11:50:00%2B02:00  hora simulada (con distintivo «Vista previa»)
     ?fijo=N  deja fijo el rótulo N (empieza en 0) de la fase actual
     ?demo=1  fondo de muestra · ?guias=1 zonas ocupadas por las apps (vertical) */
(() => {
  'use strict';
  const qs = new URLSearchParams(location.search);
  const body = document.body;
  const VERTICAL = body.classList.contains('v');
  const W = VERTICAL ? 1080 : 1920, H = VERTICAL ? 1920 : 1080;
  const lienzo = document.getElementById('lienzo');
  const $ = (s) => lienzo.querySelector(s);
  const RUTA_CONFIG = body.dataset.config;

  if (qs.get('demo') === '1') body.classList.add('demo');
  if (qs.get('guias') === '1') body.classList.add('guias');
  const escenaURL = qs.get('escena');
  const fijoURL = qs.has('fijo') ? parseInt(qs.get('fijo'), 10) : null;

  /* ---------- Escalado del lienzo a la ventana ---------- */
  function escalar() {
    const s = Math.min(innerWidth / W, innerHeight / H);
    lienzo.style.transform = `translate(${(innerWidth - W * s) / 2}px,${(innerHeight - H * s) / 2}px) scale(${s})`;
  }
  addEventListener('resize', escalar);
  escalar();

  /* ---------- Hora (real o simulada) ---------- */
  let desfase = 0, simulada = false;
  function prepararHoraSimulada(cfg) {
    let a = qs.get('ahora');
    if (!a) return;
    a = a.trim().replace(' ', '+');
    if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(a)) {
      const [h, m, s = '00'] = a.split(':');
      a = `${cfg.inicio.slice(0, 10)}T${h.padStart(2, '0')}:${m}:${s}${cfg.inicio.slice(19) || '+02:00'}`;
    }
    const t = Date.parse(a);
    if (isNaN(t)) return;
    desfase = t - Date.now();
    simulada = true;
    body.classList.add('simulada');
  }
  const ahora = () => Date.now() + desfase;
  const fmtHora = new Intl.DateTimeFormat('es-ES', { timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const fmtHoraSeg = new Intl.DateTimeFormat('es-ES', { timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });

  /* ---------- Texto ---------- */
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const neg = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  const ICONO_MIC = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2.5" width="6" height="11.5" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/></svg>';

  /* Reduce el cuerpo hasta que el texto quepa: a lo ancho y, si el estilo permite
     saltos de línea (--lineas en CSS), en ese número máximo de líneas. */
  function ajustarTexto(raiz) {
    raiz.querySelectorAll('[data-fit]').forEach((el) => {
      el.style.fontSize = '';
      const cs = getComputedStyle(el);
      let t = parseFloat(cs.fontSize);
      const lineas = parseInt(cs.getPropertyValue('--lineas'), 10) || 1;
      const alto = parseFloat(cs.lineHeight) / t || 1.2;
      const min = t * 0.62;
      const sobra = () => el.scrollWidth > el.clientWidth + 1 ||
        (lineas > 1 && el.offsetHeight > lineas * alto * t + 2);
      let n = 0;
      while (sobra() && t > min && n++ < 80) {
        t -= 1;
        el.style.fontSize = t + 'px';
      }
    });
  }

  function htmlRotulo(d) {
    const ante = `<div class="r-ante" data-fit>${neg(d.antetitulo)}</div>`;
    if (d.tipo === 'duo') {
      const ps = (d.personas || []).map((p) =>
        `<div class="persona"><div class="p-nom" data-fit>${neg(p.nombre)}</div><div class="p-car" data-fit>${neg(p.cargo)}</div></div>`).join('');
      return `${ante}<div class="duo">${ps}</div>`;
    }
    if (d.tipo === 'informan') {
      const nombres = (d.nombres || cfg.informan || []).map(neg).join('<i>·</i>');
      return `<div class="inf"><span class="mic">${ICONO_MIC}</span><div class="inf-txt">${ante}` +
        `<div class="nombres" data-fit>${nombres}</div><div class="r-sub" data-fit>${neg(d.subtitulo)}</div></div></div>`;
    }
    return `${ante}<div class="r-tit" data-fit>${neg(d.titulo)}</div><div class="r-sub" data-fit>${neg(d.subtitulo)}</div>`;
  }

  /* ---------- Configuración ---------- */
  let cfg = null, versionRemota = null;

  function faseActual() {
    const e = escenaURL || cfg.escena || 'auto';
    if (e !== 'auto') return ['oculto', 'previa', 'directo'].includes(e) ? e : 'oculto';
    const t = ahora();
    const ini = Date.parse(cfg.inicio);
    const pre = ini - (Number(cfg.previa_minutos) || 15) * 60000;
    const fin = cfg.hasta ? Date.parse(cfg.hasta) : Infinity;
    if (t < pre) return 'oculto';
    if (t < ini) return 'previa';
    if (t < fin) return 'directo';
    return 'oculto';
  }

  /* ---------- Rotativos del faldón ---------- */
  const rot = { fase: null, i: 0, t: null, firma: '' };
  const lista = (f) => (cfg[f] || []).filter(Boolean);
  const fijoDe = (f) => {
    const n = fijoURL !== null && !isNaN(fijoURL) ? fijoURL : cfg['fijo_' + f];
    return Number.isInteger(n) && lista(f)[n] ? n : null;
  };

  function mostrar(d, animar) {
    const slot = $('.slot');
    const pintar = () => {
      slot.innerHTML = htmlRotulo(d);
      slot.dataset.tipo = d.tipo || 'rotulo';
      ajustarTexto(slot);
      slot.classList.remove('sale', 'entra');
      if (animar) { void slot.offsetWidth; slot.classList.add('entra'); }
    };
    clearTimeout(mostrar.t);
    if (animar && slot.innerHTML) { slot.classList.add('sale'); mostrar.t = setTimeout(pintar, 320); } else pintar();
  }

  function programar() {
    clearTimeout(rot.t);
    const l = lista(rot.fase);
    if (l.length < 2 || fijoDe(rot.fase) !== null) return;
    const d = l[rot.i % l.length];
    rot.t = setTimeout(() => {
      rot.i = (rot.i + 1) % l.length;
      mostrar(l[rot.i], true);
      programar();
    }, Math.max(4, Number(d.dura) || 10) * 1000);
  }

  function firmaFase(f) { return JSON.stringify([lista(f), cfg.informan, fijoDe(f)]); }

  function iniciarRotacion(f, animar) {
    rot.fase = f;
    const l = lista(f);
    const fijo = fijoDe(f);
    rot.i = fijo !== null ? fijo : 0;
    rot.firma = firmaFase(f);
    if (l.length) mostrar(l[rot.i], animar);
    programar();
  }

  /* ---------- Faldón de claves ---------- */
  let firmaTicker = '';
  function pintarTicker(f, animar) {
    const t = cfg.ticker || {};
    const items = (f === 'previa' ? t.previa : t.directo) || t.items || [];
    const firma = JSON.stringify([f, items, t.titulo]);
    if (firma === firmaTicker) return;
    firmaTicker = firma;
    const vent = $('.ticker-vent');
    const aplicar = () => {
      $('.ticker-lbl').textContent = t.titulo || 'Claves';
      const uno = items.map((x) => `<span class="t-item">${neg(x)}</span><span class="sep-t"></span>`).join('');
      const cinta = $('.ticker-cinta');
      cinta.innerHTML = `<span class="t-tramo">${uno}</span><span class="t-tramo" aria-hidden="true">${uno}</span>`;
      const ancho = cinta.querySelector('.t-tramo').getBoundingClientRect().width / (lienzo.getBoundingClientRect().width / W || 1);
      cinta.style.animation = 'none';
      void cinta.offsetWidth;
      cinta.style.animation = '';
      cinta.style.animationDuration = Math.max(10, ancho / (VERTICAL ? 100 : 112)) + 's';
      vent.classList.remove('cambio');
    };
    if (animar) { vent.classList.add('cambio'); setTimeout(aplicar, 360); } else aplicar();
  }

  /* ---------- Fases ---------- */
  function textosFijos() {
    $('.pes-etiqueta').textContent = cfg.etiqueta || 'Declaración a los medios';
    $('.pes-lugar').textContent = cfg.lugar || '';
    $('.pes-acento').style.display = cfg.lugar ? '' : 'none';
    const ini = new Date(Date.parse(cfg.inicio));
    $('.cuenta-pie').textContent = 'Inicio ' + fmtHora.format(ini) + ' h';
    const f = lienzo.dataset.fase;
    const est = cfg.estado || {};
    $('.estado-txt').textContent = f === 'directo' ? (est.directo || 'En directo') : (est.previa || 'En breve');
  }

  function cambiarFase(f) {
    const antes = lienzo.dataset.fase;
    const visibleAntes = antes === 'previa' || antes === 'directo';
    lienzo.dataset.fase = f;
    if (f === 'previa' || f === 'directo') {
      textosFijos();
      pintarTicker(f, visibleAntes);
      iniciarRotacion(f, visibleAntes);
    } else {
      clearTimeout(rot.t);
      rot.fase = null;
    }
  }

  function tic() {
    if (!cfg) return;
    const f = faseActual();
    if (f !== lienzo.dataset.fase) cambiarFase(f);
    const t = ahora();
    $('.reloj').textContent = fmtHora.format(new Date(t));
    if (f === 'previa') {
      const r = Math.max(0, Math.ceil((Date.parse(cfg.inicio) - t) / 1000));
      const h = Math.floor(r / 3600), m = Math.floor((r % 3600) / 60), s = r % 60;
      const mm = String(m).padStart(2, '0'), ss = String(s).padStart(2, '0');
      $('.cuenta-num').textContent = h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
      lienzo.classList.toggle('ultimo-minuto', r <= 60);
    }
    if (simulada) $('.prueba-hora').textContent = fmtHoraSeg.format(new Date(t));
  }

  function aplicarConfig(nueva) {
    const primera = !cfg;
    cfg = nueva;
    if (primera) prepararHoraSimulada(cfg);
    const f = lienzo.dataset.fase;
    if (f === 'previa' || f === 'directo') {
      textosFijos();
      pintarTicker(f, true);
      if (firmaFase(f) !== rot.firma) {
        const l = lista(f);
        const fijo = fijoDe(f);
        rot.i = fijo !== null ? fijo : Math.min(rot.i, Math.max(0, l.length - 1));
        rot.firma = firmaFase(f);
        if (l.length) mostrar(l[rot.i], true);
        programar();
      }
    }
    tic();
  }

  async function leerConfig() {
    if (!RUTA_CONFIG) return;
    try {
      const r = await fetch(RUTA_CONFIG + '?t=' + Date.now(), { cache: 'no-store' });
      if (!r.ok) return;
      const j = await r.json();
      if (versionRemota !== null && j.version !== versionRemota) { location.reload(); return; }
      versionRemota = j.version;
      if (JSON.stringify(j) !== JSON.stringify(cfg)) aplicarConfig(j);
    } catch (e) { /* se mantiene la última configuración válida */ }
  }

  /* ---------- Arranque ---------- */
  const listo = document.fonts && document.fonts.ready
    ? Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2500))])
    : Promise.resolve();
  listo.then(() => {
    try { aplicarConfig(JSON.parse(document.getElementById('defecto').textContent)); } catch (e) { /* sin copia local */ }
    leerConfig();
    setInterval(tic, 250);
    setInterval(leerConfig, 10000);
  });
})();
