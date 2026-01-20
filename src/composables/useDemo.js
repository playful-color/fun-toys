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
    const top = rect.top + window.scrollY; // スクロールを加算
    const bottom = rect.bottom + window.scrollY; // スクロールを加算

    let isInsideMessage = false;
    let isPastMessage = false;

    const isMobile = window.innerWidth <= 768;

    if (!isMobile) {
      b.y = window.innerHeight / 2 - BALL_SIZE / 2;

      // X, Y座標両方のチェック
      if (b.x + BALL_SIZE >= left && b.x <= right && b.y + BALL_SIZE >= top && b.y <= bottom) {
        if (!isInsideMessage) {
          isInsideMessage = true;
          messageVisible.value = true; // メッセージを表示
        }
      }

      // メッセージ領域の終わりに到達したら透過処理を追加
      if (b.x + BALL_SIZE > right && !isPastMessage) {
        isPastMessage = true;
        if (messageEl) {
          messageEl.classList.add('transparent'); // メッセージを透過させる
        }
      }

      b.vx = isInsideMessage ? 1 : b.x < left ? 6 : 6;
      b.vy = 0;
    } else {
      b.x = window.innerWidth / 2 - BALL_SIZE / 2;

      // メッセージ領域に到達した場合 (Y座標チェック)
      if (b.y + BALL_SIZE >= top && b.y <= top + BALL_SIZE) {
        if (!isInsideMessage) {
          isInsideMessage = true;
          messageVisible.value = true; // メッセージを表示
        }
      }

      // ボールがメッセージ領域を通過したか
      if (b.y + BALL_SIZE < top - BALL_SIZE && !isPastMessage) {
        isPastMessage = true;
        if (messageEl) {
          messageEl.classList.add('transparent'); // メッセージを透過させる
      }
      }

      b.vy = isInsideMessage ? -1 : b.y > bottom ? -3 : -3;
      b.vx = 0;
    }

    b.x += b.vx;
    b.y += b.vy;

    // 画面外に出た場合の処理
    if (
      b.x + BALL_SIZE < 0 || b.x > window.innerWidth ||
      b.y + BALL_SIZE < 0 || b.y > window.innerHeight
    ) {
      if (!b.exitTime) {
        b.exitTime = Date.now();
      }

      const timeOut = 500;
      if (b.exitTime && Date.now() - b.exitTime > timeOut) {
        firstDemoBall.hit = true;
        firstDemoBall = null;
        emptySince = Date.now();
        //requestAnimationFrame(checkAndSpawnNormalDemoBall);
      }
    }

    //requestAnimationFrame(updateFirstDemoBall);
  };

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
    const y = isPC
      ? window.innerHeight / 2 - BALL_SIZE / 2
      : window.innerHeight - BALL_SIZE;

    let x = 0;
    if (isPC) {
      x = -BALL_SIZE;  // PCの場合、画面外から生成
    } else {
      // スマホの場合、ボールが画面内に収まる位置に生成
      x = Math.max(0, Math.min(window.innerWidth / 2 - BALL_SIZE / 2, window.innerWidth - BALL_SIZE));
    }

    const vx = isPC ? 2 : 0;  // PCでは速く、スマホでは遅め
    const vy = isPC ? 0 : -2;  // 初期の縦方向速度は0

    const ball = {
      id: Date.now(),
      x: x,  // 修正した位置
      y: y,  // 修正した位置
      vx: vx,  // 速度調整
      vy: vy,  // 速度調整
      color: colors[Math.floor(Math.random() * colors.length)],
      scale: 1,
      hit: false,
      isDemo: true,
      isFirst: false,
    };

    balls.value.push(ball);
  };

  // 通常デモボール更新
  const updateNormalDemoBalls = () => {
    // 現在のデバイス判定（PCとSPで処理を分ける）
    const isMobile = window.innerWidth <= 768;  // 768px 以下をSPと仮定

    balls.value.forEach(b => {
      if (!b.isDemo || b.isFirst) return;

      // ボールの位置更新
      b.x += b.vx;
      b.y += b.vy;

      // PCの動き：左から右
      if (!isMobile) {
        if (b.x >= window.innerWidth && !b.exitTime) {
          // ボールが画面右端を越えた場合、出た時間を記録
          b.exitTime = Date.now();
        }
      }

      // SPの動き：下から上
      if (isMobile) {
        if (b.y <= 0 && !b.exitTime) {
          // ボールが画面上端を越えた場合、出た時間を記録
          b.exitTime = Date.now();
        }
      }

      // 画面外に出てから一定時間経過しているか判定
      if (b.exitTime) {
        const timeOut = 500; // 500ms後に消す
        const timeElapsed = Date.now() - b.exitTime;
        if (timeElapsed > timeOut) {
          if (!b.hit) {
          }
          b.hit = true; // 500ms経過したらボールを消す
        }
      }
    });

    // ボールが画面外に出たものだけを削除
    balls.value = balls.value.filter(b => !b.hit);

    // 次のフレームでの更新
    //requestAnimationFrame(updateNormalDemoBalls);
  };


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

    //requestAnimationFrame(checkAndSpawnNormalDemoBall);
  }

  // =========================
  // 初期化
  // =========================
  //spawnFirstDemoBall()
  //updateFirstDemoBall()
  //updateNormalDemoBalls()
  //checkAndSpawnNormalDemoBall()

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
