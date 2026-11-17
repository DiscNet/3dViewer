import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { MTLLoader } from "three/addons/loaders/MTLLoader.js";

const $ = (id) => document.getElementById(id);
const host = $("canvasHost");
const fileInput = $("fileInput");
const emptyState = $("emptyState");
const toastElement = $("toast");

const scene = new THREE.Scene();
scene.background = new THREE.Color("#14131a");

const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 10000);
camera.position.set(4, 3, 5);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
host.prepend(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 0.05;
controls.maxDistance = 10000;

const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
directionalLight.position.set(5, 8, 6);
const fillLight = new THREE.DirectionalLight(0x9b83f2, 0.55);
fillLight.position.set(-5, 2, -4);
scene.add(ambientLight, directionalLight, fillLight);

const grid = new THREE.GridHelper(20, 20, 0x51466c, 0x302c3b);
grid.position.y = -0.01;
scene.add(grid);

const axes = new THREE.AxesHelper(2);
axes.visible = false;
scene.add(axes);

const modelGroup = new THREE.Group();
scene.add(modelGroup);

let currentModel = null;
let currentColor = "#a78bfa";
let toastTimer;
let objectUrl = null;
let renderMode = "solid";

function showToast(message) {
  toastElement.textContent = message;
  toastElement.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastElement.classList.remove("visible"), 3000);
}

function formatNumber(value) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function resizeRenderer() {
  const width = host.clientWidth;
  const height = host.clientHeight;
  if (!width || !height) return;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

const resizeObserver = new ResizeObserver(resizeRenderer);
resizeObserver.observe(host);
resizeRenderer();

function frameModel(object) {
  const box = new THREE.Box3().setFromObject(object);
  if (box.isEmpty()) return;
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDimension = Math.max(size.x, size.y, size.z, 0.001);
  const distance = maxDimension / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) * 1.65;

  controls.target.copy(center);
  camera.position.set(
    center.x + distance * 0.9,
    center.y + distance * 0.65,
    center.z + distance * 0.9
  );
  camera.near = Math.max(maxDimension / 10000, 0.001);
  camera.far = Math.max(maxDimension * 100, 100);
  camera.updateProjectionMatrix();
  controls.minDistance = maxDimension * 0.015;
  controls.maxDistance = maxDimension * 100;
  controls.update();
}

function updateStats(object) {
  let vertices = 0;
  let faces = 0;
  let meshes = 0;
  object.traverse((child) => {
    if (!child.isMesh || !child.geometry) return;
    meshes++;
    const geometry = child.geometry;
    const position = geometry.getAttribute("position");
    if (position) vertices += position.count;
    const index = geometry.getIndex();
    faces += index ? index.count / 3 : (position ? position.count / 3 : 0);
  });

  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  $("vertexCount").textContent = formatNumber(vertices);
  $("faceCount").textContent = formatNumber(Math.floor(faces));
  $("meshCount").textContent = formatNumber(meshes);
  $("dimensions").textContent = box.isEmpty() ? "—" : [size.x, size.y, size.z].map((n) => n.toFixed(2)).join(" × ");
}

function applyRenderMode() {
  if (!currentModel) return;
  currentModel.traverse((child) => {
    if (!child.isMesh) return;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    for (const material of materials) {
      if (!material) continue;
      material.wireframe = renderMode !== "solid";
      material.transparent = renderMode === "solid-wire";
      material.opacity = renderMode === "solid-wire" ? 0.82 : 1;
      material.polygonOffset = renderMode === "solid-wire";
      material.polygonOffsetFactor = renderMode === "solid-wire" ? 1 : 0;
      material.polygonOffsetUnits = renderMode === "solid-wire" ? 1 : 0;
      material.needsUpdate = true;
    }
  });
}

function applyModelColor(color) {
  currentColor = color;
  if (!currentModel) return;
  currentModel.traverse((child) => {
    if (!child.isMesh) return;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    for (const material of materials) {
      if (material?.userData?.hasImportedMaterial) continue;
      if (material?.color) material.color.set(color);
    }
  });
}

function disposeModel() {
  if (!currentModel) return;
  modelGroup.remove(currentModel);
  currentModel.traverse((child) => {
    if (!child.isMesh) return;
    child.geometry?.dispose();
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    for (const material of materials) {
      if (!material) continue;
      for (const value of Object.values(material)) {
        if (value && value.isTexture) value.dispose();
      }
      material.dispose();
    }
  });
  currentModel = null;
}

function getFileMap(files) {
  const map = new Map();
  for (const file of files) {
    map.set(file.name.toLowerCase(), file);
    map.set(file.name.split(/[\\/]/).pop().toLowerCase(), file);
  }
  return map;
}

