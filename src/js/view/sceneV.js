/**
 * 文件: js/views/sceneV.js
 * 实现 生成 120cell-V 场景的几何对象
 */

import { PHI, PH2, SQ5, SQ3, SQ2, SQ8, colorSet1 } from '../data/constants.js';
const [YELLOW_1, GREEN_1, BLUE_1, PURPLE_1, WHITE] = colorSet1;

import { Doe, Tet } from '../data/shapes.js';
import { Scalar, Rotator, Translator } from '../core/transform.js';
import { makeShapeTransformed } from '../core/renderer.js';

// 260605 试验
export function makeTet(layer, target, ...ids) {
  let idName;
  if (ids.length === 1) {
    idName = String(ids[0]);
  }
  else if (ids.length === 2) {
    idName = String(ids[0]) + String(ids[1]);
  }

  if (layer === 0) {
    return makeShapeTransformed(
      Doe,
      Scalar(Doe, 'vertex', PH2 / SQ8),
      Rotator(Doe, Tet, 'vertex', ['vertex', 'face'], ...ids),
      Translator(Doe, Tet, 'vertex', 'vertex', PH2 / SQ8, ...ids),
      {
        colormode: 0,
        colours: WHITE,
        showEdges: 1,
        showVertices: 0,
        name: 'white' + idName,
      },
      target,
    );
  }
  else if (layer === 1) {
    return makeShapeTransformed(
      Doe,
      Scalar(Doe, 'vertex', SQ5 / SQ8),
      Rotator(Doe, Tet, 'vertex', ['face', 'edge'], ...ids),
      Translator(Doe, Tet, 'vertex', 'face', PHI ** 3 / SQ8, ...ids),
      {
        colormode: 0,
        colours: GREEN_1,
        showEdges: 1,
        showVertices: 0,
        name: 'green' + idName,
      },
      target,
    );
  }
  else if (layer === 2) {
    return makeShapeTransformed(
      Doe,
      Scalar(Doe, 'edge', 1 / SQ2),
      Rotator(Doe, Tet, 'edge', ['edge', 'face'], ...ids),
      Translator(Doe, Tet, 'edge', 'edge', PH2 / SQ2, ...ids),
      {
        colormode: 0,
        colours: BLUE_1,
        showEdges: 1,
        showVertices: 0,
        name: 'blue' + idName,
      },
      target,
    );
  }
  else if (layer === 3) {
    return makeShapeTransformed(
      Doe,
      Scalar(Doe, 'triconvergency', SQ3 / SQ8),
      Rotator(Doe, Tet, 'triconvergency', ['vertex', 'edge'], ...ids),
      Translator(Doe, Tet, 'vertex', 'vertex', 2 * PHI / SQ2, ...ids),
      {
        colormode: 0,
        colours: PURPLE_1,
        showEdges: 1,
        showVertices: 0,
        name: 'purple' + idName,
      },
      target,
    );
  }
  /*
  else if (layer === 4) {
    return makeShapeTransformed(
      Doe,
      Scalar(Doe, 'edge', 0),
      Rotator(Doe, Doe, 'edge', ['edge', 'face'], ids),
      Translator(Doe, Doe, 'edge', PHI ** 2 + 0.001, ...ids),
      {
        colormode: 0,
        colours: WHITE,
        showEdges: 1,
        showVertices: 0,
        name: 'white' + idName,
      },
    );
  }*/
}

export function makeVScene(target) {
  {
    makeTet(0, target, 0); makeTet(0, target, 1); makeTet(0, target, 2); makeTet(0, target, 3);
    makeTet(1, target, 0); makeTet(1, target, 1); makeTet(1, target, 2); makeTet(1, target, 3);
    makeTet(2, target, 0); makeTet(2, target, 1); makeTet(2, target, 2); makeTet(2, target, 3); makeTet(2, target, 4); makeTet(2, target, 5);
  }
  makeTet(3, target, 0, 0); //makeTet(3, target, 0, 1); makeTet(3, target, 0, 2);
  //makeTet(3, target, 1, 0); makeTet(3, target, 1, 1); makeTet(3, target, 1, 2);
  //makeTet(3, target, 2, 0); makeTet(3, target, 2, 1); makeTet(3, target, 2, 2);
  //makeTet(3, target, 3, 0); makeTet(3, target, 3, 1); makeTet(3, target, 3, 2);
}