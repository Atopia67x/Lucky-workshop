/**
 * 文件: js/core/transform.js
 * 包含 120-Cell 引擎的矩阵生成函数: 缩放 (Scalar) · 旋转 (Rotator) · 平移 (Translator)
 * 以及配套的方向向量与 VEF 三轴工具 (vecToElement / getDirectionId / getModeVector)
 * 仅依赖 three 与 data 层常量、形状拼装, 不涉及 DOM · 场景 · 运行状态
 */

import * as THREE from 'three';

import { PHI, SQ3 } from '../data/constants.js';
import { Doe } from '../data/shapes.js';

/*
  -----
  注意: 
    这里的矩阵存储分为 行优先 · 列优先 两种: 
      1.仅当调用 set 函数时是 行优先，与一般数学约定一致
      2.仅当直接赋值 elements 是 列优先，与一般数学约定相反
    优先的取得取决于哪一种排版更方便
      3.transpose() 是转置矩阵，解决了行列优先冲突的问题
  -----
*/

// 仿射 (VEF) 与直角 (XYZ) 坐标系的转换矩阵 生成函数
// 使用方法: D⁻¹ S D
export function affined(source) {
  const [vertex, edge, face] = getDirectionId(source, 'face', 0);

  return new THREE.Matrix4().set(
    vertex.x, edge.x, face.x, 0,
    vertex.y, edge.y, face.y, 0,
    vertex.z, edge.z, face.z, 0,
    0,        0,      0,      1,
  ).invert();
}

// ---- 1. 缩放 (Scalar) 矩阵 生成函数 ----
export function Scalar(aSource=[,,], mode='identity', k=1) {
  // 短路式 返回值
  if (mode === 'identity') {
    return new THREE.Matrix4().set(
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1,
    );
  }

  // 由source的信息 算出 对称群 {m, n}
  const [vList, eList, fList] = aSource;
  const vertexNum = vList.length;
  const faceNum = fList.length;
  const m = fList[0].length;
  const n = faceNum * m / vertexNum;

  const am = Math.PI / m, an = Math.PI / n;
  // 棱面心角
  const cos_theta_EF = Math.cos(an) / Math.sin(am);
  const a = cos_theta_EF ** 2;
  // 点面心角
  const cos_theta_VF = 1 / Math.tan(an) / Math.tan(am);
  const b = cos_theta_VF ** 2;
  // 点棱心角
  const cos_theta_VE = Math.cos(am) / Math.sin(an);
  const c = cos_theta_VE ** 2;

  if (mode === 'face') {
    return new THREE.Matrix4().set(
      1, 0, k-1, 0,
      0, 1, k-1, 0,
      0, 0, k,   0,
      0, 0, 0,   1,
    ).transpose();
  }
  else if (mode === 'edge') {
    return new THREE.Matrix4().set(
      1, k-1,    0, 0,
      0, k,      0, 0,
      0,(k-1)*a, 1, 0,
      0, 0,      0, 1,
    ).transpose();
  }
  else if (mode === 'vertex') {
    return new THREE.Matrix4().set(
       k,      0, 0, 0,
      (k-1)*c, 1, 0, 0,
      (k-1)*b, 0, 1, 0,
       0,      0, 0, 1,
    ).transpose();
  }
  else if (mode === 'triconvergency') {
    const alpha = Math.asin(PHI / SQ3);
    const theta_VE = Math.acos(cos_theta_VE);
    const s = Math.sqrt(1 - k**2) / Math.tan(alpha) / Math.tan(theta_VE);

    return new THREE.Matrix4().set(
       -s+k,  -s,-s*a, 0,
      1+s-k, 1+s, s*a, 0,
          0,   0,   1, 0,
          0,   0,   0, 1,
    )
    .multiply(Scalar(Doe, 'edge', Math.sin(alpha)));
  }
  else if (mode === 'biconvergency') {
    const alpha = 72 * Math.PI / 180;
    const theta_VF = Math.acos(cos_theta_VF);
    // 正五边形的点棱心角
    const cos_theta_5VE = Math.cos(am);
    const d = cos_theta_5VE ** 2;

    const s = -Math.sqrt(1 - k**2) / Math.tan(alpha) / Math.tan(theta_VF);

    return new THREE.Matrix4().set(
       -s+k, -s+(k-1)*d,  -s, 0,
          0,     1,        0, 0,
      1+s-k,  s-(k-1)*d, 1+s, 0,
          0,     0,        0, 1,
    )
    .multiply(Scalar(Doe, 'face', Math.sin(alpha)));
  }
}

