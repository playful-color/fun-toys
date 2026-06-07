import { ref, Ref, onMounted } from 'vue';
import { BALL_SIZE } from '@/config/balls';
import type { Ball, Effect } from '@/types/ballPlay';

/** 単一ポインター（マウス操作等）のジェスチャー判定用キャッシュ：開始時の座標と時刻を保持 */
interface PointerState {
  startX: number;
  startY: number;
  startTime: number; // タップやフリック（投げる速度）を計算するための開始タイムスタンプ
}

export function useCanvas(
  canvasRef: Ref<HTMLCanvasElement | null>,
  balls: Ref<Ball[]>,
  effects: Ref<Effect[]>,
  removeBall: (id: number) => void,
  addBall: (x: number, y: number) => void,
  throwBall: (x: number, y: number, dx: number, dy: number) => void,
  playPon: () => void
) {
  const pointerStates = new Map<number, PointerState>();
  const ctx = ref<CanvasRenderingContext2D | null>(null);

  // ==================================================
  // 描画
  // ==================================================

  const drawCanvas = (): void => {
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

      c.strokeStyle = 'rgba(0,0,0,0.15)';
      c.lineWidth = 2;
      c.stroke();
    });

    // エフェクト描画
    effects.value.forEach((eff, index) => {
      if (!c) return;

      c.fillStyle = `rgba(255,255,255,${eff.alpha})`;
      c.beginPath();
      c.arc(eff.x, eff.y, eff.radius, 0, Math.PI * 2);
      c.fill();

      eff.radius += 2;
      eff.alpha -= 0.05;

      if (eff.alpha <= 0) {
        effects.value.splice(index, 1);
      }
    });
  };

  // ==================================================
  // Pointer
  // ==================================================

  const onCanvasPointerDown = (e: PointerEvent): void => {
    const canvas = canvasRef.value;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();

    pointerStates.set(e.pointerId, {
      startX: e.clientX - rect.left,
      startY: e.clientY - rect.top,
      startTime: Date.now(),
    });
  };

  const onCanvasPointerUp = (e: PointerEvent): void => {
    const canvas = canvasRef.value;
    if (!canvas) return;

    const state = pointerStates.get(e.pointerId);
    if (!state) return;

    const rect = canvas.getBoundingClientRect();

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
          id: Date.now() + Math.random(),
          x: cx,
          y: cy,
          radius: 10,
          alpha: 1,
          color: '#fff',
        });

        hitBall = true;
      }
    });

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
  // リサイズ
  // ==================================================

  const resizeCanvas = (): void => {
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
  // マウント
  // ==================================================

  onMounted(() => {
    const canvas = canvasRef.value;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    ctx.value = context;

    resizeCanvas();

    canvas.addEventListener('pointerdown', onCanvasPointerDown);
    canvas.addEventListener('pointerup', onCanvasPointerUp);
  });

  return {
    drawCanvas,
    resizeCanvas,
  };
}
