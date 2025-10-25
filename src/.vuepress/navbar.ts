import { navbar } from "vuepress-theme-hope";

export default navbar([
  "/",
  "/qianyan",
  "/jieshao/",
  "/zhiling/",
  {
    text: "注意事项",
    icon: "/splotch.svg",
    link: "/zhuyi/",
  },
  {
    text: "关于",
    icon: "/info.svg",
    link: "/about/",
  }

]);
