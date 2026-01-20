import { createApp } from 'vue'

import { createPinia } from 'pinia'
import { library } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faBars, faXmark, faPaintbrush, faEraser, faUndo, faRedo, faDownload, faPlus, faMinus, faChevronUp, faChevronDown, faPalette, faDice } from '@fortawesome/free-solid-svg-icons'

import './assets/styles/main.scss'
import App from './App.vue'
import router from './router'

library.add(faBars, faXmark, faPaintbrush, faEraser, faUndo, faRedo, faDownload, faPlus, faMinus, faChevronUp, faChevronDown, faPalette, faDice) 

const app = createApp(App)
app
  .use(createPinia())
  .use(router)
  .component('FontAwesomeIcon', FontAwesomeIcon)
  .mount('#app')

