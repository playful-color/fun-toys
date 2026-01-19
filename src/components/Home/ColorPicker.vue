//ColorPicker.vue
<template>
  <div class="color-picker-with-alpha picker-container">

    
    <!-- 透過（α）スライダー -->
    <input
      type="range"
      min="0" max="1" step="0.01"
      v-model.number="alpha"
      class="alpha-slider"
    />

    <!-- 色選択 -->
    <input type="color" :value="hex" @input="onInput" class="color-input" />


    <!-- 最近使った色 -->
    <div class="recent-color" v-if="colorStore.recentColors.length">
      <div
        v-for="(c, i) in colorStore.recentColors"
        :key="i"
        class="swatch"
        :style="{ backgroundColor: rgbaString(c) }"
        @click="selectRecent(c)"
      ></div>
    </div>

    <!-- プリセットカラー -->
    <div class="palette">
      <div
        v-for="c in presetColors"
        :key="c.hex"
        class="swatch"
        :style="{ backgroundColor: rgbaString(c.rgb) }"
        @click="selectPreset(c)"
      ></div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useColorStore } from '@/stores/useColorStore'

const colorStore = useColorStore()

// プリセットカラー（パレット）
const presetColors = ref([
  { hex: '#F2A5A0', rgb: { r:242, g:165, b:160, a:1 } },
  { hex: '#F7C8A0', rgb: { r:247, g:200, b:160, a:1 } },
  { hex: '#F5E29F', rgb: { r:245, g:226, b:159, a:1 } },
  { hex: '#CDE6A6', rgb: { r:205, g:230, b:166, a:1 } },
  { hex: '#A6D8C9', rgb: { r:166, g:216, b:201, a:1 } },
  { hex: '#A7C4F2', rgb: { r:167, g:196, b:242, a:1 } },
  { hex: '#C7A7F2', rgb: { r:199, g:167, b:242, a:1 } },
  { hex: '#E2A6C8', rgb: { r:226, g:166, b:200, a:1 } },
  { hex: '#D1B38A', rgb: { r:209, g:179, b:138, a:1 } },
  { hex: '#B7B7B7', rgb: { r:183, g:183, b:183, a:1 } },
  { hex: '#A97B5B', rgb: { r:169, g:123, b:91, a:1 } },
  { hex: '#000000', rgb: { r:0, g:0, b:0, a:1 } }
]);

// rgba の算出（storeのselectedColorをそのまま）
const rgba = computed({
  get: () => ({ ...colorStore.selectedColor }),
  set: (val) => {
    colorStore.setSelectedColor(val)
  }
})

// hex を computed で生成（input[type=color] 用）
const hex = computed(() => {
  const { r, g, b } = colorStore.selectedColor
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')
})

// αスライダー
const alpha = computed({
  get: () => colorStore.selectedColor.a,
  set: (val) => {
    colorStore.setSelectedColor({ ...colorStore.selectedColor, a: val })
  }
})

// input[type=color] → storeの色更新
function onInput(e) {
  const h = e.target.value
  const r = parseInt(h.slice(1, 3), 16)
  const g = parseInt(h.slice(3, 5), 16)
  const b = parseInt(h.slice(5, 7), 16)
  colorStore.setSelectedColor({ ...colorStore.selectedColor, r, g, b })
}

// プリセット色クリック時の処理
function selectPreset(c) {
  colorStore.setSelectedColor({ ...c.rgb })
}

// 最近使った色クリック時の処理
function selectRecent(c) {
  colorStore.setSelectedColor({ ...c })
}

// rgba文字列生成（背景色に使う）
function rgbaString(c) {
  return `rgba(${c.r},${c.g},${c.b},${c.a})`
}
</script>

<style lang="scss" scoped>
@use "@/assets/styles/variables" as vars;
@use "@/assets/styles/mixins" as *;
.picker-container {
  width: 200px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: white;
  padding: 10px;
  border-radius: 8px;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2);
  .color-input {
    width: 100%;
    height: 30px;
    border: none;
    cursor: pointer;
    margin-bottom: 8px;
  }
  .alpha-slider {
    width: 100%;
    height: 15px;
    border-radius: 8px;
    background: linear-gradient(
      to right,
      rgba(255, 0, 255, 0),
      rgba(255, 0, 255, 1)
    );
    outline: none;
    cursor: pointer;
  }
}

.palette,
.recent-color {
  display: flex;
  gap: 8px;
}

.palette {
  display: flex;
  flex-wrap: wrap;
  position: fixed;
  bottom: 20px;
  left: 20px;
}
.swatch {
  width: 30px;
  height: 30px;
  border-radius: 4px;
  cursor: pointer;
  border: 1px solid #aaa;
}

@include sp {
  .palette {
    bottom: -20vw;
    left: 18vw;
    width: 80vw
  }


}

</style>
