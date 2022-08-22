<template>
  <div class="container">
    <div class="options">
      <button @click="() => editor?.setEditable(!editor?.isEditable)">
        editable: {{ editor?.isEditable }}
      </button>
      <button @click="() => editor.chain().toggleBold().run()">Bold</button>
      <button @click="() => editor.chain().toggleHeading({level: 3}).run()">head</button>
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
      <textarea
        v-model="commentText"
        cols="30"
        rows="4"
        placeholder="Add new comment..."
        @keypress.enter.stop.prevent="() => setComment()"
      />
      <section class="flex justify-end gap-2">
        <button @click="() => (commentText = '')">Clear</button>
        <button @click="() => deleteComment()">Delete</button>
        <button @click="() => setComment()">Add &nbsp; <kbd> ⏎ </kbd></button>
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

import { UniqueID, Comment, CustomCursor } from "../../extensions/index.js";

import Collaboration, { isChangeOrigin } from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
// import Focus from "@tiptap/extension-focus";

import { HocuspocusProvider } from "@hocuspocus/provider";
import { TiptapTransformer } from "@hocuspocus/transformer";
import { IndexeddbPersistence } from "y-indexeddb";
import * as Y from "yjs";
import { uuidv4 } from "lib0/random.js";

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
      activeCommentsInstance: {},
      showCommentMenu: false,
      showAddCommentSection: false,
      isTextSelected: false,
      allComments: [],
    };
  },
  created() {
    this.extensions = [
      StarterKit.configure({
        history: false,
      }),
      Comment.configure({
        isCommentModeOn: () => true,
      }),
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
      url: "ws://10.2.128.251:4444",
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
          types: ["heading", "paragraph", "comment"],
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
      editable: false,
      injectCSS: false,
      onUpdate: ({ editor }) => {
        this.setCurrentComment(editor);
      },
      onSelectionUpdate: ({ editor }) => {
        this.setCurrentComment(editor);
        this.isTextSelected = !!editor.state.selection.content().size;
      },
      onCreate: ({ editor }) => {
        this.findCommentsAndStoreValues(editor);
      },
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
        const parsedComment = JSON.parse(
          editor.getAttributes("comment").comment
        );
        parsedComment.comments =
          typeof parsedComment.comments === "string"
            ? JSON.parse(parsedComment.comments)
            : parsedComment.comments;
        this.activeCommentsInstance = parsedComment;
      } else {
        setTimeout(() => (this.showCommentMenu = false), 50);
        this.activeCommentsInstance = {};
      }
    },
    deleteComment() {
      this.editor.chain().unsetComment().run();
    },
    setComment(value) {
      const localVal = value || this.commentText;

      if (!localVal.trim().length) return;

      const activeCommentsInstance = JSON.parse(
        JSON.stringify(this.activeCommentsInstance)
      );

      const commentsArray =
        typeof activeCommentsInstance.comments === "string"
          ? JSON.parse(activeCommentsInstance.comments)
          : activeCommentsInstance.comments;

      if (commentsArray) {
        commentsArray.push({
          userName: this.userInfo.name,
          time: Date.now(),
          content: localVal,
        });

        const commentWithUuid = JSON.stringify({
          uuid: activeCommentsInstance.uuid || uuidv4(),
          comments: commentsArray,
        });

        this.editor.chain().setComment(commentWithUuid).run();
      } else {
        const commentWithUuid = JSON.stringify({
          uuid: uuidv4(),
          comments: [
            {
              userName: this.userInfo.name,
              time: Date.now(),
              content: localVal,
            },
          ],
        });
        this.editor.chain().setComment(commentWithUuid).run();
      }

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
