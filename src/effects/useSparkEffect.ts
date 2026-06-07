/**
 * 【スパークパーティクル演出 Composable】
 * 描画操作（マーカー等）に連動し、星やハートの非永続エフェクトをキャンバス上に動的に描画・管理する。
 *
 * NOTE:
 * - 描画負荷を制御するため、最大パーティクル数（MAX_SPARKS）に制限を設けている。
 * - `globalCompositeOperation = 'lighter'` による加算合成を使用するため、Canvasのコンテキスト状態の退避（save/restore）が必須。
 * - 毎フレームの更新ループ内で配列削除（splice）が発生するため、インデックスのズレを防ぐ逆引きループ（後方探索）を採用。
 *
 * TODO: パーティクル配列の固定長バッファ化（GC負荷軽減）、描画処理のWeb Worker/OffscreenCanvas化によるUIスレッド解放。
 */
import type { Color } from '@/types/painter';

/** パーティクルエフェクト1個分の物理状態・演出属性を表すモデル */
interface Spark {
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
  const MAX_SPARKS = 200;

  // ==================================================
  // スパーク追加
  // ==================================================
  function addSpark(data: Spark) {
    // 上限を超えたら古いものを削除
    if (sparks.length >= MAX_SPARKS) {
      sparks.shift();
    }

    sparks.push(data);
  }

  // ==================================================
  // 更新・描画処理（毎フレーム）
  // ==================================================
  function updateAndRender(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];

      // 物理更新（位置・速度・寿命）
      s.x += s.vx;
      s.y += s.vy;
      s.vx *= 0.99;
      s.vy *= 0.99;
      s.vy -= 0.01;
      s.life -= 0.01;

      // 寿命が切れたら削除
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
  // リセット
  // ==================================================
  function reset() {
    sparks.length = 0;
  }

  // ==================================================
  // スパーク存在チェック
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
    const h = size * 0.3;

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
