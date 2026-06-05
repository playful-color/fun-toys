import { defineStore } from 'pinia';
import { ref, Ref } from 'vue';
import type { PainterStore, PaintAction } from '@/types/painter';

export const usePainterStore = defineStore('painter', () => {
  const isPainting: Ref<boolean> = ref(false);
  const actions: Ref<PaintAction[]> = ref([]);
  const actionIndex: Ref<number> = ref(-1);
  const MAX_HISTORY_SIZE = 100;

  // 描画開始
  function startPainting(): void {
    isPainting.value = true;
  }

  // 描画終了
  function stopPainting(): void {
    isPainting.value = false;
  }

  function addAction(action: PaintAction): void {
    actions.value = actions.value.slice(0, actionIndex.value + 1);
    actions.value.push(action);
    if (actions.value.length > MAX_HISTORY_SIZE) {
      actions.value.shift();
    }
    actionIndex.value = actions.value.length - 1;
    save();
  }

  // Undo
  function undo(): void {
    if (actionIndex.value >= 0) {
      actionIndex.value--;
      save();
    }
  }

  // Redo
  function redo(): void {
    if (actionIndex.value < actions.value.length - 1) {
      actionIndex.value++;
      save();
    }
  }

  // 保存
  function save(): void {
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
  }

  // 復元
  function restore(): void {
    const raw = localStorage.getItem('painterActions');
    if (!raw) return;

    try {
      const data = JSON.parse(raw);
      actions.value = data.actions || [];
      actionIndex.value = data.actionIndex ?? actions.value.length - 1;
    } catch (error) {
      console.error('復元中にエラーが発生しました', error);
    }
  }

  return {
    isPainting,
    startPainting,
    stopPainting,
    actions,
    actionIndex,
    addAction,
    undo,
    redo,
    save,
    restore,
  };
});
