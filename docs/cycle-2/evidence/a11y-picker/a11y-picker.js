/* eslint-disable no-console -- local evidence script: console output is the point */
// Accessibility evidence for the save format picker, gathered from the live
// demo at g1-v0.2.2-beta.1 — the same page a reviewer would open.
//
// This is evidence, not a sign-off. Accessible names come from Chrome's own
// accessibility tree over CDP, not from reading the markup, but a computed
// tree is not a screen reader: it says what NVDA or VoiceOver is handed, not
// what a person hears. The sign-off still needs ears on it.
const path = require("path");
const fs = require("fs");
const G = require("child_process").execSync("npm root -g").toString().trim();
const { chromium } = require(path.join(G, "playwright"));
const AXE = fs.readFileSync(
  "D:/L3 Cycle 2 Exceldraw feature pitch/node_modules/axe-core/axe.min.js",
  "utf8",
);

const LIVE =
  "https://nessaisling-lab.github.io/Excalidraw-L3-Cycle-2-Features-Pitch/";
const OUT =
  "D:/L3 Cycle 2 Exceldraw feature pitch/docs/cycle-2/evidence/a11y-picker";

const lum = (c) => {
  const p = String(c)
    .match(/[\d.]+/g)
    .slice(0, 3)
    .map((v) => v / 255)
    .map((v) =>
      v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4),
    );
  return 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2];
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return Number(((x + 0.05) / (y + 0.05)).toFixed(2));
};

// Chrome's own computed name and role for one element.
const axNode = async (cdp, page, selector) => {
  const doc = await cdp.send("DOM.getDocument");
  const { nodeId } = await cdp.send("DOM.querySelector", {
    nodeId: doc.root.nodeId,
    selector,
  });
  if (!nodeId) {
    return null;
  }
  const { nodes } = await cdp.send("Accessibility.getPartialAXTree", {
    nodeId,
    fetchRelatives: false,
  });
  const n = nodes.find((x) => x.ignored !== true) ?? nodes[0];
  return {
    role: n?.role?.value ?? null,
    name: n?.name?.value ?? null,
    ignored: n?.ignored === true,
    disabled:
      n?.properties?.find((p) => p.name === "disabled")?.value?.value ?? false,
  };
};

const draw = async (p) => {
  await p.keyboard.press("r");
  await p.mouse.move(430, 330);
  await p.mouse.down();
  await p.mouse.move(700, 490, { steps: 8 });
  await p.mouse.up();
  await p.keyboard.press("Escape");
  await p.mouse.move(700, 830);
};

const focusInfo = (p) =>
  p.evaluate(() => {
    const a = document.activeElement;
    if (!a) {
      return null;
    }
    return {
      tag: a.tagName.toLowerCase(),
      label: a.getAttribute("aria-label") || a.textContent?.trim().slice(0, 40),
      cls: a.className?.toString().slice(0, 60),
      inDialog: !!a.closest(".c1-save-format-dialog"),
    };
  });

