import type { Ref } from 'vue';

interface Position {
  x: number;
  y: number;
}

interface UseCoordinateParams {
  paintCanvas: Ref<HTMLCanvasElement | null>;
  scale: Ref<number>;
  panX: Ref<number>;
  panY: Ref<number>;
}

export function useCoordinate({
  paintCanvas,
  scale,
  panX,
  panY,
}: UseCoordinateParams) {
  // イベントからキャンバス座標を取得
  function getEventPos(e: MouseEvent | TouchEvent): Position {
    if (!paintCanvas.value) return { x: 0, y: 0 };

    const rect = paintCanvas.value.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const y = 'touches' in e ? e.touches[0].clientY : e.clientY;

    return {
      x: (x - rect.left) / scale.value - panX.value,
      y: (y - rect.top) / scale.value - panY.value,
    };
  }

  // 座標変換（タッチイベント用）
  function getTransformedPos(e: MouseEvent | TouchEvent): Position {
    if (!paintCanvas.value) return { x: 0, y: 0 };

    const s = scale?.value || 1;
    const rect = paintCanvas.value.getBoundingClientRect();

    if ('touches' in e && e.touches.length > 0) {
      return {
        x: (e.touches[0].clientX - rect.left) / s,
        y: (e.touches[0].clientY - rect.top) / s,
      };
    } else {
      const offsetX =
        'offsetX' in e
          ? e.offsetX
          : e instanceof MouseEvent
            ? e.clientX - rect.left
            : 0;
      const offsetY =
        'offsetY' in e
          ? e.offsetY
          : e instanceof MouseEvent
            ? e.clientY - rect.top
            : 0;
      return { x: offsetX / s, y: offsetY / s };
    }
  }

  return {
    getEventPos,
    getTransformedPos,
  };
}
