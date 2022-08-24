<template>
  <div class="container">
    <div class="options">
      <button @click="() => editor?.setEditable(!editor?.isEditable)">
        editable: {{ editor?.isEditable }}
      </button>
      <button @click="() => editor.chain().toggleBold().run()">Bold</button>
      <button @click="() => editor.chain().toggleHeading({ level: 3 }).run()">
        head
      </button>
    </div>

    <BubbleMenu
      v-if="editor"
      :editor="editor"
      :should-show="
        ({ editor }) =>
          !editor.state.selection.empty || editor.isActive('comment')
      "
      class="bubble-menu"
    >
      <div style="margin-bottom: 10px; font-size: 10px">
        <label
          style="display: block"
          v-for="item in activeCommentsInstance"
          :key="item.uuid"
        >
          <input
            type="radio"
            v-model="selectedCommentUuid"
            :value="item.uuid"
          />
          {{ item.uuid }}
        </label>
      </div>
      <hr />
      <textarea
        v-model="commentText"
        cols="30"
        rows="4"
        placeholder="Add new comment..."
        @keypress.enter.stop.prevent="() => handleSetComment()"
      />
      <section class="flex justify-end gap-2">
        <button @click="() => (commentText = '')">Clear</button>
        <button @click="() => deleteComment()">Delete</button>
        <button @click="() => handleSetComment()">
          Add &nbsp; <kbd> ⏎ </kbd>
        </button>
      </section>
    </BubbleMenu>

    <div style="display: flex">
      <div style="width: 500px">
        <editor-content class="editor-content" :editor="editor" />
      </div>

      <div id="format-json">
        <pre
          style="height: 50%"
          v-html="syntaxHighlight(editor?.getJSON() || null)"
        ></pre>
        <pre v-html="syntaxHighlight(activeCommentsInstance || null)"></pre>
      </div>
    </div>
  </div>
</template>

<script>
// comment / 协作
import { Editor, EditorContent, BubbleMenu } from "@tiptap/vue-2";
import StarterKit from "@tiptap/starter-kit";
// import { findChildrenInRange } from "@tiptap/core";
import Collaboration, { isChangeOrigin } from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
// import Focus from "@tiptap/extension-focus";

import { HocuspocusProvider } from "@hocuspocus/provider";
import { TiptapTransformer } from "@hocuspocus/transformer";
import { IndexeddbPersistence } from "y-indexeddb";
import * as Y from "yjs";

import { uuidv4 } from "lib0/random.js";

import { UniqueID, Comment, CustomCursor } from "../../extensions/index.js";

