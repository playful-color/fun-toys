import type { BrushAction } from '@/types/painter';

export function drawNormalBrush(
  ctx: CanvasRenderingContext2D,
  action: BrushAction
) {
  for (const p of action.points) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, action.size * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
}
