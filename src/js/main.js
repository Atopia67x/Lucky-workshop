/**
 * 文件: js/main.js
 * 应用入口: 创建 视图环境·控制器, 生成 C·F·V 三场景, 处理模式切换, 动画循环
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// 引入 核心渲染
import { spawnedGroupsC, spawnedGroupsF, spawnedGroupsV } from './core/renderer.js';

// 引入 创建视图环境
import { 
  createViewEnvironment, 
  initFocusControls, 
  initWindowResize 
} from './core/sceneSetup.js';

// 引入 相机旋转
import { setupRecorder, updateRotation, getIsRotating, updateHint } from './core/recorder.js';

// 引入 交互按钮
import { setupUI, syncModeButtons } from './ui/controlsUI.js';

// 引入 场景
import { renderCIncremental, startAct, stopAct } from './view/sceneC.js';
import { makeVScene } from './view/sceneV.js';
import { makeFScene } from './view/sceneF.js';

// ============================================================
// a.1. 创建视图环境
// ============================================================
let frustum = 8;
let aspect = window.innerWidth / window.innerHeight;

// 生成三个视图环境
const envC = createViewEnvironment(frustum, aspect);
const envF = createViewEnvironment(frustum, aspect);
const envV = createViewEnvironment(frustum, aspect);

const sceneC = envC.scene, cameraC = envC.camera, labelRendererC = envC.labelRenderer;
const sceneF = envF.scene, cameraF = envF.camera, labelRendererF = envF.labelRenderer;
const sceneV = envV.scene, cameraV = envV.camera, labelRendererV = envV.labelRenderer;

// 120cell-C · F · V 场景的承载对象
const targetC = { scene: sceneC, spawnedGroups: spawnedGroupsC };
const targetF = { scene: sceneF, spawnedGroups: spawnedGroupsF };
const targetV = { scene: sceneV, spawnedGroups: spawnedGroupsV };

// 全局统一的 WebGL 渲染器
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.getElementById('canvas-wrap').appendChild(renderer.domElement);

document.addEventListener('contextmenu', (e) => {
  e.preventDefault();
});

// 创建控制器
function makeControls(camera) {
  const c = new OrbitControls(camera, renderer.domElement);
  c.enableDamping = true;
  c.dampingFactor = 0.1;
  c.target.set(0, 0, 0);
  c.mouseButtons = {
    LEFT:   THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.PAN,
    RIGHT:  THREE.MOUSE.PAN,
  };
  return c;
}

const controlsC = makeControls(cameraC);
const controlsF = makeControls(cameraF);
const controlsV = makeControls(cameraV);

// 当前画布
let currentMode = 'C';

// ============================================================
// a.2 中键聚焦 · 平滑动画
// ============================================================
const updateFocusAnimation = initFocusControls(
  renderer,
  { C: cameraC, F: cameraF, V: cameraV },
  { C: controlsC, F: controlsF, V: controlsV },
  () => currentMode,
  () => getIsRotating()
);

// ============================================================
// a.3 窗口自适应
// ============================================================
initWindowResize(
  frustum,
  [cameraC, cameraF, cameraV],
  renderer,
  [labelRendererC, labelRendererF, labelRendererV]
);

// ============================================================
// b. 展示几何体对象
// ============================================================

// 暂停 (毫秒)
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

//showPoints([[0, 100, 100]], WHITE) // ???
makeVScene(targetV);
makeFScene(targetF);

// 初始化录制 与 相机自动旋转
setupRecorder(renderer, cameraC, controlsC);
// 更新 下方小字提示
updateHint();

// ============================================================
// c.1. 全局 状态切换
// ============================================================
const sliderC   = document.getElementById('sliderC');
const rangeC    = document.getElementById('range-c');
const rangeCVal = document.getElementById('range-c-val');

let sliderCount = parseInt(rangeC.value, 10);
let sliderActive = false;

// ---- 状态切换 总部 ----
function setMode(mode) {
  // 如果已经在目标模式, 直接返回
  if (mode === currentMode) return;

  // 1. 离开当前模式: 停建造循环、禁用当前模式的 controls
  if (currentMode === 'C') {
    // 如果是主动离开 C，停掉后台的 act 循环，但保留已经生成好的模型
    stopAct(); 
    controlsC.enabled = false;
    controlsC.update();
  }
  else if (currentMode === 'F') {
    controlsF.enabled = false;
    controlsF.update();
  }
  else if (currentMode === 'V') {
    controlsV.enabled = false;
    controlsV.update();
  } 

  // 2. 进入新模式
  if (mode === 'C') {
    controlsC.update();
    if (!getIsRotating()) {
      controlsC.enabled = true;
    }
    
    labelRendererC.domElement.style.display = '';
    labelRendererF.domElement.style.display = 'none';
    labelRendererV.domElement.style.display = 'none';
    sliderC.style.display = '';
    
    // 只有当 C 场景真的是空的时候 (首次加载), 才触发分帧构建
    if (spawnedGroupsC.length === 0) {
      if (sliderActive) {
        renderCIncremental(sliderCount, targetC); // 使用异步分帧
      } else {
        startAct(sleep, targetC);
      }
    }
  } 
  else if (mode === 'F') {
    // 进入 F: 复用顶层已生成的 F 场景内容, 启用 controlsF
    controlsF.enabled = true;
    controlsF.update();
    labelRendererC.domElement.style.display = 'none';
    labelRendererF.domElement.style.display = '';
    labelRendererV.domElement.style.display = 'none';
    sliderC.style.display = 'none';
  } 
  else if (mode === 'V') {
    // 进入 V: 复用顶层已生成的 F 场景内容, 启用 controlsV
    controlsV.enabled = true;
    controlsV.update();
    labelRendererC.domElement.style.display = 'none';
    labelRendererF.domElement.style.display = 'none';
    labelRendererV.domElement.style.display = '';
    sliderC.style.display = 'none';
  }

  currentMode = mode;
  syncModeButtons(currentMode);
}

const deps = {
  setMode,
  stopAct,
  getCurrentMode: () => currentMode,
  renderCIncremental,
  updateSliderState: (count) => {
    sliderCount = count;
    sliderActive = true;
  }
};

// 增加 对应的跳转按钮与滑块
setupUI('C', deps, targetC);
setupUI('F', deps, targetF);
setupUI('V', deps, targetV);

// 初始状态: 120cell-C, 标签层只显示 C
labelRendererC.domElement.style.display = '';
labelRendererF.domElement.style.display = 'none';
labelRendererV.domElement.style.display = 'none';
controlsV.enabled = false;
controlsF.enabled = false;
rangeCVal.textContent = String(sliderCount);
syncModeButtons(currentMode);
// 初始不启动 act, 由滑块值决定 C 视图显示集合
sliderActive = true;
renderCIncremental(sliderCount, targetC);

// ============================================================
// c.2. 动画循环
// ============================================================
function animate() {
  requestAnimationFrame(animate);

  const isV = currentMode === 'V';
  const isF = currentMode === 'F';

  const scene  = isF ? sceneF  : (isV ? sceneV  : sceneC);
  const camera = isF ? cameraF : (isV ? cameraV : cameraC);

  if (isV) {
    // 120cell-V: 只推动当前可见模式的 controls
    if (controlsV.enabled) controlsV.update();
  } else if (isF) {
    // 120cell-F: 只推动当前可见模式的 controls
    if (controlsF.enabled) controlsF.update();
  } else {
    updateRotation(cameraC, controlsC);
    updateFocusAnimation();
    if (!getIsRotating() && controlsC.enabled) {
      controlsC.update();
    }
  }

  updateHint();

  renderer.render(scene, camera);
  if (isV) {
    labelRendererV.render(scene, camera);
  } else if (isF) {
    labelRendererF.render(scene, camera);
  } else {
    labelRendererC.render(scene, camera);
  }
}
animate();