/* eslint-disable no-console, prefer-template -- local capture script: console output is the point */
// Renders the approved "Option E" card into the running app at the two
// candidate positions Carlos wants a Lyssna read on: upper-right (below the
// top-right button cluster) and lower-right. Produces clean stimuli plus
// annotated copies for Slack, and reports the card's real rendered height.

const path = require("path");
const GLOBAL = require("child_process")
  .execSync("npm root -g")
  .toString()
  .trim();
const { chromium } = require(path.join(GLOBAL, "playwright"));

const OUT = path.join(__dirname, "evidence");

// Jill's approved spec, 2026-09-18. Exact values so the composite matches her
// export; the real component should use the app's own tokens, which carry the
// same values (--ui-font is already Assistant, --color-primary is already #6965db).
const CARD = {
  width: 340,
  padding: 16,
  radius: 8,
  bg: "#FFFFFF",
  shadow:
    "0px 0px 1px rgba(0,0,0,0.17), 0px 0px 3px rgba(0,0,0,0.08), 0px 7px 14px rgba(0,0,0,0.05)",
  font: "Assistant, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  headline: "Save your drawing",
  body: "Download a copy to your device so you can keep working with it later.",
  button: "Save to file",
};

const injectCard = (spec, pos) => {
  document.querySelectorAll(".gh-card, .gh-overlay").forEach((e) => e.remove());

  const card = document.createElement("div");
  card.className = "gh-card";
  card.style.cssText = [
    "position:absolute",
    "left:" + pos.x + "px",
    "top:" + pos.y + "px",
    "width:" + spec.width + "px",
    "box-sizing:border-box",
    "padding:" + spec.padding + "px",
    "background:" + spec.bg,
    "border-radius:" + spec.radius + "px",
    "box-shadow:" + spec.shadow,
    "font-family:" + spec.font,
    "z-index:99998",
  ].join(";");

  const h = document.createElement("div");
  h.textContent = spec.headline;
  h.style.cssText =
    "font-size:15px;font-weight:700;color:#1B1B1F;padding-right:24px;margin:0 0 4px";

  const b = document.createElement("div");
  b.textContent = spec.body;
  b.style.cssText =
    "font-size:13px;font-weight:400;color:#7A7A7A;line-height:1.5;margin:0 0 12px";

  const btn = document.createElement("button");
  btn.textContent = spec.button;
  btn.style.cssText =
    "background:#6965DB;color:#fff;font-family:inherit;font-size:13px;font-weight:500;" +
    "padding:9px 16px;border:0;border-radius:8px;cursor:pointer";

  const x = document.createElement("div");
  x.style.cssText =
    "position:absolute;top:12px;right:12px;width:16px;height:16px;color:#7A7A7A";
  x.innerHTML =
    '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" ' +
    'stroke-width="1.6" stroke-linecap="round"><path d="M3.5 3.5l9 9M12.5 3.5l-9 9"/></svg>';

  card.append(h, b, btn, x);
  document.querySelector(".excalidraw").appendChild(card);

  const r = card.getBoundingClientRect();
  return {
    x: Math.round(r.x),
    y: Math.round(r.y),
    w: Math.round(r.width),
    h: Math.round(r.height),
  };
};

const annotate = (label, box, color) => {
  const tag = document.createElement("div");
  tag.className = "gh-overlay";
  tag.style.cssText = [
    "position:absolute",
    "left:" + box.x + "px",
    "top:" + (box.y - 30) + "px",
    "background:" + color,
    "color:#fff",
    "font:600 12px/1.5 system-ui,sans-serif",
    "padding:4px 9px",
    "border-radius:5px",
    "z-index:99999",
    "white-space:nowrap",
  ].join(";");
  tag.textContent = label;
  document.querySelector(".excalidraw").appendChild(tag);
};

