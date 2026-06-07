<template>
  <div class="color-picker-with-alpha picker-container">
    <!-- 透過（α）スライダー -->
    <input
      type="range"
      min="0"
      max="1"
      step="0.01"
      v-model.number="alpha"
      class="alpha-slider"
    />

    <!-- 色選択 -->
    <input type="color" :value="hex" @input="onInput" class="color-input" />

    <!-- 最近使った色 -->
    <div class="recent-color" v-if="colorStore.recentColors.length">
      <div
        v-for="(c, i) in colorStore.recentColors"
        :key="i"
        class="swatch"
        :style="{ backgroundColor: rgbaString(c) }"
        @click="selectRecent(c)"
      ></div>
    </div>

    <!-- プリセットカラー -->
    <div class="palette">
      <div
        v-for="c in presetColors"
        :key="c.hex"
        class="swatch"
        :style="{ backgroundColor: rgbaString(c.rgb) }"
        @click="selectPreset(c)"
      ></div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 【カラーピッカー（色選択・管理）コンポーネント】
 * プリセットパレットからの色選択、カラーピッカー（input[type=color]）との双方向バインド、透明度（Alpha値）調整、および最近使用した色の同期を行うUIレイヤー。
 *
 * NOTE:
 * - HTML標準の `input[type=color]` はHEX形式しか扱えないため、Store側のRGBAモデルとの間で双方向の相互変換（HEX ⇔ RGBA）を `computed` と `onInput` で中継する設計。
 * - 最近使用した色（recentColors）への追加タイミングは、このUI選択時ではなく、キャンバスに実際にストロークを「描き終えた瞬間（確定時）」に子モジュール側で集約管理する。
 *
 * TODO: 16進数（HEX）とRGBAの相互変換ロジックを外部の純粋なカラーユーティリティ関数（utils/color）へ切り出し。
 */

import { ref, computed } from 'vue';
import type { Color } from '@/types/painter';
import { useColorStore } from '@/stores/useColorStore';

/** パレットに並べるプリセットボタン用のデータ構造 */
interface PresetColor {
  hex: string;
  rgb: Color;
}

const colorStore = useColorStore();

// ツールバーと調和するパステル・基本色のパレット定義
const presetColors = ref<PresetColor[]>([
  { hex: '#F2A5A0', rgb: { r: 242, g: 165, b: 160, a: 1 } },
  { hex: '#F7C8A0', rgb: { r: 247, g: 200, b: 160, a: 1 } },
  { hex: '#F5E29F', rgb: { r: 245, g: 226, b: 159, a: 1 } },
  { hex: '#CDE6A6', rgb: { r: 205, g: 230, b: 166, a: 1 } },
  { hex: '#A6D8C9', rgb: { r: 166, g: 216, b: 201, a: 1 } },
  { hex: '#A7C4F2', rgb: { r: 167, g: 196, b: 242, a: 1 } },
  { hex: '#C7A7F2', rgb: { r: 199, g: 167, b: 242, a: 1 } },
  { hex: '#E2A6C8', rgb: { r: 226, g: 166, b: 200, a: 1 } },
  { hex: '#D1B38A', rgb: { r: 209, g: 179, b: 138, a: 1 } },
  { hex: '#B7B7B7', rgb: { r: 183, g: 183, b: 183, a: 1 } },
  { hex: '#A97B5B', rgb: { r: 169, g: 123, b: 91, a: 1 } },
  { hex: '#000000', rgb: { r: 0, g: 0, b: 0, a: 1 } },
]);

// --- Store状態同期・リアクティブデータ --------------
const rgba = computed<Color>({
  get: () => ({ ...colorStore.selectedColor }),
  set: (val) => colorStore.setSelectedColor(val),
});

const hex = computed<string>(() => {
  // WHY: 標準のカラーパレット（input型）に色情報を正しく表示させるため、RGBAのRGB値を16進数文字列（#ffffff形式）へ変換する必要があるため
  const { r, g, b } = colorStore.selectedColor;
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
});

const alpha = computed<number>({
  get: () => colorStore.selectedColor.a,
  set: (val) => {
    // WHY: カラーパレットの不透明度スライダー（0.0〜1.0）の動きを、既存のRGB値を破壊せずにAlpha値だけをピンポイントでStoreへ同期させるため
    colorStore.setSelectedColor({
      ...colorStore.selectedColor,
      a: val,
    });
  },
});

// --- パレット操作・カラー入力 API -------------------
const onInput = (e: Event): void => {
  const target = e.target as HTMLInputElement;
  const h = target.value;

  // WHY: input[type=color] から発火した16進数カラー（例: #ff0000）を、Canvas描画エンジンが理解できる10進数のr, g, b（0〜255）へと復元・変換するため
  const r = parseInt(h.slice(1, 3), 16);
  const g = parseInt(h.slice(3, 5), 16);
  const b = parseInt(h.slice(5, 7), 16);

  colorStore.setSelectedColor({
    ...colorStore.selectedColor,
    r,
    g,
    b,
  });
};

const selectPreset = (c: PresetColor): void => {
  colorStore.setSelectedColor({ ...c.rgb });
};

const selectRecent = (c: Color): void => {
  // WHY: 過去履歴から色を再選択した際、透明度の設定値（a）も含めて完全なクローン状態で色状態を復元・同期させるため
  colorStore.setSelectedColor({ ...c });
};

const rgbaString = (c: Color): string => {
  // WHY: HTMLのDOM要素（パレットの背景色など）のインラインCSS（style）として直接利用できる、rgba()形式の文字列を生成するため
  return `rgba(${c.r},${c.g},${c.b},${c.a})`;
};
</script>

<style lang="scss" scoped>
@use '@/assets/styles/variables' as vars;
@use '@/assets/styles/mixins' as *;
.picker-container {
  width: 200px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  .color-input {
    width: 100%;
    height: 30px;
    border: none;
    cursor: pointer;
    margin-bottom: 8px;
  }
  .alpha-slider {
    width: 100%;
    height: 15px;
    border-radius: 8px;
    background: linear-gradient(
      to right,
      rgba(255, 0, 255, 0),
      rgba(255, 0, 255, 1)
    );
    outline: none;
    cursor: pointer;
  }
}

.palette,
.recent-color {
  display: flex;
  gap: 8px;
}

.palette {
  display: flex;
  flex-wrap: wrap;
  position: fixed;
  bottom: 20px;
  left: 20px;
}
.swatch {
  width: 30px;
  height: 30px;
  border-radius: 4px;
  cursor: pointer;
  border: 1px solid #aaa;
}

@include sp {
  .palette {
    bottom: 0;
    left: 3vw;
    width: 98vw;
  }
}
</style>
