<template>
  <Header />

  <Loading v-if="isLoading" @finished="onLoadingFinished" />

  <main class="app-main">
    <router-view />

    <div class="flex-center" v-if="!isLoading && route.path === '/'">
      <!-- トップページだけ再生ボタン表示 -->
      <button class="loading_btn btn" @click="loadingPlayback">
        もういちどたいけんする
      </button>
      <!-- about に遷移するボタン -->
      <router-link to="/about" class="about_btn btn">
        ボールであそぶ
      </router-link>
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import Header from '@/components/Common/Header.vue';
import Loading from '@/components/Common/Loading.vue';

// ローディング状態
const isLoading = ref<boolean>(false);

// ルート情報
const route = useRoute();

// ローディングをトップページでだけ表示する処理
onMounted(() => {
  const hasPlayed = localStorage.getItem('loadingPlayed');
  if (!hasPlayed && route.path === '/') {
    isLoading.value = true;
  }
});

// ローディングが終わったことを localStorage に保存
function onLoadingFinished(): void {
  isLoading.value = false;
  localStorage.setItem('loadingPlayed', 'true');
}

// もう一度体験する
function loadingPlayback(): void {
  isLoading.value = false;
  requestAnimationFrame(() => {
    isLoading.value = true;
  });
}
</script>

<style lang="scss" scoped>
@use '@/assets/styles/variables' as vars;
@use '@/assets/styles/mixins' as *;
.app-main {
  flex-direction: column;
}

.flex-center {
  width: 1200px;
  margin: 0 auto;
  @include flex-center;
  justify-content: flex-end;
  gap: 20px;
  padding-top: 10px;

  .btn {
    font-family: vars.$yomogi;
    font-weight: bold;
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
  }

  @include sp {
    width: 100%;
    justify-content: flex-end;
    gap: vw(50);
    padding-top: 0;
    .btn {
      padding: 2vw;
      font-size: vw(14);
    }
  }
}
</style>
