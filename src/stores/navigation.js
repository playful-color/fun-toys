import { defineStore } from 'pinia'

export const useNavigationStore = defineStore('navigation', {
  state: () => ({
    items: [
      { name: 'とっぷ', path: '/' },
      { name: 'わたし', path: '/about' },
      { name: 'おといあわせ', path: '/contact' },
    ]
  })
})
