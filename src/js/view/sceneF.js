/**
 * 文件: js/views/sceneF.js
 * 实现 生成 120cell-F 场景的几何对象
 */

import { PHI, PH2, SQ1P2, colorSet1 } from '../data/constants.js';
const [YELLOW_1, GREEN_1, BLUE_1, PURPLE_1, WHITE] = colorSet1;

import { Doe, Peg } from '../data/shapes.js';
import { Scalar, Rotator, Translator } from '../core/transform.js';
import { makeShapeTransformed } from '../core/renderer.js';

export function makePegs(layer, target, ...ids) {
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
      Scalar(Doe, 'face', SQ1P2 / 2),
      Rotator(Doe, Peg, 'face', ['face', 'vertex'], ...ids),
      Translator(Doe, Peg, 'face', 'face', SQ1P2 / 2, ...ids),
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
      Scalar(Doe, 'edge', PHI / SQ1P2),
      Rotator(Doe, Peg, 'edge', ['edge', 'vertex'], ...ids),
      Translator(Doe, Peg, 'edge', 'edge', PH2 / SQ1P2, ...ids),
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
  else if (layer === 2) {
    return makeShapeTransformed(
      Doe,
      Scalar(Doe, 'edge', 1 / SQ1P2),
      Rotator(Doe, Peg, 'edge', ['vertex', 'face'], ...ids),
      Translator(Doe, Peg, 'edge', 'vertex', PHI ** 3 / SQ1P2, ...ids),
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
  else if (layer === 3) {
    return makeShapeTransformed(
      Doe,
      Scalar(Doe, 'biconvergency', 1 / SQ1P2),
      Rotator(Doe, Peg, 'biconvergency', ['edge', 'face'], ...ids),
      Translator(Doe, Peg, 'face', 'edge', PHI ** 3 / SQ1P2 * 2, ...ids),
      {
        colormode: 0,
        colours: YELLOW_1,
        showEdges: 1,
        showVertices: 0,
        name: 'yellow' + idName,
      },
      target,
    );
  }
}

export function makeFScene(target) {
  /*makeShapeTransformed(
    Peg,
    Scalar(),
    Rotator(),
    Translator(),
    {
      colormode: 0,
      colours: [WHITE, WHITE, WHITE],
      showEdges: 1,
      showVertices: 0,
      name: 'white' + '0',
    },
    target,
  );*/
  makePegs(0, target, 0); makePegs(0, target, 1);
  makePegs(1, target, 0); makePegs(1, target, 1); makePegs(1, target, 2); makePegs(1, target, 3); makePegs(1, target, 4);
  makePegs(2, target, 0); makePegs(2, target, 1); makePegs(2, target, 2); makePegs(2, target, 3); makePegs(2, target, 4);
  makePegs(3, target, 0, 0); makePegs(3, target, 0, 1); makePegs(3, target, 1, 0); makePegs(3, target, 1, 1);
}