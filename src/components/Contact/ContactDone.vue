<template>
  <div class="done">
    <h2>送信が完了しました！</h2>
    <p class="txt">お問い合わせありがとうございました。</p>
    <p class="txt">内容によってはお時間を<br class="sp">いただく場合がございますが、<br>通常2〜3日以内にご連絡いたします。</p>
    <button class="btn" @click="again">もう一度問い合わせる</button>
    <router-link to="/" class="back">
      塗り絵をもう一度体験する
    </router-link>
  </div>
</template>

<script setup>

import { useContactStore } from "@/stores/useContactStore";

const store = useContactStore()

const emit = defineEmits(['reset'])

const again = () => {
  emit('reset')
}

</script>


<style lang="scss" scoped>
@use "@/assets/styles/variables" as vars;
@use "@/assets/styles/mixins" as *;

.done {
  @include step-container;
  h2 {
    @include form-ttl;
  }
  .txt {
    @include form-txt;
  }
  button.btn {
    @include btn-style;
  }
  .back {
    @include btn-back;
  }
}
</style>



