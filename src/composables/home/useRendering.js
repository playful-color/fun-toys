export function useRendering({ paintCanvas, scale, panX, panY, painterStore }) {
  // ==================================================
  // 描画を再描画する関数
  // ==================================================
  function redrawPaint() {
    if (!paintCanvas.value) return;
    const ctx = paintCanvas.value.getContext('2d');

    // 変換リセットしてクリア
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, paintCanvas.value.width, paintCanvas.value.height);

    // パン・ズーム適用
    ctx.setTransform(scale.value, 0, 0, scale.value, panX.value, panY.value);

    // 描画
    painterStore.strokes
      .slice(0, painterStore.strokeIndex + 1)
      .forEach((stroke) => drawStroke(ctx, stroke));

    if (painterStore.currentStroke) {
      drawStroke(ctx, painterStore.currentStroke);
    }
  }

  // ==================================================
  // ストロークを描画する関数
  // ==================================================
  function drawStroke(ctx, stroke) {
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

  return { redrawPaint };
}
