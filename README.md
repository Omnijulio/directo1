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