// 由编号数组 得到 平均向量, 回复Vector3
export function vecToElement(source, sets) {
  const [vList, eList, fList] = source;

  const vecList = sets.map(i => vList[i]);

  let res = new THREE.Vector3(0, 0, 0);
  let cnt = 0;
  for (const [x, y, z] of vecList) {
    let vec = new THREE.Vector3(x, y, z);

    res = res.clone().multiplyScalar(cnt)
      .add(vec)
      .divideScalar(cnt + 1);

    cnt++;
  }

  if (res.length() < 0.001) {
    const [x0, y0, z0] = vecList[0];
    const [x1, y1, z1] = vecList[1];
    let v0 = new THREE.Vector3().set(x0, y0, z0), v1 = new THREE.Vector3(x1, y1, z1);
    res = v1.clone().cross(v0).normalize();
  }

  return res;
}

// 特定方向为基准 获取 VEF 三轴
export function getDirectionId(source, mode, ...ids) {
  const [vList, eList, fList] = source;

  let id, id2 = 0;
  if (ids.length === 1) {
    [id] = ids;
  }
  else if (ids.length === 2) {
    [id, id2] = ids;
  }

  // 逻辑有待优化, 尤其是 id id2
  let face, edge, vertex;
  if (mode === 'face') {
    face = fList[id];

    edge = [...face, face[0]].slice(id2, 2);
    vertex = edge.slice(0, 1);
  }
  else if (mode === 'edge') {
    edge = eList[id];
    vertex = edge.slice(0, 1);
    face = fList.filter(
      f => f.includes(edge[0]) && f.includes(edge[1])
    )[id2];
  }
  else if (mode === 'vertex') {
    vertex = [id];
    edge = eList.filter( e => e.includes(vertex[0]) )[id2];
    face = fList.find(
      f => f.includes(edge[0]) && f.includes(edge[1])
    );
  }

  face   = vecToElement(source, face);
  edge   = vecToElement(source, edge);
  vertex = vecToElement(source, vertex);
  return [vertex, edge, face];
}

// 由模板和 mode 名称 生成 对齐向量
export function getModeVector(source, modes, ...ids) {
  const [vList, eList, fList] = source;

  let mode, mode2 = undefined;
  if (typeof modes === 'string') {
    mode = modes; // modes: 字符串
  }
  else {
    [mode, mode2] = modes; // modes: 字符串的列表
  }

  if (mode === 'face') {
    const [vertex, edge, face] = getDirectionId(source, mode, ...ids);

    if (mode2 === undefined) {
      return [face, edge];
    }
    else if (mode2 === 'edge') {
      return [face, edge];
    }
    else if (mode2 === 'vertex') {
      return [face, vertex];
    }
  }
  else if (mode === 'edge') {
    const [vertex, edge, face] = getDirectionId(source, mode, ...ids);

    if (mode2 === undefined) {
      return [edge, vertex];
    }
    else if (mode2 === 'vertex') {
      return [edge, vertex];
    }
    else if (mode2 === 'face') {
      return [edge, face];
    }
  }
  else if (mode === 'vertex') {
    const [vertex, edge, face] = getDirectionId(source, mode, ...ids);

    if (mode2 === undefined) {
      return [vertex, face];
    }
    else if (mode2 === 'edge') {
      return [vertex, edge];
    }
    else if (mode2 === 'face') {
      return [vertex, face];
    }
  }
  else if (mode === 'triconvergency') {
    const [vertex, edge, face] = getDirectionId(source, 'edge', ...ids);

    const Vertex = edge.clone().sub(vertex);
    vertex.copy(Vertex);

    if (mode2 === undefined) {
      return [vertex, edge];
    }
  }
  else if (mode === 'biconvergency') {
    const [vertex, edge, face] = getDirectionId(source, 'vertex', ...ids);

    vertex.sub(face);

    if (mode2 === undefined) {
      return [vertex, face];
    }
  }
}

