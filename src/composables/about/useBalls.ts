import { ref, Ref } from 'vue';
import { usePointer } from '@/composables/about/usePointer';
import { useDemo } from '@/composables/about/useDemo';
import { BALL_SIZE, COLORS } from '@/config/balls';

// =======================================
// 型定義
// =======================================
export type BallBase = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  scale: number;
  hit: boolean;
  life?: number;
  isDemo?: boolean;
  isFirst?: boolean;
  exitTime?: number;
};

export type TargetBall = BallBase & {
  type: 'target';
  color: string;
};

export type ShotBall = BallBase & {
  type: 'shot';
  color: string;
};

export type Ball = TargetBall | ShotBall;

export interface Effect {
  id: number;
  x: number;
  y: number;
  radius: number;
  alpha: number;
  color: string;
}

// =======================================
// Composable
// =======================================
export function useBalls(
  messageVisible: Ref<boolean>,
  playSound: () => void,
  playPon: () => void,
  demoPlayed: Ref<boolean>
) {
  const balls: Ref<Ball[]> = ref([]);
  const effects: Ref<Effect[]> = ref([]);

  const { spawnDemoScatter } = useDemo(messageVisible, balls);

  const MAX_BALLS = 20;
  let id = 0;

  // ==================================================
  // ボール生成
  // ==================================================
  const addBall = (x: number, y: number) => {
    playSound();

    while (balls.value.length >= MAX_BALLS) balls.value.shift();

    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 1.5 + 0.5;

    balls.value.push({
      id: id++,
      type: 'target',
      x: x - BALL_SIZE / 2,
      y: y - BALL_SIZE / 2,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      scale: 1,
      hit: false,
    } as TargetBall);
  };

  const throwBall = (x: number, y: number, dx: number, dy: number) => {
    balls.value.push({
      id: id++,
      type: 'shot',
      x: x - BALL_SIZE / 2,
      y: y - BALL_SIZE / 2,
      color: '#ffffff',
      vx: dx * 0.08,
      vy: dy * 0.08,
      scale: 1,
      hit: false,
    } as ShotBall);
  };

  const spawnEffect = (x: number, y: number) => {
    const eid = id++;
    effects.value.push({
      id: eid,
      x,
      y,
      radius: 0,
      alpha: 1,
      color: '#ffffff',
    });
    setTimeout(() => {
      effects.value = effects.value.filter((e) => e.id !== eid);
    }, 300);
  };
  // ==================================================
  // ボール削除
  // ==================================================
  const removeBall = (ballId: number | string) => {
    const removedBall = balls.value.find((b) => b.id === ballId);
    if (!removedBall || removedBall.hit) return;

    removedBall.hit = true;

    spawnEffect(removedBall.x + BALL_SIZE / 2, removedBall.y + BALL_SIZE / 2);
    playPon();

    balls.value = balls.value.filter((b) => b.id !== ballId);

    if (removedBall.isDemo && !demoPlayed.value) {
      demoPlayed.value = true;
      spawnDemoScatter(removedBall.x, removedBall.y);
    }
  };

  // ==================================================
  // メイン更新
  // ==================================================
  const updateBalls = (): void => {
    balls.value.forEach((b) => {
      // 位置更新
      b.x += b.vx;
      b.y += b.vy;

      // 投げたボールとターゲットの衝突判定
      if (b.type === 'shot') {
        balls.value.forEach((target) => {
          // ここで isDemo ボールは無視
          if (
            target.type === 'target' &&
            !target.hit &&
            !target.isDemo &&
            hitTest(b, target)
          ) {
            playPon();

            // 衝突地点の中間にエフェクトを出す
            const midX = (b.x + target.x) / 2 + BALL_SIZE / 2;
            const midY = (b.y + target.y) / 2 + BALL_SIZE / 2;
            spawnEffect(midX, midY);

            target.hit = true;
            b.hit = true;

            // ボール削除
            balls.value = balls.value.filter(
              (ball) => ball.id !== target.id && ball.id !== b.id
            );
          }
        });
      }

      // 壁で反射（ターゲットボールのみ、デモボールは除外）
      if (b.type === 'target' && !b.isDemo) {
        if (b.x < 0) {
          b.x = 0;
          b.vx = Math.abs(b.vx);
        } else if (b.x + BALL_SIZE > window.innerWidth) {
          b.x = window.innerWidth - BALL_SIZE;
          b.vx = -Math.abs(b.vx);
        }

        if (b.y < 0) {
          b.y = 0;
          b.vy = Math.abs(b.vy);
        } else if (b.y + BALL_SIZE > window.innerHeight) {
          b.y = window.innerHeight - BALL_SIZE;
          b.vy = -Math.abs(b.vy);
        }
      }
    });

    // hit済みや画面外のボールを削除
    balls.value = balls.value.filter((b) => {
      if (b.hit) {
        b.life = (b.life ?? 0) + 1;
        return b.life <= 15;
      }

      if (b.type === 'shot') {
        if (
          b.x + BALL_SIZE < 0 ||
          b.x - BALL_SIZE > window.innerWidth ||
          b.y + BALL_SIZE < 0 ||
          b.y - BALL_SIZE > window.innerHeight
        )
          return false;
      }

      return true;
    });
  };

  const hitTest = (a: Ball, b: Ball) => {
    const ax = a.x + BALL_SIZE / 2;
    const ay = a.y + BALL_SIZE / 2;
    const bx = b.x + BALL_SIZE / 2;
    const by = b.y + BALL_SIZE / 2;
    return Math.hypot(ax - bx, ay - by) < BALL_SIZE;
  };

  // ==================================================
  // Pointer操作
  // ==================================================
  const { startPointer, movePointer, endPointer } = usePointer({
    onTap: (x, y) => addBall(x, y),
    onThrow: (x, y, dx, dy) => throwBall(x, y, dx, dy),
  });

  const attachStageEvents = (stageEl: HTMLElement | null) => {
    if (!stageEl) return;
    stageEl.addEventListener('pointerdown', startPointer);
    stageEl.addEventListener('pointermove', movePointer);
    stageEl.addEventListener('pointerup', endPointer);
  };

  // ==================================================
  // 戻り値
  // ==================================================
  return {
    balls,
    effects,
    addBall,
    throwBall,
    removeBall,
    updateBalls,
    spawnEffect,
    hitTest,
    attachStageEvents,
    startPointer,
    movePointer,
    endPointer,
  };
}
