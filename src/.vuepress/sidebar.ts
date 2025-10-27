import { sidebar } from "vuepress-theme-hope";

export default sidebar({
  "/": [
    "",
    "/qianyan",
    {
      text: "介绍",
      icon: "/assets/icon/sheet-plastic.svg",
      prefix: "jieshao/",
      link: "jieshao/",
      collapsible: true,
      expanded: true,
      children: "structure",
    },
    {
      text: "帮助",
      icon: "/assets/icon/book.svg",
      prefix: "zhiling/",
      link: "zhiling/",
      collapsible: true,
      children: [
        {
          text: "菜单帮助help",
          icon: "/assets/icon/book.svg",
          prefix: "help",
          link: "help",
          collapsible: true,
        },
        {
          text: "游戏",
          icon: "/assets/icon/gamepad.svg",
          prefix: "acg/",
          link: "acg/",
          collapsible: true,
          children: [
            // ACG 二次元游戏
            {
              text: "ACG Games",
              icon: "/assets/icon/heart.svg",
              collapsible: true,
              children: [
                "genshin",
                "sr",
                "juequ0",
                "ba",
                "ark",
                "limbus",
                "mingchao",
                "guangyu",
              ]
            },
            // FPS 射击游戏
            {
              text: "FPS",
              icon: "/assets/icon/superpowers.svg",
              collapsible: true,
              children: [
                "CSGO",
                "DeltaForce",
                "bf",
                "l4d2",
              ]
            },
            // 战争游戏
            {
              text: "War Games",
              icon: "/assets/icon/gamepad.svg",
              collapsible: true,
              children: [
                "wot",
                "wws",
              ]
            },
          ],
        },
        {
          text: "音游",
          icon: "/assets/icon/gamepad.svg",
          prefix: "yinyou/",
          link: "yinyou/",
          collapsible: true,
          children: [
            {
              text: "Arcaea",
              icon: "https://drive.nekodayo.top/raw/nekodocs/image/arc.jpg",
              prefix: "arc/",
              link: "arc/",
              collapsible: true,
              children: [
                "b30",
                "arc"
              ],
            },
            {
              text: "Project Sekai",
              icon: "https://drive.nekodayo.top/raw/nekodocs/image/pjsk.jpg",
              prefix: "pjsk/",
              link: "pjsk/",
              collapsible: true,
              children: [
                "uni",
                "haruki",
                "pjsk"
              ],
            },
            "pgr",
            "BangDream",
            "osu",
            "vs",
            "chu",
            "maimai",
            "bs",
          ],
        },
        {
          text: "实用",
          icon: "/assets/icon/thumbs-up.svg",
          prefix: "shiyong/",
          link: "shiyong/",
          collapsible: true,
          children: [
            // 信息查询
            {
              text: "信息查询",
              icon: "/assets/icon/eye.svg",
              collapsible: true,
              children: [
                "train",
                "Multi-Source Daily",
                "status",
                "price",
              ]
            },
            // 图片工具
            {
              text: "图片工具",
              icon: "/assets/icon/image.svg",
              collapsible: true,
              children: [
                "imga",
                "imgts",
                "imgS",
                "miragetank",
              ]
            },
            // 媒体解析
            {
              text: "媒体解析",
              icon: "/assets/icon/share.svg",
              collapsible: true,
              children: [
                "music",
                "bw",
                "parser",
                "githubcard",
              ]
            },
            // 学习工具
            {
              text: "学习工具",
              icon: "/assets/icon/book.svg",
              collapsible: true,
              children: [
                "code",
                "english",
              ]
            },
            // Bot 管理
            {
              text: "其他工具",
              icon: "/assets/icon/robot.svg",
              collapsible: true,
              children: [
                "wsk",
                "disconnect",
                "withdraw",
              ]
            },
          ],
        },
        {
          text: "娱乐",
          icon: "/assets/icon/face-laugh-squint.svg",
          prefix: "yule/",
          link: "yule/",
          collapsible: true,
          children: [
            // 图片相关
            {
              text: "图片功能",
              icon: "/assets/icon/image.svg",
              collapsible: true,
              children: [
                "bqb",
                "bqbmaker",
                "image_collection",
                "dinshi",
                "bamotalk",
              ]
            },
            // 文字生成
            {
              text: "文字生成",
              icon: "/assets/icon/file.svg",
              collapsible: true,
              children: [
                "KFCcrazythursdayvme50",
                "yiyan",
                "jitang",
                "cxh",
                "fabing",
                "oooo",
              ]
            },
           // 互动娱乐（合并）
           {
             text: "互动娱乐",
             icon: "/assets/icon/face-laugh-squint.svg",
             collapsible: true,
             children: [
               "qiandao",
               "todaywife",
               "todaycatgirl",
               "jrrp",
               "roll",
               "whateat",
               "zhanbu",
               "abook",
               "otto",
               "homo",
               "Atri",
               "emoji",
               "wordle",
               "megumin",
               "mypower",
               "bottle",
               "ciyun",
               "quote",
               "Poke-Plugin",
               "jq",
             ]
           },
          ],
        },
        // AI 功能暂时隐藏，待添加内容后再显示
        // {
        //   text: "AI",
        //   icon: "robot",
        //   prefix: "AI/",
        //   link: "AI/",
        //   collapsible: true,
        //   children: [],
        // },
      ],
    },
    {
      text: "注意事项",
      icon: "/assets/icon/splotch.svg",
      prefix: "zhuyi/",
      link: "zhuyi/",
      children: "structure",
    },
    {
      text: "关于",
      icon: "/assets/icon/info.svg",
      prefix: "about/",
      link: "about/",
      children: [
        "me",
        "fankui",
      ],
    },
    "/qunliao",
    "/draw",
    "/zanzhu",
    "/thankU",
  ],
});

