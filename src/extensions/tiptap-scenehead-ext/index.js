import { Extension } from "@tiptap/core";

const SceneheadOrAct = Extension.create({
  name: "scenehead-act",
  addOptions() {
    return {
      types: ["paragraph"],
      attrs: ["scenehead", "act"],
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          dataType: {
            parseHTML: (element) =>
              element?.attrs?.["dataType"] ??
              (element?.getAttribute("data-type") || null),
            renderHTML: (attributes) => {
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
    };
  },
  addKeyboardShortcuts() {
    return {
      // Tab: () => this.editor.commands.toggleDataType("scenehead"), // 通过对 dom 进行监听事件实现 (不能编辑的时候该方法失效)
    };
  },
});

export { SceneheadOrAct, SceneheadOrAct as default };
