<template>
  <header ref="headerRef" id="app-header">
    <h1><router-link to="/"><img :src="logo" alt="PLAYFULLY CODING LOGO" /></router-link></h1>
    <Navigation />
  </header>
</template>

<script setup>
import logo from '@/assets/images/common/logo.png'
import Navigation from '@/components/Common/Navigation.vue'
</script>

<style lang="scss" scoped>
@use "@/assets/styles/variables" as vars;
@use "@/assets/styles/mixins" as *;
header {
  max-width: 1200px;
  width: 97%;
  margin: 0 auto;
  @include flex-center;
  justify-content: space-between;

  h1 {
    margin: 14px 0;
  }
  nav ul {
    display: flex;
    list-style: none;
    gap: 20px;
    li a {
      color: #5f4b32;
    }
  }
  @include sp {
    min-width: 100%;
    padding: 0 3vw;
    height: 20vw;
    h1 {
      margin: 2vw 0;
      width: 50%;
    }
    nav ul {
      display: flex;
      list-style: none;
      gap: 20px;
      li a {
        color: #5f4b32;
      }
    }
  }
}
</style>
