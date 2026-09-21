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
 * Draft copy, pending Lawrence (copy owner).
 */
export const SAVE_FORMATS: readonly {
  format: SaveFormat;
  label: string;
  description: string;
  /** Image formats of an empty canvas are a blank file, so they wait for content. */
  needsContent: boolean;
}[] = [
  {
    format: "excalidraw",
    label: "Excalidraw file",
    description: "Open it again later and keep editing",
    needsContent: false,
  },
  {
    format: "png",
    label: "PNG image",
    description: "A picture to share or paste anywhere",
    needsContent: true,
  },
  {
    format: "svg",
    label: "SVG image",
    description: "Sharp at any size, for the web or print",
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
  const source = {
    elements: api.getSceneElements(),
    appState: api.getAppState(),
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
