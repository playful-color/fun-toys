// src/firebase/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Firebase 設定（Firebase コンソール → 設定 → SDK設定のコピー）
const firebaseConfig = {
  apiKey: "AIzaSyByNcD9mwI-hQFWbOu6DvTChFEgM8oTHD0",
  authDomain: "contact-13c39.firebaseapp.com",
  projectId: "contact-13c39",
  storageBucket: "contact-13c39.appspot.com",
  messagingSenderId: "136486562512",
  appId: "1:136486562512:web:093864f48faf28cd1c0cd5"
};

// 初期化
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
