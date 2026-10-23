/* Declaraciones en directo · Radio Evolución Burgos
   Fases automáticas por hora de Madrid:
     espera  → pantalla completa con cuenta atrás, logo grande y datos (hasta `previa_minutos` antes de `inicio`;
               con `espera.visible: false` no se ve nada)
     previa  → «En breve», cuenta atrás, faldón y rotativos
     directo → «En directo», rotativos y hora (hasta `hasta`)
   Parámetros de URL:
     ?escena=oculto|espera|previa|directo  fuerza una fase (sin distintivo)
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

  const ICONO_PIN = '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21.5s-7-6.3-7-11.7a7 7 0 0 1 14 0c0 5.4-7 11.7-7 11.7z"/><circle cx="12" cy="9.8" r="2.6"/></svg>';
  const ICONO_CAL = '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>';
  const ICONO_RELOJ = '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>';
  const ICONO_MIC = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2.5" width="6" height="11.5" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/></svg>';

  /* Algunos móviles (tamaño de letra del sistema, autoajuste de Android) agrandan el texto
     de las páginas. Se mide comparando el ancho real de un texto con el que da el lienzo de
     dibujo (que no se agranda) y se compensa con --k en todos los tamaños de letra. */
  let inflado = 1;
  function medirInflado() {
    lienzo.style.setProperty('--k', '1');
    const sonda = document.createElement('span');
    sonda.className = 'sonda';
    sonda.textContent = 'MMMMMMMMMM';
    lienzo.appendChild(sonda);
    const dom = sonda.offsetWidth;
    sonda.remove();
    const ctx = document.createElement('canvas').getContext('2d');
    ctx.font = '900 100px Inter, sans-serif';
    const ref = ctx.measureText('MMMMMMMMMM').width;
    const k = dom / ref;
    inflado = isFinite(k) && k > 1.03 && k < 3 ? k : 1;
    const letra = parseFloat(qs.get('letra'));
    const extra = letra >= 50 && letra <= 150 ? letra / 100 : 1;
    lienzo.style.setProperty('--k', String(extra / inflado));
    body.dataset.inflado = inflado.toFixed(3);
  }

  /* Reduce el cuerpo hasta que el texto quepa: a lo ancho y, si el estilo permite
     saltos de línea (--lineas en CSS), en ese número máximo de líneas.
     Se parte del tamaño CSS real (sin el agrandamiento del navegador) para no realimentarlo. */
  function tamBase(el) {
    el.style.fontSize = '';
    const c0 = parseFloat(getComputedStyle(el).fontSize);
    el.style.fontSize = c0 + 'px';
    const c1 = parseFloat(getComputedStyle(el).fontSize);
    const k = c0 > 0 && c1 > 0 ? c1 / c0 : 1;
    const t = c0 / (k > 1.01 ? k : 1);
    el.style.fontSize = t + 'px';
    return t;
  }
  function ajustarTexto(raiz) {
    raiz.querySelectorAll('[data-fit]').forEach((el) => {
      let t = tamBase(el);
      const cs = getComputedStyle(el);
      const lineas = parseInt(cs.getPropertyValue('--lineas'), 10) || 1;
      const min = t * 0.4;
      const sobra = () => {
        if (el.scrollWidth > el.clientWidth + 1) return true;
        if (lineas < 2) return false;
        const lh = parseFloat(getComputedStyle(el).lineHeight) || parseFloat(getComputedStyle(el).fontSize) * 1.1;
        return el.offsetHeight > lineas * lh + 2;
      };
      let n = 0;
      while (sobra() && t > min && n++ < 120) {
        t -= 1;
        el.style.fontSize = t + 'px';
      }
    });
  }
  /* En un rótulo doble, los dos nombres (y los dos cargos) llevan el mismo tamaño. */
  function igualar(raiz) {
    ['.p-nom', '.p-car'].forEach((sel) => {
      const els = [...raiz.querySelectorAll(sel)];
      if (els.length < 2) return;
      const min = Math.min(...els.map((e) => parseFloat(e.style.fontSize || getComputedStyle(e).fontSize)));
      els.forEach((e) => { e.style.fontSize = min + 'px'; });
    });
  }
  /* Si el bloque completo no cabe en su caja, reduce todos sus textos a la vez. */
  function ajustarAlto(contenido, caja, margen) {
    const disponible = () => caja.clientHeight - (margen || 0);
    let n = 0;
    while (contenido.offsetHeight > disponible() && n++ < 14) {
      contenido.querySelectorAll('[data-fit]').forEach((el) => {
        el.style.fontSize = (parseFloat(el.style.fontSize || getComputedStyle(el).fontSize) * 0.95) + 'px';
      });
    }
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
  const VISIBLE = (f) => f === 'previa' || f === 'directo';
  const momentoPrevia = () => Date.parse(cfg.inicio) - (Number(cfg.previa_minutos) || 15) * 60000;

  function faseActual() {
    const e = escenaURL || cfg.escena || 'auto';
    if (e !== 'auto') return ['oculto', 'espera', 'previa', 'directo'].includes(e) ? e : 'oculto';
    const t = ahora();
    const ini = Date.parse(cfg.inicio);
    const fin = cfg.hasta ? Date.parse(cfg.hasta) : Infinity;
    if (t < momentoPrevia()) return (cfg.espera && cfg.espera.visible !== false) ? 'espera' : 'oculto';
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
      const tarjeta = $('.tarjeta');
      tarjeta.classList.toggle('con-logo', !!d.logo && logoListo);
      ajustarTexto(slot);
      igualar(slot);
      ajustarAlto(slot, tarjeta, 12);
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
    const items = (f === 'directo' ? t.directo : (f === 'espera' ? (t.espera || t.previa) : t.previa)) || t.items || [];
    const firma = JSON.stringify([items, t.titulo]);
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

  /* ---------- Pantalla de espera ---------- */
  const esperaRot = { i: 0, t: null, firma: '' };
  let logoFallido = false;

  let logoListo = false;
  /* Vuelve a encajar los textos visibles (p. ej. cuando aparece el logo y queda menos ancho). */
  function reajustar() {
    const f = lienzo.dataset.fase;
    if (f === 'previa' || f === 'directo') {
      const slot = $('.slot');
      ajustarTexto(slot);
      igualar(slot);
      ajustarAlto(slot, $('.tarjeta'), 12);
    }
    if (f === 'espera') ajustarTexto($('.e-info'));
  }
  function rutaLogo() { return (cfg.espera && cfg.espera.logo_invitado) || cfg.logo_partido || ''; }
  function cargarLogoInvitado(reintento) {
    const base = rutaLogo();
    const imgs = [$('.e-inv img'), $('.t-logo img')].filter(Boolean);
    const aplicar = (ok) => {
      logoListo = ok;
      logoFallido = !ok && !!base;
      $('.e-evento').classList.toggle('sin-logo', !ok);
      const l = rot.fase ? lista(rot.fase)[rot.i] : null;
      $('.tarjeta').classList.toggle('con-logo', ok && !!(l && l.logo));
      reajustar();
    };
    imgs.forEach((im) => { im.onload = reajustar; });
    if (!base) { aplicar(false); return; }
    const destino = reintento ? base + (base.includes('?') ? '&' : '?') + 'r=' + Date.now() : base;
    if (!reintento && imgs[0].dataset.base === base) return;
    const prueba = new Image();
    prueba.onload = () => { imgs.forEach((im) => { im.src = destino; im.dataset.base = base; }); aplicar(true); };
    prueba.onerror = () => { imgs.forEach((im) => { im.dataset.base = base; }); aplicar(false); };
    prueba.src = destino;
  }

  function construirOndas() {
    const svg = $('.e-ondas');
    if (!svg || svg.dataset.listo) return;
    svg.dataset.listo = '1';
    const alto = parseFloat(getComputedStyle(svg).height) || 240;
    const defs = [['o1', 520, 0.30], ['o2', 760, 0.22], ['o3', 380, 0.14]];
    svg.setAttribute('viewBox', `0 0 ${W} ${alto}`);
    svg.innerHTML = defs.map(([c, lon, amp], k) => {
      const A = alto * amp, y0 = alto * (0.42 + k * 0.1);
      let d = `M ${-lon} ${y0}`;
      for (let x = -lon; x < W * 2 + lon; x += lon) {
        d += ` C ${x + lon * 0.25} ${y0 - A}, ${x + lon * 0.25} ${y0 - A}, ${x + lon * 0.5} ${y0}`;
        d += ` S ${x + lon * 0.75} ${y0 + A}, ${x + lon} ${y0}`;
      }
      const paso = -Math.ceil(W / lon) * lon;
      return `<path class="e-onda ${c}" style="--paso:${paso}px" d="${d}"/>`;
    }).join('');
  }

  function pintarEsperaRot(animar) {
    const e = cfg.espera || {};
    const l = (e.rotativo || []).filter(Boolean);
    const caja = $('.e-rot');
    caja.style.display = l.length ? '' : 'none';
    if (!l.length) return;
    const d = l[esperaRot.i % l.length];
    const cont = $('.e-rot-in');
    const pintar = () => {
      cont.innerHTML = `<div class="e-rot-ante">${neg(d.antetitulo)}</div>` +
        (d.lineas || []).map((x) => `<div class="e-rot-l" data-fit>${neg(x)}</div>`).join('');
      ajustarTexto(cont);
      ajustarAlto(cont, $('.e-rot'), 16);
      cont.classList.remove('sale', 'entra');
      if (animar) { void cont.offsetWidth; cont.classList.add('entra'); }
    };
    if (animar) { cont.classList.add('sale'); setTimeout(pintar, 320); } else pintar();
  }

  function programarEspera() {
    clearTimeout(esperaRot.t);
    const e = cfg.espera || {};
    const l = (e.rotativo || []).filter(Boolean);
    if (l.length < 2) return;
    esperaRot.t = setTimeout(() => {
      esperaRot.i = (esperaRot.i + 1) % l.length;
      pintarEsperaRot(true);
      programarEspera();
    }, Math.max(4, Number(e.cada) || 8) * 1000);
  }

  function textosEspera() {
    const e = cfg.espera || {};
    $('.e-lbl').textContent = e.etiqueta || 'Conectamos en directo en';
    $('.e-ev-ante').innerHTML = neg(e.antetitulo);
    $('.e-ev-tit').innerHTML = neg(e.titulo);
    $('.e-ev-sub').innerHTML = neg(e.subtitulo);
    const iconos = [ICONO_PIN, ICONO_CAL, ICONO_RELOJ];
    $('.e-datos').innerHTML = (e.datos || []).map((x, k) => `<span>${iconos[k % 3]}${neg(x)}</span>`).join('');
    ajustarTexto($('.e-info'));
    construirOndas();
    const firma = JSON.stringify([e.rotativo, e.cada]);
    if (firma !== esperaRot.firma) {
      esperaRot.firma = firma;
      esperaRot.i = 0;
      pintarEsperaRot(false);
      programarEspera();
    }
  }

  const digitos = [];
  function pintarCuentaEspera(t) {
    const e = cfg.espera || {};
    const objetivo = e.cuenta_hasta === 'inicio' ? Date.parse(cfg.inicio) : momentoPrevia();
    const r = Math.max(0, Math.ceil((objetivo - t) / 1000));
    const h = Math.min(99, Math.floor(r / 3600)), m = Math.floor((r % 3600) / 60), s = r % 60;
    const txt = [h, m, s].map((n) => String(n).padStart(2, '0')).join('');
    $('.e-cuenta').classList.toggle('final', r <= 10);
    if (!digitos.length) lienzo.querySelectorAll('.e-dig span').forEach((el) => digitos.push(el));
    digitos.forEach((el, k) => {
      if (el.textContent !== txt[k]) {
        el.textContent = txt[k];
        el.classList.remove('cambia'); void el.offsetWidth; el.classList.add('cambia');
      }
    });
    const prog = $('.e-seg-prog');
    const C = parseFloat(prog.dataset.c);
    const frac = s === 0 ? 0 : (60 - s) / 60;
    prog.classList.toggle('sin-trans', s === 59 || s === 0);
    prog.style.strokeDashoffset = String(C * (1 - frac));
    $('.e-reloj b').textContent = fmtHora.format(new Date(t));
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
    const conTicker = (x) => VISIBLE(x) || x === 'espera';
    lienzo.dataset.fase = f;
    if (conTicker(f)) pintarTicker(f, conTicker(antes));
    if (f === 'espera') {
      textosEspera();
    } else {
      clearTimeout(esperaRot.t);
      esperaRot.firma = '';
    }
    if (VISIBLE(f)) {
      textosFijos();
      iniciarRotacion(f, VISIBLE(antes));
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
    if (f === 'espera') pintarCuentaEspera(t);
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
    cargarLogoInvitado(false);
    const f = lienzo.dataset.fase;
    if (VISIBLE(f) || f === 'espera') pintarTicker(f, true);
    if (f === 'espera') textosEspera();
    if (VISIBLE(f)) {
      textosFijos();
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

  function repintar() {
    const f = lienzo.dataset.fase;
    if (VISIBLE(f) && rot.fase) { const l = lista(rot.fase); if (l[rot.i]) mostrar(l[rot.i], false); }
    if (f === 'espera') { ajustarTexto($('.e-info')); pintarEsperaRot(false); }
  }

  async function leerConfig() {
    if (!RUTA_CONFIG) return;
    if (qs.get('medir') !== '0') {
      const antes = inflado;
      medirInflado();
      if (Math.abs(inflado - antes) > 0.02) repintar();
    }
    if (cfg && logoFallido) cargarLogoInvitado(true);
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
  const prog = $('.e-seg-prog');
  if (prog) {
    const C = 2 * Math.PI * parseFloat(prog.getAttribute('r'));
    prog.dataset.c = String(C);
    prog.style.strokeDasharray = String(C);
    prog.style.strokeDashoffset = String(C);
  }
  const listo = document.fonts && document.fonts.ready
    ? Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2500))])
    : Promise.resolve();
  const sim = parseFloat(qs.get('inflar'));
  if (sim > 0.5 && sim < 3) { lienzo.style.setProperty('--sim', String(sim)); body.classList.add('simulada'); }
  listo.then(() => {
    if (qs.get('medir') !== '0') medirInflado();
    try { aplicarConfig(JSON.parse(document.getElementById('defecto').textContent)); } catch (e) { /* sin copia local */ }
    leerConfig();
    setInterval(tic, 250);
    setInterval(leerConfig, 10000);
  });
})();
