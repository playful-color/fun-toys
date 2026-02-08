export function useCoordinate({ paintCanvas, scale, panX, panY }) {
  // イベントからキャンバス座標を取得
  function getEventPos(e) {
    const rect = paintCanvas.value.getBoundingClientRect();
    let x = e.touches ? e.touches[0].clientX : e.clientX;
    let y = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (x - rect.left) / scale.value - panX.value,
      y: (y - rect.top) / scale.value - panY.value,
    };
  }

  // 座標変換（タッチイベント用）
  function getTransformedPos(e) {
    const s = scale?.value || 1;
    const rect = paintCanvas.value.getBoundingClientRect();
    return e.touches && e.touches.length > 0
      ? {
          x: (e.touches[0].clientX - rect.left) / s,
          y: (e.touches[0].clientY - rect.top) / s,
        }
      : { x: e.offsetX / s, y: e.offsetY / s };
  }

  return {
    getEventPos,
    getTransformedPos,
  };
}
