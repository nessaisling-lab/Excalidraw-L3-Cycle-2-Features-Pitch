import { API } from "@excalidraw/excalidraw/tests/helpers/api";

import { STORAGE_KEYS } from "../app_constants";
import {
  clearC1Record,
  initC1Session,
  isPromptSpent,
  markC1State,
  readC1Record,
  subscribeToC1Changes,
} from "../persistent-save/c1State";
import { C1_DEFAULTS, resolveC1Config } from "../persistent-save/config";
import { resolveDemoArm } from "../persistent-save/demoArm";
import {
  createDwellTracker,
  hasQualifyingElement,
  isQualifyingElement,
} from "../persistent-save/trigger";

import type { C1Record } from "../persistent-save/c1State";

const RUNNING = { visible: true, blocked: false };

const seedRecord = (record: C1Record) =>
  localStorage.setItem(STORAGE_KEYS.LOCAL_STORAGE_C1, JSON.stringify(record));

beforeEach(() => {
  localStorage.clear();
});

describe("C1 config", () => {
  it("overrides dwell and quiet gate from the URL in dev", () => {
    const config = resolveC1Config("?dwell=3&quiet=0", true);

    expect(config.dwellMs).toBe(3000);
    expect(config.quietGateMs).toBe(0);
    // untouched keys keep their defaults
    expect(config.sessionGapMs).toBe(C1_DEFAULTS.sessionGapMs);
  });

  it("ignores URL overrides in production", () => {
    // a URL must never change the timing real visitors get — the A/B result
    // depends on everyone in an arm being treated the same
    expect(resolveC1Config("?dwell=3&quiet=0", false)).toEqual(C1_DEFAULTS);
  });

  it("ignores values that aren't usable numbers", () => {
    const config = resolveC1Config("?dwell=soon&quiet=-5", true);

    expect(config.dwellMs).toBe(C1_DEFAULTS.dwellMs);
    expect(config.quietGateMs).toBe(C1_DEFAULTS.quietGateMs);
  });
});

describe("qualifying element", () => {
  it("accepts an element at or above the size floor on either axis", () => {
    expect(
      isQualifyingElement(API.createElement({ width: 10, height: 2 })),
    ).toBe(true);
    expect(
      isQualifyingElement(API.createElement({ width: 2, height: 40 })),
    ).toBe(true);
  });

  it("rejects a stray click or a tiny nudge", () => {
    expect(
      isQualifyingElement(API.createElement({ width: 4, height: 4 })),
    ).toBe(false);
  });

  it("accepts any text with content, regardless of size", () => {
    const label = API.createElement({
      type: "text",
      text: "hi",
      width: 6,
      height: 6,
    });

    expect(isQualifyingElement(label)).toBe(true);
  });

  it("rejects empty and whitespace-only text", () => {
    expect(
      isQualifyingElement(
        API.createElement({ type: "text", text: "   ", width: 80, height: 25 }),
      ),
    ).toBe(false);
  });

  it("rejects deleted elements", () => {
    expect(
      isQualifyingElement(
        API.createElement({ width: 100, height: 100, isDeleted: true }),
      ),
    ).toBe(false);
  });

  it("finds one qualifying element among noise", () => {
    expect(
      hasQualifyingElement([
        API.createElement({ width: 1, height: 1 }),
        API.createElement({ width: 200, height: 120 }),
      ]),
    ).toBe(true);

    expect(
      hasQualifyingElement([API.createElement({ width: 1, height: 1 })]),
    ).toBe(false);
  });
});

