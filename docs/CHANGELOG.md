# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y versionado con
[SemVer](https://semver.org/lang/es/).

## [0.6.0] - 2026-10-19

### Agregado

- Barra de tiempo en la tarjeta del recorrido: se llena en lo que tarda la siguiente.
- Botón «Reanudar recorrido» cuando alguien lo pausa con un clic, la rueda o el teclado; el
  recorrido también vuelve solo tras `idle` ms. `useTour` expone `paused`, `since`, `interval` y
  `resume`; etiquetas `resume` y `next` en inglés y español.
- `infoPlacement` acepta nodos a evitar y prueba varias posiciones por lado: la tarjeta tapa lo menos
  posible al nodo en foco y a sus vecinos. `<Tequio>` le pasa los vecinos del nodo abierto.

### Cambiado

- Pasar el ratón sobre el grafo ya no pausa el recorrido; lo pausan el clic, la rueda y el teclado.

## [0.5.0] - 2026-10-19

### Agregado

- `animated="always"` (prop de `<Tequio>` y atributo de `<tequio-graph>`): mantiene el movimiento y los
  pulsos aunque el sistema pida reducir movimiento. Pensado para una pantalla en la pared o cuando la
  persona lo elige; el valor por omisión sigue respetando `prefers-reduced-motion`.

### Corregido

- El recuadro de foco que el navegador pintaba al hacer clic con el ratón en un nodo: `<Tequio>` lo
  quita para su propio SVG y deja el foco de teclado (`:focus-visible`).

## [0.4.0] - 2026-10-19

### Agregado

- `<tequio-graph>`: elemento HTML que dibuja el grafo sin React en la página. Lee `src` cada `refresh`
  segundos con `token` como Bearer, valida con el contrato, conserva el último grafo y espera más entre
  reintentos si falla, y se pausa con la pestaña oculta. Atributos `theme`, `locale`, `tour`, `info`,
  `focus`, `legend`, `table`, `width` y `height`; propiedad `data`; eventos `tequio-load`, `tequio-error`
  y `tequio-node`. `defineTequio` en `@npmegar/tequio/element`.
- Bundle autónomo `@npmegar/tequio/standalone` (`dist/standalone/tequio-graph.js`, React incluido, 84 kB
  con gzip) para una página de pantalla con un solo `<script>`.
- Textos en español integrados: con `locale` `es` el lienzo, la tarjeta y la tabla hablan español
  (`SPANISH_LABELS`, `SPANISH_INFO_LABELS`, `labelsFor`).
- Página `tv.html` en el demo con el elemento.

## [0.3.0] - 2026-10-19

### Agregado

- Contrato de datos: `schema.json` (JSON Schema, también en `@npmegar/tequio/schema.json`) y
  `validate(data)`, que devuelve cada error con su ruta y avisa lo que se omitiría.
- `fromRows` convierte cualquier tabla de trabajo (una fila por tarea, caso o ticket) en el contrato con
  un mapeo de columnas o funciones; `parseCsv` lee CSV con comillas, BOM y separador `,` `;` o tabulador.
- `guessTone`: los estados derivados de los datos toman tono por palabras comunes en inglés y español
  (*done*, *pasa*, *failed*, *falla*, *blocked*, *no pude*, *pending*, *pendiente*…).
- CLI `tequio render` (JSON, filas o CSV a SVG, o a PNG con `@resvg/resvg-js`) y `tequio validate`.
- Foco: con una tarjeta abierta se atenúa todo menos el nodo, sus vecinos directos y sus enlaces
  (`focus` en `<Tequio>`, `toSvg` y `buildScene`; token `dimOpacity` en los temas). `focusOf` en el core.
- `useGraph` y `useScene`, las dos mitades de `useTequio`, para renders propios con foco.

### Cambiado

- Los enlaces salen del borde exterior de cada nodo (`linkEnds`), no del centro: atenuados ya no se ve
  que atraviesan los círculos.
- `toSvg` redondea a dos decimales: las opacidades como 0.14 o 0.45 ya no se redondeaban a 0.1 y 0.5.

- El nodo de proyecto ya no muestra el porcentaje de avance: solo el logo o la inicial, más grandes, y
  el anillo de estados. El avance queda en la tarjeta del infobox.
- `tour.interval` pasa de 6 s a 10 s por omisión.
- El demo actualiza los datos cada 15 s en lugar de cada 3 s, y el recorrido cambia de tarjeta al mismo
  ritmo.
- El demo ya no ofrece 150 personas en el selector: queda con 5 proyectos y 40 personas, y el tamaño de
  prueba de carga solo se pide por URL (`?projects=10&people=150`).

## [0.2.0] - 2026-10-19

### Agregado

- Infobox: un clic en un nodo abre una tarjeta junto a él. `infoPlan` decide todo (avance, gente,
  trabajo, conteos por estado y quienes más aportan en un proyecto; actividad, métrica y proyectos con
  su peso en una persona) y `<InfoBox>` solo la pinta con los tokens del tema, dentro del SVG.
- `description` y `details` (etiqueta, valor y `href` opcional) en proyectos y personas, solo para la
  tarjeta. Los `href` pasan únicamente con `http(s):`, `mailto:`, `tel:` o rutas relativas.
- `infoPlacement`: arriba, abajo, derecha o izquierda según quepa, acotada al lienzo, con flecha y
  anillo punteado sobre el nodo.
- Recorrido (`tour`): sin interacción durante `idle` ms abre la tarjeta de un nodo en cada
  actualización de datos o cada `interval` ms, empezando por los que acaban de cambiar. Cualquier
  entrada lo pausa.
- Props `info`, `tour`, `infoLabels` y `renderInfo`; `useTour` y `nextOf` para un render propio.

### Cambiado

- Con `info` (activo por omisión) los nodos son botones enfocables aunque no haya `onNode`, y el SVG
  pasa de `role="img"` a `role="group"`. `info={false}` vuelve al comportamiento anterior.
- El demo arranca con 5 proyectos y 40 personas, con el recorrido activo; 150 personas quedan como
  tamaño de prueba de carga.

## [0.1.0] - 2026-10-19

### Agregado

- Grafo de participación: proyectos como nodos centrales, personas alrededor y enlaces con grosor y
  largo según el peso del trabajo de cada persona en cada proyecto.
- Proyectos sin nombre visible: logo o inicial, porcentaje de avance dentro y anillo segmentado con los
  conteos por estado, en el orden de `statuses`. Personas de tamaño único con su métrica dentro, avatar
  o color de fondo y anillo exterior cuando están activas.
- Core sin framework: `buildGraph`, `remember` y `changes` (pulsos), simulación de fuerzas propia con el
  vocabulario de d3-force (`step`, `settle`, `cool`), `createStore` con asentado previo y memoria de
  posiciones, y `buildScene` como descripción única que dibujan el SVG y React.
- Temas `dark` (TV) y `light` (impresión) como tokens sobreescribibles, con paleta categórica validada y
  tonos de estado `good`, `warning`, `serious`, `critical` y `neutral`.
- `toSvg`: export determinista sin DOM, con `<title>` por nodo y leyenda de una línea. `toPng` en
  navegador, con logos y avatares convertidos a data URI.
- `@npmegar/tequio/react`: `<Tequio>` animado en `requestAnimationFrame` sobre refs, pausa con la
  pestaña oculta, `prefers-reduced-motion`, nodos enfocables con `onNode`, `useTequio` para un render
  propio y `<TequioTable>` como vista alternativa.
- Demo con 10 proyectos y 150 personas, datos vivos, modo TV y export a SVG y PNG: 60 fps en el build de
  producción a 1920 × 1080.

[0.6.0]: https://github.com/GHEgar/tequio/releases/tag/v0.6.0
[0.5.0]: https://github.com/GHEgar/tequio/releases/tag/v0.5.0
[0.4.0]: https://github.com/GHEgar/tequio/releases/tag/v0.4.0
[0.3.0]: https://github.com/GHEgar/tequio/releases/tag/v0.3.0
[0.2.0]: https://github.com/GHEgar/tequio/releases/tag/v0.2.0
[0.1.0]: https://github.com/GHEgar/tequio/releases/tag/v0.1.0
