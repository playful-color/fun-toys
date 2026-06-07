<template>
  <div ref="toolbar" class="toolbar">
    <div class="toolbar-inner show">
      <div class="color_wraper" v-show="showColorPicker" :style="pickerStyle">
        <ColorPicker />

        <div class="brush_tools">
          <button
            @click="emit('update:brushType', 'normal')"
            :class="{
              selected: brushType === 'normal',
              'not-selected': brushType !== 'normal',
            }"
          >
            <font-awesome-icon
              icon="paintbrush"
              :style="{ color: brushIconColor }"
            />
            <span class="label">ふつう</span>
          </button>
          <button
            @click="emit('update:brushType', 'marker')"
            :class="{
              selected: brushType === 'marker',
              'not-selected': brushType !== 'marker',
            }"
          >
            <font-awesome-icon
              icon="wand-magic-sparkles"
              :style="{ color: brushIconColor }"
            />
            <span class="label">まほう</span>
          </button>
        </div>
      </div>

      <button
        ref="brushBtn"
        @click="onBrushClick"
        class="brush-btn icon-button"
      >
        <font-awesome-icon
          :icon="brushIcon"
          :style="{ color: brushIconColor }"
        />
        <span class="label">ブラシ</span>
      </button>
      <button
        @click="localIsEraser = true"
        :class="['icon-button', { active: localIsEraser }]"
      >
        <font-awesome-icon icon="eraser" />
        <span class="label">消しゴム</span>
      </button>

      <input
        v-if="!isMobile && !localIsEraser"
        type="range"
        v-model.number="localBrushSize"
        min="5"
        max="100"
      />

      <div v-if="isMobile && !isEraser" class="size-control">
        <button @click="changeSize(5)" class="icon-button">
          <font-awesome-icon icon="plus" />
        </button>
        <div
          class="size-indicator"
          :style="{
            fontSize: Math.max(12, localBrushSize * 0.2) + 'px',
            backgroundColor: `rgba(${selectedColor.r}, ${selectedColor.g}, ${selectedColor.b}, ${selectedColor.a})`,
            color: '#fff',
            textAlign: 'center',
            borderRadius: '50%',
          }"
        >
          {{ localBrushSize }}
        </div>

        <button @click="changeSize(-5)" class="icon-button">
          <font-awesome-icon icon="minus" />
        </button>
      </div>

      <input
        v-if="!isMobile && localIsEraser"
        type="range"
        v-model.number="localEraserSize"
        min="5"
        max="100"
      />

      <div v-if="isMobile && isEraser" class="size-control">
        <button @click="changeSize(5)" class="icon-button">
          <font-awesome-icon icon="plus" />
        </button>
        <div
          class="size-indicator"
          :style="{
            borderRadius: '50%',
            textAlign: 'center',
            backgroundColor: 'lightgray',
            fontSize: Math.max(12, brushSize * 0.2) + 'px',
          }"
        >
          {{ eraserSize }}
        </div>
        <button @click="changeSize(-5)" class="icon-button">
          <font-awesome-icon icon="minus" />
        </button>
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
        :disabled="isPainting"
        class="icon-button"
      >
        <font-awesome-icon icon="dice" />
        <span class="label">ランダムきりかえ</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import type { BrushType } from '@/types/painter';
import ColorPicker from '/src/components/Home/ColorPicker.vue';
import { useColorStore } from '@/stores/useColorStore';
import { usePainterStore } from '@/stores/usePainterStore';
import { storeToRefs } from 'pinia';

const painterStore = usePainterStore();
const colorStore = useColorStore();
const { selectedColor } = storeToRefs(colorStore);

const props = defineProps<{
  isPainting: boolean;
  showColorPicker: boolean;
  isEraser: boolean;
  brushSize: number;
  brushType: BrushType;
  eraserSize: number;
  undo: () => void;
  redo: () => void;
  saveImage: () => void;
}>();

const emit = defineEmits<{
  (e: 'update:brushSize', val: number): void;
  (e: 'update:brushType', val: BrushType): void;
  (e: 'update:eraserSize', val: number): void;
  (e: 'update:isEraser', val: boolean): void;
  (e: 'update:showColorPicker', val: boolean): void;
  (e: 'randomCharacter'): void;
}>();

// --- ブラシ表示状態 --------------------------------
const brushIcon = computed(() =>
  props.brushType === 'marker' ? 'wand-magic-sparkles' : 'paintbrush'
);

