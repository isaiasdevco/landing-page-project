const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { once } = require("node:events");
const { existsSync } = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

// Test the actual static files, including GitHub Pages-style nested paths.
const root = path.resolve(__dirname, "..");
const baseURL = `http://127.0.0.1:4173/${path.basename(root)}/`;
let server;
let browser;

before(async () => {
  server = spawn(
    process.env.PYTHON || "python3",
    [
      "-m",
      "http.server",
      "4173",
      "--bind",
      "127.0.0.1",
      "--directory",
      path.dirname(root),
    ],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  let serverError;
  let serverOutput = "";
  server.on("error", (error) => {
    serverError = error;
  });
  server.stderr.on("data", (chunk) => {
    serverOutput += chunk;
  });
  let ready = false;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (serverError) throw serverError;
    if (server.exitCode !== null) throw new Error(serverOutput);
    try {
      const response = await fetch(baseURL);
      if (response.ok) {
        ready = true;
        break;
      }
    } catch {
      /* Wait until our server has bound its port. */
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(ready, `Static server did not become ready: ${serverOutput}`);
  const executablePath =
    process.env.BROWSER_EXECUTABLE ||
    (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined);
  browser = await chromium.launch({ executablePath });
});

after(async () => {
  await browser?.close();
  if (server && server.exitCode === null) {
    const exited = once(server, "exit");
    server.kill();
    await exited;
  }
});

async function openPage(options = {}) {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
    ...options,
  });
  await page.goto(baseURL, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  return page;
}

test("layouts fit phones, tablets, desktop, and short landscape screens", async (t) => {
  for (const [width, height] of [
    [320, 740],
    [375, 812],
    [390, 844],
    [667, 375],
    [760, 900],
    [761, 900],
    [768, 1024],
    [1024, 768],
    [1440, 900],
    [1920, 1080],
  ]) {
    await t.test(`${width} × ${height}`, async () => {
      const page = await openPage({ viewport: { width, height } });
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      for (const image of await page.locator("main img").all()) {
        await image.scrollIntoViewIfNeeded();
        await image.evaluate((element) => element.decode());
        assert.ok(await image.evaluate((element) => element.naturalWidth > 0));
      }
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      assert.equal(await page.locator("h1").count(), 1);
      assert.equal(await page.locator(".service-card").count(), 3);
      assert.equal(await page.locator(".testimonial").count(), 2);
      assert.deepEqual(errors, []);
      await page.close();
    });
  }
});

test("the mobile menu supports keyboard, Escape, links, outside clicks, and resizing", async () => {
  const page = await openPage({ viewport: { width: 390, height: 844 } });
  const toggle = page.locator(".menu-toggle");
  const nav = page.locator("#primary-navigation");
  assert.equal(await nav.isVisible(), false);
  await toggle.focus();
  await page.keyboard.press("Enter");
  assert.equal(await toggle.getAttribute("aria-expanded"), "true");
  await page.keyboard.press("Tab");
  assert.equal(
    await page.evaluate(() => document.activeElement.textContent.trim()),
    "Home",
  );
  await page.keyboard.press("Escape");
  assert.equal(await toggle.getAttribute("aria-expanded"), "false");
  assert.equal(
    await toggle.evaluate((element) => element === document.activeElement),
    true,
  );
  await toggle.click();
  await nav.locator('a[href="#services"]').click();
  assert.equal(new URL(page.url()).hash, "#services");
  assert.equal(
    await page.evaluate(() => document.activeElement.id),
    "services",
  );
  assert.equal(await nav.isVisible(), false);
  await toggle.click();
  await page.mouse.click(20, 600);
  assert.equal(await nav.isVisible(), false);
  await toggle.click();
  await page.setViewportSize({ width: 1200, height: 900 });
  assert.equal(await nav.isVisible(), true);
  assert.equal(await toggle.getAttribute("aria-expanded"), "false");
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await nav.isVisible(), false);
  await toggle.click();
  await page.locator(".site-header .brand").click();
  assert.equal(await nav.isVisible(), false);
  assert.equal(new URL(page.url()).hash, "#home");
  await page.close();
});

