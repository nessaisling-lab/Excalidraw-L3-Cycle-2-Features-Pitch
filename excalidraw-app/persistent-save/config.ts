/**
 * Tunable constants for the First-Save Moment (C1).
 *
 * These live in one place because several of them are still being settled with
 * the client, so a ruling in the PRD stays a one-line change here rather than a
 * hunt through the component. Dev and QA can override the timings from the URL —
 * a 15-second wait per QA pass is otherwise unworkable.
 */

export type C1Config = {
  /** Visible-tab time a visitor must accumulate after the first element. */
  dwellMs: number;
  /** Quiet period after the last input before the prompt may appear. */
  quietGateMs: number;
  /** A reload within this window counts as the same first session. */
  sessionGapMs: number;
  /** Minimum width or height, in scene px, for an element to qualify. */
  minElementSize: number;
};

export const C1_DEFAULTS: C1Config = {
  dwellMs: 15_000,
  quietGateMs: 2_000,
  sessionGapMs: 30 * 60 * 1000,
  minElementSize: 10,
};

const readSeconds = (params: URLSearchParams, key: string): number | null => {
  const raw = params.get(key);
  if (raw === null) {
    return null;
  }
  const seconds = Number(raw);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds * 1000 : null;
};

/**
 * `?dwell=3&quiet=0`, in seconds. Honoured in dev and QA builds only — in
 * production a URL must never be able to change what real visitors experience,
 * since the A/B result depends on everyone in an arm getting the same timing.
 */
export const resolveC1Config = (
  search: string,
  isDev: boolean,
  defaults: C1Config = C1_DEFAULTS,
): C1Config => {
  if (!isDev) {
    return defaults;
  }

  const params = new URLSearchParams(search);
  const dwellMs = readSeconds(params, "dwell");
  const quietGateMs = readSeconds(params, "quiet");

  return {
    ...defaults,
    ...(dwellMs !== null && { dwellMs }),
    ...(quietGateMs !== null && { quietGateMs }),
  };
};

export const C1_CONFIG = resolveC1Config(
  typeof window === "undefined" ? "" : window.location.search,
  import.meta.env.DEV,
);
