<template>
  <div ref="toolbar" class="toolbar">

    <div class="toolbar-inner show">
      <div
        class="color_wraper"
        v-show="showColorPicker"
        :style="pickerStyle"
      >
        <ColorPicker />
      </div>
   
      <button ref="brushBtn" @click="onBrushClick" class="brush-btn icon-button">
        <font-awesome-icon icon="paintbrush" :style="{ color: brushIconColor }" />
        <span class="label">ブラシ</span>
      </button>
      <button @click="localIsEraser = true" :class="['icon-button', { active: localIsEraser }]">
        <font-awesome-icon icon="eraser" />
        <span class="label">消しゴム</span>
      </button>
    

      <input v-if="!isMobile && !localIsEraser" type="range" v-model.number="localBrushSize" min="5" max="100" />

    
      <div v-if="isMobile && !isEraser" class="size-control">
        <button @click="changeSize(5)" class="icon-button">
          <font-awesome-icon icon="plus" />
        </button>
        <div
          class="size-indicator"
          :style="{
            width: localBrushSize * 0.6 + 'px',
            height: localBrushSize * 0.6 + 'px',
            lineHeight: localBrushSize * 0.6 + 'px',
            fontSize: Math.max(12, localBrushSize * 0.2) + 'px',
            backgroundColor: `rgba(${selectedColor.r}, ${selectedColor.g}, ${selectedColor.b}, ${selectedColor.a})`,
            color: '#fff',
            textAlign: 'center',
            borderRadius: '50%'
          }"
        >
          {{ localBrushSize }}
        </div>

        <button @click="changeSize(-5)" class="icon-button">
          <font-awesome-icon icon="minus" />
        </button>
      </div>

      <input v-if="!isMobile && localIsEraser" type="range" v-model.number="localEraserSize" min="5" max="100" />

      <div v-if="isMobile && isEraser" class="size-control">
        <button @click="changeSize(5)">＋</button>
        <div
          class="size-indicator"
          :style="{
            width: eraserSize * 0.6 + 'px',
            height: eraserSize * 0.6 + 'px',
            lineHeight: eraserSize * 0.6 + 'px',
            borderRadius: '50%',
            textAlign: 'center',
            backgroundColor: 'lightgray',
            fontSize: Math.max(12, brushSize * 0.2) + 'px'
          }"
        >
          {{ eraserSize }}
        </div>
        <button @click="changeSize(-5)">−</button>
      </div>

      <button @click="props.undo" class="icon-button">
        <font-awesome-icon icon="undo" />
        <span class="label">ひとつもどる</span>
      </button>
      <button @click="props.redo" class="icon-button">
        <font-awesome-icon icon="redo" />
        <span class="label">つぎへ</span>
      </button>
      <button @click="props.saveImage()" class="icon-button">
        <font-awesome-icon icon="download" />
        <span class="label">ほぞん</span>
      </button>
      <button
          @touchstart.prevent="emit('randomCharacter')"
          @click.prevent="emit('randomCharacter')"
          class="icon-button"
        >
        <font-awesome-icon icon="dice" />
        <span class="label">ランダムきりかえ</span>
      </button>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import ColorPicker from '/src/components/Home/ColorPicker.vue';
import { useColorStore } from '@/stores/useColorStore';
import { usePainterStore } from '@/stores/usePainterStore';
import { storeToRefs } from 'pinia';

const painterStore = usePainterStore();
const colorStore = useColorStore();
const { selectedColor } = storeToRefs(colorStore); 

// カラーピッカーの表示/非表示状態
function onBrushClick() {
  if (localIsEraser.value) localIsEraser.value = false;

  // 親の showColorPicker をトグル
  const next = !props.showColorPicker;
  emit('update:showColorPicker', next);

  // 表示なら位置を更新
  if (next && brushBtn.value) updatePickerPosition(brushBtn.value);
}

// props の受け取り
const props = defineProps({
  isPainting: Boolean,
  showColorPicker: Boolean,
  isEraser: Boolean,
  brushSize: Number,
  eraserSize: Number,
  undo: Function,
  redo: Function,
  saveImage: Function
});

// 塗り始めたら、または消しゴムに切り替えたらカラーピッカーを閉じる
watch(() => painterStore.isPainting, (val) => {
  if (val) { // 塗り始めたらカラーピッカーを閉じる
    emit('update:showColorPicker', false);
  }
});

