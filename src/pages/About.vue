<template>
  <div class="stage">
    <!-- Canvas を追加 -->
    <canvas ref="canvasRef" class="stage-canvas"></canvas>

    <div class="message_block">
      <!-- メッセージはそのまま -->
      <div ref="messageEl" class="message" :class="{ show: messageVisible }">
        <p>うごくと、たのしい</p>
        <p>
          そんな体験を作りたくて、<br
            class="sp"
          />このサイトは「遊べるUI」<br />をテーマにしています。
        </p>
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
    <router-link to="/" class="btn"> またぬりえする </router-link>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useSound } from '@/composables/about/useSound';
import { useDemo } from '@/composables/about/useDemo';
import { useBalls } from '@/composables/about/useBalls';
import { useCanvas } from '@/composables/about/useCanvas';
import off from '@/assets/images/about/off.png';
import on from '@/assets/images/about/on.png';

// ==================================================
// リアクティブデータの定義
// ==================================================

const messageVisible = ref(false);
const { soundEnabled, playSound, playPon, toggleSound } = useSound();
const demoPlayed = ref(false);

// ボールに関連する関数を取得
const { balls, updateBalls, addBall, throwBall, effects, removeBall } =
  useBalls(messageVisible, playSound, playPon, demoPlayed);

// デモに関連する関数を取得
const {
  spawnFirstDemoBall,
  updateFirstDemoBall,
  updateNormalDemoBalls,
  checkAndSpawnNormalDemoBall,
} = useDemo(messageVisible, balls);

// ==================================================
// Canvas関連の設定
// ==================================================

const canvasRef = ref(null);

const { drawCanvas, resizeCanvas } = useCanvas(
  canvasRef,
  balls,
  effects,
  removeBall,
  addBall,
  throwBall,
  playPon
);

// ==================================================
// ライフサイクル処理
// ==================================================
onMounted(() => {
  window.addEventListener('resize', resizeCanvas);

  // 初回デモボール
  spawnFirstDemoBall();

  // ゲームループ
  const gameLoop = () => {
    updateBalls();
    updateFirstDemoBall();
    updateNormalDemoBalls();
    checkAndSpawnNormalDemoBall();
    drawCanvas();
    requestAnimationFrame(gameLoop);
  };
  requestAnimationFrame(gameLoop);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeCanvas);
});
</script>

<style lang="scss" scoped>
@use '@/assets/styles/variables' as vars;
@use '@/assets/styles/mixins' as *;
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
  z-index: 1;
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
    &.show {
      opacity: 1;
    }
    &.transparent {
      opacity: 0.65;
      color: rgba(51, 51, 51, 0.75);
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
  .message_block {
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    .message {
      font-size: vw(20);
      line-height: 2;
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
  from {
    transform: scale(1);
    opacity: 1;
  }
  to {
    transform: scale(1.5);
    opacity: 0;
  }
}

.btn {
  position: absolute;
  bottom: 10px;
  left: 10px;
  font-size: 13px;
  line-height: 1;
  color: #fff;
  background: #d1b38a;
  padding: 5px 10px;
  border-radius: 20px;
  border: none;
  z-index: 999;
  cursor: pointer;
  -webkit-user-select: none;
  user-select: none;
  -webkit-touch-callout: none;
  &:hover {
    opacity: 0.7;
  }
  @include sp {
    padding: 2vw;
    bottom: 2vw;
    left: 2vw;
    font-size: vw(14);
  }
}
</style>