describe("dwell tracker", () => {
  it("fires once the dwell period has elapsed", () => {
    const tracker = createDwellTracker();

    expect(tracker.update(0, RUNNING)).toBe(false);
    expect(tracker.update(14_000, RUNNING)).toBe(false);
    expect(tracker.update(15_000, RUNNING)).toBe(true);
  });

  it("fires only once", () => {
    const tracker = createDwellTracker();

    tracker.update(0, RUNNING);
    expect(tracker.update(20_000, RUNNING)).toBe(true);
    expect(tracker.update(40_000, RUNNING)).toBe(false);
  });

  it("does not count time while the tab is hidden", () => {
    const tracker = createDwellTracker();

    tracker.update(0, RUNNING);
    tracker.update(5_000, RUNNING); // 5s banked
    tracker.update(6_000, { visible: false, blocked: false }); // away…
    tracker.update(60_000, { visible: false, blocked: false }); // …a long while
    tracker.update(61_000, RUNNING); // back: re-anchors, credits nothing

    expect(tracker.accumulatedMs).toBe(5_000);
    expect(tracker.update(71_000, RUNNING)).toBe(true);
  });

  it("does not count time while a menu or dialog is open", () => {
    const tracker = createDwellTracker();

    tracker.update(0, RUNNING);
    tracker.update(30_000, { visible: true, blocked: true });
    tracker.update(60_000, { visible: true, blocked: true });

    expect(tracker.accumulatedMs).toBe(0);
    expect(tracker.update(60_100, RUNNING)).toBe(false);
  });

  it("holds the prompt until the canvas has been quiet", () => {
    const tracker = createDwellTracker();

    tracker.update(0, RUNNING);
    tracker.noteInput(19_000); // still drawing as the dwell elapses

    expect(tracker.update(20_000, RUNNING)).toBe(false); // 1s of quiet
    expect(tracker.update(20_500, RUNNING)).toBe(false); // 1.5s
    expect(tracker.update(21_000, RUNNING)).toBe(true); // 2s — clear
  });

  it("starts over after a reset", () => {
    const tracker = createDwellTracker();

    tracker.update(0, RUNNING);
    tracker.update(20_000, RUNNING);
    tracker.reset();

    expect(tracker.accumulatedMs).toBe(0);
    expect(tracker.update(20_000, RUNNING)).toBe(false);
  });
});

