<template>
  <div class="contactus">
    <h2>お問い合わせ</h2>
    <p class="txt">制作のご相談・ご質問・ご感想など<br>お気軽にお問い合わせください。</p>
    <dl class="dl_form">
      <!-- 名前 -->
      <dt><label for="name"><span class="mark">必須</span>名前</label></dt>
      <dd ref="nameWrapRef">
        <input
          id="name"
          ref="nameInputRef"
          v-model="form.name"
          type="text"
          placeholder="例）山田太郎"
          autocomplete="name"
          :class="{ errorInput: form.errors.name, successInput: fieldOk.name }"
          @input="onInput('name')"
          @blur="validateField('name')"
        />
        <span class="check" v-if="fieldOk.name">✔</span>
        <p class="error" v-if="form.errors.name">{{ form.errors.name }}</p>
      </dd>

      <!-- メール -->
      <dt><label for="email"><span class="mark">必須</span>メール</label></dt>
      <dd ref="emailWrapRef">
        <input
          id="email"
          ref="emailInputRef"
          v-model="form.email"
          type="email"
          placeholder="例）example@mail.com"
          autocomplete="email"
          :class="{ errorInput: form.errors.email, successInput: fieldOk.email }"
          @input="onInput('email')"
          @blur="validateField('email')"
        />
        <span class="check" v-if="fieldOk.email">✔</span>
        <p class="error" v-if="form.errors.email">{{ form.errors.email }}</p>
      </dd>

      <!-- 電話 -->
      <dt><label for="phone"><span class="mark any">任意</span>電話</label></dt>
      <dd ref="phoneWrapRef">
        <input
          id="phone"
          ref="phoneInputRef"
          v-model="form.phone"
          type="tel"
          inputmode="numeric"
          placeholder="例）09012345678"
          autocomplete="tel"
          :class="{ errorInput: form.errors.phone, successInput: fieldOk.phone }"
          @input="onPhoneInput"
          @blur="validateField('phone')"
        />
        <span class="check" v-if="fieldOk.phone">✔</span>
        <p class="error" v-if="form.errors.phone">{{ form.errors.phone }}</p>
      </dd>

      <!-- お問い合わせ内容 -->
      <dt><label for="message"><span class="mark">必須</span>お問い合わせ内容</label></dt>
      <dd ref="messageWrapRef">
        <textarea
          id="message"
          ref="messageInputRef"
          v-model="form.message"
          placeholder="例）お問い合わせ内容を入力してください"
          :class="{ errorInput: form.errors.message, successInput: fieldOk.message }"
          @input="onInput('message')"
          @blur="validateField('message')"
        ></textarea>
        <span class="check" v-if="fieldOk.message">✔</span>
        <p class="error" v-if="form.errors.message">{{ form.errors.message }}</p>
      </dd>
    </dl>

    <!-- プライバシーポリシー -->
    <div class="privacy">
      <div class="agree" ref="agreeWrapRef">
        <label>
          <span class="mark">必須</span>
          <input
            ref="agreeInputRef"
            type="checkbox"
            v-model="form.agree"
            @input="onInput('agree')"
          />
          <span class="box">
            <span class="check" v-if="form.agree">✔</span>
          </span>
          プライバシーポリシーに<br class="sp">同意する
        </label>
        <div class="error-wrapper">
          <p class="error" v-if="form.errors.agree">{{ form.errors.agree }}</p>
        </div>
      </div>      
      <ul class="ul_policy ul_note">
        <li>※当サイトでは、お問い合わせ内容を Firebase Firestore（Google が提供するクラウドデータベース） に保存します。</li>
        <li>※取得した個人情報は、お問い合わせへの対応以外の目的では利用せず、第三者に提供することはありません。</li>
        <li>※個人情報の管理責任者は、当サイト運営者とします。</li>
        <li>※個人情報の取り扱いに関するお問い合わせは、本フォームよりご連絡ください。</li>
      </ul>

      <ul class="ul_note">
        <li>※当サイトで使用している画像・音声素材は、各提供元の著作権に従って使用しています。</li>
        <li>※使用素材の権利は各提供元に帰属します。</li>
      </ul>
    </div>

    <button class="btn" @click="nextStep">入力内容を確認する</button>
  </div>
</template>

<script setup>
import { ref, reactive, nextTick } from 'vue'
import { useContactStore } from '@/stores/useContactStore'
import { defineEmits } from 'vue'

const form = useContactStore()
const emit = defineEmits(['next'])

// フィールドのラップと入力要素の参照
const nameWrapRef = ref(null)
const emailWrapRef = ref(null)
const phoneWrapRef = ref(null)
const messageWrapRef = ref(null)
const agreeWrapRef = ref(null)

const nameInputRef = ref(null)
const emailInputRef = ref(null)
const phoneInputRef = ref(null)
const messageInputRef = ref(null)
const agreeInputRef = ref(null)

// チェックマーク状態
const fieldOk = reactive({
  name: false,
  email: false,
  phone: false,
  message: false,
  agree: false
})

// 入力時にエラーを消してチェックマークリセット
const onInput = (field) => {
  form.clearError(field);  // ストア側のエラーを削除
  fieldOk[field] = false;  // 入力中はチェックなし
}

// 電話番号入力は数字のみ
const onPhoneInput = (e) => {
  form.phone = e.target.value.replace(/[^0-9]/g, '')  // ハイフン自動削除
  fieldOk.phone = false  // フォームが変更されるとチェックを外す
}

