import * as T from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { DATA, LESSONS, QUESTIONS } from "./content.js";
import {
  CATEGORIES,
  regionOf,
  filterNodes,
  readProgress,
  advanceQuiz,
  nextQuestion,
} from "./atlas-data.js";
import "../style.css";
const $ = (s) => document.querySelector(s),
  base = import.meta.env.BASE_URL;
let nodes = [],
  meshes = [],
  selected = new Set(),
  renderer,
  scene,
  camera,
  controls,
  model,
  ready = false,
  isolated = false;
let progress;
try {
  progress = readProgress(localStorage);
} catch {
  progress = { lessons: [] };
}
const save = () => {
  try {
    localStorage.setItem("neuroatlas21", JSON.stringify(progress));
  } catch {}
};
const status = (s) => ($("#model-status").textContent = s);
function view(name) {
  document
    .querySelectorAll(".view")
    .forEach((e) => e.classList.toggle("active", e.id === "view-" + name));
  document.querySelectorAll("[data-view]").forEach((e) => {
    e.classList.toggle("active", e.dataset.view === name);
    e.setAttribute("aria-current", e.dataset.view === name ? "page" : "false");
  });
  if (name === "atlas") requestAnimationFrame(resize);
}
document
  .querySelectorAll("[data-view]")
  .forEach((b) => (b.onclick = () => view(b.dataset.view)));
