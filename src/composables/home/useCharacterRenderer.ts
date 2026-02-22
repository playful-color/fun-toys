import { Ref, watch } from 'vue';

export interface Character {
  x: number;
  y: number;
  width: number;
  height: number;
  img: HTMLImageElement;
}

interface UseCharacterRendererOptions {
  characters: Character[];
  lineCanvas: Ref<HTMLCanvasElement | null>;
  scale: Ref<number>;
  panX: Ref<number>;
  panY: Ref<number>;
}

interface UseCharacterRendererReturn {
  initCtx: () => void;
  centerCharacter: (ch: Character) => void;
  centerAllCharacters: () => void;
  drawAllCharacters: () => void;
  redrawCharacters: () => void;
}

export function useCharacterRenderer({
  characters,
  lineCanvas,
  scale,
  panX,
  panY,
}: UseCharacterRendererOptions): UseCharacterRendererReturn {
  let lineCtx: CanvasRenderingContext2D | null = null;

  const initCtx = (): void => {
    if (!lineCanvas.value) return;
    lineCtx = lineCanvas.value.getContext('2d');
  };

  // キャラクターをCanvas中央に配置
  const centerCharacter = (ch: Character): void => {
    if (!lineCanvas.value) return;

    const canvasW = lineCanvas.value.width;
    const canvasH = lineCanvas.value.height;

    ch.x = (canvasW - ch.width) / 2;
    ch.y = (canvasH - ch.height) / 2;
  };

  // 全キャラクターを描画
  const drawAllCharacters = (): void => {
    if (!lineCtx || !lineCanvas.value) return;

    lineCtx.clearRect(0, 0, lineCanvas.value.width, lineCanvas.value.height);

    characters.forEach((ch: Character) => {
      if (ch.img.complete) {
        lineCtx!.drawImage(ch.img, ch.x, ch.y, ch.width, ch.height);
      }
    });
  };

  // scale / pan を反映して再描画
  const redrawCharacters = (): void => {
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
  watch([scale, panX, panY], (): void => {
    redrawCharacters();
  });

  // 全キャラクターを中央にまとめる
  const centerAllCharacters = (): void => {
    characters.forEach((ch: Character) => {
      centerCharacter(ch);
    });
  };

  return {
    initCtx,
    centerCharacter,
    centerAllCharacters,
    drawAllCharacters,
    redrawCharacters,
  };
}
