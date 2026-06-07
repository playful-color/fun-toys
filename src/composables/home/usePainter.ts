/**
 * 【Painter操作・総合制御 Composable】
 * 描画・座標変換・再生成の各子モジュールを統合し、Undo/Redoやズーム/パンを統括する最上部レイヤー。
 *
 * NOTE:
 * - `scale / panX / panY` の変更を `watch` で一括監視し、自動で全体の再構築（redrawPaint）を実行。
 * - `resetPaint` は Store / Canvas / localStorage を跨いで同期初期化する。
 * - UI層は状態を持たず、Undo/Redoも含めて Store の `actionIndex` 制御に完全依存。
 *
 * TODO: currentAction の null 管理徹底による描画残留バグ防止、resetPaintのStore移行、ズーム・パンの履歴管理。
 */
import { onMounted, watch, ref, Ref } from 'vue';
import type { Color, Point, BrushType } from '@/types/painter';
import { useColorStore } from '@/stores/useColorStore';
import { usePainterStore } from '@/stores/usePainterStore';
import { useCoordinate } from '@/composables/home/useCoordinate';
import { useDrawing } from '@/composables/home/useDrawing';
import { useRendering } from '@/composables/home/useRendering';

/** 総合制御レイヤー（usePainter）への入力：ブラシ設定、キャンバス状態、各種操作モードの同期パラメータ */
export interface UsePainterOptions {
  paintCanvas: Ref<HTMLCanvasElement | null>;
  isEraser: Ref<boolean>;
  brushType: Ref<BrushType>;
  brushSize: Ref<number>;
  eraserSize: Ref<number>;
  selectedColor: Ref<Color>;
  scale: Ref<number>;
  panX: Ref<number>;
  panY: Ref<number>;
  cursorPos: Ref<Point>;
  isMobile: Ref<boolean>;
}

export function usePainter({
  paintCanvas,
  isEraser,
  brushType,
  brushSize,
  eraserSize,
  scale,
  panX,
  panY,
  cursorPos,
  isMobile,
}: UsePainterOptions) {
  const colorStore = useColorStore();
  const painterStore = usePainterStore();

  // --- サブモジュール初期化（描画・座標・操作） ---------
  const { redrawPaint } = useRendering({
    paintCanvas,
    scale,
    panX,
    panY,
    painterStore,
  });

  const { getEventPos } = useCoordinate({
    paintCanvas,
    scale,
    panX,
    panY,
  });

  const { startDrawing, draw, stopDrawing, isPainting } = useDrawing({
    paintCanvas,
    isEraser,
    brushType,
    brushSize,
    eraserSize,
    scale,
    panX,
    panY,
    colorStore,
    painterStore,
    cursorPos,
    isMobile,
    getEventPos,
  });

  // --- スケール基準値 --------------------------------
  const initialScale = ref<number>(1);

  // --- Undo / Redo ----------------------------------
  const undo = (): void => {
    painterStore.undo();
    redrawPaint();
  };

  const redo = (): void => {
    painterStore.redo();
    redrawPaint();
  };

  // --- リセット --------------------------------------
  const resetPaint = (): void => {
    painterStore.actions = [];
    painterStore.actionIndex = -1;

    localStorage.removeItem('painterActions');

    if (!paintCanvas.value) return;

    const ctx = paintCanvas.value.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, paintCanvas.value.width, paintCanvas.value.height);
  };

  // --- 初期化処理 ------------------------------------
  painterStore.restore();
  redrawPaint();

  watch([scale, panX, panY], redrawPaint);

  onMounted(() => {
    initialScale.value = scale.value;
  });

  return {
    isPainting,
    startDrawing,
    draw,
    stopDrawing,
    undo,
    redo,
    resetPaint,
  };
}
