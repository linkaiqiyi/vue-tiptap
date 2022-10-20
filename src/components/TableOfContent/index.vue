<template>
  <div class="toc-wrap">
    <div class="toc">
      <ul class="toc__list">
        <li
          class="toc__item"
          :class="`toc__item--${heading.level}`"
          v-for="(heading, index) in headings"
          :key="index"
          :data-id="heading.id"
          @click="handleClickHeading(heading.id)"
        >
          <p>
            {{ heading.text }}
          </p>
          {{ heading.count }}
        </li>
      </ul>
    </div>
    <div style="position: absolute; bottom: 0; line-height: 30px">
      字数 {{ docTotalSize }}
    </div>
  </div>
</template>

<script>
export default {
  props: {
    editor: {
      type: Object,
      default: null,
    },
  },

  data() {
    return {
      headings: [],
    };
  },
  computed: {
    docTotalSize() {
      return this.editor?.state.doc.textContent?.length || 0;
    },
  },

  methods: {
    handleUpdate() {
      const headings = [];
      const transaction = this.editor.state.tr;

      this.editor.state.doc.descendants((node, pos) => {
        let nodeTypeName = node.type.name;
        if (nodeTypeName === "act" || nodeTypeName === "scenehead") {
          const id = `${nodeTypeName}-${headings.length + 1}`;

          if (node.attrs.id !== id) {
            transaction.setNodeMarkup(pos, undefined, {
              ...node.attrs,
              id,
            });
          }

          headings.push({
            level: nodeTypeName,
            text: node.textContent,
            id,
            pos,
            node,
            count: 0, // 此处的字数统计会将 scenehead 的字数也统计进去 (结构上是 scenehead 下面还有一层 text 结构)
          });
        } else {
          if (node.type.isText && headings.length) {
            headings[headings.length - 1].count += node.textContent.length;
          }
        }
      });

      transaction.setMeta("addToHistory", false);
      transaction.setMeta("preventUpdate", true);

      this.editor.view.dispatch(transaction);

      this.headings = headings;
    },
    handleSelectionUpdate(event) {
      const { transaction } = event;
      let head = transaction.curSelection.head;
      let prevHeading = this.headings
        .slice()
        .reverse()
        .find((item) => item.pos <= head);
      if (prevHeading) {
        this.$el
          .querySelector(`.toc__item[data-id=${prevHeading.id}]`)
          ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    },
    handleClickHeading(id) {
      document
        .querySelector(`#${id}`)
        ?.scrollIntoView({ behavior: "auto", block: "start" });
    },
  },

  mounted() {
    this.editor.on("update", this.handleUpdate);
    this.editor.on("selectionUpdate", this.handleSelectionUpdate);
    this.$nextTick(this.handleUpdate);
  },
};
</script>

<style scoped>
/* Basic editor styles */
.ProseMirror * + * {
  margin-top: 0.75em;
}
.toc-wrap {
  height: 400px;
  overflow: hidden;
  position: relative;
  border: 1px solid;
  margin-right: 20px;
}
.toc {
  height: 370px;
  overflow: scroll;
}
ul li {
  display: flex;
  justify-content: space-between;
}
ul li p {
  color: #101010;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
  width: 250px;
  display: inline-block;
  text-decoration: none;
  cursor: pointer;
}
.toc__item--scenehead {
  margin: 4px 0;
  background: #10101010;
}
.toc__item--act {
  margin: 4px 0;
  font-weight: 600;
  position: sticky;
}
</style>
