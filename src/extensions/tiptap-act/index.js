/**
 * Act
 */

import { Node, mergeAttributes } from "@tiptap/core";

const Act = Node.create({
  name: "act",
  addOptions() {
    return {
      HTMLAttributes: {
        "data-act": true,
      },
    };
  },
  content: "block",
  group: "block",
  defining: true,
  parseHTML() {
    return [{ tag: "p" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "p",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      0,
    ];
  },
  addCommands() {
    return {
      setAct:
        () =>
        ({ commands }) => {
          return commands.wrapIn(this.name);
        },
      toggleAct:
        () =>
        ({ commands }) => {
          return commands.toggleWrap(this.name);
        },
      unsetAct:
        () =>
        ({ commands }) => {
          return commands.lift(this.name);
        },
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: ["act"],
        attributes: {
          id: {
            default: null,
          },
        },
      },
    ];
  },
});

export { Act, Act as default };