describe("C1 session record", () => {
  it("treats a clean profile as a first-time visitor", () => {
    const session = initC1Session({ hasSceneData: false, now: 1000 });

    expect(session.isFirstTimeVisitor).toBe(true);
    expect(session.storageAvailable).toBe(true);
    expect(readC1Record()).toEqual({
      firstSeenAt: 1000,
      lastActiveAt: 1000,
      state: "eligible",
    });
  });

  it("treats a reload inside the session gap as the same first session", () => {
    seedRecord({ firstSeenAt: 0, lastActiveAt: 0, state: "eligible" });

    const session = initC1Session({ hasSceneData: true, now: 29 * 60 * 1000 });

    expect(session.isFirstTimeVisitor).toBe(true);
    // autosave has already written a scene by now; the record is what decides
    expect(session.record?.firstSeenAt).toBe(0);
  });

  it("treats a return after the session gap as a returning visitor", () => {
    seedRecord({ firstSeenAt: 0, lastActiveAt: 0, state: "eligible" });

    expect(
      initC1Session({ hasSceneData: true, now: 31 * 60 * 1000 })
        .isFirstTimeVisitor,
    ).toBe(false);
  });

  it("treats a pre-existing drawing with no record as a returning visitor", () => {
    const session = initC1Session({ hasSceneData: true, now: 1000 });

    expect(session.isFirstTimeVisitor).toBe(false);
    expect(readC1Record()).toBeNull();
  });

  it("reports storage as unavailable when the record can't be written", () => {
    // setupTests swaps localStorage for a plain object, so spy on the instance
    const setItem = vi
      .spyOn(window.localStorage, "setItem")
      .mockImplementation(() => {
        throw new DOMException("QuotaExceededError");
      });
    vi.spyOn(console, "error").mockImplementation(() => {});

    // the prompt must stay hidden: we couldn't honour a permanent dismissal
    expect(initC1Session({ hasSceneData: false }).storageAvailable).toBe(false);

    setItem.mockRestore();
    vi.mocked(console.error).mockRestore();
  });

  it("spends the prompt once it has been shown, dismissed or saved", () => {
    expect(isPromptSpent(null)).toBe(false);
    expect(
      isPromptSpent({ firstSeenAt: 0, lastActiveAt: 0, state: "eligible" }),
    ).toBe(false);

    for (const state of ["shown", "dismissed", "saved"] as const) {
      expect(isPromptSpent({ firstSeenAt: 0, lastActiveAt: 0, state })).toBe(
        true,
      );
    }
  });

  it("advances the stored state", () => {
    initC1Session({ hasSceneData: false, now: 1000 });

    expect(markC1State("dismissed", 2000)).toBe(true);
    expect(readC1Record()).toEqual({
      firstSeenAt: 1000,
      lastActiveAt: 2000,
      state: "dismissed",
    });
  });

  it("does nothing when there is no record to advance", () => {
    expect(markC1State("shown")).toBe(false);
  });

  it("can be forgotten, so the prompt becomes eligible again", () => {
    initC1Session({ hasSceneData: false, now: 1000 });
    markC1State("dismissed", 2000);
    expect(isPromptSpent(readC1Record())).toBe(true);

    clearC1Record();

    expect(readC1Record()).toBeNull();
    expect(
      initC1Session({ hasSceneData: false, now: 3000 }).isFirstTimeVisitor,
    ).toBe(true);
  });

  it("ignores a malformed record rather than throwing at startup", () => {
    localStorage.setItem(STORAGE_KEYS.LOCAL_STORAGE_C1, "{{ not json");
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(readC1Record()).toBeNull();
    expect(initC1Session({ hasSceneData: false }).isFirstTimeVisitor).toBe(
      true,
    );

    vi.mocked(console.error).mockRestore();
  });

  it("tells other tabs when the prompt is spent", () => {
    const onChange = vi.fn();
    const unsubscribe = subscribeToC1Changes(onChange);

    window.dispatchEvent(
      new StorageEvent("storage", {
        key: STORAGE_KEYS.LOCAL_STORAGE_C1,
        newValue: JSON.stringify({
          firstSeenAt: 0,
          lastActiveAt: 0,
          state: "dismissed",
        }),
      }),
    );

    expect(onChange).toHaveBeenCalledWith({
      firstSeenAt: 0,
      lastActiveAt: 0,
      state: "dismissed",
    });

    onChange.mockClear();
    window.dispatchEvent(
      new StorageEvent("storage", { key: "unrelated-key", newValue: "{}" }),
    );
    expect(onChange).not.toHaveBeenCalled();

    unsubscribe();
  });
});

describe("demo A/B arm", () => {
  it("shows the treatment by default — that is what the demo is for", () => {
    expect(resolveDemoArm("", true, null).arm).toBe("nudge");
  });

  it("switches to today's experience on ?arm=control", () => {
    const { arm, shouldStore } = resolveDemoArm("?arm=control", true, null);

    expect(arm).toBe("control");
    expect(shouldStore).toBe(true);
  });

  it("remembers the choice, so it survives a reload without the parameter", () => {
    // Whoever is demoing shouldn't have to keep the parameter in the URL.
    const { arm, shouldStore } = resolveDemoArm("", true, "control");

    expect(arm).toBe("control");
    expect(shouldStore).toBe(false);
  });

  it("lets the URL override what was remembered", () => {
    expect(resolveDemoArm("?arm=nudge", true, "control").arm).toBe("nudge");
  });

  it("ignores an arm it does not recognise", () => {
    expect(resolveDemoArm("?arm=sideways", true, null).arm).toBe("nudge");
    expect(resolveDemoArm("?arm=sideways", true, "control").arm).toBe(
      "control",
    );
  });

  it("is fixed in a real production build", () => {
    // The live experiment assigns the arm, never the address bar — and a
    // stored value from some earlier build must not leak into it either.
    expect(resolveDemoArm("?arm=control", false, "control")).toEqual({
      arm: "nudge",
      shouldStore: false,
    });
  });
});
