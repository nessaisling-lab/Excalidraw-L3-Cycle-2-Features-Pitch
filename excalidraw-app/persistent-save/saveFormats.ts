import { MIME_TYPES } from "@excalidraw/common";
import { exportToBlob, exportToSvg } from "@excalidraw/excalidraw";

import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

import { downloadBlob, downloadScene, sceneFilename } from "./downloadScene";

export type SaveFormat = "excalidraw" | "png" | "svg";

/**
 * The formats both save surfaces offer — the card's "Save to file" and the
 * persistent button — agreed with Carlos on 2026-09-21: the same three the
 * export menu already covers, surfaced where people are looking for them.
 *
 * Copy approved by Lawrence 2026-09-22. It states the one distinction the card
 * promises and only this format keeps: the Excalidraw file stays editable,
 * the images are flat. "Recommended" is the badge, so it isn't repeated here.
 */
export const SAVE_FORMATS: readonly {
  format: SaveFormat;
  label: string;
  description: string;
  /** Image formats of an empty canvas are a blank file, so they wait for content. */
  needsContent: boolean;
  /** Marked as the one that keeps the drawing editable. Exactly one. */
  recommended?: boolean;
}[] = [
  {
    format: "excalidraw",
    label: "Excalidraw file",
    description: "Keeps your shapes editable.",
    needsContent: false,
    recommended: true,
  },
  {
    format: "png",
    label: "PNG image",
    description: "A flat image for sharing.",
    needsContent: true,
  },
  {
    format: "svg",
    label: "SVG image",
    description: "A flat image that stays sharp at any size.",
    needsContent: true,
  },
];

/** Exports the scene in the chosen format and downloads it. */
export const saveInFormat = async (
  api: ExcalidrawImperativeAPI,
  format: SaveFormat,
) => {
  if (format === "excalidraw") {
    downloadScene(api);
    return;
  }

  // Same settings the export dialog would use: the user's background and
  // dark-mode choices come through appState.
  //
  // Except one. "Embed scene" writes the whole drawing into the PNG or SVG, and
  // it is a per-browser setting that sticks once someone turns it on in the
  // Export image dialog. Both exporters honour it, so inheriting it would hand
  // that person a file these cards call flat and shareable while it quietly
  // carries the editable scene. Measured with it on: a PNG went from 7,057 to
  // 9,699 bytes and an SVG from 1,092 to 2,197, each with the scene inside.
  //
  // Provisional, pending Carlos (2026-09-23): the alternative is to inherit the
  // setting and rewrite the cards, which needs his call and Lawrence's copy.
  // Keeping the approved copy true needs neither. One line to reverse.
  const source = {
    elements: api.getSceneElements(),
    appState: { ...api.getAppState(), exportEmbedScene: false },
    files: api.getFiles(),
  };

  if (format === "png") {
    const blob = await exportToBlob({ ...source, mimeType: MIME_TYPES.png });
    downloadBlob(blob, sceneFilename(api, "png"));
    return;
  }

  const svg = await exportToSvg(source);
  downloadBlob(
    new Blob([svg.outerHTML], { type: MIME_TYPES.svg }),
    sceneFilename(api, "svg"),
  );
};
