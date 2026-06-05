import { watch } from 'vue';
import type { Ref } from 'vue';
import type { PaintAction, BrushAction } from '@/types/painter';
import { drawAction } from '@/utils/drawAction';

interface PainterStoreLike {
  actions: PaintAction[];
  actionIndex: number;
  currentAction?: PaintAction | null;
}

interface UseRenderingParams {
  paintCanvas: Ref<HTMLCanvasElement | null>;
  scale: Ref<number>;
  panX: Ref<number>;
  panY: Ref<number>;
  painterStore: PainterStoreLike;
}

export function useRendering({
  paintCanvas,
  scale,
  panX,
  panY,
  painterStore,
}: UseRenderingParams) {
  // ==================================================
  // 描画を再描画する関数
  // ==================================================
  function redrawPaint(): void {
    if (!paintCanvas.value) return;

    const ctx = paintCanvas.value.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, paintCanvas.value.width, paintCanvas.value.height);
    ctx.setTransform(scale.value, 0, 0, scale.value, panX.value, panY.value);

    painterStore.actions
      .slice(0, painterStore.actionIndex + 1)
      .forEach((action) => {
        drawAction(ctx, action);
      });

    if (painterStore.currentAction) {
      drawAction(ctx, painterStore.currentAction);
    }
  }

  return { redrawPaint };
}
