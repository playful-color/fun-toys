import type { BrushAction } from '@/types/painter';

export function drawMarkerBrush(
  ctx: CanvasRenderingContext2D,
  action: BrushAction
) {
  if (!action.points.length) return;

  const color = action.color ?? { r: 255, g: 255, b: 0, a: 1 };

  ctx.save();

  ctx.globalCompositeOperation = 'source-over';

  ctx.strokeStyle = `rgba(${color.r},${color.g},${color.b},0.25)`;
  ctx.lineWidth = action.size * 1.2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(action.points[0].x, action.points[0].y);

  for (let i = 1; i < action.points.length; i++) {
    ctx.lineTo(action.points[i].x, action.points[i].y);
  }

  ctx.stroke();

  ctx.restore();
}
