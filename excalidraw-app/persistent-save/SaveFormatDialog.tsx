import { Card } from "@excalidraw/excalidraw/components/Card";
import { Dialog } from "@excalidraw/excalidraw/components/Dialog";
import clsx from "clsx";
import { IconButton } from "@excalidraw/excalidraw/components/IconButton";
import {
  exportToFileIcon,
  pngIcon,
  svgIcon,
} from "@excalidraw/excalidraw/components/icons";
import React, { useEffect, useRef, useState } from "react";

import "@excalidraw/excalidraw/components/ExportDialog.scss";

import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

import { SAVE_FORMATS, saveInFormat } from "./saveFormats";

import "./SaveFormatDialog.scss";

import type { SaveFormat } from "./saveFormats";

/** Copy approved by Lawrence 2026-09-22. */
export const SAVE_DIALOG_COPY = {
  title: "Save to file",
  group: "File format",
  recommended: "Recommended",
  needsContent: "Draw something first.",
  failed: "Couldn't save the file. Please try again.",
} as const;

/**
 * Each format as a card, built from the same pieces as the main menu's
 * "Save to…" dialog so the two read as one family — Carlos, 2026-09-21: "keep
 * them the same and on-brand". The Excalidraw file takes that dialog's lime,
 * because it is the same action as its "Save to disk".
 */
const CARD_STYLE: Record<
  SaveFormat,
  { color: "lime" | "primary" | "pink"; icon: React.ReactNode; button: string }
> = {
  excalidraw: {
    color: "lime",
    icon: exportToFileIcon,
    button: "Save as Excalidraw",
  },
  png: { color: "primary", icon: pngIcon, button: "Save as PNG" },
  svg: { color: "pink", icon: svgIcon, button: "Save as SVG" },
};

/**
 * The format choices on their own, so they can be tested without mounting the
 * editor that <Dialog> needs around it.
 */
export const SaveFormatOptions = ({
  hasContent,
  busy,
  onChoose,
  autoFocus = false,
}: {
  hasContent: boolean;
  /** A save is in progress; a second click would download twice. */
  busy: boolean;
  onChoose: (format: SaveFormat) => void;
  /** Put keyboard focus on the first card that can be used. */
  autoFocus?: boolean;
}) => {
  const cardsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoFocus) {
      cardsRef.current
        ?.querySelector<HTMLButtonElement>(".Card-button:not(:disabled)")
        ?.focus();
    }
  }, [autoFocus]);

  return (
    <div className="ExportDialog ExportDialog--json">
      <div
        ref={cardsRef}
        className="ExportDialog-cards c1-save-formats"
        role="group"
        aria-label={SAVE_DIALOG_COPY.group}
      >
        {SAVE_FORMATS.map(
          ({ format, label, description, needsContent, recommended }) => {
            const { color, icon, button } = CARD_STYLE[format];
            const blocked = needsContent && !hasContent;
            return (
              // Styling hook only; `display: contents` keeps the card in the grid.
              <div
                key={format}
                className={`c1-save-formats__card c1-save-formats__card--${color}`}
              >
                <Card color={color}>
                  {/*
                    The badge sits above the icon, and the other cards carry a
                    hidden twin, so one label can't push its column out of line
                    with the rest.
                  */}
                  <span
                    className={clsx("c1-save-formats__badge", {
                      "c1-save-formats__badge--placeholder": !recommended,
                    })}
                    aria-hidden={!recommended}
                  >
                    {SAVE_DIALOG_COPY.recommended}
                  </span>
                  <div className="Card-icon">{icon}</div>
                  <h2>{label}</h2>
                  <div className="Card-details">
                    {blocked ? SAVE_DIALOG_COPY.needsContent : description}
                  </div>
                  <IconButton
                    className="Card-button"
                    type="button"
                    title={button}
                    aria-label={button}
                    showAriaLabel={true}
                    disabled={busy || blocked}
                    onClick={() => onChoose(format)}
                  />
                </Card>
              </div>
            );
          },
        )}
      </div>
    </div>
  );
};

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
  // <Dialog> hands focus back only when it is dismissed, not when we close it
  // after a save — so remember what opened it and do it ourselves.
  const opener = useRef(document.activeElement as HTMLElement | null);

  const choose = async (format: SaveFormat) => {
    setBusy(true);
    try {
      await saveInFormat(excalidrawAPI, format);
      onSaved?.();
      onClose();
      // The card's own button is gone once it clears; nothing to return to.
      if (opener.current?.isConnected) {
        opener.current.focus();
      }
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
      title={SAVE_DIALOG_COPY.title}
      onCloseRequest={onClose}
      className="c1-save-format-dialog"
      // Its default focuses the *second* control, assuming the first is a
      // close button that only exists on phones. We focus the first card.
      autofocus={false}
    >
      <SaveFormatOptions
        autoFocus
        hasContent={excalidrawAPI.getSceneElements().length > 0}
        busy={busy}
        onChoose={choose}
      />
    </Dialog>
  );
};
