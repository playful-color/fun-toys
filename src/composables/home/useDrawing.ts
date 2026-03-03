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

  let lastDrawTime = 0;
  const drawInterval = 16; // 約60fps

  // ==================================================
  // 描画
  // ==================================================
  function paint(pos: Point): void {
    const now = Date.now();
    if (now - lastDrawTime < drawInterval) return;
    lastDrawTime = now;

    const stroke = currentStroke.value;
    if (!stroke) return;

    const ctx = paintCanvas.value?.getContext('2d');
    if (!ctx) return;

    const baseSize = isEraser.value ? eraserSize.value : brushSize.value;
    const radius = baseSize * 0.3;

    const color = isEraser.value ? null : colorStore.selectedColor;

    ctx.globalCompositeOperation = isEraser.value
      ? 'destination-out'
      : 'source-over';

    if (color) {
      ctx.fillStyle = `rgba(${color.r},${color.g},${color.b},${color.a})`;
      ctx.globalAlpha = color.a;
    } else {
      // 消しゴムの場合
      ctx.fillStyle = 'rgba(0,0,0,1)';
      ctx.globalAlpha = 1;
    }

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const points = stroke.points;
    const last = points[points.length - 1];

    if (last) {
      const steps = Math.ceil(Math.hypot(pos.x - last.x, pos.y - last.y) / 2);
      for (let i = 0; i < steps; i++) {
        const t = i / steps;
        const ix = last.x + (pos.x - last.x) * t;
        const iy = last.y + (pos.y - last.y) * t;
        ctx.beginPath();
        ctx.arc(ix, iy, radius, 0, Math.PI * 2);
        ctx.fill();
        stroke.points.push({ x: ix, y: iy });
      }
    } else {
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
      ctx.fill();
      stroke.points.push({ x: pos.x, y: pos.y });
    }

    stroke.size = baseSize;
    stroke.isEraser = isEraser.value;
    if (!isEraser.value && color) stroke.color = { ...color };
  }

  function drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke): void {
    ctx.globalCompositeOperation = stroke.isEraser
      ? 'destination-out'
      : 'source-over';
    if (stroke.isEraser || !stroke.color) {
      ctx.fillStyle = 'rgba(0,0,0,1)';
      ctx.globalAlpha = 1;
    } else {
      const c = stroke.color;
      ctx.fillStyle = `rgba(${c.r},${c.g},${c.b},${c.a})`;
      ctx.globalAlpha = c.a;
    }

    stroke.points.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, stroke.size * 0.3, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function redrawPaint(): void {
    const canvas = paintCanvas.value;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(scale.value, 0, 0, scale.value, panX.value, panY.value);

    painterStore.strokes
      .slice(0, painterStore.strokeIndex + 1)
      .forEach((s) => drawStroke(ctx, s));
    if (currentStroke.value) drawStroke(ctx, currentStroke.value);
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

    if (!isEraser.value) colorStore.pushRecentColor(colorStore.selectedColor);

    currentStroke.value = {
      color: isEraser.value ? null : { ...colorStore.selectedColor },
      points: [],
      size: isEraser.value ? eraserSize.value : brushSize.value,
      isEraser: isEraser.value,
    };
  }

  let isDrawingFrame = false;

  function draw(e: MouseEvent | TouchEvent): void {
    if (!isDrawing.value) return;

    if (!isDrawingFrame) {
      isDrawingFrame = true;
      requestAnimationFrame(() => {
        const pos: Point =
          isMobile.value && 'touches' in e
            ? { ...cursorPos.value }
            : getEventPos(e);

        paint(pos);
        redrawPaint();
        isDrawingFrame = false;
      });
    }
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
