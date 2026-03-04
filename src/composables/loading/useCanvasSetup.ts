import { ref, onMounted, onBeforeUnmount, type Ref } from 'vue';

export function useCanvasSetup() {
  const canvasRef: Ref<HTMLCanvasElement | null> = ref(null);
  const ctx: Ref<CanvasRenderingContext2D | null> = ref(null);
  const width: Ref<number> = ref(window.innerWidth);
  const height: Ref<number> = ref(window.innerHeight);
  const isMobile: Ref<boolean> = ref(false);

  // ==================================================
  // Canvasの初期化
  // ==================================================

  function initCanvas(): void {
    if (!canvasRef.value) return;

    const context = canvasRef.value.getContext('2d', {
      willReadFrequently: true,
    });

    if (!context) return;

    ctx.value = context;
    width.value = canvasRef.value.width = window.innerWidth;
    height.value = canvasRef.value.height = window.innerHeight;
    isMobile.value = window.matchMedia('(pointer: coarse)').matches;
  }

  // ==================================================
  // ウィンドウサイズ変更時の処理
  // ==================================================

  function handleResize(): void {
    if (!canvasRef.value) return;

    width.value = canvasRef.value.width = window.innerWidth;
    height.value = canvasRef.value.height = window.innerHeight;
  }

  // ==================================================
  // ライフサイクル処理
  // ==================================================

  onMounted((): void => {
    initCanvas();
    window.addEventListener('resize', handleResize);
  });

  onBeforeUnmount((): void => {
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
