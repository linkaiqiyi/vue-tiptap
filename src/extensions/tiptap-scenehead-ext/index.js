import { Extension } from "@tiptap/core";

// 左边目录栏 id
// {uid, pos, desc, count, content, type}

const SceneheadOrAct = Extension.create({
  name: "scenehead-act",
  addOptions() {
    return {
      types: ["paragraph"],
      attrs: ["scenehead", "act", ""],
      editor: () => null,
      storageTimer: null,
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          dataType: {
            default: "",
            parseHTML: (element) => {
              if (element && element.attrs) {
                return element.attrs["data-type"];
              }
              return "";
            },
            renderHTML: (attributes) => {
              if (!attributes) return {};
              let { uid, dataType } = attributes;
              let storage = this.storage;
              if (storage.has(uid)) {
                if (!dataType) {
                  storage.delete(uid);
                  this.options.editor().commands.updateTableOfContent();
                }
              } else {
                if (dataType) {
                  storage.set(uid, { type: dataType });
                  this.options.editor().commands.updateTableOfContent();
                }
              }
              if (
                !attributes ||
                !attributes.dataType ||
                !this.options.attrs.includes(attributes.dataType)
              ) {
                return {};
              }

              return { "data-type": attributes.dataType };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setDataType:
        (attributes) =>
        ({ commands }) => {
          if (!this.options.attrs.includes(attributes)) {
            return false;
          }
          return commands.updateAttributes("paragraph", {
            dataType: attributes,
          });
        },
      unsetDataType:
        () =>
        ({ commands }) => {
          return commands.resetAttributes("paragraph", "dataType");
        },
      toggleDataType:
        (attributes) =>
        ({ commands }) => {
          if (this.editor.isActive({ dataType: attributes })) {
            return commands.unsetDataType();
          } else {
            return commands.setDataType(attributes);
          }
        },
      updateTableOfContent:
        () =>
        ({ editor }) => {
          if (this.options.storageTimer) {
            clearTimeout(this.options.storageTimer);
            this.options.storageTimer = null;
          }
          this.options.storageTimer = setTimeout(() => {
            let infos = {
              scenehead: null,
              act: null,
            };
            editor.state.doc.descendants((node, pos) => {
              let { dataType, uid } = node.attrs;
              if (dataType && this.options.attrs.includes(dataType)) {
                infos[dataType] = this.storage.get(uid);
                if (infos[dataType]) {
                  infos[dataType].pos = pos;
                  infos[dataType].content = node.textContent;
                  infos[dataType].count = 0;
                } else {
                  this.storage.set(uid, {
                    pos,
                    content: node.textContent,
                    count: 0,
                  });
                  infos[dataType] = this.storage.get(uid);
                }
              } else if (node.type.isText) {
                let len = node.textContent.length;
                if (infos.scenehead) {
                  infos.scenehead.count += len;
                }
                if (infos.act) {
                  infos.act.count += len;
                }
              }
            });
            clearTimeout(this.options.storageTimer);
            this.options.storageTimer = null;
          }, 200);
        },
    };
  },
  addKeyboardShortcuts() {
    return {
      Tab: () => this.editor.commands.toggleDataType("scenehead"),
    };
  },
  addStorage() {
    return new Map();
  },
  onUpdate() {
    this.options.editor().commands.updateTableOfContent();
  },
  onDestroy() {
    this.storage.clear();
  },
});

export { SceneheadOrAct, SceneheadOrAct as default };
