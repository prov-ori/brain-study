import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

const CONFIG = {
  modelUrl: '/models/brain.glb', cameraDistance: 5, minDistance: 1.5,
  maxDistance: 12, background: 0x09111f, selectedColor: 0x4cc9f0,
  storageKey: 'neuroatlas-progress-v2',
};

const ANATOMY = {
  frontal: { name:'Лобная доля', latin:'Lobus frontalis', description:'Участвует в планировании, произвольных движениях, принятии решений и регуляции поведения.' },
  parietal: { name:'Теменная доля', latin:'Lobus parietalis', description:'Обрабатывает соматосенсорную информацию и участвует в пространственном восприятии.' },
  temporal: { name:'Височная доля', latin:'Lobus temporalis', description:'Участвует в обработке слуховой информации, памяти и понимании речи.' },
  occipital: { name:'Затылочная доля', latin:'Lobus occipitalis', description:'Содержит основные корковые области обработки зрительной информации.' },
  cerebellum: { name:'Мозжечок', latin:'Cerebellum', description:'Участвует в координации движений, поддержании равновесия и двигательном обучении.' },
  brainstem: { name:'Ствол мозга', latin:'Truncus encephali', description:'Содержит важные проводящие пути и центры регуляции жизненно необходимых функций.' },
  thalamus: { name:'Таламус', latin:'Thalamus', description:'Участвует в передаче и обработке сенсорной и моторной информации.' },
  hippocampus: { name:'Гиппокамп', latin:'Hippocampus', description:'Играет важную роль в формировании эпизодической памяти и пространственной навигации.' },
  amygdala: { name:'Миндалевидное тело', latin:'Corpus amygdaloideum', description:'Участвует в обработке эмоционально значимых стимулов и эмоциональном обучении.' },
  corpuscallosum: { name:'Мозолистое тело', latin:'Corpus callosum', description:'Соединяет корковые области левого и правого полушарий.' },
};

// Обязательно проверить имена объектов по содержимому вашего brain.glb.
const MODEL_STRUCTURE_MAP = {
  frontal_l:'frontal', frontal_r:'frontal', parietal_l:'parietal', parietal_r:'parietal',
  temporal_l:'temporal', temporal_r:'temporal', occipital_l:'occipital', occipital_r:'occipital',
  cerebellum:'cerebellum', brainstem:'brainstem', thalamus_l:'thalamus', thalamus_r:'thalamus',
  hippocampus_l:'hippocampus', hippocampus_r:'hippocampus', amygdala_l:'amygdala',
  amygdala_r:'amygdala', corpus_callosum:'corpuscallosum',
};

