<template>
  <div
  ref="stageRef"
  class="stage"
>
  <div
    v-for="ball in balls"
    :ref="el => ball.el = el"
    :key="ball.id"
    class="ball"
    :id="`ball-${ball.id}`"
    :class="{ hit: ball.hit }"
    :style="{
      transform: `translate3d(${Math.round(ball.x)}px, ${Math.round(ball.y)}px, 0)`,
      backgroundColor: ball.color
    }"
    @pointerdown="removeBall(ball.id)"
  />
    <div class="message_block">
      <div v-for=" effec in effects" :key=" effec.id"
        class="effect"
        :style="{ left:  effec.x + 'px', top:  effec.y + 'px' }" />
        <!-- 中央文字 -->
        <div ref="messageEl" class="message" :class="{ show: messageVisible }">
          <p>うごくと、たのしい</p>
          <p>そんな体験を作りたくて、<br>このサイトは「遊べるUI」<br class="sp">をテーマにしています。</p>
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
        <!-- soundEnabledがtrueなら'on'の画像を表示、それ以外は'off'の画像 -->
        <img :src="soundEnabled ? on : off" alt="sound toggle" />
      </span>
    </button>

  </div>
</template>

<script setup>
import off from '@/assets/images/about/off.png'
import on from '@/assets/images/about/on.png'
import { ref, onMounted } from 'vue'
import { useSound } from '@/composables/useSound'
import { useDemo } from '@/composables/useDemo'
import { useBalls } from '@/composables/useBalls'

// 中央文字表示
const messageVisible = ref(false)

const { soundEnabled, playSound, playPon, toggleSound } = useSound()

const demoPlayed = ref(false)

// 1. まず useBalls を呼び出し、balls を取得
const { balls, updateBalls, addBall, throwBall, effects, attachStageEvents, removeBall } = useBalls(messageVisible, playSound, playPon, demoPlayed)

// 2. 次に useDemo を呼び出し、demoPlayed を取得
const { spawnFirstDemoBall, spawnDemoScatter, updateFirstDemoBall, checkAndSpawnMessageDemoBall, updateNormalDemoBalls, checkAndSpawnNormalDemoBall } = useDemo(messageVisible, balls, demoPlayed)

const stageRef = ref(null)
const getStagePos = (e) => {
  const rect = stageRef.value.getBoundingClientRect()
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  }
}

onMounted(() => {
  spawnFirstDemoBall()
  attachStageEvents(stageRef.value)

  function gameLoop() {
    updateBalls()
    updateFirstDemoBall()
    updateNormalDemoBalls()
    checkAndSpawnNormalDemoBall()
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
  position: relative;
  overflow: hidden;
  touch-action: none;
  transition: background-color 0.15s ease;
  .ball {
    position: absolute;
    width: 60px;
    height: 60px;
    border-radius: 50%;
    cursor: pointer;
    transition: opacity 0.25s ease;
    box-shadow: -5px -5px 15px rgba(0, 0, 0, .5) inset;
    z-index: 2;
    &.hit {
      opacity: 0;
    }
  }
  .effect {
    position: absolute;
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: rgba(255,255,255,0.8);
    animation: effectAnim 0.3s ease-out forwards;
  }
  .message_block {
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    .message {
      font-size: 32px;
      line-height: 2;
      color: rgba(51, 51, 51, 1);
      transition: opacity 0.5s ease, color 0.5s ease;
      opacity: 0;
      pointer-events: none;
      text-align: center;
      white-space: pre-line;
      &.show {
        opacity: 1;
        transition: opacity 0.5s ease-in-out;
      }
      &.transparent {
        opacity: .65;
        color: rgba(51, 51, 51, 0.75);
        transition: opacity 0.5s ease-in-out, transform 0.5s ease-in-out;
      }
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
    background: rgba(0, 0, 0, 0.05);
    cursor: pointer;
    z-index: 999;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.15s ease;
    transform: translateZ(0);
    .icon {
      position: relative;
    }
    &:hover {
      background: rgba(0, 0, 0, 0.1);
    }
    &:active {
      transform: scale(0.9);
    }


  }
  @include sp {
    touch-action: none;
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
}


@keyframes effectAnim {
  from { transform: scale(1); opacity: 1; }
  to { transform: scale(1.5); opacity: 0; }
}



</style>
