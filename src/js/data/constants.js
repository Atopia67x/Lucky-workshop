/**
 * 文件: js/data/constants.js
 * 包含 全局颜色 · 颜色处理工具函数 · 数学常量
 */

// ============================================================
// a.0. 颜色
// ============================================================
export const WHITE = 0xffffff
export const GRAY_ = 0xcccccc
export const GRAY  = 0x888888
export const BLACK = 0x000000

const YELLOW_1 = 0xe8e23a
const GREEN_1  = 0x8a9a5b
const BLUE_1   = 0x7ec8D8
const PURPLE_1 = 0xc9b8e0

export const colorSet1 = [YELLOW_1, GREEN_1, BLUE_1, PURPLE_1, WHITE];

export const GREEN_G  = 0xa8d88b
export const WHITE_G  = 0xffffff
export const PURPLE_G = 0xc9b8e0
export const BLUE_G   = 0x8bcae8
export const YELLOW_G = 0xf5e6a3
export const PINK_G   = 0xf0c8d8

// 颜色变亮
// t: 0 不变, 1 全白
export function lightenColor(c, t = 0.3) {
  const r = (c >> 16) & 0xff;
  const g = (c >>  8) & 0xff;
  const b =  c        & 0xff;
  const k = Math.max(0, Math.min(1, t));
  const R = Math.round(r + (255 - r) * k);
  const G = Math.round(g + (255 - g) * k);
  const B = Math.round(b + (255 - b) * k);
  return (R << 16) | (G << 8) | B;
}

// ============================================================
// a.1. 基础 数学常量
// ============================================================
export const PHI = (1 + Math.sqrt(5)) / 2;
export const PH2 = PHI ** 2;
export const SQ5 = Math.sqrt(5);
export const SQ1P2 = Math.sqrt(1 + PH2);
export const SQ3 = Math.sqrt(3);
export const SQ2 = Math.sqrt(2);
export const SQ8 = Math.sqrt(8);