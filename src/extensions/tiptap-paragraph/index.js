import Paragraph from "@tiptap/extension-paragraph";
// import { nodePasteRule } from "@tiptap/core";

const CustomParagraph = Paragraph.extend({
    addPasteRules() {
        return [
            // nodePasteRule({
            //     find: (text) => {
            //         console.log(text);
            //         return [1212]
            //     },
            //     getAttributes: {},
            //     type: this.type
            // })
        ]
    }
});

export { CustomParagraph, CustomParagraph as default };
