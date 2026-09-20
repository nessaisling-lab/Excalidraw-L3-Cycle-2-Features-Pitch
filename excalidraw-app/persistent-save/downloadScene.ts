import { MIME_TYPES } from "@excalidraw/common";
import { serializeAsJSON } from "@excalidraw/excalidraw/data/json";

import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

/**
 * Saves the current scene straight to a `.excalidraw` file.
 *
 * Deliberately not the three-option Save dialog: the persistent button exists
 * to remove a step, not add one. Save, export and share stay reachable from
 * the main menu for anyone who wants the choice.
 *
 * Lifted out of `App.tsx` unchanged so it can be tested — the download path is
 * where the details that matter live (filename, MIME type, cleanup).
 */
export const downloadScene = (api: ExcalidrawImperativeAPI) => {
  const serialized = serializeAsJSON(
    api.getSceneElements(),
    api.getAppState(),
    api.getFiles(),
    "local",
  );

  const url = URL.createObjectURL(
    new Blob([serialized], { type: MIME_TYPES.excalidraw }),
  );

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${api.getName() || "Untitled"}.excalidraw`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  // Released on the next tick rather than immediately: revoking synchronously
  // can cancel the download in some browsers before it has started.
  setTimeout(() => URL.revokeObjectURL(url), 0);
};
