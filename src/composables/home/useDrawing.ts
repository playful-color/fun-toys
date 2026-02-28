import { ref, Ref } from 'vue';

interface Color {
  r: number;
  g: number;
  b: number;
  a: number;
}

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  color: Color | null;
  points: Point[];
  size: number;
  isEraser: boolean;
}

interface PainterStore {
  isPainting: boolean;
  strokes: Stroke[];
  strokeIndex: number;
  addStroke(stroke: Stroke): void;
}

interface ColorStore {
  selectedColor: Color;
  recentColors: Color[];
  pushRecentColor(color: Color): void;
}

interface CursorPosition {
  x: number;
  y: number;
}

interface UseDrawingProps {
  paintCanvas: Ref<HTMLCanvasElement | null>;
  isEraser: Ref<boolean>;
  brushSize: Ref<number>;
  eraserSize: Ref<number>;
  scale: Ref<number>;
  panX: Ref<number>;
  panY: Ref<number>;
  colorStore: ColorStore;
  painterStore: PainterStore;
  cursorPos: Ref<CursorPosition>;
  isMobile: Ref<boolean>;
  getEventPos: (e: MouseEvent | TouchEvent) => Point;
}

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
}: UseDrawingProps) {
  const isPainting = ref(false);
  const currentStroke = ref<Stroke | null>(null);
  const isDrawing = ref(false);

  // ==================================================
  // 描画処理
  // ==================================================

  function paint(pos: Point): void {
    if (!currentStroke.value) return;
    const { x, y } = pos;
    const ctx = paintCanvas.value?.getContext('2d');
    if (!ctx) return;

    const baseSize = isEraser.value ? eraserSize.value : brushSize.value;
    const radius = baseSize * 0.3;
    const color = isEraser.value ? null : colorStore.selectedColor;

    ctx.globalCompositeOperation = isEraser.value
      ? 'destination-out'
      : 'source-over';
    ctx.fillStyle = isEraser.value
      ? 'rgba(0,0,0,1)'
      : `rgba(${color!.r},${color!.g},${color!.b},${color!.a})`; // Type assertion for non-null
    ctx.globalAlpha = isEraser.value ? 1 : color!.a; // Type assertion for non-null
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const points = currentStroke.value.points;
    const last = points[points.length - 1];

    if (last) {
      const steps = Math.ceil(Math.hypot(x - last.x, y - last.y) / 2);
      for (let i = 0; i < steps; i++) {
        const t = i / steps;
        const ix = last.x + (x - last.x) * t;
        const iy = last.y + (y - last.y) * t;
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

  function redrawPaint(): void {
    if (!paintCanvas.value) return;
    const ctx = paintCanvas.value.getContext('2d');
    if (!ctx) return;

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

  function drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke): void {
    ctx.globalCompositeOperation = stroke.isEraser
      ? 'destination-out'
      : 'source-over';
    ctx.fillStyle = stroke.isEraser
      ? 'rgba(0,0,0,1)'
      : `rgba(${stroke.color!.r},${stroke.color!.g},${stroke.color!.b},${stroke.color!.a})`; // Type assertion for non-null
    ctx.globalAlpha = stroke.isEraser ? 1 : stroke.color!.a; // Type assertion for non-null

    stroke.points.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, stroke.size * 0.3, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // ==================================================
  // 描画操作
  // ==================================================

  function startDrawing(e: MouseEvent | TouchEvent): void {
    if (isDrawing.value || (e instanceof MouseEvent && e.buttons !== 1)) return;

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

  function draw(e: MouseEvent | TouchEvent): void {
    if (!isDrawing.value) return;

    let pos: Point;
    if (isMobile.value && (e as TouchEvent).touches) {
      pos = { ...cursorPos.value };
    } else {
      pos = getEventPos(e);
    }

    paint(pos);
    redrawPaint();
  }

  function stopDrawing(): void {
    if (!isDrawing.value) return;

    isDrawing.value = false;
    isPainting.value = false;
    painterStore.isPainting = false;

    if (!currentStroke.value || currentStroke.value.points.length < 2) {
      currentStroke.value = null;
      return;
    }

    // 描画が完了した場合のみ保存
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
