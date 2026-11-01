import { createApp } from 'vue';
import { createPinia } from 'pinia';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import '@/styles/index.scss';
import App from './App.vue';
import router from './router';
import { vHas } from '@/directives/vHas';
import { i18n } from '@/i18n';

const app = createApp(App);
app.use(createPinia());
app.use(i18n);
app.use(router);
app.use(ElementPlus);
app.directive('has', vHas);
app.mount('#app');
