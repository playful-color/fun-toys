import { defineStore } from 'pinia';

// ナビゲーションアイテム型
interface NavItem {
  name: string;
  path: string;
}

interface NavigationState {
  items: NavItem[];
}

export const useNavigationStore = defineStore('navigation', {
  state: (): NavigationState => ({
    items: [
      { name: 'とっぷ', path: '/' },
      { name: 'わたし', path: '/about' },
      { name: 'おといあわせ', path: '/contact' },
    ],
  }),
});
