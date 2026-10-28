# Directos · Radio Evolución Burgos

Gráfico horizontal (1920×1080, fondo transparente) para el widget **Web** de PRISM.
URL fija: https://omnijulio.github.io/directo1/

## Layout de baloncesto con dos cámaras

Página independiente: https://omnijulio.github.io/directo1/baloncesto-2camaras.html. Enlace fijo del San Pablo–Rigas Zelli: https://omnijulio.github.io/directo1/baloncesto-2camaras.html?partido=20260065.

Canvas de **1920 × 1080**, dos ventanas realmente transparentes de **896 × 504 (16:9)**. El fondo azul oscuro se recorta mediante una máscara SVG; no se aplica croma ni se dibuja un relleno dentro de las ventanas. La fuente Web va **encima** de las dos cámaras en la escena de PRISM.

| Fuente | X | Y | Anchura | Altura |
|---|---:|---:|---:|---:|
| Cámara izquierda | 40 | 280 | 896 | 504 |
| Cámara derecha | 984 | 280 | 896 | 504 |
| Layout Web | 0 | 0 | 1920 | 1080 |

Las coordenadas corresponden al borde superior izquierdo de cada imagen. Ajustar una fuente 16:9 completa a esas medidas conserva su proporción. El borde del layout queda fuera del área de cámara. Marcador arriba; comentaristas, ubicación, avisos y ticker debajo de las ventanas. Se comparten todos los lectores, escudos y animaciones de `baloncesto.html`; el marcador de una sola cámara sigue disponible.

Añadir `&demo=1` al enlace fijo muestra dos paneles de encuadre con su número y tamaño, sin modificar los datos reales del partido. No usar `demo=1` en la fuente de emisión. El configurador `?config=1` y los parámetros de partido, estadísticas, avisos y narradores funcionan también en esta página.

## Emisión de baloncesto activa · 28/10/2026

El enlace general `baloncesto.html` y `marcador.html` selecciona **San Pablo Burgos–Rigas Zelli**, jornada 5 de BKT EuroCup, 28/10/2026 a las 20:30 (Madrid), Coliseum Burgos. Enlace fijo para PRISM: https://omnijulio.github.io/directo1/baloncesto.html?partido=20260065.

Identificación: Flashscore `6cIEmLOb`; EuroCup `U2026`, partido `65`, códigos de equipo `BGS` y `RIG`. Se consultan cada 10 segundos `https://live.euroleague.net/api/Header`, `Boxscore` y `PlayByPlay`, con parámetros `gamecode=65` y `seasoncode=U2026`. El reloj utiliza `RemainingPartialTime`; `GameTime` es otro dato y no se usa como cuenta atrás. La ficha v2 del calendario no se utiliza como tanteo en directo, porque puede seguir en 0–0 mientras el partido ya está en juego.

Se mantienen el tamaño del marcador, los escudos de 106 px, la ocultación de las siglas al cargar los PNG, las luces de faltas, las animaciones de avisos y los comentaristas **Iñaqui García** y **Diego Arce**. Los avisos usan incrementos observados en las estadísticas de cada jugador. Las luces de faltas se calculan con las jugadas del cuarto (`CM`, faltas técnicas de jugadores y `OF`), incluyendo las del cuarto periodo en las prórrogas; `FoultsA/B` de la cabecera son acumulados del partido y no se usan para el bonus. Los parciales se leen de `Boxscore.ByQuarter`; como respaldo se resta el tanteo acumulado del periodo anterior en `Header.ScoreQuarterN`. Un agregado de prórrogas no se muestra como parcial individual. Los tiempos muertos se reconocen por `TOUT` y `TOUT_TV`; `TO` significa pérdida de balón. Cada respuesta valida temporada, fecha y equipos. No se inventan puntos ni se reproduce el historial al reconectar.

## Partido ACB anterior · 17/10/2026

