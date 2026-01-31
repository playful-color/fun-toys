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

  // ==================================================
  // 消しゴム関連処理
  // ==================================================

  // 消しゴムの初期設定
  function initEraseSettings() {
    const eraseScale = isMobile.value ? 0.35 : 1;
    brush.radius = 160 * eraseScale;
    brush.sway = 40 * eraseScale;
    canvasRef.value.style.cursor = `url(${eraserCursor}) 16 16, auto`;
    ctx.value.globalCompositeOperation = 'destination-out';
  }

  // 消しゴム進捗を計算
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

  // 消しゴムの描画処理
  function eraseDrawing(e, lastMouse) {
    if (!canvasRef.value) return;

    const now = Date.now();
    const dt = now - lastMouse.t || 16;
    const dx = e.clientX - lastMouse.x;
    const dy = e.clientY - lastMouse.y;
    const speed = Math.sqrt(dx * dx + dy * dy) / dt;
    let baseRadius = brush.radius + 30 * (1 - Math.min(speed * 10, 1));

    // ランダム位置に消しゴム効果を描画
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

  // モバイル対応のタッチイベント処理
  function handleTouchEvent(e) {
    handleMouseMove({
      clientX: e.touches[0].clientX,
      clientY: e.touches[0].clientY,
    });
    e.preventDefault();
  }

  // 自動消しゴムアニメーション処理
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

    // ランダムな消しゴム効果を描画
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

  // 消しゴムループ
  function eraseLoop(lastMouse) {
    if (!canvasRef.value) return;
    if (!(isMobile.value && isUserErasing.value)) autoErase();
    if (getEraseProgress() >= 0.9) {
      onFinish && onFinish();
      return;
    }
    eraseAnimId = requestAnimationFrame(() => eraseLoop(lastMouse));
  }

  // ==================================================
  // 消しゴムの動作開始
  // ==================================================
  function startErase() {
    if (!canvasRef.value) return;

    initEraseSettings(); // 初期設定を行う

    let lastMouse = { x: 0, y: 0, t: Date.now() };

    // マウス移動のイベントハンドラ
    handleMouseMove = (e) => {
      lastMouse = eraseDrawing(e, lastMouse);
    };

    canvasRef.value.addEventListener('mousemove', handleMouseMove);

    // モバイルデバイス用のタッチイベント
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

    // 消しゴムアニメーション開始
    eraseAnimId = requestAnimationFrame(() => eraseLoop(lastMouse));
  }

  // ==================================================
  // ライフサイクル処理
  // ==================================================
  onBeforeUnmount(() => {
    if (canvasRef.value && handleMouseMove) {
      canvasRef.value.removeEventListener('mousemove', handleMouseMove);
    }
    if (eraseAnimId) cancelAnimationFrame(eraseAnimId);
  });

  // ==================================================
  // 戻り値
  // ==================================================
  return {
    startErase,
    isUserErasing,
  };
}
