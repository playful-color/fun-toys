/**
 * 【カラー管理・カラー履歴ストア（Pinia）】
 * 現在選択されているブラシ/バケツの色（selectedColor）と、ユーザーが直近で使用したカラー履歴（recentColors）を保持・制御する状態管理モジュール。
 *
 * NOTE:
 * - カラー履歴（recentColors）は最大6件に制限し、新しく使われた色が常に配列の「先頭（unshift）」に来るようにローテーション管理する。
 * - すでに履歴内に存在する色（同RGBA）が再度使われた場合は、古い位置の履歴を一度削除（splice）してから先頭へ移動させることで、純粋な「最近使った順」を維持する設計。
 *
 * TODO: カラー履歴（recentColors）の localStorage への永続化対応（アプリ再起動時への備え）。
 */
import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Color } from '@/types/painter';

export const useColorStore = defineStore('color', () => {
  const selectedColor = ref<Color>({ r: 242, g: 165, b: 160, a: 1 });
  const recentColors = ref<Color[]>([]);

  // --- カラー設定・比較 API ---------------------------
  const setSelectedColor = (color: Color | null): void => {
    if (!color) return;
    selectedColor.value = { ...color };
  };

  const isSameColor = (a: Color | null, b: Color | null): boolean => {
    if (!a || !b) return false;
    return a.r === b.r && a.g === b.g && a.b === b.b && a.a === b.a;
  };

  // --- カラー履歴（Recent）操作 API -------------------
  const pushRecentColor = (color: Color | null): void => {
    if (!color) return;

    // 履歴内における同色のインデックスを検索
    const index = recentColors.value.findIndex(
      (c) =>
        c.r === color.r && c.g === color.g && c.b === color.b && c.a === color.a
    );

    if (index === 0) return;

    if (index > 0) {
      recentColors.value.splice(index, 1);
    }

    // 最新の色を履歴の最上位（先頭）へスタック
    recentColors.value.unshift({ ...color });

    // WHY: パレットのUI表示枠（最大6マス想定）に綺麗に収め、無限に配列が肥大化してメモリを圧迫するのを防ぐための閾値制限
    if (recentColors.value.length > 6) {
      recentColors.value.pop();
    }
  };

  return {
    selectedColor,
    recentColors,
    setSelectedColor,
    pushRecentColor,
    isSameColor,
  };
});
