import { ref } from 'vue';
import { usePointer } from '@/composables/about/usePointer';
import { useDemo } from '@/composables/about/useDemo';
import { BALL_SIZE, colors } from '@/config/balls';

export function useBalls(messageVisible, playSound, playPon, demoPlayed) {
  const balls = ref([]);
  const effects = ref([]);
  const { spawnDemoScatter } = useDemo(messageVisible, balls, demoPlayed);

  const MAX_BALLS = 20;

  let skipNextAdd = false;
  let id = 0;
  let tappedBall = false;

  // ==================================================
  // ボール生成・管理の関数
  // ==================================================

  // 通常のボールを追加する関数
  const addBall = (x, y) => {
    playSound();

    // 最大数を超える場合、古いボールを削除
    while (balls.value.length >= MAX_BALLS) balls.value.shift();

    // ランダムな角度と速度でボールを追加
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 1.5 + 0.5;

    balls.value.push({
      id: id++,
      type: 'target',
      x: x - BALL_SIZE / 2,
      y: y - BALL_SIZE / 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      scale: 1,
      hit: false,
    });
  };

  // 投げられたボールを追加する関数
  const throwBall = (x, y, dx, dy) => {
    const vx = dx * 0.08;
    const vy = dy * 0.08;

    balls.value.push({
      id: id++,
      type: 'shot',
      x: x - BALL_SIZE / 2,
      y: y - BALL_SIZE / 2,
      color: '#ffffff',
      vx,
      vy,
      scale: 1,
      hit: false,
    });
  };

  // エフェクトを生成する関数
  const spawnEffect = (x, y) => {
    const eid = id++;
    effects.value.push({ id: eid, x, y });
    setTimeout(() => {
      effects.value = effects.value.filter((e) => e.id !== eid);
    }, 300);
  };

  // ボールを削除する関数
  const removeBall = (ballId) => {
    const removedBall = balls.value.find((b) => b.id === ballId);
    if (!removedBall || removedBall.hit) return;

    tappedBall = true;
    removedBall.hit = true;
    skipNextAdd = true;

    // エフェクト
    spawnEffect(removedBall.x + BALL_SIZE / 2, removedBall.y + BALL_SIZE / 2);

    playPon();

    // ボールの削除
    balls.value = balls.value.filter((b) => b.id !== ballId);

    // デモボールが削除された場合の処理
    if (removedBall.isDemo && !demoPlayed.value) {
      demoPlayed.value = true;
      spawnDemoScatter(removedBall.x, removedBall.y);
    } else {
      skipNextAdd = true;
    }
  };

  // ==================================================
  // メインループの処理
  // ==================================================

  // メインループでのボール更新処理
  const updateBalls = () => {
    balls.value.forEach((b) => {
      b.x += b.vx;
      b.y += b.vy;

      // 投げたボールとターゲットの衝突判定
      if (b.type === 'shot') {
        balls.value.forEach((target) => {
          if (target.type === 'target' && !target.hit && hitTest(b, target)) {
            playPon();

            // 衝突した場合にエフェクトを生成
            spawnEffect(target.x + BALL_SIZE / 2, target.y + BALL_SIZE / 2);
            spawnEffect(b.x + BALL_SIZE / 2, b.y + BALL_SIZE / 2);

            target.hit = true;
            b.hit = true;

            // 両方を削除
            removeBall(target.id);
            removeBall(b.id);
          }
        });
      }

      // 跳ね返り処理（ボールが画面の端に当たったら反発）
      if (b.type === 'target' && !b.isDemo) {
        const r = BALL_SIZE / 2;

        // 左端にぶつかった場合
        if (b.x < 0) {
          b.x = 0;
          b.vx = Math.abs(b.vx);
        }
        // 右端にぶつかった場合
        else if (b.x + BALL_SIZE > window.innerWidth) {
          b.x = window.innerWidth - BALL_SIZE;
          b.vx = -Math.abs(b.vx);
        }
        // 上端にぶつかった場合
        if (b.y < 0) {
          b.y = 0;
          b.vy = Math.abs(b.vy);
        }
        // 下端にぶつかった場合
        else if (b.y + BALL_SIZE > window.innerHeight) {
          b.y = window.innerHeight - BALL_SIZE;
          b.vy = -Math.abs(b.vy);
        }
      }
    });

    // ボールの状態が更新された後、画面外に出たボールや寿命が尽きたボールを削除
    balls.value = balls.value.filter((b) => {
      if (b.hit) {
        b.life = (b.life ?? 0) + 1;
        return b.life <= 15;
      }

      // 投げられたボールが画面外に出た場合は削除
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

  // 衝突判定関数（ボール同士が当たったかどうかを判定）
  const hitTest = (a, b) => {
    const ax = a.x + BALL_SIZE / 2;
    const ay = a.y + BALL_SIZE / 2;
    const bx = b.x + BALL_SIZE / 2;
    const by = b.y + BALL_SIZE / 2;
    return Math.hypot(ax - bx, ay - by) < BALL_SIZE;
  };

  // ポインタ操作（タップやスワイプ）の状態管理
  const { startPointer, movePointer, endPointer } = usePointer({
    onTap: (x, y) => addBall(x, y),
    onThrow: (x, y, dx, dy) => throwBall(x, y, dx, dy),
  });

  // ステージのイベントリスナーを設定
  const attachStageEvents = (stageEl) => {
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
    addBall,
    throwBall,
    spawnEffect,
    removeBall,
    updateBalls,
    hitTest,
    attachStageEvents,
    effects,
    startPointer,
    movePointer,
    endPointer,
  };
}
