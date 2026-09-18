// Plain testing-library, not the repo's `renderApp` helper: that one mounts the
// whole editor and waits for its canvases, which a standalone component never
// produces.
import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";

import { C1_DEFAULTS, resolveC1Config } from "../persistent-save/config";
import {
  PROMPT_COPY,
  SaveDrawingPrompt,
} from "../persistent-save/SaveDrawingPrompt";

describe("SaveDrawingPrompt", () => {
  const setup = (
    props: Partial<React.ComponentProps<typeof SaveDrawingPrompt>> = {},
  ) => {
    const onSave = vi.fn();
    const onDismiss = vi.fn();
    const { container } = render(
      <SaveDrawingPrompt onSave={onSave} onDismiss={onDismiss} {...props} />,
    );
    return { onSave, onDismiss, container };
  };

  it("renders the approved copy", () => {
    setup();

    expect(screen.getByText(PROMPT_COPY.headline)).toBeTruthy();
    expect(screen.getByText(PROMPT_COPY.body)).toBeTruthy();
    expect(screen.getByRole("button", { name: PROMPT_COPY.save })).toBeTruthy();
  });

  it("offers a single action — no Excalidraw+ link", () => {
    const { container } = setup();

    // Carlos excluded the Plus link entirely on 2026-09-18, so a link element
    // appearing here at all is a regression, not a styling question.
    expect(container.querySelectorAll("a").length).toBe(0);
    expect(container.querySelectorAll("button").length).toBe(2); // save + dismiss
  });

  it("announces itself politely without stealing focus", () => {
    const { container } = setup();
    const region = container.querySelector(".c1-save-prompt")!;

    expect(region.getAttribute("role")).toBe("status");
    expect(region.getAttribute("aria-live")).toBe("polite");
    expect(region.textContent).toContain(PROMPT_COPY.announcement);
    // Focus stays wherever the user left it — on the canvas.
    expect(document.activeElement).toBe(document.body);
  });

  it("gives the dismiss control an accessible name", () => {
    setup();

    expect(
      screen.getByRole("button", { name: PROMPT_COPY.dismissLabel }),
    ).toBeTruthy();
  });

  it("saves and dismisses through the callbacks", () => {
    const { onSave, onDismiss } = setup();

    fireEvent.click(screen.getByRole("button", { name: PROMPT_COPY.save }));
    expect(onSave).toHaveBeenCalledTimes(1);

    fireEvent.click(
      screen.getByRole("button", { name: PROMPT_COPY.dismissLabel }),
    );
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("dismisses on Escape when focus is inside the prompt", () => {
    const { onDismiss, container } = setup();

    fireEvent.keyDown(container.querySelector(".c1-save-prompt")!, {
      key: "Escape",
    });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("ignores Escape raised outside it, so canvas Escape still works", () => {
    const { onDismiss } = setup();

    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("anchors where the config says", () => {
    const { container } = setup({ anchor: "lower-right" });

    const el = container.querySelector(".c1-save-prompt")!;
    expect(el.classList.contains("c1-save-prompt--lower-right")).toBe(true);
    expect(el.classList.contains("c1-save-prompt--upper-right")).toBe(false);
  });
});

describe("prompt anchor config", () => {
  it("defaults to the position Carlos asked for", () => {
    expect(C1_DEFAULTS.anchor).toBe("upper-right");
  });

  it("can be flipped from the URL in dev, for QA and the A/B follow-up", () => {
    expect(resolveC1Config("?pos=lower-right", true).anchor).toBe(
      "lower-right",
    );
  });

  it("ignores an unknown anchor rather than rendering nowhere", () => {
    expect(resolveC1Config("?pos=middle-of-nowhere", true).anchor).toBe(
      C1_DEFAULTS.anchor,
    );
  });

  it("ignores the anchor override in production", () => {
    expect(resolveC1Config("?pos=lower-right", false).anchor).toBe(
      C1_DEFAULTS.anchor,
    );
  });
});
