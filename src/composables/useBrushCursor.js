import { ref, watch, computed } from 'vue';

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
}) {
  const brushCursor = ref('crosshair'); // PCカーソル
  const cursorPos = ref({ x: 0, y: 0 }); // スマホ用カーソル位置
  const cursorVisible = ref(false); // スマホでのみ表示

  // -----------------------
  // PC用カーソル作成（色付き円）
  function createCircleCursor(size, options = {}) {
    const { color = 'rgba(0,0,0,0.6)', dashed = false } = options;
    const radius = size * 0.3;
    const diameter = radius * 2;

    const canvas = document.createElement('canvas');
    canvas.width = diameter;
    canvas.height = diameter;
    const ctx = canvas.getContext('2d');

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.setLineDash(dashed ? [4, 4] : []);
    ctx.beginPath();
    ctx.arc(radius, radius, radius - 1, 0, Math.PI * 2);
    ctx.stroke();

    return `url(${canvas.toDataURL()}) ${radius} ${radius}, auto`;
  }

  function updateBrushCursor() {
    const size = isEraser.value ? eraserSize.value : brushSize.value;
    const scaledSize = size * scale.value; // ここでスケールを反映

    if (!isEraser.value) {
      const { r, g, b, a } = selectedColor.value;
      brushCursor.value = createCircleCursor(scaledSize, {
        color: `rgba(${r},${g},${b},${a})`,
      });
    } else {
      const alpha = 0.8;
      brushCursor.value = createCircleCursor(scaledSize, {
        color: `rgba(80,80,80,${alpha})`,
        dashed: true,
      });
    }
  }

  // -----------------------
  // スマホ用カーソル更新
  function updateCursorPosition(
    touchEvent,
    { canvasRect: rect, panX: pan, panY: panYVal, scale: s }
  ) {
    if (!isMobile.value || touchEvent.touches.length === 0) return;

    rect = rect || { left: 0, top: 0 };
    const baseSize = isEraser.value ? eraserSize.value : brushSize.value;
    const brushRadius = baseSize * 0.3; // 描画と同じ比率で半径計算

    const offsetY = -50; // 指より少し上に表示
    cursorPos.value = {
      x: (touchEvent.touches[0].clientX - rect.left - pan) / s,
      y: (touchEvent.touches[0].clientY - rect.top - panYVal) / s + offsetY / s,
    };

    cursorVisible.value = true;
  }

  // -----------------------
  // 隠す
  function hideCursor() {
    cursorVisible.value = false;
  }

  // -----------------------
  // スマホカーソル用 style
  const cursorStyle = computed(() => {
    const baseSize = isEraser.value ? eraserSize.value : brushSize.value;
    const size = baseSize * 0.6; // 描画円と同じ直径に調整
    const borderWidth = 2; // 描画の線幅と揃える場合は scale しない

    const color = isEraser.value
      ? 'rgba(80,80,80,0.8)'
      : `rgba(${selectedColor.value.r},${selectedColor.value.g},${selectedColor.value.b},${selectedColor.value.a})`;

    return {
      position: 'absolute',
      left: cursorPos.value.x * scale.value + panX.value + 'px',
      top: cursorPos.value.y * scale.value + panY.value + 'px',
      width: `${size}px`,
      height: `${size}px`,
      border: isEraser.value
        ? `${borderWidth}px dashed ${color}`
        : `${borderWidth}px solid ${color}`,
      borderRadius: '50%',
      pointerEvents: 'none',
      transform: 'translate(-50%, -50%)',
    };
  });

  // -----------------------
  watch(
    [isEraser, brushSize, eraserSize, selectedColor, scale],
    updateBrushCursor,
    { immediate: true }
  );

  return {
    brushCursor, // PCカーソル
    cursorPos, // スマホカーソル位置
    cursorVisible, // スマホカーソル表示フラグ
    updateBrushCursor, // PC用更新
    updateCursorPosition,
    hideCursor,
    cursorStyle, // スマホカーソル style
  };
}
