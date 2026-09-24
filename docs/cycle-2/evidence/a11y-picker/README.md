# Save format picker — accessibility evidence

Re-gathered 2026-09-23 16:45 EDT from the live demo at `g1-v0.2.4-beta.1` (commit `c85b143e`), both themes. Raw data in `results.json`, focus-ring captures in `picker-focus-{light,dark}.png`, script beside them.

**This is evidence, not a sign-off.** Aisling built the picker, so under the 9/20 decision the builder can't sign off their own check. §12 still needs a name.

**What a computed tree is not.** Accessible names and roles below come from Chrome's own accessibility tree over CDP — what NVDA or VoiceOver is handed, not what a person hears. Announcement order, verbosity and whether anything is said twice in practice still need ears. Lawrence has been testing in VoiceOver; this complements that, it doesn't replace it.

## What passes

| Check | Result |
| :-- | :-- |
| Button accessible names | `Save as Excalidraw, recommended` · `Save as PNG` · `Save as SVG`, all `role=button` |
| Visible labels | `Save as Excalidraw` · `Save as PNG` · `Save as SVG` — each name contains its visible label (WCAG 2.5.3) |
| Group | `role=group`, name `File format` |
| Focus on open, from either surface | Lands on the first card |
| Tab containment | 6 presses cycle the three buttons and never leave the dialog |
| Escape | Closes and returns focus to the control that opened it |
| **Focus after saving from the card** | **Returns to the persistent save button and stays there** — measured through t+2s |
| Focus after saving from the button | Returns to that button |
| Empty canvas | PNG and SVG report `disabled: true`; "Draw something first." is shown |
| "Recommended" badge | 3 in the DOM, 2 `aria-hidden`, exposed once as text, and named once in the recommended button's name |
| Card announcement | One live region, "Save your drawing… Save to file, or dismiss." |
| axe-core (wcag2a/2aa/21a/21aa) | **0 violations**, 13 passes, both themes |
| Page errors | None |

### Contrast, label on its own fill

| Card              | Light  | Dark   | AA (4.5:1) |
| :---------------- | :----- | :----- | :--------- |
| Excalidraw file   | 7.68:1 | 7.68:1 | pass       |
| PNG image         | 4.62:1 | 4.62:1 | pass       |
| SVG image         | 4.68:1 | 8.47:1 | pass       |
| Recommended badge | 7.48:1 | 7.48:1 | pass       |

Excalidraw's greys don't flip between themes, so the fixed pairs hold in both.

## Closed since the first pass

**Focus was dropped to `<body>` after saving from the card.** Fixed in PR #21, live and verified above.

Worth recording how it went, because the first fix did not work. PR #16 added a fallback that checked whether the opener was still connected — but `onSaved` and `onClose` are state setters, so React had not re-rendered when the check ran and the card's button was still in the document. It focused that button every time, and focus fell to `<body>` when React removed it. The unit test passed because it removed the opener synchronously, which the real app never does. It was caught by re-running this evidence against the deployed build and finding `<body>` on a build that supposedly contained the fix. The test now defers the removal the way React does.

**The Recommended badge was not in any control's accessible name.** Fixed in PR #16, on Lawrence's proposal, live and verified above. Implemented as his intent rather than his literal line: `IconButton`'s `showAriaLabel` renders the accessible name _as_ the visible label, so setting `aria-label` alone would also have printed ", recommended" on the button face.

## Still open

**The dialog has no accessible name — upstream, affects every dialog.** Computed: `role=dialog`, **name empty**. Jill's checklist asks that the dialog be announced with its title; today it is announced as an unnamed dialog.

`packages/excalidraw/components/Dialog.tsx` passes a hardcoded `labelledBy="dialog-title"` to `Modal`, while the heading it means to point at is rendered with a generated id. Verified on the live build:

```
aria-labelledby   "dialog-title"
target exists     false
actual heading id "<generated>-dialog-title"
heading text      "Save to file"
```

Every `[role="dialog"]` on the page carries the same dangling reference, so it is stock Excalidraw behaviour, not something the picker introduced. It is also why axe returns `aria-valid-attr-value` as _incomplete_ rather than clean.

The one-line fix, with tests, is open as **PR #17** and deliberately held: it touches `packages/`, which Carlos placed out of scope for this cycle, and merging it widens this fork's diff against upstream Excalidraw. **Decision needed:** fix it, or hand over the patch as a known upstream defect.

## Reproducing

The script drives the live demo, so it needs no local build:

```
node a11y-picker.js
```

It writes `results.json` and the two focus captures. `axe.min.js` is read from the repo's own `node_modules/axe-core`.
