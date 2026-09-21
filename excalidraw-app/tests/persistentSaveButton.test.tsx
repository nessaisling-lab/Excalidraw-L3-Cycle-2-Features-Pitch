// Plain testing-library rather than the repo's `renderApp` helper: that one
// mounts the whole editor and waits for its canvases, which these standalone
// pieces never produce.
import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";

import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

import { downloadScene } from "../persistent-save/downloadScene";
import {
  PersistentSaveButton,
  SAVE_BUTTON_LABEL,
  SAVE_BUTTON_TITLE,
} from "../persistent-save/PersistentSaveButton";

describe("PersistentSaveButton", () => {
  const setup = (
    props: Partial<React.ComponentProps<typeof PersistentSaveButton>> = {},
  ) => {
    const onSave = vi.fn();
    const result = render(
      <PersistentSaveButton
        isPlusSignedUser={false}
        viewModeEnabled={false}
        onSave={onSave}
        {...props}
      />,
    );
    return { onSave, ...result };
  };

  it("is available to an anonymous visitor from the start", () => {
    setup();

    // No drawing required — this is the fallback, not the prompt.
    expect(
      screen.getByRole("button", { name: SAVE_BUTTON_LABEL }),
    ).toBeTruthy();
  });

  it("advertises the keyboard shortcut", () => {
    setup();

    expect(screen.getByRole("button", { name: SAVE_BUTTON_LABEL }).title).toBe(
      SAVE_BUTTON_TITLE,
    );
  });

  it("is a real button, so it is keyboard reachable", () => {
    setup();
    const button = screen.getByRole("button", { name: SAVE_BUTTON_LABEL });

    expect(button.tagName).toBe("BUTTON");
    expect(button.getAttribute("type")).toBe("button");
    // Not given a tabindex: a native button is already in the tab order, and
    // overriding it is how that usually gets broken.
    expect(button.getAttribute("tabindex")).toBeNull();
  });

  it("saves when clicked", () => {
    const { onSave } = setup();

    fireEvent.click(screen.getByRole("button", { name: SAVE_BUTTON_LABEL }));
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("hides from Excalidraw+ users, who already have cloud saving", () => {
    setup({ isPlusSignedUser: true });

    expect(
      screen.queryByRole("button", { name: SAVE_BUTTON_LABEL }),
    ).toBeNull();
  });

  it("hides in view mode, where there is nothing to save", () => {
    setup({ viewModeEnabled: true });

    expect(
      screen.queryByRole("button", { name: SAVE_BUTTON_LABEL }),
    ).toBeNull();
  });
});

describe("downloadScene", () => {
  let createdBlob: Blob | null = null;
  let serialized = "";
  let revoked: string[] = [];
  let anchor: HTMLAnchorElement | null = null;
  let clicked = 0;

  const api = (overrides: Partial<Record<string, any>> = {}) =>
    ({
      getSceneElements: () => [],
      getAppState: () => ({ viewBackgroundColor: "#ffffff" }),
      getFiles: () => ({}),
      getName: () => "My diagram",
      ...overrides,
    } as unknown as ExcalidrawImperativeAPI);

  beforeEach(() => {
    createdBlob = null;
    serialized = "";
    revoked = [];
    anchor = null;
    clicked = 0;

    // jsdom's Blob has no .text(), so the content is captured as it is built.
    const RealBlob = globalThis.Blob;
    vi.stubGlobal(
      "Blob",
      class extends RealBlob {
        constructor(parts: BlobPart[], options?: BlobPropertyBag) {
          super(parts, options);
          serialized = String(parts[0]);
        }
      },
    );

    // jsdom implements neither of these.
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: (blob: Blob) => {
        createdBlob = blob;
        return "blob:mock-url";
      },
      revokeObjectURL: (url: string) => revoked.push(url),
    });

    const realCreate = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      const el = realCreate(tag);
      if (tag === "a") {
        anchor = el as HTMLAnchorElement;
        // A real click would try to navigate and warn in jsdom.
        (el as HTMLAnchorElement).click = () => {
          clicked += 1;
        };
      }
      return el;
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("downloads the scene as a .excalidraw file named after the document", () => {
    downloadScene(api());

    expect(anchor!.download).toBe("My diagram.excalidraw");
    expect(anchor!.href).toContain("blob:mock-url");
    expect(clicked).toBe(1);
  });

  it("falls back to Untitled when the document has no name", () => {
    downloadScene(api({ getName: () => "" }));

    expect(anchor!.download).toBe("Untitled.excalidraw");
  });

  it("writes the excalidraw MIME type, not plain JSON", () => {
    downloadScene(api());

    // The type is what makes the file re-openable by the app.
    expect(createdBlob!.type).toBe("application/vnd.excalidraw+json");
  });

  it("serializes the real scene rather than an empty document", () => {
    const element = { id: "a", type: "rectangle", isDeleted: false } as any;
    downloadScene(api({ getSceneElements: () => [element] }));

    expect(serialized).toContain('"type": "excalidraw"');
    expect(serialized).toContain('"id": "a"');
  });

  it("does not leave the object URL allocated", () => {
    vi.useFakeTimers();
    downloadScene(api());

    // Released on the next tick, not synchronously — revoking immediately can
    // cancel the download before it starts.
    expect(revoked).toEqual([]);
    vi.runAllTimers();
    expect(revoked).toEqual(["blob:mock-url"]);
  });

  it("removes the anchor it added to the document", () => {
    downloadScene(api());

    expect(document.querySelector("a[download]")).toBeNull();
  });
});
