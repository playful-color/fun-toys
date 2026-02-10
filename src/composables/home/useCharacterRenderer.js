import { watch } from 'vue';

export function useCharacterRenderer({
  characters,
  lineCanvas,
  scale,
  panX,
  panY,
}) {
  let lineCtx = null;

  const initCtx = () => {
    if (lineCanvas.value) lineCtx = lineCanvas.value.getContext('2d');
  };

  // キャラクターをCanvas中央に配置
  const centerCharacter = (ch) => {
    const canvasW = lineCanvas.value.width;
    const canvasH = lineCanvas.value.height;
    ch.x = (canvasW - ch.width) / 2;
    ch.y = (canvasH - ch.height) / 2;
  };

  // 全キャラクターを描画
  const drawAllCharacters = () => {
    if (!lineCtx) return;
    lineCtx.clearRect(0, 0, lineCanvas.value.width, lineCanvas.value.height);

    characters.forEach((ch) => {
      if (ch.img.complete) {
        lineCtx.drawImage(ch.img, ch.x, ch.y, ch.width, ch.height);
      }
    });
  };

  // scale / pan を反映して再描画
  const redrawCharacters = () => {
    if (!lineCtx) return;
    lineCtx.setTransform(
      scale.value,
      0,
      0,
      scale.value,
      panX.value,
      panY.value
    );
    drawAllCharacters();
  };

  // scale / pan 変更時に自動再描画
  watch([scale, panX, panY], () => {
    redrawCharacters();
  });

  // 全キャラクターを中央にまとめる
  const centerAllCharacters = () => {
    characters.forEach(centerCharacter);
  };

  return {
    initCtx,
    centerCharacter,
    centerAllCharacters,
    drawAllCharacters,
    redrawCharacters,
  };
}
