import { Extension } from "@tiptap/core";

const SceneheadOrAct = Extension.create({
  name: "scenehead-act",
  addOptions() {
    return {
      types: ["paragraph"],
      attrs: ["scenehead", "act"]
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          dataType: {
            parseHTML: (element) => {
              if (element && element.attrs) {
                return element.attrs["data-type"];
              }
            },
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
        }
    };
  },
  addKeyboardShortcuts() {
    return {
      Tab: () => this.editor.commands.toggleDataType("scenehead"),
    };
  }
});

export { SceneheadOrAct, SceneheadOrAct as default };
