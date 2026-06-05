import type { Color } from '@/types/painter';

export interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  size: number;
  color: Color;
  type: 'star' | 'heart';
  rot: number;
}

export function useSparkEffect() {
  const sparks: Spark[] = [];

  // ==================================================
  // spark追加（生成側から呼ばれる）
  // ==================================================
  const MAX_SPARKS = 200;

  function addSpark(data: Spark) {
    if (sparks.length >= MAX_SPARKS) {
      sparks.shift();
    }

    sparks.push(data);
  }

  // ==================================================
  // 更新 + 描画（毎フレーム呼ばれる）
  // ==================================================
  function updateAndRender(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];

      // 位置更新
      s.x += s.vx;
      s.y += s.vy;

      // 減速（空気抵抗）
      s.vx *= 0.99;
      s.vy *= 0.99;

      // 軽い上昇力（ふわっと浮く感じ）
      s.vy -= 0.01;

      // 寿命減少（ここで消えていく）
      s.life -= 0.01;

      // 寿命切れなら削除
      if (s.life <= 0) {
        sparks.splice(i, 1);
        continue;
      }

      const size = s.size * (2.0 - s.life);

      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rot + s.life);

      if (s.type === 'star') drawStar(ctx, size);
      else drawHeart(ctx, size);

      const alpha = Math.pow(s.life, 1.5);

      ctx.fillStyle = `rgba(${s.color.r},${s.color.g},${s.color.b},${alpha})`;
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }

  // ==================================================
  // 全削除（リセット用）
  // ==================================================
  function reset() {
    sparks.length = 0;
  }

  // ==================================================
  // sparkが残っているか確認
  // ==================================================
  function hasSparks() {
    return sparks.length > 0;
  }

  // ==================================================
  // 星形描画
  // ==================================================
  function drawStar(ctx: CanvasRenderingContext2D, radius: number) {
    const spikes = 5;
    const outerRadius = radius;
    const innerRadius = radius / 2;

    let rot = (Math.PI / 2) * 3;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(0, -outerRadius);

    for (let i = 0; i < spikes; i++) {
      ctx.lineTo(Math.cos(rot) * outerRadius, Math.sin(rot) * outerRadius);
      rot += step;

      ctx.lineTo(Math.cos(rot) * innerRadius, Math.sin(rot) * innerRadius);
      rot += step;
    }

    ctx.closePath();
  }

  // ==================================================
  // ハート形描画
  // ==================================================
  function drawHeart(ctx: CanvasRenderingContext2D, size: number) {
    ctx.beginPath();
    const topCurveHeight = size * 0.3;

    ctx.moveTo(0, topCurveHeight);
    ctx.bezierCurveTo(0, -topCurveHeight, -size, -topCurveHeight, -size, 0);
    ctx.bezierCurveTo(-size, size, 0, size * 1.3, 0, size * 1.5);
    ctx.bezierCurveTo(0, size * 1.3, size, size, size, 0);
    ctx.bezierCurveTo(
      size,
      -topCurveHeight,
      0,
      -topCurveHeight,
      0,
      topCurveHeight
    );
    ctx.closePath();
  }

  return {
    addSpark,
    updateAndRender,
    reset,
    hasSparks,
  };
}
