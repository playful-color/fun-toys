<template>
  <div class="canvas-viewport">
    <div v-if="cursorVisible" :style="cursorStyle" class="mobile-cursor"></div>
    <div class="canvas-container" ref="canvasWrapper">
      <canvas
        ref="lineCanvas"
        class="layer line"
        style="pointer-events: none"
      ></canvas>
      <canvas
        ref="paintCanvas"
        class="layer paint"
        @mousedown="startDrawing"
        @mousemove="draw"
        @mouseup="stopDrawing"
        @mouseleave="stopDrawing"
        :style="{ cursor: brushCursor }"
      >
      </canvas>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useBrushCursor } from '@/composables/home/useBrushCursor';
import { usePainter } from '@/composables/home/usePainter';
import { useCanvas } from '@/composables/home/useCanvas';
import { useCharacterRenderer } from '@/composables/home/useCharacterRenderer';
import { useCharacterImage } from '@/composables/home/useCharacterImage';
import { useTouchGestures } from '@/composables/home/useTouchGestures';

// ==================================================
// Props & Emits
// ==================================================
const props = defineProps({
  characters: Array,
  isEraser: Boolean,
  brushSize: Number,
  eraserSize: Number,
  selectedColor: Object,
});

const emit = defineEmits([
  'update:isPainting',
  'closePalette',
  'updateUndoRedo',
  'updateSaveImage',
]);

// ==================================================
// Canvas要素と表示状態
// ==================================================
const lineCanvas = ref(null);
const paintCanvas = ref(null);
const canvasWrapper = ref(null);

const scale = ref(1);
const initialScale = ref(1);
const panX = ref(0);
const panY = ref(0);
const isMobile = ref(window.innerWidth <= 768);

// ==================================================
// キャラクター画像管理
// ==================================================
const {
  loadRandomCharacterOnce,
  changeRandomCharacter,
  ensureCharacterMatchesDevice,
} = useCharacterImage(isMobile);

// 描画（ブラシ・消しゴム）中はキャラ切り替えを禁止して誤操作を防ぐ
function changeCharacterFromButton() {
  if (isPainting.value) return;
  changeRandomCharacter({
    resetPaint,
    characters: props.characters,
    onAfterChange: () => {
      handleResize();
      drawAllCharacters();
      updateBrushCursor();
    },
  });
}

defineExpose({
  changeRandomCharacter: changeCharacterFromButton,
});

// ==================================================
// キャラクター位置調整
// ==================================================

const { initCtx, centerAllCharacters, drawAllCharacters } =
  useCharacterRenderer({
    characters: props.characters,
    lineCanvas,
    scale,
    panX,
    panY,
  });

// ==================================================
// ブラシカーソル
// ==================================================
const {
  brushCursor,
  cursorPos,
  cursorVisible,
  updateBrushCursor,
  updateCursorPosition,
  hideCursor,
  cursorStyle,
} = useBrushCursor({
  isEraser: computed(() => props.isEraser),
  brushSize: computed(() => props.brushSize),
  eraserSize: computed(() => props.eraserSize),
  selectedColor: computed(() => props.selectedColor),
  isMobile,
  canvasRect: computed(
    () => paintCanvas.value?.getBoundingClientRect() || { left: 0, top: 0 }
  ),
  panX: panX,
  panY: panY,
  scale: scale,
});

// ==================================================
// Painter & Canvas 操作
// ==================================================
const { resizeCanvasToWrapper, clampPan } = useCanvas(
  props,
  canvasWrapper,
  lineCanvas,
  paintCanvas,
  scale,
  panX,
  panY
);

let startDrawing, draw, stopDrawing, isPainting, undo, redo, resetPaint;
let lineCtx = null;

// ==================================================
// リサイズ & 端末切替
// ==================================================
function handleResize() {
  resizeCanvasToWrapper();
  centerAllCharacters();
  drawAllCharacters();
  updateBrushCursor();
}

// 端末変更時の再初期化
function switchDevice() {
  const paintData = paintCanvas.value.toDataURL();
  resizeCanvasToWrapper();
  changeRandomCharacter({
    resetPaint,
    characters: props.characters,
    onAfterChange: () => {
      handleResize();
      drawAllCharacters();
      updateBrushCursor();
    },
  });
  centerAllCharacters();

  const img = new Image();
  img.src = paintData;
  img.onload = () => {
    const ctx = paintCanvas.value.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, paintCanvas.value.width, paintCanvas.value.height);
    ctx.drawImage(img, 0, 0, paintCanvas.value.width, paintCanvas.value.height);
  };
  updateBrushCursor();
}

