/**
 * 文件: js/core/sceneSetup.js
 * 包括 初始化场景 · 相机 · 渲染器 · 控制器 · 标签层 · 坐标轴绘制
 * 中键聚焦 · 窗口自适应
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
const BLUE_1   = 0x7ec8D8
const PURPLE_1 = 0xc9b8e0

// ---- 1. 背景渐变 ----
function makeGradientBackground(colorTop, colorBottom) {
  const toCss = (c) =>
    typeof c === 'number' ? '#' + c.toString(16).padStart(6, '0') : c;

  const canvas = document.createElement('canvas');
  canvas.width = 2;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, toCss(colorTop));
  grad.addColorStop(1, toCss(colorBottom));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  return new THREE.CanvasTexture(canvas);
}

// ---- 2. 坐标轴工具 ----
function makeAxisline(scene, dir, color, AXIS_LEN, AXIS_RADIUS) {
  const len = AXIS_LEN;
  const cyl = new THREE.Mesh(
    new THREE.CylinderGeometry(AXIS_RADIUS, AXIS_RADIUS, len, 12),
    new THREE.MeshStandardMaterial({ color, metalness: 0.3, roughness: 0.5 })
  );
  const up = new THREE.Vector3(0, 1, 0);
  cyl.quaternion.setFromUnitVectors(up, dir.clone().normalize());
  cyl.position.copy(dir.clone().normalize().multiplyScalar(len / 2));
  scene.add(cyl);
}

function makeArrow(scene, dir, color, AXIS_LEN, ARROW_LEN, ARROW_RADIUS) {
  const d = dir.clone().normalize();
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(ARROW_RADIUS, ARROW_LEN, 16),
    new THREE.MeshStandardMaterial({ color, metalness: 0.3, roughness: 0.5 })
  );
  const up = new THREE.Vector3(0, 1, 0);
  cone.quaternion.setFromUnitVectors(up, d);
  cone.position.copy(d.clone().multiplyScalar(AXIS_LEN + ARROW_LEN / 2));
  scene.add(cone);
}

function makeLabel(text, position, className = 'label') {
  const div = document.createElement('div');
  div.className = className;
  div.textContent = text;
  const label = new CSS2DObject(div);
  label.position.copy(position);
  return label;
}

function makeAxis(scene, labels, r) {
  const AXIS_LEN = 6;
  const AXIS_RADIUS = 0.04;
  const ARROW_LEN = 0.5;
  const ARROW_RADIUS = 0.15;

  const xAxis = [1, 0, 0], yAxis = [0, 1, 0], zAxis = [0, 0, 1];
  const [xLabel, yLabel, zLabel] = labels;
  const xrAxis = xAxis.map(i => r * i);
  const yrAxis = yAxis.map(i => r * i);
  const zrAxis = zAxis.map(i => r * i);

  makeAxisline(scene, new THREE.Vector3(...xAxis), 0xff3333, AXIS_LEN, AXIS_RADIUS);
  makeAxisline(scene, new THREE.Vector3(...yAxis), 0x33ff33, AXIS_LEN, AXIS_RADIUS);
  makeAxisline(scene, new THREE.Vector3(...zAxis), 0x3366ff, AXIS_LEN, AXIS_RADIUS);

  makeArrow(scene, new THREE.Vector3(...xAxis), 0xff3333, AXIS_LEN, ARROW_LEN, ARROW_RADIUS);
  makeArrow(scene, new THREE.Vector3(...yAxis), 0x33ff33, AXIS_LEN, ARROW_LEN, ARROW_RADIUS);
  makeArrow(scene, new THREE.Vector3(...zAxis), 0x3366ff, AXIS_LEN, ARROW_LEN, ARROW_RADIUS);

  scene.add(makeLabel(xLabel, new THREE.Vector3(...xrAxis), 'label axis'));
  scene.add(makeLabel(yLabel, new THREE.Vector3(...yrAxis), 'label axis'));
  scene.add(makeLabel(zLabel, new THREE.Vector3(...zrAxis), 'label axis'));
}

// ---- 3. 灯光 ----
function addLightsToScene(scene) {
  scene.add(new THREE.AmbientLight(0xffffff, 0.5));

  const hemi = new THREE.HemisphereLight(0xffffff, 0x555577, 0.5);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xffffff, 1.0);
  key.position.set(6, 10, 8);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0x88aaff, 0.7);
  fill.position.set(-6, -4, -8);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(0xffaa66, 0.3);
  rim.position.set(0, -8, 4);
  scene.add(rim);
}

// ---- 3. 核心环境创建 ----
export function createViewEnvironment(frustum, aspect) {
  const scene = new THREE.Scene();
  scene.background = makeGradientBackground(BLUE_1, PURPLE_1);
  addLightsToScene(scene); 

  const camera = new THREE.OrthographicCamera(
    -frustum * aspect, frustum * aspect,
     frustum, -frustum, 0.1, 1000
  );
  camera.position.set(8, 8, 12);
  camera.lookAt(0, 0, 0);

  const labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.domElement.style.position = 'absolute';
  labelRenderer.domElement.style.top = '0';
  labelRenderer.domElement.style.left = '0';
  labelRenderer.domElement.style.pointerEvents = 'none';
  document.getElementById('canvas-wrap').appendChild(labelRenderer.domElement);

  makeAxis(scene, ['X', 'Y', 'Z'], 6.5);

  return { scene, camera, labelRenderer };
}

// ---- 4. 中键聚焦 · 平滑动画 管理 ----
const raycaster = new THREE.Raycaster();
const mouseNDC = new THREE.Vector2();

let animating = false;
let animStartTarget, animEndTarget, animStartPos, animEndPos;
let animT = 0;
const ANIM_DURATION = 18;

/**
 * 初始化中键聚焦控制
 * @param {Object} renderer - 全局的 WebGLRenderer
 * @param {Object} cameras - { C: cameraC, F: cameraF, V: cameraV }
 * @param {Object} controls - { C: controlsC, F: controlsF, V: controlsV }
 * @param {Function} getCurrentMode - 获取当前模式 'C' | 'F' | 'V'
 * @param {Function} getIsRotating - 获取当前是否处于自动旋转状态
 * @returns {Function} updateFocusAnimation - 每帧需要调用的更新函数
 */
