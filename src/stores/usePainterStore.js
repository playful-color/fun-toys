//usePainterStore.js
import { defineStore } from 'pinia';
import { ref } from 'vue';

export const usePainterStore = defineStore('painter', () => {
  
  // 描画状態
  const isPainting = ref(false);

  // ストロークの履歴
  const strokes = ref([]);
  
  // 現在のストロークインデックス
  const strokeIndex = ref(-1);

  // 描画開始
  function startPainting() {
    isPainting.value = true;
  }

  // 描画終了
  function stopPainting() {
    isPainting.value = false;
  }

  // 描画状態を保存する関数
  function save() {
    try {
      localStorage.setItem('painterStrokes', JSON.stringify({
        strokes: strokes.value,
        strokeIndex: strokeIndex.value
      }));
    } catch (error) {

    }
  }

  // 描画状態を復元する関数
  function restore() {
    const raw = localStorage.getItem('painterStrokes');
    if (!raw) return;

    try {
      const data = JSON.parse(raw);
      strokes.value = data.strokes || [];
      strokeIndex.value = data.strokeIndex ?? strokes.value.length - 1;
    } catch (error) {

    }
  }

  // 描画履歴をクリアする関数
  //function clear() {
  //  strokes.value = [];
  //  strokeIndex.value = -1;
  //  save(); // 履歴クリア後に状態を保存
  //}

  // Undo処理
  function undo() {
    if (strokeIndex.value >= 0) {
      strokeIndex.value--;
      save();
    }
  }

  // Redo処理
  function redo() {
    if (strokeIndex.value < strokes.value.length - 1) {
      strokeIndex.value++;
      save();
    }
  }

  // 新しいストロークを追加する関数
  const MAX_HISTORY_SIZE = 100;

  function addStroke(stroke) {
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
    addStroke,
    undo,
    redo,
    //clear,
    save,
    restore
  };
});
