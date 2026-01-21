<template>
  <div
    class="canvas-container"
    ref="canvasWrapper"
    :style="{ transform: `translate(${panX}px, ${panY}px) scale(${scale})`, transformOrigin: '0 0' }"
  >
    <canvas ref="lineCanvas" class="layer line" style="pointer-events: none;"></canvas>
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
</template>

<script setup>
import { ref, computed, watch, onMounted, defineExpose } from 'vue';
import { usePainter } from '@/composables/usePainter';

defineExpose({
  changeRandomCharacter
});

// -----------------------
// Propsの定義
// 親コンポーネントから渡される値を定義
const props = defineProps({
  characters: Array,  // 描画するキャラクターの配列
  isEraser: Boolean,  // 消しゴムモードかどうか
  brushSize: Number,   // ブラシのサイズ
  eraserSize: Number,  // 消しゴムのサイズ
  selectedColor: Object // 選択中の色
});

const emit = defineEmits([  // 親コンポーネントへ通知するイベント
  'update:isPainting',
  'closePalette',
  'updateUndoRedo',
  'updateSaveImage'
]);

// -----------------------
// リファレンスと状態の定義
const lineCanvas = ref(null);  // 線の描画用キャンバス
const paintCanvas = ref(null); // 塗りつぶし用キャンバス
const canvasWrapper = ref(null); // キャンバスを囲むラッパー要素
let lineCtx = null;  // 線描画用のコンテキスト
const brushCursor = ref('crosshair');  // ブラシのカーソルスタイル
const scale = ref(1);  // キャンバスの拡大縮小比率
const initialScale = ref(1); 
const minScale = 1;  // 最小ズームスケール
const maxScale = 3;    // 最大ズームスケール
const panX = ref(0);   // X方向のパン（移動）
const panY = ref(0);   // Y方向のパン（移動）
let isPinching = false;  // ピンチ操作中かどうか
const isMobile = ref(window.innerWidth <= 768);  // モバイル判定

// -----------------------
// 描画関連の変数（必要な変数を復元）
let startDrawing, draw, stopDrawing, isPainting, undo, redo, resetPaint;
let lastTouchPos = null;  // タッチの位置を保存
let lastPinchDistance = null; // ピンチ操作時の距離を保存
let lastPinchCenter = null; // ピンチ操作時の中心を保存

// -----------------------
// 描画用のカーソルと更新関数
function createCircleCursor(size, options = {}) {
  // カスタムカーソルを生成する関数
  const { color = 'rgba(0,0,0,0.6)', dashed = false } = options;
  const radius = size * 0.3;
  const diameter = radius * 2;
  const canvas = document.createElement('canvas');
  canvas.width = diameter;
  canvas.height = diameter;
  const ctx = canvas.getContext('2d');
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.setLineDash(dashed ? [4, 4] : []);
  ctx.beginPath();
  ctx.arc(radius, radius, radius - 1, 0, Math.PI * 2);
  ctx.stroke();
  return `url(${canvas.toDataURL()}) ${radius} ${radius}, auto`;  // CSS用のURLを返す
}

// ブラシカーソルを更新
function updateBrushCursor() {
  // 消しゴムとブラシでカーソルの見た目を切り替える
  if (!props.isEraser) {
    const { r, g, b, a } = props.selectedColor;
    brushCursor.value = createCircleCursor(props.brushSize, { color: `rgba(${r},${g},${b},${a})` });
  } else {
    const alpha = isPinching ? 0.4 : 0.8;
    brushCursor.value = createCircleCursor(props.eraserSize, { color: `rgba(80,80,80,${alpha})`, dashed: true });
  }
}

// Propsが変更された時にブラシカーソルを更新
watch(() => props.isEraser, updateBrushCursor);  // 消しゴムモードの変更を監視
watch(() => props.brushSize, updateBrushCursor);  // ブラシサイズの変更を監視
watch(() => props.eraserSize, updateBrushCursor); // 消しゴムサイズの変更を監視
watch(() => props.selectedColor, updateBrushCursor); // 色の変更を監視

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
    y: (touches[0].clientY + touches[1].clientY) / 2
  };
}

