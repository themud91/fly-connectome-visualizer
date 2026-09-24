// Visualizador 3D de neuronas y conexiones con three.js
// Goal: exploration de three.js + proyecto FlyWire
// 2026 @ guillermo perez

// Three.js docs: https://threejs.org/docs/
import * as THREE from "three";

// OrbitControls docs: https://threejs.org/docs/#examples/en/controls/OrbitControls
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

// Camera
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  10000
);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// resize si la ventan cambia de tamano (responsivenness)
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// infoBox al hacer clic en una neurona
const infoBox = document.createElement("div");

//styles del infobox
infoBox.style.cssText =
  "position:fixed;top:12px;left:12px;padding:8px 12px;background:rgba(0,0,0,0.75);" +
  "color:#0ff;font-family:monospace;font-size:13px;border-radius:4px;display:none;pointer-events:none;";
document.body.appendChild(infoBox);

// le reaycast
const raycaster = new THREE.Raycaster();
raycaster.params.Points.threshold = 2;
const pointer = new THREE.Vector2();

// Colores y checkboxes de filtro por tipo de neurona
const coloresPorTipo = {
  t4_neuron: 0xffa500, //orange
  t5_neuron: 0xff00ff, // morado?
};

const filterBox = document.createElement("div");
filterBox.style.cssText =
  "position:fixed;top:12px;right:12px;padding:8px 12px;background:rgba(0,0,0,0.75);" +
  "color:#fff;font-family:monospace;font-size:13px;border-radius:4px;";
document.body.appendChild(filterBox);

// funcion principal: Cargar el dataset + dibuja neuronas/conexiones + los filtros
async function init() {
  const res = await fetch("/data/neurons.json");
  const data = await res.json();

  const neuronById = new Map();
  data.neuronas.forEach((n) => neuronById.set(n.id, n));

  // Las coordenadas del dataset vienen en nanometros crudos (rango ~150000
  // unidades). Se centran en el origen y se escalan para que la escena
  // quede dentro de un rango manejable por camara/near/far.
  const SCALE = 0.001;
  let cx = 0, cy = 0, cz = 0;
  data.neuronas.forEach((n) => {
    cx += n.x;
    cy += n.y;
    cz += n.z;
  });
  cx /= data.neuronas.length;
  cy /= data.neuronas.length;
  cz /= data.neuronas.length;

  const scaledPos = new Map();
  data.neuronas.forEach((n) => {
    scaledPos.set(n.id, {
      x: (n.x - cx) * SCALE,
      y: (n.y - cy) * SCALE,
      z: (n.z - cz) * SCALE,
    });
  });

  // Neuronas como puntos, un THREE.Points por tipo (para poder togglear visibilidad)
  const tipos = [...new Set(data.neuronas.map((n) => n.tipo))];
  const pointsPorTipo = {};
  const pointsGeometryCompleta = new THREE.BufferGeometry();

  tipos.forEach((tipo) => {
    const neuronasTipo = data.neuronas.filter((n) => n.tipo === tipo);
    const positions = new Float32Array(neuronasTipo.length * 3);
    neuronasTipo.forEach((n, i) => {
      const p = scaledPos.get(n.id);
      positions[i * 3] = p.x;
      positions[i * 3 + 1] = p.y;
      positions[i * 3 + 2] = p.z;
    });

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: coloresPorTipo[tipo] ?? 0xffffff,
      size: 2,
      sizeAttenuation: true,
    });

    const mesh = new THREE.Points(geometry, material);
    scene.add(mesh);
    pointsPorTipo[tipo] = { mesh, neuronas: neuronasTipo };

    // Checkbox de filtro para este tipo
    const label = document.createElement("label");
    label.style.cssText = "display:block;cursor:pointer;";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = true;
    checkbox.addEventListener("change", () => {
      mesh.visible = checkbox.checked;
    });
    label.appendChild(checkbox);
    label.append(` ${tipo}`);
    filterBox.appendChild(label);
  });

  // Geometria combinada solo para calcular la esfera que centra la camara
  pointsGeometryCompleta.setAttribute(
    "position",
    new THREE.BufferAttribute(
      new Float32Array(data.neuronas.flatMap((n) => {
        const p = scaledPos.get(n.id);
        return [p.x, p.y, p.z];
      })),
      3
    )
  );

  renderer.domElement.addEventListener("click", (event) => {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);

    for (const tipo of tipos) {
      const { mesh, neuronas } = pointsPorTipo[tipo];
      if (!mesh.visible) continue;
      const hits = raycaster.intersectObject(mesh);
      if (hits.length > 0) {
        const neurona = neuronas[hits[0].index];
        infoBox.textContent = `id: ${neurona.id} | tipo: ${neurona.tipo}`;
        infoBox.style.display = "block";
        return;
      }
    }
    infoBox.style.display = "none";
  });

  // Conexiones como líneas
  const linePositions = [];
  data.conexiones.forEach((c) => {
    const origen = scaledPos.get(c.origen);
    const destino = scaledPos.get(c.destino);
    if (!origen || !destino) return;
    linePositions.push(origen.x, origen.y, origen.z);
    linePositions.push(destino.x, destino.y, destino.z);
  });

  const lineGeometry = new THREE.BufferGeometry();
  lineGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(linePositions), 3)
  );

  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0x336699,
    transparent: true,
    opacity: 0.3,
  });

  const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
  scene.add(lines);

  // Centrar cámara en el bounding box de las neuronas
  pointsGeometryCompleta.computeBoundingSphere();
  const sphere = pointsGeometryCompleta.boundingSphere;
  camera.position.set(sphere.center.x, sphere.center.y, sphere.center.z + sphere.radius * 2.5);
  controls.target.copy(sphere.center);
  controls.update();

  // Credito, como sprite de texto debajo de la nube de neuronas
  const creditoCanvas = document.createElement("canvas");
  creditoCanvas.width = 512;
  creditoCanvas.height = 125;
  const creditoCtx = creditoCanvas.getContext("2d");
  creditoCtx.font = "48px monospace";
  creditoCtx.fillStyle = "#ffffff";
  creditoCtx.textAlign = "center";
  creditoCtx.fillText("@ Guillermo Perez", creditoCanvas.width / 2, creditoCanvas.height / 2 + 16);

  const creditoTexture = new THREE.CanvasTexture(creditoCanvas);
  const creditoMaterial = new THREE.SpriteMaterial({ map: creditoTexture, transparent: true });
  const creditoSprite = new THREE.Sprite(creditoMaterial);
  creditoSprite.scale.set(sphere.radius * 0.8, sphere.radius * 0.2, 1);
  creditoSprite.position.set(sphere.center.x, sphere.center.y - sphere.radius * 1.4, sphere.center.z);
  scene.add(creditoSprite);
}

init();

// Loop de render, se llama cada frame
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();
