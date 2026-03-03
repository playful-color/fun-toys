import { ref, watch, computed, Ref } from 'vue';
import type { CSSProperties } from 'vue';

interface Color {
  r: number;
  g: number;
  b: number;
  a: number;
}

interface Position {
  x: number;
  y: number;
}

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
  canvasRect,
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

  // ==================================================
  // PCカーソル
  // ==================================================

  // PC用のカスタム円形カーソルを作成する関数
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

  // ==================================================
  // スマホカーソル
  // ==================================================

  // モバイルデバイス上でタッチイベントに基づいてカーソル位置を更新する関数
  function updateCursorPosition(
    touchEvent: TouchEvent,
    {
      canvasRect: rect,
      panX: pan,
      panY: panYVal,
      scale: s,
    }: { canvasRect: CanvasRect; panX: number; panY: number; scale: number }
  ) {
    if (!isMobile.value || touchEvent.touches.length === 0 || isPinching?.value)
      return;

    rect = rect || { left: 0, top: 0, width: 0, height: 0 };
    const baseSize = isEraser.value ? eraserSize.value : brushSize.value;
    const brushRadius = baseSize * 0.3;

    // ---------------------------
    // 動的オフセット計算
    let offsetY = -Math.max(brushRadius * 2, 25);

    // ズームに応じてオフセットを調整（小さいスケールなら少し下げる）
    offsetY *= Math.max(0.5, s);

    // 画面端対策
    const clientY = touchEvent.touches[0].clientY;
    const screenHeight = window.innerHeight;
    if (clientY + offsetY < 0) {
      offsetY = -clientY + 10;
    }
    if (clientY + offsetY > screenHeight) {
      offsetY = screenHeight - clientY - 10;
    }

    cursorPos.value = {
      x: (touchEvent.touches[0].clientX - rect.left - pan) / s,
      y: (touchEvent.touches[0].clientY - rect.top - panYVal) / s + offsetY / s,
    };

    cursorVisible.value = true;
  }

  // モバイルでのカーソルのスタイルを返す計算プロパティ
  const cursorStyle = computed<CSSProperties>(() => {
    const baseSize = isEraser.value ? eraserSize.value : brushSize.value;
    const size = baseSize * 0.6;
    const borderWidth = 0.2;

    const color = isEraser.value
      ? 'rgba(80,80,80,0.8)'
      : `rgba(${selectedColor.value.r},${selectedColor.value.g},${selectedColor.value.b},${selectedColor.value.a})`;

    const dashedBorder = isEraser.value
      ? `${borderWidth}px dashed ${color}`
      : `${borderWidth}px solid ${color}`;

    const doubleDashedBorder = isEraser.value
      ? `0 0 0 ${borderWidth * 1.5}px rgba(0,0,0,0.5)`
      : `0 0 0 ${borderWidth * 1}px rgba(0,0,0,0.5)`;

    return {
      position: 'absolute',
      left: `${cursorPos.value.x * scale.value + panX.value}px`,
      top: `${cursorPos.value.y * scale.value + panY.value}px`,
      width: `${size}px`,
      height: `${size}px`,
      border: dashedBorder,
      boxShadow: doubleDashedBorder,
      borderRadius: '50%',
      pointerEvents: 'none',
      transform: 'translate(-50%, -50%)',
      display: cursorVisible.value ? 'block' : 'none',
    };
  });

  // ==================================================
  // 共通
  // ==================================================

  // 現在の設定（ブラシ/消しゴムのサイズや色）に基づいてブラシカーソルを更新する関数
  function updateBrushCursor() {
    const size = isEraser.value ? eraserSize.value : brushSize.value;

    if (!isEraser.value) {
      const { r, g, b, a } = selectedColor.value;
      brushCursor.value = createCircleCursor(size, {
        color: `rgba(${r},${g},${b},${a})`,
      });
    } else {
      const alpha = 0.8;
      brushCursor.value = createCircleCursor(size, {
        color: `rgba(80,80,80,${alpha})`,
        dashed: true,
      });
    }
  }

  // カーソルを非表示にする
  function hideCursor() {
    cursorVisible.value = false;
  }

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
