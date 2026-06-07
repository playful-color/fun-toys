/**
 * 【バケツ塗り（Flood Fill）Composable】-未実装-
 * paintCanvasに色を塗り、lineCanvas（アルファ値 > 0）を境界の壁として扱う塗り分け機能。
 *
 * NOTE:
 * - スタックベースDFS（4方向探索）の実装により、スタックオーバーフローを防止。
 * - 斜めの微細な隙間は抜けてしまう可能性あり。
 * - 単純なRGBA差分（tolerance）判定のため、アンチエイリアスの境界で塗り残しが発生しやすい。
 * - putImageData による Canvas直接書き換え（不可逆操作）。Storeには操作ログのみ保存。
 *
 * TODO: scanline方式への変更（高速化）、色空間変換（精度向上）、Web Worker化を検討。
 */

import { Ref } from 'vue';
import type { Color } from '@/types/painter';
import type { usePainterStore } from '@/stores/usePainterStore';

/** Composableへの入力パラメータ */
interface UseBucketParams {
  paintCanvasRef: Ref<HTMLCanvasElement | null>;
  lineCanvasRef: Ref<HTMLCanvasElement | null>;
  painterStore: ReturnType<typeof usePainterStore>;
}

export function useBucket({
  paintCanvasRef,
  lineCanvasRef,
  painterStore,
}: UseBucketParams) {
  // --- バケツ塗り（Flood Fill）メイン処理 -------------
  const bucketFill = (
    x: number,
    y: number,
    color: Color,
    skipHistory = false
  ): void => {
    const paintCanvasEl = paintCanvasRef.value;
    const lineCanvasEl = lineCanvasRef.value;
    if (!paintCanvasEl || !lineCanvasEl) return;

    // WHY: 高頻度なピクセル読み取り（getImageData）の発生が確定しているため、ブラウザ側にソフトウェアレンダリングの最適化を促す
    const paintCtx = paintCanvasEl.getContext('2d', {
      willReadFrequently: true,
    });
    const lineCtx = lineCanvasEl.getContext('2d', { willReadFrequently: true });
    if (!paintCtx || !lineCtx) return;

    const width = paintCanvasEl.width;
    const height = paintCanvasEl.height;

    const paintData = paintCtx.getImageData(0, 0, width, height);
    const lineData = lineCtx.getImageData(0, 0, width, height);
    const data = paintData.data;
    const line = lineData.data;

    const stack: [number, number][] = [[Math.floor(x), Math.floor(y)]];
    const visited = new Uint8Array(width * height);

    const fillR = color.r;
    const fillG = color.g;
    const fillB = color.b;
    const fillA = Math.floor(color.a * 255);

    const startIndex = (Math.floor(y) * width + Math.floor(x)) * 4;
    const startR = data[startIndex];
    const startG = data[startIndex + 1];
    const startB = data[startIndex + 2];
    const startA = data[startIndex + 3];

    // WHY: 走査中のピクセルが境界（壁）に触れているか、または塗り対象の同系色かを高速に判定するインライン関数
    const matchColor = (i: number): boolean => {
      // WHY: lineCanvasのalphaを境界として扱い、絶対に塗らない
      if (line[i + 3] > 0) return false;

      // WHY: 完全透明領域は新規領域として塗り対象
      if (data[i + 3] === 0) return true;

      const tolerance = 10;

      // WHY: 完全一致ではなく誤差許容で自然な塗り領域を作る
      return (
        Math.abs(data[i] - startR) <= tolerance &&
        Math.abs(data[i + 1] - startG) <= tolerance &&
        Math.abs(data[i + 2] - startB) <= tolerance &&
        Math.abs(data[i + 3] - startA) <= tolerance
      );
    };

    // --- Flood Fill 走査ループ（スタックDFS） -----------
    while (stack.length) {
      const [px, py] = stack.pop()!;
      if (px < 0 || py < 0 || px >= width || py >= height) continue;

      const idx = py * width + px;
      if (visited[idx]) continue;
      visited[idx] = 1;

      const i = idx * 4;
      if (!matchColor(i)) continue;

      data[i] = fillR;
      data[i + 1] = fillG;
      data[i + 2] = fillB;
      data[i + 3] = fillA;

      // WHY: 4方向探索で領域を拡張（スタック方式によりJavaScriptの最大再帰エラーを確実に回避）
      stack.push([px + 1, py]);
      stack.push([px - 1, py]);
      stack.push([px, py + 1]);
      stack.push([px, py - 1]);
    }

    paintCtx.putImageData(paintData, 0, 0);

    // --- 履歴保存（Undo / Redo同期） -------------------
    if (!skipHistory) {
      painterStore.addAction({
        type: 'bucket',
        startPoint: { x, y },
        fillColor: color,
      });
    }
  };

  return { bucketFill };
}
