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
//管理分け予定 調整中
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useBrushCursor } from '@/composables/useBrushCursor';
import { usePainter } from '@/composables/usePainter';

defineExpose({
  changeRandomCharacter,
});

// -----------------------
// Propsの定義
// 親コンポーネントから渡される値を定義
const props = defineProps({
  characters: Array, // 描画するキャラクターの配列
  isEraser: Boolean, // 消しゴムモードかどうか
  brushSize: Number, // ブラシのサイズ
  eraserSize: Number, // 消しゴムのサイズ
  selectedColor: Object, // 選択中の色
});

const emit = defineEmits([
  // 親コンポーネントへ通知するイベント
  'update:isPainting',
  'closePalette',
  'updateUndoRedo',
  'updateSaveImage',
]);

// -----------------------
// リファレンスと状態の定義
const lineCanvas = ref(null); // 線の描画用キャンバス
const paintCanvas = ref(null); // 塗りつぶし用キャンバス
const canvasWrapper = ref(null); // キャンバスを囲むラッパー要素

let lineCtx = null; // 線描画用のコンテキスト
// ブラシのカーソルスタイル
const scale = ref(1); // キャンバスの拡大縮小比率
const initialScale = ref(1);
const minScale = 1; // 最小ズームスケール
const maxScale = 3; // 最大ズームスケール
const panX = ref(0); // X方向のパン（移動）
const panY = ref(0); // Y方向のパン（移動）
let isPinching = false; // ピンチ操作中かどうか
const isMobile = ref(window.innerWidth <= 768); // モバイル判定

// -----------------------
// 描画関連の変数（必要な変数を復元）
let startDrawing, draw, stopDrawing, isPainting, undo, redo, resetPaint;
let lastTouchPos = null; // タッチの位置を保存
let lastPinchDistance = null; // ピンチ操作時の距離を保存
let lastPinchCenter = null; // ピンチ操作時の中心を保存

// useBrushCursor でPC/スマホカーソル管理
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

// -----------------------
// タッチイベント関連
function getPinchDistance(touches) {
  // 2本指のピンチ距離を計算
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function getPinchCenter(touches) {
  // ピンチ操作時の中心位置を計算
  return {
    x: (touches[0].clientX + touches[1].clientX) / 2,
    y: (touches[0].clientY + touches[1].clientY) / 2,
  };
}

function handleTouchStart(e) {
  if (e.touches.length === 1) {
    isPinching = false;
    emit('closePalette');

    updateCursorPosition(e, {
      canvasRect: paintCanvas.value.getBoundingClientRect(),
      panX: panX.value,
      panY: panY.value,
      scale: scale.value,
    });

    startDrawing(e);
  } else if (e.touches.length === 2) {
    isPinching = true;
    stopDrawing();
    lastPinchDistance = getPinchDistance(e.touches);
    lastPinchCenter = getPinchCenter(e.touches);
  }
}
// -----------------------
// 黒領域からはみ出さないようにパン位置を制限
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

// -----------------------
// handleTouchMove 内でピンチズーム後に clampPan を呼ぶ
function handleTouchMove(e) {
  if (isPinching && e.touches.length === 2) {
    e.preventDefault();
    e.stopPropagation();

    const newDistance = getPinchDistance(e.touches);
    const newCenter = getPinchCenter(e.touches);

    // scale の更新
    let delta = newDistance / lastPinchDistance;
    let newScale = scale.value * delta;
    newScale = Math.max(initialScale.value, Math.min(maxScale, newScale));

    // ピンチ中心を考慮して pan を補正
    const ratio = newScale / scale.value;

    panX.value = (panX.value - lastPinchCenter.x) * ratio + newCenter.x;
    panY.value = (panY.value - lastPinchCenter.y) * ratio + newCenter.y;

    scale.value = newScale;
    clampPan();

    // 次回の計算用に更新
    lastPinchDistance = newDistance;
    lastPinchCenter = newCenter;
  } else if (!isPinching && e.touches.length === 1) {
    updateCursorPosition(e, {
      canvasRect: paintCanvas.value.getBoundingClientRect(),
      panX: panX.value,
      panY: panY.value,
      scale: scale.value,
    });
    draw(e); // 描画処理
  }
}

function handleTouchEnd(e) {
  // タッチ終了時の処理
  if (e.touches.length < 2) {
    isPinching = false;
    lastPinchDistance = null;
    lastPinchCenter = null;
  }
  if (e.touches.length === 0) {
    hideCursor();
    stopDrawing();
  } // 全てのタッチが終了したら描画を停止
}

// -----------------------
// キャラクター位置調整
function centerCharacter(ch) {
  const canvasW = lineCanvas.value.width;
  const canvasH = lineCanvas.value.height;

  ch.x = (canvasW - ch.width) / 2;
  ch.y = (canvasH - ch.height) / 2;
}

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

function handleResize() {
  resizeCanvasToWrapper();
  props.characters.forEach((ch) => {
    centerCharacter(ch);
  });
  drawAllCharacters();
}

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

const handleResizeDevice = () => {
  const wasMobile = isMobile.value;
  isMobile.value = window.innerWidth <= 768;

  if (wasMobile !== isMobile.value) {
    switchDevice();
  }
};

window.addEventListener('resize', handleResizeDevice);
window.addEventListener('orientationchange', handleResizeDevice);

function redrawLineCanvas() {
  if (!lineCanvas.value) return;
  const ctx = lineCanvas.value.getContext('2d');

  // ① 変換リセット
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, lineCanvas.value.width, lineCanvas.value.height);

  // ② pan / scale を適用（★ paintCanvas と完全一致）
  ctx.setTransform(scale.value, 0, 0, scale.value, panX.value, panY.value);

  // ③ キャラクター描画
  props.characters.forEach((ch) => {
    if (ch.img.complete) {
      ctx.drawImage(ch.img, ch.x, ch.y, ch.width, ch.height);
    }
  });
}
watch([scale, panX, panY], () => {
  redrawLineCanvas();
});
function drawAllCharacters() {
  // 全キャラクターをキャンバスに描画
  if (!lineCtx) return;
  lineCtx.clearRect(0, 0, lineCanvas.value.width, lineCanvas.value.height); // 画面をクリア
  props.characters.forEach((ch) => {
    if (ch.img.complete)
      lineCtx.drawImage(ch.img, ch.x, ch.y, ch.width, ch.height); // キャラクター画像を描画
  });
}

