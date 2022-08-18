<template>
  <div id="app">
    <TiptapEditor />
  </div>
</template>

<script>
import TiptapEditor from "./components/TiptapEditor/index.vue";
export default {
  name: "App",
  components: {
    TiptapEditor,
  },
};
</script>

<style>
* {
  margin: 0;
  padding: 0;
  list-style: none;
}
html,
body {
  height: 100vh;
  width: 100vw;
}
#app {
  display: flex;
  justify-content: center;
}
</style>
