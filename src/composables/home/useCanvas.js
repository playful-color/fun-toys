export function useCanvas(
  props,
  canvasWrapper,
  lineCanvas,
  paintCanvas,
  scale,
  panX,
  panY
) {
  // キャンバスのサイズを親要素（canvasWrapper）に合わせる関数
  const resizeCanvasToWrapper = ({ force = false } = {}) => {
    if (!canvasWrapper.value) return;

    const rect = canvasWrapper.value.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    lineCanvas.value.width = width;
    lineCanvas.value.height = height;
    const savedPaint = paintCanvas.value.toDataURL();
    if (!savedPaint) return;
    paintCanvas.value.width = width;
    paintCanvas.value.height = height;
    const imgPaint = new Image();
    imgPaint.src = savedPaint;
    imgPaint.onload = () => {
      const ctx = paintCanvas.value.getContext('2d');
      ctx.drawImage(
        imgPaint,
        0,
        0,
        paintCanvas.value.width,
        paintCanvas.value.height
      );
    };

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

  // パンニング（ドラッグ操作でキャンバスの位置を変更）を制限する関数
  const clampPan = () => {
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

  // `lineCanvas`（線を描画するキャンバス）の内容を再描画する関数
  const redrawLineCanvas = () => {
    if (!lineCanvas.value) return;
    const ctx = lineCanvas.value.getContext('2d');

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
