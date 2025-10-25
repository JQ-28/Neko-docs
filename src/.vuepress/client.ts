import { defineClientConfig } from "vuepress/client";
import QQChat from "./components/QQChat.vue";
import QQMessage from "./components/QQMessage.vue";
import QQVoice from "./components/QQVoice.vue";
import QQImage from "./components/QQImage.vue";

export default defineClientConfig({
  enhance: ({ app }) => {
    app.component("QQChat", QQChat);
    app.component("QQMessage", QQMessage);
    app.component("QQVoice", QQVoice);
    app.component("QQImage", QQImage);
  },
});

