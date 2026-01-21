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

  // ボール描画（左上座標ベース）
  balls.value.forEach(ball => {
    if (ball.hit) return
    c.fillStyle = ball.color
    c.beginPath()
    c.arc(ball.x + BALL_SIZE / 2, ball.y + BALL_SIZE / 2, BALL_SIZE / 2, 0, Math.PI * 2)
    c.fill()
  })

  // エフェクト描画
  effects.value.forEach(eff => {
    c.fillStyle = 'rgba(255,255,255,0.8)'
    c.beginPath()
    c.arc(eff.x, eff.y, BALL_SIZE / 2, 0, Math.PI * 2)
    c.fill()
  })
}

// Canvas タップ
const onCanvasPointerDown = (e) => {
  const rect = canvasRef.value.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top

  balls.value.forEach(ball => {
    const cx = ball.x + BALL_SIZE / 2
    const cy = ball.y + BALL_SIZE / 2

    if (Math.hypot(cx - x, cy - y) < BALL_SIZE / 2) {
      removeBall(ball.id)
      playPon()
    }
  })
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
  attachStageEvents(canvas)
  canvas.addEventListener('pointerdown', onCanvasPointerDown)

  // --- ゲームループ ---
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
