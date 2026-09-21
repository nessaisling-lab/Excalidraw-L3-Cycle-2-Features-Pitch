import { isTextElement } from "@excalidraw/element";

import type { ExcalidrawElement } from "@excalidraw/element/types";

import { C1_CONFIG } from "./config";

import type { C1Config } from "./config";

/**
 * When the First-Save Moment becomes eligible: a real element on the canvas,
 * then a dwell period, then a moment of quiet.
 *
 * The dwell clock counts visible-tab time only. Wall-clock timers keep running
 * in a backgrounded tab, which would fire the prompt at someone who left and
 * came back — and it counts nothing while a menu or dialog is open, so the
 * prompt never lands on top of one.
 */

/**
 * A stray click or a 2px nudge shouldn't count as "started drawing". Any text
 * with content qualifies regardless of size, since a small label is still work
 * worth saving. Library items are ordinary elements, so the size rule covers
 * them with no special case.
 */
export const isQualifyingElement = (
  element: ExcalidrawElement,
  config: C1Config = C1_CONFIG,
): boolean => {
  if (element.isDeleted) {
    return false;
  }

  if (isTextElement(element)) {
    return element.text.trim().length > 0;
  }

  return (
    element.width >= config.minElementSize ||
    element.height >= config.minElementSize
  );
};

export const hasQualifyingElement = (
  elements: readonly ExcalidrawElement[],
  config: C1Config = C1_CONFIG,
): boolean => elements.some((element) => isQualifyingElement(element, config));

export type DwellContext = {
  /** `!document.hidden` — the clock only runs on a visible tab. */
  visible: boolean;
  /** A menu, dialog or other blocking surface is open. */
  blocked: boolean;
};

export type DwellTracker = {
  /**
   * Call on a timer while the prompt is pending. Returns true exactly once,
   * on the tick where the prompt should appear.
   */
  update: (now: number, context: DwellContext) => boolean;
  /** Any pointer or keyboard activity — restarts the quiet gate. */
  noteInput: (now: number) => void;
  /** Back to an empty canvas: eligibility starts over. */
  reset: () => void;
  readonly accumulatedMs: number;
};

/**
 * Takes `now` from the caller rather than reading the clock itself, so the
 * component owns the ticking and this stays testable without fake timers.
 */
export const createDwellTracker = (
  config: C1Config = C1_CONFIG,
): DwellTracker => {
  let accumulatedMs = 0;
  let lastTickAt: number | null = null;
  let lastInputAt: number | null = null;
  let fired = false;

  return {
    noteInput(now: number) {
      lastInputAt = now;
    },

    reset() {
      accumulatedMs = 0;
      lastTickAt = null;
      lastInputAt = null;
      fired = false;
    },

    update(now: number, { visible, blocked }: DwellContext) {
      if (fired) {
        return false;
      }

      if (!visible || blocked) {
        // Drop the anchor so the paused stretch isn't credited on resume.
        lastTickAt = null;
        return false;
      }

      if (lastTickAt !== null) {
        accumulatedMs += now - lastTickAt;
      }
      lastTickAt = now;

      if (accumulatedMs < config.dwellMs) {
        return false;
      }

      if (lastInputAt !== null && now - lastInputAt < config.quietGateMs) {
        return false;
      }

      fired = true;
      return true;
    },

    get accumulatedMs() {
      return accumulatedMs;
    },
  };
};
