// src/utils/drawAction.ts
import type {
  PaintAction,
  BrushAction,
  BucketAction,
  Color,
} from '@/types/painter';

export function drawAction(
  ctx: CanvasRenderingContext2D,
  action: PaintAction,
  bucketFill?: (x: number, y: number, color: Color) => void
) {
  switch (action.type) {
    // ==================================================
    // バケツアクション
    // ==================================================
    case 'bucket': {
      if (!bucketFill) return;
      const bucketAction = action as BucketAction;
      bucketFill(
        bucketAction.startPoint.x,
        bucketAction.startPoint.y,
        bucketAction.fillColor
      );
      return;
    }

    // ==================================================
    // ブラシ / 消しゴム
    // ==================================================
    case 'brush': {
      const brush = action as BrushAction;

      // 描画モード
      ctx.globalCompositeOperation = brush.isEraser
        ? 'destination-out'
        : 'source-over';

      // 塗り色設定
      if (brush.isEraser || !brush.color) {
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.globalAlpha = 1;
      } else {
        const c = brush.color;
        ctx.fillStyle = `rgba(${c.r},${c.g},${c.b},${c.a})`;
        ctx.globalAlpha = c.a;
      }

      // ストローク描画
      for (const p of brush.points) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, brush.size * 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }
  }
}
