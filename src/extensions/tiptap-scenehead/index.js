/**
 * Scenehead
 */

import { Node, mergeAttributes } from "@tiptap/core";

const Scenehead = Node.create({
  name: "scenehead",
  addOptions() {
    return {
      HTMLAttributes: {
        "data-scenehead": true,
      },
    };
  },
  content: "block",
  group: "block",
  defining: true,
  parseHTML() {
    return [{ tag: "p[data-scenehead]" }];
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
      setScenehead:
        () =>
        ({ commands }) => {
          return commands.wrapIn(this.name);
        },
      toggleScenehead:
        () =>
        ({ commands }) => {
          return commands.toggleWrap(this.name);
        },
      unsetScenehead:
        () =>
        ({ commands }) => {
          return commands.lift(this.name);
        },
    };
  },
  addKeyboardShortcuts() {
    return {
      Tab: () => this.editor.commands.toggleScenehead(),
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: ["scenehead"],
        attributes: {
          id: {
            default: null,
          },
        },
      },
    ];
  },
});

export { Scenehead, Scenehead as default };
