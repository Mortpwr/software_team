import { createApp } from "vue";
import App from "./App.vue";
import { configureApi } from "./api/client.js";
import "../styles.css";

if (import.meta.env.PROD && import.meta.env.VITE_API_BASE_URL) {
  configureApi({ mode: "remote", baseUrl: import.meta.env.VITE_API_BASE_URL });
}

createApp(App).mount("#app");
