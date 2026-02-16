import { watch } from 'vue';
import type { Ref } from 'vue';

// 座標
interface Point {
  x: number;
  y: number;
}

// 色情報
interface Color {
  r: number;
  g: number;
  b: number;
  a: number;
}

// ストローク情報
interface Stroke {
  points: Point[];
  size: number;
  isEraser: boolean;
  color: Color;
}

// PainterStoreの型（JS版を使う場合はReturnTypeで代用も可）
interface PainterStoreLike {
  strokes: Stroke[];
  strokeIndex: number;
  currentStroke?: Stroke | null;
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

    // 変換リセットしてクリア
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, paintCanvas.value.width, paintCanvas.value.height);

    // パン・ズーム適用
    ctx.setTransform(scale.value, 0, 0, scale.value, panX.value, panY.value);

    // ストローク履歴描画
    painterStore.strokes
      .slice(0, painterStore.strokeIndex + 1)
      .forEach((stroke) => drawStroke(ctx, stroke));

    // 現在描画中ストローク
    if (painterStore.currentStroke) {
      drawStroke(ctx, painterStore.currentStroke);
    }
  }

  // ==================================================
  // ストロークを描画する関数
  // ==================================================
  function drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke): void {
    ctx.globalCompositeOperation = stroke.isEraser
      ? 'destination-out'
      : 'source-over';

    ctx.fillStyle = stroke.isEraser
      ? 'rgba(0,0,0,1)'
      : `rgba(${stroke.color.r},${stroke.color.g},${stroke.color.b},${stroke.color.a})`;

    ctx.globalAlpha = stroke.isEraser ? 1 : stroke.color.a;

    stroke.points.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, stroke.size * 0.3, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  watch(
    () => painterStore.strokeIndex,
    () => redrawPaint(),
    { flush: 'post' }
  );
  return { redrawPaint };
}
