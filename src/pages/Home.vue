<template>
  <div class="drawing-area">
    <Toolbar
      v-model:showColorPicker="showColorPicker"
      v-model:isEraser="isEraser"
      v-model:brushSize="brushSize"
      v-model:eraserSize="eraserSize"
      v-model:isPainting="isPainting"
      :recentColors="colorStore.recentColors"
      :undo="undoFn"
      :redo="redoFn"
      :saveImage="saveImageFn"
      @randomCharacter="changeRandomCharacter"
    />

    <CanvasManager
      ref="canvasManagerRef"
      :characters="characters"
      :is-eraser="isEraser"
      :brush-size="brushSize"
      :eraser-size="eraserSize"
      :selected-color="colorStore.selectedColor"
      @update:isPainting="isPainting = $event"
      @closePalette="showColorPicker = false"
      @updateUndoRedo="setUndoRedo"
      @updateSaveImage="setSaveImage"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import CanvasManager from '@/components/Home/CanvasManager.vue';
import Toolbar from '@/components/Home/Toolbar.vue';
import { useColorStore } from '@/stores/useColorStore';

// ストアとの連携
const colorStore = useColorStore();

// 描画関連の状態
const isPainting = ref(false); // 描画中かどうか
const showColorPicker = ref(false); // カラーピッカーを表示するか
const isEraser = ref(false); // 消しゴムモードかどうか
const brushSize = ref(20); // ブラシのサイズ
const eraserSize = ref(30); // 消しゴムのサイズ

// キャラクター関連
const characters = ref([]); // 描画対象のキャラクター

// Undo/Redo 関連の関数
const undoFn = ref(null); // Undo関数
const redoFn = ref(null); // Redo関数

// 画像保存機能
const saveImageFn = ref(() => {}); // 保存用の関数

// -----------------------
// Undo/Redoの設定
function setUndoRedo({ undo, redo }) {
  undoFn.value = undo;
  redoFn.value = redo;
}

function undo() {
  undoFn.value?.();
}

function redo() {
  redoFn.value?.();
}

// -----------------------
// 画像保存機能の設定
function setSaveImage(fn) {
  saveImageFn.value = fn;
}

const canvasManagerRef = ref(null);

function changeRandomCharacter() {
  canvasManagerRef.value?.changeRandomCharacter();
}
</script>

<style lang="scss" scoped>
@use '@/assets/styles/variables' as vars;
@use '@/assets/styles/mixins' as *;
.drawing-area {
  position: relative;
  width: 1200px;
  height: calc(100% - 40px);
  margin: 0 auto;
  overflow: hidden;
  @include sp {
    width: 100%;
    height: calc(100% - 9vw);
    margin: 0 0 0 auto;
  }
}

.canvas-container {
  .line {
    z-index: 2;
  }
  .paint {
    z-index: 1;
  }
}
</style>
