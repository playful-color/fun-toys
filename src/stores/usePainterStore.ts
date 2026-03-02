import { defineStore } from 'pinia';
import { ref, Ref } from 'vue';

// ストロークの型定義
interface Stroke {
  points: { x: number; y: number }[]; // ストロークのポイント
  color: { r: number; g: number; b: number; a: number }; // 色
  size: number; // サイズ
  isEraser: boolean; // 消しゴムかどうか
}

export const usePainterStore = defineStore('painter', () => {
  // 描画状態
  const isPainting: Ref<boolean> = ref(false);

  // ストロークの履歴
  const strokes: Ref<Stroke[]> = ref([]);

  // 現在のストロークインデックス
  const strokeIndex: Ref<number> = ref(-1);

  // 現在のストローク
  const currentStroke: Ref<Stroke | null> = ref(null);

  // 描画開始
  function startPainting(): void {
    isPainting.value = true;
  }

  // 描画終了
  function stopPainting(): void {
    isPainting.value = false;
  }

  // 描画状態を保存する関数
  function save(): void {
    try {
      localStorage.setItem(
        'painterStrokes',
        JSON.stringify({
          strokes: strokes.value,
          strokeIndex: strokeIndex.value,
        })
      );
    } catch (error) {
      console.error('保存中にエラーが発生しました', error);
    }
  }

  // 描画状態を復元する関数
  function restore(): void {
    const raw = localStorage.getItem('painterStrokes');
    if (!raw) return;

    try {
      const data = JSON.parse(raw);
      strokes.value = data.strokes || [];
      strokeIndex.value = data.strokeIndex ?? strokes.value.length - 1;
    } catch (error) {
      console.error('復元中にエラーが発生しました', error);
    }
  }

  // Undo処理
  function undo(): void {
    if (strokeIndex.value >= 0) {
      strokeIndex.value--;
      save();
    }
  }

  // Redo処理
  function redo(): void {
    if (strokeIndex.value < strokes.value.length - 1) {
      strokeIndex.value++;
      save();
    }
  }

  // 新しいストロークを追加する関数
  const MAX_HISTORY_SIZE = 100;

  function addStroke(stroke: Stroke): void {
    strokes.value = strokes.value.slice(0, strokeIndex.value + 1);
    strokes.value.push(stroke);
    if (strokes.value.length > MAX_HISTORY_SIZE) {
      strokes.value.shift();
    }
    strokeIndex.value = strokes.value.length - 1;
    save();
  }

  return {
    isPainting,
    startPainting,
    stopPainting,
    strokes,
    strokeIndex,
    currentStroke,
    addStroke,
    undo,
    redo,
    save,
    restore,
  };
});
