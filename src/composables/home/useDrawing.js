import { ref } from 'vue';

export function useDrawing({
  paintCanvas,
  isEraser,
  brushSize,
  eraserSize,
  scale,
  panX,
  panY,
  colorStore,
  painterStore,
  cursorPos,
  isMobile,
  getEventPos,
}) {
  const isPainting = ref(false);
  const currentStroke = ref(null);
  const isDrawing = ref(false);

  // ==================================================
  // 描画処理
  // ==================================================

  // 描画処理を行う関数。ブラシや消しゴムで描画を行う。
  function paint(pos) {
    if (!currentStroke.value) return;
    const { x, y } = pos;
    const ctx = paintCanvas.value.getContext('2d');
    const baseSize = isEraser.value ? eraserSize.value : brushSize.value;
    const radius = baseSize * 0.3;
    const color = isEraser.value ? null : colorStore.selectedColor;

    ctx.globalCompositeOperation = isEraser.value
      ? 'destination-out'
      : 'source-over';
    ctx.fillStyle = isEraser.value
      ? 'rgba(0,0,0,1)'
      : `rgba(${color.r},${color.g},${color.b},${color.a})`;
    ctx.globalAlpha = isEraser.value ? 1 : color.a;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const points = currentStroke.value.points;
    const last = points[points.length - 1];

    if (last) {
      const steps = Math.ceil(Math.hypot(x - last.x, y - last.y) / 2);
      for (let i = 0; i < steps; i++) {
        const t = i / steps;
        const ix = last.x + (x - last.x) * t + (Math.random() - 0.5) * 2;
        const iy = last.y + (y - last.y) * t + (Math.random() - 0.5) * 2;
        ctx.beginPath();
        ctx.arc(ix, iy, radius, 0, Math.PI * 2);
        ctx.fill();
        currentStroke.value.points.push({ x: ix, y: iy });
      }
    } else {
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
      currentStroke.value.points.push({ x, y });
    }

    currentStroke.value.size = baseSize;
    currentStroke.value.isEraser = isEraser.value;
    if (!isEraser.value)
      currentStroke.value.color = { ...colorStore.selectedColor };
  }

  // 描画状態をリセット・再描画
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
    if (currentStroke.value) drawStroke(ctx, currentStroke.value);
  }

  // ストローク描画
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

  // ==================================================
  // 描画操作
  // ==================================================

  // 描画を開始する関数
  function startDrawing(e) {
    if (isDrawing.value || (e.pointerType === 'mouse' && e.buttons !== 1))
      return;

    const pos = getEventPos(e);
    isDrawing.value = true;
    isPainting.value = true;
    painterStore.isPainting = true;

    if (!isEraser.value) {
      colorStore.pushRecentColor(colorStore.selectedColor);
    }

    currentStroke.value = {
      color: isEraser.value ? null : { ...colorStore.selectedColor },
      points: [],
      size: isEraser.value ? eraserSize.value : brushSize.value,
      isEraser: isEraser.value,
    };
  }

  // 描画中に移動した際の処理
  function draw(e) {
    if (!isDrawing.value) return;

    let pos;
    if (isMobile.value && e.touches) {
      pos = { ...cursorPos.value };
    } else {
      pos = getEventPos(e);
    }

    paint(pos);
    redrawPaint();
  }

  // 描画を終了する関数
  function stopDrawing() {
    if (!isDrawing.value) return;

    isDrawing.value = false;
    isPainting.value = false;
    painterStore.isPainting = false;

    if (!currentStroke.value || currentStroke.value.points.length < 2) {
      currentStroke.value = null;
      return;
    }

    painterStore.addStroke(currentStroke.value);
    currentStroke.value = null;
    redrawPaint();
  }

  return {
    isPainting,
    startDrawing,
    draw,
    stopDrawing,
  };
}
