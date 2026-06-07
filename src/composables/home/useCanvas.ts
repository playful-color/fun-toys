/**
 * 【Canvasレイアウト・リサイズ・パン制御 Composable】
 * 複数Canvas（キャラ・描画レイヤー）の親要素追従リサイズと、ズーム・パン座標系を管理。
 *
 * NOTE:
 * - 描画レイヤーのリサイズは `toDataURL` による一時退避＆復元を行うため、大Canvasで高負荷。
 * - キャラレイヤーは毎回全再描画（線形コスト）。
 * - `img.complete` 依存のため、画像ロードタイミングによる描画欠落リスク（バグの温床）あり。
 * - `clampPan` でズーム時の表示領域外への逸脱を制限。
 *
 * TODO: toDataURLの廃止、リサイズ時のキャッシュ化、preload導入による描画欠落防止。
 */
import { Ref } from 'vue';
import type { Character } from '@/types/painter';

/** コンポーネント内のキャラクター描画・管理対象として使用するProps */
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
  // --- Canvasサイズを親要素に同期 ---------------------
  const resizeCanvasToWrapper = ({
    force = false,
  }: { force?: boolean } = {}): void => {
    if (!canvasWrapper.value || !lineCanvas.value || !paintCanvas.value) return;

    const rect = canvasWrapper.value.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    const savedPaint = paintCanvas.value.toDataURL();

    // WHY:
    // - Canvasはリサイズで状態がリセットされるため復元が必要
    // - lineCanvas = キャラレイヤー / paintCanvas = 描画レイヤー

    lineCanvas.value.width = width;
    lineCanvas.value.height = height;

    paintCanvas.value.width = width;
    paintCanvas.value.height = height;

    if (savedPaint) {
      const img = new Image();
      img.src = savedPaint;

      img.onload = () => {
        const ctx = paintCanvas.value?.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(
          img,
          0,
          0,
          paintCanvas.value!.width,
          paintCanvas.value!.height
        );
      };
    }

    if (force) {
      // WHY:
      // - 強制リサイズ時はキャッシュ復元を行わず完全リセットする
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

  // --- パン制限（キャンバス外移動防止） ----------------
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

    // WHY:
    // - スケール後にキャンバスが画面外へ逃げるのを防ぐため
  };

  // --- キャラクターレイヤー再描画 ----------------------
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

    // WHY:
    // - キャラクターは状態を持たないため毎回フルリプレイ描画する設計
  };

  return {
    resizeCanvasToWrapper,
    clampPan,
    redrawLineCanvas,
  };
}