const run = async (browser, theme) => {
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    acceptDownloads: true,
  });
  if (theme === "dark") {
    await ctx.addInitScript(() => {
      try {
        localStorage.setItem("excalidraw-theme", "dark");
      } catch (e) {}
    });
  }
  const p = await ctx.newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message.slice(0, 140)));
  const cdp = await ctx.newCDPSession(p);
  await cdp.send("Accessibility.enable");

  const R = { theme, checks: {} };

  await p.goto(`${LIVE}?reset&dwell=1&quiet=0&arm=nudge`, {
    waitUntil: "domcontentloaded",
  });
  await p.waitForSelector(".persistent-save-button", { timeout: 90000 });
  await p.waitForTimeout(2500);

  // ---- 1. empty canvas: the image formats must be held, and say why -------
  await p.click(".persistent-save-button");
  await p.waitForSelector(".c1-save-formats", { timeout: 6000 });
  R.checks.emptyCanvas = {
    excalidraw: await axNode(cdp, p, '[aria-label^="Save as Excalidraw"]'),
    png: await axNode(cdp, p, '[aria-label="Save as PNG"]'),
    svg: await axNode(cdp, p, '[aria-label="Save as SVG"]'),
    reasonShown: await p
      .locator(".c1-save-formats", { hasText: "Draw something first." })
      .isVisible(),
  };
  await p.keyboard.press("Escape");
  await p.waitForSelector(".c1-save-format-dialog", {
    state: "detached",
    timeout: 5000,
  });

  await draw(p);
  await p.waitForSelector(".c1-save-prompt", { timeout: 15000 });

  // ---- 2. the card's own announcement -------------------------------------
  R.checks.cardAnnouncement = await p.evaluate(() => {
    const live = document.querySelector(
      '.c1-save-prompt [role="status"][aria-live="polite"]',
    );
    const all = [
      ...document.querySelectorAll(
        '.c1-save-prompt [aria-live], [role="status"]',
      ),
    ];
    return {
      text: live?.textContent?.trim() ?? null,
      liveRegionCount: all.length,
    };
  });

  // ---- 3. opened from the top-right button, by keyboard -------------------
  await p.locator(".persistent-save-button").focus();
  const openerBefore = await focusInfo(p);
  await p.keyboard.press("Enter");
  await p.waitForSelector(".c1-save-formats", { timeout: 6000 });
  await p.waitForTimeout(200);

  R.checks.dialog = await axNode(cdp, p, ".c1-save-format-dialog");
  R.checks.group = await axNode(cdp, p, ".c1-save-formats");
  R.checks.buttons = {
    excalidraw: await axNode(cdp, p, '[aria-label^="Save as Excalidraw"]'),
    png: await axNode(cdp, p, '[aria-label="Save as PNG"]'),
    svg: await axNode(cdp, p, '[aria-label="Save as SVG"]'),
  };
  R.checks.openedFromButton = {
    opener: openerBefore?.label ?? null,
    focusLandsOn: await focusInfo(p),
  };

  // Is "Recommended" anywhere in the tree, and how many times?
  R.checks.badge = await p.evaluate(() => {
    const badges = [...document.querySelectorAll(".c1-save-formats__badge")];
    return {
      total: badges.length,
      hiddenFromAT: badges.filter(
        (b) => b.getAttribute("aria-hidden") === "true",
      ).length,
      exposedText: badges
        .filter((b) => b.getAttribute("aria-hidden") !== "true")
        .map((b) => b.textContent.trim()),
      insideAnyControl: badges.some((b) => !!b.closest("button")),
    };
  });

  // ---- 4. tab containment and order --------------------------------------
  const order = [];
  for (let i = 0; i < 6; i++) {
    order.push(await focusInfo(p));
    await p.keyboard.press("Tab");
    await p.waitForTimeout(80);
  }
  R.checks.tabOrder = order.map((o) => ({
    label: o?.label ?? null,
    inDialog: o?.inDialog ?? false,
  }));
  R.checks.focusEscapedDialog = order.some((o) => o && !o.inDialog);

  // ---- 5. contrast of each button's label on its own fill -----------------
  R.checks.contrast = await p.evaluate(() => {
    const rows = {};
    for (const [key, sel] of [
      ["excalidraw", '[aria-label^="Save as Excalidraw"]'],
      ["png", '[aria-label="Save as PNG"]'],
      ["svg", '[aria-label="Save as SVG"]'],
    ]) {
      const btn = document.querySelector(sel);
      const label = btn.querySelector(".ToolIcon__label") || btn;
      rows[key] = {
        fg: getComputedStyle(label).color,
        bg: getComputedStyle(btn).backgroundColor,
      };
    }
    const badge = document.querySelector(
      '.c1-save-formats__badge:not([aria-hidden="true"])',
    );
    if (badge) {
      const s = getComputedStyle(badge);
      rows.badge = { fg: s.color, bg: s.backgroundColor };
    }
    return rows;
  });
  for (const k of Object.keys(R.checks.contrast)) {
    const { fg, bg } = R.checks.contrast[k];
    R.checks.contrast[k].ratio = ratio(fg, bg);
  }

  // ---- 6. focus ring, captured rather than computed -----------------------
  await p.locator('[aria-label^="Save as Excalidraw"]').focus();
  await p.waitForTimeout(150);
  const island = await p.$(".c1-save-format-dialog .Island");
  const box = await island.boundingBox();
  await p.screenshot({
    path: `${OUT}/picker-focus-${theme}.png`,
    clip: {
      x: box.x - 12,
      y: box.y - 12,
      width: box.width + 24,
      height: box.height + 24,
    },
  });

  // ---- 7. axe on the open dialog -----------------------------------------
  await p.addScriptTag({ content: AXE });
  R.checks.axe = await p.evaluate(async () => {
    const res = await window.axe.run(".c1-save-format-dialog", {
      runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
    });
    return {
      violations: res.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        nodes: v.nodes.length,
        help: v.help,
      })),
      passes: res.passes.length,
      incomplete: res.incomplete.map((v) => v.id),
    };
  });

  // ---- 8. Escape closes and hands focus back ------------------------------
  await p.keyboard.press("Escape");
  await p.waitForSelector(".c1-save-format-dialog", {
    state: "detached",
    timeout: 5000,
  });
  await p.waitForTimeout(200);
  R.checks.escape = { returnsFocusTo: await focusInfo(p) };

  // ---- 9. opened from the card, then a real save --------------------------
  const cardButton = p.locator(".c1-save-prompt__save");
  const cardButtonCount = await cardButton.count();
  if (cardButtonCount > 0) {
    await cardButton.first().focus();
    await p.keyboard.press("Enter");
    await p.waitForSelector(".c1-save-formats", { timeout: 6000 });
    await p.waitForTimeout(200);
    R.checks.openedFromCard = { focusLandsOn: await focusInfo(p) };

    const dl = p.waitForEvent("download", { timeout: 15000 }).catch(() => null);
    await p.keyboard.press("Enter"); // activate the focused first card
    const download = await dl;
    await p.waitForTimeout(600);
    R.checks.afterSave = {
      downloaded: download ? await download.suggestedFilename() : null,
      dialogClosed: !(await p.locator(".c1-save-format-dialog").isVisible()),
      cardCleared: !(await p.locator(".c1-save-prompt").isVisible()),
      focusReturnsTo: await focusInfo(p),
    };
  } else {
    R.checks.openedFromCard = { error: "card button not found" };
  }

  R.pageErrors = errors.length ? errors : "none";
  await ctx.close();
  return R;
};

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch();
  const out = [];
  for (const theme of ["light", "dark"]) {
    const r = await run(b, theme);
    out.push(r);
    console.log(`\n===== ${theme} =====`);
    console.log(JSON.stringify(r.checks, null, 1).slice(0, 4000));
    console.log("page errors:", r.pageErrors);
  }
  await b.close();
  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(out, null, 2));
  console.log(`\nwritten ${OUT}/results.json`);
})();
