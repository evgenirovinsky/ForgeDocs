import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export type RemoteCursor = {
  sessionId: string;
  name: string;
  color: string;
  from: number;
  to: number;
};

type Meta = { cursors: RemoteCursor[] };

const key = new PluginKey<DecorationSet>("remotePresence");

export const RemotePresenceExtension = Extension.create({
  name: "remotePresence",

  addStorage() {
    return {
      cursors: [] as RemoteCursor[],
    };
  },

  addCommands() {
    return {
      setRemoteCursors:
        (cursors: RemoteCursor[]) =>
        ({ tr, dispatch }) => {
          this.storage.cursors = cursors;
          if (dispatch) {
            tr.setMeta(key, { cursors } satisfies Meta);
            dispatch(tr);
          }
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key,
        state: {
          init: () => DecorationSet.empty,
          apply(tr, set) {
            const meta = tr.getMeta(key) as Meta | undefined;
            if (!meta) {
              return set.map(tr.mapping, tr.doc);
            }
            const decorations: ReturnType<typeof Decoration.inline>[] = [];
            const size = tr.doc.content.size;
            for (const cursor of meta.cursors) {
              const from = Math.max(0, Math.min(cursor.from, size));
              const to = Math.max(0, Math.min(cursor.to, size));
              if (from !== to) {
                decorations.push(
                  Decoration.inline(from, to, {
                    class: "remote-selection",
                    style: `background-color: ${cursor.color}33`,
                  }),
                );
              }
              const caretPos = Math.max(0, Math.min(to, size));
              decorations.push(
                Decoration.widget(
                  caretPos,
                  () => {
                    const wrap = document.createElement("span");
                    wrap.className = "remote-caret";
                    wrap.style.borderLeft = `2px solid ${cursor.color}`;
                    wrap.style.marginLeft = "-1px";
                    wrap.style.pointerEvents = "none";
                    wrap.style.position = "relative";
                    wrap.contentEditable = "false";

                    const label = document.createElement("span");
                    label.className = "remote-caret-label";
                    label.textContent = cursor.name;
                    label.style.background = cursor.color;
                    wrap.appendChild(label);
                    return wrap;
                  },
                  { side: -1, key: cursor.sessionId },
                ),
              );
            }
            return DecorationSet.create(tr.doc, decorations);
          },
        },
        props: {
          decorations(state) {
            return key.getState(state);
          },
        },
      }),
    ];
  },
});

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    remotePresence: {
      setRemoteCursors: (cursors: RemoteCursor[]) => ReturnType;
    };
  }
}
