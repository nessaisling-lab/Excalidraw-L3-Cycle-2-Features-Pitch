# Combined save/export — roadmap mocks (CSE series)

Concept mockups for folding saving and exporting into one dialog. **Out of scope for Cycle 2** and dependent on the picker A/B result (roadmap §4). Nothing here is built.

Filed to Jill's convention, 2026-09-22:

- `CSE-NN-short-description.png` — clean
- `CSE-NN-short-description-annotated.png` — the same image with numbered markers only. Every note lives in the table below, never on the image
- No client quotes anywhere in this folder

Each image is a DOM mockup rendered on the live demo, built from the real dialogs' own components. The working history — all iterations, including the ones not carried forward — stays in `../../evidence/mockups/round{2,3,4}/`.

## Appendix D — Ref / File / What it shows / Status

| Ref | File | What it shows | Status |
| :-- | :-- | :-- | :-- |
| CSE-01 | `CSE-01-baseline-save-to-dialog.png` | Baseline, not a proposal: today's main-menu "Save to…" dialog as it ships. Three cards — Save to disk, Shareable link, Excalidraw+ — with "Export" wording inside a menu labelled Save, which is the mismatch the cross-analysis identified | Internal, not shown |
| CSE-02 | `CSE-02-baseline-export-image-dialog.png` | Baseline, not a proposal: today's "Export image" dialog. Preview left, picture settings right, and nothing about saving an editable file. 440px tall — the height every proposal below is measured against | Internal, not shown |
| CSE-03 | `CSE-03-save-to-reworked.png` · `-annotated.png` | The "Save to…" dialog reworked in place, without merging it with export. **1** Recommended badge above the icon, so it can't push its column out of line. **2** The editability promise stated on the card that makes it. **3** Three short parallel verbs — Save file · Share link · Save to cloud — replacing the "Export" wording. **4** Excalidraw+ described by what you get, not by the product name alone. Measured: all three columns share a row | Internal, not shown |
| CSE-04 | `CSE-04-combined-cards.png` · `-annotated.png` | The combined dialog, first form. **1** One title, "Save & export". **2** A "Keep it editable" section holding the two editable destinations as cards. **3** The picture preview — which describes only the export half below it, not the cards beside it. **4** Today's export settings, unchanged. 692px tall | Internal, not shown |
| CSE-05 | `CSE-05-combined-saving-on-top.png` · `-annotated.png` | The combined dialog with saving moved to a full-width band on top. **1** The two editable destinations as rows across the width. **2** The divider that separates saving from exporting. **3** The preview now sits with the export settings alone, next to the only thing it describes. **4** Export settings unchanged; the height is set by the preview, so this half has room to spare. 620px | Internal, not shown |
| CSE-06 | `CSE-06-combined-two-tabs.png` · `-annotated.png` | The combined dialog as two tabs. **1** The tab bar; the Save tab is shown and the Export tab is today's dialog untouched. **2** No picture is on screen while you choose how to save, so the preview never has to explain itself — at the cost of hiding half the dialog behind a click. **3** Recommended badge. 405px, the only form shorter than today | Internal, not shown |
| CSE-07 | `CSE-07-combined-one-primary.png` · `-annotated.png` | The combined dialog with a single default action. **1** Save file, full width and the only primary in the save half. **2** Excalidraw+ stepped down to a text link. **3** PNG and SVG exactly where they are today. **4** Preview unchanged. 603px | Internal, not shown |
| CSE-08 | `CSE-08-combined-rows.png` | Considered and not carried forward: the two destinations as stacked rows inside the existing right-hand column. Keeps the preview next to content it doesn't describe, and at 700px it is the tallest of the four. Kept for the record | Internal, not shown |

**Nothing in this series has been shown to Carlos.** He was told on 2026-09-22 that a combined save-and-export dialog exists as a mockup; he has not seen these images. If any are shown, change that row's status to "Shown to Carlos (date), no decision" on the day it happens.

## Direction

Ranked by Aisling, 2026-09-22, most to least: **CSE-05**, then **CSE-06**, then **CSE-07**. CSE-08 is not in the running. CSE-06 is the only form that removes the preview mismatch outright and the only one shorter than today, but it hides half the dialog behind a click, which is close to the opposite of the reason for merging the two.
