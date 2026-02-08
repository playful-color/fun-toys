import { onMounted, watch, ref } from 'vue';
import { useColorStore } from '@/stores/useColorStore';
import { usePainterStore } from '@/stores/usePainterStore';
import { useCoordinate } from '@/composables/home/useCoordinate';
import { useDrawing } from '@/composables/home/useDrawing';
import { useRendering } from '@/composables/home/useRendering';

export function usePainter({
  paintCanvas,
  isEraser,
  brushSize,
  eraserSize,
  selectedColor,
  scale,
  panX,
  panY,
  cursorPos,
  isMobile,
}) {
  const colorStore = useColorStore();
  const painterStore = usePainterStore();

  // ==================================================
  // 描画操作
  // ==================================================

  // 描画再描画のための関数（スケール、パン、描画状態に応じてキャンバスを再描画）
  const { redrawPaint } = useRendering({
    paintCanvas,
    scale,
    panX,
    panY,
    painterStore,
  });

  // 座標取得のための関数（イベントからの座標を計算）
  const { getEventPos } = useCoordinate({
    paintCanvas,
    scale,
    panX,
    panY,
  });

  // 描画操作関連の関数（描画開始、描画中、描画停止）
  const { startDrawing, draw, stopDrawing, isPainting } = useDrawing({
    paintCanvas,
    isEraser,
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

  // ==================================================
  // スケール・パン関連
  // ==================================================

  const initialScale = ref(1);

  // ==================================================
  // Undo / Redo 機能
  // ==================================================

  // Undo処理
  function undo() {
    painterStore.undo();
    redrawPaint();
  }

  // Redo処理
  function redo() {
    painterStore.redo();
    redrawPaint();
  }

  // ==================================================
  // 描画リセット
  // ==================================================
  // 描画のリセット処理
  function resetPaint() {
    painterStore.strokes = [];
    painterStore.strokeIndex = -1;
    painterStore.currentStroke = null;
    localStorage.removeItem('painterStrokes');

    if (paintCanvas?.value) {
      const ctx = paintCanvas.value.getContext('2d');
      ctx.clearRect(0, 0, paintCanvas.value.width, paintCanvas.value.height);
    }
  }

  // 初期状態の復元
  painterStore.restore();
  redrawPaint();

  // スケールやパンが変更された際の再描画
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
