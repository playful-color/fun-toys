import { drawNormalBrush } from '@/brushes/normalBrush';
import { drawMarkerBrush } from '@/brushes/markerBrush';

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
      if (brush.isEraser) {
        ctx.globalCompositeOperation = 'destination-out';
        return drawNormalBrush(ctx, brush);
      } else {
        // 消しゴムじゃない場合だけ色を使う
        const c = brush.color ?? { r: 0, g: 0, b: 0, a: 1 };

        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = `rgba(${c.r},${c.g},${c.b},${c.a})`;
        ctx.globalAlpha = c.a;
      }

      if (brush.brushType === 'marker') {
        drawMarkerBrush(ctx, brush);
      } else {
        drawNormalBrush(ctx, brush);
      }

      return;
    }
  }
}
