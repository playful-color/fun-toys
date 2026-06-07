/**
 * 【キャラクター描画管理 Composable】
 * ズーム・パンを反映したキャラクター画像のCanvas描画と、中央配置などのレイアウト制御を管理。
 *
 * NOTE:
 * - `watch` により scale / pan の変化を検知して自動で全再描画（clearRect → 描画）が走る。
 * - `img.complete` 依存のため、画像ロードタイミングによる描画欠落リスクあり。
 * - 座標の変形は `setTransform` で直接上書きするため、累積変形の影響を受けない設計。
 *
 * TODO: ロード完了の保証（onload/preload）、座標更新と描画責務の分離、キャッシュ化による負荷軽減。
 */
import { Ref, watch } from 'vue';
import type { Character } from '@/types/painter';

/** Composableへの入力：Canvas状態と表示制御情報 */
interface UseCharacterRendererOptions {
  characters: Character[];
  lineCanvas: Ref<HTMLCanvasElement | null>;
  scale: Ref<number>;
  panX: Ref<number>;
  panY: Ref<number>;
}

/** Composableからの戻り値：外部（CanvasManager等）へ公開する描画API群 */
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

  // --- Canvas初期化 ----------------------------------
  const initCtx = (): void => {
    if (!lineCanvas.value) return;
    lineCtx = lineCanvas.value.getContext('2d');
  };

  // --- キャラクター配置（中央揃え） --------------------
  const centerCharacter = (ch: Character): void => {
    if (!lineCanvas.value) return;

    const canvasW = lineCanvas.value.width;
    const canvasH = lineCanvas.value.height;

    ch.x = (canvasW - ch.width) / 2;
    ch.y = (canvasH - ch.height) / 2;
  };

  // --- 全キャラクター描画（リプレイ方式） --------------
  const drawAllCharacters = (): void => {
    if (!lineCtx || !lineCanvas.value) return;

    lineCtx.clearRect(0, 0, lineCanvas.value.width, lineCanvas.value.height);

    characters.forEach((ch: Character) => {
      if (ch.img.complete) {
        lineCtx!.drawImage(ch.img, ch.x, ch.y, ch.width, ch.height);
      }
    });
  };

  // --- 再描画（scale / pan反映） ----------------------
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

  // --- 自動再描画（transform変更追従） ----------------
  watch([scale, panX, panY], (): void => {
    redrawCharacters();
  });

  // --- 全キャラ中央配置 -------------------------------
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
