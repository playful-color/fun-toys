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
import { useCharacterImage } from '@/composables/home/useCharacterImage';

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
const minScale = 1;
const maxScale = 3;
const isMobile = ref(window.innerWidth <= 768);

let isPinching = false;
let pendingDraw = false;
let lastPinchDistance = null;
let lastPinchCenter = null;

// ==================================================
// キャラクター画像管理
// ==================================================
const {
  currentImage,
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

// キャラクターをキャンバス中央に配置
function centerCharacter(ch) {
  const canvasW = lineCanvas.value.width;
  const canvasH = lineCanvas.value.height;
  ch.x = (canvasW - ch.width) / 2;
  ch.y = (canvasH - ch.height) / 2;
}

// 全キャラクターを描画
function drawAllCharacters() {
  if (!lineCtx) return;
  lineCtx.clearRect(0, 0, lineCanvas.value.width, lineCanvas.value.height);
  props.characters.forEach((ch) => {
    if (ch.img.complete)
      lineCtx.drawImage(ch.img, ch.x, ch.y, ch.width, ch.height);
  });
}

// 拡大・移動を反映して再描画
watch([scale, panX, panY], () => {
  redrawLineCanvas();
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
const { resizeCanvasToWrapper, clampPan, redrawLineCanvas } = useCanvas(
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
// タッチ操作・ピンチ操作 -- 責務分離 予定
// ==================================================

// 2点間の距離を計算
function getPinchDistance(touches) {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

// ピンチ中心を計算
function getPinchCenter(touches) {
  return {
    x: (touches[0].clientX + touches[1].clientX) / 2,
    y: (touches[0].clientY + touches[1].clientY) / 2,
  };
}

// タッチ開始（描画 or ピンチ開始）
function handleTouchStart(e) {
  if (e.touches.length === 1) {
    // まだ描画開始しない（Android対策）
    pendingDraw = true;

    // ★ カーソルだけは即表示・追従させる
    updateCursorPosition(e, {
      canvasRect: paintCanvas.value.getBoundingClientRect(),
      panX: panX.value,
      panY: panY.value,
      scale: scale.value,
    });
  } else if (e.touches.length === 2) {
    hideCursor();
    pendingDraw = false;
    if (!isPainting.value) {
      isPinching = true;
      lastPinchDistance = getPinchDistance(e.touches);
      lastPinchCenter = getPinchCenter(e.touches);
    }
  }
}

// 描画 or 拡大縮小
function handleTouchMove(e) {
  if (pendingDraw && e.touches.length === 1) {
    updateCursorPosition(e, {
      canvasRect: paintCanvas.value.getBoundingClientRect(),
      panX: panX.value,
      panY: panY.value,
      scale: scale.value,
    });
  }
  // 1本指が確定したらここで描画開始
  if (pendingDraw && e.touches.length === 1 && !isPinching) {
    pendingDraw = false;

    updateCursorPosition(e, {
      canvasRect: paintCanvas.value.getBoundingClientRect(),
      panX: panX.value,
      panY: panY.value,
      scale: scale.value,
    });

    startDrawing(e);
  }

  if (isPainting.value) {
    // 描画中は常に描く
    if (e.touches.length >= 1) {
      updateCursorPosition(e, {
        canvasRect: paintCanvas.value.getBoundingClientRect(),
        panX: panX.value,
        panY: panY.value,
        scale: scale.value,
      });
      draw(e);
    }
    return; // ピンチズームは無視
  }

  // 描画中でなければ通常のピンチ処理
  if (isPinching && e.touches.length === 2) {
    e.preventDefault();
    e.stopPropagation();

    const newDistance = getPinchDistance(e.touches);
    const newCenter = getPinchCenter(e.touches);

    let delta = newDistance / lastPinchDistance;
    let newScale = scale.value * delta;
    newScale = Math.max(initialScale.value, Math.min(maxScale, newScale));

    const ratio = newScale / scale.value;

    panX.value = (panX.value - lastPinchCenter.x) * ratio + newCenter.x;
    panY.value = (panY.value - lastPinchCenter.y) * ratio + newCenter.y;

    scale.value = newScale;
    clampPan();

    lastPinchDistance = newDistance;
    lastPinchCenter = newCenter;
  }
}

// タッチ終了処理
function handleTouchEnd(e) {
  pendingDraw = false;
  // タッチ終了時の処理
  if (e.touches.length < 2) {
    isPinching = false;
    lastPinchDistance = null;
    lastPinchCenter = null;
  }
  if (e.touches.length === 0) {
    hideCursor();
    stopDrawing();
  }
}

// ==================================================
// リサイズ & 端末切替
// ==================================================
function handleResize() {
  resizeCanvasToWrapper();
  props.characters.forEach((ch) => {
    centerCharacter(ch);
  });
  drawAllCharacters();
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
  props.characters.forEach(centerCharacter);

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

  const el = canvasWrapper.value;
  el.addEventListener('touchstart', handleTouchStart, { passive: false });
  el.addEventListener('touchmove', handleTouchMove, { passive: false });
  el.addEventListener('touchend', handleTouchEnd, { passive: false });
  el.addEventListener('touchcancel', handleTouchEnd, { passive: false });

  onResize = () => {
    const wasMobile = isMobile.value;
    isMobile.value = window.innerWidth <= 768;
    handleResize();
    clampPan();
    if (wasMobile !== isMobile.value) {
      ensureCharacterMatchesDevice(props.characters, changeRandomCharacter);
    }
  };
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);
});

onUnmounted(() => {
  if (onResize) {
    window.removeEventListener('resize', onResize);
    window.removeEventListener('orientationchange', onResize);
  }
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
  }
}

.mobile-cursor {
  z-index: 1000;
}
</style>