async function loadModel(files) {
  const fileList = Array.from(files);
  const objFile = fileList.find((file) => file.name.toLowerCase().endsWith(".obj"));
  if (!objFile) {
    showToast("Selecione um arquivo .obj para continuar.");
    return;
  }

  const mtlFile = fileList.find((file) => file.name.toLowerCase().endsWith(".mtl"));
  const fileMap = getFileMap(fileList);
  const manager = new THREE.LoadingManager();
  manager.setURLModifier((url) => {
    const decoded = decodeURIComponent(url).replace(/\\/g, "/");
    const fileName = decoded.split("/").pop().toLowerCase();
    const file = fileMap.get(fileName) || fileMap.get(decoded.toLowerCase());
    if (file) return URL.createObjectURL(file);
    return url;
  });

  const readText = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
    reader.readAsText(file);
  });

  try {
    showToast("Carregando modelo...");
    const loader = new OBJLoader(manager);
    if (mtlFile) {
      const materialLoader = new MTLLoader(manager);
      const materials = materialLoader.parse(await readText(mtlFile), "");
      materials.preload();
      loader.setMaterials(materials);
    }

    const object = loader.parse(await readText(objFile));
    let meshTotal = 0;
    object.traverse((child) => {
      if (!child.isMesh) return;
      meshTotal++;
      child.geometry.computeVertexNormals();
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      for (const material of mats) {
        if (!material) continue;
        material.side = THREE.DoubleSide;
        material.userData.hasImportedMaterial = Boolean(mtlFile);
        if (!mtlFile && material.color) material.color.set(currentColor);
      }
    });

    if (!meshTotal) throw new Error("O arquivo OBJ não contém malhas válidas.");

    disposeModel();
    currentModel = object;
    modelGroup.add(object);
    applyRenderMode();
    frameModel(object);
    updateStats(object);

    $("fileName").textContent = objFile.name;
    $("fileMeta").textContent = mtlFile ? "OBJ + MTL carregados" : "Arquivo OBJ carregado";
    $("statusText").textContent = objFile.name;
    $("statusText").previousElementSibling.classList.add("ready");
    emptyState.hidden = true;
    showToast("Modelo carregado com sucesso.");
  } catch (error) {
    console.error(error);
    showToast(error.message || "Erro ao carregar o modelo.");
  }
}

function openFilePicker() {
  fileInput.value = "";
  fileInput.click();
}

$("openButton").addEventListener("click", openFilePicker);
$("replaceButton").addEventListener("click", openFilePicker);
$("emptyOpenButton").addEventListener("click", openFilePicker);
fileInput.addEventListener("change", (event) => {
  if (event.target.files.length) loadModel(event.target.files);
});

$("renderMode").addEventListener("change", (event) => {
  renderMode = event.target.value;
  applyRenderMode();
});
$("modelColor").addEventListener("input", (event) => {
  $("colorValue").textContent = event.target.value.toUpperCase();
  applyModelColor(event.target.value);
});
$("resetColor").addEventListener("click", () => {
  $("modelColor").value = "#a78bfa";
  $("colorValue").textContent = "#A78BFA";
  applyModelColor("#a78bfa");
});
$("gridToggle").addEventListener("change", (event) => { grid.visible = event.target.checked; });
$("axesToggle").addEventListener("change", (event) => { axes.visible = event.target.checked; });
$("autoRotate").addEventListener("change", (event) => { controls.autoRotate = event.target.checked; });
$("lightIntensity").addEventListener("input", (event) => {
  ambientLight.intensity = Number(event.target.value);
  $("lightValue").textContent = Number(event.target.value).toFixed(1);
});
$("directionalIntensity").addEventListener("input", (event) => {
  directionalLight.intensity = Number(event.target.value);
  $("directionalValue").textContent = Number(event.target.value).toFixed(1);
});

$("frameButton").addEventListener("click", () => {
  if (currentModel) frameModel(currentModel);
  else showToast("Importe um modelo primeiro.");
});
$("orbitButton").addEventListener("click", () => {
  controls.enableRotate = true;
  controls.enablePan = true;
  $("orbitButton").classList.add("active");
  $("panButton").classList.remove("active");
  $("cameraMode").textContent = "ORBIT CONTROLS";
});
$("panButton").addEventListener("click", () => {
  controls.enableRotate = false;
  controls.enablePan = true;
  $("panButton").classList.add("active");
  $("orbitButton").classList.remove("active");
  $("cameraMode").textContent = "PAN CONTROLS";
});
$("fullscreenButton").addEventListener("click", async () => {
  try {
    if (!document.fullscreenElement) await host.requestFullscreen();
    else await document.exitFullscreen();
  } catch {
    showToast("Tela cheia não está disponível neste navegador.");
  }
});
$("helpButton").addEventListener("click", () => $("helpDialog").showModal());

host.addEventListener("dblclick", () => {
  if (currentModel) frameModel(currentModel);
});

let dragDepth = 0;
host.addEventListener("dragenter", (event) => {
  event.preventDefault();
  dragDepth++;
  host.classList.add("dragging");
});
host.addEventListener("dragover", (event) => event.preventDefault());
host.addEventListener("dragleave", (event) => {
  event.preventDefault();
  dragDepth = Math.max(0, dragDepth - 1);
  if (!dragDepth) host.classList.remove("dragging");
});
host.addEventListener("drop", (event) => {
  event.preventDefault();
  dragDepth = 0;
  host.classList.remove("dragging");
  if (event.dataTransfer.files.length) loadModel(event.dataTransfer.files);
});

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();

window.addEventListener("beforeunload", () => {
  disposeModel();
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  resizeObserver.disconnect();
});
