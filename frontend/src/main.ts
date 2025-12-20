import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import { useAuthStore } from './stores/auth';
import './assets/css/main.css';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);

// Inicializar auth store desde localStorage
const authStore = useAuthStore();
authStore.init();

app.mount('#app');

