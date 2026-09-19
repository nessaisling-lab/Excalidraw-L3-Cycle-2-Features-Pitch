import clsx from "clsx";
import React, { useEffect, useRef } from "react";

import { C1_CONFIG } from "./config";

import "./SaveDrawingPrompt.scss";

import type { PromptAnchor } from "./config";

/**
 * The First-Save Moment prompt (C1) — "Option E", approved by Carlos 2026-09-18.
 *
 * English only, by his decision, so the strings sit here rather than going
 * through `en.json`. If localisation comes back into scope they move, and
 * nothing else about this component changes.
 */
export const PROMPT_COPY = {
  headline: "Save your drawing",
  body: "Download a copy to your device so you can keep working with it later.",
  save: "Save to file",
  /** Read once by screen readers via the live region; see PRD §6a. */
  announcement:
    "Your drawing is only saved in this browser. Save to file, or dismiss.",
  dismissLabel: "Dismiss save reminder",
} as const;

const DismissIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" />
  </svg>
);

export const SaveDrawingPrompt = ({
  anchor = C1_CONFIG.anchor,
  onSave,
  onDismiss,
}: {
  /** Which corner to anchor to. Defaults to config, overridable for tests. */
  anchor?: PromptAnchor;
  onSave: () => void;
  onDismiss: () => void;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Escape dismisses only while focus is inside the prompt. On the canvas
  // Escape already deselects and cancels tools, so a global listener would
  // break drawing. The ✕ works regardless of where focus is.
  useEffect(() => {
    const node = containerRef.current;
    if (!node) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onDismiss();
      }
    };

    node.addEventListener("keydown", onKeyDown);
    return () => node.removeEventListener("keydown", onKeyDown);
  }, [onDismiss]);

  return (
    <div
      ref={containerRef}
      className={clsx("c1-save-prompt", `c1-save-prompt--${anchor}`)}
      // Announced once, politely, without moving focus away from the canvas.
      role="status"
      aria-live="polite"
    >
      {/* The visible headline is not the announcement: on its own it doesn't
          say why saving matters, which is the whole point of the prompt. */}
      <span className="visually-hidden">{PROMPT_COPY.announcement}</span>

      <p className="c1-save-prompt__headline">{PROMPT_COPY.headline}</p>
      <p className="c1-save-prompt__body">{PROMPT_COPY.body}</p>

      <button type="button" className="c1-save-prompt__save" onClick={onSave}>
        {PROMPT_COPY.save}
      </button>

      <button
        type="button"
        className="c1-save-prompt__dismiss"
        onClick={onDismiss}
        aria-label={PROMPT_COPY.dismissLabel}
      >
        <DismissIcon />
      </button>
    </div>
  );
};
