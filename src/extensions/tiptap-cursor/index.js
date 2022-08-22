import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "prosemirror-state";
import { DecorationSet, Decoration } from "prosemirror-view";

const CustomCursorKey = "custom-cursor";

const createCursor = () => {
  const cursor = document.createElement("span");
  cursor.setAttribute("style", `border-right: 1px solid #000; margin-right: -1px; position: relative; word-break: normal; pointer-events: none;`);
  return cursor;
};

const CustomCursor = Extension.create({
  name: CustomCursorKey,
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey(CustomCursorKey),
        state: {
          init(...params) {
            const [, state] = params;
            return DecorationSet.create(state.doc, []);
          },
          apply: (...params) => {
            const { isEditable } = this.editor;
            const [tr, , , newState] = params;
            let from = tr.curSelection.from;
            // 不能编辑 ｜ 鼠标时间 ｜ 选择范围为空
            if (!isEditable && tr.meta.pointer && newState.selection.empty) {
              return DecorationSet.create(newState.doc, [
                Decoration.widget(from, () => createCursor(), { side: 100 }),
              ]);
            }
            return DecorationSet.create(newState.doc, []);
          },
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
        },
      }),
    ];
  },
});

export { CustomCursor, CustomCursor as default };
