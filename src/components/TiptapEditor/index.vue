<template>
  <div class="container">
    <div class="options">
      <button @click="handleSetEditable">
        editable: {{ editor?.isEditable }}
      </button>
    </div>

    <div style="display: flex">
      <div style="width: 500px">
        <editor-content class="editor-content" :editor="editor" />
      </div>

      <div id="format-json">
        <pre v-html="syntaxHighlight(editor?.getJSON() || null)"></pre>
      </div>
    </div>
  </div>
</template>

<script>
// comment / 协作
import { Editor, EditorContent } from "@tiptap/vue-2";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import Heading from "@tiptap/extension-heading"; // 标题
import Bold from "@tiptap/extension-bold"; // 粗体
import Italic from "@tiptap/extension-italic"; // 斜体
import Strike from "@tiptap/extension-strike"; // 删除线
import Blockquote from "@tiptap/extension-blockquote"; // 引用
import UniqueID from "@tiptap/extension-unique-id"; // 唯一 id

export default {
  components: {
    EditorContent,
  },
  data() {
    return {
      editor: null,
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "2.海边 傍晚 外" }],
          },
          {
            type: "paragraph",
            content: [{ type: "text", text: "人：孩童若干" }],
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "△镜头随着飞翔的海鸟掠过海面直至岸边，落在一群嬉闹的孩童身上。落日余晖下，尽是一片安逸之景。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              { type: "text", text: "△特写，一只缓慢爬行的螃蟹入画，被一幼童" },
              {
                type: "text",
                marks: [{ type: "bold" }],
                text: "捉住，幼童拿起螃蟹想向伙伴",
              },
              { type: "text", text: "炫耀，但刚一回头，脸上的笑容凝固。" },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "△幼童的瞳孔中映射出红色惊涛骇浪，顺着孩童的目光，我们看到辽阔浩渺的海面上掀起红色巨浪向陆地奔赴而来，巨浪燃着赤焰，所到之处皆成一片火海。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "△海中无数生物被冥海吞没，海面骤然跃起一庞然大物，竟是一燃烧的鲸鱼，顷刻间便被烧成灰烬。空中海鸟也无一幸免，群鸟燃烧，发出凄惨鸣叫，纷纷坠入冥海。",
              },
            ],
          },
        ],
      },
    };
  },
  mounted() {
    this.editor = new Editor({
      content: this.content,
      editorProps: {
        attributes: {},
      },
      parseOptions: {
        preserveWhitespace: "full",
      },
      extensions: [
        Document,
        Paragraph,
        Text,
        Bold,
        Italic,
        Strike,
        Blockquote,
        UniqueID,
        Heading.configure({
          levels: [1, 2, 3],
        }),
      ],
      onUpdate: () => {},
      autofocus: false,
      editable: true,
      injectCSS: false,
    });
  },
  beforeDestroy() {
    this.editor.destroy();
  },
  methods: {
    handleSetEditable() {
      let editable = this.editor.isEditable;
      this.editor.setEditable(!editable);
    },
    syntaxHighlight(json) {
      if (typeof json !== "string") {
        json = JSON.stringify(json, undefined, 2);
      } else {
        json = JSON.stringify(JSON.parse(json), undefined, 2);
      }
      json = json.replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">");
      return json.replace(
        /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
        function (match) {
          let cls = "json-number";
          if (/^"/.test(match)) {
            if (/:$/.test(match)) {
              cls = "json-key";
            } else {
              cls = "json-string";
            }
          } else if (/true|false/.test(match)) {
            cls = "json-boolean";
          } else if (/null/.test(match)) {
            cls = "null";
          }
          return '<span class="' + cls + '">' + match + "</span>";
        }
      );
    },
  },
};
</script>

<style>
.container {
  margin: 16px;
}
.options {
  display: flex;
  margin-bottom: 10px;
}
.options button {
  margin-left: 8px;
}
.editor-content .ProseMirror {
  border: 1px solid #000;
  outline: none;
  font-size: 14px;
  min-height: 100%;
  width: 500px;
  max-height: 500px;
  overflow: scroll;
  padding: 6px 8px;
  white-space: pre-wrap;
}
.is-active {
  color: red;
}

.head {
  background: rgb(247, 151, 27);
}

#format-json pre {
  outline: 1px solid;
  padding: 5px;
  width: 500px;
  margin-left: 50px;
  max-height: 500px;
  overflow: scroll;
}

.json-string {
  color: #c62628;
}
.json-number,
.json-boolean {
  color: #1f1bcc;
}
.json-null {
  color: #818181;
}
.json-key {
  color: #861d8f;
}
</style>
