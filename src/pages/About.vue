<template>
  <div class="stage">
    <!-- Canvas を追加 -->
    <canvas ref="canvasRef" class="stage-canvas"></canvas>

    <div class="message_block">
      <!-- メッセージはそのまま -->
      <div ref="messageEl" class="message" :class="{ show: messageVisible }">
        <p>うごくと、たのしい</p>
        <p>そんな体験を作りたくて、<br class="sp">このサイトは「遊べるUI」<br>をテーマにしています。</p>
        <p>いっぱい さわって あそんでね</p>
      </div>
    </div>

    <button
      class="sound-btn"
      :class="{ on: soundEnabled }"
      @touchstart.stop
      @touchend.stop
      @pointerdown.stop
      @click.stop="toggleSound"
      aria-label="sound toggle"
    >
      <span class="icon">
        <img :src="soundEnabled ? on : off" alt="sound toggle" />
      </span>
    </button>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useSound } from '@/composables/useSound'
import { useDemo } from '@/composables/useDemo'
import { useBalls } from '@/composables/useBalls'
import { BALL_SIZE } from '@/config/balls'  // ← ここ重要
import off from '@/assets/images/about/off.png'
import on from '@/assets/images/about/on.png'

const messageVisible = ref(false)
const { soundEnabled, playSound, playPon, toggleSound } = useSound()
const demoPlayed = ref(false)

const { balls, updateBalls, addBall, throwBall, effects, removeBall, attachStageEvents } =
  useBalls(messageVisible, playSound, playPon, demoPlayed)

const { spawnFirstDemoBall, updateFirstDemoBall, updateNormalDemoBalls, checkAndSpawnNormalDemoBall } =
  useDemo(messageVisible, balls)

const canvasRef = ref(null)
const ctx = ref(null)

// Canvas 描画
const drawCanvas = () => {
  const canvas = canvasRef.value
  const c = ctx.value
  if (!canvas || !c) return

  c.clearRect(0, 0, canvas.width, canvas.height)

  // ボール描画
  balls.value.forEach(ball => {
    if (ball.hit) return

    const cx = ball.x + BALL_SIZE / 2
    const cy = ball.y + BALL_SIZE / 2
    const radius = BALL_SIZE / 2

    // 内側シャドウ風グラデーション
    const gradient = c.createRadialGradient(cx, cy, radius * 0.2, cx, cy, radius)
    gradient.addColorStop(0, 'rgba(255,255,255,0.4)') // 中心ハイライト
    gradient.addColorStop(1, ball.color)             // 外周ボールカラー

    c.fillStyle = gradient
    c.beginPath()
    c.arc(cx, cy, radius, 0, Math.PI * 2)
    c.fill()

    // 外側薄い影で立体感を追加（任意）
    c.strokeStyle = 'rgba(0,0,0,0.15)'
    c.lineWidth = 2
    c.stroke()
  })

  // エフェクト描画
  effects.value.forEach((eff, index) => {
    const c = ctx.value
    if (!c) return

    c.fillStyle = `rgba(255,255,255,${eff.alpha})`
    c.beginPath()
    c.arc(eff.x, eff.y, eff.radius, 0, Math.PI * 2)
    c.fill()

    // エフェクトを膨らませつつ透明度を下げる
    eff.radius += 2
    eff.alpha -= 0.05

    // alpha が 0 以下になったら配列から削除
    if (eff.alpha <= 0) effects.value.splice(index, 1)
  })

}

// Canvas タップ
const pointerStates = new Map()

const onCanvasPointerDown = (e) => {
  const rect = canvasRef.value.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top

  pointerStates.set(e.pointerId, {
    startX: x,
    startY: y,
    startTime: Date.now()
  })
}

const onCanvasPointerUp = (e) => {
  const state = pointerStates.get(e.pointerId)
  if (!state) return

  const rect = canvasRef.value.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top

  const dx = x - state.startX
  const dy = y - state.startY
  const distance = Math.hypot(dx, dy)
  const time = Date.now() - state.startTime

  let hitBall = false

  balls.value.forEach(ball => {
    const cx = ball.x + BALL_SIZE / 2
    const cy = ball.y + BALL_SIZE / 2
    if (Math.hypot(cx - x, cy - y) < BALL_SIZE / 2) {
      removeBall(ball.id)
      playPon()
      effects.value.push({
        x: cx,
        y: cy,
        radius: 10,
        alpha: 1,
        color: '#fff'
      })
      hitBall = true
    }
  })

  if (!hitBall) {
    if (distance < 20 && time < 300) {
      // 連打しやすいように大きくずらす
      const OFFSET = 80
      addBall(
        x + (Math.random() - 0.5) * OFFSET,
        y + (Math.random() - 0.5) * OFFSET
      )
    } else if (distance > 40) {
      throwBall(state.startX, state.startY, dx, dy)
    }
  }

  pointerStates.delete(e.pointerId)
}


onMounted(() => {
  const canvas = canvasRef.value
  if (!canvas) return
  const c = canvas.getContext('2d')
  if (!c) return

  const dpr = window.devicePixelRatio || 1
  const resizeCanvas = () => {
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    c.setTransform(dpr, 0, 0, dpr, 0, 0)
  }
  resizeCanvas()
  window.addEventListener('resize', resizeCanvas)

  ctx.value = c

  // 初回デモボール
  spawnFirstDemoBall()

  // Canvas イベント
  canvas.addEventListener('pointerdown', onCanvasPointerDown)
  canvas.addEventListener('pointerup', onCanvasPointerUp)

  // ゲームループ
  const gameLoop = () => {
    updateBalls()
    updateFirstDemoBall()
    updateNormalDemoBalls()
    checkAndSpawnNormalDemoBall()
    drawCanvas()
    requestAnimationFrame(gameLoop)
  }
  requestAnimationFrame(gameLoop)
})

</script>

<style lang="scss" scoped>
@use "@/assets/styles/variables" as vars;
@use "@/assets/styles/mixins" as *;
.stage {
  width: 100%;
  height: 100%;
  display: block;
  touch-action: none;
}
.stage-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1; // メッセージより下
}
.message_block {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  pointer-events: none;
  .message {
    font-size: 32px;
    line-height: 2;
    color: rgba(51, 51, 51, 1);
    opacity: 0;
    pointer-events: none;
    text-align: center;
    white-space: pre-line;
    transition: opacity 0.5s ease-in-out;
    &.show { opacity: 1; }
    &.transparent { opacity: 0.65; color: rgba(51, 51, 51, 0.75); }
  }
}

.sound-btn {
  position: fixed;
  top: 70px;
  right: 20px;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: none;
  background: rgba(0,0,0,0.05);
  cursor: pointer;
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
  .icon { position: relative; }
  &:hover { background: rgba(0,0,0,0.1); }
  &:active { transform: scale(0.9); }
}
@include sp {	
  .message_block {	
    width: 100%;	
    height: 100%;	
    display: flex;	
    justify-content: center;	
    align-items: center;	
    .message {	
      font-size: vw(20);	
      line-height: 2;;	
      color: #333;	
      opacity: 0;	
      transition: opacity 0.5s;	
      pointer-events: none;	
      text-align: center;	
      white-space: pre-line;	
    }	
  }	
}	
	
@keyframes effectAnim {	
from { transform: scale(1); opacity: 1; }	
to { transform: scale(1.5); opacity: 0; }	
}

</style>
