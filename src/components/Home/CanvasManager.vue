//☆
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
      <canvas
        ref="sparkCanvas"
        class="layer spark"
        style="pointer-events: none"
      ></canvas>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  ref,
  computed,
  watch,
  onMounted,
  onUnmounted,
  nextTick,
  type Ref,
} from 'vue';
import { useBrushCursor } from '@/composables/home/useBrushCursor';
import { usePainter } from '@/composables/home/usePainter';
import { useCanvas } from '@/composables/home/useCanvas';
import { useCharacterRenderer } from '@/composables/home/useCharacterRenderer';
import { useCharacterImage } from '@/composables/home/useCharacterImage';
import { useTouchGestures } from '@/composables/home/useTouchGestures';
import { useSparkEffect } from '@/effects/useSparkEffect';
import { useBucket } from '@/composables/home/useBucket';
const sparkEffect = useSparkEffect();
// ==================================================
// 型定義
// ==================================================
interface Character {
  img: HTMLImageElement;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Color {
  r: number;
  g: number;
  b: number;
  a: number;
}

// ==================================================
// Props & Emits
// ==================================================
const props = defineProps<{
  characters: Character[];
  isEraser: boolean;
  brushSize: number;
  eraserSize: number;
  selectedColor: Color;
  brushType: 'normal' | 'marker';
}>();

const emit = defineEmits<{
  (e: 'update:isPainting', value: boolean): void;
  (e: 'closePalette'): void;
  (e: 'updateUndoRedo', value: { undo: () => void; redo: () => void }): void;
  (e: 'updateSaveImage', value: () => void): void;
  (e: 'update:showColorPicker', val: boolean): void;
}>();

// ==================================================
// Canvas & 状態
// ==================================================
const lineCanvas = ref<HTMLCanvasElement | null>(null);
const paintCanvas = ref<HTMLCanvasElement | null>(null);
const canvasWrapper = ref<HTMLDivElement | null>(null);
const sparkCanvas = ref<HTMLCanvasElement | null>(null);

const scale = ref(1);
const initialScale = ref(1);
const panX = ref(0);
const panY = ref(0);
const isMobile = ref(window.innerWidth <= 768);
const isPinching = ref(false);
const canvasReady = ref(false); // 描画完了フラグ

// ==================================================
// キャラクター画像管理
// ==================================================
const { loadRandomCharacterOnce, changeRandomCharacter } =
  useCharacterImage(isMobile);

function changeCharacterFromButton(): void {
  if (isPainting?.value) return;

  canvasReady.value = false;
  changeRandomCharacter({
    resetPaint,
    characters: props.characters,
    onAfterChange: async () => {
      await nextTick();
      handleResize();
      drawAllCharacters();
      updateBrushCursor();
      canvasReady.value = true;
    },
  });
}

defineExpose({ changeRandomCharacter: changeCharacterFromButton });

// ==================================================
// キャラクター描画
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
  isPinching,
  canvasRect: computed(() => {
    const rect = paintCanvas.value?.getBoundingClientRect();
    return rect ?? { left: 0, top: 0, width: 0, height: 0 };
  }),
  panX,
  panY,
  scale,
});

// ==================================================
// Canvas 操作
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

// ==================================================
// Painter関連: undefined に統一
// ==================================================
let startDrawing: ((e: MouseEvent | TouchEvent) => void) | undefined;
let draw: ((e: MouseEvent | TouchEvent) => void) | undefined;
let stopDrawing: (() => void) | undefined;
let isPainting: Ref<boolean> | undefined;
let undo: (() => void) | undefined;
let redo: (() => void) | undefined;
let resetPaint: (() => void) | undefined;

let lineCtx: CanvasRenderingContext2D | null = null;

// ==================================================
// リサイズ
// ==================================================
let resizeTimer: ReturnType<typeof setTimeout> | null = null;

function handleResize(): void {
  if (resizeTimer) clearTimeout(resizeTimer);

  resizeTimer = window.setTimeout(() => {
    resizeCanvasToWrapper();
    requestAnimationFrame(() => {
      centerAllCharacters();
      drawAllCharacters();
      updateBrushCursor();
    });
  }, 100);
}

