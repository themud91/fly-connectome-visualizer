# Fly Connectome Visualizer

Visualizador 3D interactivo de un subconjunto real del connectoma de *Drosophila melanogaster*
(mosca de la fruta), a partir de datos publicos del proyecto [FlyWire](https://flywire.ai/)
(Janelia / Google DeepMind / Cambridge). Sin entrenamiento de modelos: es visualizacion de datos
cientificos reales, no un proyecto de machine learning.

## Que muestra

6.100 neuronas del sistema visual (tipos **T4** y **T5**, lado derecho), detectoras de movimiento
en bordes claros (T4) y oscuros (T5), junto con 4.896 conexiones sinapticas internas al
subconjunto.

## Funcionalidad

- Escena 3D interactiva: rotar y hacer zoom con el mouse.
- Clic en una neurona para ver su `id` y tipo.
- Filtros por tipo (T4 / T5) con checkboxes, cada uno con su propio color.

## Stack

- [Three.js](https://threejs.org/) para el render 3D.
- [Vite](https://vitejs.dev/) como bundler/dev server.
- Python (pandas) para el preprocesamiento de datos (ver `scripts/preprocess.py`).

## Fuente de datos

[Codex](https://codex.flywire.ai/), el portal publico de FlyWire para explorar y exportar el
connectoma. Dataset FAFB (cerebro completo de *Drosophila*), snapshot 783.

## Correr localmente

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

Genera `dist/`, listo para desplegar como sitio estatico.

## Detalle tecnico

Ver [`CODIGO.md`](./CODIGO.md) para una explicacion completa del preprocesamiento de datos y del
codigo de la escena 3D.
