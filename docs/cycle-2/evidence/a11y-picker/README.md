# Save format picker — accessibility evidence

Gathered 2026-09-23 from the live demo at `g1-v0.2.2-beta.1`, the same page a reviewer would open. Both themes. Raw data in `results.json`, focus-ring captures in `picker-focus-{light,dark}.png`, script in the session scratchpad.

**This is evidence, not a sign-off.** Aisling built the picker, so under the 9/20 decision the builder can't sign off their own check. The point of this pack is that whoever takes the review (PRD §10 assigns QA to Cornell; Lawrence offered) spends the time on judgement, not legwork.

**What a computed tree is not.** Accessible names and roles below come from Chrome's own accessibility tree over CDP — what NVDA or VoiceOver is handed, not what a person hears. Announcement order, verbosity and whether anything is said twice in practice still need ears. Lawrence has been testing in VoiceOver; this complements that, it doesn't replace it.

## What passes

| Check | Result |
| :-- | :-- |
| Button accessible names | `Save as Excalidraw` · `Save as PNG` · `Save as SVG` — exact, all `role=button` |
| Group | `role=group`, name `File format` |
| Focus on open, from the top-right button | Lands on **Save as Excalidraw**, the first card |
| Focus on open, from the card | Lands on **Save as Excalidraw** — same, both surfaces |
| Tab containment | 6 presses cycle the three buttons and never leave the dialog |
| Escape | Closes the dialog and returns focus to the **Save to file** button that opened it |
| Empty canvas | PNG and SVG report `disabled: true`; "Draw something first." is shown |
| "Recommended" badge | 3 in the DOM, 2 `aria-hidden`, exposed exactly once |
| Card announcement | One live region, reading "Save your drawing. Download a copy to your device so you can keep working with it later. Save to file, or dismiss." |
| axe-core (wcag2a/2aa/21a/21aa) | **0 violations**, 13 passes, both themes |
| Page errors | None |

### Contrast, label on its own fill

| Card              | Light  | Dark   | AA (4.5:1) |
| :---------------- | :----- | :----- | :--------- |
| Excalidraw file   | 7.68:1 | 7.68:1 | pass       |
| PNG image         | 4.68:1 | 8.47:1 | pass       |
| SVG image         | 4.62:1 | 4.62:1 | pass       |
| Recommended badge | 7.48:1 | 7.48:1 | pass       |

Excalidraw's greys don't flip between themes, so the fixed pairs hold in both.

## What the reviewer should decide

### 1. The dialog has no accessible name — upstream, affects every dialog

Computed: `role=dialog`, **name empty**. Jill's checklist asks that "the dialog should be announced with its title"; today it is announced as an unnamed dialog.

Root cause is not ours. `packages/excalidraw/components/Dialog.tsx` passes a hardcoded `labelledBy="dialog-title"` to `Modal`, while the heading it means to point at is rendered with a generated id, `${id}-dialog-title`. Verified in the live build:

```
aria-labelledby   "dialog-title"
target exists     false
actual heading id "VZ_0nqiQIVNuzUzCdwRMW-dialog-title"
heading text      "Save to file"
```

Every `[role="dialog"]` on the page carries the same dangling reference, so this is stock Excalidraw behaviour, not something the picker introduced. It is also why axe returns `aria-valid-attr-value` as _incomplete_ rather than clean.

The fix is one line — `labelledBy={`${id}-dialog-title`}` — but it touches upstream code in `packages/`, which is outside what Carlos scoped this cycle. **Decision needed:** fix it for the handoff, or record it as a known upstream defect with the one-line patch attached.

### 2. Focus is dropped to `<body>` after saving from the card

Saving from the card clears the card, so the button that opened the dialog no longer exists. The dialog restores focus only `if (opener.current?.isConnected)`, which is false in that path, and focus falls back to `<body>` — a keyboard user is returned to the top of the document with no position.

Measured, both themes: file downloads, dialog closes, card clears, then `document.activeElement` is `body`.

Saving from the top-right button is unaffected: that button survives, and focus returns to it.

Suggested fix, ours and small: when the opener has gone, send focus to the persistent save button instead, which is always present in the nudge arm.

### 3. Should "Recommended" be part of a control's accessible name?

The badge is text beside the icon, not inside any button. Tab through the picker and you hear "Save as Excalidraw / PNG / SVG" and nothing else — the recommendation reaches someone reading the dialog as text, not someone navigating by control.

Not a WCAG failure, and deliberately kept out of the buttons so it is not announced three times. But it is a parity gap and it is the reviewer's call. Lawrence's approved copy had "Recommended" as the first word of the description, which would have put it in the reading order but not in the button name either.

## Reproducing

The script drives the live demo, so it needs no local build:

```
node a11y-picker.js
```

It writes `results.json` and the two focus captures. `axe.min.js` is read from the repo's own `node_modules/axe-core`.
