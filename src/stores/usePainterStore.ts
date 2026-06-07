/**
 * 【ペインターデータ管理ストア（Pinia）】
 * アプリ全体の描画履歴（タイムライン）、現在の再生位置（actionIndex）、Undo/Redo、
 * およびlocalStorageへの状態の保存・復元を一元管理する中心的な状態管理モジュール。
 *
 * NOTE:
 * - 履歴数が最大値（MAX_HISTORY_SIZE）を超えた場合、古い履歴を切り捨てる（配列前方削除）と同時に、
 *   現在位置（actionIndex）がマイナス方向にズレるのを防ぐためのインデックスズレ補正ロジックを搭載。
 * - 履歴の一部（currentActionなど）はリアクティブに管理されるが、Canvasの仕様上、不可逆なピクセル操作（バケツ等）のデータ実体は保持しない。
 * - SSR（Nuxt等）環境に移植する際は、localStorageアクセスによる「window is not defined」エラーを防ぐためのガードが必要。
 *
 * TODO: localStorageへのシリアライズ処理の最適化（データ肥大化時のパフォーマンス対策）。
 */
import { defineStore } from 'pinia';
import { ref, Ref } from 'vue';
import type { PaintAction } from '@/types/painter';

export const usePainterStore = defineStore('painter', () => {
  const isPainting: Ref<boolean> = ref(false);
  const actions: Ref<PaintAction[]> = ref([]);
  const currentAction = ref<PaintAction | null>(null);
  const actionIndex: Ref<number> = ref(-1);
  const MAX_HISTORY_SIZE = 100;

  // --- 描画ライフサイクル API -------------------------
  const startPainting = (): void => {
    isPainting.value = true;
  };

  const stopPainting = (): void => {
    isPainting.value = false;
  };

  // --- 履歴（アクション）操作 API ----------------------
  const addAction = (action: PaintAction): void => {
    // WHY: ユーザーがUndoした状態から新しい線を書き始めた際、不要になった「未来の履歴（やり直せるはずだった線）」を完全に削除してリセットするため
    actions.value.splice(actionIndex.value + 1);
    actions.value.push(action);

    if (actions.value.length > MAX_HISTORY_SIZE) {
      const overflow = actions.value.length - MAX_HISTORY_SIZE;
      actions.value.splice(0, overflow);

      // WHY: 配列の先頭（0番目）から古い要素を削ったことにより、全体のインデックスが手前にズレるため、現在位置（actionIndex）も同じ数だけ減算して同期を保つ（超重要バグ対策）
      actionIndex.value -= overflow;
    }

    actionIndex.value = actions.value.length - 1;
    save();
  };

  const undo = (): void => {
    // WHY: 履歴の起点（-1：画面に何も描かれていない初期状態）に達するまでは、インデックスを1つ戻すことで1つ前の描画状態へ遡る
    if (actionIndex.value >= 0) {
      actionIndex.value--;
      save();
    }
  };

  const redo = (): void => {
    // WHY: 保存されている最新の履歴配列の末尾に達するまでは、インデックスを1つ進めることでUndoした描画を元に戻す（再実行する）
    if (actionIndex.value < actions.value.length - 1) {
      actionIndex.value++;
      save();
    }
  };

  // --- 永続化（localStorage）ロジック -----------------
  const save = (): void => {
    try {
      localStorage.setItem(
        'painterActions',
        JSON.stringify({
          actions: actions.value,
          actionIndex: actionIndex.value,
        })
      );
    } catch (error) {
      console.error('保存中にエラーが発生しました', error);
    }
  };

  const restore = (): void => {
    const raw = localStorage.getItem('painterActions');
    if (!raw) return;

    try {
      const data = JSON.parse(raw);
      actions.value = data.actions || [];
      actionIndex.value = data.actionIndex ?? actions.value.length - 1;
    } catch (error) {
      console.error('復元中にエラーが発生しました', error);
    }
  };

  return {
    isPainting,
    startPainting,
    stopPainting,
    actions,
    currentAction,
    actionIndex,
    addAction,
    undo,
    redo,
    save,
    restore,
  };
});
