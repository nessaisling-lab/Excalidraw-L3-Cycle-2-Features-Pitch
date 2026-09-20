/**
 * Measures the Stage 2 persistent save button against the accessibility bar,
 * in both themes, on a real render.
 *
 * jsdom has no layout engine, so the unit tests cannot catch a label that
 * overflows its box — which is exactly how the 32x32 icon-button sizing got
 * through review. This is the check that catches it.
 *
 * Start the app first (`yarn start`), then:
 *   node docs/cycle-2/measure-stage2-button.js
 */
const path = require("path");
const GLOBAL = require("child_process").execSync("npm root -g").toString().trim();
const { chromium } = require(path.join(GLOBAL, "playwright"));

const URL = process.env.MEASURE_URL || "http://localhost:3000";
const OUT = path.join(__dirname, "evidence");
const SEL = ".persistent-save-button";

const luminance = (color) => {
  const channels = String(color)
    .match(/[\d.]+/g)
    .slice(0, 3)
    .map((v) => v / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
};

const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

/** Reads the button in whatever visual state the page is currently in. */
const readButton = (page, state) =>
  page.evaluate(
    ({ sel, state }) => {
      const el = document.querySelector(sel);
      const style = getComputedStyle(el);
      const box = el.getBoundingClientRect();

      // The first ancestor that actually paints, for the non-text contrast check.
      let surround = "rgb(255, 255, 255)";
      for (let node = el.parentElement; node; node = node.parentElement) {
        const bg = getComputedStyle(node).backgroundColor;
        if (bg && !/rgba\(0, 0, 0, 0\)|transparent/.test(bg)) {
          surround = bg;
          break;
        }
      }

      const range = document.createRange();
      range.selectNodeContents(el);

      return {
        state,
        width: Math.round(box.width),
        height: Math.round(box.height),
        background: style.backgroundColor,
        color: style.color,
        boxShadow: style.boxShadow,
        labelWidth: Math.round(range.getBoundingClientRect().width),
        contentWidth: Math.round(
          box.width -
            parseFloat(style.paddingLeft) -
            parseFloat(style.paddingRight) -
            parseFloat(style.borderLeftWidth) -
            parseFloat(style.borderRightWidth),
        ),
        surround,
      };
    },
    { sel: SEL, state },
  );

const report = (theme, rest, hover, focus) => {
  const failures = [];

  const fits = rest.labelWidth <= rest.contentWidth;
  if (!fits) {
    failures.push(
      `label overflows by ${rest.labelWidth - rest.contentWidth}px ` +
        `(needs ${rest.labelWidth}px, box is ${rest.contentWidth}px)`,
    );
  }

  const textContrast = contrast(rest.color, rest.background);
  if (textContrast < 4.5) {
    failures.push(`label contrast ${textContrast.toFixed(2)}:1 is under 4.5:1`);
  }

  // Excalidraw rings focus with a box-shadow rather than an outline.
  const ring = focus.boxShadow.match(/rgba?\([^)]+\)/);
  const ringContrast = ring ? contrast(ring[0], focus.surround) : 0;
  if (!ring) {
    failures.push("no visible focus indicator");
  } else if (ringContrast < 3) {
    failures.push(`focus ring contrast ${ringContrast.toFixed(2)}:1 is under 3:1`);
  }

  console.log(`\n${theme} theme`);
  console.log(`  size            ${rest.width} x ${rest.height}`);
  console.log(
    `  label           ${rest.labelWidth}px in a ${rest.contentWidth}px box — ${
      fits ? "fits" : "OVERFLOWS"
    }`,
  );
  console.log(`  label contrast  ${textContrast.toFixed(2)}:1 (needs 4.5:1)`);
  console.log(`  hover change    ${rest.background} -> ${hover.background}`);
  console.log(
    `  focus ring      ${ring ? `${ring[0]} at ${ringContrast.toFixed(2)}:1` : "none"}`,
  );
  console.log(`  ${failures.length ? `FAIL: ${failures.join("; ")}` : "PASS"}`);

  return failures.length === 0;
};

(async () => {
  const browser = await chromium.launch();
  let passed = true;

  for (const theme of ["light", "dark"]) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });
    if (theme === "dark") {
      await context.addInitScript(() => {
        try {
          localStorage.setItem("excalidraw-theme", "dark");
        } catch (error) {
          // private mode; the light-theme pass still covers the layout
        }
      });
    }

    const page = await context.newPage();
    await page.goto(URL, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(SEL, { timeout: 60_000 });
    await page.waitForTimeout(2_000);

    const rest = await readButton(page, "rest");
    await page.hover(SEL);
    await page.waitForTimeout(250);
    const hover = await readButton(page, "hover");

    // :focus-visible only matches keyboard focus, so tab onto the button rather
    // than calling .focus() — a programmatic focus reports no ring and reads as
    // a failure that is not there.
    await page.evaluate((sel) => document.querySelector(sel).focus(), SEL);
    await page.keyboard.press("Tab");
    await page.keyboard.press("Shift+Tab");
    const focus = await readButton(page, "focus");

    passed = report(theme, rest, hover, focus) && passed;

    await page.mouse.move(700, 600);
    const cluster = await page.$(
      ".excalidraw-ui-top-right, .layer-ui__wrapper__top-right",
    );
    const box = await cluster.boundingBox();
    await page.screenshot({
      path: path.join(OUT, `30-stage2-cluster-${theme}-rest.png`),
      clip: {
        x: Math.max(0, box.x - 24),
        y: Math.max(0, box.y - 14),
        width: box.width + 48,
        height: box.height + 32,
      },
    });

    await context.close();
  }

  await browser.close();
  console.log(`\n${passed ? "all checks passed" : "checks failed"}`);
  process.exit(passed ? 0 : 1);
})();
