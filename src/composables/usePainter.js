import { ref } from 'vue';
import { useColorStore } from '@/stores/useColorStore';
import { usePainterStore } from '@/stores/usePainterStore';

export function usePainter({
  paintCanvas,
  isEraser,
  brushSize,
  eraserSize,
  selectedColor,
  scale,
  updateBrushCursor
}) {
  const colorStore = useColorStore();
  const painterStore = usePainterStore();

  const isPainting = ref(false);
  const currentStroke = ref(null);
  const isDrawing = ref(false);

  function getTransformedPos(e) {
  const s = scale?.value || 1;
  const rect = paintCanvas.value.getBoundingClientRect();
  return e.touches && e.touches.length > 0
    ? { x: (e.touches[0].clientX - rect.left) / s, y: (e.touches[0].clientY - rect.top) / s }
    : { x: e.offsetX / s, y: e.offsetY / s };
}


  // 描画をリセットする関数
  function resetPaint() {
    painterStore.strokes = [];
    painterStore.strokeIndex = -1;
    localStorage.removeItem('painterStrokes');
    redrawPaint();
  }

  // イベントから座標を取得する関数
function getEventPos(e) {
  const s = scale.value || 1;
  const rect = paintCanvas.value.getBoundingClientRect();

  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;

const offsetX = 0;   // 左右ずらしたい場合はここを調整
const offsetY = -20; // 上にずらしたい場合は負の値
return {
  x: (clientX - rect.left + offsetX) / s,
  y: (clientY - rect.top + offsetY) / s
};
}

  // 描画（ブラシまたは消しゴムで）
  function paint(pos) {
    if (!currentStroke.value) return;
    const { x, y } = pos;
    const ctx = paintCanvas.value.getContext('2d');
    const size = isEraser.value ? eraserSize.value : brushSize.value;
    const color = isEraser.value ? null : colorStore.selectedColor;

    ctx.globalCompositeOperation = isEraser.value ? 'destination-out' : 'source-over';
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
        ctx.arc(ix, iy, size * 0.3, 0, Math.PI * 2);
        ctx.fill();
        currentStroke.value.points.push({ x: ix, y: iy });
      }
    } else {
      ctx.beginPath();
      ctx.arc(x, y, size * 0.3, 0, Math.PI * 2);
      ctx.fill();
      currentStroke.value.points.push({ x, y });
    }

    currentStroke.value.size = size;
    currentStroke.value.isEraser = isEraser.value;

    if (!isEraser.value) currentStroke.value.color = { ...colorStore.selectedColor };
  }

  // 描画を再描画する関数
  function redrawPaint() {
    if (!paintCanvas.value) return;
    const ctx = paintCanvas.value.getContext('2d');
    ctx.clearRect(0, 0, paintCanvas.value.width, paintCanvas.value.height);

    // 描画履歴を直接描画する
    painterStore.strokes.slice(0, painterStore.strokeIndex + 1).forEach((stroke) => {
      drawStroke(ctx, stroke);
    });

    // 現在のストロークを描画
    if (currentStroke.value) {
      drawStroke(ctx, currentStroke.value);
    }
  }

  function drawStroke(ctx, stroke) {
    ctx.globalCompositeOperation = stroke.isEraser ? 'destination-out' : 'source-over';
    ctx.fillStyle = stroke.isEraser 
      ? 'rgba(0,0,0,1)' 
      : `rgba(${stroke.color.r},${stroke.color.g},${stroke.color.b},${stroke.color.a})`;
    ctx.globalAlpha = stroke.isEraser ? 1 : stroke.color.a;

    stroke.points.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, stroke.size * 0.3, 0, Math.PI * 2);
      ctx.fill();
    });
  }


  // 描画開始
  function startDrawing(e) {
    if (isDrawing.value || (e.pointerType === 'mouse' && e.buttons !== 1)) return;

    const pos = getEventPos(e);
    updateBrushCursor?.();

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
      isEraser: isEraser.value
    };

    paint(pos);
    redrawPaint();
  }

  // 描画中の移動
  function draw(e) {
    if (!isDrawing.value || (e.pointerType === 'mouse' && e.buttons !== 1)) return;
    const pos = getEventPos(e);
    paint(pos);
    redrawPaint();
  }

  // 描画終了
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

  // Undo/Redo
  function undo() {
    painterStore.undo();
    redrawPaint();
  }

  function redo() {
    painterStore.redo();
    redrawPaint();
  }

  painterStore.restore();
  redrawPaint();

  return { isPainting, startDrawing, draw, stopDrawing, undo, redo, resetPaint };
}
