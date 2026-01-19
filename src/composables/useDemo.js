import { ref } from 'vue'
import { BALL_SIZE, colors } from '@/config/balls'

export function useDemo(messageVisible, balls) {
  const demoPlayed = ref(false)
  let emptySince = null
  const EMPTY_DELAY = 3000

  const isPC = window.innerWidth > 768 
  let firstDemoBall = null
  let firstDemoHandled = false


  // 初回デモボール生成
  const spawnFirstDemoBall = () => {
    const messageEl = document.querySelector('.message')
    if (!messageEl) return
    const rect = messageEl.getBoundingClientRect()

    const y = isPC
      ? rect.top + rect.height / 2 - BALL_SIZE / 2
      : window.innerHeight - BALL_SIZE
    const x = isPC ? -BALL_SIZE : window.innerWidth / 2 - BALL_SIZE / 2

    const ball = {
      id: Date.now(),
      x, y,
      vx: 0,
      vy: 0,
      color: colors[Math.floor(Math.random() * colors.length)],
      scale: 1,
      hit: false,
      isDemo: true,
      isFirst: true,
    }

    firstDemoBall = ball
    balls.value.push(ball)
  }


  // 初回デモボールタップ時
  const handleFirstDemoBallTap = (ball, messageElRef) => {
    if (!firstDemoBall || firstDemoHandled) return
    if (ball.id === firstDemoBall.id) {
      firstDemoHandled = true

      // 四方散布を先に生成
      spawnDemoScatter(ball.x, ball.y)

      // Vue refを使って透過
      if (messageElRef?.value) {
        messageElRef.value.classList.add('transparent')
      }

      // 初回ボールは四方散布後に削除
      requestAnimationFrame(() => {
        firstDemoBall.hit = true
        firstDemoBall = null
      })
    }
  }

  // 初回デモボール更新（PC/SP両対応）
  const updateFirstDemoBall = () => {
    if (!firstDemoBall || firstDemoHandled) return;

    const b = firstDemoBall;
    const messageEl = document.querySelector('.message');
    if (!messageEl) return;

    const rect = messageEl.getBoundingClientRect();
    const left = rect.left;
    const right = rect.right;
    const top = rect.top;
    const bottom = rect.bottom;

    let isInsideMessage = false;
    let isPastMessage = false;

    if (isPC) {
      // PC: 左→右
      b.y = window.innerHeight / 2 - BALL_SIZE / 2;
      if (b.x + BALL_SIZE >= left) messageVisible.value = true;
      if (b.x + BALL_SIZE >= left && b.x <= right) isInsideMessage = true;
      if (b.x > right) isPastMessage = true;

      b.vx = isInsideMessage ? 0.5 : b.x < left ? 6 : 2;
      b.vy = 0;
    } else {
      // SP: 下→上
      b.x = window.innerWidth / 2 - BALL_SIZE / 2;
      if (b.y + BALL_SIZE >= bottom) messageVisible.value = true;
      if (b.y <= bottom && b.y + BALL_SIZE >= top) isInsideMessage = true;
      if (b.y + BALL_SIZE < top) isPastMessage = true;

      b.vy = isInsideMessage ? -0.5 : b.y > bottom ? -6 : -2;
      b.vx = 0;
    }

    b.x += b.vx;
    b.y += b.vy;

    // メッセージ通過で透過
    if (isPastMessage) {
      if (messageEl) messageEl.classList.add('transparent');
      console.log('初回デモボールがメッセージを通過したよ');  // 通過したタイミングでログ
    }
    

    // 初回デモボール画面外で削除
    if (
      b.x + BALL_SIZE < 0 || b.x > window.innerWidth ||
      b.y + BALL_SIZE < 0 || b.y > window.innerHeight
    ) {
      console.log("First demo ball out of view, removing:", firstDemoBall);
      firstDemoBall.hit = true;  // 画面外に出たら hit を true に設定
      firstDemoBall = null;  // 画面外に出たら削除
      emptySince = Date.now(); // ボールが消えたタイミングで emptySince をリセット
      console.log("First demo ball after removal:", firstDemoBall);

      // ボール消去後に次のボール生成
      requestAnimationFrame(checkAndSpawnNormalDemoBall);  // 次のボール生成を再評価
    }

    requestAnimationFrame(updateFirstDemoBall)
  }

  // 四方八方散布
  const spawnDemoScatter = (x, y) => {
    const num = 8
    for (let i = 0; i < num; i++) {
      const angle = (Math.PI * 2 / num) * i;
      const speed = Math.random() * 1.5 + 0.5;
      const newBall = {
        id: Date.now() + i,
        type: 'target',
        x,
        y,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        scale: 1,
        hit: false,
      };

      balls.value.push(newBall);
    }
    //firstDemoBall = null; 
  }

  // 通常デモボール生成
  const spawnNormalDemoBall = () => {
    console.log('通常のデモボールの生成'); 
    const y = isPC
      ? window.innerHeight / 2 - BALL_SIZE / 2
      : window.innerHeight - BALL_SIZE;

    // スマホの場合、ボールが画面外から生成されないように調整
    const x = isPC
      ? -BALL_SIZE // PCの場合
      : window.innerWidth / 2 - BALL_SIZE / 2; // スマホの場合は中央から生成

    const ball = {
      id: Date.now(),
      x: x,  // 修正した位置
      y: y,  // 修正した位置
      vx: 2,
      vy: 0,
      color: colors[Math.floor(Math.random() * colors.length)],
      scale: 1,
      hit: false,
      isDemo: true,
      isFirst: false,
    }

    balls.value.push(ball);
    console.log('Ball spawned:', ball);
  }

  // 通常デモボール更新
  const updateNormalDemoBalls = () => {
    balls.value.forEach(b => {
      if (!b.isDemo || b.isFirst) return;

      // 画面内にボールが表示された場合に hit を true にしない
      b.x += b.vx;
      b.y += b.vy;

      // ボールが画面内に完全に表示される前に消えるのを防ぐ
      if (b.x > window.innerWidth + BALL_SIZE) {
        b.hit = true;
      }
    });

    // ボールが画面外に出た後に hit を true にする
    balls.value = balls.value.filter(b => !b.hit);

    // 次のフレームでの更新
    requestAnimationFrame(updateNormalDemoBalls);
  }

  // 通常デモボール自動生成
  const checkAndSpawnNormalDemoBall = () => {
    if (!firstDemoBall) { 
      const hasVisible = balls.value.some(b => !b.hit);
      if (!hasVisible) { 
        if (!emptySince) emptySince = Date.now();
        else if (Date.now() - emptySince >= EMPTY_DELAY) {
          spawnNormalDemoBall();
          emptySince = null;
        }
      } else emptySince = null;
    }

    requestAnimationFrame(checkAndSpawnNormalDemoBall);
  }

  // =========================
  // 初期化
  // =========================
  spawnFirstDemoBall()
  updateFirstDemoBall()
  updateNormalDemoBalls()
  checkAndSpawnNormalDemoBall()

  return {
    demoPlayed,
    handleFirstDemoBallTap,
    spawnFirstDemoBall,
    updateFirstDemoBall,
    spawnDemoScatter,
    spawnNormalDemoBall,
    updateNormalDemoBalls,
    checkAndSpawnNormalDemoBall
  }
}
