import { Ref } from 'vue';

interface Character {
  img: HTMLImageElement;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Props {
  characters: Character[];
}

export function useCanvas(
  props: Props,
  canvasWrapper: Ref<HTMLElement | null>,
  lineCanvas: Ref<HTMLCanvasElement | null>,
  paintCanvas: Ref<HTMLCanvasElement | null>,
  scale: Ref<number>,
  panX: Ref<number>,
  panY: Ref<number>
) {
  // ==========================================
  // キャンバスサイズを親要素に合わせる
  // ==========================================
  const resizeCanvasToWrapper = ({
    force = false,
  }: { force?: boolean } = {}): void => {
    if (!canvasWrapper.value || !lineCanvas.value || !paintCanvas.value) return;

    const rect = canvasWrapper.value.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    // lineCanvas リサイズ
    lineCanvas.value.width = width;
    lineCanvas.value.height = height;

    // paintCanvas の内容を保存
    const savedPaint = paintCanvas.value.toDataURL();

    // paintCanvas リサイズ
    paintCanvas.value.width = width;
    paintCanvas.value.height = height;

    if (savedPaint) {
      const imgPaint = new Image();
      imgPaint.src = savedPaint;

      imgPaint.onload = () => {
        const ctx = paintCanvas.value?.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(
          imgPaint,
          0,
          0,
          paintCanvas.value!.width,
          paintCanvas.value!.height
        );
      };
    }

    if (force) {
      lineCanvas.value.width = width;
      lineCanvas.value.height = height;
      paintCanvas.value.width = width;
      paintCanvas.value.height = height;
    }

    lineCanvas.value.style.width = `${width}px`;
    lineCanvas.value.style.height = `${height}px`;
    paintCanvas.value.style.width = `${width}px`;
    paintCanvas.value.style.height = `${height}px`;
  };

  // ==========================================
  // パン制限
  // ==========================================
  const clampPan = (): void => {
    const viewport = canvasWrapper.value?.parentElement;
    if (!viewport || !lineCanvas.value) return;

    const viewW = viewport.clientWidth;
    const viewH = viewport.clientHeight;

    const contentW = lineCanvas.value.width * scale.value;
    const contentH = lineCanvas.value.height * scale.value;

    const minX = Math.min(0, viewW - contentW);
    const minY = Math.min(0, viewH - contentH);

    panX.value = Math.min(0, Math.max(panX.value, minX));
    panY.value = Math.min(0, Math.max(panY.value, minY));
  };

  // ==========================================
  // lineCanvas 再描画
  // ==========================================
  const redrawLineCanvas = (): void => {
    if (!lineCanvas.value) return;

    const ctx = lineCanvas.value.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, lineCanvas.value.width, lineCanvas.value.height);

    ctx.setTransform(scale.value, 0, 0, scale.value, panX.value, panY.value);

    props.characters.forEach((ch) => {
      if (ch.img.complete) {
        ctx.drawImage(ch.img, ch.x, ch.y, ch.width, ch.height);
      }
    });
  };

  return {
    resizeCanvasToWrapper,
    clampPan,
    redrawLineCanvas,
  };
}
