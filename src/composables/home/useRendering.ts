import { watch } from 'vue';
import type { Ref } from 'vue';
import type { PaintAction, BrushAction } from '@/types/painter';

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
        if (action.type === 'brush') {
          drawBrush(ctx, action);
        }
        // 将来的に bucket もここに追加
      });

    if (painterStore.currentAction?.type === 'brush') {
      drawBrush(ctx, painterStore.currentAction);
    }
  }

  // ==================================================
  // ストロークを描画する関数
  // ==================================================
  function drawBrush(ctx: CanvasRenderingContext2D, action: BrushAction): void {
    ctx.globalCompositeOperation = action.isEraser
      ? 'destination-out'
      : 'source-over';

    const color = action.color ?? { r: 0, g: 0, b: 0, a: 1 };

    ctx.fillStyle = action.isEraser
      ? 'rgba(0,0,0,1)'
      : `rgba(${color.r},${color.g},${color.b},${color.a})`;

    ctx.globalAlpha = action.isEraser ? 1 : color.a;

    action.points.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, action.size * 0.3, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  watch(
    () => painterStore.actionIndex,
    () => redrawPaint(),
    { flush: 'post' }
  );
  return { redrawPaint };
}
