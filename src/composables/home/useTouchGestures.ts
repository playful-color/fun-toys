/**
 * 【タッチジェスチャー制御 Composable】
 * 1本指での描画と、2本指でのピンチズーム（拡大縮小・移動）の挙動を競合させずにマルチタッチ制御する。
 *
 * NOTE:
 * - ピンチ操作中は描画処理を完全に抑止し、ストロークをキャンセル（pendingDrawの解除）する。
 * - タッチ終了時（touchend / touchcancel）に必ず内部状態をリセットし、次の操作への干渉を防ぐ。
 * - ブラウザ固有のジェスチャー動作（ピンチイン/アウトによる画面ズーム等）を `preventDefault` で厳格に制御。
 *
 * TODO: 状態を単一state（状態遷移図モデル）にまとめることで分岐を削減、またはジェスチャー層の完全分離。
 */

import { ref, Ref } from 'vue';
import type { Point } from '@/types/painter';

type PinchCenter = Point;

/** Composableへの入力：描画・カーソル制御関数、およびリアクティブな画面表示状態 */
interface UseTouchGesturesParams {
  paintCanvas: Ref<HTMLCanvasElement | null>;
  startDrawing: (e: TouchEvent) => void;
  draw: (e: TouchEvent) => void;
  stopDrawing: () => void;
  isPainting: Ref<boolean>;
  updateCursorPosition: (
    e: TouchEvent,
    options: { canvasRect: DOMRect; panX: number; panY: number; scale: number }
  ) => void;
  hideCursor: () => void;
  panX: Ref<number>;
  panY: Ref<number>;
  scale: Ref<number>;
  clampPan: () => void;
}

export function useTouchGestures({
  paintCanvas,
  startDrawing,
  draw,
  stopDrawing,
  isPainting,
  updateCursorPosition,
  hideCursor,
  panX,
  panY,
  scale,
  clampPan,
}: UseTouchGesturesParams) {
  // 状態管理：ジェスチャー判定用の一時キャッシュ
  const pendingDraw = ref<boolean>(false);
  const isPinching = ref<boolean>(false);
  const lastPinchDistance = ref<number | null>(null);
  const lastPinchCenter = ref<PinchCenter | null>(null);

  // --- 内部数学ユーティリティ -------------------------

  // WHY: 2本指の開き具合（距離）を計算して、前フレームからの拡大縮小の比率を導き出すため
  const getPinchDistance = (touches: TouchList): number => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // WHY: 2本の指の真ん中（重心）を算出し、そこを基準点としてキャンバスをズーム（拡大中心点）させるため
  const getPinchCenter = (touches: TouchList): PinchCenter => {
    if (touches.length < 2) return { x: 0, y: 0 };
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2,
    };
  };

  // --- タッチイベントハンドラ -------------------------
  const handleTouchStart = (e: TouchEvent): void => {
    if (!paintCanvas.value) return;

    if (e.touches.length === 1) {
      pendingDraw.value = true;

      updateCursorPosition(e, {
        canvasRect: paintCanvas.value.getBoundingClientRect(),
        panX: panX.value,
        panY: panY.value,
        scale: scale.value,
      });
    } else if (e.touches.length === 2) {
      // WHY: スマートフォンブラウザ固有の「画面全体のピンチズーム」が誤発火して操作を阻害するのを防ぐ
      e.preventDefault();

      hideCursor();
      pendingDraw.value = false; // WHY: 描画しようとした瞬間に2本目の指が触れた場合、描画判定をキャンセルしてズームを優先する

      if (!isPainting.value) {
        isPinching.value = true;
        lastPinchDistance.value = getPinchDistance(e.touches);
        lastPinchCenter.value = getPinchCenter(e.touches);
      }
    }
  };

  const handleTouchMove = (e: TouchEvent): void => {
    if (!paintCanvas.value) return;

    const touchCount = e.touches.length;

    // WHY: 描画処理が走るのを完全にブロックし、拡大縮小・画面移動の操作を最優先で安定させるため
    if (isPinching.value && touchCount === 2) {
      handlePinch(e);
      return;
    }

    if (pendingDraw.value && touchCount === 1) {
      const rect = paintCanvas.value.getBoundingClientRect();
      updateCursorPosition(e, {
        canvasRect: rect,
        panX: panX.value,
        panY: panY.value,
        scale: scale.value,
      });
    }

    if (pendingDraw.value && touchCount === 1 && !isPinching.value) {
      pendingDraw.value = false;
      const rect = paintCanvas.value.getBoundingClientRect();

      updateCursorPosition(e, {
        canvasRect: rect,
        panX: panX.value,
        panY: panY.value,
        scale: scale.value,
      });

      startDrawing(e);
    }

    if (isPainting.value && !isPinching.value) {
      const rect = paintCanvas.value.getBoundingClientRect();

      updateCursorPosition(e, {
        canvasRect: rect,
        panX: panX.value,
        panY: panY.value,
        scale: scale.value,
      });

      draw(e);
      return;
    }
  };

  const handlePinch = (e: TouchEvent): void => {
    e.preventDefault();
    e.stopPropagation();

    if (lastPinchDistance.value == null || lastPinchCenter.value == null)
      return;

    const newDistance = getPinchDistance(e.touches);
    const newCenter = getPinchCenter(e.touches);

    const delta = newDistance / lastPinchDistance.value;
    let newScale = scale.value * delta;

    // NOTE: キャンバスが小さくなりすぎたり無限に大きくなったりして画面外へ消え去る（暴走）のを防ぐ閾値
    newScale = Math.max(1, Math.min(3, newScale));

    const ratio = newScale / scale.value;

    // WHY: 画面上の「指の間の中央」にキャンバスの絵を固定したまま拡大・縮小させるための幾何学補正計算
    panX.value = (panX.value - lastPinchCenter.value.x) * ratio + newCenter.x;
    panY.value = (panY.value - lastPinchCenter.value.y) * ratio + newCenter.y;

    scale.value = newScale;
    clampPan();

    lastPinchDistance.value = newDistance;
    lastPinchCenter.value = newCenter;
  };

  const handleTouchEnd = (e: TouchEvent): void => {
    // WHY: 指が離れた瞬間に「描画待ち」フラグを折ることで、意図しない判定の残留を防ぐ
    pendingDraw.value = false;

    if (e.touches.length === 0) {
      isPinching.value = false;
      lastPinchDistance.value = null;
      lastPinchCenter.value = null;

      if (isPainting.value) {
        hideCursor();
        stopDrawing();
      }
    }
  };

  return {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  };
}
