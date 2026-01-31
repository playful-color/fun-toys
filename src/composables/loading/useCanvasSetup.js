import { ref, onMounted, onBeforeUnmount } from 'vue';

export function useCanvasSetup() {
  const canvasRef = ref(null);
  const ctx = ref(null);
  const width = ref(window.innerWidth);
  const height = ref(window.innerHeight);
  const isMobile = ref(false);

  // ==================================================
  // Canvasの初期化
  // ==================================================

  function initCanvas() {
    if (!canvasRef.value) return;
    ctx.value = canvasRef.value.getContext('2d', { willReadFrequently: true });
    width.value = canvasRef.value.width = window.innerWidth;
    height.value = canvasRef.value.height = window.innerHeight;
    isMobile.value = window.matchMedia('(pointer: coarse)').matches;
  }

  // ==================================================
  // ウィンドウサイズ変更時の処理
  // ==================================================

  function handleResize() {
    if (!canvasRef.value) return;
    width.value = canvasRef.value.width = window.innerWidth;
    height.value = canvasRef.value.height = window.innerHeight;
  }

  // ==================================================
  // ライフサイクル処理
  // ==================================================
  onMounted(() => {
    initCanvas();
    window.addEventListener('resize', handleResize);
  });

  onBeforeUnmount(() => {
    window.removeEventListener('resize', handleResize);
  });

  // ==================================================
  // 戻り値
  // ==================================================
  return {
    canvasRef,
    ctx,
    width,
    height,
    isMobile,
    initCanvas,
  };
}
