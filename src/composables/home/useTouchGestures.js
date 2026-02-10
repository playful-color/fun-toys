import { ref } from 'vue';

export function useTouchGestures({
  paintCanvas,
  startDrawing,
  draw,
  stopDrawing,
  isPainting,
  updateCursorPosition,
  hideCursor,
  panX,
  panY,
  scale,
  clampPan,
}) {
  const pendingDraw = ref(false);
  const isPinching = ref(false);
  const lastPinchDistance = ref(null);
  const lastPinchCenter = ref(null);

  // 2点間の距離
  const getPinchDistance = (touches) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // 中心点
  const getPinchCenter = (touches) => ({
    x: (touches[0].clientX + touches[1].clientX) / 2,
    y: (touches[0].clientY + touches[1].clientY) / 2,
  });

  // タッチ開始
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      pendingDraw.value = true;
      updateCursorPosition(e, {
        canvasRect: paintCanvas.value.getBoundingClientRect(),
        panX: panX.value,
        panY: panY.value,
        scale: scale.value,
      });
    } else if (e.touches.length === 2) {
      hideCursor();
      pendingDraw.value = false;
      if (!isPainting.value) {
        isPinching.value = true;
        lastPinchDistance.value = getPinchDistance(e.touches);
        lastPinchCenter.value = getPinchCenter(e.touches);
      }
    }
  };

  // タッチ移動
  const handleTouchMove = (e) => {
    if (pendingDraw.value && e.touches.length === 1) {
      updateCursorPosition(e, {
        canvasRect: paintCanvas.value.getBoundingClientRect(),
        panX: panX.value,
        panY: panY.value,
        scale: scale.value,
      });
    }

    // 描画開始
    if (pendingDraw.value && e.touches.length === 1 && !isPinching.value) {
      pendingDraw.value = false;
      updateCursorPosition(e, {
        canvasRect: paintCanvas.value.getBoundingClientRect(),
        panX: panX.value,
        panY: panY.value,
        scale: scale.value,
      });
      startDrawing(e);
    }

    // 描画中は常に描く
    if (isPainting.value && e.touches.length >= 1) {
      updateCursorPosition(e, {
        canvasRect: paintCanvas.value.getBoundingClientRect(),
        panX: panX.value,
        panY: panY.value,
        scale: scale.value,
      });
      draw(e);
      return; // ピンチズームは無視
    }

    // ピンチズーム
    if (isPinching.value && e.touches.length === 2) {
      e.preventDefault();
      e.stopPropagation();

      const newDistance = getPinchDistance(e.touches);
      const newCenter = getPinchCenter(e.touches);
      let delta = newDistance / lastPinchDistance.value;
      let newScale = scale.value * delta;
      newScale = Math.max(1, Math.min(3, newScale)); // min/maxスケール

      const ratio = newScale / scale.value;
      panX.value = (panX.value - lastPinchCenter.value.x) * ratio + newCenter.x;
      panY.value = (panY.value - lastPinchCenter.value.y) * ratio + newCenter.y;

      scale.value = newScale;
      clampPan();

      lastPinchDistance.value = newDistance;
      lastPinchCenter.value = newCenter;
    }
  };

  // タッチ終了
  const handleTouchEnd = (e) => {
    pendingDraw.value = false;
    if (e.touches.length < 2) {
      isPinching.value = false;
      lastPinchDistance.value = null;
      lastPinchCenter.value = null;
    }
    if (e.touches.length === 0) {
      hideCursor();
      stopDrawing();
    }
  };

  return {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  };
}
