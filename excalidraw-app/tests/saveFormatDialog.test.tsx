import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { vi } from "vitest";

import { exportToBlob, exportToSvg } from "@excalidraw/excalidraw";

import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

import { downloadBlob, downloadScene } from "../persistent-save/downloadScene";
import { PERSISTENT_SAVE_BUTTON_CLASS } from "../persistent-save/PersistentSaveButton";
import {
  SAVE_DIALOG_COPY,
  SaveFormatDialog,
  SaveFormatOptions,
} from "../persistent-save/SaveFormatDialog";
import { SAVE_FORMATS, saveInFormat } from "../persistent-save/saveFormats";

vi.mock("@excalidraw/excalidraw", () => ({
  exportToBlob: vi.fn(async () => new Blob(["png"], { type: "image/png" })),
  exportToSvg: vi.fn(async () => ({ outerHTML: "<svg></svg>" })),
}));

// The real download path has its own tests; here only the routing matters.
vi.mock("../persistent-save/downloadScene", () => ({
  downloadBlob: vi.fn(),
  downloadScene: vi.fn(),
  sceneFilename: (api: ExcalidrawImperativeAPI, extension: string) =>
    `${api.getName() || "Untitled"}.${extension}`,
}));

// <Dialog> needs the whole editor around it; its chrome isn't under test.
vi.mock("@excalidraw/excalidraw/components/Dialog", () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

const api = (elements: unknown[] = [{ id: "rect" }]) =>
  ({
    getSceneElements: () => elements,
    getAppState: () => ({ exportBackground: true }),
    getFiles: () => ({}),
    getName: () => "My diagram",
    setToast: vi.fn(),
  } as unknown as ExcalidrawImperativeAPI);

// The recommended card's accessible name carries a ", recommended" tail, so
// match on the start of the name rather than the whole of it.
const option = (name: string) =>
  screen.getByRole("button", { name: new RegExp(`^${name}`) });

beforeEach(() => {
  vi.clearAllMocks();
});

describe("SaveFormatOptions", () => {
  it("offers the Excalidraw file first, then PNG and SVG, one card each", () => {
    render(<SaveFormatOptions hasContent busy={false} onChoose={() => {}} />);

    expect(
      screen.getAllByRole("heading").map((heading) => heading.textContent),
    ).toEqual(SAVE_FORMATS.map((f) => f.label));
    expect(
      screen.getAllByRole("button").map((b) => b.getAttribute("aria-label")),
    ).toEqual([
      "Save as Excalidraw, recommended",
      "Save as PNG",
      "Save as SVG",
    ]);
    for (const { description } of SAVE_FORMATS) {
      expect(screen.getByText(description)).toBeTruthy();
    }
  });

  it("uses the same card pieces as the main menu's Save to… dialog", () => {
    const { container } = render(
      <SaveFormatOptions hasContent busy={false} onChoose={() => {}} />,
    );

    expect(
      container.querySelector(".ExportDialog--json .ExportDialog-cards"),
    ).not.toBeNull();
    expect(container.querySelectorAll(".Card")).toHaveLength(3);
    expect(container.querySelectorAll(".Card .Card-icon svg")).toHaveLength(3);
  });

  it("hands back the chosen format", () => {
    const onChoose = vi.fn();
    render(<SaveFormatOptions hasContent busy={false} onChoose={onChoose} />);

    fireEvent.click(option("Save as SVG"));

    expect(onChoose).toHaveBeenCalledWith("svg");
  });

  it("holds the image formats on an empty canvas and says why", () => {
    render(
      <SaveFormatOptions hasContent={false} busy={false} onChoose={() => {}} />,
    );

    expect(option("Save as Excalidraw")).not.toBeDisabled();
    expect(option("Save as PNG")).toBeDisabled();
    expect(option("Save as SVG")).toBeDisabled();
    expect(screen.getAllByText(SAVE_DIALOG_COPY.needsContent)).toHaveLength(2);
  });

  it("recommends the Excalidraw file, and says so only once", () => {
    const { container } = render(
      <SaveFormatOptions hasContent busy={false} onChoose={() => {}} />,
    );

    // One badge is read out; the others are spacers that keep the columns
    // level, so they must stay out of the accessibility tree.
    expect(
      screen.getAllByText(SAVE_DIALOG_COPY.recommended, {
        ignore: '[aria-hidden="true"]',
      }),
    ).toHaveLength(1);
    expect(container.querySelectorAll(".c1-save-formats__badge")).toHaveLength(
      3,
    );
    expect(
      container.querySelectorAll(
        '.c1-save-formats__badge--placeholder[aria-hidden="true"]',
      ),
    ).toHaveLength(2);
    expect(
      SAVE_FORMATS.filter((f) => f.recommended).map((f) => f.format),
    ).toEqual(["excalidraw"]);
  });

  it("names the recommendation for a screen reader without printing it on the button", () => {
    // showAriaLabel renders the accessible name as the visible label, so
    // setting aria-label alone would have changed the on-screen text too.
    render(<SaveFormatOptions hasContent busy={false} onChoose={() => {}} />);

    const excalidraw = option("Save as Excalidraw");

    expect(excalidraw.getAttribute("aria-label")).toBe(
      "Save as Excalidraw, recommended",
    );
    expect(excalidraw.textContent).toBe("Save as Excalidraw");
    // WCAG 2.5.3: the accessible name has to contain the visible label.
    expect(excalidraw.getAttribute("aria-label")).toContain(
      excalidraw.textContent,
    );
    expect(option("Save as PNG").getAttribute("aria-label")).toBe(
      "Save as PNG",
    );
  });

  it("states what each format gives you", () => {
    render(<SaveFormatOptions hasContent busy={false} onChoose={() => {}} />);

    expect(screen.getByText("Keeps your shapes editable.")).toBeTruthy();
    expect(screen.getByText("A flat image for sharing.")).toBeTruthy();
    expect(
      screen.getByText("A flat image that stays sharp at any size."),
    ).toBeTruthy();
  });

  it("puts keyboard focus on the first card, not the second", () => {
    render(
      <SaveFormatOptions
        autoFocus
        hasContent
        busy={false}
        onChoose={() => {}}
      />,
    );

    expect(document.activeElement).toBe(option("Save as Excalidraw"));
  });

  it("locks every choice while a save is running", () => {
    render(<SaveFormatOptions hasContent busy onChoose={() => {}} />);

    for (const button of screen.getAllByRole("button")) {
      expect(button).toBeDisabled();
    }
  });
});

describe("saveInFormat", () => {
  it("saves the editable scene through the .excalidraw download", async () => {
    const editor = api();
    await saveInFormat(editor, "excalidraw");

    expect(downloadScene).toHaveBeenCalledWith(editor);
    expect(exportToBlob).not.toHaveBeenCalled();
  });

  it("exports a PNG and downloads it under the drawing's name", async () => {
    await saveInFormat(api(), "png");

    expect(exportToBlob).toHaveBeenCalledWith(
      expect.objectContaining({ mimeType: "image/png" }),
    );
    expect(downloadBlob).toHaveBeenCalledWith(
      expect.any(Blob),
      "My diagram.png",
    );
  });

  it("keeps images flat even when the export dialog left Embed scene on", async () => {
    // The setting persists per browser, and both exporters honour it, so
    // without overriding it the cards would promise a flat image and hand back
    // one with the whole editable scene inside.
    const editor = {
      ...api(),
      getAppState: () => ({ exportBackground: true, exportEmbedScene: true }),
    } as unknown as ExcalidrawImperativeAPI;

    await saveInFormat(editor, "png");
    expect(exportToBlob).toHaveBeenCalledWith(
      expect.objectContaining({
        appState: expect.objectContaining({ exportEmbedScene: false }),
      }),
    );

    await saveInFormat(editor, "svg");
    expect(exportToSvg).toHaveBeenCalledWith(
      expect.objectContaining({
        appState: expect.objectContaining({ exportEmbedScene: false }),
      }),
    );
  });

  it("leaves the user's other export settings alone", async () => {
    const editor = {
      ...api(),
      getAppState: () => ({
        exportBackground: false,
        exportWithDarkMode: true,
      }),
    } as unknown as ExcalidrawImperativeAPI;

    await saveInFormat(editor, "png");

    expect(exportToBlob).toHaveBeenCalledWith(
      expect.objectContaining({
        appState: expect.objectContaining({
          exportBackground: false,
          exportWithDarkMode: true,
        }),
      }),
    );
  });

  it("exports an SVG as an SVG file", async () => {
    await saveInFormat(api(), "svg");

    expect(exportToSvg).toHaveBeenCalled();
    const [blob, filename] = vi.mocked(downloadBlob).mock.calls[0];
    expect(blob.type).toBe("image/svg+xml");
    expect(filename).toBe("My diagram.svg");
  });
});

describe("SaveFormatDialog", () => {
  it("counts a save and closes only after the file is written", async () => {
    const onSaved = vi.fn();
    const onClose = vi.fn();
    render(
      <SaveFormatDialog
        excalidrawAPI={api()}
        onSaved={onSaved}
        onClose={onClose}
      />,
    );

    fireEvent.click(option("Save as PNG"));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(downloadBlob).toHaveBeenCalledTimes(1);
  });

  it("hands focus to the persistent button when the opener has gone", async () => {
    // Saving from the card clears the card, so the button that opened the
    // dialog goes away. Without a fallback the browser drops focus on <body>
    // and a keyboard user loses their place.
    //
    // The removal is deferred here on purpose. onSaved and onClose are state
    // setters, so in the real app the opener is still in the document when they
    // return and only leaves once React commits. Removing it synchronously
    // would let a same-tick fallback pass a test while failing in the browser,
    // which is exactly what happened once.
    const cardButton = document.createElement("button");
    document.body.append(cardButton);
    cardButton.focus();

    const persistent = document.createElement("button");
    persistent.className = `excalidraw-button ${PERSISTENT_SAVE_BUTTON_CLASS}`;
    document.body.append(persistent);

    render(
      <SaveFormatDialog
        excalidrawAPI={api()}
        onSaved={() => setTimeout(() => cardButton.remove())}
        onClose={() => {}}
      />,
    );

    fireEvent.click(option("Save as PNG"));

    await waitFor(() => expect(document.activeElement).toBe(persistent));
  });

  it("does not count a failed save, keeps the dialog open, and says so", async () => {
    vi.mocked(exportToBlob).mockRejectedValueOnce(new Error("canvas too big"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const editor = api();
    const onSaved = vi.fn();
    const onClose = vi.fn();
    render(
      <SaveFormatDialog
        excalidrawAPI={editor}
        onSaved={onSaved}
        onClose={onClose}
      />,
    );

    fireEvent.click(option("Save as PNG"));

    await waitFor(() =>
      expect(editor.setToast).toHaveBeenCalledWith(
        expect.objectContaining({ message: SAVE_DIALOG_COPY.failed }),
      ),
    );
    expect(onSaved).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    // Unlocked again, so they can retry or pick another format.
    expect(option("Save as PNG")).not.toBeDisabled();
  });
});
