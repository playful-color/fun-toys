<template>
  <div class="contact-page inner">
    <component
      :is="currentStep"
      @next="nextStep"
      @back="prevStep"
      @reset="stepIndex = 0"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

import ContactUs from '@/components/Contact/ContactUs.vue';
import ContactConfirm from '@/components/Contact/ContactConfirm.vue';
import ContactDone from '@/components/Contact/ContactDone.vue';

import type { Component } from 'vue';

// ステップコンポーネント配列
const steps: Component[] = [ContactUs, ContactConfirm, ContactDone];

// 現在のステップインデックス
const stepIndex = ref<number>(0);

// 現在表示中のコンポーネント
const currentStep = computed<Component>(() => steps[stepIndex.value]);

// 次のステップ
const nextStep = () => {
  if (stepIndex.value < steps.length - 1) stepIndex.value++;
};

// 前のステップ
const prevStep = () => {
  if (stepIndex.value > 0) stepIndex.value--;
};
</script>

<style lang="scss" scoped>
@use '@/assets/styles/variables' as vars;
@use '@/assets/styles/mixins' as *;

.contact-page {
  max-width: 940px;
  margin: 50px auto;
  padding: 20px;
  font-family: vars.$sans;
  background: vars.$white;

  @include sp {
    margin: vw(20) auto;
    padding: 0;
  }
}
</style>
