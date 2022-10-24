/**
 * Act
 */

 import { Node, mergeAttributes } from '@tiptap/core';

 const Act = Node.create({
     name: 'act',
     addOptions() {
         return {
             HTMLAttributes: {
                 'data-act': true
             },
         };
     },
     content: 'block',
     group: 'block',
     defining: true,
     parseHTML() {
         return [
             { tag: 'p' },
         ];
     },
     renderHTML({ HTMLAttributes }) {
         return ['p', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
     },
     addCommands() {
         return {
             setAct: () => ({ commands }) => {
                 return commands.wrapIn(this.name);
             },
             toggleAct: () => ({ commands }) => {
                 return commands.updateAttributes(this.name, this.options.HTMLAttributes);
             },
             unsetAct: () => ({ commands }) => {
                 return commands.lift(this.name);
             },
         };
     }
 });
 
 export { Act, Act as default };
 