watch(() => props.isEraser, (val) => {
  if (val) {
    emit('update:showColorPicker', false);
  }
});

// イベントエミッターの定義
const emit = defineEmits([
  'update:brushSize',
  'update:eraserSize',
  'update:isEraser',
  'update:showColorPicker',
  'randomCharacter'
]);


// 現在選択されている色をRGBA形式で返す
const brushIconColor = computed(() => {
  const c = colorStore.selectedColor;
  return `rgba(${c.r}, ${c.g}, ${c.b}, ${c.a})`;
});

// ローカル状態の定義
const localIsEraser = computed({
  get: () => props.isEraser,
  set: val => emit('update:isEraser', val)
});

const localBrushSize = computed({
  get: () => props.brushSize,
  set: (val) => emit('update:brushSize', val)
});

const localEraserSize = computed({
  get: () => props.eraserSize,
  set: (val) => emit('update:eraserSize', val)
});

// モバイル判定
const isMobile = ref(window.innerWidth <= 768);

// カラーピッカーの位置調整
const brushBtn = ref(null); // ブラシボタンの DOM 参照
const pickerStyle = ref({}); // カラーピッカーの位置

const updatePickerPosition = (btn) => {
  const rect = btn.getBoundingClientRect();
  if (isMobile.value) {
    pickerStyle.value = {
      top: rect.top + 'px',
      left: rect.right + 8 + 'px',
      position: 'fixed',
      zIndex: 1000
    };
  } else {
    pickerStyle.value = {
      top: rect.bottom + 8 + 'px',
      left: rect.left + 'px',
      position: 'fixed',
      zIndex: 1000
    };
  }
};

// ブラシ・消しゴムサイズ調整関数
function changeSize(delta) {
  if (localIsEraser.value) {
    // 消しゴムサイズの変更
    localEraserSize.value = Math.min(100, Math.max(5, localEraserSize.value + delta));
  } else {
    // ブラシサイズの変更
    localBrushSize.value = Math.min(100, Math.max(5, localBrushSize.value + delta));
  }
}

//ツールバーの位置調整
const toolbar = ref(null);
const canvasEl = ref(null);

const updateToolbarPosition = () => {
  if (!toolbar.value || !canvasEl.value) return;
  const rect = canvasEl.value.getBoundingClientRect();
  toolbar.value.style.top = rect.top + 'px'; // キャンバス上端に合わせる
  toolbar.value.style.left = rect.left + 'px';
};

onMounted(() => {
  updateToolbarPosition();
  window.addEventListener('resize', updateToolbarPosition);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateToolbarPosition);
});

</script>


<style lang="scss" scoped>
@use "@/assets/styles/variables" as vars;
@use "@/assets/styles/mixins" as *;

.toolbar {
  width: 1200px;
  margin: 0 auto;
  z-index: 100;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  padding: 10px;
  .toolbar-inner {
    display: flex;
    gap: 10px;
    button {
      font-family: vars.$yomogi;
      font-weight: bold;
      font-size: 16px;
      position: relative;
      z-index: 10;
      border: none;
      background: none;
      cursor: pointer;
    }
  }
  @include sp {
    width: 10vw;
    height: 100%;
    position: absolute;
    top: 0;
    left: 0;
    transform: none;
    flex-direction: column;
    padding: 0;
    backdrop-filter: blur(6px);
    .toolbar-inner {
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      position: fixed;
      left: 0;
      top: 0;
      z-index: 1000;
      gap: 16px;
      padding: 3vw 0 0;
      border-radius: 4px;
      button {
        font-size: vw(24);
        min-width: vw(40);
        min-height: vw(40);
        display: flex;
        justify-content: center;
        align-items: center;
        .label {
          display: none;
        }
      }
      .size-control {
        font-family: vars.$yomogi;
        display: flex;
        flex-direction: column;
        align-items: center;
        .size-indicator {
          display: flex;
          justify-content: center;
          align-items: center;
          font-weight: bold;
          border: 1px solid #000;
        }
      }
      &.show {
       box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.3), inset 0 -1px 0 rgba(255, 255, 255, 0.1), inset 0 0 10px 5px rgb(255, 255, 255);
      }
    }
  }

}


</style>