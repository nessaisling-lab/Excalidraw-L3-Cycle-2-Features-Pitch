import { LiveCollaborationTrigger } from "@excalidraw/excalidraw";
import { Tooltip } from "@excalidraw/excalidraw/components/Tooltip";
import React, { useEffect } from "react";

import type { EditorInterface } from "@excalidraw/common";

import "./DemoBuild.scss";

/**
 * Scaffolding for the public demo build only — the one Carlos clicks through.
 * None of this renders anywhere else.
 *
 * Sharing and live collaboration are switched off in that build because the
 * stock configuration points them at Excalidraw's own production storage and
 * room server. Rather than hide the controls, they stay visible and disabled
 * with an explanation: someone evaluating the app should be able to see that a
 * capability exists and was deliberately turned off, not wonder where it went.
 */
export const IS_DEMO_BUILD = import.meta.env.VITE_APP_IS_DEMO === "true";

const DISABLED_REASON =
  "Disabled in this demo. Sharing and live collaboration would write to Excalidraw's own servers, so they are switched off in this build. Saving to a file works normally.";

export const DEMO_MENU_LABEL = "Live collaboration — off in demo";

/** Appends a demo marker to the tab title, once, on mount. */
export const useDemoTitle = () => {
  useEffect(() => {
    if (!IS_DEMO_BUILD) {
      return;
    }
    const suffix = " — demo build";
    if (!document.title.endsWith(suffix)) {
      document.title += suffix;
    }
  }, []);
};

/**
 * Sits along the bottom edge, where neither the toolbar nor either candidate
 * position for the save prompt reaches — a banner at the top would shift the
 * layout the placement test is measuring.
 */
export const DemoBadge = () => {
  if (!IS_DEMO_BUILD) {
    return null;
  }

  return (
    <div className="demo-badge" role="note">
      <span className="demo-badge__tag">Demo</span>
      <span className="demo-badge__text">
        Prototype build by The Order of the Green Hand. Not affiliated with
        Excalidraw. Sharing and collaboration are disabled.
      </span>
    </div>
  );
};

/** The Share control, present but inert, with the reason on hover. */
export const DemoShareButton = ({
  editorInterface,
}: {
  editorInterface?: EditorInterface;
}) => (
  <Tooltip label={DISABLED_REASON} long>
    <LiveCollaborationTrigger
      isCollaborating={false}
      onSelect={() => {}}
      editorInterface={editorInterface}
      disabled
      aria-disabled="true"
      aria-describedby="demo-share-reason"
    />
    <span id="demo-share-reason" className="visually-hidden">
      {DISABLED_REASON}
    </span>
  </Tooltip>
);
