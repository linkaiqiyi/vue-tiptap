<template>
  <div class="container">
    <div class="options">
      <button @click="handleSetEditable">
        editable: {{ editor?.isEditable }}
      </button>
    </div>

    <div style="display: flex">
      <div style="width: 300px">
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
import StarterKit from '@tiptap/starter-kit'

import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";

import { HocuspocusProvider } from "@hocuspocus/provider";
import { TiptapTransformer } from "@hocuspocus/transformer";
import { IndexeddbPersistence } from "y-indexeddb";
import * as Y from "yjs";

export default {
  components: {
    EditorContent,
  },
  data() {
    return {
      editor: null,
      content: null,
      provider: null,
      indexdbProvider: null,
      extensions: [],
    };
  },
  created() {
    this.extensions = [
      StarterKit.configure({
        history: false
      })
    ];
  },
  mounted() {
    let name, password, room, token;

    try {
      let search = {};
      location.search
        .replace("?", "")
        .split("&")
        .map((item) => {
          let a = item.split("=");
          search[a[0]] = a[1];
        });
      ({ name, password, room, token } = search);
    } catch (e) {
      console.log(e);
    }

    // console.log(name, password, room);

    // if (!name || !password || !room) return;

    const docName = "default";

    let transformer = TiptapTransformer
    transformer.extensions(this.extensions);
    const ydoc = new Y.Doc();

    this.provider = new HocuspocusProvider({
      url: "ws://10.2.129.78:4444",
      name: docName,
      document: ydoc,
      token: "super-secret-token",
      broadcast: false,
      parameters: {
        name,
        password,
        room,
        token,
      },
      onAuthenticated() {
        console.log("auth success");
        this.indexdbProvider = new IndexeddbPersistence(docName, ydoc);

        this.indexdbProvider.on("synced", () => {
          console.log("content from the database is loaded");
        });
      },
      onAuthenticationFailed(params) {
        console.log("auth failed", params);
      },
    });

    this.editor = new Editor({
      editorProps: {
        attributes: {},
      },
      parseOptions: {
        preserveWhitespace: "full",
      },
      extensions: [
        ...this.extensions,
        Collaboration.configure({
          document: this.provider.document,
        }),
        CollaborationCursor.configure({
          provider: this.provider,
          user: {
            name: name,
            color: "#f783ac",
          },
        }),
      ],
      autofocus: false,
      editable: true,
      injectCSS: false,
    });

    window.editorInstance = this.editor;
    window.indexedDBProvide = this.indexdbProvider;
    window.ydoc = ydoc;
  },
  beforeDestroy() {
    this.editor && this.editor.destroy();
    this.provider && this.provider.destroy();
    this.indexdbProvider && this.indexdbProvider.destroy();
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
.editor-content {
  width: 100%;
}
.editor-content .ProseMirror {
  border: 1px solid #000;
  outline: none;
  font-size: 14px;
  min-height: 100px;
  max-height: 500px;
  overflow: scroll;
  padding: 6px 8px;
  white-space: pre-wrap;
}
.editor-content .ProseMirror::-webkit-scrollbar {
  display: none;
}

/* Give a remote user a caret */
.collaboration-cursor__caret {
  position: relative;
  margin-left: -1px;
  margin-right: -1px;
  border-left: 1px solid #0d0d0d;
  border-right: 1px solid #0d0d0d;
  word-break: normal;
  pointer-events: none;
}

/* Render the username above the caret */
.collaboration-cursor__label {
  position: absolute;
  top: -1.4em;
  left: -1px;
  font-size: 12px;
  font-style: normal;
  font-weight: 600;
  line-height: normal;
  user-select: none;
  color: #0d0d0d;
  padding: 0.1rem 0.3rem;
  border-radius: 3px 3px 3px 0;
  white-space: nowrap;
}

#format-json pre {
  outline: 1px solid;
  padding: 5px;
  width: 40vw;
  margin-left: 50px;
  max-height: 500px;
  overflow: scroll;
}

#format-json pre::-webkit-scrollbar {
  display: none;
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
