/**
 * 【Canvas描画エンジン Composable】
 * ブラシ・消しゴム・スパークエフェクトの描画および履歴リプレイを統合したペイントコア。
 *
 * NOTE:
 * - 描画は「確定履歴（Store）」＋「未確定のストローク（currentAction）」の2レイヤー構造。
 * - `requestAnimationFrame`（フレーム単位の間引き）による負荷制御。モバイルは `cursorPos` で最適化。
 * - `marker` ブラシのみ、毎フレームクリアされる非永続のスパークエフェクトを生成する。
 * - スパークの独立アニメーションループは、現在停止制御が不完全（rafId未活用）なので注意。
 *
 * TODO: sparkループの確実な停止制御、差分描画による負荷軽減、入力層（イベント処理）と描画層の完全分離。
 */
import { ref, Ref } from 'vue';
import type {
  BrushAction,
  Color,
  Point,
  PainterStore,
  BrushType,
} from '@/types/painter';
import { drawAction } from '@/utils/drawAction';
import { useSparkEffect } from '@/effects/useSparkEffect';

/** 色選択機能の管理：現在選択されている色と、最近使用したカラー履歴（最大数管理）を制御 */
interface ColorStore {
  selectedColor: Color;
  recentColors: Color[];
  pushRecentColor(color: Color): void;
}

/** 描画エンジン（useDrawing）への入力：Canvas状態、ブラシ属性、および外部座標変換API */
interface UseDrawingProps {
  paintCanvas: Ref<HTMLCanvasElement | null>;
  lineCanvas?: Ref<HTMLCanvasElement | null>; // NOTE: 将来的なバケツ塗り境界・補助レイヤー用の拡張枠（現状未使用）
  isEraser: Ref<boolean>;
  brushType: Ref<BrushType>;
  brushSize: Ref<number>;
  eraserSize: Ref<number>;
  scale: Ref<number>;
  panX: Ref<number>;
  panY: Ref<number>;
  colorStore: ColorStore;
  painterStore: PainterStore;
  cursorPos: Ref<Point>;
  isMobile: Ref<boolean>;

  // WHY: 座標変換ロジックを外部責務（useCoordinate等）として切り離し、純粋な描画責務に集中させるため
  getEventPos: (e: MouseEvent | TouchEvent) => Point;

  // オプション機能（バケツ塗り）
  bucketFill?: (
    x: number,
    y: number,
    color: Color,
    skipHistory?: boolean
  ) => void;
}

// WHY: 描画とは別レイヤーでパーティクル管理し、再描画時に毎回リセットされる非永続UIとして演出するため
const sparkEffect = useSparkEffect();

export function useDrawing({
  paintCanvas,
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
  const drawInterval = 16;

  let isDrawingFrame = false;
  let isSparkAnimating = false;
  let rafId: number | null = null;

  // --- コア描画処理 ----------------------------------
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

    const distance = last ? Math.hypot(pos.x - last.x, pos.y - last.y) : 0;

    const stepSize = radius * 0.5;
    const steps = last ? Math.ceil(distance / stepSize) : 1;

    for (let i = 0; i < steps; i++) {
      const t = last ? i / steps : 1;

      const ix = last ? last.x + (pos.x - last.x) * t : pos.x;
      const iy = last ? last.y + (pos.y - last.y) * t : pos.y;

      if (last) {
        const dx = ix - last.x;
        const dy = iy - last.y;
        if (Math.hypot(dx, dy) < 2) continue;
      }

      ctx.beginPath();
      ctx.arc(ix, iy, radius, 0, Math.PI * 2);
      ctx.fill();

      points.push({ x: ix, y: iy });

      // WHY: marker時のみ粒子エフェクトを発生させる
      if (!isEraser.value && brushType.value === 'marker') {
        const spread = baseSize * 0.12;
        const minSparkSize = baseSize < 20 ? 5 : 3;
        const sparkChance = Math.min(0.08, 0.02 + baseSize * 0.002);

        if (Math.random() < sparkChance) {
          const angle = Math.random() * Math.PI * 2;
          const offset = 12;

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

  // --- 再描画（リプレイ方式） -------------------------
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

    if (currentAction.value) {
      drawAction(ctx, currentAction.value, bucketFill);
    }

    sparkEffect.updateAndRender(ctx);
  }

  // --- 描画開始 --------------------------------------
  function startDrawing(e: MouseEvent | TouchEvent) {
    if (isDrawing.value || (e instanceof MouseEvent && e.buttons !== 1)) return;

    const pos = getEventPos(e);

    strokeStart.value = pos;
    isDrawing.value = true;
    isPainting.value = true;
    painterStore.isPainting = true;

    sparkEffect.reset();

    if (!isEraser.value) {
      colorStore.pushRecentColor(colorStore.selectedColor);
    }

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

  // --- 描画ループ ------------------------------------
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

  // --- sparkアニメーション ----------------------------
  function startSparkAnimation() {
    if (isSparkAnimating) return;

    isSparkAnimating = true;

    const loop = () => {
      redrawPaint();

      if (sparkEffect.hasSparks()) {
        requestAnimationFrame(loop);
      } else {
        isSparkAnimating = false;
      }
    };

    requestAnimationFrame(loop);
  }

  function stopSparkAnimation(): void {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }

    isSparkAnimating = false;
  }

  // --- 描画終了 --------------------------------------
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
