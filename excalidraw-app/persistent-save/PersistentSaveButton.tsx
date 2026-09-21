import React from "react";

/**
 * The Stage 2 persistent save surface: an always-available control in the
 * top-right that downloads the drawing directly.
 *
 * The prompt is a one-time nudge; this is the fallback for anyone who missed
 * it, dismissed it, or comes back later. Both can be on screen at once.
 *
 * Visibility is passed in rather than read here, so the rules are testable
 * without mounting the whole editor.
 */
export const SAVE_BUTTON_LABEL = "Save to file";
export const SAVE_BUTTON_TITLE = "Save to file (Ctrl/Cmd+S)";

export const PersistentSaveButton = ({
  isPlusSignedUser,
  viewModeEnabled,
  onSave,
}: {
  /** Plus users have cloud saving; the button would be noise for them. */
  isPlusSignedUser: boolean;
  /** Nothing is editable in view mode, so there is nothing to save. */
  viewModeEnabled: boolean;
  onSave: () => void;
}) => {
  if (isPlusSignedUser || viewModeEnabled) {
    return null;
  }

  return (
    <button
      type="button"
      className="excalidraw-button persistent-save-button"
      title={SAVE_BUTTON_TITLE}
      aria-label={SAVE_BUTTON_LABEL}
      onClick={onSave}
    >
      {SAVE_BUTTON_LABEL}
    </button>
  );
};
