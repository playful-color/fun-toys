//usePainter.ts
import { onMounted, watch, ref, Ref } from 'vue';
import { useColorStore } from '@/stores/useColorStore';
import { usePainterStore } from '@/stores/usePainterStore';
import { useCoordinate } from '@/composables/home/useCoordinate';
import { useDrawing } from '@/composables/home/useDrawing';
import { useRendering } from '@/composables/home/useRendering';

interface UsePainterOptions {
  paintCanvas: Ref<HTMLCanvasElement | null>;
  isEraser: Ref<boolean>;
  brushType: Ref<'normal' | 'marker'>;
  brushSize: Ref<number>;
  eraserSize: Ref<number>;
  selectedColor: Ref<{
    r: number;
    g: number;
    b: number;
    a: number;
  }>;
  scale: Ref<number>;
  panX: Ref<number>;
  panY: Ref<number>;
  cursorPos: Ref<{ x: number; y: number }>;
  isMobile: Ref<boolean>;
}

export function usePainter({
  paintCanvas,
  isEraser,
  brushType,
  brushSize,
  eraserSize,
  selectedColor,
  scale,
  panX,
  panY,
  cursorPos,
  isMobile,
}: UsePainterOptions) {
  const colorStore = useColorStore();
  const painterStore = usePainterStore();

  // ==================================================
  // 描画再描画
  // ==================================================
  const { redrawPaint } = useRendering({
    paintCanvas,
    scale,
    panX,
    panY,
    painterStore,
  });

  // ==================================================
  // 座標取得
  // ==================================================
  const { getEventPos } = useCoordinate({
    paintCanvas,
    scale,
    panX,
    panY,
  });

  // ==================================================
  // 描画操作
  // ==================================================
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

  // ==================================================
  // スケール・パン
  // ==================================================
  const initialScale = ref<number>(1);

  // ==================================================
  // Undo / Redo
  // ==================================================
  const undo = (): void => {
    painterStore.undo();
    redrawPaint();
  };

  const redo = (): void => {
    painterStore.redo();
    redrawPaint();
  };

  // ==================================================
  // 描画リセット
  // ==================================================
  const resetPaint = (): void => {
    painterStore.actions = [];
    painterStore.actionIndex = -1;
    //painterStore.currentAction = null;
    localStorage.removeItem('painterActions');

    if (paintCanvas.value) {
      const ctx = paintCanvas.value.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, paintCanvas.value.width, paintCanvas.value.height);
    }
  };

  // ==================================================
  // 初期復元
  // ==================================================
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