function updateProgress() {
  $("#progress-bar").style.width = `${(progress.lessons.length / 5) * 100}%`;
  $("#progress-caption").textContent = `${progress.lessons.length} из 5 уроков`;
}
function renderLessons() {
  $("#lesson-list").replaceChildren();
  LESSONS.forEach((l, i) => {
    const b = document.createElement("button");
    b.className = "lesson-card";
    b.innerHTML = `<span class="num">0${i + 1}</span><h3>${l[0]}</h3><p>${l[1]}</p><span class="done">${progress.lessons.includes(i) ? "✓ Пройдено" : "Открыть урок →"}</span>`;
    b.onclick = () => {
      const d = $("#lesson-detail");
      d.hidden = false;
      d.innerHTML = `<h2>${l[0]}</h2><p>${l[2]}</p><button class="primary" id="lesson-done">Отметить как изученный</button> <button class="primary" id="lesson-see">Найти на модели →</button>`;
      $("#lesson-done").onclick = () => {
        if (!progress.lessons.includes(i)) progress.lessons.push(i);
        save();
        updateProgress();
        renderLessons();
        $("#lesson-done").textContent = "Урок пройден ✓";
      };
      $("#lesson-see").onclick = () => {
        view("atlas");
        chooseRegion(l[3]);
      };
      d.scrollIntoView({ block: "nearest", behavior: "smooth" });
    };
    $("#lesson-list").append(b);
  });
}
let quiz;
function renderQuiz() {
  const q = QUESTIONS[quiz.index];
  $("#quiz-counter").textContent = quiz.finished
    ? "Тест завершён"
    : `Вопрос ${quiz.index + 1} из ${QUESTIONS.length}`;
  $("#quiz-score").textContent = `Верно: ${quiz.score}`;
  $("#quiz-bar").style.width =
    `${(quiz.finished ? 1 : quiz.index / QUESTIONS.length) * 100}%`;
  $("#quiz-question").textContent = quiz.finished
    ? `Результат: ${quiz.score} из ${QUESTIONS.length}`
    : q[0];
  $("#quiz-feedback").textContent = "";
  $("#quiz-options").replaceChildren();
  $("#quiz-next").disabled = !quiz.finished;
  $("#quiz-next").textContent = quiz.finished
    ? "Повторить тест ↺"
    : quiz.index === QUESTIONS.length - 1
      ? "Завершить →"
      : "Следующий вопрос →";
  if (quiz.finished) return;
  q[1].forEach((text, i) => {
    const b = document.createElement("button");
    b.textContent = text;
    b.onclick = () => {
      if (quiz.answered) return;
      quiz = advanceQuiz(quiz, i, QUESTIONS);
      $("#quiz-options")
        .querySelectorAll("button")
        .forEach((o, j) => {
          o.disabled = true;
          o.classList.toggle("correct", j === q[2]);
          o.classList.toggle("incorrect", j === i && i !== q[2]);
        });
      $("#quiz-feedback").textContent =
        (i === q[2] ? "Верно. " : "Неверно. ") + q[3];
      $("#quiz-score").textContent = `Верно: ${quiz.score}`;
      $("#quiz-next").disabled = false;
    };
    $("#quiz-options").append(b);
  });
}
function resetQuiz() {
  quiz = { index: 0, score: 0, answered: false, finished: false };
  renderQuiz();
}
$("#quiz-next").onclick = () => {
  if (quiz.finished) resetQuiz();
  else {
    quiz = nextQuestion(quiz, QUESTIONS.length);
    renderQuiz();
  }
};
updateProgress();
renderLessons();
resetQuiz();
const sideLabel = {
  left: "слева",
  right: "справа",
  median: "по средней линии",
};
function state() {
  return {
    query: $("#search").value,
    category: $("#category").value,
    side: $("#hemisphere").value,
  };
}
function renderList() {
  const list = filterNodes(nodes, state());
  $("#result-count").textContent = `${list.length} из ${nodes.length}`;
  $("#structure-list").replaceChildren();
  for (const n of list) {
    const b = document.createElement("button");
    b.textContent = `${n.label} · ${sideLabel[n.side] || n.side}`;
    b.dataset.id = n.id;
    b.classList.toggle("active", selected.has(n.id));
    b.onclick = () => choose([n.id], n);
    $("#structure-list").append(b);
  }
  if (!list.length) {
    $("#structure-list").textContent =
      "Совпадений нет. Попробуйте английское название или выберите другой раздел.";
  }
  applyVisibility();
}
function applyVisibility() {
  if (!ready) return;
  const allowed = new Set(
    filterNodes(nodes, { ...state(), query: "" }).map((n) => n.id),
  );
  const opacity = Number($("#cortex-opacity").value) / 100;
  const colorful = $("#color-mode").checked;
  for (const m of meshes) {
    const n = m.userData.node;
    const sel = selected.has(n.id);
    m.visible = allowed.has(n.id) && (!isolated || sel);
    const mat = m.material;
    mat.color.set(
      colorful
        ? DATA[regionOf(n)]?.[3] || CATEGORIES[n.category]?.[1] || "#cfb6ac"
        : n.category === "cortex"
          ? "#cfa6a0"
          : n.category === "cerebellum"
            ? "#bb8d88"
            : CATEGORIES[n.category]?.[1] || "#cfb6ac",
    );
    mat.emissive.set(sel ? "#4ccbb9" : "#000000");
    mat.emissiveIntensity = sel ? 0.3 : 0;
    mat.opacity =
      n.category === "cortex" && !sel
        ? opacity
        : n.category === "meninges_dura"
          ? 0.18
          : 1;
    mat.transparent = mat.opacity < 1;
    mat.depthWrite = mat.opacity > 0.95;
    m.visible &&= mat.opacity > 0;
  }
}
function choose(ids, n) {
  selected = new Set(ids);
  isolated = false;
  $("#isolate").setAttribute("aria-pressed", "false");
  document
    .querySelectorAll("[data-region]")
    .forEach((b) => b.classList.remove("active"));
  if (n) {
    $("#structure-title").textContent = n.label;
    $("#structure-latin").textContent = sideLabel[n.side];
    const r = regionOf(n);
    $("#structure-description").textContent =
      (r ? DATA[r][2] + " " : "") +
      `Раздел: ${CATEGORIES[n.category]?.[0]}. Источник: ${n.source}. ` +
      (n.source !== "Z-Anatomy / BodyParts3D"
        ? "Приблизительная регистрация из другого атласа; границы не являются индивидуальными."
        : "Геометрия из открытого анатомического атласа.");
  }
  $("#selection-count").textContent = `Выбрано структур: ${ids.length}`;
  renderList();
}
function chooseRegion(id) {
  const matched = nodes.filter((n) => regionOf(n) === id);
  $("#category").value = "";
  $("#hemisphere").value = "both";
  $("#search").value = "";
  choose(matched.map((n) => n.id));
  $("#structure-title").textContent = DATA[id][0];
  $("#structure-latin").textContent = DATA[id][1];
  $("#structure-description").textContent = DATA[id][2];
  $(`[data-region="${id}"]`).classList.add("active");
  if (["thalamus", "hippocampus", "amygdala", "corpuscallosum"].includes(id)) {
    $("#cortex-opacity").value = 12;
    $("#opacity-value").textContent = "12%";
    applyVisibility();
  }
  if (ready) focusSelection();
}
for (const [id, d] of Object.entries(DATA)) {
  const b = document.createElement("button");
  b.textContent = d[0];
  b.dataset.region = id;
  b.onclick = () => chooseRegion(id);
  $("#region-list").append(b);
}
for (const [id, [label]] of Object.entries(CATEGORIES)) {
  const o = document.createElement("option");
  o.value = id;
  o.textContent = label;
  $("#category").append(o);
}
$("#search").oninput = renderList;
$("#category").onchange = renderList;
$("#hemisphere").onchange = renderList;
$("#cortex-opacity").oninput = () => {
  $("#opacity-value").textContent = $("#cortex-opacity").value + "%";
  applyVisibility();
};
$("#color-mode").onchange = applyVisibility;
$("#isolate").onclick = () => {
  if (!selected.size) return;
  isolated = !isolated;
  $("#isolate").setAttribute("aria-pressed", String(isolated));
  applyVisibility();
  if (isolated) focusSelection();
};
function resize() {
  if (!renderer) return;
  const box = $("#brain-canvas");
  const w = box.clientWidth,
    h = box.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
function frameBox(box) {
  if (box.isEmpty()) return;
  const center = box.getCenter(new T.Vector3()),
    r = box.getBoundingSphere(new T.Sphere()).radius;
  const dir = camera.position.clone().sub(controls.target).normalize();
  const fit =
    (Math.min(camera.fov, camera.fov * camera.aspect) * Math.PI) / 180;
  camera.position
    .copy(center)
    .addScaledVector(dir, Math.max(0.4, (r / Math.sin(fit / 2)) * 1.15));
  controls.target.copy(center);
  controls.update();
}
function focusSelection() {
  if (!ready || !selected.size) return;
  model.updateWorldMatrix(true, true);
  const box = new T.Box3();
  for (const m of meshes)
    if (selected.has(m.userData.node.id) && m.visible) box.expandByObject(m);
  frameBox(box);
}
$("#focus-selection").onclick = focusSelection;
function resetCamera() {
  if (!camera) return;
  camera.position.set(4, 1.6, 6);
  controls.target.set(0, 0, 0);
  controls.update();
  if (model) {
    // Descending nerves extend far beyond the brain; frame the anatomical core.
    model.updateWorldMatrix(true, true);
    const core = new T.Box3();
    for (const mesh of meshes)
      if (mesh.userData.node.core) core.expandByObject(mesh);
    frameBox(core);
  }
}
function reset() {
  selected.clear();
  isolated = false;
  $("#search").value = "";
  $("#category").value = "";
  $("#hemisphere").value = "both";
  $("#cortex-opacity").value = 100;
  $("#opacity-value").textContent = "100%";
  $("#isolate").setAttribute("aria-pressed", "false");
  $("#selection-count").textContent = "Выбрано структур: 0";
  $("#structure-title").textContent = "Выберите структуру";
  $("#structure-latin").textContent = "437 структур · открытая анатомия";
  $("#structure-description").textContent =
    "Выберите область или отдельную структуру. Для просмотра внутренних отделов уменьшите непрозрачность коры или используйте изоляцию.";
  renderList();
  resetCamera();
}
$("#reset-camera").onclick = reset;
$("#clear-selection").onclick = () => {
  selected.clear();
  isolated = false;
  $("#isolate").setAttribute("aria-pressed", "false");
  $("#selection-count").textContent = "Выбрано структур: 0";
  renderList();
};
$("#auto-rotate").onclick = () => {
  if (!controls) return;
  controls.autoRotate = !controls.autoRotate;
  $("#auto-rotate").setAttribute("aria-pressed", String(controls.autoRotate));
};
$("#zoom-in").onclick = () => {
  if (camera) {
    camera.position.lerp(controls.target, 0.15);
    controls.update();
  }
};
$("#zoom-out").onclick = () => {
  if (camera) {
    camera.position
      .sub(controls.target)
      .multiplyScalar(1.18)
      .add(controls.target);
    controls.update();
  }
};
function fail(e) {
  console.error(e);
  status(
    "Не удалось открыть 3D-модель. Проверьте WebGL и перезагрузите страницу.",
  );
  $("#model-mode").textContent = "Ошибка загрузки";
  $("#retry").hidden = false;
}
$("#retry").onclick = () => location.reload();
async function start() {
  try {
    renderer = new T.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setClearColor(0, 0);
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    $("#brain-canvas").append(renderer.domElement);
    renderer.domElement.setAttribute(
      "aria-label",
      "Трёхмерная анатомическая модель мозга",
    );
    renderer.domElement.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      fail(new Error("WebGL context lost"));
    });
    scene = new T.Scene();
    camera = new T.PerspectiveCamera(38, 1, 0.01, 100);
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.minDistance = 0.15;
    controls.maxDistance = 35;
    controls.autoRotateSpeed = 0.5;
    scene.add(new T.HemisphereLight("#f6e7dc", "#293242", 2));
    for (const [color, intensity, pos] of [
      ["#fff2e5", 3, [4, 6, 7]],
      ["#9bc5df", 1.6, [-5, 2, -4]],
      ["#e2aaa5", 1, [2, -2, -6]],
    ]) {
      const l = new T.DirectionalLight(color, intensity);
      l.position.set(...pos);
      scene.add(l);
    }
    new ResizeObserver(resize).observe($("#brain-canvas"));
    resize();
    renderer.setAnimationLoop(() => {
      if (!document.hidden && $("#view-atlas").classList.contains("active")) {
        controls.update();
        renderer.render(scene, camera);
      }
    });
    status("Загрузка анатомии — 4,65 МБ…");
    const response = await fetch(base + "models/manifest.json");
    if (!response.ok) throw new Error("Manifest HTTP " + response.status);
    nodes = (await response.json()).nodes;
    const draco = new DRACOLoader().setDecoderPath(base + "draco/");
    const loader = new GLTFLoader().setDRACOLoader(draco);
    const gltf = await loader.loadAsync(base + "models/brain.glb");
    draco.dispose();
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const found = new Set();
    gltf.scene.traverse((o) => {
      if (!o.isMesh) return;
      const id = o.userData.bx_id ?? o.parent?.userData.bx_id,
        n = byId.get(id);
      if (!n) throw new Error("Unmapped mesh " + o.name);
      found.add(id);
      o.userData.node = n;
      o.material = new T.MeshStandardMaterial({
        roughness: 0.72,
        metalness: 0,
        side: T.DoubleSide,
      });
      meshes.push(o);
    });
    if (found.size !== nodes.length) throw new Error("Manifest/model mismatch");
    const core = new T.Box3();
    gltf.scene.updateMatrixWorld(true);
    for (const m of meshes) if (m.userData.node.core) core.expandByObject(m);
    const c = core.getCenter(new T.Vector3()),
      r = core.getBoundingSphere(new T.Sphere()).radius;
    gltf.scene.position.sub(c);
    model = new T.Group();
    model.add(gltf.scene);
    model.scale.setScalar(1.7 / r);
    model.rotation.y = Math.PI;
    scene.add(model);
    ready = true;
    $("#model-mode").textContent = `${found.size} СТРУКТУР · GLB`;
    let down;
    renderer.domElement.addEventListener(
      "pointerdown",
      (e) => (down = [e.clientX, e.clientY]),
    );
    renderer.domElement.addEventListener("pointerup", (e) => {
      if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5)
        return;
      const rect = renderer.domElement.getBoundingClientRect(),
        p = new T.Vector2(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          (-(e.clientY - rect.top) / rect.height) * 2 + 1,
        ),
        ray = new T.Raycaster();
      ray.setFromCamera(p, camera);
      const hit = ray.intersectObjects(
        meshes.filter((m) => m.visible && m.material.opacity > 0.15),
        false,
      )[0];
      if (hit) choose([hit.object.userData.node.id], hit.object.userData.node);
    });
    reset();
    status("Модель загружена · выберите структуру");
    document.body.dataset.modelReady = "true";
  } catch (e) {
    fail(e);
  }
}
start();