// -----------------------
// ランダムキャラクターのロジック
import pcA from '@/assets/images/home/01/2026_01a_pc.png';
import pcB from '@/assets/images/home/01/2026_01b_pc.png';
import pcC from '@/assets/images/home/01/2026_01c_pc.png';

import spA from '@/assets/images/home/01/2026_01a_sp.png';
import spB from '@/assets/images/home/01/2026_01b_sp.png';
import spC from '@/assets/images/home/01/2026_01c_sp.png';

const pcImages = [pcA, pcB, pcC];
const spImages = [spA, spB, spC];

function getStorageKey() {
  return isMobile.value ? 'currentCharacterSrc_sp' : 'currentCharacterSrc_pc';
}

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

function getCurrentImageType() {
  if (!props.characters.length) return null;
  const src = props.characters[0].img.src;

  if (pcImages.includes(src)) return 'pc';
  if (spImages.includes(src)) return 'sp';

  return null;
}
function ensureCharacterMatchesDevice() {
  const currentType = getCurrentImageType();
  const shouldBe = isMobile.value ? 'sp' : 'pc';

  if (currentType && currentType !== shouldBe) {
    changeRandomCharacter();
  }
}

// -----------------------
// マウント時の初期化処理
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
  updateBrushCursor(); // カーソルを初期化

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

  emit('updateUndoRedo', { undo, redo }); // undo/redoの情報を親コンポーネントに通知
  emit('updateSaveImage', saveImage); // 保存処理のイベントを親コンポーネントに通知

  const randomSrc = loadRandomCharacterOnce(); // ランダムキャラクターを取得
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
    handleResize(); // キャラクターの位置調整
    updateBrushCursor(); // カーソル更新
    // resetPaintは呼ばない
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
// -----------------------
// 保存処理

async function saveImage() {
  // 画像保存処理
  if (!paintCanvas.value || !lineCanvas.value) return;

  const width = lineCanvas.value.width;
  const height = lineCanvas.value.height;

  const out = document.createElement('canvas'); // 新しいキャンバスを作成
  out.width = width;
  out.height = height;
  const ctx = out.getContext('2d');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height); // 背景を白で塗りつぶす

  ctx.drawImage(paintCanvas.value, 0, 0, width, height); // 塗りつぶしキャンバスを描画
  ctx.drawImage(lineCanvas.value, 0, 0, width, height); // 線のキャンバスを描画

  const link = document.createElement('a');
  link.download = 'painting.png'; // ダウンロード用のリンクを作成
  link.href = out.toDataURL('image/png'); // キャンバスの内容を画像データURLとして設定
  link.click(); // ダウンロードを実行
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
