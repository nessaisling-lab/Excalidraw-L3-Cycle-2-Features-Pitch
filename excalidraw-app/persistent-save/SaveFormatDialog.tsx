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

import { PERSISTENT_SAVE_BUTTON_CLASS } from "./PersistentSaveButton";
import { SAVE_FORMATS, saveInFormat } from "./saveFormats";

import "./SaveFormatDialog.scss";

import type { SaveFormat } from "./saveFormats";

/** Copy approved by Lawrence 2026-09-22. */
export const SAVE_DIALOG_COPY = {
  title: "Save to file",
  group: "File format",
  recommended: "Recommended",
  /** Lower case, because it is read as the tail of the button's own name. */
  recommendedSuffix: "recommended",
  needsContent: "Draw something first.",
  failed: "Couldn't save the file. Please try again.",
} as const;

/**
 * Each format as a card, built from the same pieces as the main menu's
 * "Save to…" dialog so the two read as one family — Carlos, 2026-09-21: "keep
 * them the same and on-brand". The Excalidraw file takes that dialog's lime,
 * because it is the same action as its "Save to disk".
 *
 * The colours also run in that dialog's order — lime, pink, violet. They used
 * to run lime, violet, pink, which was the one thing that still read as a
 * different visual language when the two were opened side by side
 * (Carlos, 2026-09-23).
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
  png: { color: "pink", icon: pngIcon, button: "Save as PNG" },
  svg: { color: "primary", icon: svgIcon, button: "Save as SVG" },
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
                  {/*
                    The recommendation reaches someone reading the dialog as
                    text, but tabbing announced three options that sounded
                    equivalent, so it is named here too (Lawrence, 2026-09-23).
                    `showAriaLabel` renders the accessible name as the visible
                    label, so the label is rendered separately instead — the
                    button still reads "Save as Excalidraw" on screen, and the
                    accessible name contains it, which keeps WCAG 2.5.3.
                  */}
                  <IconButton
                    className="Card-button"
                    type="button"
                    title={button}
                    aria-label={
                      recommended
                        ? `${button}, ${SAVE_DIALOG_COPY.recommendedSuffix}`
                        : button
                    }
                    showAriaLabel={false}
                    disabled={busy || blocked}
                    onClick={() => onChoose(format)}
                  >
                    <div className="ToolIcon__label">{button}</div>
                  </IconButton>
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
 * Hands focus back after a save. Saving from the card clears the card, so the
 * button that opened the dialog is gone by the time we get here — without a
 * fallback the browser drops focus on <body> and a keyboard user is returned
 * to the top of the document. The persistent button is the nearest equivalent
 * of what they were using, and it is always present in the nudge arm.
 */
const returnFocus = (opener: HTMLElement | null) => {
  if (opener?.isConnected) {
    opener.focus();
    return;
  }
  document
    .querySelector<HTMLElement>(`.${PERSISTENT_SAVE_BUTTON_CLASS}`)
    ?.focus();
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
      // Both of those are state setters, so nothing has re-rendered yet: the
      // card's button is still in the document even when this save is what
      // removes it. Deciding now would always pick it, and focus would land on
      // <body> a moment later when React took it away. A macrotask runs after
      // React has committed, so by then the opener is gone if it is going.
      setTimeout(() => returnFocus(opener.current));
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
