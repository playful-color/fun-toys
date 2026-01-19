// useBalls.js☆
import { ref } from 'vue'
import { usePointer } from '@/composables/usePointer'
//import { useSound } from '@/composables/useSound'
import { useDemo } from '@/composables/useDemo'
import { BALL_SIZE, colors } from '@/config/balls'

export function useBalls(messageVisible, playSound, playPon, demoPlayed) {
  const balls = ref([])  // 現在のボールリスト
  const effects = ref([])  // エフェクトリスト
  const { spawnDemoScatter } = useDemo(messageVisible, balls, demoPlayed)

  // ボールのサイズや最大数などの設定
  const MAX_BALLS = 20

  let skipNextAdd = false  // 次回のボール追加をスキップするフラグ
  let id = 0  // ボールIDのインクリメント用
  let tappedBall = false  // タップしたボールがあるかのフラグ

  // ボールの生成関数（通常のボールを追加）
  const addBall = (x, y) => {
    while (balls.value.length >= MAX_BALLS) balls.value.shift()  // 最大数を超える場合、古いボールを削除

    // ランダムな角度と速度でボールを追加
    const angle = Math.random() * Math.PI * 2
    const speed = Math.random() * 1.5 + 0.5

    balls.value.push({
      id: id++,  // 新しいIDを割り当て
      type: 'target',  // ターゲットボール
      x: x - BALL_SIZE / 2,
      y: y - BALL_SIZE / 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      scale: 1,
      hit: false
    })
  }

  // 投げられたボールを追加する関数
  const throwBall = (x, y, dx, dy) => {
    const vx = dx * 0.08
    const vy = dy * 0.08

    balls.value.push({
      id: id++,  // 新しいIDを割り当て
      type: 'shot',  // 投げられたボール
      x: x - BALL_SIZE / 2,
      y: y - BALL_SIZE / 2,
      color: '#ffffff',
      vx,
      vy,
      scale: 1,
      hit: false
    })
  }

  // エフェクトを生成する関数
  const spawnEffect = (x, y) => {
    const eid = id++  // 新しいエフェクトIDを割り当て
    effects.value.push({ id: eid, x, y })
    setTimeout(() => {
      effects.value = effects.value.filter(e => e.id !== eid)  // 0.3秒後にエフェクトを削除
    }, 300)
  }

  // ボールを削除する関数
  const removeBall = (ballId) => {
    const removedBall = balls.value.find(b => b.id === ballId)
    if (!removedBall || removedBall.hit) return

    tappedBall = true
    removedBall.hit = true
    skipNextAdd = true

    // エフェクト
    spawnEffect(removedBall.x + BALL_SIZE / 2, removedBall.y + BALL_SIZE / 2)

    playPon()

    // ボールの削除
    balls.value = balls.value.filter(b => b.id !== ballId)

    // デモボールの処理
    if (removedBall.isDemo) {
      //messageVisible.value = false
    }

    if (removedBall.isDemo && !demoPlayed.value) {
      demoPlayed.value = true
      spawnDemoScatter(removedBall.x, removedBall.y)
    } else {
      skipNextAdd = true
    }
  }

  // メインループでのボール更新処理
  const updateBalls = () => {
    balls.value.forEach(b => {
      b.x += b.vx  // X座標更新
      b.y += b.vy  // Y座標更新

      // 投げたボールとターゲットの衝突判定
      if (b.type === 'shot') {
        balls.value.forEach(target => {
          if (target.type === 'target' && !target.hit && hitTest(b, target)) {
            playPon()  // 音を鳴らす
            spawnEffect(target.x + BALL_SIZE / 2, target.y + BALL_SIZE / 2)  // エフェクト生成

            target.hit = true  // ターゲットボールのヒットフラグを立てる
            b.hit = true  // 投げたボールのヒットフラグを立てる

            // 両方を削除
            removeBall(target.id)
            removeBall(b.id)
          }
        })
      }

      // 跳ね返り処理（ボールが画面の端に当たったら反発）
      if (b.type === 'target' && !b.isDemo) {
        const r = BALL_SIZE / 2  // ボールの半径

        // 左
        if (b.x < 0) {
          b.x = 0
          b.vx = Math.abs(b.vx)
        }
        // 右
        else if (b.x + BALL_SIZE > window.innerWidth) {
          b.x = window.innerWidth - BALL_SIZE
          b.vx = -Math.abs(b.vx)
        }

        // 上
        if (b.y < 0) {
          b.y = 0
          b.vy = Math.abs(b.vy)
        }
        // 下
        else if (b.y + BALL_SIZE > window.innerHeight) {
          b.y = window.innerHeight - BALL_SIZE
          b.vy = -Math.abs(b.vy)
        }
      }
    })

    // ボールの状態が更新された後、画面外に出たボールや寿命が尽きたボールを削除
    balls.value = balls.value.filter(b => {
      // hit の寿命管理
      if (b.hit) {
        b.life = (b.life ?? 0) + 1
        return b.life <= 15  // 15フレーム後にボールを削除
      }

      // 投げられたボールが画面外に出た場合は削除
      if (b.type === 'shot') {
        if (
          b.x + BALL_SIZE < 0 || b.x - BALL_SIZE > window.innerWidth ||
          b.y + BALL_SIZE < 0 || b.y - BALL_SIZE > window.innerHeight
        ) return false
      }

      return true  // その他はそのまま残す
    })
  }

  // 衝突判定関数（ボール同士が当たったかどうかを判定）
  const hitTest = (a, b) => {
    const ax = a.x + BALL_SIZE / 2
    const ay = a.y + BALL_SIZE / 2
    const bx = b.x + BALL_SIZE / 2
    const by = b.y + BALL_SIZE / 2
    return Math.hypot(ax - bx, ay - by) < BALL_SIZE
  }

  // ポインタの状態を管理する関数
  const { startPointer, movePointer, endPointer } = usePointer({
    onDown: (x, y) => {
      // 黒ボール以外のボールが画面にあるかチェック
      const normalBallExists = balls.value.some(b => b.type !== 'shot' && !b.hit)
      if (normalBallExists && !skipNextAdd) {
        playSound()  // ボールがある場合は音を鳴らす
      }
    },
    onTap: (x, y) => {
      if (skipNextAdd) {
        skipNextAdd = false
        return
      }
      addBall(x, y)  // タップした場所にボールを追加
    },
    onThrow: throwBall  // 投げる処理
  })

  // ステージのイベントリスナーを設定
  const attachStageEvents = (stageEl) => {
    if (!stageEl) return
    stageEl.addEventListener('pointerdown', startPointer)
    stageEl.addEventListener('pointermove', movePointer)
    stageEl.addEventListener('pointerup', endPointer)
  }

  return {
    balls, addBall, spawnEffect, effects, updateBalls, hitTest,
    throwBall, startPointer, movePointer, endPointer, attachStageEvents, removeBall
  }
}
