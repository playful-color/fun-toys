<template>
  <Header />

  <Loading
    v-if="isLoading"
    @finished="onLoadingFinished"
  />

  <main class="app-main">
    <router-view />
  </main>

  <!-- トップページだけ再生ボタン表示 -->
  <button
    v-if="!isLoading && route.path === '/'"
    class="loading_btn"
    @click="loadingPlayback"
  >
    もういちどたいけんする
  </button>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import Header from '@/components/Common/Header.vue';
import Loading from '@/components/Common/Loading.vue';

const isLoading = ref(false);
const route = useRoute();

// ローディングをトップページでだけ表示する処理
onMounted(() => {
  const hasPlayed = localStorage.getItem('loadingPlayed');
  if (!hasPlayed && route.path === '/') {
    isLoading.value = true;
  }
});

// ローディングが終わったことをlocalStorageに保存
function onLoadingFinished() {
  isLoading.value = false;
  localStorage.setItem('loadingPlayed', 'true');
}

//もう一度体験する
function loadingPlayback() {
  isLoading.value = false;
  requestAnimationFrame(() => {
    isLoading.value = true;
  });
}
</script>

<style lang="scss" scoped>
@use "@/assets/styles/variables" as vars;
@use "@/assets/styles/mixins" as *;
.loading_btn {
  font-size: 12px;
  color: #fff;
  background: #d1b38a;
  position: absolute;
  bottom: 20px;
  right: 20px;
  padding: 5px 10px;
  border-radius: 20px;
  border: none;
  z-index: 999;
  cursor: pointer;
  &:hover {
    opacity: .7;
  }
  @include sp {
    bottom: 1vw;
    right: 5vw;
    padding: 1vw 2vw;
    font-size: vw(14);
  }
}
</style>