export function initFocusControls(renderer, cameras, controls, getCurrentMode, getIsRotating) {
  renderer.domElement.addEventListener('mousedown', (e) => {
    if (e.button === 1) e.preventDefault();
  });
  renderer.domElement.addEventListener('auxclick', (e) => {
    if (e.button === 1) e.preventDefault();
  });

  renderer.domElement.addEventListener('pointerdown', (e) => {
    if (e.button !== 1) return; // 仅响应中键
    if (getIsRotating()) return; // 自动旋转时禁用

    const rect = renderer.domElement.getBoundingClientRect();
    mouseNDC.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
    mouseNDC.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;

    const mode = getCurrentMode();
    const camera   = cameras[mode];
    const control  = controls[mode];

    raycaster.setFromCamera(mouseNDC, camera);
    const planeNormal = new THREE.Vector3();
    camera.getWorldDirection(planeNormal);
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(
      planeNormal, control.target
    );
    const hitPoint = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(plane, hitPoint)) {
      const offset = hitPoint.clone().sub(control.target);
      animStartTarget = control.target.clone();
      animEndTarget   = control.target.clone().add(offset);
      animStartPos    = camera.position.clone();
      animEndPos      = camera.position.clone().add(offset);
      animT = 0;
      animating = true;
    }
  });

  // 返回一个更新函数
  return function updateFocusAnimation() {
    if (!animating) return;
    if (getIsRotating()) return;

    animT++;
    const k = Math.min(animT / ANIM_DURATION, 1);
    const ease = 1 - Math.pow(1 - k, 3);
    
    const mode = getCurrentMode();
    const camera  = cameras[mode];
    const control = controls[mode];

    control.target.lerpVectors(animStartTarget, animEndTarget, ease);
    camera.position.lerpVectors(animStartPos, animEndPos, ease);

    control.update();
    if (k >= 1) animating = false;
  };
}

// ---- 5. 窗口自适应 ----
/**
 * 初始化窗口大小变化的自适应逻辑
 * @param {number} frustum - 相机视锥体大小
 * @param {Array} cameras - 包含三个相机的数组 [cameraC, cameraF, cameraV]
 * @param {Object} renderer - 全局的 WebGLRenderer
 * @param {Array} labelRenderers - 包含三个标签层渲染器的数组 [labelRendererC, labelRendererF, labelRendererV]
 */
export function initWindowResize(frustum, cameras, renderer, labelRenderers) {
  window.addEventListener('resize', () => {
    const aspect = window.innerWidth / window.innerHeight;
    for (const cam of cameras) {
      cam.left   = -frustum * aspect;
      cam.right  =  frustum * aspect;
      cam.top    =  frustum;
      cam.bottom = -frustum;
      cam.updateProjectionMatrix();
    }
    renderer.setSize(window.innerWidth, window.innerHeight);
    labelRenderers.forEach(lr => lr.setSize(window.innerWidth, window.innerHeight));
  });
}