class NeuroAtlas {
  constructor() {
    this.container = document.querySelector('#brain-canvas');
    this.infoPanel = document.querySelector('#structure-info');
    this.statusElement = document.querySelector('#model-status');
    if (!this.container) throw new Error('Не найден #brain-canvas');

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(CONFIG.background);
    this.camera = new THREE.PerspectiveCamera(45, 1, .01, 1000);
    this.renderer = new THREE.WebGLRenderer({ antialias:true, powerPreference:'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    this.container.appendChild(this.renderer.domElement);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = .07;
    this.controls.minDistance = CONFIG.minDistance;
    this.controls.maxDistance = CONFIG.maxDistance;
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.model = null;
    this.meshes = [];
    this.originalMaterials = new Map();
    this.selectedMeshes = [];
    this.currentStructure = null;
    this.progress = this.loadProgress();
    this.isRunning = true;
    this.setupLights();
    this.setupEvents();
    this.camera.position.set(0,0,CONFIG.cameraDistance);
    this.resize();
    this.loadBrain();
    this.animate();
  }

  setupLights() {
    this.scene.add(new THREE.AmbientLight(0xffffff,1.5));
    for (const [color,intensity,x,y,z] of [
      [0xffffff,3,4,6,8], [0x8ab4ff,1.4,-5,2,-4], [0xffb5a5,1.2,0,-3,-6],
    ]) {
      const light = new THREE.DirectionalLight(color,intensity);
      light.position.set(x,y,z); this.scene.add(light);
    }
  }

  async loadBrain() {
    this.setStatus('Загрузка анатомической модели…');
    const loader = new GLTFLoader();
    const draco = new DRACOLoader();
    draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
    loader.setDRACOLoader(draco);
    try {
      const gltf = await loader.loadAsync(CONFIG.modelUrl);
      this.model = gltf.scene;
      this.scene.add(this.model);
      this.model.traverse((obj) => {
        if (!obj.isMesh) return;
        this.meshes.push(obj);
        this.originalMaterials.set(obj.uuid,obj.material);
        obj.userData.structureId = MODEL_STRUCTURE_MAP[obj.name] ?? null;
      });
      this.normalizeModel();
      const mapped = this.meshes.filter(m => m.userData.structureId).length;
      const unmapped = this.meshes.filter(m => !m.userData.structureId).map(m => m.name);
      if (unmapped.length) console.warn('Структуры без привязки:',unmapped);
      this.setStatus(mapped ? `Модель загружена. Распознано объектов: ${mapped}.` : 'Модель открыта, но имена анатомических структур не сопоставлены. Настройте MODEL_STRUCTURE_MAP.');
    } catch(error) {
      console.error('Ошибка загрузки модели:',error);
      this.setStatus('Не удалось открыть /models/brain.glb. Проверьте наличие файла, формат GLB и консоль браузера.');
    } finally { draco.dispose(); }
  }

  normalizeModel() {
    this.model.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(this.model);
    const size = bounds.getSize(new THREE.Vector3());
    const maxSize = Math.max(size.x,size.y,size.z);
    if (!Number.isFinite(maxSize) || maxSize <= 0) throw new Error('Некорректные размеры модели');
    this.model.scale.multiplyScalar(3/maxSize);
    this.model.updateMatrixWorld(true);
    const scaledBounds = new THREE.Box3().setFromObject(this.model);
    this.model.position.sub(scaledBounds.getCenter(new THREE.Vector3()));
    this.model.updateMatrixWorld(true);
    this.resetCamera();
  }

  setupEvents() {
    this.pointerDown = null;
    this.onPointerDown = e => { if (e.isPrimary) this.pointerDown = {x:e.clientX,y:e.clientY}; };
    this.onPointerUp = e => {
      if (!this.pointerDown || !e.isPrimary) return;
      const distance = Math.hypot(e.clientX-this.pointerDown.x,e.clientY-this.pointerDown.y);
      this.pointerDown = null;
      if (distance <= 5) this.handleSelection(e);
    };
    const canvas = this.renderer.domElement;
    canvas.addEventListener('pointerdown',this.onPointerDown);
    canvas.addEventListener('pointerup',this.onPointerUp);
    canvas.addEventListener('pointercancel',() => { this.pointerDown = null; });
    this.onResize = () => this.resize();
    window.addEventListener('resize',this.onResize);
    this.resizeObserver = new ResizeObserver(this.onResize);
    this.resizeObserver.observe(this.container);
    document.querySelector('#reset-camera')?.addEventListener('click',() => this.resetCamera());
    document.querySelector('#clear-selection')?.addEventListener('click',() => this.clearSelection());
  }

  handleSelection(event) {
    if (!this.model) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    this.pointer.set(((event.clientX-rect.left)/rect.width)*2-1,-((event.clientY-rect.top)/rect.height)*2+1);
    this.raycaster.setFromCamera(this.pointer,this.camera);
    const intersections = this.raycaster.intersectObjects(this.meshes,false);
    // Если ближняя поверхность не сопоставлена, не выбираем сквозь неё скрытую структуру.
    const hit = intersections[0];
    if (hit?.object.userData.structureId) this.selectStructure(hit.object.userData.structureId);
  }

  selectStructure(id) {
    const info = ANATOMY[id]; if (!info) return;
    this.clearSelection(); this.currentStructure = id;
    this.selectedMeshes = this.meshes.filter(m => m.userData.structureId === id);
    for (const mesh of this.selectedMeshes) {
      mesh.material = Array.isArray(mesh.material)
        ? mesh.material.map(m => this.makeHighlightMaterial(m))
        : this.makeHighlightMaterial(mesh.material);
    }
    this.showStructureInfo(info);
  }

  makeHighlightMaterial(original) {
    const material = original.clone();
    if (material.color) material.color.setHex(CONFIG.selectedColor);
    if (material.emissive) { material.emissive.setHex(0x123f50); material.emissiveIntensity = .35; }
    return material;
  }

  clearSelection() {
    for (const mesh of this.selectedMeshes) {
      const highlight = mesh.material;
      (Array.isArray(highlight) ? highlight : [highlight]).forEach(m => m.dispose());
      mesh.material = this.originalMaterials.get(mesh.uuid);
    }
    this.selectedMeshes = []; this.currentStructure = null;
  }

  showStructureInfo(info) {
    if (!this.infoPanel) return;
    const heading = document.createElement('h2'); heading.textContent = info.name;
    const latin = document.createElement('p'); latin.className = 'latin-name'; latin.textContent = info.latin;
    const description = document.createElement('p'); description.textContent = info.description;
    this.infoPanel.replaceChildren(heading,latin,description);
  }

  resetCamera() {
    this.camera.position.set(0,0,CONFIG.cameraDistance);
    this.controls.target.set(0,0,0); this.controls.update();
  }

  resize() {
    const width = this.container.clientWidth, height = this.container.clientHeight;
    if (!width || !height) return;
    this.camera.aspect = width/height; this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1,2));
    this.renderer.setSize(width,height,false);
  }