const drawRect = async (page) => {
  await page.keyboard.press("r");
  await page.mouse.move(520, 340);
  await page.mouse.down();
  await page.mouse.move(680, 440, { steps: 8 });
  await page.mouse.move(840, 540, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(700);
};

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  await page.goto("http://localhost:3001", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".excalidraw", { timeout: 60000 });
  await page.waitForTimeout(2500);
  await drawRect(page);

  // Measure the real regions we have to sit clear of.
  const geo = await page.evaluate(() => {
    const g = (s) => {
      const e = document.querySelector(s);
      if (!e) {
        return null;
      }
      const b = e.getBoundingClientRect();
      return {
        x: Math.round(b.x),
        y: Math.round(b.y),
        w: Math.round(b.width),
        h: Math.round(b.height),
        right: Math.round(b.right),
        bottom: Math.round(b.bottom),
      };
    };
    return {
      viewport: { w: innerWidth, h: innerHeight },
      topRightCluster: g(".excalidraw-ui-top-right"),
      topRightWrapper: g(".layer-ui__wrapper__top-right"),
      footerRight: g(".layer-ui__wrapper__footer-right"),
      footerCenter: g(".layer-ui__wrapper__footer-center"),
      helpIcon: g(".help-icon"),
      panel: g(".App-menu__left"),
    };
  });
  console.log("GEOMETRY:", JSON.stringify(geo, null, 1));

  const GAP = 16;
  const rightEdge = geo.topRightCluster
    ? geo.topRightCluster.right
    : geo.viewport.w - 16;

  const upper = {
    x: rightEdge - CARD.width,
    y: geo.topRightCluster.bottom + GAP,
  };
  console.log("UPPER-RIGHT target:", JSON.stringify(upper));

  const box = await page.evaluate(
    ({ spec, pos, fnSrc }) => {
      // eslint-disable-next-line no-new-func
      const fn = new Function("return " + fnSrc)();
      return fn(spec, pos);
    },
    { spec: CARD, pos: upper, fnSrc: injectCard.toString() },
  );
  console.log("UPPER-RIGHT rendered:", JSON.stringify(box));
  await page.waitForTimeout(250);
  await page.screenshot({
    path: path.join(OUT, "12-position-A-upper-right-clean.png"),
  });

  await page.evaluate(
    ({ fnSrc, label, box, color }) => {
      // eslint-disable-next-line no-new-func
      const fn = new Function("return " + fnSrc)();
      fn(label, box, color);
    },
    {
      fnSrc: annotate.toString(),
      label: "Position A — upper right",
      box,
      color: "#5E7F35",
    },
  );
  await page.waitForTimeout(200);
  await page.screenshot({
    path: path.join(OUT, "13-position-A-upper-right-annotated.png"),
  });

  // Lower right: clear the bottom-right controls.
  const bottomObstacle = geo.footerRight
    ? geo.footerRight.y
    : geo.viewport.h - 50;
  const lower = { x: rightEdge - CARD.width, y: bottomObstacle - GAP - box.h };
  console.log("LOWER-RIGHT target:", JSON.stringify(lower));

  const box2 = await page.evaluate(
    ({ spec, pos, fnSrc }) => {
      // eslint-disable-next-line no-new-func
      const fn = new Function("return " + fnSrc)();
      return fn(spec, pos);
    },
    { spec: CARD, pos: lower, fnSrc: injectCard.toString() },
  );
  console.log("LOWER-RIGHT rendered:", JSON.stringify(box2));
  await page.waitForTimeout(250);
  await page.screenshot({
    path: path.join(OUT, "14-position-B-lower-right-clean.png"),
  });

  await page.evaluate(
    ({ fnSrc, label, box, color }) => {
      // eslint-disable-next-line no-new-func
      const fn = new Function("return " + fnSrc)();
      fn(label, box, color);
    },
    {
      fnSrc: annotate.toString(),
      label: "Position B — lower right",
      box: box2,
      color: "#B8862B",
    },
  );
  await page.waitForTimeout(200);
  await page.screenshot({
    path: path.join(OUT, "15-position-B-lower-right-annotated.png"),
  });

  await browser.close();
  console.log("done");
})();
