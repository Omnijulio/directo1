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

También disponible en https://omnijulio.github.io/directo1/marcador.html. Ambas páginas usan el mismo controlador real FEB; el antiguo simulador aleatorio de `marcador.html` se ha sustituido.

La composición comparte la identidad ya presente en las plantillas del repositorio: azul noche `#0F1726`, marfil `#F5EFE4`, acento naranja `#F07A2A`, tipografía moderna Inter en marcador, estadísticas y nombres, logo de Radio Evolución y silueta vectorial de Burgos. Las fuentes están incluidas en `assets/directos-fonts.css`, sin depender de Google Fonts. Los dos comentaristas comparten un único faldón permanente ajustado al ancho de los nombres y el logo, sin espacio sobrante. Conserva los nombres a 36 px y usa un logo de 60 px, con una altura de faldón de 84 px; la ubicación aparece sobre él, sin otra caja. Una mosca circular de 88 px con el logo de Radio Evolución ocupa la esquina superior izquierda. No hay marco de cámara de narración.

### Prueba con el partido solicitado

Abrir https://omnijulio.github.io/directo1/marcador.html?partido=2538980 para consultar **UCAM Murcia CAR–Obradoiro** mediante su API oficial FEB. La ficha de origen es https://www.feb.es/competiciones/partido/2538980, Liga U · Grupo B · 16/10/2026, 17:00 (Madrid). El grafismo no muestra etiquetas de prueba ni menciones a la fuente de datos; empieza con el 0–0 previo que publique la federación y continúa automáticamente cuando la FEB pase a estado de juego. No contiene una simulación. El enlace general también utiliza esta prueba hasta las **20:35 del 16/10/2026 (Madrid)**; entonces vuelve automáticamente al Tizona. `?partido=2535753` fuerza Tizona–Oviedo y `?partido=2538980` fija la prueba en cualquier momento.

Añadir `&demo=1` permite comprobar el encuadre sobre una pista de muestra. El enlace sin `demo` mantiene todo el fondo transparente. El configurador `?config=1` permite elegir entre la emisión y el partido de prueba.

