import { STORAGE_KEYS } from "../app_constants";

import { ALLOW_TEST_OVERRIDES, C1_ENABLED } from "./config";

/**
 * The demo A/B switch: `?arm=control` for today's experience, `?arm=nudge`
 * for the treatment.
 *
 * Sticky on purpose. Someone showing this to a client shouldn't have to keep
 * the parameter in the URL while they click around — they set the arm once,
 * and it holds until they set the other one.
 *
 * Only ever active where URL overrides are allowed: development and the demo
 * build. In a real production build the arm is fixed, because the live
 * experiment assigns it, not the address bar.
 */
export type DemoArm = "control" | "nudge";

const ARMS: readonly DemoArm[] = ["control", "nudge"];

/** The treatment is what the demo exists to show, so it is the default. */
const DEFAULT_ARM: DemoArm = "nudge";

const readStoredArm = (): DemoArm | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LOCAL_STORAGE_C1_ARM);
    return ARMS.find((arm) => arm === raw) ?? null;
  } catch (error: any) {
    // Unable to access localStorage
    console.error(error);
    return null;
  }
};

const storeArm = (arm: DemoArm): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.LOCAL_STORAGE_C1_ARM, arm);
  } catch (error: any) {
    // Unable to access window.localStorage
    console.error(error);
  }
};

/**
 * Pure resolver, so the precedence is testable without a browser.
 *
 * A parameter in the URL wins and is remembered; otherwise the last choice
 * stands; otherwise the treatment.
 */
export const resolveDemoArm = (
  search: string,
  allowOverrides: boolean,
  stored: DemoArm | null,
): { arm: DemoArm; shouldStore: boolean } => {
  if (!allowOverrides) {
    return { arm: DEFAULT_ARM, shouldStore: false };
  }

  const requested = new URLSearchParams(search).get("arm");
  const chosen = ARMS.find((arm) => arm === requested);

  if (chosen) {
    return { arm: chosen, shouldStore: true };
  }

  return { arm: stored ?? DEFAULT_ARM, shouldStore: false };
};

/** Resolved once per load, which is also when a reload picks up a new arm. */
export const getDemoArm = (): DemoArm => {
  const { arm, shouldStore } = resolveDemoArm(
    typeof window === "undefined" ? "" : window.location.search,
    ALLOW_TEST_OVERRIDES,
    readStoredArm(),
  );

  if (shouldStore) {
    storeArm(arm);
  }

  return arm;
};

let treatmentOn: boolean | undefined;

/**
 * Whether this load shows the save treatment: the prompt and the persistent
 * button together, because the bundle is what's being tested. Both surfaces
 * read this one answer so they can never disagree — `?arm=control` hides
 * both, which is what "today's experience" means.
 *
 * Settled once per load, like the arm itself; the top-right cluster re-renders
 * constantly and shouldn't touch storage each time.
 */
export const isSaveTreatmentOn = (): boolean =>
  (treatmentOn ??= C1_ENABLED && getDemoArm() !== "control");
