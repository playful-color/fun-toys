import { ref, Ref } from 'vue';
import type { BrushAction, PaintAction, Color, Point } from '@/types/painter';
import { drawAction } from '@/utils/drawAction';
import { useSparkEffect } from '@/effects/useSparkEffect';

// ==================================================
// 外部ストア的な依存（描画状態・色管理など）
// ==================================================
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

// ==================================================
// useDrawing に渡される依存一覧
// ==================================================
interface UseDrawingProps {
  paintCanvas: Ref<HTMLCanvasElement | null>;
  lineCanvas?: Ref<HTMLCanvasElement | null>; // バケツ再描画用
  isEraser: Ref<boolean>;
  brushType: Ref<'normal' | 'marker'>;
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

// ==================================================
// sparkエフェクト（全ブラシ共通の演出レイヤー）
// ==================================================

const sparkEffect = useSparkEffect();

export function useDrawing({
  paintCanvas,
  lineCanvas,
  isEraser,
  brushType,
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
  const strokeStart = ref<Point | null>(null);

  let lastDrawTime = 0;
  const drawInterval = 16; // 約60fps

  // ==================================================
  // ブラシ描画処理
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
    // pointsが増えすぎるのを防ぐ（メモリ対策）
    const MAX_POINTS = 1000;

    if (points.length > MAX_POINTS) {
      points.splice(0, points.length - MAX_POINTS);
    }
    const steps = last
      ? Math.min(
          6,
          Math.max(2, Math.ceil(Math.hypot(pos.x - last.x, pos.y - last.y) / 2))
        )
      : 1;

    // 補間しながら描画＆spark生成
    for (let i = 0; i < steps; i++) {
      const t = last ? i / steps : 1;
      const ix = last ? last.x + (pos.x - last.x) * t : pos.x;
      const iy = last ? last.y + (pos.y - last.y) * t : pos.y;

      ctx.beginPath();
      ctx.arc(ix, iy, radius, 0, Math.PI * 2);
      ctx.fill();
      points.push({ x: ix, y: iy });

      if (!isEraser.value && brushType.value === 'marker') {
        const isLastStep = i === steps - 1 && last; // 最後の点は出さない
        const spread = baseSize * 0.12;
        const minSparkSize = baseSize < 20 ? 5 : 3;

        let sparkChance = Math.min(0.08, 0.02 + baseSize * 0.002);
        sparkChance = Math.max(0.03, sparkChance);
        if (baseSize < 20) {
          sparkChance *= 2;
        }

        const isValidStep = !isLastStep;
        const chance = Math.random() < sparkChance;

        if (isValidStep && chance) {
          const offset = 12;
          const angle = Math.random() * Math.PI * 2;

          sparkEffect.addSpark({
            x: ix + Math.cos(angle) * offset,
            y: iy + Math.sin(angle) * offset,
            vx: last
              ? (pos.x - last.x) * 0.15 + (Math.random() - 0.5) * spread
              : (Math.random() - 0.5) * spread,

            vy: last
              ? (pos.y - last.y) * 0.15 + (Math.random() - 0.5) * spread
              : (Math.random() - 0.5) * spread,
            life: 1,
            size: Math.max(
              minSparkSize,
              baseSize * (Math.random() * 0.35 + 0.2)
            ),
            color: { ...colorStore.selectedColor },
            type: Math.random() < 0.5 ? 'star' : 'heart',
            rot: Math.random() * Math.PI * 2,
          });
          startSparkAnimation();
        }
      }
    }

    action.size = baseSize;
    action.isEraser = isEraser.value;
    action.color = color;
  }

  // ==================================================
  // 全体再描画（履歴＋現在描画＋spark）
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

    // 現在描画中のストローク
    if (currentAction.value) {
      drawAction(ctx, currentAction.value, bucketFill);
    }
    // markerだけキラキラ
    sparkEffect.updateAndRender(ctx);
  }

  // ==================================================
  // 描画開始
  // ==================================================
  function startDrawing(e: MouseEvent | TouchEvent) {
    if (isDrawing.value || (e instanceof MouseEvent && e.buttons !== 1)) return;

    const pos = getEventPos(e);
    strokeStart.value = pos;
    isDrawing.value = true;
    isPainting.value = true;
    painterStore.isPainting = true;

    sparkEffect.reset();

    if (!isEraser.value) colorStore.pushRecentColor(colorStore.selectedColor);

    currentAction.value = {
      type: 'brush',
      points: [],
      size: isEraser.value ? eraserSize.value : brushSize.value,
      isEraser: isEraser.value,
      color: isEraser.value
        ? { r: 0, g: 0, b: 0, a: 1 }
        : { ...colorStore.selectedColor },
      brushType: brushType.value,
    };
  }

  let isDrawingFrame = false;
  let isSparkAnimating = false;
  let rafId: number | null = null;

  // ==================================================
  // spark専用アニメーションループ
  // ==================================================
  function startSparkAnimation(): void {
    if (isSparkAnimating) return;

    isSparkAnimating = true;

    const loop = (): void => {
      redrawPaint();

      if (sparkEffect.hasSparks()) {
        rafId = requestAnimationFrame(loop);
      } else {
        isSparkAnimating = false;
        rafId = null;
      }
    };

    rafId = requestAnimationFrame(loop);
  }

  function stopSparkAnimation(): void {
    // requestAnimationFrameを強制停止
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }

    isSparkAnimating = false;
  }

  // ==================================================
  // 描画中（pointer move）
  // ==================================================
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
    stopSparkAnimation();
    if (!isDrawing.value) return;

    isDrawing.value = false;
    isPainting.value = false;
    painterStore.isPainting = false;

    if (!currentAction.value || currentAction.value.points.length < 2) {
      currentAction.value = null;
      strokeStart.value = null;
      return;
    }

    painterStore.addAction({
      ...currentAction.value,
      points: [...currentAction.value.points],
    });
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
