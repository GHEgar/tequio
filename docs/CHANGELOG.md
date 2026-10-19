# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y versionado con
[SemVer](https://semver.org/lang/es/).

## [No publicado]

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

[0.1.0]: https://github.com/GHEgar/tequio/releases/tag/v0.1.0
