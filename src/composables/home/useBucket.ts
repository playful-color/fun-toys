import { Ref } from 'vue';
import type { Color, BucketAction } from '@/types/painter';
import type { usePainterStore } from '@/stores/usePainterStore';

export function useBucket(
  paintCanvasRef: Ref<HTMLCanvasElement | null>,
  lineCanvasRef: Ref<HTMLCanvasElement | null>,
  painterStore: ReturnType<typeof usePainterStore>
) {
  function bucketFill(x: number, y: number, color: Color, skipHistory = false) {
    const paintCanvasEl = paintCanvasRef.value;
    const lineCanvasEl = lineCanvasRef.value;
    if (!paintCanvasEl || !lineCanvasEl) return;

    const paintCtx = paintCanvasEl.getContext('2d', {
      willReadFrequently: true,
    });
    const lineCtx = lineCanvasEl.getContext('2d', { willReadFrequently: true });
    if (!paintCtx || !lineCtx) return;

    const width = paintCanvasEl.width;
    const height = paintCanvasEl.height;

    const paintData = paintCtx.getImageData(0, 0, width, height);
    const lineData = lineCtx.getImageData(0, 0, width, height);

    const data = paintData.data;
    const line = lineData.data;

    const stack: [number, number][] = [[Math.floor(x), Math.floor(y)]];
    const visited = new Uint8Array(width * height);

    const fillR = color.r;
    const fillG = color.g;
    const fillB = color.b;
    const fillA = Math.floor(color.a * 255);

    const idx0 = Math.floor(y) * width + Math.floor(x);
    const startI = idx0 * 4;
    const startR = data[startI];
    const startG = data[startI + 1];
    const startB = data[startI + 2];
    const startA = data[startI + 3];

    function matchColor(i: number) {
      if (line[i + 3] > 0) return false;
      if (data[i + 3] === 0) return true;
      const tolerance = 10;
      return (
        Math.abs(data[i] - startR) <= tolerance &&
        Math.abs(data[i + 1] - startG) <= tolerance &&
        Math.abs(data[i + 2] - startB) <= tolerance &&
        Math.abs(data[i + 3] - startA) <= tolerance
      );
    }

    while (stack.length) {
      const [px, py] = stack.pop()!;
      if (px < 0 || py < 0 || px >= width || py >= height) continue;

      const idx = py * width + px;
      if (visited[idx]) continue;
      visited[idx] = 1;

      const i = idx * 4;
      if (!matchColor(i)) continue;

      data[i] = fillR;
      data[i + 1] = fillG;
      data[i + 2] = fillB;
      data[i + 3] = fillA;

      stack.push([px + 1, py]);
      stack.push([px - 1, py]);
      stack.push([px, py + 1]);
      stack.push([px, py - 1]);
    }

    paintCtx.putImageData(paintData, 0, 0);

    if (!skipHistory) {
      const bucketAction: BucketAction = {
        type: 'bucket',
        startPoint: { x, y },
        fillColor: color,
      };
      painterStore.addAction(bucketAction);
    }
  }

  return { bucketFill };
}
