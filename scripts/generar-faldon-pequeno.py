"""Genera el faldón pequeño en horizontal y vertical con la configuración incrustada.
Uso: python3 scripts/generar-faldon-pequeno.py config-huelga-11n.json huelga-11n "Huelga 11N"
"""
import hashlib, json, sys

cfg_path, base, titulo = sys.argv[1], sys.argv[2], sys.argv[3]
cfg = json.load(open(cfg_path, encoding='utf-8'))
datos = json.dumps(cfg, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
h = lambda r: hashlib.sha1(open(r, 'rb').read()).hexdigest()[:10]
VC, VJ = h('assets/faldon-pequeno.css'), h('assets/faldon-pequeno.js')
MIC = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2.5" width="6" height="11.5" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/></svg>'


def pagina(clase, nombre):
    return f'''<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{titulo} · {nombre}</title>
<link rel="stylesheet" href="assets/directos-fonts.css?v=10">
<link rel="stylesheet" href="assets/faldon-pequeno.css?v={VC}">
</head>
<body class="{clase}" data-config="{cfg_path}">
<div id="lienzo">
  <div class="faldon">
    <img class="logo" src="assets/radio-evolucion-hd.png" alt="Radio Evolución Burgos · 104.1 FM">
    <div class="bloque">
      <div class="pestana"><span class="punto"></span>En directo<span class="sep"></span><span class="hora">--:--</span></div>
      <div class="tarjeta">
        <div class="titulo"></div>
        <div class="linea">{MIC}<span class="informa"></span><i>·</i><span class="medio"></span></div>
      </div>
    </div>
  </div>
</div>
<script id="defecto" type="application/json">{datos}</script>
<script src="assets/faldon-pequeno.js?v={VJ}"></script>
</body>
</html>
'''


open(f'{base}.html', 'w', encoding='utf-8').write(pagina('h', 'Horizontal'))
open(f'{base}-vertical.html', 'w', encoding='utf-8').write(pagina('v', 'Vertical'))
print('generadas', f'{base}.html', f'{base}-vertical.html')
