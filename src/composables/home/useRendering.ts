/**
 * 【Canvas再構築（リプレイレンダリング） Composable】
 * PainterStoreの履歴（actions）を元に、ズーム・パンを反映したCanvasの再描画を行う。
 *
 * NOTE:
 * - 「毎回全履歴から再生成する」リプレイ型を採用（状態の整合性を最優先）。
 * - 履歴増加に伴う描画コストの肥大化に注意。
 *
 * TODO: 描画負荷が高まる場合は、スナップショットキャッシュやWeb Worker化を検討。
 */
import type { Ref } from 'vue';
import type { PainterStore } from '@/types/painter';
import { drawAction } from '@/utils/drawAction';

/** 履歴再描画（useRendering）への入力：Storeの確定履歴からCanvasへストロークを再構築するためのパラメータ */
interface UseRenderingParams {
  paintCanvas: Ref<HTMLCanvasElement | null>;
  scale: Ref<number>;
  panX: Ref<number>;
  panY: Ref<number>;
  painterStore: PainterStore;
}

export function useRendering({
  paintCanvas,
  scale,
  panX,
  panY,
  painterStore,
}: UseRenderingParams) {
  // --- 描画再構築（フルリレンダリング） ----------------
  function redrawPaint(): void {
    if (!paintCanvas.value) return;

    const ctx = paintCanvas.value.getContext('2d');
    if (!ctx) return;

    // WHY: Canvasは状態を持つため、差分ではなく毎回フル再構築する

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, paintCanvas.value.width, paintCanvas.value.height);

    ctx.setTransform(scale.value, 0, 0, scale.value, panX.value, panY.value);

    // 履歴描画（Undo / Redo）
    const actions = painterStore.actions.slice(0, painterStore.actionIndex + 1);

    for (const action of actions) {
      drawAction(ctx, action);
    }

    // 現在描画中のアクション
    if (painterStore.currentAction) {
      drawAction(ctx, painterStore.currentAction);
    }
  }

  return { redrawPaint };
}
