import { ref, Ref } from 'vue';
import type { BrushAction, PaintAction, Color, Point } from '@/types/painter';
import { drawAction } from '@/utils/drawAction';

interface PainterStoreLike {
  isPainting: boolean;
  actions: PaintAction[];
  actionIndex: number;
  addAction(action: PaintAction): void;
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
  lineCanvas?: Ref<HTMLCanvasElement | null>; // バケツ再描画用
  isEraser: Ref<boolean>;
  brushSize: Ref<number>;
  eraserSize: Ref<number>;
  scale: Ref<number>;
  panX: Ref<number>;
  panY: Ref<number>;
  colorStore: ColorStore;
  painterStore: PainterStoreLike;
  cursorPos: Ref<CursorPosition>;
  isMobile: Ref<boolean>;
  getEventPos: (e: MouseEvent | TouchEvent) => Point;
  bucketFill?: (
    x: number,
    y: number,
    color: Color,
    skipHistory?: boolean
  ) => void;
}

export function useDrawing({
  paintCanvas,
  lineCanvas,
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
  bucketFill,
}: UseDrawingProps) {
  const isPainting = ref(false);
  const currentAction = ref<BrushAction | null>(null);
  const isDrawing = ref(false);

  let lastDrawTime = 0;
  const drawInterval = 16; // 約60fps

  // ==================================================
  // ブラシ描画
  // ==================================================
  function paint(pos: Point): void {
    const now = Date.now();
    if (now - lastDrawTime < drawInterval) return;
    lastDrawTime = now;

    const action = currentAction.value;
    if (!action) return;

    const ctx = paintCanvas.value?.getContext('2d');
    if (!ctx) return;

    const baseSize = isEraser.value ? eraserSize.value : brushSize.value;
    const radius = baseSize * 0.3;

    const color: Color = isEraser.value
      ? { r: 0, g: 0, b: 0, a: 1 }
      : { ...colorStore.selectedColor };

    ctx.globalCompositeOperation = isEraser.value
      ? 'destination-out'
      : 'source-over';
    ctx.fillStyle = `rgba(${color.r},${color.g},${color.b},${color.a})`;
    ctx.globalAlpha = isEraser.value ? 1 : color.a;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const points = action.points;
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
        points.push({ x: ix, y: iy });
      }
    } else {
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
      ctx.fill();
      points.push({ x: pos.x, y: pos.y });
    }

    action.size = baseSize;
    action.isEraser = isEraser.value;
    action.color = isEraser.value
      ? { r: 0, g: 0, b: 0, a: 1 }
      : { ...colorStore.selectedColor };
  }

  // ==================================================
  // 再描画（ブラシ＋バケツまとめて）
  // ==================================================
  function redrawPaint() {
    const canvas = paintCanvas.value;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(scale.value, 0, 0, scale.value, panX.value, panY.value);

    painterStore.actions.slice(0, painterStore.actionIndex + 1).forEach((a) => {
      drawAction(ctx, a, bucketFill);
    });

    if (currentAction.value) drawAction(ctx, currentAction.value, bucketFill);
  }

  // ==================================================
  // 描画操作
  // ==================================================
  function startDrawing(e: MouseEvent | TouchEvent) {
    if (isDrawing.value || (e instanceof MouseEvent && e.buttons !== 1)) return;

    const pos = getEventPos(e);
    isDrawing.value = true;
    isPainting.value = true;
    painterStore.isPainting = true;

    if (!isEraser.value) colorStore.pushRecentColor(colorStore.selectedColor);

    currentAction.value = {
      type: 'brush',
      points: [],
      size: isEraser.value ? eraserSize.value : brushSize.value,
      isEraser: isEraser.value,
      color: isEraser.value
        ? { r: 0, g: 0, b: 0, a: 1 }
        : { ...colorStore.selectedColor },
    };
  }

  let isDrawingFrame = false;

  function draw(e: MouseEvent | TouchEvent) {
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

  function stopDrawing() {
    if (!isDrawing.value) return;

    isDrawing.value = false;
    isPainting.value = false;
    painterStore.isPainting = false;

    if (!currentAction.value || currentAction.value.points.length < 2) {
      currentAction.value = null;
      return;
    }

    painterStore.addAction(currentAction.value);
    currentAction.value = null;

    redrawPaint();
  }

  return {
    isPainting,
    startDrawing,
    draw,
    stopDrawing,
    redrawPaint,
  };
}
