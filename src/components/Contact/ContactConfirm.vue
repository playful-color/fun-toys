<template>
  <div class="confirm">
    <h2>入力内容のご確認</h2>
        <p class="txt">入力内容をご確認の上、<br class="sp">『送信する』ボタンを押してください。</p>
    <dl>
      <dt>名前</dt>
      <dd>{{ form.name }}</dd>
      <dt>メール</dt>
      <dd>{{ form.email }}</dd>
      <dt>電話</dt>
      <dd>{{ form.phone }}</dd>
      <dt>メッセージ</dt>
      <dd>{{ form.message }}</dd>
    </dl>
    <button class="btn" @click="submitForm" :disabled="isSubmitting">{{ isSubmitting ? '送信中…' : '送信する' }}</button>
    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
    <button class="back" @click="backStep">入力内容を修正する</button>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useContactStore } from "@/stores/useContactStore";
import { db } from "@/firebase/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

const form = useContactStore();
const emit = defineEmits(["next", "back"]);

const isSubmitting = ref(false)
const errorMessage = ref("")

const backStep = () => emit("back");

// 問い合わせ内容を送信する処理
const submitForm = async () => {
  if (isSubmitting.value) return
  isSubmitting.value = true
  errorMessage.value = "" // 送信前にエラーをリセット

  try {
    const data = {
      name: String(form.name),
      email: String(form.email),
      phone: String(form.phone || ""),
      message: String(form.message),
      createdAt: serverTimestamp()
    }

    await addDoc(collection(db, "contacts"), data)
    emit("next")
    form.reset()
  } catch (err) {
    errorMessage.value = "*送信に失敗しました。時間をおいて再度お試しください。"
  } finally {
    isSubmitting.value = false
  }
}

</script>

<style lang="scss" scoped>
@use "@/assets/styles/variables" as vars;
@use "@/assets/styles/mixins" as *;

.confirm {
  @include step-container;
  h2 {
    @include form-ttl;
  }
  .txt {
    @include form-txt;
  }
  dl {
    font-size: 18px;
    margin: 40px auto 0;
    dt {
      font-weight: bold;
    }
    dd {
      margin: 10px 0 30px;
      white-space: pre-wrap;
    }
    @include sp {
      font-size: vw(16);
      margin: vw(40) auto 0;
      dd {
        margin: 0 0 vw(30);
      }
    }
  }
  button.btn {
    @include btn-style;
  }
  button.back {
    @include btn-back;
  }
  .error {
    color: vars.$red;
    font-size: 14px;
    text-align: center;
    list-style: 1;
    margin-top: 20px;
    @include sp {
      font-size: vw(12);
      text-align: left;
      margin-left: 1em;
      text-indent: -1em;
      margin-top: vw(10);
    }
  }
}
</style>