El marcador anterior corresponde a **San Pablo Burgos–Monbus Obradoiro**, ACB 105404, identificado en Flashscore como `42mhERFs`. Enlace fijo de este partido para PRISM: https://omnijulio.github.io/directo1/baloncesto.html?partido=105404.

La conexión utiliza directamente los endpoints públicos de ACB Live para cabecera, reloj, faltas del cuarto, estadísticas y jugadas, con consulta cada 10 segundos. No utiliza el token temporal FEB para este encuentro. La API ACB devuelve puntuaciones nulas en la previa; solo con estado previo y cuarto 0 se muestra el 0–0 inicial. Durante el juego, una puntuación ausente produce un aviso de conexión y nunca se convierte en cero. Los avisos de jugadores se calculan a partir de incrementos observados en sus estadísticas y no reproducen el historial al cargar o tras una desconexión prolongada.

La página principal del proyecto `/` sigue dedicada a las declaraciones. Para el partido se usa `baloncesto.html` o `marcador.html`. Los encuentros FEB anteriores siguen disponibles mediante `?partido=2535753` y `?partido=2538980`.

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

## Declaración de Santiago Abascal (Vox) · Plaza Mayor de Burgos · 22/10/2026

Dos layouts independientes, sin tocar la página principal (las páginas se regeneran con `python3 scripts/generar-declaracion.py config-vox-burgos.json vox-burgos "Abascal en Burgos"`):

| Formato | URL para PRISM (widget Web) |
|---|---|
| Horizontal 1920 × 1080 | https://omnijulio.github.io/directo1/vox-burgos.html |
| Vertical 1080 × 1920 | https://omnijulio.github.io/directo1/vox-burgos-vertical.html |

Funcionamiento automático (hora de Madrid, `config-vox-burgos.json`):
- **Hasta las 11:45**: pantalla de espera a pantalla completa (sección `espera`): logo de Radio Evolución grande con ondas de radio y anillo de segundos, cuenta atrás HH:MM:SS hasta las 11:45 (`cuenta_hasta: "inicio"` la lleva a las 12:00), Santiago Abascal con el logo del partido (`logo_invitado`, `assets/vox.png`; si no existe, la caja se oculta y se reintenta cada 10 s), lugar, fecha y hora, rotativo de acompañantes e informadores, y faldón de claves.
- **11:45–12:00**: «EN BREVE» + hora, faldón «Declaración a los medios · Plaza Mayor · Burgos», cuenta atrás y rotativos (Abascal → acompañantes → informan).
- **Desde las 12:00**: «EN DIRECTO» con punto rojo + hora y rotativos (Santiago Abascal · Presidente nacional de Vox → titular → acompañantes → informan).
- **A las 14:00** (`hasta`) vuelve a ocultarse.
- Faldón de claves «Elecciones 29N» con texto en movimiento en ambas fases.

Logo del partido: `logo_partido` (`assets/vox.png`, recibido de la emisora y con el fondo blanco eliminado). Aparece en la espera junto a Santiago Abascal y dentro del faldón en los rótulos con `"logo": true`.

Tamaño del texto: algunos móviles (como el que usa PRISM) agrandan el texto de las páginas. La plantilla mide ese agrandamiento al cargar y cada 10 s y lo compensa (`--k`), y además encaja cada texto en su caja reduciéndolo si hace falta. Si aun así algo se viera grande o pequeño, `?letra=90` (50–150) ajusta todo el texto en ese porcentaje.

En vertical, el faldón de claves va pegado al borde inferior (1850–1920 px) y el rótulo justo encima.

Controles por URL: `?escena=espera|previa|directo|oculto` fuerza la fase sin distintivo; `?fijo=0` deja fijo el rótulo indicado; `?ahora=11:50` simula la hora (con distintivo rojo «Vista previa»); `?demo=1` añade un fondo de muestra; `?guias=1` marca en vertical las zonas que tapan las apps.