test("primary anchors reach their sections below the sticky header", async () => {
  const page = await openPage();
  for (const id of ["about", "services", "contact", "home"]) {
    await page.locator(`.primary-navigation a[href="#${id}"]`).click();
    const bounds = await page.locator(`#${id}`).boundingBox();
    const header = await page.locator(".site-header").boundingBox();
    assert.ok(bounds.y >= header.height, `${id} is covered by the header`);
    assert.equal(
      await page
        .locator('.primary-navigation a[aria-current="location"]')
        .getAttribute("href"),
      `#${id}`,
    );
  }
  await page.close();
});

test("active navigation follows testimonials when scrolling back from the footer", async () => {
  const page = await openPage();
  await page.locator('.primary-navigation a[href="#contact"]').click();
  await page.waitForFunction(
    () =>
      document.querySelector('.primary-navigation [aria-current="location"]')
        ?.hash === "#contact",
  );
  await page
    .locator(".testimonials")
    .evaluate((element) => window.scrollTo(0, element.offsetTop - 120));
  await page.waitForFunction(
    () =>
      document.querySelector('.primary-navigation [aria-current="location"]')
        ?.hash === "#about",
    null,
    { timeout: 2000 },
  );
  assert.equal(
    await page
      .locator('.primary-navigation [aria-current="location"]')
      .getAttribute("href"),
    "#about",
  );
  await page.close();
});

test("navigation and content remain usable without JavaScript", async () => {
  const page = await openPage({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  assert.equal(await page.locator(".menu-toggle").isVisible(), false);
  assert.equal(await page.locator(".primary-navigation").isVisible(), true);
  await page.locator('.primary-navigation a[href="#about"]').click();
  assert.equal(new URL(page.url()).hash, "#about");
  assert.ok(await page.locator("#about-title").isVisible());
  assert.equal(await page.locator(".is-pending").count(), 0);
  await page.close();
});

test("reduced motion and preference changes leave all sections visible", async () => {
  const page = await openPage({ reducedMotion: "no-preference" });
  assert.ok((await page.locator(".is-pending").count()) > 0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForFunction(
    () => document.querySelectorAll(".is-pending").length === 0,
  );
  assert.equal(
    await page.evaluate(
      () => getComputedStyle(document.documentElement).scrollBehavior,
    ),
    "auto",
  );
  await page.close();
});

test("the page makes no third-party runtime requests and reports no browser errors", async () => {
  const page = await browser.newPage();
  const errors = [];
  const externalRequests = [];
  const failedResponses = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (!request.url().startsWith(baseURL))
      externalRequests.push(request.url());
  });
  page.on("response", (response) => {
    if (response.status() >= 400) failedResponses.push(response.url());
  });
  await page.goto(baseURL, { waitUntil: "networkidle" });
  for (const image of await page.locator("main img").all()) {
    await image.scrollIntoViewIfNeeded();
    await image.evaluate((element) => element.decode());
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(externalRequests, []);
  assert.deepEqual(failedResponses, []);
  await page.close();
});

test("axe finds no WCAG A/AA violations in desktop and both mobile menu states", async (t) => {
  for (const [name, width, menuOpen] of [
    ["desktop", 1440, false],
    ["mobile closed", 390, false],
    ["mobile open", 390, true],
  ]) {
    await t.test(name, async () => {
      const page = await openPage({ viewport: { width, height: 900 } });
      if (menuOpen) await page.locator(".menu-toggle").click();
      await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
      const results = await page.evaluate(() =>
        axe.run(document, {
          runOnly: {
            type: "tag",
            values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
          },
        }),
      );
      assert.deepEqual(
        results.violations.map(({ id, nodes }) => ({
          id,
          targets: nodes.map((node) => node.target),
        })),
        [],
      );
      await page.close();
    });
  }
});
