/**
 * 【ブラシカーソル制御 Composable】
 * PC（CSS cursorの動的生成）とモバイル（DOM擬似カーソル）の挙動を統合し、
 * pan / scale を考慮した座標系でカーソル表示を同期するモジュール。
 *
 * NOTE:
 * - PCは色・サイズ変更時に canvas.toDataURL() でカーソル画像を再生成する（キャッシュなし）。
 * - モバイルはタッチ位置（1本指）に追従。座標補正ロジックに環境差（iOS/Android）のリスクあり。
 * - 座標計算は scale / pan を二重管理（計算）しているため表示がズレるリスクあり。
 *
 * TODO:
 * - キャッシュ機構の導入、または `toDataURL` 依存の廃止によるパフォーマンス改善
 * - `canvasRect` のバリデーション強化、および座標補正の環境差の検証・統一
 * - `scale / pan` の二重管理の解消（座標系の一元化）と計算負荷の削減
 */
import { ref, watch, computed, Ref } from 'vue';
import type { Color, Point } from '@/types/painter';
import type { CSSProperties } from 'vue';

type Position = Point;

/** Canvasの表示領域情報：タッチ座標やカーソル位置計算の基準として使用 */
interface CanvasRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function useBrushCursor({
  isEraser,
  brushSize,
  eraserSize,
  selectedColor,
  isMobile,
  panX,
  panY,
  scale,
  isPinching,
}: {
  isEraser: Ref<boolean>;
  brushSize: Ref<number>;
  eraserSize: Ref<number>;
  selectedColor: Ref<Color>;
  isMobile: Ref<boolean>;
  canvasRect: Ref<CanvasRect>;
  panX: Ref<number>;
  panY: Ref<number>;
  scale: Ref<number>;
  isPinching: Ref<boolean | null>;
}) {
  const brushCursor = ref<string>('crosshair');
  const cursorPos = ref<Position>({ x: 0, y: 0 });
  const cursorVisible = ref<boolean>(false);

  // --- PCカーソル生成 ---------------------------------
  function createCircleCursor(
    size: number,
    options: { color?: string; dashed?: boolean } = {}
  ): string {
    const { color = 'rgba(0,0,0,0.6)', dashed = false } = options;

    const radius = size * 0.3;
    const diameter = radius * 2;

    const canvas = document.createElement('canvas');
    canvas.width = diameter;
    canvas.height = diameter;

    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.setLineDash(dashed ? [4, 4] : []);
      ctx.beginPath();
      ctx.arc(radius, radius, radius - 1, 0, Math.PI * 2);
      ctx.stroke();
    }

    return `url(${canvas.toDataURL()}) ${radius} ${radius}, auto`;
  }

  // --- モバイルカーソル更新 ---------------------------
  function updateCursorPosition(
    touchEvent: TouchEvent,
    {
      canvasRect: rect,
      panX: pan,
      panY: panYVal,
      scale: s,
    }: {
      canvasRect: CanvasRect;
      panX: number;
      panY: number;
      scale: number;
    }
  ) {
    // WHY:
    // - ピンチ中は描画・カーソル更新の競合を防ぐため停止する
    if (!isMobile.value || touchEvent.touches.length === 0 || isPinching?.value)
      return;

    const baseSize = isEraser.value ? eraserSize.value : brushSize.value;
    const brushRadius = baseSize * 0.3;

    let offsetY = -Math.max(brushRadius * 2, 25);

    // WHY:
    // - ズーム倍率による視覚ズレを補正するためスケールを反映
    offsetY *= Math.max(0.5, s);

    const clientY = touchEvent.touches[0].clientY;
    const screenHeight = window.innerHeight;

    // WHY:
    // - 画面外へのカーソル描画を防ぐUX補正
    if (clientY + offsetY < 0) offsetY = -clientY + 10;
    if (clientY + offsetY > screenHeight) offsetY = screenHeight - clientY - 10;

    // WHY:
    // - Canvas座標系をワールド座標へ変換（pan / scale補正）
    cursorPos.value = {
      x: (touchEvent.touches[0].clientX - rect.left - pan) / s,
      y: (touchEvent.touches[0].clientY - rect.top - panYVal) / s + offsetY / s,
    };

    cursorVisible.value = true;
  }

  // --- DOMカーソルStyle ------------------------------
  const cursorStyle = computed<CSSProperties>(() => {
    const baseSize = isEraser.value ? eraserSize.value : brushSize.value;
    const size = baseSize * 0.6;

    const borderWidth = 0.2;

    const color = isEraser.value
      ? 'rgba(80,80,80,0.8)'
      : `rgba(${selectedColor.value.r},${selectedColor.value.g},${selectedColor.value.b},${selectedColor.value.a})`;

    const border = isEraser.value
      ? `${borderWidth}px dashed ${color}`
      : `${borderWidth}px solid ${color}`;

    const shadow = isEraser.value
      ? `0 0 0 ${borderWidth * 1.5}px rgba(0,0,0,0.5)`
      : `0 0 0 ${borderWidth}px rgba(0,0,0,0.5)`;

    return {
      position: 'absolute',
      left: `${cursorPos.value.x * scale.value + panX.value}px`,
      top: `${cursorPos.value.y * scale.value + panY.value}px`,
      width: `${size}px`,
      height: `${size}px`,
      border,
      boxShadow: shadow,
      borderRadius: '50%',
      pointerEvents: 'none',
      transform: 'translate(-50%, -50%)',
      display: cursorVisible.value ? 'block' : 'none',
    };
  });

  // --- PCカーソル更新 ---------------------------------
  function updateBrushCursor() {
    const size = isEraser.value ? eraserSize.value : brushSize.value;
    const { r, g, b, a } = selectedColor.value;

    // WHY:
    // - ブラシ状態変更時のみカーソルを再生成する（毎フレーム生成を防ぐ）
    brushCursor.value = createCircleCursor(size, {
      color: isEraser.value
        ? 'rgba(80,80,80,0.8)'
        : `rgba(${r},${g},${b},${a})`,
      dashed: isEraser.value,
    });
  }

  // --- カーソル非表示 ---------------------------------
  function hideCursor() {
    cursorVisible.value = false;
  }

  // --- 状態監視 --------------------------------------
  watch([isEraser, brushSize, eraserSize, selectedColor], updateBrushCursor, {
    immediate: true,
  });

  return {
    brushCursor,
    cursorPos,
    cursorVisible,
    updateBrushCursor,
    updateCursorPosition,
    hideCursor,
    cursorStyle,
  };
}
