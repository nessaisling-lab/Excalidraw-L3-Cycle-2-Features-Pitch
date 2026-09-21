import { STORAGE_KEYS } from "../app_constants";

import { C1_CONFIG } from "./config";

import type { C1Config } from "./config";

/**
 * First-visit bookkeeping for the First-Save Moment (C1).
 *
 * We keep our own record rather than inferring first-run status from the scene:
 * autosave writes within seconds of the first stroke, so a same-session reload
 * would otherwise look like a returning visitor and the prompt would never fire.
 */

export type C1State = "eligible" | "shown" | "dismissed" | "saved";

export type C1Record = {
  firstSeenAt: number;
  lastActiveAt: number;
  state: C1State;
};

const C1_STATES: readonly C1State[] = [
  "eligible",
  "shown",
  "dismissed",
  "saved",
];

const parseRecord = (raw: string | null): C1Record | null => {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    if (
      typeof parsed?.firstSeenAt === "number" &&
      typeof parsed?.lastActiveAt === "number" &&
      C1_STATES.includes(parsed?.state)
    ) {
      return parsed as C1Record;
    }
  } catch (error: any) {
    // malformed record — treat it as absent rather than throwing at startup
    console.error(error);
  }

  return null;
};

export const readC1Record = (): C1Record | null => {
  try {
    return parseRecord(localStorage.getItem(STORAGE_KEYS.LOCAL_STORAGE_C1));
  } catch (error: any) {
    // Unable to access localStorage
    console.error(error);
    return null;
  }
};

/** Returns false when browser storage can't be written — see `initC1Session`. */
export const writeC1Record = (record: C1Record): boolean => {
  try {
    localStorage.setItem(STORAGE_KEYS.LOCAL_STORAGE_C1, JSON.stringify(record));
    return true;
  } catch (error: any) {
    // Unable to access window.localStorage
    console.error(error);
    return false;
  }
};

export type C1Session = {
  /** True only for a first-time visitor still inside their first session. */
  isFirstTimeVisitor: boolean;
  record: C1Record | null;
  /**
   * False when the record could not be persisted. The prompt must not show in
   * that case: we couldn't honour "one dismissal kills it permanently", so it
   * would reappear on every load.
   */
  storageAvailable: boolean;
};

/**
 * Call once on page load, before the prompt is considered.
 *
 * `hasSceneData` is whether browser storage already holds a drawing (the
 * `excalidraw` / `excalidraw-state` keys). Scene data with no record of ours
 * means someone who drew here before we shipped — not a first run.
 */
export const initC1Session = ({
  hasSceneData,
  now = Date.now(),
  config = C1_CONFIG,
}: {
  hasSceneData: boolean;
  now?: number;
  config?: C1Config;
}): C1Session => {
  const existing = readC1Record();

  if (existing) {
    const record: C1Record = { ...existing, lastActiveAt: now };
    return {
      // Past the session gap they are a returning visitor, and the prompt is a
      // first-session surface. Within it, a reload is the same first session.
      isFirstTimeVisitor: now - existing.lastActiveAt <= config.sessionGapMs,
      record,
      storageAvailable: writeC1Record(record),
    };
  }

  if (hasSceneData) {
    // No prompt either way in this branch, so storage writability is moot.
    return { isFirstTimeVisitor: false, record: null, storageAvailable: true };
  }

  const record: C1Record = {
    firstSeenAt: now,
    lastActiveAt: now,
    state: "eligible",
  };

  return {
    isFirstTimeVisitor: true,
    record,
    storageAvailable: writeC1Record(record),
  };
};

/**
 * Forgets the record entirely, so the prompt is eligible again.
 *
 * Only ever called from a build that allows URL overrides — the prompt is
 * once-ever per browser profile by design, and that is a client constraint,
 * not an inconvenience to work around in production.
 */
export const clearC1Record = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEYS.LOCAL_STORAGE_C1);
  } catch (error: any) {
    // Unable to access localStorage
    console.error(error);
  }
};

/** No-ops if there is no record — nothing to advance. */
export const markC1State = (state: C1State, now = Date.now()): boolean => {
  const existing = readC1Record();
  if (!existing) {
    return false;
  }
  return writeC1Record({ ...existing, state, lastActiveAt: now });
};

/** The prompt fires at most once per browser profile, in any of its end states. */
export const isPromptSpent = (record: C1Record | null): boolean =>
  record !== null && record.state !== "eligible";

/**
 * Tabs in one profile share storage, so a prompt shown, dismissed or satisfied
 * in one tab must suppress it everywhere else immediately.
 */
export const subscribeToC1Changes = (
  onChange: (record: C1Record | null) => void,
): (() => void) => {
  const handler = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEYS.LOCAL_STORAGE_C1) {
      return;
    }
    onChange(parseRecord(event.newValue));
  };

  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
};
