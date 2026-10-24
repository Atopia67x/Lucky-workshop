/**
 * 文件: js/core/renderer.js
 * 核心渲染, 接收 几何数据和变换矩阵, 生成 Three.js 的 Group。
 */

import * as THREE from 'three';
import { WHITE, lightenColor } from '../data/constants.js';
import { affined } from '../core/transform.js';

// spawnedGroupsC / spawnedGroupsF / spawnedGroupsV 分别记录三套场景中生成的 group
export const spawnedGroupsC = [];
export const spawnedGroupsF = [];
export const spawnedGroupsV = [];

// 生成顶点 (?)
// target 为 { scene, spawnedGroups } 形式的承载对象
export function showPoints(vertices, vertexColor, target) {
  const { scene, spawnedGroups } = target;

  const sphereGeo = new THREE.SphereGeometry(0.08, 8, 6);
  const sphereMat = new THREE.MeshBasicMaterial({
    color: vertexColor
  });
  const inst = new THREE.InstancedMesh(sphereGeo, sphereMat, vertices.length);

  const matrix = new THREE.Matrix4();
  vertices.forEach((v, i) => {
    matrix.setPosition(...v);
    inst.setMatrixAt(i, matrix);
  });
  scene.add(inst);
}

// 生成几何体连线
// target 为 { scene, spawnedGroups } 形式的承载对象
export function makeShapeTransformed(source, scalar, rotator, translator, opts = {}, target) {
  const [vList, eList, fList] = source;
  const { scene, spawnedGroups } = target;

  /*
    colormode === 0 时传面、棱、点的颜色;
    colormode === 1 时传每个面的颜色数组.
  */
  const {
    colormode,
    colours = WHITE,
    showEdges = true,
    showVertices = true,
    name = 'unnamed',
  } = opts;
  let faceColor, edgeColor, vertexColor;
  if (colormode === 0) {
    if (typeof colours === 'number') {
      [faceColor, edgeColor, vertexColor] = [colours, lightenColor(colours, 0.2), colours];
    }
    else {
      [faceColor, edgeColor, vertexColor] = colours;
    }
  }
  else if (colormode === 1) {
    faceColor = colours;
  }
  //showEdges = false;

  const aff = affined(source).clone(); // 坐标系 转换矩阵
  const affinv = aff.clone().invert();

  // A = T R D⁻¹ S D
  const transformer = translator.clone()
    .multiply(rotator)
    .multiply(affinv)
    .multiply(scalar)
    .multiply(aff);

  const newVertices = vList.map(v => {
    const p = new THREE.Vector3(v[0], v[1], v[2]);
    p.applyMatrix4(transformer);
    return [p.x, p.y, p.z];
  });

  const group = new THREE.Group();
  group.name = name;

  // 渲染顶点
  if (showVertices) {
    const pg = new THREE.BufferGeometry();
    const arr = new Float32Array(newVertices.length * 3);
    newVertices.forEach((v, i) => {
      arr[i*3] = v[0]; arr[i*3+1] = v[1]; arr[i*3+2] = v[2];
    });
    pg.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    group.add(new THREE.Points(pg, new THREE.PointsMaterial({
      color: vertexColor, size: 6, sizeAttenuation: false,
    })));
  }

  // 渲染棱（圆柱体）
  if (showEdges) {
    const edgeMat = new THREE.MeshStandardMaterial({
      color: edgeColor, metalness: 0.3, roughness: 0.6,
    });
    const up = new THREE.Vector3(0, 1, 0);
    const R = 0.02;

    for (const [i, j] of eList) {
      const a = new THREE.Vector3(...newVertices[i]);
      const b = new THREE.Vector3(...newVertices[j]);
      const dir = new THREE.Vector3().subVectors(b, a);
      const len = dir.length();
      const cyl = new THREE.Mesh(
        new THREE.CylinderGeometry(R, R, len, 8), edgeMat
      );
      cyl.position.copy(a).addScaledVector(dir, 0.5);
      cyl.quaternion.setFromUnitVectors(up, dir.clone().normalize());
      group.add(cyl);
    }
  }

  // 渲染面：每个面独立一个 mesh，颜色来自 faceColor
  for (let fi = 0; fi < fList.length; fi++) {
    const f = fList[fi];
    let color;
    if (colormode === 0) {
      color = faceColor;
    } else if (colormode === 1) {
      color = faceColor[fi];
    }

    const fpos = [], fnrm = [];
    const p0 = new THREE.Vector3(...newVertices[f[0]]);
    const p1 = new THREE.Vector3(...newVertices[f[1]]);
    const p2 = new THREE.Vector3(...newVertices[f[2]]);
    const n = new THREE.Vector3()
      .subVectors(p1, p0)
      .cross(new THREE.Vector3().subVectors(p2, p0)).normalize();

    const center = new THREE.Vector3(
      f.reduce((s, i) => s + newVertices[i][0], 0) / f.length,
      f.reduce((s, i) => s + newVertices[i][1], 0) / f.length,
      f.reduce((s, i) => s + newVertices[i][2], 0) / f.length,
    );
    if (n.dot(center) < 0) n.negate();

    for (let k = 1; k < f.length - 1; k++) {
      const a = new THREE.Vector3(...newVertices[f[0]]);
      const b = new THREE.Vector3(...newVertices[f[k]]);
      const c = new THREE.Vector3(...newVertices[f[k + 1]]);
      const cross = new THREE.Vector3()
        .subVectors(b, a)
        .cross(new THREE.Vector3().subVectors(c, a));
      if (cross.dot(n) < 0) {
        fpos.push(a.x, a.y, a.z, c.x, c.y, c.z, b.x, b.y, b.z);
      } else {
        fpos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
      }
      fnrm.push(n.x, n.y, n.z, n.x, n.y, n.z, n.x, n.y, n.z);
    }

    const fg = new THREE.BufferGeometry();
    fg.setAttribute('position', new THREE.Float32BufferAttribute(fpos, 3));
    fg.setAttribute('normal',   new THREE.Float32BufferAttribute(fnrm, 3));

    const fm = new THREE.MeshStandardMaterial({
      color: color,
      metalness: 0.0, roughness: 0.7,
      flatShading: true, side: THREE.DoubleSide,
    });

    group.add(new THREE.Mesh(fg, fm));
  }

  scene.add(group);
  spawnedGroups.push(group);
  return { vList: newVertices, eList, fList, group };
}

// 删除名为name的对象
// target 为 { scene, spawnedGroups }
export function deletes(name, target) {
  const { scene, spawnedGroups } = target;
  const targets = scene.children.filter(c => c.name === name);
  for (const g of targets) {
    scene.remove(g);
    // 释放内存
    g.traverse(o => {
      if (o.geometry) o.geometry.dispose()
      if (o.material) {
        if (Array.isArray(o.material))
          o.material.forEach(m => m.dispose());
        else o.material.dispose();
      }
    });
    // 从 spawnedGroups 中同步移除
    const idx = spawnedGroups.indexOf(g);
    if (idx !== -1) spawnedGroups.splice(idx, 1);
  }
  return 0;
}

// 清空某套场景中由 makeShapeTransformed 生成的全部 group
// target 为 { scene, spawnedGroups }
export function clearSpawned(target) {
  const { scene, spawnedGroups } = target;
  for (const g of [...spawnedGroups]) {
    scene.remove(g);
    g.traverse(o => {
      if (o.geometry) o.geometry.dispose()
      if (o.material) {
        if (Array.isArray(o.material))
          o.material.forEach(m => m.dispose());
        else o.material.dispose();
      }
    });
  }
  spawnedGroups.length = 0;
}