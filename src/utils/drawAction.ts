/**
 * 【描画アクション統合実行（単一ストローク描画）ユーティリティ】
 * PaintAction（アクション履歴）の種類（ブラシ・消しゴム・バケツ塗り）を判別し、Canvasへ実際の描画を実行する。
 *
 * NOTE:
 * - Canvas描画の唯一の入口（ハブ）。UI層や別モジュールからCanvasへ直接、命令的描画を行うことを禁止する設計。
 * - 各ブラシ（normal / marker）は Canvas の描画状態（合成モードや透明度）を内部で変更するため、処理終了時のコンテキスト復元（save/restore）が必須。
 * - バケツ塗りは、ベクター描画（パス）ではなくputImageDataによるピクセルベースの不可逆な別系統処理。
 *
 * TODO: 描画アクション（case）増加時のSwitch文肥大化を防ぐため、ストラテジーパターンへの移行を検討。
 */
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
    // --- バケツアクション(未実装) -----------------------
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

    // --- ブラシ / 消しゴム ------------------------------
    case 'brush': {
      const brush = action as BrushAction;

      ctx.save();

      if (brush.isEraser) {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.globalAlpha = 1;
        drawNormalBrush(ctx, brush);
      } else {
        const c = brush.color ?? { r: 0, g: 0, b: 0, a: 1 };

        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = `rgba(${c.r},${c.g},${c.b},${c.a})`;
        ctx.globalAlpha = 1;

        if (brush.brushType === 'marker') {
          drawMarkerBrush(ctx, brush);
        } else {
          drawNormalBrush(ctx, brush);
        }
      }

      ctx.restore();
      return;
    }
  }
}