Datos verificados el 22/10/2026: Santiago Abascal, presidente nacional de Vox; Iñaki (Ignacio) Sicilia Doménech, presidente de Vox en Burgos (convocatoria, El Español, El Debate); Eugenia Landaluce Miranda, cabeza de lista de Vox al Congreso por Burgos para el 29N (El Correo de Burgos, El Debate, Burgos Noticias, Noticias Burgos). Burgos elige 4 diputados; en 2023, 2 PP y 2 PSOE (Última Hora, Diario de Castilla y León). Agenda: Ponferrada (20/10), A Coruña (21/10), Burgos 12:00 y Segovia 19:00 (22/10) según EFE, El Español y El Bierzo Digital. Informan: Julio García, Hugo Cuñado y David Orcajo.

## XXIII Concurso Nacional de Corales Antonio José · Fórum Evolución · 24/10/2026

Solo horizontal (1920 × 1080): https://omnijulio.github.io/directo1/corales-antonio-jose.html · contenido en `config-corales-antonio-jose.json` · se regenera con `python3 scripts/generar-declaracion.py config-corales-antonio-jose.json corales-antonio-jose "Corales Antonio José" h`.

- **Hasta las 19:15**: pantalla de espera con cuenta atrás, logo grande, «XXIII Concurso Nacional de Corales · Antonio José» y rotativo (corales a concurso, coral invitada, informa).
- **19:15–19:30**: «EN BREVE», faldón «Concierto-concurso · Fórum Evolución · Burgos», cuenta atrás de 15 minutos y rotativos.
- **Tamaño**: `"escala": 0.7` en la configuración reduce todo el grafismo un 30 % (cada pieza desde su esquina; el contenido de la espera, desde el centro). `?escala=0.8` permite probar otro valor sin publicar.
- **Desde las 19:30**: «EN DIRECTO» y rotativos (concurso, corales a concurso ×2, obra obligatoria, coral invitada y dirección artística, informa Julio García). Se oculta a las 23:30.

Datos (nota de prensa del Ayuntamiento y El Correo de Burgos, 21/10/2026): Coro Joven de Santander (Santander, Cantabria), Ensamble Vocal Gijón (Gijón, Asturias), Oñatiko Ganbara Abesbatza (Oñate, Guipúzcoa) y Patnia Coral de Cámara (San Javier, Murcia); coral invitada Orfeón Burgalés Juvenil, directora Ana Ayala Francés; director artístico Juan Gabriel Martínez Martín; obra obligatoria «Aquel galán que allí viene» (Colección de cuatro canciones populares burgalesas). 90 aniversario del asesinato de Antonio José (Burgos, 1902 – Estépar, 1936).

## Corales Antonio José · 2 cámaras (24/10/2026)

https://omnijulio.github.io/directo1/corales-2camaras.html (`config-corales-2camaras.json`, `"camaras": 2`). Marco opaco con dos huecos 16:9 de 960 × 540: **cámara 1 en x 0, y 270** y **cámara 2 en x 960, y 270** (cada una ocupa media anchura del lienzo, centradas en vertical). Franja superior: logo, «XXIII Concurso Nacional de Corales · Antonio José · Fórum Evolución · Burgos · Sábado, 24 de octubre» y «EN DIRECTO» con la hora. Franja inferior: faldón con rotativos, cuenta atrás en la previa y claves. Misma espera y mismos horarios que la página de una cámara. `?camaras=2` activa el marco en cualquier página de declaración.

## Corales a concurso · animación vertical del cantor (24/10/2026)

`corales-cantor-vertical.html` (1080 × 1920, fondo transparente, 10 s en bucle): la mosca de Radio Evolución hace de cantor, abre el faldón-bocadillo y presenta las cuatro corales con su procedencia. URL para el widget Web de PRISM en vertical: https://omnijulio.github.io/directo1/corales-cantor-vertical.html · `?pausa=20` espera 20 s entre repeticiones · `?demo=1` fondo de muestra · `?render=1` (y `&gif=1`, sin sombras) para exportar fotograma a fotograma con `window.__ir(ms)`.