  setStatus(message) { if (this.statusElement) this.statusElement.textContent = message; }

  loadProgress() {
    try {
      const raw = localStorage.getItem(CONFIG.storageKey);
      if (!raw) return {completedLessons:[],quizResults:[]};
      const data = JSON.parse(raw);
      return { completedLessons:Array.isArray(data.completedLessons)?data.completedLessons:[], quizResults:Array.isArray(data.quizResults)?data.quizResults:[] };
    } catch { return {completedLessons:[],quizResults:[]}; }
  }

  saveProgress() {
    try { localStorage.setItem(CONFIG.storageKey,JSON.stringify(this.progress)); }
    catch(error) { console.warn('Сохранение прогресса недоступно:',error); }
  }

  completeLesson(id) {
    if (!this.progress.completedLessons.includes(id)) { this.progress.completedLessons.push(id); this.saveProgress(); }
  }

  recordQuizResult(score,total) {
    this.progress.quizResults.push({score,total,date:new Date().toISOString()});
    this.saveProgress();
  }

  animate() {
    if (!this.isRunning) return;
    this.animationId = requestAnimationFrame(() => this.animate());
    this.controls.update(); this.renderer.render(this.scene,this.camera);
  }

  destroy() {
    this.isRunning = false; cancelAnimationFrame(this.animationId);
    this.renderer.domElement.removeEventListener('pointerdown',this.onPointerDown);
    this.renderer.domElement.removeEventListener('pointerup',this.onPointerUp);
    window.removeEventListener('resize',this.onResize);
    this.resizeObserver?.disconnect(); this.clearSelection(); this.controls.dispose();
    this.model?.traverse(obj => { if (obj.isMesh) obj.geometry?.dispose(); });
    const uniqueMaterials = new Set();
    this.originalMaterials.forEach(m => (Array.isArray(m)?m:[m]).forEach(item => uniqueMaterials.add(item)));
    uniqueMaterials.forEach(m => m.dispose());
    this.renderer.dispose();
  }
}

try { window.neuroAtlas = new NeuroAtlas(); }
catch (error) {
  console.error('Ошибка инициализации NEUROATLAS:',error);
  const status = document.querySelector('#model-status');
  if (status) status.textContent = 'Не удалось запустить 3D-просмотр. Проверьте поддержку WebGL и консоль браузера.';
}