// フォーカスとスクロール
const scrollAndFocus = async (wrapRef, inputRef) => {
  await nextTick()
  wrapRef?.value?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  setTimeout(() => {
    inputRef?.value?.focus()
  }, 300)
}

// 単一フィールドバリデーション（ストアに任せる）
const validateField = (field) => {
  form.validateField(field)  // ストアのvalidateFieldメソッドを呼び出す
  fieldOk[field] = !form.errors[field] && form[field]?.toString().trim().length > 0
}

// 確認ボタン押したときの更新も同じルール
const updateAllFieldOk = () => {
  Object.keys(fieldOk).forEach((key) => {
    const value = form[key]?.toString().trim() || ""
    const isOptional = key === "phone"  // 任意フィールド
    fieldOk[key] = !form.errors[key] && (value !== "" || !isOptional)
  })
}

// 確認ボタン
const nextStep = async () => {
  const isValid = form.validateStep1()

  // バリデーション結果に応じてチェックを更新
  updateAllFieldOk()

  if (!isValid) {
    // バリデーションでエラーがあれば、そのフィールドにスクロール
    if (form.errors.name) scrollAndFocus(nameWrapRef, nameInputRef)
    else if (form.errors.email) scrollAndFocus(emailWrapRef, emailInputRef)
    else if (form.errors.phone) scrollAndFocus(phoneWrapRef, phoneInputRef)
    else if (form.errors.message) scrollAndFocus(messageWrapRef, messageInputRef)
    else if (form.errors.agree) scrollAndFocus(agreeWrapRef, agreeInputRef)
    return
  }

  emit('next')
}
</script>


<style lang="scss" scoped>
@use "@/assets/styles/variables" as vars;
@use "@/assets/styles/mixins" as *;
.app-main {
  min-height: 100%;
}
.contactus {
  @include step-container;
  h2 {
    @include form-ttl;
  }
  .txt {
    @include form-txt;
  }
  dl.dl_form {
    width: 100%;
    margin: 50px auto 0;
    dt {
      margin-top: 20px;
      label {
        @include flex-center;
        gap: 10px;
        font-size: 18px;
      }
    }
    dd {
      position: relative;
      padding: 10px 0 20px;
      .check {
        position: absolute;
        right: 12px;
        top: 42%;
        transform: translateY(-50%);
        color: vars.$green;
        font-size: 20px;
        pointer-events: none;
      }
    }
  }
  span.mark {
    font-size: 14px;
    background: vars.$red;
    color: #fff;
    width: 44px;
    height: 24px;
    @include flex-center;
    justify-content: center;
    &.any {
      background: #999;
    }
  }
  .error {
    color: vars.$red;
    font-size: 14px;
    margin-top: 2px;
    height: 21px;
  }
  input, textarea {
    @include input-style;
    font-size: 18px;
    font-family: vars.$sans;
    &.successInput {
      border-color: vars.$green;
    }
    &.errorInput {
      border-color: vars.$red;
      box-shadow: 0 0 0 1px vars.$red;
    }
  }
  input:-internal-autofill-selected {
    appearance: menulist-button;
    background-color: vars.$white !important;
    color: fieldtext !important;
    background-image: none !important;
  }
  textarea {
    height: 300px;
  } 
  .privacy {
    margin-top: 20px;
    .agree {
      @include flex-center;
      flex-direction: column;
      label {
        @include flex-center;
        gap: 8px;
        margin-top: 10px;
        font-size: 18px;
        cursor: pointer;
        input {
          display: none;
        }
        .box {
          width: 30px;
          height: 30px;
          border: 2px solid #444;
          background-color: vars.$white;
          border-radius: 4px;
          @include flex-center;
          justify-content: center;
          transition: border-color 0.2s;
        }
        input:checked ~ .box {
          border-color: vars.$green;
        }
        .check {
          color: vars.$green;
          font-weight: bold;
          font-size: 18px;
        }
      }
    }
    .ul_note {
      width: 100%;
      margin: 20px auto 0;
      li {
        font-size: 12px;
        line-height: 1.4;
        color: #666;
        + li{
          margin-top: 5px;
        }
      }
      + .ul_note {
        margin-top: 30px;
      }
    }
  }
  button.btn {
    @include btn-style;
  }
  
  @include sp {
    dl.dl_form {
      margin: vw(40) auto 0;
      dt {
        margin-top: vw(10);
        label {
          font-size: vw(16);
        }
      }
      dd {
        padding: vw(5) 0 vw(15);
        .check {
          font-size: vw(20);
        }
      }
    }
    span.mark {
      font-size: vw(12);
      width: vw(40);
      height: vw(20);
    }
    .error {
      font-size: vw(12);
    }
    input, textarea {
      font-size: vw(16);
    }
    textarea {
      height: vw(300);
    }
    .privacy {
      margin-top: vw(10);
      .agree {
        label {
          margin-top: vw(10);
          font-size: vw(16);
          line-height: 1.4;
          .box {
            min-width: vw(20);
            min-height: vw(20);
          }
          .check {
            font-size: vw(18);
          }
        }
      }
      .ul_note {
        width: 100%;
        margin: vw(10) auto 0;
        li {
          font-size: vw(10);
          margin-left: 1em;
          text-indent: -1em;
          + li{
            margin-top: vw(5);
          }
        }
        + .ul_note {
          margin-top: vw(25);
        }
      }
    }
  }
}
</style>