`?coral=1…5` muestra una sola coral (1 Coro Joven de Santander, 2 Ensamble Vocal Gijón, 3 Oñatiko Ganbara Abesbatza, 4 Patnia Coral de Cámara, 5 Orfeón Burgalés Juvenil, coral invitada, con su directora). Descargas para el móvil (WebM sin fondo y MP4 con fondo verde de cada una): https://omnijulio.github.io/directo1/descargas-corales.html

Exportado a 25 fps (250 fotogramas): PNG animado (APNG, transparencia completa), GIF (transparencia de 1 bit, sin sombras) y MOV ProRes 4444 con canal alfa para edición.

## Agradecimiento al Ayuntamiento de Madrid · Teatro Principal · 26/10/2026

Acto institucional en el Salón Rojo del Teatro Principal, lunes 26/10/2026 a las 13:00 (hora de invierno: las horas llevan `+01:00`).

| Formato | URL para PRISM (widget Web) | Configuración |
|---|---|---|
| Horizontal 1920 × 1080 (escala 0,7, como Corales) | https://omnijulio.github.io/directo1/agradecimiento-madrid.html | `config-agradecimiento-madrid.json` |
| Vertical 1080 × 1920 (escala 1, como Vox) | https://omnijulio.github.io/directo1/agradecimiento-madrid-vertical.html | `config-agradecimiento-madrid-vertical.json` |

Los dos JSON tienen el mismo contenido salvo `escala`: cualquier corrección de texto hay que hacerla en ambos. Se regeneran con `python3 scripts/generar-declaracion.py config-agradecimiento-madrid.json agradecimiento-madrid "Gracias, Madrid" h` y `python3 scripts/generar-declaracion.py config-agradecimiento-madrid-vertical.json agradecimiento-madrid "Gracias, Madrid" v`.

- **Hasta las 12:45**: espera con cuenta atrás, «Acto institucional de agradecimiento · Burgos da las gracias a Madrid» y rotativo (presiden el acto, la cesión, escúchalo en el 104.1 FM).
- **12:45–13:00**: «EN BREVE», cuenta atrás y rotativos (acto → Cristina Ayala y José Luis Martínez-Almeida → 40 autobuses cedidos por Madrid).
- **Desde las 13:00**: «EN DIRECTO» y rotativos (titular → Cristina Ayala → José Luis Martínez-Almeida → la cesión → presiden el acto). `?fijo=1` deja fijo a la alcaldesa y `?fijo=2` al alcalde de Madrid. Se oculta a las 15:00.
- Faldón de claves «Autobuses urbanos». No hay atención a medios (nota del Ayuntamiento).

Datos verificados el 26/10/2026: **Cristina Ayala Santamaría**, alcaldesa de Burgos (PP); **José Luis Martínez-Almeida Navasqüés**, alcalde de Madrid (con guion, como lo escribe el Ayuntamiento de Madrid; la nota de prensa lo pone sin guion). Incendio de las cocheras municipales de la carretera de Poza en la madrugada del martes 21/04/2026 (aviso a las 2:12): 39 autobuses calcinados, la mitad de la flota (El Correo de Burgos, BurgosNoticias, Infobae). Madrid cedió gratis 40 autobuses de GNC de la EMT por seis meses (madrid.es, Diario de Castilla y León, 24/04/2026); la Junta de Gobierno de Burgos aprobó el 22/10/2026 una prórroga de nueve meses con opción de compra a 15.150 € sin IVA por autobús (El Correo de Burgos, BurgosNoticias, BURGOSconecta).

## Plantillas guardadas
- `plantillas/rueda-entrenador-baloncesto.json`: declaraciones de entrenadores de baloncesto de Burgos (escudos, marcador final y rótulo con escudo).

`baloncesto.html` es el marcador de baloncesto (usa `config-baloncesto.json`).

## Marcador FEB para PRISM

URL del layout: https://omnijulio.github.io/directo1/baloncesto.html

