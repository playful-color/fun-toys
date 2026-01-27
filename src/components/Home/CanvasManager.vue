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
// 管理分け予定
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useBrushCursor } from '@/composables/useBrushCursor';
import { usePainter } from '@/composables/usePainter';

defineExpose({
  changeRandomCharacter,
});

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
// 画像管理 -- useCharacterImageStore (ストア)　予定
// ==================================================
import pcA from '@/assets/images/home/01/2026_01a_pc.png';
import pcB from '@/assets/images/home/01/2026_01b_pc.png';
import pcC from '@/assets/images/home/01/2026_01c_pc.png';

import spA from '@/assets/images/home/01/2026_01a_sp.png';
import spB from '@/assets/images/home/01/2026_01b_sp.png';
import spC from '@/assets/images/home/01/2026_01c_sp.png';

const pcImages = [pcA, pcB, pcC];
const spImages = [spA, spB, spC];

// ==================================================
// Canvas要素と表示状態（拡大・移動）
// ==================================================

// Canvas要素の参照
const lineCanvas = ref(null);
const paintCanvas = ref(null);
const canvasWrapper = ref(null);

// 拡大率、移動量、パン制限
const scale = ref(1);
const initialScale = ref(1);
const panX = ref(0);
const panY = ref(0);
const minScale = 1;
const maxScale = 3;
const isMobile = ref(window.innerWidth <= 768);
let isPinching = false;
let pendingDraw = false;

// ==================================================
// ブラシカーソル表示制御
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
// タッチ操作・ピンチ操作 -- useCanvas 予定
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
// キャンバス移動量の制限
// ==================================================

// キャンバスが表示領域からはみ出さないようにする
function clampPan() {
  const viewport = canvasWrapper.value?.parentElement;
  if (!viewport || !lineCanvas.value) return;

  const viewW = viewport.clientWidth;
  const viewH = viewport.clientHeight;

  const contentW = lineCanvas.value.width * scale.value;
  const contentH = lineCanvas.value.height * scale.value;

  const minX = Math.min(0, viewW - contentW);
  const minY = Math.min(0, viewH - contentH);

  panX.value = Math.min(0, Math.max(panX.value, minX));
  panY.value = Math.min(0, Math.max(panY.value, minY));
}

// ==================================================
// 線画キャンバスの描画処理
// ==================================================

// 拡大・移動を反映して再描画
function redrawLineCanvas() {
  if (!lineCanvas.value) return;
  const ctx = lineCanvas.value.getContext('2d');

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, lineCanvas.value.width, lineCanvas.value.height);
  ctx.setTransform(scale.value, 0, 0, scale.value, panX.value, panY.value);

  props.characters.forEach((ch) => {
    if (ch.img.complete) {
      ctx.drawImage(ch.img, ch.x, ch.y, ch.width, ch.height);
    }
  });
}
watch([scale, panX, panY], () => {
  redrawLineCanvas();
});

// 全キャラクターを描画
let lineCtx = null;
function drawAllCharacters() {
  if (!lineCtx) return;
  lineCtx.clearRect(0, 0, lineCanvas.value.width, lineCanvas.value.height);
  props.characters.forEach((ch) => {
    if (ch.img.complete)
      lineCtx.drawImage(ch.img, ch.x, ch.y, ch.width, ch.height);
  });
}

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

// ==================================================
// Canvasサイズ調整
// ==================================================

// wrapperサイズに合わせてCanvasをリサイズ
function resizeCanvasToWrapper({ force = false } = {}) {
  if (!canvasWrapper.value) return;

  const rect = canvasWrapper.value.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;

  lineCanvas.value.width = width;
  lineCanvas.value.height = height;
  // paintCanvas は初期ロード時に保持したいので、既存内容を一時保存
  const savedPaint = paintCanvas.value.toDataURL();
  paintCanvas.value.width = width;
  paintCanvas.value.height = height;
  const imgPaint = new Image();
  imgPaint.src = savedPaint;
  imgPaint.onload = () => {
    const ctx = paintCanvas.value.getContext('2d');
    ctx.drawImage(
      imgPaint,
      0,
      0,
      paintCanvas.value.width,
      paintCanvas.value.height
    );
  };

  if (force) {
    lineCanvas.value.width = width;
    lineCanvas.value.height = height;
    paintCanvas.value.width = width;
    paintCanvas.value.height = height;
  }

  lineCanvas.value.style.width = `${width}px`;
  lineCanvas.value.style.height = `${height}px`;
  paintCanvas.value.style.width = `${width}px`;
  paintCanvas.value.style.height = `${height}px`;
}

// リサイズ時のまとめ処理
function handleResize() {
  resizeCanvasToWrapper();
  props.characters.forEach((ch) => {
    centerCharacter(ch);
  });
  drawAllCharacters();
}

// ==================================================
// 端末切り替え対応
// ==================================================

