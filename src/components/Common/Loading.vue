<template>
  <div>
    <canvas
      ref="canvasRef"
      class="loading-canvas"
      :class="{ finished: isFinished }"
    ></canvas>
    <div
      v-if="isMessageVisible"
      class="message-to-erase"
      :style="{ top: `${messagePos.top}px`, left: `${messagePos.left}px` }"
    >
      けして<br />みてね！
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, type Ref } from 'vue';
import { useCanvasSetup } from '@/composables/loading/useCanvasSetup';
import { useSvgDraw } from '@/composables/loading/useSvgDraw';
import { useEraser } from '@/composables/loading/useEraser';

import crayonBg from '@/assets/images/home/crayon-bg.jpg';

// ==================================================
// Canvasセットアップ
// ==================================================
const { canvasRef, ctx, width, height, isMobile } = useCanvasSetup();

const { drawNext, lastDrawPos } = useSvgDraw({
  canvasRef,
  ctx,
  width,
  height,
  isMobile,
});

// ==================================================
// 状態管理
// ==================================================
const isFinished = ref<boolean>(false);

const emit = defineEmits<{
  (e: 'finished'): void;
}>();

const isMessageVisible = ref<boolean>(false);

const messagePos = ref<{ top: number; left: number }>({
  top: 0,
  left: 0,
});

// ==================================================
// メッセージ表示関数
// ==================================================
function showMessageToErase(x: number, y: number): void {
  if (!canvasRef.value) return;

  const rect = canvasRef.value.getBoundingClientRect();

  messagePos.value.top = rect.top + y - 100;
  messagePos.value.left = rect.left + x - 30;

  isMessageVisible.value = true;

  setTimeout(() => {
    isMessageVisible.value = false;
  }, 3000);
}

// ==================================================
// Canvas完了処理
// ==================================================
function finishCanvas(): void {
  isFinished.value = true;
  emit('finished');
}

// ==================================================
// 背景描画関数
// ==================================================
let cachedBgImage: HTMLImageElement | null = null;

function drawImageBackground(
  context: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  src: string
): Promise<void> {
  return new Promise((resolve) => {
    if (cachedBgImage) {
      const pattern = context.createPattern(cachedBgImage, 'repeat');

      if (pattern) {
        context.fillStyle = pattern;
        context.fillRect(0, 0, canvasWidth, canvasHeight);
      }

      resolve();
      return;
    }

    const img = new Image();
    img.src = src;

    img.onload = () => {
      cachedBgImage = img;

      const pattern = context.createPattern(img, 'repeat');

      if (pattern) {
        context.fillStyle = pattern;
        context.fillRect(0, 0, canvasWidth, canvasHeight);
      }

      resolve();
    };
  });
}

// ==================================================
// useEraserのセットアップ
// ==================================================
const { startErase } = useEraser({
  canvasRef,
  ctx,
  width,
  height,
  isMobile,
  onFinish: finishCanvas,
});

// ==================================================
// ライフサイクル処理
// ==================================================
onMounted(async () => {
  if (!ctx.value) return;

  // 背景描画
  await drawImageBackground(ctx.value, width.value, height.value, crayonBg);

  // SVG描画開始
  drawNext((lastPos) => {
    showMessageToErase(lastPos.x + 30, lastPos.y - 100);

    startErase();
  });
});
</script>

<style lang="scss" scoped>
@use '@/assets/styles/variables' as vars;
@use '@/assets/styles/mixins' as *;
.loading-canvas {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 9998;
  transition: opacity 0.5s;
  touch-action: none;
  &.finished {
    opacity: 0;
    pointer-events: none;
    z-index: -1;
  }
}

.message-to-erase {
  position: fixed;
  background-color: rgba(0, 0, 0, 0.8);
  color: #fff;
  padding: 5px 10px 10px;
  font-size: 16px;
  line-height: 1.4;
  border-radius: 20px;
  text-align: center;
  z-index: 99999;
  white-space: pre-line;
  animation: fadeOut 2s ease-in-out forwards;
  transform: rotate(45deg);
  transform-origin: left top;
  &::after {
    content: '';
    position: absolute;
    bottom: -10px;
    left: 50%;
    transform: translateX(-50%);
    border-width: 10px 10px 0 10px;
    border-style: solid;
    border-color: rgba(0, 0, 0, 0.8) transparent transparent transparent;
  }
  @include sp {
    width: 25vw;
    font-size: vw(16);
  }
}

@keyframes fadeOut {
  0% {
    opacity: 1;
    transform: rotate(45deg);
  }
  100% {
    opacity: 0;
    transform: rotate(45deg) translateY(-10px);
  }
}
</style>
