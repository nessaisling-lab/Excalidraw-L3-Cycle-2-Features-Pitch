import { useCallback, useEffect, useRef, useState } from "react";

import type { UIAppState } from "@excalidraw/excalidraw/types";

import type { ExcalidrawElement } from "@excalidraw/element/types";

import { STORAGE_KEYS } from "../app_constants";

import {
  clearC1Record,
  initC1Session,
  isPromptSpent,
  markC1State,
  subscribeToC1Changes,
} from "./c1State";
import { ALLOW_TEST_OVERRIDES, C1_CONFIG } from "./config";
import { createDwellTracker, hasQualifyingElement } from "./trigger";

import type { C1Config } from "./config";

/** How often the dwell clock is sampled. Fine-grained enough for a 2s gate. */
const TICK_MS = 500;

/** Did storage already hold a drawing before we ever ran? */
const sceneDataExists = (): boolean => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LOCAL_STORAGE_ELEMENTS);
    if (!raw) {
      return false;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0;
  } catch (error: any) {
    // Unable to access localStorage
    console.error(error);
    return false;
  }
};

/**
 * Decides whether the First-Save Moment is on screen.
 *
 * Eligibility is: a first-time visitor, a qualifying element on the canvas,
 * then dwell time accumulated while the tab is visible and nothing is
 * blocking, then a moment of quiet. Any of shown / dismissed / saved ends it
 * permanently, in this tab and every other one sharing the profile.
 */
export const usePersistentSavePrompt = ({
  elements,
  appState,
  config = C1_CONFIG,
}: {
  elements: readonly ExcalidrawElement[];
  appState: UIAppState | null;
  config?: C1Config;
}) => {
  const [visible, setVisible] = useState(false);
  const trackerRef = useRef(createDwellTracker(config));
  const spentRef = useRef(false);
  const eligibleRef = useRef(false);

  // One-time first-visit check.
  useEffect(() => {
    // `?reset` makes the prompt eligible again. Without it the demo is a
    // one-shot per browser profile, which is fine for a real visitor and
    // useless for anyone trying to check the thing works.
    const didReset =
      ALLOW_TEST_OVERRIDES &&
      new URLSearchParams(window.location.search).has("reset");

    if (didReset) {
      clearC1Record();
    }

    // Dropping the record alone isn't enough: by the time anyone resets, the
    // canvas they drew on has been autosaved, and scene-data-without-a-record
    // is precisely how a returning visitor is identified. A reset means "treat
    // me as new", so the scene check is skipped rather than worked around.
    const session = initC1Session({
      hasSceneData: didReset ? false : sceneDataExists(),
    });

    // No prompt if we can't persist a dismissal — it would come back on every
    // load, which breaks Carlos's "one dismissal kills it permanently".
    eligibleRef.current =
      session.isFirstTimeVisitor &&
      session.storageAvailable &&
      !isPromptSpent(session.record);

    spentRef.current = !eligibleRef.current;
  }, []);

  // Another tab showed, dismissed or satisfied it — stand down immediately.
  useEffect(
    () =>
      subscribeToC1Changes((record) => {
        if (isPromptSpent(record)) {
          spentRef.current = true;
          setVisible(false);
        }
      }),
    [],
  );

  // Any input restarts the quiet gate, so the prompt never lands mid-stroke.
  useEffect(() => {
    const note = () => trackerRef.current.noteInput(Date.now());
    window.addEventListener("pointerdown", note, true);
    window.addEventListener("pointermove", note, true);
    window.addEventListener("keydown", note, true);
    return () => {
      window.removeEventListener("pointerdown", note, true);
      window.removeEventListener("pointermove", note, true);
      window.removeEventListener("keydown", note, true);
    };
  }, []);

  const blocked = Boolean(
    appState?.openMenu ||
      appState?.openDialog ||
      appState?.openPopup ||
      appState?.openSidebar ||
      appState?.viewModeEnabled ||
      appState?.isLoading,
  );

  const qualifies = hasQualifyingElement(elements, config);

  // Undo back to an empty canvas puts eligibility back to not-yet-fired: the
  // welcome layer returns, so the prompt should behave as if nothing happened.
  useEffect(() => {
    if (!qualifies && !visible && !spentRef.current) {
      trackerRef.current.reset();
    }
  }, [qualifies, visible]);

  useEffect(() => {
    if (visible || spentRef.current || !eligibleRef.current || !qualifies) {
      return;
    }

    const id = window.setInterval(() => {
      const ready = trackerRef.current.update(Date.now(), {
        visible: !document.hidden,
        blocked,
      });
      if (ready) {
        setVisible(true);
        markC1State("shown");
      }
    }, TICK_MS);

    return () => window.clearInterval(id);
  }, [qualifies, blocked, visible]);

  const dismiss = useCallback(() => {
    spentRef.current = true;
    setVisible(false);
    markC1State("dismissed");
  }, []);

  /** A save ends the prompt whether or not it was the prompt that prompted it. */
  const recordSave = useCallback(() => {
    spentRef.current = true;
    setVisible(false);
    markC1State("saved");
  }, []);

  return { visible, dismiss, recordSave };
};
