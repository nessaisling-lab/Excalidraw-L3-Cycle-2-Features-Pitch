# Stage 1 — First-Save prompt positioning spec

**From:** Aisling (engineering, C1 build lead) **For:** Jillian (PRD, Lyssna), Cornell (QA) **Last updated:** 2026-09-18, after the 1pm check-in with Carlos

> **Superseded recommendation.** An earlier version of this document recommended x 228, y 76 — beside the shape-properties panel on the left. Carlos moved the card to the right-hand side at the 1pm check-in, so that recommendation no longer stands. The measurements it rested on are unchanged and still correct; only the card's own position moved. They are kept in §2 because they are what the left side was ruled out on.

---

## 1. Where this stands

|  |  |
| :-- | :-- |
| Card design | **Approved** — "Option E", Carlos, 2026-09-18 |
| Excalidraw+ link | **Excluded entirely**, Carlos, 2026-09-18 |
| Card position | **Not settled.** Carlos wants a Lyssna read on upper-right vs lower-right first |
| Dwell | 15s — Aisling heard Carlos confirm it at the check-in; `decisions.md` records it as still open. Needs reconciling |

The build is not waiting on the position. The component takes a named anchor from config, so whichever way the A/B goes is a one-line change, and none of the trigger logic contains a coordinate at all.

---

## 2. Measurements

Live dev build at 1440 × 900, logged out, storage cleared, one element drawn and still selected — the state the prompt actually fires in.

| Element                                         | Position      | Size      |
| :---------------------------------------------- | :------------ | :-------- |
| Menu button                                     | x 16, y 16    | 36 × 36   |
| Toolbar island                                  | x 449, y 16   | 542 × 44  |
| Top-right cluster (Excalidraw+, Share, sidebar) | x 1219, y 16  | 157 × 36  |
| Bottom-right controls (help, encryption)        | x 1388, y 848 | 36 × 36   |
| Welcome menu hint — empty canvas only           | x 26, y 56    | 320 × 94  |
| Shape-properties panel — after drawing          | x 16, y 76    | 200 × 642 |

**Why the left side was ruled out.** The welcome layer's hint and the shape-properties panel occupy the same slot. The hint is absolutely positioned and disappears on the first element; the panel then fills that space for as long as anything is selected — which is the normal post-draw state. A card there lands on top of it. See `evidence/09-prompt-collision-vacated-slot.png`.

**Why nothing on the toolbar has to move, wherever the card ends up.** Mounted as a normal-flow child of the top bar, a 340px card pushes the properties panel down 184px and, below roughly 1424px viewport width, widens the left grid column and squeezes the toolbar 10px. Mounted absolutely it costs the layout nothing at any width. The component is absolutely positioned. See `evidence/11-toolbar-shift-flow-child-1366.png`.

---

## 3. The two candidates

Both rendered with the approved card — real copy, shadow and colours — so the clean exports work as Lyssna stimuli directly.

|  | Position | Clears |
| :-- | :-- | :-- |
| **A — upper right** | x 1036, y 68 | 16px below the top-right button cluster |
| **B — lower right** | x 1036, y 691 | 16px above the help and encryption buttons |

Both 340 × 141. Stimuli are `evidence/12-...-clean.png` and `evidence/14-...-clean.png`. The annotated `13-` and `15-` copies are for Slack only — arrows and labels bias where participants look.

**Card height is 141px**, measured on the real render. That matches the design estimate exactly, so the approved copy fits with no adjustment needed.

---

## 4. What the component actually does

Built, and running on the demo deploy. It anchors rather than hardcoding a coordinate:

| Anchor        | CSS                                    |
| :------------ | :------------------------------------- |
| `upper-right` | `top: 68px; inset-inline-end: 1rem`    |
| `lower-right` | `bottom: 68px; inset-inline-end: 1rem` |

`?pos=lower-right` flips it in dev builds, for QA and the A/B follow-up. It is ignored in production, like the dwell overrides.

**One deliberate difference from the stimuli.** The component sits at the app's standard 16px gutter, so its right edge is 48px further right than in the A/B composites, which were aligned to the button cluster's right edge. Every other piece of app furniture uses that gutter, so the component matches the app rather than the mockup. This should not affect an upper-vs-lower read, but if pixel parity with the stimulus matters, say so and the component moves.

