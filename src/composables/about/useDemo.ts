// =======================================
// useDemo.ts (TS完全版)
// =======================================
import { Ref, ref } from 'vue';
import { Ball } from '@/composables/about/useBalls';
import { BALL_SIZE, COLORS } from '@/config/balls';

export function useDemo(messageVisible: Ref<boolean>, balls: Ref<Ball[]>) {
  const demoPlayed = ref(false);
  let emptySince: number | null = null;
  const EMPTY_DELAY = 3000;

  const isPC = window.innerWidth > 768;
  let firstDemoBall: Ball | null = null;
  let firstDemoHandled = false;

  // ==================================================
  // 初回デモボール生成
  // ==================================================
  const spawnFirstDemoBall = () => {
    const messageEl = document.querySelector('.message');
    if (!messageEl) return;
    const rect = messageEl.getBoundingClientRect();

    const y = isPC
      ? rect.top + rect.height / 2 - BALL_SIZE / 2
      : window.innerHeight - BALL_SIZE;
    const x = isPC ? -BALL_SIZE : window.innerWidth / 2 - BALL_SIZE / 2;

    const ball: Ball = {
      id: Date.now(),
      x,
      y,
      vx: 0,
      vy: 0,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      scale: 1,
      hit: false,
      isDemo: true,
      isFirst: true,
      type: 'target',
    };

    firstDemoBall = ball;
    balls.value.push(ball);
  };

  // ==================================================
  // メッセージ透過
  // ==================================================
  const setMessageTransparency = (isTransparent: boolean) => {
    const messageEl = document.querySelector('.message');
    if (!messageEl) return;
    if (isTransparent) messageEl.classList.add('transparent');
    else messageEl.classList.remove('transparent');
  };

  setMessageTransparency(true);

  // ==================================================
  // 初回デモボールタップ
  // ==================================================
  const handleFirstDemoBallTap = (ball: Ball) => {
    if (!firstDemoBall || firstDemoHandled) return;
    if (ball.id === firstDemoBall.id) {
      firstDemoHandled = true;
      spawnDemoScatter(ball.x, ball.y);

      requestAnimationFrame(() => {
        firstDemoBall!.hit = true;
        firstDemoBall = null;
      });
    }
  };

  // ==================================================
  // 初回デモボール更新
  // ==================================================
  const updateFirstDemoBall = () => {
    if (!firstDemoBall || firstDemoHandled) return;

    const b = firstDemoBall;
    const messageEl = document.querySelector('.message');
    if (!messageEl) return;

    const rect = messageEl.getBoundingClientRect();
    const left = rect.left;
    const right = rect.right;
    const top = rect.top + window.scrollY;
    const bottom = rect.bottom + window.scrollY;

    let isInsideMessage = false;
    let isPastMessage = false;

    const isMobile = window.innerWidth <= 768;

    if (!isMobile) {
      b.y = window.innerHeight / 2 - BALL_SIZE / 2;

      if (
        b.x + BALL_SIZE >= left &&
        b.x <= right &&
        b.y + BALL_SIZE >= top &&
        b.y <= bottom
      ) {
        if (!isInsideMessage) {
          isInsideMessage = true;
          messageVisible.value = true;
        }
      }

      if (b.x + BALL_SIZE > right && !isPastMessage) {
        isPastMessage = true;
        messageEl.classList.add('transparent');
      }

      b.vx = isInsideMessage ? 1 : b.x < left ? 6 : 6;
      b.vy = 0;
    } else {
      b.x = window.innerWidth / 2 - BALL_SIZE / 2;

      if (b.y + BALL_SIZE >= top && b.y <= top + BALL_SIZE) {
        if (!isInsideMessage) {
          isInsideMessage = true;
          messageVisible.value = true;
        }
      }

      if (b.y + BALL_SIZE < top - BALL_SIZE && !isPastMessage) {
        isPastMessage = true;
        messageEl.classList.add('transparent');
      }

      b.vy = isInsideMessage ? -1 : b.y > bottom ? -3 : -3;
      b.vx = 0;
    }

    updateBallPosition(b, isMobile);

    if (
      b.x + BALL_SIZE < 0 ||
      b.x > window.innerWidth ||
      b.y + BALL_SIZE < 0 ||
      b.y > window.innerHeight
    ) {
      if (!b.exitTime) b.exitTime = Date.now();

      const timeOut = 500;
      if (b.exitTime && Date.now() - b.exitTime > timeOut) {
        b.hit = true;
        firstDemoBall = null;
        emptySince = Date.now();
      }
    }
  };

  // ==================================================
  // 四方散布
  // ==================================================
  const spawnDemoScatter = (x: number, y: number) => {
    const num = 8;
    for (let i = 0; i < num; i++) {
      const angle = ((Math.PI * 2) / num) * i;
      const speed = Math.random() * 1.5 + 0.5;
      const newBall: Ball = {
        id: Date.now() + Math.floor(Math.random() * 1000), // number にする
        type: 'target',
        x,
        y,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        scale: 1,
        hit: false,
      };
      balls.value.push(newBall);
    }
  };

  // ==================================================
  // 通常デモボール生成
  // ==================================================
  const spawnNormalDemoBall = () => {
    const y = isPC
      ? window.innerHeight / 2 - BALL_SIZE / 2
      : window.innerHeight - BALL_SIZE;
    const x = isPC ? -BALL_SIZE : window.innerWidth / 2 - BALL_SIZE / 2;

    const vx = isPC ? 2 : 0;
    const vy = isPC ? 0 : -2;

    const ball: Ball = {
      id: Date.now(),
      x,
      y,
      vx,
      vy,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      scale: 1,
      hit: false,
      isDemo: true,
      isFirst: false,
      type: 'target',
    };

    balls.value.push(ball);
  };

  const updateBallPosition = (b: Ball, isMobile: boolean) => {
    b.x += b.vx;
    b.y += b.vy;

    if (!isMobile) {
      if (b.x >= window.innerWidth && !b.exitTime) b.exitTime = Date.now();
    } else {
      if (b.y <= 0 && !b.exitTime) b.exitTime = Date.now();
    }
  };

  const updateNormalDemoBalls = () => {
    const isMobile = window.innerWidth <= 768;

    balls.value.forEach((b) => {
      if (!b.isDemo || b.isFirst) return;

      updateBallPosition(b, isMobile);

      if (b.exitTime) {
        const timeOut = 500;
        if (Date.now() - b.exitTime > timeOut) b.hit = true;
      }
    });

    balls.value = balls.value.filter((b) => !b.hit);
  };

  const checkAndSpawnNormalDemoBall = () => {
    if (!firstDemoBall) {
      const hasVisible = balls.value.some((b) => !b.hit);
      if (!hasVisible) {
        if (!emptySince) emptySince = Date.now();
        else if (Date.now() - emptySince >= EMPTY_DELAY) {
          spawnNormalDemoBall();
          emptySince = null;
        }
      } else emptySince = null;
    }
  };

  // ==================================================
  // 戻り値
  // ==================================================
  return {
    demoPlayed,
    spawnFirstDemoBall,
    handleFirstDemoBallTap,
    updateFirstDemoBall,
    spawnDemoScatter,
    spawnNormalDemoBall,
    updateNormalDemoBalls,
    checkAndSpawnNormalDemoBall,
  };
}
