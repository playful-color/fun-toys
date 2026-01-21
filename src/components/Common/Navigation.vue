<template>
  <nav class="nav">
    <!-- ハンバーガー（SP用） -->
    <button class="hamburger" @click="toggleMenu">
      <font-awesome-icon :icon="menuOpen ? 'xmark' : 'bars'" />
    </button>

    <!-- ナビ（PC / SP 共通） -->
    <ul :class="['nav-links', { open: menuOpen }]">
      <!-- overlay 用ロゴ（SPのみ表示） -->
      <li class="overlay-logo">
        <router-link to="/" @click="closeMenu">
          <img :src="logo" alt="PLAYFULLY CODING LOGO" />
        </router-link>
      </li>

      <li
        v-for="item in nav.items"
        :key="item.path"
        @click="closeMenu"
      >
        <router-link :to="item.path">
          {{ item.name }}
        </router-link>
      </li>
    </ul>
  </nav>
</template>

<script setup>
import { ref } from 'vue'
import { useNavigationStore } from '@/stores/navigation'
import logo from '@/assets/images/common/logo.png'

// ストアからナビゲーションデータを取得
const nav = useNavigationStore()
const menuOpen = ref(false)

// メニューの開閉トグル
function toggleMenu() {
  menuOpen.value = !menuOpen.value
}

// メニューを閉じる
function closeMenu() {
  menuOpen.value = false
}
</script>

<style lang="scss" scoped>
@use "@/assets/styles/variables" as vars;
@use "@/assets/styles/mixins" as *; // mixins は as * で使う

.nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  .hamburger {
    display: none;
  }

  .nav-links {
    display: flex;
    gap: 30px;
    list-style: none;

    a {
      font-size: 18px;
      @include link-style;

      &.router-link-active,
      &:hover {
        color: vars.$fc_active;
      }
    }
  }

  .overlay-logo {
    display: none;
  }

  @include sp {
    .hamburger {
      display: block;
      position: fixed;
      top: 15px;
      right: 15px;
      font-size: 28px;
      border: none;
      cursor: pointer;
      z-index: 1200;
    }

    .nav-links {
      position: fixed;
      inset: 0;
      flex-direction: column;
      align-items: center;

      background: rgba(255, 255, 255, 0.2);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);

      border: 1px solid rgba(255, 255, 255, 0.3);
      box-shadow:
        0 8px 32px rgba(0, 0, 0, 0.1),
        inset 0 1px 0 rgba(255, 255, 255, 0.5),
        inset 0 -1px 0 rgba(255, 255, 255, 0.1),
        inset 0 0 40px 20px rgba(255, 255, 255, 2);

      /* 閉じてる時 */
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.3s ease;
      z-index: 1100;
    }

    .nav-links.open {
      opacity: 1;
      pointer-events: auto;
    }

    .overlay-logo {
      display: block;
      margin-top: 40px;

      img {
        width: 54vw;
      }
    }

    /* メニュー */
    .nav-links li:not(.overlay-logo) {
      margin-top: 60px;
      font-size: vw(24);
      width: 100%;
      text-align: center;
    }
  }
}



</style>
