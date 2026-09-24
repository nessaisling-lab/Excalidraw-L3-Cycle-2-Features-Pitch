import {
  useExcalidrawAppState,
  useExcalidrawElements,
} from "@excalidraw/excalidraw/components/App";
import React from "react";

import { isSaveTreatmentOn } from "./demoArm";
import { SaveDrawingPrompt } from "./SaveDrawingPrompt";
import { usePersistentSavePrompt } from "./usePersistentSavePrompt";

/**
 * Wires the First-Save Moment into the app: reads canvas state from the
 * editor's own context. Saving goes through the same format picker the
 * persistent button opens, so both surfaces offer the same choice.
 *
 * Renders as a child of <Excalidraw>, the pattern the AI panel and footer
 * already use.
 */
export const PersistentSavePrompt = ({
  onSaveRequest,
}: {
  /**
   * Opens the format picker. The card clears itself only once a file is
   * actually written (via recordC1Save) — closing the picker is not a save.
   */
  onSaveRequest: () => void;
}) => {
  const elements = useExcalidrawElements();
  const appState = useExcalidrawAppState();

  const { visible, dismiss } = usePersistentSavePrompt({
    elements,
    appState,
  });

  // `?arm=control` shows today's experience with nothing added, so the two can
  // be compared in one session. Fixed to the treatment outside demo builds.
  if (!isSaveTreatmentOn() || !visible) {
    return null;
  }

  return <SaveDrawingPrompt onSave={onSaveRequest} onDismiss={dismiss} />;
};
