import type { BrushAction } from '@/types/painter';

export function drawNormalBrush(
  ctx: CanvasRenderingContext2D,
  action: BrushAction
) {
  ctx.save();

  const c = action.color ?? { r: 0, g: 0, b: 0, a: 1 };

  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.fillStyle = `rgba(${c.r},${c.g},${c.b},${c.a})`;

  for (const p of action.points) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, action.size * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