const brushIconColor = computed(() => {
  const c = colorStore.selectedColor;
  return `rgba(${c.r}, ${c.g}, ${c.b}, ${c.a})`;
});

// --- カラーピッカー制御 -----------------------------
function onBrushClick() {
  if (localIsEraser.value) localIsEraser.value = false;

  const next = !props.showColorPicker;
  emit('update:showColorPicker', next);

  if (next && brushBtn.value) {
    updatePickerPosition(brushBtn.value);
  }
}

// --- 双方向バインド状態 -----------------------------
const localIsEraser = computed({
  get: () => props.isEraser,
  set: (val) => emit('update:isEraser', val),
});

const localBrushSize = computed({
  get: () => props.brushSize,
  set: (val) => emit('update:brushSize', val),
});

const localEraserSize = computed({
  get: () => props.eraserSize,
  set: (val) => emit('update:eraserSize', val),
});

// --- カラーピッカー自動クローズ ----------------------
watch(
  () => painterStore.isPainting,
  (val) => {
    if (val) emit('update:showColorPicker', false);
  }
);

watch(
  () => props.isEraser,
  (val) => {
    if (val) emit('update:showColorPicker', false);
  }
);

const brushBtn = ref<HTMLElement | null>(null);
const toolbar = ref<HTMLElement | null>(null);
const canvasEl = ref<HTMLElement | null>(null);

const isMobile = ref(window.innerWidth <= 768);

const onResize = () => {
  isMobile.value = window.innerWidth <= 768;
  updateToolbarPosition();
};

onMounted(() => {
  window.addEventListener('resize', onResize);
  window.addEventListener('resize', updateToolbarPosition);
  updateToolbarPosition();
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize);
  window.removeEventListener('resize', updateToolbarPosition);
});

// --- カラーピッカー位置 -----------------------------
const pickerStyle = ref<Record<string, string>>({});

const updatePickerPosition = (btn: HTMLElement) => {
  const rect = btn.getBoundingClientRect();

  pickerStyle.value = isMobile.value
    ? {
        top: `${rect.top}px`,
        left: `${rect.right + 8}px`,
        position: 'fixed',
        zIndex: '1000',
      }
    : {
        top: `${rect.bottom + 8}px`,
        left: `${rect.left}px`,
        position: 'fixed',
        zIndex: '1000',
      };
};

// --- サイズ変更 ------------------------------------
function changeSize(delta: number) {
  if (localIsEraser.value) {
    localEraserSize.value = Math.min(
      100,
      Math.max(5, localEraserSize.value + delta)
    );
  } else {
    localBrushSize.value = Math.min(
      100,
      Math.max(5, localBrushSize.value + delta)
    );
  }
}

// --- ツールバー位置 ---------------------------------
const updateToolbarPosition = () => {
  if (!toolbar.value || !canvasEl.value) return;

  const rect = canvasEl.value.getBoundingClientRect();

  toolbar.value.style.top = `${rect.top}px`;
  toolbar.value.style.left = `${rect.left}px`;
};
</script>

<style lang="scss" scoped>
@use '@/assets/styles/variables' as vars;
@use '@/assets/styles/mixins' as *;
.color_wraper {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  background: white;
  padding: 10px;
  border-radius: 8px;
  box-shadow: rgba(0, 0, 0, 0.2) 0px 3px 10px;
  .brush_tools {
    display: flex;
    gap: 10px;
  }
}
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
  .not-selected {
    opacity: 0.3;
  }
  .selected {
    opacity: 1;
    transform: scale(1.05);
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
    -webkit-backdrop-filter: blur(6px);
    backdrop-filter: blur(6px);
    -webkit-user-select: none;
    user-select: none;
    -webkit-touch-callout: none;
    .toolbar-inner {
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: center;
      position: fixed;
      left: 0;
      top: 0;
      z-index: 1000;
      gap: 16px;
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
          width: vw(30);
          height: vw(30);
          margin: 2vw 0;
        }
      }
      &.show {
        box-shadow:
          0 8px 32px rgba(0, 0, 0, 0.1),
          inset 0 1px 0 rgba(255, 255, 255, 0.3),
          inset 0 -1px 0 rgba(255, 255, 255, 0.1),
          inset 0 0 10px 5px rgb(255, 255, 255);
      }
    }
  }
}
</style>
