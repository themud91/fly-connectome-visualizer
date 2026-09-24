# Fly Connectome Visualizer — explicacion del codigo

Documento de referencia para entender que hace cada parte del proyecto y por que.

## Flujo general

```
Codex (FlyWire API)
  -> data/raw/*.csv.gz          (descargas crudas, ignoradas por git)
  -> scripts/preprocess.py      (filtra, cruza, genera JSON liviano)
  -> public/data/neurons.json   (dato final que consume el navegador)
  -> src/main.js                (carga el JSON, dibuja la escena 3D)
```

## `scripts/preprocess.py`

Toma los tres CSV descargados de Codex y produce un solo `neurons.json` chico.

1. **`classification.csv`**: tiene todas las neuronas del connectoma (139.256). Se filtra por
   `sub_class` (`t4_neuron`, `t5_neuron`) y `side` (`right`) para quedarnos con un subconjunto
   manejable para un visualizador web (6.100 neuronas).
2. **`coordinates.csv.gz`**: cada neurona tiene *varios* puntos de coordenadas (no una sola
   posicion). Se agrupan por `root_id` y se promedian (centroide) para tener una sola posicion
   x/y/z por neurona.
3. **`connections_princeton.csv.gz`**: archivo pesado (~270 MB descomprimido) con todas las
   sinapsis del connectoma completo. Se lee en bloques (`chunksize`) para no cargarlo entero en
   memoria, y se descartan todas las conexiones excepto las que van de una neurona del
   subconjunto a otra neurona del mismo subconjunto ("conexiones internas").
4. Se escribe `public/data/neurons.json` con la forma:
   ```json
   { "neuronas": [{ "id", "x", "y", "z", "tipo" }],
     "conexiones": [{ "origen", "destino", "peso" }] }
   ```

Para volver a generarlo (por ejemplo si se cambia el subconjunto): `python scripts/preprocess.py`
desde `fly-projet/`.

## `src/main.js`

### Escena base
`THREE.Scene` + `PerspectiveCamera` + `WebGLRenderer` + `OrbitControls` (rotar/zoom con el mouse).
Nada fuera de lo estandar de Three.js.

### Escalado de coordenadas
Las coordenadas del dataset vienen en nanometros crudos (rango ~150.000 unidades). Se calcula el
centroide de todas las neuronas y se resta (centrar en el origen), y se multiplica por `0.001`.
Sin esto la escena se ve negra: las posiciones exceden el plano `far` de la camara.

### Puntos por tipo (no un solo `THREE.Points`)
En vez de un unico objeto con todas las neuronas, se crea **un `THREE.Points` por tipo**
(`t4_neuron`, `t5_neuron`), cada uno con su propio color. Esto es lo que permite:
- Pintar cada tipo de un color distinto (cian/magenta).
- Togglear visibilidad por tipo con un checkbox (`mesh.visible = checkbox.checked`), sin tener
  que reconstruir geometria.

Un `BufferGeometry` aparte (`pointsGeometryCompleta`) junta *todas* las posiciones solo para
calcular la esfera envolvente y centrar la camara al iniciar; no se agrega a la escena.

### Filtros (checkboxes)
Se generan dinamicamente, uno por tipo detectado en el JSON (`[...new Set(...)]`), en un `<div>`
fijo arriba a la derecha. Cada checkbox controla la visibilidad de su `THREE.Points`
correspondiente.

### Clic en neurona (raycasting)
1. La posicion del mouse en pixeles se convierte a coordenadas normalizadas de dispositivo
   (`-1` a `1`).
2. `THREE.Raycaster` lanza un rayo desde la camara en esa direccion.
3. Como los puntos no tienen volumen real, se usa `raycaster.params.Points.threshold` para
   definir que tan cerca del rayo debe estar un punto para contar como "click".
4. Se prueba interseccion contra cada `THREE.Points` visible (los ocultos por el filtro se
   saltan). El primer hit da el indice del punto -> se busca la neurona original en el array y se
   muestra `id`/`tipo` en el overlay.

### Conexiones (lineas)
Un solo `THREE.LineSegments` con todos los pares origen/destino del JSON. No se filtran por tipo
(a diferencia de los puntos); se ven todas las conexiones internas del subconjunto todo el tiempo.

## Notas de despliegue

- `vite.config.mjs` define `base: "./"` (rutas relativas), necesario porque GitHub Pages sirve el
  sitio en un subpath (`usuario.github.io/fly-projet/`), no en la raiz del dominio.
- `public/data/neurons.json` se copia tal cual al `dist/` en el build (comportamiento estandar de
  Vite: todo lo que esta en `public/` se copia a la raiz del build).
- `data/raw/` (CSV crudos, ~cientos de MB) y `.env` (token de Codex) estan en `.gitignore`: nunca
  se suben a git.
