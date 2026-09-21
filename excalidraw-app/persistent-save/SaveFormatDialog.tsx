import { Dialog } from "@excalidraw/excalidraw/components/Dialog";
import React, { useState } from "react";

import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

import { SAVE_FORMATS, saveInFormat } from "./saveFormats";

import "./SaveFormatDialog.scss";

import type { SaveFormat } from "./saveFormats";

/** Draft copy, pending Lawrence (copy owner). */
export const SAVE_DIALOG_COPY = {
  title: "Save to file",
  group: "File format",
  needsContent: "Draw something first",
  failed: "Couldn't save the file. Please try again.",
} as const;

/**
 * The format choices on their own, so they can be tested without mounting the
 * editor that <Dialog> needs around it.
 */
export const SaveFormatOptions = ({
  hasContent,
  busy,
  onChoose,
}: {
  hasContent: boolean;
  /** A save is in progress; a second click would download twice. */
  busy: boolean;
  onChoose: (format: SaveFormat) => void;
}) => (
  <div
    className="c1-save-formats"
    role="group"
    aria-label={SAVE_DIALOG_COPY.group}
  >
    {SAVE_FORMATS.map(({ format, label, description, needsContent }) => {
      const blocked = needsContent && !hasContent;
      return (
        <button
          key={format}
          type="button"
          className="c1-save-formats__option"
          disabled={busy || blocked}
          onClick={() => onChoose(format)}
        >
          <span className="c1-save-formats__label">{label}</span>
          <span className="c1-save-formats__description">
            {blocked ? SAVE_DIALOG_COPY.needsContent : description}
          </span>
        </button>
      );
    })}
  </div>
);

/**
 * What "Save to file" opens, from either surface. Downloads straight to the
 * device in the chosen format — no OS Save dialog.
 */
export const SaveFormatDialog = ({
  excalidrawAPI,
  onClose,
  onSaved,
}: {
  excalidrawAPI: ExcalidrawImperativeAPI;
  onClose: () => void;
  /** Runs only once a file was actually written; closing the dialog is not a save. */
  onSaved?: () => void;
}) => {
  const [busy, setBusy] = useState(false);

  const choose = async (format: SaveFormat) => {
    setBusy(true);
    try {
      await saveInFormat(excalidrawAPI, format);
      onSaved?.();
      onClose();
    } catch (error) {
      console.error(error);
      excalidrawAPI.setToast({
        message: SAVE_DIALOG_COPY.failed,
        closable: true,
      });
      setBusy(false);
    }
  };

  return (
    <Dialog
      size="small"
      title={SAVE_DIALOG_COPY.title}
      onCloseRequest={onClose}
      className="c1-save-format-dialog"
    >
      <SaveFormatOptions
        hasContent={excalidrawAPI.getSceneElements().length > 0}
        busy={busy}
        onChoose={choose}
      />
    </Dialog>
  );
};
