import { ref, onBeforeUnmount, type Ref } from 'vue';
import eraserCursor from '@/assets/images/home/eraser-cursor.png';

type UseEraserOptions = {
  canvasRef: Ref<HTMLCanvasElement | null>;
  ctx: Ref<CanvasRenderingContext2D | null>;
  width: Ref<number>;
  height: Ref<number>;
  isMobile: Ref<boolean>;
  onFinish?: () => void;
};

type Point = {
  x: number;
  y: number;
  t: number;
};

type Brush = {
  radius: number;
  swayAngle: number;
  sway: number;
  x: number;
  y: number;
};

export function useEraser({
  canvasRef,
  ctx,
  width,
  height,
  isMobile,
  onFinish,
}: UseEraserOptions) {
  const isUserErasing = ref<boolean>(false);

  let brush: Brush = {
    radius: 160,
    swayAngle: 0,
    sway: 40,
    x: 0,
    y: 0,
  };

  let handleMouseMove: ((e: MouseEvent) => void) | null = null;
  let eraseAnimId: number | null = null;

  // ==================================================
  // 消しゴム関連処理
  // ==================================================

  function initEraseSettings(): void {
    if (!canvasRef.value || !ctx.value) return;

    const eraseScale = isMobile.value ? 0.35 : 1;

    brush.radius = 160 * eraseScale;
    brush.sway = 40 * eraseScale;

    canvasRef.value.style.cursor = `url(${eraserCursor}) 16 16, auto`;
    ctx.value.globalCompositeOperation = 'destination-out';
  }

  function getEraseProgress(): number {
    if (!ctx.value) return 0;

    const w = Math.floor(width.value);
    const h = Math.floor(height.value);
    const imgData = ctx.value.getImageData(0, 0, w, h).data;

    const total = imgData.length / 4 / 16;
    let count = 0;

    for (let i = 0; i < imgData.length; i += 4 * 16) {
      if (imgData[i + 3] < 50) count++;
    }

    return count / total;
  }

  function eraseDrawing(
    e: { clientX: number; clientY: number },
    lastMouse: Point
  ): Point {
    if (!ctx.value) return lastMouse;

    const now = Date.now();
    const dt = now - lastMouse.t || 16;
    const dx = e.clientX - lastMouse.x;
    const dy = e.clientY - lastMouse.y;
    const speed = Math.sqrt(dx * dx + dy * dy) / dt;

    const baseRadius = brush.radius + 30 * (1 - Math.min(speed * 10, 1));

    for (let i = 0; i < 3; i++) {
      const offsetX = (Math.random() - 0.5) * 20;
      const offsetY = (Math.random() - 0.5) * 20;

      const radius = baseRadius * (0.7 + Math.random() * 0.6);
      const rx = radius * (0.8 + Math.random() * 0.4);
      const ry = radius * (0.6 + Math.random() * 0.5);

      const grad = ctx.value.createRadialGradient(
        e.clientX + offsetX,
        e.clientY + offsetY,
        0,
        e.clientX + offsetX,
        e.clientY + offsetY,
        radius
      );

      grad.addColorStop(0, 'rgba(0,0,0,1)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');

      ctx.value.fillStyle = grad;
      ctx.value.beginPath();
      ctx.value.ellipse(
        e.clientX + offsetX,
        e.clientY + offsetY,
        rx,
        ry,
        0,
        0,
        Math.PI * 2
      );
      ctx.value.fill();
    }

    return { x: e.clientX, y: e.clientY, t: now };
  }

  function handleTouchEvent(e: TouchEvent): void {
    if (!handleMouseMove || e.touches.length === 0) return;

    handleMouseMove({
      clientX: e.touches[0].clientX,
      clientY: e.touches[0].clientY,
    } as MouseEvent);

    e.preventDefault();
  }

  function autoErase(): void {
    if (!ctx.value) return;

    const angle = Math.random() * Math.PI * 2;

    const dist = isMobile.value
      ? 20 + Math.random() * 20
      : 30 + Math.random() * 30;

    brush.x = Math.max(
      0,
      Math.min(width.value, brush.x + Math.cos(angle) * dist)
    );

    brush.y = Math.max(
      0,
      Math.min(height.value, brush.y + Math.sin(angle) * dist)
    );

    brush.swayAngle += 0.5;
    const sway = Math.sin(brush.swayAngle) * brush.sway;

    for (let i = 0; i < 3; i++) {
      const offsetX = (Math.random() - 0.5) * 20;
      const offsetY = (Math.random() - 0.5) * 20;

      const radius = brush.radius * (0.7 + Math.random() * 0.6);
      const rx = radius * (0.8 + Math.random() * 0.4);
      const ry = radius * (0.6 + Math.random() * 0.5);

      const grad = ctx.value.createRadialGradient(
        brush.x + sway + offsetX,
        brush.y + offsetY,
        0,
        brush.x + sway + offsetX,
        brush.y + offsetY,
        radius
      );

      grad.addColorStop(0, 'rgba(0,0,0,1)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');

      ctx.value.fillStyle = grad;
      ctx.value.beginPath();
      ctx.value.ellipse(
        brush.x + sway + offsetX,
        brush.y + offsetY,
        rx,
        ry,
        0,
        0,
        Math.PI * 2
      );
      ctx.value.fill();
    }
  }

  function eraseLoop(lastMouse: Point): void {
    if (!canvasRef.value) return;

    if (!(isMobile.value && isUserErasing.value)) {
      autoErase();
    }

    if (getEraseProgress() >= 0.9) {
      onFinish?.();
      return;
    }

    eraseAnimId = requestAnimationFrame(() => eraseLoop(lastMouse));
  }

  function startErase(): void {
    if (!canvasRef.value) return;

    initEraseSettings();

    let lastMouse: Point = { x: 0, y: 0, t: Date.now() };

    handleMouseMove = (e: MouseEvent) => {
      lastMouse = eraseDrawing(e, lastMouse);
    };

    canvasRef.value.addEventListener('mousemove', handleMouseMove);

    if (isMobile.value) {
      canvasRef.value.addEventListener('touchstart', (e) => {
        isUserErasing.value = true;
        e.preventDefault();
      });

      canvasRef.value.addEventListener('touchend', (e) => {
        isUserErasing.value = false;
        e.preventDefault();
      });

      canvasRef.value.addEventListener('touchmove', handleTouchEvent, {
        passive: false,
      });
    }

    eraseAnimId = requestAnimationFrame(() => eraseLoop(lastMouse));
  }

  onBeforeUnmount(() => {
    if (canvasRef.value && handleMouseMove) {
      canvasRef.value.removeEventListener('mousemove', handleMouseMove);
    }

    if (eraseAnimId !== null) {
      cancelAnimationFrame(eraseAnimId);
    }
  });

  return {
    startErase,
    isUserErasing,
  };
}