export default {
  components: {
    EditorContent,
    BubbleMenu,
  },
  data() {
    return {
      editor: null,
      content: null,
      provider: null,
      indexdbProvider: null,
      userInfo: {
        name: "",
        password: "",
        room: "",
        token: "",
      },
      extensions: [],
      commentText: "",
      selectedCommentUuid: "",
      activeCommentsInstance: [],
      showCommentMenu: false,
      showAddCommentSection: false,
      isTextSelected: false,
      allComments: [],
    };
  },
  watch: {
    showCommentMenu(val) {
      if (!val) {
        this.selectedCommentUuid = "";
      }
    },
  },
  created() {
    this.extensions = [
      StarterKit.configure({
        history: false,
      }),
      Comment,
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
      this.userInfo = {
        name,
        password,
        room,
        token,
      };
    } catch (e) {
      console.log(e);
    }
    const docName = "default";

    let transformer = TiptapTransformer;
    transformer.extensions(this.extensions);

    const ydoc = new Y.Doc();
    ydoc.transformer = transformer;

    this.indexdbProvider = new IndexeddbPersistence(docName, ydoc);

    this.indexdbProvider.on("synced", (_this) => {
      console.log(
        "content from the database is loaded",
        transformer.fromYdoc(_this.doc)
      );
    });

    this.provider = new HocuspocusProvider({
      url: "ws://127.0.0.1:4444",
      name: docName,
      document: ydoc,
      token: "super-secret-token",
      broadcast: false,
      parameters: this.userInfo,
      onAuthenticated() {
        console.log("auth success");
      },
      onAuthenticationFailed(params) {
        console.log("auth failed", params);
      },
      onConnect() {
        console.log("connect");
      },
      onDisconnect() {
        console.log("disconnect");
        this.provider && this.provider.destroy();
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
        UniqueID.configure({
          attributeName: "uid",
          types: ["heading", "paragraph"],
          filterTransaction: (transaction) => !isChangeOrigin(transaction),
        }),
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
        CustomCursor.configure({
          className: "has-focus",
        }),
      ],
      autofocus: false,
      editable: true,
      injectCSS: false,
      onUpdate: ({ editor }) => {
        this.setCurrentComment(editor);
      },
      onSelectionUpdate: ({ editor }) => {
        this.setCurrentComment(editor);
        this.isTextSelected = !!editor.state.selection.content().size;
      },
      // onCreate: ({ editor }) => {
      //   this.findCommentsAndStoreValues(editor);
      // },
    });

    window.editorInstance = this.editor;
    window.indexedDBProvide = this.indexdbProvider;
    window.ydoc = ydoc;
    window.deleteComment = this.deleteComment;
  },
  beforeDestroy() {
    this.editor && this.editor.destroy();
    this.provider && this.provider.destroy();
    this.indexdbProvider && this.indexdbProvider.destroy();
  },
  methods: {
    findCommentsAndStoreValues(editorInstance) {
      const editor = editorInstance || this.editor;

      const tempComments = [];

      editor.state.doc.descendants((node, pos) => {
        const { marks } = node;

        let pastCommentUuid = "";
        marks.forEach((mark) => {
          if (mark.type.name === "comment") {
            const markComments = mark.attrs.comment;

            const jsonComments = markComments ? JSON.parse(markComments) : null;

            if (
              jsonComments !== null &&
              pastCommentUuid !== jsonComments.uuid
            ) {
              pastCommentUuid = jsonComments.uuid;
              tempComments.push({
                node,
                jsonComments,
                from: pos,
                to: pos + (node.text?.length || 0),
                text: node.text,
              });
            }
          }
        });

        this.allComments.splice(0, this.allComments.length, ...tempComments);
      });
    },
    setCurrentComment(editorInstance) {
      const editor = editorInstance || this.editor;
      if (editor.isActive("comment")) {
        setTimeout(() => (this.showCommentMenu = true), 50);
        this.showAddCommentSection = !editor.state.selection.empty;
        let parsedComment = JSON.parse(editor.getAttributes("comment").comment);

        if (parsedComment && Array.isArray(parsedComment)) {
          this.activeCommentsInstance = parsedComment;
          this.selectedCommentUuid = this.activeCommentsInstance[0].uuid;
        }
      } else {
        setTimeout(() => (this.showCommentMenu = false), 50);
        this.activeCommentsInstance = [];
        this.selectedCommentUuid = "";
      }
    },
    deleteComment(uuid = this.selectedCommentUuid, parentUuid = "") {
      this.editor.chain().deleteComment({ uuid, parentUuid }).run();
    },
    handleSetComment() {
      this.setComment();
    },
    /**
     * 在这个方法中不考虑如何进行 comment 的添加和合并
     * 只考虑生成 本次新增的 comment 结构 和 传递一个 uuid，传到 mergeComment 命令中进行合并
     * uuid: 如果有选中的 uuid 则表示是在已有的 comment 下进行追加，传选中的uuid
     *       如果没有选中的 uuid 则表示为新增 comment，使用 uuidv4 生成一个 uuid，并设置 isAdd 为 true 表示当前为新增
     */
    setComment(value) {
      /**
       * comment 数据结构
      [
        {
          uuid,
          comments: [
            {
              uuid, content, userName, time
            }
          ]
        }
      ]
       */
      const localVal = value || this.commentText;

      if (!localVal.trim().length) return;

      const commentInfo = {
        uuid: uuidv4(),
        userName: this.userInfo.name,
        time: Date.now(),
        content: localVal,
      };

      this.editor
        .chain()
        .mergeComment({
          comment: commentInfo,
          uuid: this.selectedCommentUuid || uuidv4(),
          isAdd: !this.selectedCommentUuid,
        })
        .run();

      setTimeout(() => {
        this.commentText = "";
      }, 50);
    },
    handleSetEditable() {
      this.editor.setEditable(!this.editor.isEditable);
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

<style scoped>
.bubble-menu {
  border: 1px dashed gray;
  backdrop-filter: blur(16px);
  padding: 8px;
  border-radius: 8px;
}
</style>

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
.editor-content .ProseMirror span[data-comment] {
  background: rgba(250, 250, 0, 0.25);
  border-bottom: 2px rgb(255, 183, 0) solid;
  user-select: all;
  padding: 0 2px 0 2px;
  border-radius: 4px;
  cursor: pointer;
}

.editor-content .ProseMirror::-webkit-scrollbar {
  display: none;
}

.has-focus {
  border-radius: 3px;
  box-shadow: 0 0 0 3px #68cef8;
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
  max-height: 250px;
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
