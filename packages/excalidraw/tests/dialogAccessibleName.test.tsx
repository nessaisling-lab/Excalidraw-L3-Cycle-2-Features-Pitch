import React from "react";

import { Dialog } from "../components/Dialog";
import { Excalidraw } from "../index";

import { render } from "./test-utils";

// A dialog that carries role="dialog" but no accessible name is announced as
// just "dialog". The heading is rendered with the container's generated id, so
// aria-labelledby has to be built from the same id rather than hardcoded.
describe("Dialog accessible name", () => {
  it("points aria-labelledby at the heading that actually exists", async () => {
    const { container } = await render(
      <Excalidraw>
        <Dialog title="Save to file" onCloseRequest={() => {}}>
          <p>body</p>
        </Dialog>
      </Excalidraw>,
    );

    const dialog = container.ownerDocument.querySelector('[role="dialog"]')!;
    const labelledBy = dialog.getAttribute("aria-labelledby");
    const heading = container.ownerDocument.getElementById(labelledBy!);

    expect(labelledBy).toBeTruthy();
    expect(heading).not.toBeNull();
    expect(heading!.textContent).toContain("Save to file");
  });

  it("claims no label when there is no title to name it", async () => {
    const { container } = await render(
      <Excalidraw>
        <Dialog onCloseRequest={() => {}}>
          <p>body</p>
        </Dialog>
      </Excalidraw>,
    );

    const dialog = container.ownerDocument.querySelector('[role="dialog"]')!;

    // A dangling reference is worse than none: it reads as an unnamed dialog
    // either way, but a live one invites "the label is set, so it's fine".
    expect(dialog.getAttribute("aria-labelledby")).toBeNull();
  });
});
