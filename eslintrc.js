module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
  },
  extends: [
    'plugin:vue/vue3-recommended', // Vue 3 向け推奨設定
    'eslint:recommended',
    'plugin:prettier/recommended', // Prettier と競合しない
  ],
  rules: {
    semi: ['error', 'always'], // セミコロン必須
    quotes: ['error', 'single'], // シングルクォート
  },
};