También disponible en https://omnijulio.github.io/directo1/marcador.html. Ambas páginas usan el mismo controlador real FEB; el antiguo simulador aleatorio de `marcador.html` se ha sustituido.

La composición comparte la identidad ya presente en las plantillas del repositorio: azul noche `#0F1726`, marfil `#F5EFE4`, acento naranja `#F07A2A`, tipografía moderna Inter en marcador, estadísticas y nombres, logo de Radio Evolución y silueta vectorial de Burgos. Las fuentes están incluidas en `assets/directos-fonts.css`, sin depender de Google Fonts. Los dos comentaristas comparten un único faldón permanente ajustado al ancho de los nombres y el logo, sin espacio sobrante. Conserva los nombres a 36 px y usa un logo de 60 px, con una altura de faldón de 84 px; la ubicación aparece sobre él, sin otra caja. Una mosca circular de 88 px con el logo de Radio Evolución ocupa la esquina superior izquierda. No hay marco de cámara de narración.

### Prueba con el partido solicitado

Abrir https://omnijulio.github.io/directo1/marcador.html?partido=2538980 para consultar **UCAM Murcia CAR–Obradoiro** mediante su API oficial FEB. La ficha de origen es https://www.feb.es/competiciones/partido/2538980, Liga U · Grupo B · 16/10/2026, 17:00 (Madrid). El grafismo no muestra etiquetas de prueba ni menciones a la fuente de datos; empieza con el 0–0 previo que publique la federación y continúa automáticamente cuando la FEB pase a estado de juego. No contiene una simulación. El encuentro **Tizona–Oviedo (2535753)** se conserva mediante `?partido=2535753`; `?partido=2538980` permite abrir la prueba por separado. El enlace general utiliza el partido seleccionado en `activo`.

Añadir `&demo=1` permite comprobar el encuadre sobre una pista de muestra. El enlace sin `demo` mantiene todo el fondo transparente. El configurador `?config=1` permite elegir entre la emisión y el partido de prueba.

- Widget Web en PRISM: lienzo **1920 × 1080**, fondo transparente.
- Marcador **grande y centrado en la parte superior**: escudos de 96 px, tanteo de 90 px, reloj oficial y cinco luces de faltas por equipo, separadas 26 px de la fila de escudos y puntuaciones. El logo de la radio aparece en la mosca superior izquierda y en el único faldón de comentaristas, cuyo tamaño se adapta al contenido; la ubicación aparece encima de él.
- Datos oficiales de `KeyFacts` consultados cada **10 s**, sin simular la cuenta atrás del reloj.
- Seis luces verdes en movimiento acompañan el estado **EN JUEGO**. Se detienen en naranja con **TIEMPO MUERTO**, **FIN DEL CUARTO n** o **DESCANSO**. El estado se obtiene de la cabecera y las jugadas FEB: un tiempo muerto permanece mientras el reloj siga en la misma marca y no haya una jugada posterior que reanude el juego; las sustituciones durante la pausa no lo cancelan. El fin de un cuarto también se reconoce por su registro o el reloj oficial a cero; el final del partido requiere confirmación FEB. Al perder la conexión las luces se detienen con **RECONECTANDO**. No se confunden estas luces con las cinco de faltas de cada equipo.
- Las faltas se reconstruyen desde las jugadas del **cuarto actual**, excluyendo las técnicas del banquillo que no suman al equipo y las jugadas borradas. La cuarta luz es **naranja**; con cinco o más, **las cinco luces son rojas**. Se reinician con el siguiente cuarto; las prórrogas conservan las del cuarto periodo conforme a FIBA. Si falta el inicio del periodo y no se puede confirmar el recuento, las luces aparecen sin dato en vez de inventar cero.
- Comparativas de rebotes, asistencias, tiros, recuperaciones, pérdidas y tapones: una tarjeta con los escudos de ambos equipos durante **7 s cada 60 s**. Se omiten mientras no haya datos o la conexión esté desactualizada.
- Cada nueva estadística de jugador provoca un aviso breve con el escudo de su equipo, su nombre y el incremento: puntos, triples, canastas, tiros libres, tiros fallados, rebotes, asistencias, recuperaciones, pérdidas, tapones y faltas. Se agrupan las acciones del mismo jugador recibidas en una consulta. Los avisos tienen prioridad sobre las comparativas. Las tarjetas entran con un fundido y desplazamiento de 420 ms, permanecen para su lectura y salen con otro fundido de 300 ms antes de mostrar la siguiente; los escudos giran en ambas transiciones. La opción de movimiento reducido mantiene los fundidos sin giro. El faldón y las tarjetas no llevan una línea lateral de color.
- El historial inicial no se anuncia. Se evitan duplicados entre consultas y recargas en la misma sesión; al reconectar se descartan jugadas de más de un minuto. Las correcciones del acta se reflejan en tanteo y faltas sin presentarse como una jugada nueva.
- Narradores: **Iñaqui García** y **Pancho**. Nombres grandes, visibles durante toda la retransmisión en un solo faldón de marfil junto al logo de Radio Evolución. La ubicación se coloca encima; los avisos de jugadas y las comparativas aparecen en el lateral derecho sin ocultar los nombres.
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

