import { defineStore } from 'pinia';

// エラーオブジェクトの型
type ContactErrors = Partial<{
  name: string;
  email: string;
  phone: string;
  message: string;
  agree: string;
}>;

export const useContactStore = defineStore('contact', {
  state: () => ({
    name: '' as string,
    email: '' as string,
    phone: '' as string,
    message: '' as string,
    agree: false as boolean,
    errors: {} as ContactErrors,
  }),
  actions: {
    // エラー削除
    clearError(field: keyof ContactErrors) {
      if (this.errors[field]) {
        delete this.errors[field];
      }
    },

    // バリデーションステップ1
    validateStep1(): boolean {
      this.errors = {}; // エラーをリセット

      // 各フィールドの必須チェック
      if (!this.name) this.errors.name = '*名前は必須です';
      if (!this.email) this.errors.email = '*メールは必須です';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email))
        this.errors.email = '*メールアドレスの形式が正しくありません';

      // 電話番号（任意）のバリデーション
      if (this.phone) {
        const digits = this.phone.replace(/\D/g, '');
        if (!(digits.length === 10 || digits.length === 11)) {
          this.errors.phone = '*電話番号の形式が正しくありません';
        }
      }

      if (!this.message) this.errors.message = '*メッセージは必須です';
      if (!this.agree)
        this.errors.agree = '*プライバシーポリシーに同意してください';

      // エラーがない場合、trueを返す
      return Object.keys(this.errors).length === 0;
    },

    // 単一フィールドバリデーション
    validateField(field: keyof ContactErrors) {
      delete this.errors[field]; // エラー削除

      // フィールドのバリデーション
      if (field === 'email' && this.email) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email)) {
          this.errors.email = '*メールアドレスの形式が正しくありません';
        }
      }

      if (field === 'phone' && this.phone) {
        const digits = this.phone.replace(/\D/g, '');
        if (!(digits.length === 10 || digits.length === 11)) {
          this.errors.phone = '*電話番号の形式が正しくありません';
        }
      }
    },

    // フォームのリセット
    reset() {
      this.name = '';
      this.email = '';
      this.phone = '';
      this.message = '';
      this.agree = false;
      this.errors = {};
    },
  },
});