function handleTouchStart(e) {
  // タッチ開始時の処理
  if (e.touches.length === 1) {
    isPinching = false;
    emit('closePalette');  // パレットを閉じる
    startDrawing(e);  // 描画開始
  } else if (e.touches.length === 2) {
    isPinching = true;
    stopDrawing();  // 描画停止
    lastPinchDistance = getPinchDistance(e.touches);  // ピンチ距離を記録
    lastPinchCenter = getPinchCenter(e.touches);  // ピンチ中心を記録
  }
}
// -----------------------
// 黒領域からはみ出さないようにパン位置を制限
function clampPan() {
  if (!canvasWrapper.value || !lineCanvas.value) return;

  const containerWidth = canvasWrapper.value.clientWidth;
  const containerHeight = canvasWrapper.value.clientHeight;
  const scaledWidth = lineCanvas.value.width * scale.value;
  const scaledHeight = lineCanvas.value.height * scale.value;

  const minX = Math.min(0, containerWidth - scaledWidth);
  const maxX = 0;
  const minY = Math.min(0, containerHeight - scaledHeight);
  const maxY = 0;

  panX.value = Math.min(Math.max(panX.value, minX), maxX);
  panY.value = Math.min(Math.max(panY.value, minY), maxY);
}


// -----------------------
// handleTouchMove 内でピンチズーム後に clampPan を呼ぶ
function handleTouchMove(e) {
  if (isPinching && e.touches.length === 2) {
    e.preventDefault();

    const newDistance = getPinchDistance(e.touches);
    const newCenter = getPinchCenter(e.touches);

    let delta = newDistance / lastPinchDistance;
    let newScale = scale.value * delta;
    newScale = Math.max(initialScale.value, Math.min(maxScale, newScale));

    panX.value = (panX.value - lastPinchCenter.x) * (newScale / scale.value) + newCenter.x;
    panY.value = (panY.value - lastPinchCenter.y) * (newScale / scale.value) + newCenter.y;

    scale.value = newScale;
     clampPan(); // ←追加
    lastPinchDistance = newDistance;
    lastPinchCenter = newCenter;

   

  } else if (!isPinching && e.touches.length === 1) {
    draw(e);
  }
}



function handleTouchEnd(e) {
  // タッチ終了時の処理
  if (e.touches.length < 2) {
    isPinching = false;
    lastPinchDistance = null;
    lastPinchCenter = null;
  }
  if (e.touches.length === 0) stopDrawing();  // 全てのタッチが終了したら描画を停止
}


// -----------------------
// キャラクター位置調整
const handleResize = () => {
  // 画面サイズに合わせてキャラクター位置を調整
  isMobile.value = window.innerWidth <= 768;  // モバイル画面かどうかを判定
  if (!canvasWrapper.value) return;
  const containerWidth = canvasWrapper.value.clientWidth;
  const containerHeight = canvasWrapper.value.clientHeight;

  // キャラクターをキャンバスの中央に配置
  props.characters.forEach(ch => {
    ch.x = (lineCanvas.value.width - ch.width) / 2;
    ch.y = (lineCanvas.value.height - ch.height) / 2;
  });
  drawAllCharacters();
};

function drawAllCharacters() {
  // 全キャラクターをキャンバスに描画
  if (!lineCtx) return;
  lineCtx.clearRect(0, 0, lineCanvas.value.width, lineCanvas.value.height);  // 画面をクリア
  props.characters.forEach(ch => {
    if (ch.img.complete) lineCtx.drawImage(ch.img, ch.x, ch.y, ch.width, ch.height);  // キャラクター画像を描画
  });
}

// -----------------------
// ランダムキャラクターのロジック

import pcA from '@/assets/images/home/01/2026_01a_pc.png'
import pcB from '@/assets/images/home/01/2026_01b_pc.png'
import pcC from '@/assets/images/home/01/2026_01c_pc.png'

import spA from '@/assets/images/home/01/2026_01a_sp.png'
import spB from '@/assets/images/home/01/2026_01b_sp.png'
import spC from '@/assets/images/home/01/2026_01c_sp.png'

const pcImages = [pcA, pcB, pcC]
const spImages = [spA, spB, spC]

function getRandomCharacterSrc() {
  // ランダムにキャラクター画像を選択
  const images = isMobile.value ? spImages : pcImages;
  const savedSrc = localStorage.getItem('currentCharacterSrc');
  let newSrc;

  do {
    newSrc = images[Math.floor(Math.random() * images.length)];
  } while (newSrc === savedSrc);  // 前回と同じ画像が選ばれないようにする

  localStorage.setItem('currentCharacterSrc', newSrc);
  return newSrc;
}

function loadRandomCharacterOnce() {
  // 初回にランダムなキャラクターを読み込む
  const savedSrc = localStorage.getItem('currentCharacterSrc');
  if (savedSrc) return savedSrc;

  const images = isMobile.value ? spImages : pcImages;
  const randomSrc = images[Math.floor(Math.random() * images.length)];
  localStorage.setItem('currentCharacterSrc', randomSrc);
  return randomSrc;
}

