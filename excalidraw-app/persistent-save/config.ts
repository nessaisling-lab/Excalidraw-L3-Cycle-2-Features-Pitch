/**
 * Tunable constants for the First-Save Moment (C1).
 *
 * These live in one place because several of them are still being settled with
 * the client, so a ruling in the PRD stays a one-line change here rather than a
 * hunt through the component. Dev and QA can override the timings from the URL —
 * a 15-second wait per QA pass is otherwise unworkable.
 */

/**
 * Where the prompt sits. Carlos moved it to the right-hand side on 2026-09-18
 * and asked for a Lyssna read on upper vs lower before committing, so both
 * live here as named anchors rather than one hardcoded spot — when the test
 * comes back it is a one-line change, not a rewrite.
 */
export type PromptAnchor = "upper-right" | "lower-right";

export const PROMPT_ANCHORS: readonly PromptAnchor[] = [
  "upper-right",
  "lower-right",
];

export type C1Config = {
  /** Visible-tab time a visitor must accumulate after the first element. */
  dwellMs: number;
  /** Quiet period after the last input before the prompt may appear. */
  quietGateMs: number;
  /** A reload within this window counts as the same first session. */
  sessionGapMs: number;
  /** Minimum width or height, in scene px, for an element to qualify. */
  minElementSize: number;
  /** Which corner the prompt anchors to. Pending the Lyssna A/B result. */
  anchor: PromptAnchor;
};

export const C1_DEFAULTS: C1Config = {
  dwellMs: 15_000,
  quietGateMs: 2_000,
  sessionGapMs: 30 * 60 * 1000,
  minElementSize: 10,
  // Carlos's stated preference; not final until the A/B read lands.
  anchor: "upper-right",
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
  const requested = params.get("pos");
  const anchor = PROMPT_ANCHORS.find((a) => a === requested) ?? null;

  return {
    ...defaults,
    ...(dwellMs !== null && { dwellMs }),
    ...(quietGateMs !== null && { quietGateMs }),
    ...(anchor !== null && { anchor }),
  };
};

export const C1_CONFIG = resolveC1Config(
  typeof window === "undefined" ? "" : window.location.search,
  import.meta.env.DEV,
);

/**
 * Whether the prompt renders at all.
 *
 * On in development, off in production builds — the PRD's rollout rule, so an
 * unfinished surface can't reach real visitors. `VITE_APP_ENABLE_C1=true`
 * turns it on for a deliberate demo build.
 *
 * This is a plain on/off gate, not the A/B switch. That one is Cornell's, and
 * it replaces this when it lands.
 */
export const C1_ENABLED =
  import.meta.env.DEV || import.meta.env.VITE_APP_ENABLE_C1 === "true";
