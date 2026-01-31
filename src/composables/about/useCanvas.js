import { ref, onMounted } from 'vue';
import { BALL_SIZE } from '@/config/balls';

export const useCanvas = (
  canvasRef,
  balls,
  effects,
  removeBall,
  addBall,
  throwBall,
  playPon
) => {
  const pointerStates = new Map();
  const ctx = ref(null);

  // ==================================================
  // Canvasの描画処理
  // ==================================================
  const drawCanvas = () => {
    const canvas = canvasRef.value;
    const c = ctx.value;
    if (!canvas || !c) return;

    c.clearRect(0, 0, canvas.width, canvas.height);

    // ボール描画
    balls.value.forEach((ball) => {
      if (ball.hit) return;

      const cx = ball.x + BALL_SIZE / 2;
      const cy = ball.y + BALL_SIZE / 2;
      const radius = BALL_SIZE / 2;

      // 内側シャドウ風グラデーション
      const gradient = c.createRadialGradient(
        cx,
        cy,
        radius * 0.2,
        cx,
        cy,
        radius
      );
      gradient.addColorStop(0, 'rgba(255,255,255,0.4)');
      gradient.addColorStop(1, ball.color);

      c.fillStyle = gradient;
      c.beginPath();
      c.arc(cx, cy, radius, 0, Math.PI * 2);
      c.fill();

      // 外側薄い影で立体感
      c.strokeStyle = 'rgba(0,0,0,0.15)';
      c.lineWidth = 2;
      c.stroke();
    });

    // エフェクト描画
    effects.value.forEach((eff, index) => {
      const c = ctx.value;
      if (!c) return;

      c.fillStyle = `rgba(255,255,255,${eff.alpha})`;
      c.beginPath();
      c.arc(eff.x, eff.y, eff.radius, 0, Math.PI * 2);
      c.fill();

      // エフェクトを膨らませつつ透明度を下げる
      eff.radius += 2;
      eff.alpha -= 0.05;

      // alpha が 0 以下になったら配列から削除
      if (eff.alpha <= 0) effects.value.splice(index, 1);
    });
  };

  // ==================================================
  // ポインター操作 (キャンバス上でのタッチ・クリック)
  // ==================================================

  // ポインターが押されたときの処理
  const onCanvasPointerDown = (e) => {
    const rect = canvasRef.value.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    pointerStates.set(e.pointerId, {
      startX: x,
      startY: y,
      startTime: Date.now(),
    });
  };

  // ポインターが離れたときの処理
  const onCanvasPointerUp = (e) => {
    const state = pointerStates.get(e.pointerId);
    if (!state) return;

    const rect = canvasRef.value.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const dx = x - state.startX;
    const dy = y - state.startY;
    const distance = Math.hypot(dx, dy);
    const time = Date.now() - state.startTime;

    let hitBall = false;

    balls.value.forEach((ball) => {
      const cx = ball.x + BALL_SIZE / 2;
      const cy = ball.y + BALL_SIZE / 2;
      if (Math.hypot(cx - x, cy - y) < BALL_SIZE / 2) {
        removeBall(ball.id);
        playPon();
        effects.value.push({
          x: cx,
          y: cy,
          radius: 10,
          alpha: 1,
          color: '#fff',
        });
        hitBall = true;
      }
    });

    // 連打しやすいように大きくずらす
    if (!hitBall) {
      if (distance < 20 && time < 300) {
        const OFFSET = 80;
        addBall(
          x + (Math.random() - 0.5) * OFFSET,
          y + (Math.random() - 0.5) * OFFSET
        );
      } else if (distance > 40) {
        throwBall(state.startX, state.startY, dx, dy);
      }
    }

    pointerStates.delete(e.pointerId);
  };

  // ==================================================
  // Canvasサイズの調整
  // ==================================================

  const resizeCanvas = () => {
    const canvas = canvasRef.value;
    const c = ctx.value;
    if (!canvas || !c) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  // ==================================================
  // ライフサイクル処理
  // ==================================================
  onMounted(() => {
    const canvas = canvasRef.value;
    if (!canvas) return;
    const c = canvas.getContext('2d');
    if (!c) return;

    ctx.value = c;
    resizeCanvas();

    canvas.addEventListener('pointerdown', onCanvasPointerDown);
    canvas.addEventListener('pointerup', onCanvasPointerUp);
  });

  return { drawCanvas, resizeCanvas };
};
