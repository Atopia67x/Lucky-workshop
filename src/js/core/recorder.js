/**
 * 文件: js/core/recorder.js
 * 实现 MP4 录制, 并在录制期间 自动绕轴旋转
 */

import * as THREE from 'three';
import { vecToElement } from './transform.js';
import { Doe } from '../data/shapes.js';

let mediaRecorder = null;
let recordedChunks = [];

// --- 相机旋转状态 ---
let isRotating = false;
let vRotator, P_parallel, P_perp0;
let angle = 0;
let lastTime = 0;
const PERIOD = 19600; // 转一圈的毫秒数

/**
 * 初始化相机的旋转参数 (只在录制模块内部使用)
 */
export function initRecordingRotation(cameraC, controlsC) {
  // 基于 Doe 计算旋转轴
  const face = vecToElement(Doe, Doe[2][0]);
  const edge = vecToElement(Doe, Doe[2][0].slice(0, 2));
  
  vRotator = face.clone().normalize();
  
  // 设置 120cell-C 的专属相机初始位置
  const cameraPosition = face.clone()
    .multiplyScalar(3)
    .add(edge).divideScalar(4)
    .multiplyScalar(10);
    
  cameraC.position.copy(cameraPosition);
  cameraC.up.copy(face);
  controlsC.target.set(0, 0, 0);
  controlsC.update();

  // 预计算旋转的径向与法向
  P_parallel = vRotator.clone().multiplyScalar(cameraC.position.dot(vRotator));
  P_perp0 = cameraC.position.clone().sub(P_parallel);
}

/**
 * 提供给 animate 循环调用的旋转更新函数
 */
export function updateRotation(cameraC, controlsC) {
  if (!isRotating) {
    cameraC.up.set(0, 1, 0);
    controlsC.enableZoom = true;
    controlsC.enableRotate = true;
    controlsC.enablePan = true;
    controlsC.enabled = true;
    return;
  }

  const now = performance.now();
  const dt = now - lastTime;
  lastTime = now;

  angle -= (2 * Math.PI / PERIOD) * dt;
  const P_perp = P_perp0.clone().applyAxisAngle(vRotator, angle);

  cameraC.position.copy(P_parallel).add(P_perp);
  cameraC.up.copy(vRotator);
  cameraC.lookAt(controlsC.target);

  // 锁死交互
  cameraC.zoom = 1;
  cameraC.updateProjectionMatrix();
  controlsC.enableZoom = false;
  controlsC.enableRotate = false;
  controlsC.enablePan = false;
  controlsC.enabled = false;
}

/**
 * 外部查询是否正在旋转
 */
export function getIsRotating() {
  return isRotating;
}

/**
 * 绑定录制按钮
 */
export function setupRecorder(renderer, cameraC, controlsC) {
  // 初始化旋转所需的坐标数据
  initRecordingRotation(cameraC, controlsC);

  function startCapture() {
    const mp4Type = 'video/mp4;codecs=avc1.42E01E';
    if (!MediaRecorder.isTypeSupported(mp4Type)) {
      alert('当前浏览器不支持直接录制 MP4, 建议使用 Chrome 117+ 或 Safari 17+');
      return;
    }

    // 开启旋转
    isRotating = true;
    angle = 0;
    lastTime = performance.now();

    const stream = renderer.domElement.captureStream(30);
    mediaRecorder = new MediaRecorder(stream, {
      mimeType: mp4Type,
      videoBitsPerSecond: 6_000_000,
    });

    recordedChunks = [];
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      // 停止录制时，停止旋转
      isRotating = false;
      
      const blob = new Blob(recordedChunks, { type: 'video/mp4' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `120cell-${Date.now()}.mp4`;
      a.click();
      URL.revokeObjectURL(url);
    };

    mediaRecorder.start(1000);
    console.log('开始录制 MP4, 相机开始旋转');
  }

  function stopCapture() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      console.log('录制完成，已下载 MP4');
    }
  }

  document.getElementById('btn-start').addEventListener('click', startCapture);
  document.getElementById('btn-stop').addEventListener('click', stopCapture);
}

/**
 * 更新页面底部提示栏的文字状态
 */
export function updateHint() {
  const hintEl = document.getElementById('hint');
  const isRotating = getIsRotating(); // 调用本文件内的状态

  if (isRotating) {
    if (hintEl.dataset.state !== 'rotating') {
      hintEl.textContent = '● 相机自动旋转中 · 当前状态禁用交互';
      hintEl.classList.add('recording');
      hintEl.dataset.state = 'rotating';
    }
  } else {
    if (hintEl.dataset.state !== 'idle') {
      hintEl.innerHTML = '推荐使用 Chrome 浏览器 · <b>左键拖</b> 旋转 · <b>滚轮</b> 缩放 · <b>右键拖</b> 平移 · <b>中键单击</b> 移至中心';
      hintEl.classList.remove('recording');
      hintEl.dataset.state = 'idle';
    }
  }
}