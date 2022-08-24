module.exports = {
  pwa: {
    name: "vue-tiptap",
    themeColor: "#00CF87",
    msTileColor: "#000000",
    appleMobileWebAppCapable: "yes",
    appleMobileWebAppStatusBarStyle: "black",
    workboxPluginMode: "InjectManifest",
    workboxOptions: {
      // 自定义的service worker文件的位置
      swSrc: "src/registerServiceWorker.js",
      // ...other Workbox options...
    },
  },
};
