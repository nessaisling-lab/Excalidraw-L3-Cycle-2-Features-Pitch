import {
  useExcalidrawAppState,
  useExcalidrawElements,
} from "@excalidraw/excalidraw/components/App";
import { saveAsJSON } from "@excalidraw/excalidraw/data/json";
import React from "react";

import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

import { C1_ENABLED } from "./config";
import { getDemoArm } from "./demoArm";
import { SaveDrawingPrompt } from "./SaveDrawingPrompt";
import { usePersistentSavePrompt } from "./usePersistentSavePrompt";

/**
 * Wires the First-Save Moment into the app: reads canvas state from the
 * editor's own context, and saves through the same path Ctrl/Cmd+S uses
 * rather than a second implementation.
 *
 * Renders as a child of <Excalidraw>, the pattern the AI panel and footer
 * already use.
 */
export const PersistentSavePrompt = ({
  excalidrawAPI,
}: {
  excalidrawAPI: ExcalidrawImperativeAPI;
}) => {
  const elements = useExcalidrawElements();
  const appState = useExcalidrawAppState();

  const { visible, dismiss, recordSave } = usePersistentSavePrompt({
    elements,
    appState,
  });

  // `?arm=control` shows today's experience with nothing added, so the two can
  // be compared in one session. Fixed to the treatment outside demo builds.
  if (!C1_ENABLED || getDemoArm() === "control" || !visible) {
    return null;
  }

  const onSave = async () => {
    try {
      await saveAsJSON({
        data: {
          elements: excalidrawAPI.getSceneElements(),
          appState: excalidrawAPI.getAppState(),
          files: excalidrawAPI.getFiles(),
        },
        filename: excalidrawAPI.getName(),
        fileHandle: null,
      });
      // Only a save that actually completed counts. A cancelled dialog throws
      // AbortError and leaves the prompt where it was.
      recordSave();
    } catch (error: any) {
      if (error?.name !== "AbortError") {
        // Surfaced through the app's existing error path, not a new one.
        console.error(error);
      }
    }
  };

  return <SaveDrawingPrompt onSave={onSave} onDismiss={dismiss} />;
};