// 端末変更時の再初期化
function switchDevice() {
  const paintData = paintCanvas.value.toDataURL();
  resizeCanvasToWrapper();

  changeRandomCharacter();
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

// 端末とキャラ画像の不一致を防ぐ
function ensureCharacterMatchesDevice() {
  const currentType = getCurrentImageType();
  const shouldBe = isMobile.value ? 'sp' : 'pc';

  if (currentType && currentType !== shouldBe) {
    changeRandomCharacter();
  }
}

// 現在の画像種別取得
function getCurrentImageType() {
  if (!props.characters.length) return null;
  const src = props.characters[0].img.src;

  if (pcImages.includes(src)) return 'pc';
  if (spImages.includes(src)) return 'sp';

  return null;
}

// ==================================================
// キャラクター画像管理 -- useCharacterImageManager 予定
// ==================================================

// localStorageキー取得
function getStorageKey() {
  return isMobile.value ? 'currentCharacterSrc_sp' : 'currentCharacterSrc_pc';
}

// 前回と被らないランダム画像
function getRandomCharacterSrc() {
  const images = isMobile.value ? spImages : pcImages;
  const key = getStorageKey();
  const savedSrc = localStorage.getItem(key);
  let newSrc;

  do {
    newSrc = images[Math.floor(Math.random() * images.length)];
  } while (newSrc === savedSrc && images.length > 1);

  localStorage.setItem(key, newSrc);
  return newSrc;
}

// 初回のみランダム取得
const randomSrc = loadRandomCharacterOnce();
function loadRandomCharacterOnce() {
  const images = isMobile.value ? spImages : pcImages;
  const key = getStorageKey();
  const savedSrc = localStorage.getItem(key);

  if (savedSrc && images.includes(savedSrc)) {
    return savedSrc;
  }

  const randomSrc = images[Math.floor(Math.random() * images.length)];
  localStorage.setItem(key, randomSrc);
  return randomSrc;
}

//キャラクター切り替え
function changeRandomCharacter() {
  const newSrc = getRandomCharacterSrc();
  const img = new Image();
  img.src = newSrc;
  img.onload = () => {
    // 先にローカルストレージと PainterStore をクリア
    resetPaint();

    // キャラクター更新
    props.characters.splice(0, props.characters.length, {
      img,
      x: 0,
      y: 0,
      width: isMobile.value ? 400 : 1000,
      height:
        (isMobile.value ? 400 : 1000) * (img.naturalHeight / img.naturalWidth),
    });

    handleResize();
    drawAllCharacters();
    updateBrushCursor();
  };
}

// ==================================================
// 描画ロジック（Painter）
// ==================================================
let startDrawing, draw, stopDrawing, isPainting, undo, redo, resetPaint;
let lastTouchPos = null;
let lastPinchDistance = ref({ x: 0, y: 0 });
let lastPinchCenter = null;

// ==================================================
// ライフサイクル処理
// ==================================================
let onResize;
onMounted(() => {
  lineCtx = lineCanvas.value.getContext('2d');
  initialScale.value = scale.value;
  handleResize();

  onResize = () => {
    const wasMobile = isMobile.value;
    isMobile.value = window.innerWidth <= 768;

    handleResize();
    clampPan();

    if (wasMobile !== isMobile.value) {
      ensureCharacterMatchesDevice();
    }
  };

  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);

  if (!isMobile.value) {
    if (paintCanvas.value) paintCanvas.value.style.cursor = brushCursor.value;
  }
  updateBrushCursor();

  const painter = usePainter({
    // 描画関連のカスタムフックを利用
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

  // 描画関連のメソッドを取得
  startDrawing = painter.startDrawing;
  draw = painter.draw;
  stopDrawing = painter.stopDrawing;
  isPainting = painter.isPainting;
  undo = painter.undo;
  redo = painter.redo;
  resetPaint = painter.resetPaint;

  emit('updateUndoRedo', { undo, redo });
  emit('updateSaveImage', saveImage);

  // ランダムキャラクターを取得
  const img = new Image();
  img.src = randomSrc;
  img.onload = () => {
    props.characters.splice(0, props.characters.length, {
      img,
      x: 0,
      y: 0,
      width: window.innerWidth <= 768 ? 400 : 1000,
      height:
        (window.innerWidth <= 768 ? 400 : 1000) *
        (img.naturalHeight / img.naturalWidth),
    });
    handleResize();
    updateBrushCursor();
  };

  const el = canvasWrapper.value;
  if (!el) return;
  el.addEventListener('touchstart', handleTouchStart, { passive: false });
  el.addEventListener('touchmove', handleTouchMove, { passive: false });
  el.addEventListener('touchend', handleTouchEnd, { passive: false });
  el.addEventListener('touchcancel', handleTouchEnd, { passive: false });
  clampPan();
});

onUnmounted(() => {
  if (onResize) {
    window.removeEventListener('resize', onResize);
    window.removeEventListener('orientationchange', onResize);
  }
});

// ==================================================
// 画像保存処理
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