## Comparecencias postpartido · Tizona–Oviedo

La página principal https://omnijulio.github.io/directo1/ queda en espera con el rótulo «Declaraciones de los entrenadores · En breve · Tras el partido». El programa anterior del DOMUND sigue disponible para su horario y previsualización. La vista de baloncesto `baloncesto.html` mantiene el marcador de la retransmisión.

Tres fuentes Web independientes para escenas de PRISM, todas a **1920 × 1080 y con fondo transparente**:

| Escena | URL | Rótulo |
|---|---|---|
| Espera / control desde el chat | https://omnijulio.github.io/directo1/postpartido.html | Sigue el turno de la página principal; inicialmente, «Declaraciones de los entrenadores» |
| 1. Visitante | https://omnijulio.github.io/directo1/entrenador-visitante.html | Javi Rodríguez · Entrenador visitante · Alimerka Oviedo |
| 2. Local | https://omnijulio.github.io/directo1/entrenador-local.html | Denís Pombar · Entrenador local · Grupo Ureta Tizona |

En PRISM, duplicar la escena que contiene la señal de vídeo y sustituir la fuente Web por la URL correspondiente. Colocar el grafismo por encima del vídeo. Las páginas de visitante y local mantienen fijo al entrenador elegido; cambiar de escena realiza el cambio sin esperar una publicación de la web. No contienen vídeo ni audio: se superponen a la cámara o a la entrada RTMP de la escena.

El bloque `programa` con `id: "postpartido"` en `config.json` conserva el orden de `ponentes`: **1 visitante, 2 local**. `hablando: 0` muestra la espera; `1`, Javi Rodríguez; `2`, Denís Pombar. La página principal y `postpartido.html` siguen ese valor. Para cambiar solo el turno, mantener `version` y editar `hablando`; el controlador consulta la configuración cada cinco segundos, primero en GitHub Raw y después en la copia publicada si hace falta. Las escenas fijas leen las correcciones de nombres y escudos, sin cambiar de entrenador. No hay alternancia automática.

`?turno=espera` fuerza el rótulo de espera y `?demo=1` añade un fondo de muestra para revisar el encuadre. Las páginas de emisión conservan el fondo transparente.

Nombres verificados en las fuentes de ambos clubes el 16/10/2026:
- Alimerka Oviedo: https://oviedobaloncesto.com/un-grupo-de-trabajo-consolidado-para-javi-rodriguez/
- Tizona: https://www.cbtizona.es/actualidad/denis-pombar-continuara-al-frente-del-club-baloncesto-tizona/

Pruebas de selección de turnos: `node --test tests/postpartido.test.cjs`.

