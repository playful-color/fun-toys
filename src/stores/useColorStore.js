import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useColorStore = defineStore('color', () => {
  // デフォルト色：ピンク
  const selectedColor = ref({ r: 255, g: 0, b: 255, a: 1 });
  
  // 最近使用した色の履歴
  const recentColors = ref([]);

  // 選択された色を設定する関数
  function setSelectedColor(color) {
    if (color) {
      selectedColor.value = { ...color };
    }
  }

  // 2つの色が同じかどうかをチェックする関数
  function isSameColor(a, b) {
    if (!a || !b) return false;
    return a.r === b.r && a.g === b.g && a.b === b.b && a.a === b.a;
  }

  // 最近使用した色を履歴に追加
  function pushRecentColor(color) {
    if (!color) return;

    // 既存の色を探す
    const index = recentColors.value.findIndex(
      (c) => c.r === color.r && c.g === color.g && c.b === color.b && c.a === color.a
    );

    // すでに先頭にあれば何もしない
    if (index === 0) return;

    // 既存の色を削除して新しい色を先頭に追加
    if (index > 0) recentColors.value.splice(index, 1);
    recentColors.value.unshift({ ...color });

    // 履歴が6色を超えないように調整
    if (recentColors.value.length > 6) {
      recentColors.value.pop(); // 最後の色を削除
    }
  }

  return {
    selectedColor,
    recentColors,
    setSelectedColor,
    pushRecentColor,
  };
});
