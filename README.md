# Directos · Radio Evolución Burgos

Gráfico horizontal (1920×1080, fondo transparente) para el widget **Web** de PRISM.
URL fija: https://omnijulio.github.io/directo1/

## Cómo funciona
- `index.html` es la plantilla común de todos los directos. No se toca entre eventos.
- `config.json` lleva todo el contenido del evento. La página lo relee cada 5 s.
  - Si cambia un texto, se actualiza en emisión sin recargar.
  - Si cambia `version`, la página se recarga (cambios de diseño).

## Sistema visual (fijo)
Azul noche + marfil, títulos en serif (Playfair Display) y rótulos en sans (Inter),
silueta de Burgos (Arco de Santa María, Catedral, cimborrio, Condestable) sobre el rótulo,
y medallón con tracería de rosetón.

## Lo que cambia por evento (`config.json`)
| Campo | Para qué |
|---|---|
| `escena` | `auto` (espera hasta `inicio`, luego directo), `espera`, `directo`, `fin` |
| `inicio` | Hora de inicio, ej. `2026-10-16T10:30:00+02:00` |
| `tema.acento` | Color de acento del evento |
| `sello` | Medallón: `grande`, `pequeno`, `anillo`. Sin `grande`, se ve el medallón genérico «Burgos · 104.1 FM» |
| `etiqueta`, `antetitulo`, `titulo`, `subtitulo` | Rótulo general |
| `ponentes`, `hablando` | Lista de intervinientes. `hablando: n` pone el rótulo del ponente n (0 = rótulo general) |
| `ticker` | Franja inferior (`items`, `**negrita**` para resaltar) |
| `tarjetas` | Tarjetas laterales `cifra` (con mapa opcional), `intervienen` y `cita`; `ciclo`, `cada`, `dura`, `fija` |
| `espera`, `fin` | Textos de las pantallas de espera y cierre |
| `programa` | Varios eventos en el mismo `config.json`: se activa el último cuyo `desde` ya ha pasado |
| `equipos` | Biblioteca de equipos (nombre, siglas, color, `escudo`) reutilizable por clave |
| `partido` | Marcador con escudos arriba a la derecha y tarjeta «El partido». Sin `puntos_*` muestra «vs» |
| `ponentes[].equipo`, `equipo_rotulo` | Escudo dentro del rótulo inferior |
| `rotulo_alterna` | Alterna cada N segundos el rótulo del ponente con el rótulo general |

Previsualizar otro momento del programa: añadir `?ahora=2026-10-16T22:40:00%2B02:00&demo=1` a la URL.

## Plantillas guardadas
- `plantillas/rueda-entrenador-baloncesto.json`: declaraciones de entrenadores de baloncesto de Burgos (escudos, marcador final y rótulo con escudo).

`baloncesto.html` es el marcador de baloncesto (usa `config-baloncesto.json`).

## Marcador FEB para PRISM

URL del layout: https://omnijulio.github.io/directo1/baloncesto.html

- Widget Web en PRISM: lienzo **1920 × 1080**, fondo transparente.
- Marcador compacto: escudos, tanteo, reloj oficial y cinco luces de faltas por equipo. La ubicación queda discretamente abajo a la izquierda. Sin ventana de narración, faldones permanentes ni marca de gran tamaño.
- Datos oficiales de `KeyFacts` consultados cada **15 s**, sin simular la cuenta atrás del reloj.
- Las faltas se reconstruyen desde las jugadas del **cuarto actual**, excluyendo las técnicas del banquillo que no suman al equipo y las jugadas borradas. La cuarta luz es **naranja**; con cinco o más, **las cinco luces son rojas**. Se reinician con el siguiente cuarto; las prórrogas conservan las del cuarto periodo conforme a FIBA. Si falta el inicio del periodo y no se puede confirmar el recuento, las luces aparecen sin dato en vez de inventar cero.
- Comparativas de rebotes, asistencias, tiros, recuperaciones, pérdidas y tapones: una tarjeta durante **7 s cada 60 s**. Se omiten mientras no haya datos o la conexión esté desactualizada.
- Cada nueva estadística de jugador provoca un aviso breve con su nombre y el incremento: puntos, triples, canastas, tiros libres, tiros fallados, rebotes, asistencias, recuperaciones, pérdidas, tapones y faltas. Se agrupan las acciones del mismo jugador recibidas en una consulta. Los avisos tienen prioridad sobre las comparativas.
- El historial inicial no se anuncia. Se evitan duplicados entre consultas y recargas en la misma sesión; al reconectar se descartan jugadas de más de un minuto. Las correcciones del acta se reflejan en tanteo y faltas sin presentarse como una jugada nueva.
- Narradores: **Iraquí García** y **Pancho "Panchoneta"**. Un crédito de 6 s aparece una sola vez por sesión y partido, sin marco de cámara.
- La ficha previa oficial permite mostrar **0–0** antes del inicio, identificado expresamente como previa. Al llegar la hora del partido, ese dato estático deja de utilizarse. Un fallo de red nunca se convierte en cero: se conserva el último resultado recibido, con un aviso y su hora.
- `?estadisticas=0` oculta las comparativas; `?avisos=0`, los avisos de jugador; `?narradores=0`, el crédito inicial. El configurador está en `?config=1`. Los enlaces antiguos con `?solo=marcador` siguen mostrando esta composición mínima.
- `?demo=1` añade una pista de muestra sin inventar el resultado. Para comprobar diseños con datos ficticios, usar `?demo=1&prueba=faltas` (cuarta naranja/cinco rojas), `prueba=accion` o `prueba=comparativa`. También se admiten `previa`, `vivo`, `descanso`, `final` y `conexion`. Todas las simulaciones llevan una etiqueta visible de prueba.

La sección `feb` de `config-baloncesto.json` define el partido, los IDs de ambos equipos, inicio con zona horaria y apariencia. No modifica el programa de ruedas de prensa de `index.html`.

La FEB entrega en su HTML público un token de lectura de unas 24 h, necesario para su API. `scripts/actualizar-feb.py` lo extrae sin escribirlo en los logs, verifica los equipos y guarda la ficha previa en `datos/feb-bootstrap.json`. El workflow **Actualizar acceso público FEB** lo renueva cada cuatro horas y al cambiar el partido. El widget también consulta la copia actualizada en GitHub Raw cuando necesita renovar el acceso; no depende de una reconstrucción de Pages para recibir esa renovación. No se usan credenciales de la cuenta del usuario ni proxies de terceros.

Comprobaciones locales:
```
node --test tests/marcador-feb.test.cjs
python -m unittest discover -s tests -p 'test_*.py'
```
