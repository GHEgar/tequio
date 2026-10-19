# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y versionado con
[SemVer](https://semver.org/lang/es/).

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