// 端末変更検知
const handleResizeDevice = () => {
  const wasMobile = isMobile.value;
  isMobile.value = window.innerWidth <= 768;

  if (wasMobile !== isMobile.value) {
    switchDevice();
  }
};

window.addEventListener('resize', handleResizeDevice);
window.addEventListener('orientationchange', handleResizeDevice);

// ==================================================
// 保存処理
// ==================================================
async function saveImage() {
  if (!paintCanvas.value || !lineCanvas.value) return;

  const width = lineCanvas.value.width;
  const height = lineCanvas.value.height;

  const out = document.createElement('canvas');
  out.width = width;
  out.height = height;
  const ctx = out.getContext('2d');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  ctx.drawImage(paintCanvas.value, 0, 0, width, height);
  ctx.drawImage(lineCanvas.value, 0, 0, width, height);

  const link = document.createElement('a');
  link.download = 'painting.png';
  link.href = out.toDataURL('image/png');
  link.click();
}

// ==================================================
// ライフサイクル
// ==================================================
let onResize;
onMounted(() => {
  lineCtx = lineCanvas.value.getContext('2d');
  initialScale.value = scale.value;
  initCtx();
  handleResize();

  const painter = usePainter({
    paintCanvas,
    isEraser: computed(() => props.isEraser),
    brushSize: computed(() => props.brushSize),
    eraserSize: computed(() => props.eraserSize),
    selectedColor: computed(() => props.selectedColor),
    scale,
    panX,
    panY,
    updateBrushCursor,
    cursorPos,
    cursorVisible,
    isMobile,
  });

  startDrawing = painter.startDrawing;
  draw = painter.draw;
  stopDrawing = painter.stopDrawing;
  isPainting = painter.isPainting;
  undo = painter.undo;
  redo = painter.redo;
  resetPaint = painter.resetPaint;

  // タッチ操作・ピンチ操作
  const { handleTouchStart, handleTouchMove, handleTouchEnd } =
    useTouchGestures({
      paintCanvas,
      startDrawing,
      draw,
      stopDrawing,
      isPainting: isPainting,
      updateCursorPosition,
      hideCursor,
      panX,
      panY,
      scale,
      clampPan,
    });

  canvasWrapper.value.addEventListener('touchstart', handleTouchStart, {
    passive: false,
  });
  canvasWrapper.value.addEventListener('touchmove', handleTouchMove, {
    passive: false,
  });
  canvasWrapper.value.addEventListener('touchend', handleTouchEnd, {
    passive: false,
  });
  canvasWrapper.value.addEventListener('touchcancel', handleTouchEnd, {
    passive: false,
  });

  emit('updateUndoRedo', { undo, redo });
  emit('updateSaveImage', saveImage);

  // 初回ランダムキャラクター
  const img = new Image();
  img.src = loadRandomCharacterOnce();
  img.onload = () => {
    props.characters.splice(0, props.characters.length, {
      img,
      x: 0,
      y: 0,
      width: isMobile.value ? 400 : 1000,
      height:
        (isMobile.value ? 400 : 1000) * (img.naturalHeight / img.naturalWidth),
    });
    handleResize();
    updateBrushCursor();
  };

  onResize = () => {
    const wasMobile = isMobile.value;
    isMobile.value = window.innerWidth <= 768;
    handleResize();
    clampPan();
    if (wasMobile !== isMobile.value) {
      ensureCharacterMatchesDevice(props.characters, changeRandomCharacter);
    }
  };
});

onUnmounted(() => {
  if (onResize) {
    window.removeEventListener('resize', onResize);
    window.removeEventListener('orientationchange', onResize);
  }
});
</script>

<style lang="scss" scoped>
@use '@/assets/styles/variables' as vars;
@use '@/assets/styles/mixins' as *;

.canvas-viewport {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  @include sp {
    width: calc(100% - 11vw);
    position: absolute;
    right: 0;
  }
  .canvas-container {
    touch-action: none;
    -ms-touch-action: none;
    user-select: none;
    -webkit-user-select: none;
    -webkit-tap-highlight-color: transparent;
    position: relative;
    overflow: hidden;
    width: 100%;
    height: 100%;
  }
  .layer {
    position: absolute;
    top: 0;
    left: 0;
    &.line {
      z-index: 2;
    }
    &.paint {
      z-index: 1;
      background: rgba(255, 255, 255, 0.7);
    }
  }
}

.mobile-cursor {
  z-index: 1000;
}
</style>
