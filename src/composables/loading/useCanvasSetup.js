// /composables/useCanvasSetup.js
import { ref, onMounted, onBeforeUnmount } from 'vue';

export function useCanvasSetup() {
  const canvasRef = ref(null);
  const ctx = ref(null);
  const width = ref(window.innerWidth);
  const height = ref(window.innerHeight);
  const isMobile = ref(false);

  function initCanvas() {
    if (!canvasRef.value) return;
    ctx.value = canvasRef.value.getContext('2d', { willReadFrequently: true });
    width.value = canvasRef.value.width = window.innerWidth;
    height.value = canvasRef.value.height = window.innerHeight;

    // モバイル判定
    isMobile.value = window.matchMedia('(pointer: coarse)').matches;
  }

  function handleResize() {
    if (!canvasRef.value) return;
    width.value = canvasRef.value.width = window.innerWidth;
    height.value = canvasRef.value.height = window.innerHeight;
  }

  onMounted(() => {
    initCanvas();
    window.addEventListener('resize', handleResize);
  });

  onBeforeUnmount(() => {
    window.removeEventListener('resize', handleResize);
  });

  return {
    canvasRef,
    ctx,
    width,
    height,
    isMobile,
    initCanvas,
  };
}
