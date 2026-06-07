/**
 * 【Canvas座標変換ユーティリティ Composable】
 * ズーム・パン（scale / pan）を考慮し、各種イベント座標をCanvas上のワールド座標へ変換。
 *
 * NOTE:
 * - `getEventPos`（主要）と `getTransformedPos`（補助）で pan の反映仕様が異なり、統一されていないため注意。
 * - タッチイベントは `touches[0]`（1本指）前提の実装。マルチタッチ時の挙動に注意が必要。
 * - `getBoundingClientRect` に依存しているため、親要素のCSS変形やスクロールの影響を受ける。
 *
 * TODO: 座標変換APIの統合、PointerEventへの統一による分岐削減、逆変換（screen ⇔ world）の明確化。
 */
import type { Ref } from 'vue';
import type { Point } from '@/types/painter';

type Position = Point;

/** 各種画面イベントの座標を、ズーム・パン（scale / pan）を考慮したワールド座標へ変換するための入力パラメータ */
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
  // --- 基本座標変換（描画基準座標） --------------------
  function getEventPos(e: MouseEvent | TouchEvent): Position {
    if (!paintCanvas.value) return { x: 0, y: 0 };

    const rect = paintCanvas.value.getBoundingClientRect();

    const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const y = 'touches' in e ? e.touches[0].clientY : e.clientY;

    // WHY: screen座標 → canvas座標へ変換（scale + pan補正）
    return {
      x: (x - rect.left) / scale.value - panX.value,
      y: (y - rect.top) / scale.value - panY.value,
    };
  }

  // --- 代替座標変換（簡易版） -------------------------
  function getTransformedPos(e: MouseEvent | TouchEvent): Position {
    if (!paintCanvas.value) return { x: 0, y: 0 };

    const rect = paintCanvas.value.getBoundingClientRect();
    const s = scale?.value || 1;

    // touch優先
    if ('touches' in e && e.touches.length > 0) {
      return {
        x: (e.touches[0].clientX - rect.left) / s,
        y: (e.touches[0].clientY - rect.top) / s,
      };
    }

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

    return {
      x: offsetX / s,
      y: offsetY / s,
    };
  }

  return {
    getEventPos,
    getTransformedPos,
  };
}
