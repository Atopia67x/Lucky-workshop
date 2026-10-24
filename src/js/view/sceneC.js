/**
 * 文件: js/views/sceneC.js
 * 实现 生成 120cell-C 场景的几何对象与建造逻辑
 * 建造过程 · 删除过程 · 增量更新 · 建造循环
 */

import { PHI, SQ5, PH2, colorSet1 } from '../data/constants.js';
const [YELLOW_1, GREEN_1, BLUE_1, PURPLE_1, WHITE] = colorSet1;

import { Doe } from '../data/shapes.js';
import { Scalar, Rotator, Translator } from '../core/transform.js';
import { makeShapeTransformed, deletes, spawnedGroupsC } from '../core/renderer.js';

const startList = [
  [4, 10], [4, 11], [4, 12], [4, 13], [4, 14],
  [4, 15], [4, 16], [4, 17], [4, 18], [4, 19],
  [4, 20], [4, 21], [4, 22], [4, 23], [4, 24],
  [4, 25], [4, 26], [4, 27], [4, 28], [4, 29],
];
const showList = [
  [3, 11],
  [2, 17], [2, 18], [2, 19], [2, 15], [2, 16],
  [3, 7],  [3, 8],  [3, 9],  [3, 10], [3, 6],
  [1, 11],
  [2, 10], [2, 11], [2, 12], [2, 13], [2, 14],
  [1, 7],  [1, 8],  [1, 9],  [1, 10], [1, 6],
  [2, 6],  [2, 5],  [2, 9],  [2, 8],  [2, 7],
  [0, 0],

  [1, 1],  [1, 2],  [1, 5],  [1, 4],  [1, 3],
  [3, 3],  [3, 2],  [3, 1],  [3, 5],  [3, 4],
  [1, 0],
  [2, 1],  [2, 0],  [2, 4],  [2, 3],  [2, 2],
  [3, 0],
];

const colorName = ['yellow', 'green', 'blue', 'purple', 'white'];
let shownCountC = 0;

// 新建 Doe (261010 重构)
function makeDoe(layer, target, id) {
  let scale, rotate, translate;

  if (layer === 0) {
    return makeShapeTransformed(
      Doe,
      Scalar(),
      Rotator(),
      Translator(),
      {
        colormode: 0,
        colours: YELLOW_1,
        showEdges: 1,
        showVertices: 0,
        name: 'yellow' + id,
      },
      target,
    );
  }
  else if (layer === 1) {
    return makeShapeTransformed(
      Doe,
      Scalar(Doe, 'face', PHI / 2),
      Rotator(Doe, Doe, 'face', ['face', 'vertex'], id),
      Translator(Doe, Doe, 'face', 'face', SQ5 * PHI / 2, id),
      {
        colormode: 0,
        colours: GREEN_1,
        showEdges: 1,
        showVertices: 0,
        name: 'green' + id,
      },
      target,
    );
  }
  else if (layer === 2) {
    return makeShapeTransformed(
      Doe,
      Scalar(Doe, 'vertex', 1 / 2),
      Rotator(Doe, Doe, 'vertex', ['vertex', 'edge'], id),
      Translator(Doe, Doe, 'vertex', 'vertex', (PHI ** 3) / 2, id),
      {
        colormode: 0,
        colours: BLUE_1,
        showEdges: 1,
        showVertices: 0,
        name: 'blue' + id,
      },
      target,
    );
  }
  else if (layer === 3) {
    return makeShapeTransformed(
      Doe,
      Scalar(Doe, 'face', 1 / 2 / PHI),
      Rotator(Doe, Doe, 'face', ['face', 'edge'], id),
      Translator(Doe, Doe, 'face', 'face', SQ5 * (PHI ** 2) / 2, id),
      {
        colormode: 0,
        colours: PURPLE_1,
        showEdges: 1,
        showVertices: 0,
        name: 'purple' + id,
      },
      target,
    );
  }
  else if (layer === 4) {
    return makeShapeTransformed(
      Doe,
      Scalar(Doe, 'edge', 0),
      Rotator(Doe, Doe, 'edge', ['edge', 'face'], id),
      Translator(Doe, Doe, 'edge', 'edge', PH2 + 0.001, id),
      {
        colormode: 0,
        colours: WHITE,
        showEdges: 1,
        showVertices: 0,
        name: 'white' + id,
      },
      target,
    );
  }
}

// ---- 建造过程 ----
// isValid 为外部传入的令牌校验函数，返回 false 时提前结束
async function createDoe(sleep, T=200, isValid=()=>true, target) {
  if (!isValid()) return;
  for (const [k, i] of startList) {
    makeDoe(k, target, i);
  }

  if (T !== 0) {
    await sleep(25 * T);
  }
  if (!isValid()) return;

  for (const [k, i] of showList) {
    if (!isValid()) return;
    if(k !== 0) {
      if (T !== 0) {
        await sleep(T);
      }
    }
    if (!isValid()) return;
    makeDoe(k, target, i);
    if(k !== 0) {
      if (T !== 0) {
        await sleep(T);
      }
    }
  }
}

// ---- 删除过程 -----
// isValid 为外部传入的令牌校验函数，返回 false 时提前结束
async function rewind(sleep, T=200, isValid=()=>true, target) {
  if (T !== 0) {
    await sleep(10 * T);
  }
  if (!isValid()) return;

  for (const [k, i] of [...showList].reverse()) {
    if (!isValid()) return;
    if(k !== 0) {
      if(T !== 0) {
        await sleep(T);
      }
    }
    if (!isValid()) return;
    deletes(colorName[k] + i, target);
    if(k !== 0) {
      if (T !== 0) {
        await sleep(T);
      }
    }
  }
}

// ---- 增量更新 ----
// n 为新的前缀项数
// 先补足 startList 中缺失的项, 再在 showList 上按差值增删
export function renderCIncremental(n, target) {
  const count = Math.max(0, Math.min(n, showList.length));

  // 若 C 场景为空, 先补上 startList 的初始项
  if (spawnedGroupsC.length === 0) {
    for (const [k, i] of startList) {
      makeDoe(k, target, i);
    }
  }

  // 目标大于当前: 只补 showList 中新增的部分
  if (count > shownCountC) {
    for (let j = shownCountC; j < count; j++) {
      const [k, i] = showList[j];
      makeDoe(k, target, i);
    }
  }
  // 目标小于当前: 只删 showList 中多余的尾部项
  else if (count < shownCountC) {
    for (let j = shownCountC - 1; j >= count; j--) {
      const [k, i] = showList[j];
      deletes(colorName[k] + i, target);
    }
  }

  shownCountC = count;
}

// isActRunning 表示 act 循环是否处于活动状态
let isActRunning = false;
// actToken 为每次启动 act 循环分配的代次；循环内校验令牌以淘汰旧的循环
let actToken = 0;

// myToken 为本次 act 循环的代次
// isValid 校验令牌与运行标志，令牌不匹配说明该循环已被取代
export async function act(myToken, sleep, target) {
  const isValid = () => isActRunning && actToken === myToken;
  while (isValid()) {
    await createDoe(sleep, 200, isValid, target);
    if (!isValid()) break;
    await sleep(500);
    if (!isValid()) break;
    await rewind(sleep, target, 200, isValid);
    if (!isValid()) break;
    await sleep(500);
  }
}

// 启动 120cell-C 的建造循环
export function startAct(sleep, target) {
  if (isActRunning) return;
  isActRunning = true;
  actToken++;
  act(actToken, sleep, target);
}

// 停止 120cell-C 的建造循环
export function stopAct() {
  isActRunning = false;
  actToken++;
}