function changeRandomCharacter() {
  // ランダムにキャラクターを変更
  const newSrc = getRandomCharacterSrc();
  const img = new Image();
  img.src = newSrc;
  img.onload = () => {
    props.characters.splice(0, props.characters.length, {
      img,
      x: 0,
      y: 0,
      width: isMobile.value ? 400 : 1000,
      height: (isMobile.value ? 400 : 1000) * (img.naturalHeight / img.naturalWidth)
    });

    handleResize();  // 位置調整
    if (typeof resetPaint === 'function') resetPaint();  // 描画状態のリセット
    updateBrushCursor();  // カーソル更新
  };
}

// -----------------------
// マウント時の初期化処理

onMounted(() => {
  // コンポーネントがマウントされたときの初期化処理
  handleResize();  // サイズ調整
  lineCtx = lineCanvas.value.getContext('2d');  // 線描画用コンテキストを取得
  const container = lineCanvas.value.parentElement;
  const width = container.clientWidth;
  const height = container.clientHeight;
  lineCanvas.value.width = width;  // キャンバスの幅設定
  lineCanvas.value.height = height;  // キャンバスの高さ設定
  paintCanvas.value.width = width;  // 塗りつぶし用キャンバスの設定
  paintCanvas.value.height = height;  // 塗りつぶし用キャンバスの設定

  lineCanvas.value.style.width = `${width}px`;
  lineCanvas.value.style.height = `${height}px`;
  paintCanvas.value.style.width = `${width}px`;
  paintCanvas.value.style.height = `${height}px`;
  updateBrushCursor();  // カーソルを初期化

  const painter = usePainter({  // 描画関連のカスタムフックを利用
    paintCanvas,
    isEraser: computed(() => props.isEraser),
    brushSize: computed(() => props.brushSize),
    eraserSize: computed(() => props.eraserSize),
    selectedColor: computed(() => props.selectedColor),
    scale,
    updateBrushCursor
  });

  // 描画関連のメソッドを取得
  startDrawing = painter.startDrawing;
  draw = painter.draw;
  stopDrawing = painter.stopDrawing;
  isPainting = painter.isPainting;
  undo = painter.undo;
  redo = painter.redo;
  resetPaint = painter.resetPaint;

  emit('updateUndoRedo', { undo, redo });  // undo/redoの情報を親コンポーネントに通知
  emit('updateSaveImage', saveImage);  // 保存処理のイベントを親コンポーネントに通知

  const randomSrc = loadRandomCharacterOnce();  // ランダムキャラクターを取得
  const img = new Image();
  img.src = randomSrc;
  img.onload = () => {
    props.characters.splice(0, props.characters.length, {
      img,
      x: 0,
      y: 0,
      width: window.innerWidth <= 768 ? 400 : 1000,
      height: (window.innerWidth <= 768 ? 400 : 1000) * (img.naturalHeight / img.naturalWidth)
    });
    handleResize();  // キャラクターの位置調整
    updateBrushCursor();  // カーソル更新
  };

  const el = canvasWrapper.value;
  if (!el) return;
  el.addEventListener('touchstart', handleTouchStart, { passive: false });
  el.addEventListener('touchmove', handleTouchMove, { passive: false });
  el.addEventListener('touchend', handleTouchEnd, { passive: false });
  el.addEventListener('touchcancel', handleTouchEnd, { passive: false });
  clampPan(); 
});

// -----------------------
// 保存処理

async function saveImage() {
  // 画像保存処理
  if (!paintCanvas.value || !lineCanvas.value) return;

  const width = lineCanvas.value.width;
  const height = lineCanvas.value.height;

  const out = document.createElement('canvas');  // 新しいキャンバスを作成
  out.width = width;
  out.height = height;
  const ctx = out.getContext('2d');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);  // 背景を白で塗りつぶす

  ctx.drawImage(paintCanvas.value, 0, 0, width, height);  // 塗りつぶしキャンバスを描画
  ctx.drawImage(lineCanvas.value, 0, 0, width, height);  // 線のキャンバスを描画

  const link = document.createElement('a');
  link.download = 'painting.png';  // ダウンロード用のリンクを作成
  link.href = out.toDataURL('image/png');  // キャンバスの内容を画像データURLとして設定
  link.click();  // ダウンロードを実行
}
</script>


<style lang="scss" scoped>
@use "@/assets/styles/variables" as vars;
@use "@/assets/styles/mixins" as *;
.canvas-container {
  touch-action: none;
  -ms-touch-action: none;
  position: relative;
  overflow: hidden; 
  width: 100%;
  height: 100%;
  touch-action: none; 
}

.layer {
  position: absolute;
  top: 0;
  left: 0;
  border: solid 1px vars.$green;
}
  .line {
    z-index: 2;
  }
  .paint {
    z-index: 1;
    background: rgba(255, 255, 255, 0.7);
  }
  .canvas-container button {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 10;
}

</style>