// ---- 2. 旋转 (Rotator) 矩阵 生成函数 ----
export function Rotator(aSource=[,,], bSource=[,,], aMode='identity', bMode=[,], ...ids) {
  // source 是顶点集、棱集和面集的集合
  // aSource: 形状对称群, bSource: 旋转对称群

  if (aMode === 'identity') {
    return new THREE.Matrix4().set(
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1,
    );
  }

  // 方向向量(r, u) 归一化
  let [arv, auv] = getModeVector(aSource, aMode, 0);
  arv.normalize();
  auv.normalize();

  let [brv, buv] = getModeVector(bSource, bMode, ...ids);
  brv.normalize();
  buv.normalize();

  // u => (r × u) × r, 垂直化
  let res = arv.clone().cross(auv).cross(arv).normalize();
  auv = res;
  res = brv.clone().cross(buv).cross(brv).normalize();
  buv = res;

  // t := r × u
  let atv = arv.clone().cross(auv).normalize();
  let btv = brv.clone().cross(buv).normalize();

  // 三条单位垂直坐标轴 包装为 矩阵

  // 对齐系 矩阵
  const aAxis = new THREE.Matrix4().set(
    arv.x, auv.x, atv.x, 0,
    arv.y, auv.y, atv.y, 0,
    arv.z, auv.z, atv.z, 0,
    0,     0,     0,     1,
  );
  // 目标系 矩阵
  const bAxis = new THREE.Matrix4().set(
    brv.x, buv.x, btv.x, 0,
    brv.y, buv.y, btv.y, 0,
    brv.z, buv.z, btv.z, 0,
    0,     0,     0,     1,
  )

  // B × A⁻¹ 得到 旋转矩阵
  return bAxis.clone().multiply(aAxis.clone().invert());
}

// ---- 3. 平移 (Translator) 矩阵 生成函数 ----
export function Translator(aSource=[,,], bSource=[,,], aMode='', bMode='identity', k=1, id) {
  // aSource: 形状对称群, bSource: 方向对称群

  if(bMode === 'identity') {
    return new THREE.Matrix4().set(
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1,
    );
  }

  const [aVList, aEList, aFList] = aSource;
  const [bVList, bEList, bFList] = bSource;

  let aVec = new THREE.Vector3(0, 0, 0), bVec = new THREE.Vector3(0, 0, 0);

  {
    if (aMode === 'face') {
      aVec = vecToElement(aSource, aFList[0]);
    }
    else if (aMode === 'edge') {
      aVec = vecToElement(aSource, aEList[0]);
    }
    else if (aMode === 'vertex') {
      aVec = vecToElement(aSource, [0]);
    }
  }
  {
    if (bMode === 'face') {
      bVec = vecToElement(bSource, bFList[id]);
    }
    else if (bMode === 'edge') {
      bVec = vecToElement(bSource, bEList[id]);
    }
    else if (bMode === 'vertex') {
      bVec = vecToElement(bSource, [id]);
    }
  }

  // vec, 方向是bVec, 长度是k * aVec
  const vec = bVec.clone().normalize().multiplyScalar(aVec.length() * k);

  return new THREE.Matrix4().set(
    1, 0, 0, vec.x,
    0, 1, 0, vec.y,
    0, 0, 1, vec.z,
    0, 0, 0, 1,
  );
}

// ---- addTranslator() ----
export function addTranslator(bSource, mode, ...ids) {

}