import { MIME_TYPES } from "@excalidraw/common";
import { serializeAsJSON } from "@excalidraw/excalidraw/data/json";

import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

/**
 * Downloads a blob straight to the device, with no OS Save dialog — Carlos's
 * call at the 2026-09-21 review: the save surfaces offer a choice of format,
 * then save, rather than handing off to the browser's file picker.
 */
export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  // Released on the next tick rather than immediately: revoking synchronously
  // can cancel the download in some browsers before it has started.
  setTimeout(() => URL.revokeObjectURL(url), 0);
};

/** The drawing's name, or what Excalidraw itself falls back to. */
export const sceneFilename = (
  api: ExcalidrawImperativeAPI,
  extension: string,
) => `${api.getName() || "Untitled"}.${extension}`;

/**
 * Saves the current scene straight to a `.excalidraw` file — the one format
 * that can be opened and edited again, which is what keeping a drawing means.
 */
export const downloadScene = (api: ExcalidrawImperativeAPI) => {
  const serialized = serializeAsJSON(
    api.getSceneElements(),
    api.getAppState(),
    api.getFiles(),
    "local",
  );

  downloadBlob(
    new Blob([serialized], { type: MIME_TYPES.excalidraw }),
    sceneFilename(api, "excalidraw"),
  );
};
