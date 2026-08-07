"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { useEffect, useRef, useState } from "react";

type Props = {
  documentId: string;
  initialTitle: string;
  initialContent: object;
  readOnly?: boolean;
};

export function DocumentEditor({
  documentId,
  initialTitle,
  initialContent,
  readOnly = false,
}: Props) {
  const [title, setTitle] = useState(initialTitle);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [exportMsg, setExportMsg] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      Placeholder.configure({ placeholder: "Start writing…" }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: initialContent,
    editable: !readOnly,
    immediatelyRender: false,
    onUpdate: ({ editor: ed }) => {
      if (readOnly) return;
      scheduleSave(title, ed.getJSON());
    },
  });

  function scheduleSave(nextTitle: string, content: object) {
    setStatus("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void persist(nextTitle, content);
    }, 600);
  }

  async function persist(nextTitle: string, content: object) {
    try {
      const res = await fetch(`/api/documents/${documentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: nextTitle, content }),
      });
      if (!res.ok) throw new Error("save failed");
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  }

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  async function onUploadImage(file: File) {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/uploads", { method: "POST", body: form });
    if (!res.ok) throw new Error("upload failed");
    const data = (await res.json()) as { url: string };
    editor?.chain().focus().setImage({ src: data.url }).run();
  }

  async function exportDoc(format: "docx" | "pdf") {
    setExportMsg(`Exporting ${format.toUpperCase()}…`);
    const res = await fetch(`/api/documents/${documentId}/export`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ format }),
    });
    const data = await res.json();
    if (!res.ok || data.job?.status === "failed") {
      setExportMsg(data.job?.error ?? "Export failed");
      return;
    }

    const statusRes = await fetch(`/api/exports/${data.job.id}`);
    const statusData = await statusRes.json();
    if (statusData.job?.downloadUrl) {
      setExportMsg(`${format.toUpperCase()} ready`);
      window.open(statusData.job.downloadUrl, "_blank");
    } else {
      setExportMsg(statusData.job?.error ?? "Export finished without URL");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <input
          className="text-2xl font-semibold bg-transparent border-b border-transparent focus:border-stone-400 outline-none w-full max-w-xl"
          value={title}
          disabled={readOnly}
          onChange={(e) => {
            setTitle(e.target.value);
            if (editor) scheduleSave(e.target.value, editor.getJSON());
          }}
        />
        <div className="flex items-center gap-2 text-sm text-stone-600">
          <span data-testid="save-status">
            {status === "saving"
              ? "Saving…"
              : status === "saved"
                ? "Saved"
                : status === "error"
                  ? "Save failed"
                  : ""}
          </span>
          {!readOnly && (
            <>
              <label className="cursor-pointer rounded border px-2 py-1 hover:bg-stone-100">
                Image
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void onUploadImage(file);
                  }}
                />
              </label>
              <button
                type="button"
                className="rounded border px-2 py-1 hover:bg-stone-100"
                onClick={() =>
                  editor
                    ?.chain()
                    .focus()
                    .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                    .run()
                }
              >
                Table
              </button>
            </>
          )}
          <button
            type="button"
            data-testid="export-docx"
            className="rounded bg-stone-900 text-white px-2 py-1 hover:bg-stone-700"
            onClick={() => void exportDoc("docx")}
          >
            Word
          </button>
          <button
            type="button"
            data-testid="export-pdf"
            className="rounded bg-stone-900 text-white px-2 py-1 hover:bg-stone-700"
            onClick={() => void exportDoc("pdf")}
          >
            PDF
          </button>
        </div>
      </div>
      {exportMsg && <p className="text-sm text-stone-600">{exportMsg}</p>}
      <div className="prose max-w-none rounded-lg border border-stone-200 bg-white p-4 min-h-[420px]">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
