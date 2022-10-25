<template>
  <div class="toc-wrap">
    <div class="toc">
      <div class="toc_list">
        <div
          :class="`toc_item toc_item--${item.uid} toc_item--${item.type}`"
          v-for="item in tocList"
          :key="item.uid"
          @click="handleClick(item.uid, item.type)"
        >
          <span class="toc_item--content">{{ item.content }}</span>
          <span class="toc_item--count">{{ item.count }}</span>
        </div>
      </div>
    </div>
    <div class="count">字数：{{ docTotalCount }}</div>
  </div>
</template>

<script>
export default {
  props: {
    editor: {
      type: Object,
      require: true,
    },
  },
  data() {
    return {
      tocList: [],
      updateTimer: null,
      storage: new Map(),
      version: 0,
      attrs: ["scenehead", "act"],
    };
  },
  computed: {
    docTotalCount() {
      return this.editor?.state.doc.textContent?.length || 0;
    },
    editorView() {
      return this.editor?.view.dom;
    },
  },
  mounted() {
    this.handleUpdateToc();
    this.editor.on("update", this.handleUpdateToc);
    this.editor.on("selectionUpdate", this.handleSelectionUpdate);
  },
  destroyed() {
    this.storage.clear?.();
    this.tocList = null;
  },
  methods: {
    handleClick(uid, type) {
      this.editorView
        ?.querySelector(`p[data-type="${type}"][data-uid="${uid}"]`)
        ?.scrollIntoViewIfNeeded();
    },
    handleUpdateToc() {
      const editor = this.editor;
      if (this.updateTimer) {
        clearTimeout(this.updateTimer);
        this.updateTimer = null;
      }
      this.updateTimer = setTimeout(() => {
        let infos = {
          scenehead: null,
          act: null,
        };
        this.version++;
        editor.state.doc.descendants((node, pos) => {
          let { dataType, uid } = node.attrs;
          if (dataType && this.attrs.includes(dataType)) {
            infos[dataType] = this.storage.get(uid);
            if (infos[dataType]) {
              infos[dataType].type = dataType;
              infos[dataType].pos = pos;
              infos[dataType].content = node.textContent;
              infos[dataType].count = 0;
              infos[dataType].version = this.version;
            } else {
              this.storage.set(uid, {
                pos,
                content: node.textContent,
                count: 0,
                type: dataType,
                version: this.version,
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
        this.getTocList();
        clearTimeout(this.updateTimer);
        this.updateTimer = null;
      }, 200);
    },
    handleSelectionUpdate(event) {
      const { transaction } = event;
      let pos = transaction.curSelection.from;
      let prevTocItem = this.tocList
        .slice()
        .reverse()
        .find((item) => item.pos <= pos);
      if (prevTocItem) {
        this.$el
          .querySelector(`.toc_item--${prevTocItem.uid}`)
          ?.scrollIntoViewIfNeeded();
      }
    },
    getTocList() {
      let tocMap = this.storage;
      if (tocMap.size) {
        let list = [];
        tocMap.forEach((value, key) => {
          if (value.version === this.version) {
            list.push({ uid: key, ...value });
          } else {
            tocMap.delete(key);
          }
        });
        list.sort((a, b) => a.pos - b.pos);
        this.tocList = list;
      }
    },
  },
};
</script>

<style lang="scss">
$--toc-max-height: 500px;
$--toc-width: 300px;
$--content-width: 250px;
$--bottom-count-height: 36px;
.toc-wrap {
  max-height: $--toc-max-height;
  padding: 6px 8px;
  .toc {
    .toc_list {
      white-space: pre-wrap;
      overflow: scroll;
      max-height: calc($--toc-max-height - $--bottom-count-height);
      .toc_item {
        margin: 4px 0;
        display: flex;
        justify-content: space-between;
        cursor: pointer;
        &.toc_item--scenehead {
          background-color: rgba(123, 123, 116, 0.335);
        }
        &.toc_item--act {
          font-weight: 500;
        }
        &--content {
          width: ($--content-width);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        &--count {
          width: calc(($--toc-width) - ($--content-width));
        }
      }
    }
  }
  .count {
    line-height: 36px;
  }
}
</style>