---

## 5. Accessibility — three failures found and fixed

Contrast was measured on the real render in both themes, not read off the spec. The approved colours fail WCAG AA in three places:

|                                         | Measured | Needed |      |
| :-------------------------------------- | :------- | :----- | :--- |
| Body grey `#7A7A7A` on white            | 4.29:1   | 4.5:1  | fail |
| The same grey on the dark card          | 2.34:1   | 4.5:1  | fail |
| White button text on dark-theme primary | 2.21:1   | 4.5:1  | fail |

13px is not "large text" — that needs 24px, or 18.66px bold — so the full 4.5:1 applies rather than the 3:1 large-text allowance.

The two dark failures happen because **Excalidraw's grey scale does not flip between themes**, and `--color-primary` becomes a light lavender in dark mode, where white text on it is unreadable.

**Resolved in the build by using tokens that do flip.** These are the values the design spec should carry:

| Element | Token | Light | Dark |
| :-- | :-- | :-- | :-- |
| Card background | `--island-bg-color` | `#ffffff` | `#232329` |
| Headline | `--text-primary-color` | `#1b1b1f` | `#e3e3e8` |
| Body, dismiss control | `--color-gray-70`, `--color-gray-40` in dark | `#5c5c5c` | `#b8b8b8` |
| Button background | `--color-primary` | `#6965db` | `#a8a5ff` |
| Button text | `--color-surface-lowest` | `#ffffff` | `#121212` |

Measured after the fix: **17.17 / 6.69 / 4.68 / 6.69** in light, **12.22 / 7.88 / 8.47 / 7.88** in dark. All pass.

Worth knowing: the design's font stack and button colour were already the app's own tokens — `--ui-font` is `Assistant, system-ui, ...` and `--color-primary` is `#6965db`. Building against tokens rather than hex costs nothing, and it is what makes the dark theme work.

Also in the build, against §6a of the PRD: Escape dismisses only while focus is inside the prompt, so canvas Escape is untouched; both controls carry a 44 × 44 hit area, verified by clicking outside the visible glyph; `role="status"` with `aria-live="polite"`, announced once, no focus stolen; no animation under `prefers-reduced-motion`; nothing renders below 768px.

---

## 6. Consequences for the PRD

**§3, User Journey 1** still reads:

> [P1] User sees the prompt in the space vacated by the welcome layer, without a new dominant UI surface

That space belongs to the properties panel whenever the prompt can fire, and Carlos has moved the card to the right regardless. Suggested rewording:

> [P1] User sees the prompt anchored to a canvas corner, clear of the toolbar, the shape-properties panel and the bottom-row controls, without a new dominant UI surface and without displacing existing controls

**Instrumentation:** `plus_link_click` now has no event source, since the Plus link is excluded from the prompt entirely. It should come out of the event list rather than sit dormant.

---

## 7. Evidence

| File | Shows |
| :-- | :-- |
| `08-post-draw-properties-panel.png` | The real post-draw state, unannotated |
| `09-prompt-collision-vacated-slot.png` | Why the left side was ruled out |
| `10-prompt-recommended-placement.png` | The superseded left-side placement |
| `11-toolbar-shift-flow-child-1366.png` | What a normal-flow card does at 1366px |
| `12` / `13` | Position A, clean and annotated |
| `14` / `15` | Position B, clean and annotated |
| `16` / `17` | The built component running, light and dark theme |
| `19-live-pages-demo.png` | The component on the live demo build |
| `22` / `23` | Demo-build labelling and its disabled controls |

Reproduce the composites: start the dev server, then `node docs/cycle-2/capture-position-ab.js`.

---

## 8. What the Stage 1 gate still needs

Nothing here is blocked on engineering.

|  | Owner |
| :-- | :-- |
| Lyssna A/B on position, then the final measured spec for the winner | Jillian, then Aisling |
| Dark-theme and contrast values into the design spec — resolved values in §5 | Jillian |
| Dwell 15s: confirmed or not, reconciled in `decisions.md` | Jillian and Aisling |
| **Carlos approves the composite — card and position together** | **Carlos. This is the gate** |
