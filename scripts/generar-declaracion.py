"""Genera las páginas horizontal y vertical de una declaración en directo
con la configuración incrustada como copia de seguridad.
Uso: python3 scripts/generar-declaracion.py config-vox-burgos.json vox-burgos "Abascal en Burgos" [h|v|hv]
El cuarto argumento elige los formatos (por defecto, los dos).
"""
import hashlib, json, sys

cfg_path, base, titulo = sys.argv[1], sys.argv[2], sys.argv[3]
formatos = sys.argv[4] if len(sys.argv) > 4 else 'hv'
cfg = json.load(open(cfg_path, encoding='utf-8'))
datos = json.dumps(cfg, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')


def huella(ruta):
    # La URL de CSS y JS cambia con su contenido: ningún navegador usa una copia antigua.
    return hashlib.sha1(open(ruta, 'rb').read()).hexdigest()[:10]


VCSS = huella('assets/declaracion.css')
VJS = huella('assets/declaracion.js')

MIC = '<svg width="{s}" height="{s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2.5" width="6" height="11.5" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/></svg>'
PIN = '<svg width="{s}" height="{s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21.5s-7-6.3-7-11.7a7 7 0 0 1 14 0c0 5.4-7 11.7-7 11.7z"/><circle cx="12" cy="9.8" r="2.6"/></svg>'


def pagina(clase, nombre, s, r_seg):
    return f'''<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{titulo} · {nombre}</title>
<link rel="stylesheet" href="assets/directos-fonts.css?v=10">
<link rel="stylesheet" href="assets/declaracion.css?v={VCSS}">
</head>
<body class="{clase}" data-config="{cfg_path}">
<div id="lienzo" data-fase="cargando">
  <div class="demo-fondo"></div>
  <div class="espera" aria-hidden="true">
    <div class="e-mancha e-m1"></div><div class="e-mancha e-m2"></div>
    <div class="e-rejilla"></div>
    <svg class="e-ondas" preserveAspectRatio="none"></svg>
    <img class="e-skyline" src="assets/burgos-skyline.svg" alt="">
    <div class="e-reloj"><em>Burgos</em><b>--:--</b></div>
    <div class="e-contenido">
    <div class="e-logo">
      <span class="e-anillo"></span><span class="e-anillo"></span><span class="e-anillo"></span>
      <svg class="e-seg" viewBox="0 0 100 100"><circle class="e-seg-pista" cx="50" cy="50" r="{r_seg}" stroke-width="1.1"/><circle class="e-seg-prog" cx="50" cy="50" r="{r_seg}" stroke-width="1.1"/></svg>
      <img src="assets/radio-evolucion-hd.png" alt="Radio Evolución Burgos · 104.1 FM">
    </div>
    <div class="e-info">
      <div class="e-lbl"></div>
      <div class="e-cuenta">
        <div class="e-grupo"><div class="e-dig"><span>0</span><span>0</span></div><div class="e-u">Horas</div></div>
        <div class="e-dos">:</div>
        <div class="e-grupo"><div class="e-dig"><span>0</span><span>0</span></div><div class="e-u">Min</div></div>
        <div class="e-dos">:</div>
        <div class="e-grupo"><div class="e-dig"><span>0</span><span>0</span></div><div class="e-u">Seg</div></div>
      </div>
      <div class="e-filete"></div>
      <div class="e-evento sin-logo">
        <div class="e-inv"><img alt="Logotipo del partido"></div>
        <div class="e-evento-txt"><div class="e-ev-ante" data-fit></div><div class="e-ev-tit" data-fit></div><div class="e-ev-sub" data-fit></div></div>
      </div>
      <div class="e-datos"></div>
      <div class="e-rot"><div class="e-rot-in"></div></div>
    </div>
    </div>
  </div>
  <img class="mosca pieza" src="assets/radio-evolucion-hd.png" alt="Radio Evolución Burgos · 104.1 FM">
  <div class="estado pieza"><span class="punto"></span><span class="estado-txt">En breve</span><span class="estado-sep"></span><span class="reloj">--:--</span></div>
  <div class="faldon">
    <div class="cuenta pieza"><div class="cuenta-txt"><span class="cuenta-lbl">Comienza en</span><span class="cuenta-pie"></span></div><span class="cuenta-num">--:--</span></div>
    <div class="pestanas pieza"><span class="pes pes-osc">{MIC.format(s=s)}<span class="pes-etiqueta"></span></span><span class="pes pes-acento">{PIN.format(s=s)}<span class="pes-lugar"></span></span></div>
    <img class="skyline pieza" src="assets/burgos-skyline.svg" alt="">
    <div class="tarjeta pieza"><div class="slot"></div><div class="t-logo"><img alt="Logotipo del partido"></div></div>
  </div>
  <div class="ticker pieza"><div class="ticker-lbl"></div><div class="ticker-vent"><div class="ticker-cinta"></div></div></div>
  <div class="prueba">Vista previa · hora simulada <span class="prueba-hora"></span></div>
</div>
<script id="defecto" type="application/json">{datos}</script>
<script src="assets/declaracion.js?v={VJS}"></script>
</body>
</html>
'''


hechas = []
if 'h' in formatos:
    open(f'{base}.html', 'w', encoding='utf-8').write(pagina('h', 'Horizontal', 18, 49))
    hechas.append(f'{base}.html')
if 'v' in formatos:
    open(f'{base}-vertical.html', 'w', encoding='utf-8').write(pagina('v', 'Vertical', 20, 49))
    hechas.append(f'{base}-vertical.html')
print('generadas', *hechas)
