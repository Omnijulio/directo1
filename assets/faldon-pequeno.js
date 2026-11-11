/* Faldón pequeño · Radio Evolución Burgos
   Lee la configuración (data-config) cada 10 s; si cambia «version», recarga.
   ?demo=1 fondo de muestra · ?directo=0 sin la pestaña «En directo» */
(() => {
  'use strict';
  const qs = new URLSearchParams(location.search);
  const body = document.body;
  const V = body.classList.contains('v');
  const W = V ? 1080 : 1920, H = V ? 1920 : 1080;
  const lienzo = document.getElementById('lienzo');
  const $ = (s) => lienzo.querySelector(s);
  if (qs.get('demo') === '1') body.classList.add('demo');

  function escalar() {
    const s = Math.min(innerWidth / W, innerHeight / H);
    lienzo.style.transform = `translate(${(innerWidth - W * s) / 2}px,${(innerHeight - H * s) / 2}px) scale(${s})`;
  }
  addEventListener('resize', escalar);
  escalar();

  const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmt = new Intl.DateTimeFormat('es-ES', { timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

  /* Reduce el título y la línea hasta que quepan (también si el móvil agranda la letra). */
  function encajar() {
    const ancho = (V ? 1016 : 1400) - (V ? 106 : 96);
    $('.bloque').style.maxWidth = ancho + 'px';
    ['.titulo', '.linea'].forEach((sel) => {
      const el = $(sel);
      el.style.fontSize = '';
      let t = parseFloat(getComputedStyle(el).fontSize);
      let n = 0;
      while (el.scrollWidth > el.clientWidth + 1 && n++ < 80) { t -= 1; el.style.fontSize = t + 'px'; }
    });
  }

  let cfg = null, version = null;
  function aplicar(c) {
    cfg = c;
    $('.titulo').textContent = c.titulo || '';
    $('.informa').innerHTML = c.informa ? `Informa <b>${esc(c.informa)}</b>` : '';
    $('.medio').textContent = c.medio || '';
    $('.linea i').style.display = c.informa && c.medio ? '' : 'none';
    const directo = qs.get('directo') === '0' ? false : c.directo !== false;
    lienzo.classList.toggle('sin-directo', !directo);
    lienzo.classList.toggle('oculto', c.visible === false);
    encajar();
  }
  function tic() { $('.hora').textContent = fmt.format(new Date()); }

  async function leer() {
    try {
      const r = await fetch(body.dataset.config + '?t=' + Date.now(), { cache: 'no-store' });
      if (!r.ok) return;
      const j = await r.json();
      if (version !== null && j.version !== version) { location.reload(); return; }
      version = j.version;
      if (JSON.stringify(j) !== JSON.stringify(cfg)) aplicar(j);
    } catch (e) { /* se mantiene lo último */ }
  }

  const listo = document.fonts && document.fonts.ready
    ? Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2500))]) : Promise.resolve();
  listo.then(() => {
    try { aplicar(JSON.parse(document.getElementById('defecto').textContent)); } catch (e) { /* sin copia */ }
    tic();
    leer();
    setInterval(tic, 1000);
    setInterval(leer, 10000);
  });
})();
