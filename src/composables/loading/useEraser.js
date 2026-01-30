import { ref, onBeforeUnmount } from 'vue';
import eraserCursor from '@/assets/images/home/eraser-cursor.png';

export function useEraser({
  canvasRef,
  ctx,
  width,
  height,
  isMobile,
  onFinish,
}) {
  const isUserErasing = ref(false);
  let brush = { radius: 160, swayAngle: 0, sway: 40, x: 0, y: 0 };
  let handleMouseMove = null;
  let eraseAnimId = null;

  function startErase() {
    if (!canvasRef.value) return;

    const eraseScale = isMobile.value ? 0.35 : 1;
    brush.radius = 160 * eraseScale;
    brush.sway = 40 * eraseScale;

    // カーソル変更
    canvasRef.value.style.cursor = `url(${eraserCursor}) 16 16, auto`;

    // 描画モードを消しゴムに切替
    ctx.value.globalCompositeOperation = 'destination-out';

    let lastMouse = { x: 0, y: 0, t: Date.now() };

    // 消しゴム進捗率計算
    function getEraseProgress() {
      const w = Math.floor(width.value);
      const h = Math.floor(height.value);
      const imgData = ctx.value.getImageData(0, 0, w, h).data;

      let total = imgData.length / 4 / 16;
      let count = 0;
      for (let i = 0; i < imgData.length; i += 4 * 16) {
        if (imgData[i + 3] < 50) count++;
      }
      return count / total;
    }

    // マウス移動イベント
    handleMouseMove = (e) => {
      if (!canvasRef.value) return;
      const now = Date.now();
      const dt = now - lastMouse.t || 16;
      const dx = e.clientX - lastMouse.x;
      const dy = e.clientY - lastMouse.y;
      const speed = Math.sqrt(dx * dx + dy * dy) / dt;
      let baseRadius = brush.radius + 30 * (1 - Math.min(speed * 10, 1));

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

      lastMouse = { x: e.clientX, y: e.clientY, t: now };
    };

    canvasRef.value.addEventListener('mousemove', handleMouseMove);

    // タッチイベント対応（モバイル）
    if (isMobile.value) {
      function handleTouchStart(e) {
        isUserErasing.value = true;
        e.preventDefault();
      }

      function handleTouchEnd(e) {
        isUserErasing.value = false;
        e.preventDefault();
      }

      function handleTouchMove(e) {
        handleMouseMove({
          clientX: e.touches[0].clientX,
          clientY: e.touches[0].clientY,
        });
        e.preventDefault();
      }

      canvasRef.value.addEventListener('touchstart', handleTouchStart, {
        passive: false,
      });
      canvasRef.value.addEventListener('touchend', handleTouchEnd, {
        passive: false,
      });
      canvasRef.value.addEventListener('touchcancel', handleTouchEnd, {
        passive: false,
      });
      canvasRef.value.addEventListener('touchmove', handleTouchMove, {
        passive: false,
      });

      onBeforeUnmount(() => {
        canvasRef.value.removeEventListener('touchstart', handleTouchStart);
        canvasRef.value.removeEventListener('touchend', handleTouchEnd);
        canvasRef.value.removeEventListener('touchcancel', handleTouchEnd);
        canvasRef.value.removeEventListener('touchmove', handleTouchMove);
      });
    }

    // 自動消しゴムアニメーション
    function autoErase() {
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

    function eraseLoop() {
      if (!canvasRef.value) return;
      if (!(isMobile.value && isUserErasing.value)) autoErase();
      if (getEraseProgress() >= 0.9) {
        onFinish && onFinish();
        return;
      }
      eraseAnimId = requestAnimationFrame(eraseLoop);
    }

    eraseAnimId = requestAnimationFrame(eraseLoop);
  }

  // 後片付け
  onBeforeUnmount(() => {
    if (canvasRef.value && handleMouseMove)
      canvasRef.value.removeEventListener('mousemove', handleMouseMove);
    if (eraseAnimId) cancelAnimationFrame(eraseAnimId);
  });

  return {
    startErase,
    isUserErasing,
  };
}
