import {
  createRouter,
  createWebHashHistory,
  type RouteRecordRaw,
} from 'vue-router';

import Home from '@/pages/Home.vue';
import About from '@/pages/About.vue';
import Contact from '@/pages/Contact.vue';

// ルート定義
const routes: RouteRecordRaw[] = [
  { path: '/', component: Home },
  { path: '/about', component: About },
  { path: '/contact', component: Contact },
];

// ルーター作成
const router = createRouter({
  history: createWebHashHistory('/fun-toys/'),
  routes,
});

export default router;