- Widget Web en PRISM: lienzo **1920 × 1080**, fondo transparente.
- Marcador **grande y centrado en la parte superior**: escudos de 96 px, tanteo de 90 px, reloj oficial y cinco luces de faltas por equipo, separadas 26 px de la fila de escudos y puntuaciones. El logo de la radio aparece en la mosca superior izquierda y en el único faldón de comentaristas, cuyo tamaño se adapta al contenido; la ubicación aparece encima de él.
- Datos oficiales de `KeyFacts` consultados cada **10 s**, sin simular la cuenta atrás del reloj.
- Seis luces verdes en movimiento acompañan el estado **EN JUEGO**. Se detienen en naranja con **TIEMPO MUERTO**, **FIN DEL CUARTO n** o **DESCANSO**. El estado se obtiene de la cabecera y las jugadas FEB: un tiempo muerto permanece mientras el reloj siga en la misma marca y no haya una jugada posterior que reanude el juego; las sustituciones durante la pausa no lo cancelan. El fin de un cuarto también se reconoce por su registro o el reloj oficial a cero; el final del partido requiere confirmación FEB. Al perder la conexión las luces se detienen con **RECONECTANDO**. No se confunden estas luces con las cinco de faltas de cada equipo.
- Las faltas se reconstruyen desde las jugadas del **cuarto actual**, excluyendo las técnicas del banquillo que no suman al equipo y las jugadas borradas. La cuarta luz es **naranja**; con cinco o más, **las cinco luces son rojas**. Se reinician con el siguiente cuarto; las prórrogas conservan las del cuarto periodo conforme a FIBA. Si falta el inicio del periodo y no se puede confirmar el recuento, las luces aparecen sin dato en vez de inventar cero.
- Comparativas de rebotes, asistencias, tiros, recuperaciones, pérdidas y tapones: una tarjeta con los escudos de ambos equipos durante **7 s cada 60 s**. Se omiten mientras no haya datos o la conexión esté desactualizada.
- Cada nueva estadística de jugador provoca un aviso breve con el escudo de su equipo, su nombre y el incremento: puntos, triples, canastas, tiros libres, tiros fallados, rebotes, asistencias, recuperaciones, pérdidas, tapones y faltas. Se agrupan las acciones del mismo jugador recibidas en una consulta. Los avisos tienen prioridad sobre las comparativas. Las tarjetas entran con un fundido y desplazamiento de 420 ms, permanecen para su lectura y salen con otro fundido de 300 ms antes de mostrar la siguiente; los escudos giran en ambas transiciones. La opción de movimiento reducido mantiene los fundidos sin giro. El faldón y las tarjetas no llevan una línea lateral de color.
- El historial inicial no se anuncia. Se evitan duplicados entre consultas y recargas en la misma sesión; al reconectar se descartan jugadas de más de un minuto. Las correcciones del acta se reflejan en tanteo y faltas sin presentarse como una jugada nueva.
- Narradores: **Iñaqui García** y **Pancho "Panchoneta"**. Nombres grandes, visibles durante toda la retransmisión en un solo faldón de marfil junto al logo de Radio Evolución. La ubicación se coloca encima; los avisos de jugadas y las comparativas aparecen en el lateral derecho sin ocultar los nombres.
- La ficha oficial permite mostrar **0–0** antes del inicio. El grafismo no muestra «Previa», etiquetas de prueba real ni menciones visibles a la federación; la conexión con sus datos sigue activa. La banda solo muestra la hora de actualización, sin atribución en pantalla. Al llegar la hora del partido, ese dato estático deja de utilizarse. Un fallo de red nunca se convierte en cero: se conserva el último resultado recibido, con un aviso y su hora.
- **Banda corrida en el borde inferior** con rebotes, asistencias, tiros, pérdidas, recuperaciones, tapones, líderes y parciales publicados por la FEB. Los números se actualizan durante el movimiento; no se generan estadísticas aleatorias. La banda incorpora los escudos de los dos equipos y muestra la hora de recepción del último dato.
- `?estadisticas=0` oculta la banda y las comparativas; `?avisos=0`, los avisos de jugador; `?narradores=0`, el faldón de comentaristas. El configurador está en `?config=1`. Los enlaces antiguos con `?solo=marcador` siguen mostrando esta composición mínima.
- `?demo=1` añade una pista de muestra sin inventar el resultado. Para comprobar diseños con datos ficticios, usar `?demo=1&prueba=faltas` (cuarta naranja/cinco rojas), `prueba=accion` o `prueba=comparativa`. También se admiten `previa`, `vivo`, `tiempo-muerto`, `fin-cuarto`, `descanso`, `final` y `conexion`. `prueba=animacion` recorre avisos de ambos equipos y una comparativa para revisar su entrada y salida. Todas las simulaciones llevan una etiqueta visible de prueba.

La sección `feb` de `config-baloncesto.json` define el partido, los IDs de ambos equipos, inicio con zona horaria y apariencia. No modifica el programa de ruedas de prensa de `index.html`.

La FEB entrega en su HTML público un token de lectura de unas 24 h, necesario para su API. `scripts/actualizar-feb.py` lo extrae sin escribirlo en los logs, verifica los equipos y guarda las fichas previas en `datos/feb-bootstrap.json` (emisión) y `datos/feb-2538980.json` (prueba). El workflow **Actualizar acceso público FEB** los renueva cada cuatro horas y al cambiar la configuración. Un fallo en la ficha de prueba no impide renovar la emisión. El widget también consulta la copia actualizada en GitHub Raw cuando necesita renovar el acceso; no depende de una reconstrucción de Pages para recibir esa renovación. No se usan credenciales de la cuenta del usuario ni proxies de terceros.

Comprobaciones locales:
```
node --test tests/marcador-feb.test.cjs
python -m unittest discover -s tests -p 'test_*.py'
```