function switchDevice(): void {
  if (!paintCanvas.value) return;

  canvasReady.value = false;

  const paintData = paintCanvas.value.toDataURL();
  resizeCanvasToWrapper();

  changeRandomCharacter({
    resetPaint,
    characters: props.characters,
    onAfterChange: async () => {
      await nextTick();
      handleResize();
      drawAllCharacters();
      updateBrushCursor();
      canvasReady.value = true;
    },
  });

  centerAllCharacters();

  const img = new Image();
  img.src = paintData;
  img.onload = () => {
    if (!paintCanvas.value) return;
    const ctx = paintCanvas.value.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, paintCanvas.value.width, paintCanvas.value.height);
    ctx.drawImage(img, 0, 0, paintCanvas.value.width, paintCanvas.value.height);
    canvasReady.value = true;
  };
}

function handleResizeDevice(): void {
  const wasMobile = isMobile.value;
  isMobile.value = window.innerWidth <= 768;

  if (wasMobile !== isMobile.value) {
    switchDevice();
  }
}

window.addEventListener('resize', handleResizeDevice);
window.addEventListener('orientationchange', handleResizeDevice);

// ==================================================
// 保存
// ==================================================
function saveImage(): void {
  if (!paintCanvas.value || !lineCanvas.value) return;

  const width = lineCanvas.value.width;
  const height = lineCanvas.value.height;

  const out = document.createElement('canvas');
  out.width = width;
  out.height = height;

  const ctx = out.getContext('2d');
  if (!ctx) return;

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
onMounted(() => {
  if (!lineCanvas.value) return;

  lineCtx = lineCanvas.value.getContext('2d');
  initialScale.value = scale.value;

  initCtx();
  handleResize();

  const canvas = sparkCanvas.value;
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let animationId: number | null = null;

  const loop = (): void => {
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    sparkEffect.updateAndRender(ctx);

    if (sparkEffect.hasSparks()) {
      animationId = requestAnimationFrame(loop);
    } else {
      animationId = null;
    }
  };

  loop();

  onUnmounted((): void => {
    if (animationId !== null) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }

    sparkEffect.reset();
  });

  const painter = usePainter({
    paintCanvas,
    isEraser: computed(() => props.isEraser),
    brushType: computed(() => props.brushType),
    brushSize: computed(() => props.brushSize),
    eraserSize: computed(() => props.eraserSize),
    selectedColor: computed(() => props.selectedColor),
    scale,
    panX,
    panY,
    cursorPos,
    isMobile,
  });

  startDrawing = painter.startDrawing;
  draw = painter.draw;
  stopDrawing = painter.stopDrawing;
  isPainting = painter.isPainting;
  undo = painter.undo;
  redo = painter.redo;
  resetPaint = painter.resetPaint;

  const { handleTouchStart, handleTouchMove, handleTouchEnd } =
    useTouchGestures({
      paintCanvas,
      startDrawing,
      draw,
      stopDrawing,
      isPainting,
      updateCursorPosition,
      hideCursor,
      panX,
      panY,
      scale,
      clampPan,
    });

  canvasWrapper.value?.addEventListener('touchstart', handleTouchStart, {
    passive: false,
  });
  canvasWrapper.value?.addEventListener('touchmove', handleTouchMove, {
    passive: false,
  });
  canvasWrapper.value?.addEventListener('touchend', handleTouchEnd, {
    passive: false,
  });
  canvasWrapper.value?.addEventListener('touchcancel', handleTouchEnd, {
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
    requestAnimationFrame(() => {
      handleResize();
      updateBrushCursor();
      canvasReady.value = true;
    });
  };
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResizeDevice);
  window.removeEventListener('orientationchange', handleResizeDevice);
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
    &.spark {
      z-index: 3;
      pointer-events: none;
    }
  }
}

.mobile-cursor {
  z-index: 1000;
}
</style>
