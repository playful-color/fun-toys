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

<script setup lang="ts">
import { ref, computed } from 'vue';
import CanvasManager from '@/components/Home/CanvasManager.vue';
import Toolbar from '@/components/Home/Toolbar.vue';
import { useColorStore } from '@/stores/useColorStore';

// -----------------------
// 型定義
// -----------------------
interface Character {
  img: HTMLImageElement;
  x: number;
  y: number;
  width: number;
  height: number;
}

// -----------------------
// ストア
// -----------------------
const colorStore = useColorStore();

// -----------------------
// 描画関連の状態
// -----------------------
const isPainting = ref(false);
const showColorPicker = ref(false);
const isEraser = ref(false);
const brushSize = ref(20);
const eraserSize = ref(30);

// -----------------------
// キャラクター関連
// -----------------------
const characters = ref<Character[]>([]);

// 例: API等のデータをCharacter型に変換
const apiData = [
  { id: 1, name: 'Alice', imageUrl: 'https://placekitten.com/200/200' },
  { id: 2, name: 'Bob', imageUrl: 'https://placekitten.com/300/300' },
];

characters.value = apiData.map((d) => {
  const img = new Image();
  img.src = d.imageUrl;
  return {
    img,
    x: 0,
    y: 0,
    width: 100,
    height: 100,
  };
});

// -----------------------
// Undo / Redo / 保存
// -----------------------
const undoFn = ref<() => void>(() => {});
const redoFn = ref<() => void>(() => {});
const saveImageFn = ref<() => void>(() => {});

function setUndoRedo({ undo, redo }: { undo: () => void; redo: () => void }) {
  undoFn.value = undo;
  redoFn.value = redo;
}

function undo() {
  undoFn.value();
}

function redo() {
  redoFn.value();
}

function setSaveImage(fn: () => void) {
  saveImageFn.value = fn;
}

// -----------------------
// CanvasManager の参照
// -----------------------
const canvasManagerRef = ref<InstanceType<typeof CanvasManager> | null>(null);

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
